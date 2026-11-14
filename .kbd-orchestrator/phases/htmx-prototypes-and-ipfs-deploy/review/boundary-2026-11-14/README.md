# Boundary run — htmx-prototypes-and-ipfs-deploy — 2026-11-14

Contract: `../../adopted-contract.json` (digest `f0197e0e…`). Branch `feat/htmx-prototypes-ipfs-deploy`.
Runtime: daemon/web started with `tools-dev` in namespace `htmx-boundary`, with isolated `OD_DATA_DIR` / `OD_USER_STATE_DIR` under the session scratchpad, on Node 24.21.0.

## Checks (logs in this folder)

| Step | Result |
|---|---|
| `pnpm guard` | exit 0 (`guard.log`) |
| `pnpm typecheck` | exit 0 (`typecheck.log`) |
| Daemon tests: deploy-ipfs, env-import, prototype-manifest, cli-deploy, deploy-routes, scenarios roster | 72/72 (`daemon-tests.log`) |
| Web tests: ipfs-deploy-fields, od-mock, od-mock-backend | 19/19 (`web-tests.log`) |
| `validate-manifest.ts` on the template | ok (`validate-manifest.log`) |
| `pnpm lint:craft` | exit 0 (`lint-craft.log`) |

## Scenarios

| ID | Verdict | Evidence |
|---|---|---|
| IPFS-1 | PASS | Fake-Kubo route tests (flags, directory parts, auth, IPNS key reuse, auth failure leaves no row); live run below |
| IPFS-2 | PASS | Password-leak scan across config GET/PUT, deploy and deployments responses, logs, uploads; negative control finds a planted sentinel |
| IPFS-3 | PASS | Unit tests read a real bash login profile with the daemon env empty. Packaged KnowDesign app (`tools-pack mac build --to app`, profile knowdesign) started with no `IPFS_RPC_*` in the daemon env (checked: 0 vars in the daemon process): `POST /api/deploy/config/import-env` returned `source: login-shell`, configured, password masked; a deploy from that daemon authenticated (CID `bafybeibfy4rv34eg3uprt3ahl2q6kk2skoa6adcppu7rbjmfgcdbwixane`, assets 200, `packaged-gateway-status.txt`) |
| IPFS-4 | PASS | `od deploy … --provider ipfs-kubo --ipns` → CID `bafybeib3yf2vw3r4o3dsopvjzpse7pzh442gdi7g67ghf2zis5emiim6d4`, IPNS `k51qzi5uqu5dl7u934gykrg6x2lxy4s27nbgltvqkvz1jq1hx4nllvxqjhqv9p` (`deploy.json`); every asset 200, un-uploaded path 404, IPNS root 200 (`gateway-status.txt`) |
| MOCK-1 | PASS in jsdom, top-level Chromium and the packaged app's renderer; FAIL in the srcdoc preview when the web UI runs in an external browser against a local daemon | See finding below |
| MOCK-2 | PASS | Chromium at the gateway URL: list, 422 validation, create + OOB count, toggle, inline edit, delete, Alpine panel; only the page and vendored files requested |
| TPL-1 | NOT RUN | Needs an agent generation run in the app; the template loads in the daemon scanner and OD Next roster check passes (24 files, 184 KB) |
| MAN-1 | PASS | Validator ok on template and on the deployed project; negative control (route removed) exits 1; preflight warning tests |
| AXUM-1 | PASS | Export → `cargo build`, fmt, clippy clean; curl of every route; Chromium against the server with mock off (list, 422, create, toggle, delete) |
| CONV-1 | PASS | `docs/knowdesign/htmx-conversion.md`; PRs prometheus-skills-mini#86, hybrid-mobile-architecture-skill#28 |

## Finding: local scripts do not load in the sandboxed srcdoc preview (this browser)

In the built-in Chromium, an iframe with `sandbox="allow-scripts allow-downloads"` (KnowDesign's preview flags, opaque origin) fails to load **any** script from a loopback address: the daemon/web origin (root-relative, absolute and base-relative URLs all fail) and another local port. The same frame loads htmx from `cdn.jsdelivr.net`. The URLs answer 200 to curl with cross-site headers and no COEP/CORP/CSP is set. Consistent with Chromium's Local Network Access treating opaque origins as public. Effect: any project with local `<script src>` files is non-interactive in the srcdoc preview here. Not specific to od-mock (the page works top-level, over HTTP, and on IPFS). **Packaged app: not affected.** In the packaged KnowDesign renderer (origin `od://app`), the same sandboxed srcdoc probe loads `vendor/htmx.min.js` from the local daemon and htmx initializes; the app's Chromium runs with `LocalNetworkAccessChecks` disabled. A hosted web deployment serves scripts from its own public host, where Local Network Access does not apply. Affected surface: only the web UI opened in an external browser against a loopback daemon (e.g. `tools-dev`). Packaged-app note: folder import from outside the desktop is refused without the desktop auth token (expected); the project was created through `od project create` + `od files upload` instead.
