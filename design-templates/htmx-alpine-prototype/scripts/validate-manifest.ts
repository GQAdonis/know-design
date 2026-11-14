// Validates od-prototype.json against its entry page.
//
// Usage (Node 24+, no dependencies):
//   node --experimental-strip-types scripts/validate-manifest.ts <project-dir | path/to/od-prototype.json>
//
// Exit 0 when the manifest is well-formed and its routes match the page's
// <template data-od-route> set exactly; exit 1 with a list of problems
// otherwise. Mirrors references/od-prototype.schema.json without needing a
// JSON Schema library, so it runs inside any agent working directory.

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
const KINDS = new Set(['list', 'detail', 'create', 'update', 'delete', 'toggle', 'form', 'action']);
const FIELD_TYPES = new Set(['string', 'number', 'boolean', 'date', 'datetime', 'text', 'url', 'email']);
const STATE_TYPES = new Set(['boolean', 'string', 'number']);

export interface ValidationResult {
  ok: boolean;
  problems: string[];
  warnings: string[];
}

type Json = Record<string, unknown>;

/** `METHOD /path` keys for every route template in the page, in document order. */
export function htmlRouteKeys(html: string): string[] {
  const keys: string[] = [];
  for (const match of html.matchAll(/<template\b[^>]*\bdata-od-route\s*=\s*(["'])(.*?)\1/gi)) {
    const spec = /^\s*([A-Za-z]+)\s+(\/\S*)\s*$/.exec(match[2] ?? '');
    if (spec) keys.push(`${spec[1]!.toUpperCase()} ${spec[2]}`);
  }
  return keys;
}

export function htmlComponentNames(html: string): string[] {
  const names = new Set<string>();
  for (const match of html.matchAll(/\bdata-od-component\s*=\s*(["'])([A-Za-z0-9]+)\1/g)) names.add(match[2]!);
  return [...names];
}

export function validateManifest(manifest: unknown, html: string): ValidationResult {
  const problems: string[] = [];
  const warnings: string[] = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { ok: false, problems: ['manifest is not a JSON object'], warnings };
  }
  const m = manifest as Json;
  if (m.version !== 1) problems.push('version must be 1');
  if (typeof m.entry !== 'string' || !m.entry) problems.push('entry must name the entry HTML file');
  for (const key of ['routes', 'components', 'state', 'entities']) {
    if (!Array.isArray(m[key])) problems.push(`${key} must be an array`);
  }
  if (!m.tokens || typeof m.tokens !== 'object') problems.push('tokens must be an object with source and roles');
  if (problems.length > 0) return { ok: false, problems, warnings };

  const entities = new Map<string, Json>();
  (m.entities as Json[]).forEach((entity, i) => {
    if (typeof entity.name !== 'string') problems.push(`entities[${i}].name is required`);
    const fields = entity.fields as Json | undefined;
    if (!fields || typeof fields !== 'object') problems.push(`entities[${i}].fields is required`);
    else {
      if (!('id' in fields)) problems.push(`entities[${i}] (${String(entity.name)}) must declare an id field`);
      for (const [field, type] of Object.entries(fields)) {
        if (!FIELD_TYPES.has(String(type))) problems.push(`entities[${i}].fields.${field} has unknown type ${String(type)}`);
      }
    }
    if (typeof entity.name === 'string') entities.set(entity.name, entity);
  });

  const manifestKeys = new Set<string>();
  (m.routes as Json[]).forEach((route, i) => {
    const method = String(route.method ?? '');
    const routePath = String(route.path ?? '');
    if (!METHODS.has(method)) problems.push(`routes[${i}].method ${method} is not one of ${[...METHODS].join(', ')}`);
    if (!routePath.startsWith('/')) problems.push(`routes[${i}].path must be root-relative`);
    if (!KINDS.has(String(route.kind ?? ''))) problems.push(`routes[${i}].kind ${String(route.kind)} is not valid`);
    if (typeof route.entity !== 'string' || !entities.has(route.entity)) {
      problems.push(`routes[${i}] (${method} ${routePath}) references unknown entity ${String(route.entity)}`);
    }
    const key = `${method} ${routePath}`;
    if (manifestKeys.has(key)) problems.push(`routes lists ${key} twice`);
    manifestKeys.add(key);
  });

  const htmlKeys = new Set(htmlRouteKeys(html));
  for (const key of htmlKeys) if (!manifestKeys.has(key)) problems.push(`page route ${key} is missing from the manifest`);
  for (const key of manifestKeys) if (!htmlKeys.has(key)) problems.push(`manifest route ${key} has no <template data-od-route> in the page`);

  const componentNames = new Set((m.components as Json[]).map((c) => String(c.name)));
  for (const name of htmlComponentNames(html)) {
    if (!componentNames.has(name)) problems.push(`data-od-component="${name}" is missing from components`);
  }
  for (const name of componentNames) {
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) problems.push(`component name ${name} must be PascalCase`);
  }

  (m.state as Json[]).forEach((scope, i) => {
    if (!componentNames.has(String(scope.component))) warnings.push(`state[${i}].component ${String(scope.component)} is not a listed component`);
    const fields = scope.fields as Json | undefined;
    for (const [field, type] of Object.entries(fields ?? {})) {
      if (!STATE_TYPES.has(String(type))) problems.push(`state[${i}].fields.${field} has unknown type ${String(type)}`);
    }
  });

  const tokens = m.tokens as Json;
  if (typeof tokens.source !== 'string') problems.push('tokens.source is required');
  if (!Array.isArray(tokens.roles)) problems.push('tokens.roles must be an array');
  else for (const role of tokens.roles as unknown[]) {
    if (typeof role !== 'string' || role.startsWith('--')) problems.push(`tokens.roles entry ${String(role)} must be a name without the leading --`);
    else if (!html.includes(`--${role}`)) warnings.push(`token --${role} is not used in the page`);
  }

  return { ok: problems.length === 0, problems, warnings };
}

function resolveInputs(arg: string): { manifestPath: string; manifest: unknown; html: string } {
  const manifestPath = existsSync(arg) && statSync(arg).isDirectory() ? path.join(arg, 'od-prototype.json') : arg;
  if (!existsSync(manifestPath)) throw new Error(`no od-prototype.json at ${manifestPath}`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Json;
  const entry = typeof manifest.entry === 'string' ? manifest.entry : 'index.html';
  const htmlPath = path.join(path.dirname(manifestPath), entry);
  if (!existsSync(htmlPath)) throw new Error(`entry ${entry} not found next to ${manifestPath}`);
  return { manifestPath, manifest, html: readFileSync(htmlPath, 'utf8') };
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  const arg = process.argv[2] ?? '.';
  try {
    const { manifestPath, manifest, html } = resolveInputs(arg);
    const result = validateManifest(manifest, html);
    for (const warning of result.warnings) console.warn(`warning: ${warning}`);
    if (!result.ok) {
      for (const problem of result.problems) console.error(`error: ${problem}`);
      console.error(`${manifestPath}: ${result.problems.length} problem(s)`);
      process.exit(1);
    }
    console.log(`${manifestPath}: ok`);
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
