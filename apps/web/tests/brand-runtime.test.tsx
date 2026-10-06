// @vitest-environment jsdom
//
// Runtime brand substitution (D-014a): locale files and upstream tests stay
// byte-identical; the brand is applied from the web build profile at render time.

import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PrivacyConsentModal } from '../src/components/PrivacyConsentModal';
import { BrandDocumentTitle } from '../src/brand/BrandDocumentTitle';
import { I18nProvider, useT } from '../src/i18n';
import { resetWebBuildProfileForTests, setWebBuildProfile } from '../src/collab/build-profile';
import { agentDisplayName } from '../src/utils/agentLabels';
import { derivePluginSourceLinks } from '../src/runtime/plugin-source';

afterEach(() => {
  cleanup();
  resetWebBuildProfileForTests();
  document.title = '';
});

const OLD = /Open ?Design/;

function Probe() {
  const t = useT();
  return <p data-testid="probe">{t('labs.title')}</p>;
}

describe('runtime brand substitution', () => {
  it('leaves Open Design untouched with the profile off', () => {
    render(<I18nProvider initial="en"><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('Open Design Labs');
  });

  it('re-renders with the new name when the profile arrives after mount', () => {
    render(<I18nProvider initial="en"><Probe /></I18nProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('Open Design Labs');
    act(() => setWebBuildProfile('knowdesign'));
    expect(screen.getByTestId('probe').textContent).toBe('KnowDesign Labs');
  });

  it('brands a real component and its repo link', () => {
    const { container } = render(
      <I18nProvider initial="en">
        <PrivacyConsentModal onShare={() => {}} onDecline={() => {}} />
      </I18nProvider>,
    );
    const link = () => container.querySelector('a.privacy-consent-policy-link')!.getAttribute('href');
    expect(container.textContent).toMatch(OLD);
    expect(link()).toBe('https://github.com/nexu-io/open-design/blob/main/PRIVACY.md');
    act(() => setWebBuildProfile('knowdesign'));
    expect(container.textContent).not.toMatch(OLD);
    expect(container.textContent).toContain('KnowDesign');
    expect(link()).toBe('https://github.com/GQAdonis/knowdesign/blob/main/PRIVACY.md');
  });

  it('rewrites the document title once the profile is known', () => {
    document.title = 'OpenDesign';
    render(<BrandDocumentTitle />);
    expect(document.title).toBe('OpenDesign');
    act(() => setWebBuildProfile('knowdesign'));
    expect(document.title).toBe('KnowDesign');
  });

  it('stamps and clears data-brand on the root element as the profile changes', () => {
    render(<BrandDocumentTitle />);
    expect(document.documentElement.dataset.brand).toBeUndefined();
    act(() => setWebBuildProfile('knowdesign'));
    expect(document.documentElement.dataset.brand).toBe('knowdesign');
    act(() => setWebBuildProfile('default'));
    expect(document.documentElement.dataset.brand).toBeUndefined();
  });

  it('brands non-React string paths at call time', () => {
    expect(agentDisplayName('amr')).toBe('OpenDesign');
    setWebBuildProfile('knowdesign');
    expect(agentDisplayName('amr')).toBe('KnowDesign');
  });

  it('points official plugin source links at the brand repo', () => {
    const record = {
      source: 'bundled',
      sourceKind: 'bundled',
      pinnedRef: null,
      fsPath: '/x',
      manifest: {},
    } as unknown as Parameters<typeof derivePluginSourceLinks>[0];
    expect(derivePluginSourceLinks(record).sourceLabel).toBe('nexu-io/open-design');
    setWebBuildProfile('knowdesign');
    const links = derivePluginSourceLinks(record);
    expect(links.sourceLabel).toBe('GQAdonis/knowdesign');
    expect(links.sourceUrl).toBe('https://github.com/GQAdonis/knowdesign');
  });
});
