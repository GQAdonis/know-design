/**
 * The brand codemod engine: rename old-brand display text to the new brand, safely
 * and repeatably, and report any old-brand text that was missed.
 *
 * Safety properties, each pinned by `e2e/tests/scripts/brand-codemod.test.ts`:
 *  - idempotent: a rule's replacement never contains its own source, so a second pass changes nothing;
 *  - protected spans (package scope, upstream hosts, licence lines) are masked with a
 *    length-preserving placeholder and are therefore never altered, while positions in
 *    reports stay exact;
 *  - a match is a whole token on its word edges, so `OpenDesign` is never rewritten
 *    inside `OpenDesignPublicMetadata`;
 *  - excluded paths (locale files, brand-asserting tests, generated output) are never read as targets.
 *
 * Pure string functions plus a thin filesystem layer; no network, no process state.
 */

import { matchesGlob } from "node:path";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type BrandRule = {
  /** Restrict the rule to these repo-relative path globs; omitted means every selected file. */
  files?: readonly string[];
  from: string;
  to: string;
};

export type BrandConfig = {
  /** Repo-relative globs never visited, on top of the always-skipped directories. */
  exclude: readonly string[];
  /** Repo-relative globs of files the codemod may rewrite. */
  include: readonly string[];
  /** Regular-expression sources whose matches must never change (the must-not-rename list). */
  protect: readonly string[];
  rules: readonly BrandRule[];
};

export type BrandViolation = {
  column: number;
  excerpt: string;
  file: string;
  line: number;
  match: string;
};

const ALWAYS_SKIPPED_DIRS = new Set([".git", "node_modules", "dist", ".next", ".tmp", "out"]);
const MASK = "\u0000";
const WORD = /[A-Za-z0-9_]/;

export function validateBrandConfig(config: BrandConfig): void {
  for (const rule of config.rules) {
    if (rule.from.length === 0) throw new Error("brand rule has an empty source");
    if (rule.to.includes(rule.from)) {
      throw new Error(`brand rule ${JSON.stringify(rule.from)} -> ${JSON.stringify(rule.to)} is not idempotent: the replacement contains its source`);
    }
  }
  for (const pattern of config.protect) {
    try {
      new RegExp(pattern);
    } catch (error) {
      throw new Error(`invalid protect pattern ${JSON.stringify(pattern)}: ${(error as Error).message}`);
    }
  }
}

function toPosix(path: string): string {
  return sep === "/" ? path : path.split(sep).join("/");
}

function ruleApplies(rule: BrandRule, relPath: string): boolean {
  return rule.files == null || rule.files.some((glob) => matchesGlob(relPath, glob));
}

/** Same length as `text`; every protected character becomes NUL so no rule can match across or inside it. */
function maskProtected(text: string, config: BrandConfig): string {
  if (config.protect.length === 0) return text;
  const combined = new RegExp(config.protect.map((pattern) => `(?:${pattern})`).join("|"), "g");
  return text.replace(combined, (span) => MASK.repeat(span.length));
}

type Match = { index: number; rule: BrandRule };

function findMatches(masked: string, relPath: string, config: BrandConfig): Match[] {
  const matches: Match[] = [];
  for (const rule of config.rules) {
    if (!ruleApplies(rule, relPath)) continue;
    let from = 0;
    for (;;) {
      const index = masked.indexOf(rule.from, from);
      if (index === -1) break;
      from = index + rule.from.length;
      const before = index > 0 ? masked[index - 1]! : "";
      const after = masked[index + rule.from.length] ?? "";
      const startsWord = WORD.test(rule.from[0]!);
      const endsWord = WORD.test(rule.from[rule.from.length - 1]!);
      if (startsWord && WORD.test(before)) continue;
      if (endsWord && WORD.test(after)) continue;
      matches.push({ index, rule });
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

export function applyBrandToText(text: string, relPath: string, config: BrandConfig): string {
  const matches = findMatches(maskProtected(text, config), relPath, config);
  let result = text;
  let cursorEnd = text.length;
  // Right to left, skipping any match that overlaps one already applied.
  for (const { index, rule } of [...matches].reverse()) {
    if (index + rule.from.length > cursorEnd) continue;
    result = result.slice(0, index) + rule.to + result.slice(index + rule.from.length);
    cursorEnd = index;
  }
  return result;
}

export function findStrayBrandStrings(text: string, relPath: string, config: BrandConfig): BrandViolation[] {
  const lines = text.split("\n");
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }
  return findMatches(maskProtected(text, config), relPath, config).map(({ index, rule }) => {
    let line = lineStarts.findIndex((start, i) => index >= start && (i === lineStarts.length - 1 || index < lineStarts[i + 1]!));
    if (line < 0) line = 0;
    return {
      column: index - lineStarts[line]! + 1,
      excerpt: lines[line]!.trim().slice(0, 160),
      file: relPath,
      line: line + 1,
      match: rule.from,
    };
  });
}

function isBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8192).includes(0);
}

function selectFiles(root: string, config: BrandConfig): string[] {
  const selected: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (ALWAYS_SKIPPED_DIRS.has(entry.name)) continue;
        walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        const rel = toPosix(relative(root, join(dir, entry.name)));
        if (!config.include.some((glob) => matchesGlob(rel, glob))) continue;
        if (config.exclude.some((glob) => matchesGlob(rel, glob))) continue;
        selected.push(rel);
      }
    }
  };
  walk(root);
  return selected.sort();
}

function readText(root: string, rel: string): string | null {
  const abs = join(root, rel);
  if (statSync(abs).size > 4 * 1024 * 1024) return null;
  const buffer = readFileSync(abs);
  return isBinary(buffer) ? null : buffer.toString("utf8");
}

export function applyBrandToTree(
  root: string,
  config: BrandConfig,
  options: { write?: boolean } = {},
): { changed: string[] } {
  validateBrandConfig(config);
  const write = options.write ?? true;
  const changed: string[] = [];
  for (const rel of selectFiles(root, config)) {
    const text = readText(root, rel);
    if (text == null) continue;
    const next = applyBrandToText(text, rel, config);
    if (next === text) continue;
    changed.push(rel);
    if (write) writeFileSync(join(root, rel), next, "utf8");
  }
  return { changed };
}

export function verifyBrandTree(root: string, config: BrandConfig): BrandViolation[] {
  validateBrandConfig(config);
  const violations: BrandViolation[] = [];
  for (const rel of selectFiles(root, config)) {
    const text = readText(root, rel);
    if (text == null) continue;
    violations.push(...findStrayBrandStrings(text, rel, config));
  }
  return violations;
}
