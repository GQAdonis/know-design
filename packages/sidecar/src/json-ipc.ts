/**
 * @module json-ipc
 *
 * Newline-delimited JSON IPC over a unix socket / Windows named pipe. Provides a
 * server that decodes one JSON frame per connection (UTF-8 safe across chunk
 * boundaries), runs a handler, and replies `{ok,result}`/`{ok:false,error}`, plus
 * a client request with timeout. Includes opt-in structured tracing (gated by
 * `OD_JSON_IPC_TRACE`) and stale-socket cleanup before binding. The trace
 * sequence counter is module-private singleton state. Depends on `node:fs`,
 * `node:net`, `node:path`, `node:string_decoder`, the shared net close helper,
 * the IPC-path recognizer, and the public IPC types.
 */

import { chmod, lstat, mkdir, rm } from "node:fs/promises";
import { createConnection } from "node:net";
import { createServer as createNetServer } from "node:net";
import { dirname } from "node:path";
import { StringDecoder } from "node:string_decoder";

import { isWindowsNamedPipePath } from "./ipc-path.js";
import { closeServer } from "./net.js";
import type { JsonIpcHandler, JsonIpcServerHandle } from "./types.js";

type UnixSocketIdentity = Readonly<{ dev: number; ino: number }>;

async function readUnixSocketIdentity(socketPath: string): Promise<UnixSocketIdentity | null> {
  if (isWindowsNamedPipePath(socketPath)) return null;
  const entry = await lstat(socketPath).catch(() => null);
  return entry?.isSocket() ? { dev: entry.dev, ino: entry.ino } : null;
}

async function removeOwnedUnixSocket(socketPath: string, owned: UnixSocketIdentity | null): Promise<void> {
  if (owned == null) return;
  const current = await readUnixSocketIdentity(socketPath);
  if (current?.dev === owned.dev && current.ino === owned.ino) await rm(socketPath, { force: true });
}

export type SidecarIpcErrorCode =
  | "IPC_CLOSED"
  | "IPC_PEER_EXITED"
  | "IPC_REMOTE_ERROR"
  | "IPC_TIMEOUT";

/**
 * Why a JSON IPC request ended without a result, as data a caller can branch on.
 *
 * `message` keeps the historical text for timeouts (`IPC request timed out: <socket>`) because
 * callers match it; everything a diagnostic needs (which message, which action, which peer
 * outcome) is carried as fields instead of being parsed back out of a string.
 */
export class SidecarIpcError extends Error {
  readonly action: string | null;
  readonly code: SidecarIpcErrorCode;
  readonly exitCode: number | null;
  readonly messageType: string | null;
  readonly signal: NodeJS.Signals | null;
  readonly socketPath: string;

  constructor(
    code: SidecarIpcErrorCode,
    message: string,
    details: {
      action?: string | null;
      exitCode?: number | null;
      messageType?: string | null;
      signal?: NodeJS.Signals | null;
      socketPath: string;
    },
  ) {
    super(message);
    this.name = "SidecarIpcError";
    this.code = code;
    this.action = details.action ?? null;
    this.exitCode = details.exitCode ?? null;
    this.messageType = details.messageType ?? null;
    this.signal = details.signal ?? null;
    this.socketPath = details.socketPath;
  }
}

/**
 * The process on the other end of a request. When given, a request ends when this process exits
 * (an event) instead of when a timer fires. A Node `ChildProcess` satisfies it.
 */
