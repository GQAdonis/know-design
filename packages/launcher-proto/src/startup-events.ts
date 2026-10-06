/**
 * The ordered record of how a packaged app started, one JSON object per line.
 *
 * The app appends an event each time it passes a startup phase; anything watching (tools-pack while a
 * launch is converging, an e2e that failed) reads the file to say where startup is or where it stopped.
 * It is observation only: nothing decides success or failure from a time measured here, and the
 * `atMs` stamps exist for people reading a failure, never for control flow.
 */

export const STARTUP_EVENTS_FILE_NAME = "startup-events.jsonl" as const;

export type StartupEvent = {
  /** Milliseconds since the writing process started (diagnostic only). */
  atMs: number;
  phase: string;
  pid: number;
  /** 1-based order in which the writing process passed its phases. */
  seq: number;
};

/** One complete line, newline included, so appending it is all-or-nothing from a reader's view. */
export function formatStartupEvent(event: StartupEvent): string {
  return `${JSON.stringify({ atMs: event.atMs, phase: event.phase, pid: event.pid, seq: event.seq })}\n`;
}

/** Parse the file's text. Corrupt lines and a trailing partial line are skipped, never fatal. */
export function parseStartupEvents(text: string): StartupEvent[] {
  const events: StartupEvent[] = [];
  const lines = text.split("\n");
  // The last element is either "" (text ended with a newline) or a line still being written.
  lines.pop();
  for (const line of lines) {
    if (line.length === 0) continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      continue;
    }
    const candidate = value as Partial<StartupEvent> | null;
    if (
      candidate != null &&
      typeof candidate === "object" &&
      typeof candidate.phase === "string" &&
      candidate.phase.length > 0 &&
      Number.isSafeInteger(candidate.seq) &&
      Number.isSafeInteger(candidate.pid) &&
      typeof candidate.atMs === "number" &&
      Number.isFinite(candidate.atMs)
    ) {
      events.push({ atMs: candidate.atMs, phase: candidate.phase, pid: candidate.pid as number, seq: candidate.seq as number });
    }
  }
  return events.sort((a, b) => a.seq - b.seq);
}

export function lastStartupEvent(events: readonly StartupEvent[]): StartupEvent | null {
  return events.length === 0 ? null : events[events.length - 1]!;
}
