// @vitest-environment jsdom
//
// The loading shell is what a web install shows before the app mounts, so it
// follows the web brand like the rest of the UI.

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { LoadingShell } from '../src/brand/LoadingShell';
import { resetWebBuildProfileForTests, setWebBuildProfile } from '../src/collab/build-profile';

afterEach(() => {
  cleanup();
  resetWebBuildProfileForTests();
});

describe('loading shell brand', () => {
  it('keeps the stock text and the white-screen class with the profile off', () => {
    const { container } = render(<LoadingShell />);
    expect(container.querySelector('.od-loading-shell')?.textContent).toContain('Loading OpenDesign…');
  });

  it('names KnowDesign once the profile is known', () => {
    const { container } = render(<LoadingShell />);
    act(() => setWebBuildProfile('knowdesign'));
    const text = container.querySelector('.od-loading-shell')?.textContent ?? '';
    expect(text).toContain('Loading KnowDesign…');
    expect(text).not.toMatch(/Open ?Design/);
  });
});
