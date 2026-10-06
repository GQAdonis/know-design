import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { parseStartupEvents } from '@open-design/launcher-proto';

import { createStartupEventRecorder } from '../src/startup-events.js';

describe('startup event recorder', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'od-startup-events-'));
  });
  afterEach(() => rmSync(dir, { force: true, recursive: true }));

  it('appends each phase as a numbered line, in the order they were passed', () => {
    const filePath = join(dir, 'startup-events.jsonl');
    let clock = 100;
    const recorder = createStartupEventRecorder({ filePath, now: () => (clock += 5), pid: 77 });
    recorder.record('process-started');
    recorder.record('daemon-ready');
    expect(parseStartupEvents(readFileSync(filePath, 'utf8'))).toEqual([
      { atMs: 105, phase: 'process-started', pid: 77, seq: 1 },
      { atMs: 110, phase: 'daemon-ready', pid: 77, seq: 2 },
    ]);
  });

  it('a new process starts a fresh record instead of appending to the last run', () => {
    const filePath = join(dir, 'startup-events.jsonl');
    writeFileSync(filePath, 'stale from a previous launch\n');
    createStartupEventRecorder({ filePath, now: () => 0, pid: 1 }).record('process-started');
    const events = parseStartupEvents(readFileSync(filePath, 'utf8'));
    expect(events.map((e) => e.phase)).toEqual(['process-started']);
  });

  it('recording the phase it is already in changes nothing', () => {
    const filePath = join(dir, 'startup-events.jsonl');
    const recorder = createStartupEventRecorder({ filePath, now: () => 0, pid: 1 });
    recorder.record('a');
    recorder.record('a');
    expect(parseStartupEvents(readFileSync(filePath, 'utf8'))).toHaveLength(1);
  });

  it('can never break startup: an unwritable path is swallowed', () => {
    const recorder = createStartupEventRecorder({ filePath: join(dir, 'missing', 'deeper', 'x.jsonl'), now: () => 0, pid: 1 });
    expect(() => recorder.record('process-started')).not.toThrow();
  });

  it('reports the phases it has recorded', () => {
    const recorder = createStartupEventRecorder({ filePath: join(dir, 'e.jsonl'), now: () => 0, pid: 1 });
    recorder.record('a');
    recorder.record('b');
    expect(recorder.phases()).toEqual(['a', 'b']);
  });
});
