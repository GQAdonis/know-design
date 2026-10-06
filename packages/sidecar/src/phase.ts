/**
 * Startup phases as an observable, ordered signal.
 *
 * A sidecar that takes a while to become ready can announce where it is. Each distinct phase gets
 * the next sequence number, so a caller polling `describe` (the one request that answers even
 * before the runtime is ready) can tell progress from silence, and can name the phase a failure
 * happened in, without any clock. The package attaches no meaning to the names: the application
 * chooses them. Reporting the phase already in effect is not a new event.
 */

export type SidecarPhase = Readonly<{ name: string; seq: number }>;

export class SidecarPhaseTracker {
  #current: SidecarPhase | null = null;
  readonly #listeners = new Set<(phase: SidecarPhase) => void>();

  current(): SidecarPhase | null {
    return this.#current;
  }

  report(name: string): SidecarPhase {
    if (typeof name !== "string" || name.length === 0) throw new Error("sidecar phase name must be a non-empty string");
    if (this.#current?.name === name) return this.#current;
    const next: SidecarPhase = Object.freeze({ name, seq: (this.#current?.seq ?? 0) + 1 });
    this.#current = next;
    for (const listener of [...this.#listeners]) {
      try {
        listener(next);
      } catch {
        // A listener is an observer. It must never be able to stop startup or hide a phase from
        // the others.
      }
    }
    return next;
  }

  onChange(listener: (phase: SidecarPhase) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
}

/** Validate a phase received over IPC. Absent means an older sidecar that reports none. */
export function parseSidecarPhase(value: unknown): SidecarPhase | null {
  if (value == null) return null;
  const phase = value as { name?: unknown; seq?: unknown };
  if (
    typeof value !== "object" ||
    typeof phase.name !== "string" ||
    phase.name.length === 0 ||
    typeof phase.seq !== "number" ||
    !Number.isSafeInteger(phase.seq) ||
    phase.seq < 1
  ) {
    throw new Error("sidecar endpoint described an invalid phase");
  }
  return Object.freeze({ name: phase.name, seq: phase.seq });
}
