import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SidecarIpcError, requestJsonIpc } from "../src/json-ipc.js";

// A request must end on an EVENT (a reply, the peer exiting, the connection closing) and
// never depend on a clock unless the caller explicitly asks for one. These tests use real
// sockets; the only timer in this file is the explicit-timeout case, which is what that
// option means.

type FakePeer = EventEmitter & { exitCode: number | null; signalCode: NodeJS.Signals | null };
const fakePeer = (): FakePeer => Object.assign(new EventEmitter(), { exitCode: null, signalCode: null });

describe("requestJsonIpc liveness", () => {
  let dir: string;
  let socketPath: string;
  let server: Server;
  let sockets: Socket[];

  const listen = async (onConnection: (socket: Socket) => void): Promise<void> => {
    server = createServer((socket) => {
      sockets.push(socket);
      onConnection(socket);
    });
    await new Promise<void>((resolve) => server.listen(socketPath, resolve));
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "od-ipc-"));
    socketPath = join(dir, "s.sock");
    sockets = [];
  });
  afterEach(async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => (server ? server.close(() => resolve()) : resolve()));
    rmSync(dir, { force: true, recursive: true });
  });

  const invokeMessage = { action: "register-web-url", app: "daemon", input: { url: "http://x" }, type: "sidecar:invoke" };

  it("keeps the timeout message byte-identical and adds typed detail", async () => {
    await listen(() => {}); // accepts, never replies
    const error = await requestJsonIpc(socketPath, invokeMessage, { timeoutMs: 40 }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SidecarIpcError);
    const ipc = error as SidecarIpcError;
    expect(ipc.message).toBe(`IPC request timed out: ${socketPath}`);
    expect(ipc.code).toBe("IPC_TIMEOUT");
    expect(ipc.messageType).toBe("sidecar:invoke");
    expect(ipc.action).toBe("register-web-url");
    expect(ipc.socketPath).toBe(socketPath);
  });

  it("rejects the moment the connection closes without a reply, long before any timeout", async () => {
    await listen((socket) => socket.on("data", () => socket.destroy()));
    const error = (await requestJsonIpc(socketPath, invokeMessage, { timeoutMs: 600_000 }).catch((e: unknown) => e)) as SidecarIpcError;
    expect(error).toBeInstanceOf(SidecarIpcError);
    expect(error.code).toBe("IPC_CLOSED");
    expect(error.action).toBe("register-web-url");
  });

  it("with a peer, waits on events only and rejects when the peer exits", async () => {
    await listen(() => {}); // never replies
    const peer = fakePeer();
    const pending = requestJsonIpc(socketPath, invokeMessage, { peer }).catch((e: unknown) => e);
    await new Promise((resolve) => server.once("connection", resolve));
    peer.exitCode = 3;
    peer.emit("exit", 3, null);
    const error = (await pending) as SidecarIpcError;
    expect(error).toBeInstanceOf(SidecarIpcError);
    expect(error.code).toBe("IPC_PEER_EXITED");
    expect(error.exitCode).toBe(3);
    expect(error.message).toContain("register-web-url");
    expect(error.message).toContain("exited");
  });

  it("with a peer that already exited, rejects without connecting", async () => {
    await listen(() => {});
    const peer = fakePeer();
    peer.signalCode = "SIGKILL";
    const error = (await requestJsonIpc(socketPath, invokeMessage, { peer }).catch((e: unknown) => e)) as SidecarIpcError;
    expect(error.code).toBe("IPC_PEER_EXITED");
    expect(error.signal).toBe("SIGKILL");
    expect(sockets).toHaveLength(0);
  });

  it("a reply wins and the peer listener is removed", async () => {
    await listen((socket) => socket.on("data", () => socket.end(`${JSON.stringify({ ok: true, result: { accepted: true } })}\n`)));
    const peer = fakePeer();
    await expect(requestJsonIpc(socketPath, invokeMessage, { peer })).resolves.toEqual({ accepted: true });
    expect(peer.listenerCount("exit")).toBe(0);
  });

  it("an error reply is surfaced as a typed error carrying the remote message", async () => {
    await listen((socket) =>
      socket.on("data", () => socket.end(`${JSON.stringify({ error: { message: "sidecar runtime is starting" }, ok: false })}\n`)),
    );
    const error = (await requestJsonIpc(socketPath, invokeMessage).catch((e: unknown) => e)) as SidecarIpcError;
    expect(error.message).toBe("sidecar runtime is starting");
    expect(error.code).toBe("IPC_REMOTE_ERROR");
  });

  it("an explicit timeoutMs is still honoured alongside a peer", async () => {
    await listen(() => {});
    const error = (await requestJsonIpc(socketPath, invokeMessage, { peer: fakePeer(), timeoutMs: 40 }).catch((e: unknown) => e)) as SidecarIpcError;
    expect(error.code).toBe("IPC_TIMEOUT");
  });

  it("without a peer the default timeout still applies (behaviour unchanged for existing callers)", async () => {
    await listen(() => {});
    const error = (await requestJsonIpc(socketPath, invokeMessage, { timeoutMs: 30 }).catch((e: unknown) => e)) as SidecarIpcError;
    expect(error.code).toBe("IPC_TIMEOUT");
  });
});
