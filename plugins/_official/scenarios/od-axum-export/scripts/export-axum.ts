// Export an htmx-alpine-prototype page to a runnable Axum fragment server.
//
// Usage (Node 24+, no dependencies):
//   node --experimental-strip-types scripts/export-axum.ts <project-dir> <out-dir> [--port 3000]
//
// Reads <project-dir>/od-prototype.json and its entry page, then writes:
//   <out-dir>/Cargo.toml, src/main.rs     generic server (copied from ../assets/server)
//   <out-dir>/routes.json                 one entry per <template data-od-route>, in page order
//   <out-dir>/templates/*.html            route fragments converted to minijinja
//   <out-dir>/seed.json                   the page's od-mock-data
//   <out-dir>/site/index.html (+ vendor/) the page, pointed at the server with <meta name="od-backend">
//   <out-dir>/od-prototype.json           the manifest, for later React/Flutter conversion
//
// The server answers the same routes with the same fragments and the same
// create/update/delete/toggle semantics as od-mock, so the page behaves
// identically against it. Replace the in-memory store in src/main.rs with a
// real repository when the prototype becomes a product.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export interface RouteEntry {
  method: string;
  path: string;
  axumPath: string;
  template: string;
  status: number;
  headers: Record<string, string>;
  action: string | null;
  item: string | null;
  when: string | null;
  whenNot: string | null;
}

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const TAG = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w:-]*)((?:\s+[^\s"'>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*(\/?)>/g;

function attr(attrs: string, name: string): string | null {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>\`]+))`, 'i').exec(attrs);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '') : null;
}

function removeAttr(attrs: string, name: string): string {
  return attrs.replace(new RegExp(`\\s${name}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s"'=<>\`]+)`, 'i'), '');
}

/** od-mock paths use `.length`; minijinja uses the `length` filter. */
export function jinjaExpr(pathExpr: string): string {
  return pathExpr.replace(/\.length\b/g, '|length');
}

function decodeEntities(text: string): string {
  return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

/**
 * Converts od-mock template markup to minijinja: `data-od-each` → for loops,
 * `data-od-if` / `data-od-unless` → if blocks, `{{a.b.length}}` → `{{ a.b|length }}`.
 * Interpolations stay auto-escaped (templates end in .html).
 */
export function convertFragment(markup: string): string {
  let out = '';
  let last = 0;
  const stack: Array<{ tag: string; closers: string[] }> = [];
  for (const match of markup.matchAll(TAG)) {
    out += markup.slice(last, match.index);
    last = match.index! + match[0].length;
    if (match[0].startsWith('<!--')) {
      out += match[0];
      continue;
    }
    const [, slash, rawTag, rawAttrs = '', selfClose] = match;
    const tag = rawTag!.toLowerCase();
    if (slash) {
      // Close the nearest matching open element (dropping any unclosed ones
      // above it) and emit its block closers after the close tag.
      let at = -1;
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        if (stack[i]!.tag === tag) {
          at = i;
          break;
        }
      }
      if (at < 0) {
        out += match[0];
        continue;
      }
      const entry = stack[at]!;
      stack.length = at;
      out += match[0] + entry.closers.join('');
      continue;
    }
    let attrs = rawAttrs;
    let openers = '';
    const closers: string[] = [];
    const ifPath = attr(attrs, 'data-od-if');
    if (ifPath !== null) {
      attrs = removeAttr(attrs, 'data-od-if');
      openers += `{% if ${jinjaExpr(ifPath)} %}`;
      closers.unshift('{% endif %}');
    }
    const unlessPath = attr(attrs, 'data-od-unless');
    if (unlessPath !== null) {
      attrs = removeAttr(attrs, 'data-od-unless');
      openers += `{% if not ${jinjaExpr(unlessPath)} %}`;
      closers.unshift('{% endif %}');
    }
    const eachPath = attr(attrs, 'data-od-each');
    if (eachPath !== null) {
      attrs = removeAttr(attrs, 'data-od-each');
      openers += `{% for item in ${jinjaExpr(eachPath)} %}{% set index = loop.index0 %}`;
      closers.unshift('{% endfor %}');
    }
    const openTag = `<${rawTag}${attrs}${selfClose ? ' /' : ''}>`;
    if (selfClose || VOID_ELEMENTS.has(tag)) {
      out += openers + openTag + closers.join('');
    } else {
      out += openers + openTag;
      stack.push({ tag, closers });
    }
  }
  out += markup.slice(last);
  return out.replace(/\{\{\s*([\w$.-]+)\s*\}\}/g, (_w, expr: string) => `{{ ${jinjaExpr(expr)} }}`);
}

/** Finds every top-level `<template data-od-route>` element with its inner markup. */
export function extractRouteTemplates(html: string): Array<{ attrs: string; inner: string; start: number; end: number }> {
  const found: Array<{ attrs: string; inner: string; start: number; end: number }> = [];
  const re = /<template\b([^>]*)>|<\/template\s*>/gi;
  let depth = 0;
  let current: { attrs: string; start: number; innerStart: number } | null = null;
  for (const match of html.matchAll(re)) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0 && current) {
        found.push({ attrs: current.attrs, inner: html.slice(current.innerStart, match.index), start: current.start, end: match.index! + match[0].length });
        current = null;
      }
      continue;
    }
    if (depth === 0 && /\bdata-od-route\s*=/.test(match[1] ?? '')) {
      current = { attrs: match[1] ?? '', start: match.index!, innerStart: match.index! + match[0].length };
    }
    if (current || depth > 0) depth += 1;
  }
  return found;
}

