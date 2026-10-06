import { describe, expect, it, vi } from "vitest";

import { SidecarPhaseTracker, parseSidecarPhase } from "../src/phase.js";

describe("SidecarPhaseTracker", () => {
  it("starts with no phase and numbers each distinct phase in the order it was reported", () => {
    const tracker = new SidecarPhaseTracker();
    expect(tracker.current()).toBeNull();
    expect(tracker.report("ipc-bound")).toEqual({ name: "ipc-bound", seq: 1 });
    expect(tracker.report("daemon-ready")).toEqual({ name: "daemon-ready", seq: 2 });
    expect(tracker.current()).toEqual({ name: "daemon-ready", seq: 2 });
  });

  it("reporting the phase it is already in is not a new event", () => {
    const tracker = new SidecarPhaseTracker();
    tracker.report("web-ready");
    const listener = vi.fn();
    tracker.onChange(listener);
    expect(tracker.report("web-ready")).toEqual({ name: "web-ready", seq: 1 });
    expect(listener).not.toHaveBeenCalled();
  });

  it("tells listeners about every transition, in order, and stops after unsubscribe", () => {
    const tracker = new SidecarPhaseTracker();
    const seen: string[] = [];
    const unsubscribe = tracker.onChange((phase) => seen.push(`${phase.seq}:${phase.name}`));
    tracker.report("a");
    tracker.report("b");
    unsubscribe();
    tracker.report("c");
    expect(seen).toEqual(["1:a", "2:b"]);
  });

  it("a throwing listener cannot break reporting or other listeners", () => {
    const tracker = new SidecarPhaseTracker();
    const survivor = vi.fn();
    tracker.onChange(() => {
      throw new Error("listener bug");
    });
    tracker.onChange(survivor);
    expect(() => tracker.report("a")).not.toThrow();
    expect(survivor).toHaveBeenCalledWith({ name: "a", seq: 1 });
  });

  it("hands out snapshots that cannot be used to change the tracker", () => {
    const tracker = new SidecarPhaseTracker();
    const phase = tracker.report("a") as { name: string; seq: number };
    expect(() => {
      phase.seq = 99;
    }).toThrow();
    expect(tracker.current()).toEqual({ name: "a", seq: 1 });
  });

  it("rejects an empty phase name", () => {
    expect(() => new SidecarPhaseTracker().report("")).toThrow(/phase name/i);
  });
});

describe("parseSidecarPhase", () => {
  it("treats an absent phase (an older sidecar) as no phase", () => {
    expect(parseSidecarPhase(undefined)).toBeNull();
    expect(parseSidecarPhase(null)).toBeNull();
  });

  it("accepts a well-formed phase", () => {
    expect(parseSidecarPhase({ name: "web-ready", seq: 4 })).toEqual({ name: "web-ready", seq: 4 });
  });

  it("rejects malformed phases instead of guessing", () => {
    for (const bad of [{}, { name: "", seq: 1 }, { name: "x", seq: 0 }, { name: "x", seq: 1.5 }, { name: 3, seq: 1 }, "x", 7]) {
      expect(() => parseSidecarPhase(bad), JSON.stringify(bad)).toThrow(/phase/i);
    }
  });
});
