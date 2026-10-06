import { describe, expect, it } from "vitest";

import {
  STARTUP_EVENTS_FILE_NAME,
  formatStartupEvent,
  lastStartupEvent,
  parseStartupEvents,
  type StartupEvent,
} from "../src/startup-events.js";

const event = (seq: number, phase: string, atMs = seq * 10): StartupEvent => ({ atMs, phase, pid: 4242, seq });

describe("startup events", () => {
  it("names one well-known file so the writer and every reader agree", () => {
    expect(STARTUP_EVENTS_FILE_NAME).toBe("startup-events.jsonl");
  });

  it("round-trips events through one line each", () => {
    const events = [event(1, "process-started"), event(2, "daemon-ready")];
    const text = events.map(formatStartupEvent).join("");
    expect(text.split("\n").filter(Boolean)).toHaveLength(2);
    expect(parseStartupEvents(text)).toEqual(events);
  });

  it("ends every line with a newline so a reader never sees half of an append", () => {
    expect(formatStartupEvent(event(1, "a")).endsWith("\n")).toBe(true);
  });

  it("ignores a trailing partial line and corrupt lines instead of failing", () => {
    const text = `${formatStartupEvent(event(1, "a"))}not json\n{"seq":2}\n${formatStartupEvent(event(3, "c"))}{"seq":4,"phase":"d"`;
    expect(parseStartupEvents(text).map((e) => e.phase)).toEqual(["a", "c"]);
  });

  it("returns events in sequence order even if lines arrive out of order", () => {
    const text = [event(2, "b"), event(1, "a")].map(formatStartupEvent).join("");
    expect(parseStartupEvents(text).map((e) => e.seq)).toEqual([1, 2]);
  });

  it("finds the latest event", () => {
    expect(lastStartupEvent([])).toBeNull();
    expect(lastStartupEvent([event(1, "a"), event(2, "b")])?.phase).toBe("b");
  });
});