export function buildRoutes(html: string): { routes: RouteEntry[]; templates: Record<string, string> } {
  const routes: RouteEntry[] = [];
  const templates: Record<string, string> = {};
  extractRouteTemplates(html).forEach((t, index) => {
    const spec = /^\s*([A-Za-z]+)\s+(\/\S*)\s*$/.exec(attr(` ${t.attrs}`, 'data-od-route') ?? '');
    if (!spec) return;
    const method = spec[1]!.toUpperCase();
    const routePath = spec[2]!;
    const slug = routePath.replace(/^\/+/, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '') || 'root';
    const name = `${String(index).padStart(2, '0')}_${method.toLowerCase()}_${slug}.html`;
    templates[name] = convertFragment(t.inner).trim() + '\n';
    const headerSpec = attr(` ${t.attrs}`, 'data-od-headers');
    let headers: Record<string, string> = {};
    if (headerSpec) {
      try {
        headers = JSON.parse(decodeEntities(headerSpec)) as Record<string, string>;
      } catch {
        headers = {};
      }
    }
    routes.push({
      method,
      path: routePath,
      axumPath: routePath.replace(/:([A-Za-z_][\w]*)/g, '{$1}'),
      template: name,
      status: Number(attr(` ${t.attrs}`, 'data-od-status') ?? 200) || 200,
      headers,
      action: attr(` ${t.attrs}`, 'data-od-action'),
      item: attr(` ${t.attrs}`, 'data-od-item'),
      when: attr(` ${t.attrs}`, 'data-od-when'),
      whenNot: attr(` ${t.attrs}`, 'data-od-when-not'),
    });
  });
  return { routes, templates };
}

export function extractSeed(html: string): unknown {
  const match = /<script\b[^>]*\bid\s*=\s*["']od-mock-data["'][^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!match) return {};
  try {
    return JSON.parse(match[1]!.trim() || '{}');
  } catch {
    throw new Error('od-mock-data is not valid JSON');
  }
}

/** The page for the server: route templates and seed data removed, od-backend pointed at the server. */
export function sitePage(html: string, backendUrl: string): string {
  let page = html;
  for (const t of extractRouteTemplates(html).reverse()) page = page.slice(0, t.start) + page.slice(t.end);
  page = page.replace(/\s*<script\b[^>]*\bid\s*=\s*["']od-mock-data["'][^>]*>[\s\S]*?<\/script>/i, '');
  page = page.replace(/\s*<!--\s*<meta name="od-backend"[^>]*>\s*-->/i, '');
  page = page.replace(/<meta\s+name=["']od-backend["'][^>]*>\s*/i, '');
  return page.replace(/<head([^>]*)>/i, `<head$1>\n  <meta name="od-backend" content="${backendUrl}">`);
}

function main(argv: string[]) {
  const [projectDir, outDir] = argv.filter((a) => !a.startsWith('--'));
  const portIndex = argv.indexOf('--port');
  const port = portIndex >= 0 ? Number(argv[portIndex + 1]) : 3000;
  if (!projectDir || !outDir || !Number.isInteger(port)) {
    console.error('usage: export-axum.ts <project-dir> <out-dir> [--port 3000]');
    process.exit(2);
  }
  const manifestPath = path.join(projectDir, 'od-prototype.json');
  if (!existsSync(manifestPath)) throw new Error(`no od-prototype.json in ${projectDir}; run validate-manifest.ts first`);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { entry?: string };
  const entry = manifest.entry ?? 'index.html';
  const html = readFileSync(path.join(projectDir, entry), 'utf8');
  const { routes, templates } = buildRoutes(html);
  if (routes.length === 0) throw new Error(`${entry} has no <template data-od-route> elements`);

  const here = path.dirname(new URL(import.meta.url).pathname);
  const serverAssets = path.resolve(here, '../assets/server');
  mkdirSync(path.join(outDir, 'templates'), { recursive: true });
  mkdirSync(path.join(outDir, 'site'), { recursive: true });
  cpSync(serverAssets, outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'routes.json'), JSON.stringify(routes, null, 2) + '\n');
  for (const [name, body] of Object.entries(templates)) writeFileSync(path.join(outDir, 'templates', name), body);
  writeFileSync(path.join(outDir, 'seed.json'), JSON.stringify(extractSeed(html), null, 2) + '\n');
  const backendUrl = `http://127.0.0.1:${port}`;
  writeFileSync(path.join(outDir, 'site', 'index.html'), sitePage(html, backendUrl));
  for (const dir of ['vendor', 'assets/vendor']) {
    const src = path.join(projectDir, dir);
    if (existsSync(src)) cpSync(src, path.join(outDir, 'site', dir), { recursive: true });
  }
  cpSync(manifestPath, path.join(outDir, 'od-prototype.json'));
  console.log(`exported ${routes.length} route template(s) to ${outDir}`);
  console.log(`run: (cd ${outDir} && PORT=${port} cargo run) then open ${backendUrl}/`);
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname);
if (invokedDirectly) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
