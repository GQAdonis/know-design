// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { NewProjectPanel } from '../../src/components/NewProjectPanel';
import { resetWebBuildProfileForTests, setWebBuildProfile } from '../../src/collab/build-profile';

describe('NewProjectPanel media provider badges', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('treats daemon-restored apiKeyConfigured providers as configured', () => {
    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[]}
        onCreate={vi.fn()}
        mediaProviders={{
          openai: {
            apiKey: '',
            apiKeyConfigured: true,
            apiKeyTail: '1234',
            baseUrl: '',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    // Model picker is now a combobox — open the popover so the
    // provider group + status badge become visible in the DOM.
    fireEvent.click(screen.getByTestId('model-picker-trigger'));

    const openaiGroup = screen.getByText('OpenAI').closest('.ds-picker-group');
    expect(openaiGroup?.textContent).toContain('Configured');
    expect(openaiGroup?.textContent).not.toContain('Integrated');
  });

  it('hides provider models until the provider has usable credentials', () => {
    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[]}
        onCreate={vi.fn()}
        mediaProviders={{}}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.click(screen.getByTestId('model-picker-trigger'));

    expect(screen.queryByText('OpenAI')).toBeNull();
    expect(screen.queryByTestId('model-picker-option-gpt-image-2')).toBeNull();
  });

  it('uses Vela as the default image provider without media API credentials', async () => {
    const onCreate = vi.fn();
    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[]}
        onCreate={onCreate}
        mediaProviders={{}}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    await waitFor(() => {
      expect(screen.getByTestId('model-picker-trigger').textContent).toContain('gpt-image-2 (Cloud)');
    });
    fireEvent.change(screen.getByTestId('new-project-name'), {
      target: { value: 'Vela default image' },
    });
    fireEvent.click(screen.getByTestId('create-project'));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          kind: 'image',
          imageModel: 'vela/gpt-image-2',
          imageAspect: '1:1',
        }),
      }),
    );
  });

  it('treats a legacy template gpt-image-2 recommendation as the managed Cloud route', async () => {
    const template = {
      id: 'legacy-gpt-image-template',
      surface: 'image' as const,
      title: 'Legacy GPT image template',
      summary: 'A legacy first-party image template.',
      category: 'Poster',
      tags: ['legacy'],
      model: 'gpt-image-2',
      aspect: '16:9' as const,
      source: {
        repo: 'example/templates',
        license: 'MIT',
      },
    };
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      promptTemplate: {
        ...template,
        prompt: 'A detailed cinematic image prompt with enough content for validation.',
      },
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })));
    const onCreate = vi.fn();

    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[template]}
        onCreate={onCreate}
        mediaProviders={{
          openai: {
            apiKey: '',
            apiKeyConfigured: true,
            apiKeyTail: '1234',
            baseUrl: '',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.click(screen.getByTestId('prompt-template-trigger'));
    fireEvent.click(screen.getByRole('option', { name: /Legacy GPT image template/ }));
    await waitFor(() => {
      expect(screen.getByTestId('prompt-template-body')).toHaveValue(
        'A detailed cinematic image prompt with enough content for validation.',
      );
    });
    fireEvent.change(screen.getByTestId('new-project-name'), {
      target: { value: 'Managed template image' },
    });
    fireEvent.click(screen.getByTestId('create-project'));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          kind: 'image',
          imageModel: 'vela/gpt-image-2',
          imageAspect: '16:9',
          promptTemplate: expect.objectContaining({
            model: 'vela/gpt-image-2',
          }),
        }),
      }),
    );
  });

  it('preserves an explicit OpenAI model picker selection as BYOK', () => {
    const onCreate = vi.fn();
    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[]}
        onCreate={onCreate}
        mediaProviders={{
          openai: {
            apiKey: '',
            apiKeyConfigured: true,
            apiKeyTail: '1234',
            baseUrl: '',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.click(screen.getByTestId('model-picker-trigger'));
    fireEvent.click(screen.getByTestId('model-picker-option-gpt-image-2'));
    fireEvent.change(screen.getByTestId('new-project-name'), {
      target: { value: 'Explicit BYOK image' },
    });
    fireEvent.click(screen.getByTestId('create-project'));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          imageModel: 'gpt-image-2',
        }),
      }),
    );
  });

  it('does not treat OpenAI OAuth-only markers as usable image credentials', () => {
    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[]}
        onCreate={vi.fn()}
        mediaProviders={{
          openai: {
            apiKey: '',
            apiKeyConfigured: true,
            apiKeyTail: '',
            source: 'oauth-codex',
            baseUrl: '',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.click(screen.getByTestId('model-picker-trigger'));

    expect(screen.queryByText('OpenAI')).toBeNull();
    expect(screen.queryByTestId('model-picker-option-gpt-image-2')).toBeNull();
  });

  it('keeps the managed Vela default when another provider is configured', () => {
    const onCreate = vi.fn();
    render(
      <NewProjectPanel
        skills={[]}
        designSystems={[]}
        defaultDesignSystemId={null}
        templates={[]}
        onDeleteTemplate={vi.fn()}
        promptTemplates={[]}
        onCreate={onCreate}
        mediaProviders={{
          volcengine: {
            apiKey: '',
            apiKeyConfigured: true,
            apiKeyTail: '5678',
            baseUrl: '',
          },
        }}
      />,
    );

    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.change(screen.getByTestId('new-project-name'), {
      target: { value: 'Configured provider image' },
    });
    fireEvent.click(screen.getByTestId('create-project'));

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          imageModel: 'vela/gpt-image-2',
        }),
      }),
    );
  });
});