export type JsonIpcPeer = {
  readonly exitCode: number | null;
  readonly signalCode: NodeJS.Signals | null;
  off(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
  once(event: "exit", listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
};

export type JsonIpcRequestOptions = {
  /**
   * Observe the process answering. With a peer there is NO request timer unless `timeoutMs` is also
   * given explicitly; the request ends on a reply, the peer exiting, or the connection closing.
   */
  peer?: JsonIpcPeer;
  /** Explicit wall-clock limit. Defaults to 1500 ms only when there is no peer to observe. */
  timeoutMs?: number;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 1500;

let jsonIpcTraceSeq = 0;

/**
 * @internal Whether JSON-IPC tracing is enabled via `OD_JSON_IPC_TRACE`.
 */
function jsonIpcTraceEnabled(): boolean {
  const value = process.env.OD_JSON_IPC_TRACE;
  return value === "1" || value === "true" || value === "yes";
}

/**
 * @internal Allocate a per-connection trace id.
 */
function nextJsonIpcTraceId(): string {
  jsonIpcTraceSeq += 1;
  return `ipc-${process.pid}-${jsonIpcTraceSeq}`;
}

/**
 * @internal Elapsed milliseconds since `startedAt` (an hrtime bigint).
 */
function jsonIpcTraceDurationMs(startedAt: bigint): number {
  return Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
}

/**
 * @internal Produce a compact, PII-light summary of a message for tracing.
 */
function summarizeJsonIpcMessage(message: unknown): Record<string, unknown> {
  if (message == null || typeof message !== "object") return { type: typeof message };
  const input = message as { input?: unknown; type?: unknown };
  const summary: Record<string, unknown> = { type: typeof input.type === "string" ? input.type : typeof input.type };
  // A business `sidecar:invoke` is only meaningful with its action (register-web-url vs
  // register-desktop-auth ...); without it a trace cannot say what was being asked.
  const action = (message as { action?: unknown }).action;
  if (typeof action === "string") summary.action = action;
  if ("input" in input) {
    summary.hasInput = true;
    if (input.input != null && typeof input.input === "object") {
      summary.inputKeys = Object.keys(input.input as Record<string, unknown>).sort();
    } else {
      summary.inputType = typeof input.input;
    }
  }
  return summary;
}

/**
 * @internal Emit a trace line to stderr when tracing is enabled.
 */
function traceJsonIpc(event: string, details: Record<string, unknown>): void {
  if (!jsonIpcTraceEnabled()) return;
  console.error("[open-design sidecar] json ipc trace", { event, ...details });
}

/**
 * @internal Extract a Node error `code` string from an unknown thrown value.
 */
function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error == null || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return code == null ? null : String(code);
}

/**
 * @internal Extract a human-readable message from an unknown thrown value.
 */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @internal Shape an unknown error into the `{code?,message}` IPC error payload.
 */
function jsonIpcError(error: unknown): { code?: string; message: string } {
  return {
    ...(errorCode(error) == null ? {} : { code: errorCode(error) as string }),
    message: errorMessage(error),
  };
}

/**
 * @internal Decide whether a unix socket path is a stale (dead) endpoint safe to
 * unlink: it exists as a socket but refuses/ENOENTs on connect.
 */
async function staleUnixSocketExists(socketPath: string): Promise<boolean> {
  try {
    const stat = await lstat(socketPath);
    if (!stat.isSocket()) return false;
  } catch (error) {
    if (errorCode(error) === "ENOENT") return false;
    throw error;
  }

  return await new Promise<boolean>((resolveStale, rejectStale) => {
    const socket = createConnection(socketPath);
    let settled = false;
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      callback();
    };

    socket.once("connect", () => settle(() => resolveStale(false)));
    socket.once("error", (error) => {
      const code = errorCode(error);
      if (code === "ENOENT" || code === "ECONNREFUSED") {
        settle(() => resolveStale(true));
        return;
      }
      settle(() => rejectStale(error));
    });
  });
}

/**
 * @internal Prepare a socket path for binding: ensure the parent dir exists and
 * unlink a stale socket (no-op for Windows named pipes).
 */
async function prepareIpcPath(socketPath: string): Promise<void> {
  if (isWindowsNamedPipePath(socketPath)) return;
  await mkdir(dirname(socketPath), { mode: 0o700, recursive: true });
  await chmod(dirname(socketPath), 0o700);
  if (await staleUnixSocketExists(socketPath)) await rm(socketPath, { force: true });
}

/**
 * Start a newline-delimited JSON IPC server on a unix socket / named pipe: each
 * connection carries one JSON request, the handler's result is written back as
 * `{ok:true,result}` (or `{ok:false,error}` on parse/handler failure).
 * @returns A handle whose `close()` stops the server and unlinks the socket.
 */
export async function createJsonIpcServer({
  handler,
  socketPath,
}: {
  handler: JsonIpcHandler;
  socketPath: string;
}): Promise<JsonIpcServerHandle> {
  await prepareIpcPath(socketPath);
  const server = createNetServer((socket) => {
    let buffer = "";
    // Decode UTF-8 across chunk boundaries: a multibyte character (e.g. CJK,
    // 3 bytes) can be split across two `data` events. `chunk.toString()` per
    // chunk would turn each half into U+FFFD, corrupting the payload (observed
    // as `???`/`◆?◆?◆?` in exported CJK artifacts). StringDecoder holds an
    // incomplete trailing sequence until the next chunk completes it.
    const decoder = new StringDecoder("utf8");
    const traceId = nextJsonIpcTraceId();
    const startedAt = process.hrtime.bigint();
    traceJsonIpc("server.connection", { socketPath, traceId });
    socket.on("error", (error) => {
      traceJsonIpc("server.socket_error", {
        durationMs: jsonIpcTraceDurationMs(startedAt),
        error: error instanceof Error ? error.message : String(error),
        socketPath,
        traceId,
      });
    });
    socket.on("close", () => {
      traceJsonIpc("server.socket_close", {
        durationMs: jsonIpcTraceDurationMs(startedAt),
        socketPath,
        traceId,
      });
    });
    socket.on("data", async (chunk) => {
      traceJsonIpc("server.data", {
        bytes: chunk.byteLength,
        durationMs: jsonIpcTraceDurationMs(startedAt),
        socketPath,
        traceId,
      });
      buffer += decoder.write(chunk);
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) return;
      const frame = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      let message: unknown;
      try {
        message = JSON.parse(frame);
      } catch (error) {
        traceJsonIpc("server.frame_parse_failed", {
          durationMs: jsonIpcTraceDurationMs(startedAt),
          error: error instanceof Error ? error.message : String(error),
          frameBytes: Buffer.byteLength(frame),
          socketPath,
          traceId,
        });
        socket.end(
          `${JSON.stringify({
            ok: false,
            error: jsonIpcError(error),
          })}\n`,
        );
        return;
      }
      const messageSummary = summarizeJsonIpcMessage(message);
      traceJsonIpc("server.frame_parsed", {
        durationMs: jsonIpcTraceDurationMs(startedAt),
        frameBytes: Buffer.byteLength(frame),
        message: messageSummary,
        socketPath,
        traceId,
      });
      try {
        traceJsonIpc("server.handler_start", {
          durationMs: jsonIpcTraceDurationMs(startedAt),
          message: messageSummary,
          socketPath,
          traceId,
        });
        const result = await handler(message);
        traceJsonIpc("server.handler_success", {
          durationMs: jsonIpcTraceDurationMs(startedAt),
          message: messageSummary,
          socketPath,
          traceId,
        });
        socket.end(`${JSON.stringify({ ok: true, result })}\n`);
      } catch (error) {
        traceJsonIpc("server.handler_failed", {
          durationMs: jsonIpcTraceDurationMs(startedAt),
          error: error instanceof Error ? error.message : String(error),
          message: messageSummary,
          socketPath,
          traceId,
        });
        socket.end(
          `${JSON.stringify({
            ok: false,
            error: jsonIpcError(error),
          })}\n`,
        );
      }
    });
  });

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(socketPath, () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  if (!isWindowsNamedPipePath(socketPath)) await chmod(socketPath, 0o600);
  const ownedSocket = await readUnixSocketIdentity(socketPath);

  return {
    async close() {
      await removeOwnedUnixSocket(socketPath, ownedSocket);
      await closeServer(server);
    },
  };
}

/**
 * Send one newline-delimited JSON request over a unix socket / named pipe and
 * resolve with the server's `result`, rejecting on error response or timeout.
 * @returns The server's `result` payload.
 */
export async function requestJsonIpc<T = any>(
  socketPath: string,
  payload: unknown,
  { peer, timeoutMs }: JsonIpcRequestOptions = {},
): Promise<T> {
  const description = describeMessage(payload);
  return await new Promise<T>((resolveRequest, rejectRequest) => {
    const socket = createConnection(socketPath);
    const traceId = nextJsonIpcTraceId();
    const startedAt = process.hrtime.bigint();
    let settled = false;
    let buffer = "";
    // See the server reader above: decode UTF-8 across chunk boundaries so a
    // multibyte character split across two `data` events is not corrupted.
    const decoder = new StringDecoder("utf8");
    const messageSummary = summarizeJsonIpcMessage(payload);
    traceJsonIpc("client.connect_start", { message: messageSummary, socketPath, timeoutMs, traceId });
    const onPeerExit = (code: number | null, signal: NodeJS.Signals | null) => {
      traceJsonIpc("client.peer_exited", { code, message: messageSummary, signal, socketPath, traceId });
      socket.destroy();
      settle(() => rejectRequest(peerExitedError(description, socketPath, code, signal)));
    };
    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      if (timeout != null) clearTimeout(timeout);
      peer?.off("exit", onPeerExit);
      callback();
    };
    // A timer exists only when the caller has nothing better to observe, or asked for one.
    const effectiveTimeoutMs = timeoutMs ?? (peer == null ? DEFAULT_REQUEST_TIMEOUT_MS : null);
    const timeout =
      effectiveTimeoutMs == null
        ? null
        : setTimeout(() => {
            traceJsonIpc("client.timeout", {
              durationMs: jsonIpcTraceDurationMs(startedAt),
              message: messageSummary,
              socketPath,
              timeoutMs: effectiveTimeoutMs,
              traceId,
            });
            socket.destroy();
            settle(() =>
              rejectRequest(
                new SidecarIpcError("IPC_TIMEOUT", `IPC request timed out: ${socketPath}`, { ...description, socketPath }),
              ),
            );
          }, effectiveTimeoutMs);
    if (peer != null) {
      if (peer.exitCode != null || peer.signalCode != null) {
        socket.destroy();
        settle(() => rejectRequest(peerExitedError(description, socketPath, peer.exitCode, peer.signalCode)));
        return;
      }
      peer.once("exit", onPeerExit);
    }

    socket.on("connect", () => {
      traceJsonIpc("client.connected", {
        durationMs: jsonIpcTraceDurationMs(startedAt),
        message: messageSummary,
        socketPath,
        traceId,
      });
      const frame = `${JSON.stringify(payload)}\n`;
      traceJsonIpc("client.write_start", {
        bytes: Buffer.byteLength(frame),
        durationMs: jsonIpcTraceDurationMs(startedAt),
        message: messageSummary,
        socketPath,
        traceId,
      });
      const flushed = socket.write(frame, () => {
        traceJsonIpc("client.write_callback", {
          durationMs: jsonIpcTraceDurationMs(startedAt),
          message: messageSummary,
          socketPath,
          traceId,
        });
      });
      if (!flushed) {
        socket.once("drain", () => {
          traceJsonIpc("client.drain", {
            durationMs: jsonIpcTraceDurationMs(startedAt),
            message: messageSummary,
            socketPath,
            traceId,
          });
        });
      }
    });
    socket.on("data", (chunk) => {
      traceJsonIpc("client.data", {
        bytes: chunk.byteLength,
        durationMs: jsonIpcTraceDurationMs(startedAt),
        message: messageSummary,
        socketPath,
        traceId,
      });
      buffer += decoder.write(chunk);
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex < 0) return;
      socket.end();
      settle(() => {
        const response = JSON.parse(buffer.slice(0, newlineIndex)) as { error?: { message?: string }; ok: boolean; result?: T };
        if (!response.ok) {
          traceJsonIpc("client.response_error", {
            durationMs: jsonIpcTraceDurationMs(startedAt),
            error: response.error?.message ?? "IPC request failed",
            message: messageSummary,
            socketPath,
            traceId,
          });
          rejectRequest(
            new SidecarIpcError("IPC_REMOTE_ERROR", response.error?.message ?? "IPC request failed", {
              ...description,
              socketPath,
            }),
          );
          return;
        }
        traceJsonIpc("client.response_success", {
          durationMs: jsonIpcTraceDurationMs(startedAt),
          message: messageSummary,
          socketPath,
          traceId,
        });
        resolveRequest(response.result as T);
      });
    });
    socket.on("error", (error) => {
      traceJsonIpc("client.socket_error", {
        durationMs: jsonIpcTraceDurationMs(startedAt),
        error: error instanceof Error ? error.message : String(error),
        message: messageSummary,
        socketPath,
        traceId,
      });
      settle(() => rejectRequest(error));
    });
    socket.on("close", () => {
      traceJsonIpc("client.socket_close", {
        durationMs: jsonIpcTraceDurationMs(startedAt),
        message: messageSummary,
        socketPath,
        traceId,
      });
      // The connection ended and nothing answered: that is an event, so say so now. `settle` is a
      // no-op when a reply (or an error) already won, which is the normal order of events.
      settle(() =>
        rejectRequest(
          new SidecarIpcError("IPC_CLOSED", `IPC connection closed before a response: ${socketPath}`, {
            ...description,
            socketPath,
          }),
        ),
      );
    });
  });
}

function describeMessage(payload: unknown): { action: string | null; messageType: string | null } {
  if (payload == null || typeof payload !== "object") return { action: null, messageType: null };
  const { action, type } = payload as { action?: unknown; type?: unknown };
  return {
    action: typeof action === "string" ? action : null,
    messageType: typeof type === "string" ? type : null,
  };
}

function peerExitedError(
  description: { action: string | null; messageType: string | null },
  socketPath: string,
  exitCode: number | null,
  signal: NodeJS.Signals | null,
): SidecarIpcError {
  const what = description.action ?? description.messageType ?? "request";
  return new SidecarIpcError(
    "IPC_PEER_EXITED",
    `${what} failed: the receiving process exited (code=${exitCode ?? "null"} signal=${signal ?? "null"}) before it replied: ${socketPath}`,
    { ...description, exitCode, signal, socketPath },
  );
}
