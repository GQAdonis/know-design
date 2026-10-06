// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesDir = resolve(__dirname, '../../src/styles');
const upstream = readFileSync(resolve(stylesDir, 'tokens.css'), 'utf8');
const layer = readFileSync(resolve(stylesDir, 'tokens-knowdesign.css'), 'utf8');

const BASE = 'html[data-brand="knowdesign"]';
const DARK = 'html[data-brand="knowdesign"][data-theme="dark"]';
const SYSTEM_DARK = 'html[data-brand="knowdesign"]:not([data-theme])';

/** Custom properties declared by each top-level or @media-nested rule, keyed by selector. */
function parseBlocks(css: string): Map<string, Map<string, string>> {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = new Map<string, Map<string, string>>();
  const rule = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = rule.exec(stripped)) != null) {
    const selector = match[1]!.replace(/@media[^{]*\{/, '').trim();
    const declarations = new Map<string, string>();
    for (const decl of match[2]!.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) declarations.set(decl[1]!, decl[2]!.trim());
    if (declarations.size > 0) blocks.set(selector, declarations);
  }
  return blocks;
}

const ours = parseBlocks(layer);
const upstreamVars = new Set([...(parseBlocks(upstream).values())].flatMap((block) => [...block.keys()]));

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
const isHex = (value: string | undefined): value is string => value != null && /^#[0-9a-f]{6}$/i.test(value);

describe('KnowDesign token layer', () => {
  it('declares the three expected theme blocks', () => {
    expect([...ours.keys()].sort()).toEqual([BASE, DARK, SYSTEM_DARK].sort());
  });

  it('only overrides variables that exist in the upstream token file', () => {
    const unknown = [...ours.values()].flatMap((block) => [...block.keys()]).filter((name) => !upstreamVars.has(name));
    expect([...new Set(unknown)]).toEqual([]);
  });

  it('gives explicit dark and system dark the identical palette', () => {
    expect([...ours.get(SYSTEM_DARK)!.entries()].sort()).toEqual([...ours.get(DARK)!.entries()].sort());
  });

  it('themes every colour variable in both light and dark, so no theme falls back to upstream grey/green', () => {
    const light = ours.get(BASE)!;
    const dark = ours.get(DARK)!;
    const themeIndependent = new Set(['--send-ground', '--send-ink', '--upgrade-ground', '--upgrade-ink']);
    const missingInDark = [...light.keys()].filter((name) => !themeIndependent.has(name) && !dark.has(name));
    const missingInLight = [...dark.keys()].filter((name) => !light.has(name));
    expect(missingInDark).toEqual([]);
    expect(missingInLight).toEqual([]);
  });

  it('never uses the upstream brand green or neutral send colour', () => {
    expect(layer).not.toMatch(/#87ea5c|#00ff08|#adf788/i);
  });

  for (const [label, selector] of [['light', BASE], ['dark', DARK]] as const) {
    describe(`${label} contrast (WCAG AA)`, () => {
      const t = ours.get(selector)!;
      const surfaces = ['--bg', '--bg-panel', '--bg-subtle'] as const;
      for (const ink of ['--text', '--text-strong', '--text-muted'] as const) {
        for (const surface of surfaces) {
          it(`${ink} on ${surface} is at least 4.5:1`, () => {
            expect(isHex(t.get(ink)) && isHex(t.get(surface))).toBe(true);
            expect(contrast(t.get(ink)!, t.get(surface)!)).toBeGreaterThanOrEqual(4.5);
          });
        }
      }
      it('brand text on its soft surface is at least 4.5:1', () => {
        expect(contrast(t.get('--brand-text')!, t.get('--brand-soft')!)).toBeGreaterThanOrEqual(4.5);
      });
      it('accent contrast on accent is at least 4.5:1', () => {
        expect(contrast(t.get('--accent-contrast')!, t.get('--accent')!)).toBeGreaterThanOrEqual(4.5);
      });
    });
  }

  it('keeps the send and upgrade marks readable (ink on ground at least 4.5:1)', () => {
    const base = ours.get(BASE)!;
    expect(contrast(base.get('--send-ink')!, base.get('--send-ground')!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(base.get('--upgrade-ink')!, base.get('--upgrade-ground')!)).toBeGreaterThanOrEqual(4.5);
  });
});
