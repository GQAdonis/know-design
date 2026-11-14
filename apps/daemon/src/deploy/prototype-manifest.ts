// KnowDesign: deploy preflight check that an htmx prototype's od-prototype.json
// still describes the page being deployed. Warning only; deploy is never
// blocked by it. The same route-set rule is enforced for agents by
// design-templates/htmx-alpine-prototype/scripts/validate-manifest.ts, which
// must stay standalone (it runs inside agent working directories), so the
// small route extractor is intentionally duplicated there.

export const PROTOTYPE_MANIFEST_FILE = 'od-prototype.json';
export const PROTOTYPE_MANIFEST_MISMATCH = 'prototype-manifest-mismatch';
const MAX_LISTED_ROUTES = 5;

interface PlanFile {
  file: string;
  data: Buffer | Uint8Array | string;
}

export interface PrototypeManifestWarning {
  code: typeof PROTOTYPE_MANIFEST_MISMATCH;
  message: string;
  path: string;
}

/** `METHOD /path` for every `<template data-od-route>` in the page. */
export function prototypeRouteKeys(html: string): Set<string> {
  const keys = new Set<string>();
  for (const match of html.matchAll(/<template\b[^>]*\bdata-od-route\s*=\s*(["'])(.*?)\1/gi)) {
    const spec = /^\s*([A-Za-z]+)\s+(\/\S*)\s*$/.exec(match[2] ?? '');
    if (spec) keys.add(`${spec[1]!.toUpperCase()} ${spec[2]}`);
  }
  return keys;
}

/**
 * Compares the deployed entry's route templates with od-prototype.json at the
 * site root. Returns no warning when there is no manifest, or when the
 * manifest describes a different entry file.
 */
export function prototypeManifestWarnings(
  files: readonly PlanFile[],
  entryPath: string,
  entryHtml: string,
): PrototypeManifestWarning[] {
  const manifestFile = files.find((f) => f.file === PROTOTYPE_MANIFEST_FILE);
  if (!manifestFile) return [];
  let manifest: { entry?: unknown; routes?: unknown };
  try {
    const raw = typeof manifestFile.data === 'string' ? manifestFile.data : Buffer.from(manifestFile.data).toString('utf8');
    manifest = JSON.parse(raw) as typeof manifest;
  } catch {
    return [{
      code: PROTOTYPE_MANIFEST_MISMATCH,
      message: `${PROTOTYPE_MANIFEST_FILE} is not valid JSON.`,
      path: PROTOTYPE_MANIFEST_FILE,
    }];
  }
  if (typeof manifest.entry === 'string' && manifest.entry !== entryPath) return [];
  const manifestKeys = new Set(
    (Array.isArray(manifest.routes) ? manifest.routes : [])
      .filter((r): r is { method: unknown; path: unknown } => Boolean(r) && typeof r === 'object')
      .map((r) => `${String(r.method).toUpperCase()} ${String(r.path)}`),
  );
  const pageKeys = prototypeRouteKeys(entryHtml);
  const missingFromManifest = [...pageKeys].filter((k) => !manifestKeys.has(k));
  const missingFromPage = [...manifestKeys].filter((k) => !pageKeys.has(k));
  if (missingFromManifest.length === 0 && missingFromPage.length === 0) return [];
  const parts: string[] = [];
  if (missingFromManifest.length) parts.push(`not in the manifest: ${list(missingFromManifest)}`);
  if (missingFromPage.length) parts.push(`no route template in ${entryPath}: ${list(missingFromPage)}`);
  return [{
    code: PROTOTYPE_MANIFEST_MISMATCH,
    message: `${PROTOTYPE_MANIFEST_FILE} is out of date (${parts.join('; ')}). Conversions to Axum, React or Flutter read the manifest.`,
    path: PROTOTYPE_MANIFEST_FILE,
  }];
}

function list(keys: string[]): string {
  const shown = keys.slice(0, MAX_LISTED_ROUTES).join(', ');
  return keys.length > MAX_LISTED_ROUTES ? `${shown} and ${keys.length - MAX_LISTED_ROUTES} more` : shown;
}