// Under the knowdesign profile the managed Vela image route is gone, so a new image project must
// never be created with a `vela/*` model. The web learns the profile from the boot health response,
// which can arrive after the panel has already mounted with the Vela default selected.
describe('NewProjectPanel image default under the knowdesign profile', () => {
  const panel = (onCreate: Mock<(input: unknown) => void>) => (
    <NewProjectPanel
      skills={[]}
      designSystems={[]}
      defaultDesignSystemId={null}
      templates={[]}
      onDeleteTemplate={vi.fn()}
      promptTemplates={[]}
      onCreate={onCreate}
      mediaProviders={{}}
    />
  );

  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
      unobserve() {}
    });
    Element.prototype.scrollIntoView = vi.fn();
    resetWebBuildProfileForTests();
  });

  afterEach(() => {
    cleanup();
    resetWebBuildProfileForTests();
    vi.unstubAllGlobals();
  });

  async function createImageProject(onCreate: Mock<(input: unknown) => void>) {
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    fireEvent.change(screen.getByTestId('new-project-name'), { target: { value: 'No Vela image' } });
    fireEvent.click(screen.getByTestId('create-project'));
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    return onCreate.mock.calls[0]![0] as { metadata: { kind?: string; imageModel?: string } };
  }

  it('never creates a vela/* image project when the profile is set before mount', async () => {
    setWebBuildProfile('knowdesign');
    const onCreate = vi.fn<(input: unknown) => void>();
    render(panel(onCreate));
    const created = await createImageProject(onCreate);
    // With no credentials and no Vela route there may be no usable model at all; what must never
    // happen is a managed Vela model, which the profile-off test above shows this flow does pick.
    expect(created.metadata.kind).toBe('image');
    expect(String(created.metadata.imageModel ?? '').startsWith('vela/')).toBe(false);
  });

  it('switches off the Vela default when the profile is learned after the panel mounted', async () => {
    const onCreate = vi.fn<(input: unknown) => void>();
    render(panel(onCreate));
    fireEvent.click(screen.getByRole('tab', { name: 'Media' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Image' }));
    await waitFor(() => {
      expect(screen.getByTestId('model-picker-trigger').textContent).toContain('gpt-image-2 (Cloud)');
    });

    act(() => setWebBuildProfile('knowdesign'));

    const created = await createImageProject(onCreate);
    // With no credentials and no Vela route there may be no usable model at all; what must never
    // happen is a managed Vela model, which the profile-off test above shows this flow does pick.
    expect(created.metadata.kind).toBe('image');
    expect(String(created.metadata.imageModel ?? '').startsWith('vela/')).toBe(false);
  });
});
