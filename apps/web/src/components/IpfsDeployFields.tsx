// KnowDesign: settings and result details for the ipfs-kubo deploy provider.
// Rendered by FileViewer's deploy modal in place of the token row, so the
// upstream-owned modal only gains one branch (docs/knowdesign-upstream-sync.md).

import { useEffect, useState } from 'react';
import { Button, Input } from '@open-design/components';
import type { DeploymentInfo } from '@open-design/contracts';
import { useT } from '../i18n';
import {
  IPFS_KUBO_PROVIDER_ID,
  importDeployEnv,
  updateDeployConfig,
  type WebDeployConfigResponse,
} from '../providers/registry';
import styles from './IpfsDeployFields.module.css';

export interface IpfsDeployFieldsProps {
  config: WebDeployConfigResponse | null;
  onConfigChange: (config: WebDeployConfigResponse) => void;
  onError: (message: string | null) => void;
}

export function IpfsDeployFields({ config, onConfigChange, onError }: IpfsDeployFieldsProps) {
  const t = useT();
  const [rpcUrl, setRpcUrl] = useState(config?.rpcUrl ?? '');
  const [username, setUsername] = useState(config?.username ?? '');
  const [password, setPassword] = useState('');
  const [gatewayUrl, setGatewayUrl] = useState(config?.gatewayUrl ?? '');
  const [ipnsDefault, setIpnsDefault] = useState(config?.ipnsDefault === true);
  const [busy, setBusy] = useState<'save' | 'import' | null>(null);
  const [importedFrom, setImportedFrom] = useState<'daemon-env' | 'login-shell' | null>(null);

  useEffect(() => {
    setRpcUrl(config?.rpcUrl ?? '');
    setUsername(config?.username ?? '');
    setGatewayUrl(config?.gatewayUrl ?? '');
    setIpnsDefault(config?.ipnsDefault === true);
  }, [config?.rpcUrl, config?.username, config?.gatewayUrl, config?.ipnsDefault]);

  async function save() {
    setBusy('save');
    onError(null);
    try {
      const next = await updateDeployConfig({
        providerId: IPFS_KUBO_PROVIDER_ID,
        rpcUrl: rpcUrl.trim(),
        username: username.trim(),
        gatewayUrl: gatewayUrl.trim(),
        ipnsDefault,
        ...(password ? { password } : {}),
      });
      if (next) {
        setPassword('');
        onConfigChange(next);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function importFromShell() {
    setBusy('import');
    onError(null);
    try {
      const result = await importDeployEnv(IPFS_KUBO_PROVIDER_ID);
      setImportedFrom(result.source);
      onConfigChange(result.config);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className={styles.fields}>
      <div className={styles.importRow}>
        <Button type="button" variant="secondary" size="sm" disabled={busy !== null} onClick={() => { void importFromShell(); }}>
          {busy === 'import' ? t('fileViewer.ipfsImporting') : t('fileViewer.ipfsImportFromShell')}
        </Button>
        {importedFrom ? (
          <span className={styles.hint} role="status">
            {importedFrom === 'login-shell' ? t('fileViewer.ipfsImportedShell') : t('fileViewer.ipfsImportedEnv')}
          </span>
        ) : null}
      </div>
      <label className={styles.field}>
        <span className={styles.label}>{t('fileViewer.ipfsRpcUrl')}</span>
        <Input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} spellCheck={false} />
      </label>
      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>{t('fileViewer.ipfsUsername')}</span>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" spellCheck={false} />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t('fileViewer.ipfsPassword')}</span>
          <Input
            type="password"
            value={password}
            autoComplete="current-password"
            placeholder={config?.passwordMask ? t('fileViewer.ipfsPasswordReuseHint') : t('fileViewer.ipfsPasswordPlaceholder')}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>{t('fileViewer.ipfsGatewayUrl')}</span>
        <Input value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} spellCheck={false} />
      </label>
      <label className={styles.checkbox}>
        <input type="checkbox" checked={ipnsDefault} onChange={(e) => setIpnsDefault(e.target.checked)} />
        <span>{t('fileViewer.ipfsIpnsDefault')}</span>
      </label>
      <div className={styles.footer}>
        <p className={styles.notice}>{t('fileViewer.ipfsPublicNotice')}</p>
        <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => { void save(); }}>
          {busy === 'save' ? t('fileViewer.savingConfig') : t('fileViewer.save')}
        </Button>
      </div>
    </div>
  );
}

/** CID and IPNS links for an IPFS deployment result. */
export function IpfsDeploymentDetails({ deployment }: { deployment: DeploymentInfo | null | undefined }) {
  const t = useT();
  const ipfs = deployment?.ipfs;
  if (!ipfs) return null;
  return (
    <dl className={styles.details}>
      <dt>{t('fileViewer.ipfsCid')}</dt>
      <dd><code>{ipfs.cid}</code></dd>
      {ipfs.ipnsUrl ? (
        <>
          <dt>{t('fileViewer.ipfsIpnsLink')}</dt>
          <dd><a href={ipfs.ipnsUrl} target="_blank" rel="noreferrer noopener">{ipfs.ipnsUrl}</a></dd>
        </>
      ) : null}
    </dl>
  );
}
