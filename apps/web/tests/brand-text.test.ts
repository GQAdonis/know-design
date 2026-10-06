import { afterEach, describe, expect, it } from 'vitest';
import { KNOWDESIGN_BRAND, OPEN_DESIGN_BRAND } from '@open-design/contracts';
import { brandText, brandTextNow, githubUrl } from '../src/brand/brand-text';
import { resetWebBuildProfileForTests, setWebBuildProfile } from '../src/collab/build-profile';
import { LOCALES } from '../src/i18n/types';
import { en } from '../src/i18n/locales/en';
import { de } from '../src/i18n/locales/de';
import { ar } from '../src/i18n/locales/ar';
import { zhCN } from '../src/i18n/locales/zh-CN';

afterEach(() => resetWebBuildProfileForTests());

const KD = KNOWDESIGN_BRAND;

describe('brandText', () => {
  it('is the identity for the Open Design brand', () => {
    const s = 'Welcome to Open Design and OpenDesign, see nexu-io/open-design';
    expect(brandText(s, OPEN_DESIGN_BRAND)).toBe(s);
  });

  it('replaces spaced and compact tokens under knowdesign', () => {
    expect(brandText('Open Design is OpenDesign', KD)).toBe('KnowDesign is KnowDesign');
  });

  it('is idempotent', () => {
    const once = brandText('Open Design / OpenDesign', KD);
    expect(brandText(once, KD)).toBe(once);
  });

  it('keeps protected spans', () => {
    const s =
      'Open Design: @open-design/web, https://releases.open-design.ai/x, nexu-io/open-design, (c) Open Design contributors';
    expect(brandText(s, KD)).toBe(
      'KnowDesign: @open-design/web, https://releases.open-design.ai/x, nexu-io/open-design, (c) Open Design contributors',
    );
  });

  it('only matches whole tokens', () => {
    expect(brandText('OpenDesignHost Open_Design OpenDesigner xOpenDesign', KD)).toBe(
      'OpenDesignHost Open_Design OpenDesigner xOpenDesign',
    );
    expect(brandText("OpenDesign's, (OpenDesign) 的Open Design。", KD)).toBe(
      "KnowDesign's, (KnowDesign) 的KnowDesign。",
    );
  });

  it('passes every value of every bundled locale through without throwing', () => {
    expect(LOCALES.length).toBe(19);
    for (const dict of [en, de, ar, zhCN]) {
      for (const value of Object.values(dict)) {
        if (typeof value === 'string') expect(() => brandText(value, KD)).not.toThrow();
      }
    }
  });

  it('leaves no unprotected Open Design token in English locale values', () => {
    for (const value of Object.values(en)) {
      if (typeof value !== 'string') continue;
      const out = brandText(value, KD).replace(
        /@open-design\/[\w.-]+|[\w.-]*open-design\.ai|nexu-io\/open-design|Open Design contributors/g,
        '',
      );
      expect(out).not.toMatch(/(?<![A-Za-z0-9_])(Open Design|OpenDesign)(?![A-Za-z0-9_])/);
    }
  });
});

describe('live profile helpers', () => {
  it('resolves at call time', () => {
    expect(brandTextNow('Open Design')).toBe('Open Design');
    expect(githubUrl('/releases')).toBe('https://github.com/nexu-io/open-design/releases');
    setWebBuildProfile('knowdesign');
    expect(brandTextNow('Open Design')).toBe('KnowDesign');
    expect(githubUrl('/releases')).toBe(`https://github.com/${KD.githubRepo}/releases`);
  });
});
