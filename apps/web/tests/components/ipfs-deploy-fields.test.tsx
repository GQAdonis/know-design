// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IpfsDeployFields, IpfsDeploymentDetails } from '../../src/components/IpfsDeployFields';
import { en } from '../../src/i18n/locales/en';
import type { WebDeployConfigResponse } from '../../src/providers/registry';

// Scenario IPFS-3 UI path (phase htmx-prototypes-and-ipfs-deploy).

const savedConfig: WebDeployConfigResponse = {
  providerId: 'ipfs-kubo',
  configured: true,
  tokenMask: '',
  teamId: '',
  teamSlug: '',
  rpcUrl: 'https://rpc.example/api/v0',
  username: 'kd-user',
  passwordMask: 'saved-ipfs-password',
  gatewayUrl: 'https://gw.example',
  ipnsDefault: false,
  target: 'production',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('IpfsDeployFields', () => {
  it('imports from the shell via the daemon endpoint and reports the source', async () => {
    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ source: 'login-shell', imported: ['IPFS_RPC_USER', 'IPFS_RPC_PASSWORD'], config: savedConfig }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const onConfigChange = vi.fn();
    render(<IpfsDeployFields config={null} onConfigChange={onConfigChange} onError={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: en['fileViewer.ipfsImportFromShell'] }));

    await waitFor(() => expect(onConfigChange).toHaveBeenCalledWith(savedConfig));
    expect(fetchMock).toHaveBeenCalledWith('/api/deploy/config/import-env', expect.objectContaining({ method: 'POST' }));
    expect(screen.getByRole('status').textContent).toBe(en['fileViewer.ipfsImportedShell']);
  });

  it('shows the saved-password hint and never pre-fills the password', () => {
    render(<IpfsDeployFields config={savedConfig} onConfigChange={vi.fn()} onError={vi.fn()} />);
    const password = screen.getByPlaceholderText(en['fileViewer.ipfsPasswordReuseHint']) as HTMLInputElement;
    expect(password.type).toBe('password');
    expect(password.value).toBe('');
    expect((screen.getByDisplayValue('kd-user') as HTMLInputElement).value).toBe('kd-user');
  });

  it('saves without a password field when none was typed, so the stored one is kept', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(
      JSON.stringify(savedConfig),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    render(<IpfsDeployFields config={savedConfig} onConfigChange={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByLabelText(en['fileViewer.ipfsIpnsDefault']));
    fireEvent.click(screen.getByRole('button', { name: en['fileViewer.save'] }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body));
    expect(body).toEqual({
      providerId: 'ipfs-kubo',
      rpcUrl: 'https://rpc.example/api/v0',
      username: 'kd-user',
      gatewayUrl: 'https://gw.example',
      ipnsDefault: true,
    });
  });

  it('surfaces import failures through onError', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(
      JSON.stringify({ error: { code: 'IPFS_ENV_NOT_FOUND', message: 'not found in your login shell' } }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    )));
    const onError = vi.fn();
    render(<IpfsDeployFields config={null} onConfigChange={vi.fn()} onError={onError} />);
    fireEvent.click(screen.getByRole('button', { name: en['fileViewer.ipfsImportFromShell'] }));
    await waitFor(() => expect(onError).toHaveBeenLastCalledWith('not found in your login shell'));
  });
});

describe('IpfsDeploymentDetails', () => {
  it('renders the CID and IPNS link', () => {
    render(
      <IpfsDeploymentDetails
        deployment={{
          id: 'd1', projectId: 'p1', fileName: 'index.html', providerId: 'ipfs-kubo', url: 'https://gw.example/ipfs/bafy/',
          deploymentCount: 1, target: 'production', status: 'ready', createdAt: 1, updatedAt: 2,
          ipfs: { cid: 'bafyroot', gatewayUrl: 'https://gw.example/ipfs/bafyroot/', ipnsUrl: 'https://gw.example/ipns/k51x/' },
        }}
      />,
    );
    expect(screen.getByText('bafyroot')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://gw.example/ipns/k51x/');
  });

  it('renders nothing for non-IPFS deployments', () => {
    const { container } = render(<IpfsDeploymentDetails deployment={null} />);
    expect(container.textContent).toBe('');
  });
});
