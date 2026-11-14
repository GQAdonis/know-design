# Tasks: ipfs-deploy-provider

## 1. Implementation

- [x] 1.1 Contracts: add `'ipfs-kubo'` to `DeployProviderId`; optional IPFS config fields on `DeployConfigResponse`/`UpdateDeployConfigRequest` (`rpcUrl`, `username`, `passwordMask`, `gatewayUrl`, `ipnsDefault`); optional `ipfs` on `DeploymentInfo`; `ImportDeployEnvResponse`.
- [x] 1.2 Daemon: `deploy/ipfs.ts` (0600 config read/write/public with masked password; Kubo `add` multipart with pin/cid-version=1/raw-leaves/wrap-with-directory; `key/list`→`key/gen`→`name/publish`; env import from `process.env` else `$SHELL -lc`, values never logged or returned); branches in dispatchers and the deploy route using `assetUrlPolicy: 'share-relative'` and `hookScriptUrl: ''`; metadata `{cid,gatewayUrl,ipnsKey,ipnsName}` in `provider_metadata_json`; `publicDeployment` derives `ipfs`; D-008 signed-in gate on the hosted web surface.
- [x] 1.3 Daemon tests (`apps/daemon/tests/deploy-ipfs.test.ts`, `deploy-ipfs-env-import.test.ts`) against a fake Kubo server: request flags, directory layout, auth header, IPNS reuse, auth failure, and a password-leak scan across responses, logs, uploads and DB.
- [x] 1.4 CLI: `od deploy --provider ipfs-kubo [--ipns]`; `od deploy config --provider ipfs-kubo [--from-env | --rpc-url --username --password-stdin --gateway-url]` with `--json`.
- [x] 1.5 Web: registry provider id; `IpfsDeployFields` (CSS Module) rendered in place of the token row; Import from shell button; result card with CID link, IPNS link, copy; first-deploy notice that pinned content is public; focused component test.
- [x] 1.6 i18n: add keys to `apps/web/src/i18n/types.ts` first, then all 19 locales; `pnpm --filter @open-design/web typecheck`; record every upstream-file edit in `docs/knowdesign-upstream-sync.md`.
