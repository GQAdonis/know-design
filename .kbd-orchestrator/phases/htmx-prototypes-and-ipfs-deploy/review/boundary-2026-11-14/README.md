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
| TPL-1 | PASS | Packaged KnowDesign app (namespace `knowdesign-htmx-boundary-pack`): `od project create --skill htmx-alpine-prototype` (the same `skillId` the New project → Start from rail sends), then a Claude Code run on OD Next 3.3.8. Turn 1 wrote a plan (OD Next plans before building); turn 2, after "go ahead", built it. Output: `index.html` (9 `data-od-route` templates incl. `whenNot form.title` guards, 15 `data-od-component` roots), `vendor/` byte-identical to the template's MANIFEST-listed files, and `od-prototype.json` (7 routes, 7 components, 2 state, entity `books`, tokens) that passes `validate-manifest.ts`. All flows work at the daemon URL and on IPFS (CID `bafybeihzx5l4iikwlgiunqhi3pd2wgak5ejejdskwa2qijbrwlhg4fbmye`, IPNS `k51qzi5uqu5djkvf1yn2bk5dwthk2zrq6e9koom2nn7jbki70gtlgdi47j56rj`; deploy returned no manifest-mismatch warning). Evidence: `tpl1/`. Findings: `vendor` is in the daemon's `IGNORED_PROJECT_DIR_NAMES`, so the file panel hides the folder while preview and deploy serve it; added books go to the bottom, not the top the plan promised. Negative control not run as a generation (a fresh project has no files) |
| MAN-1 | PASS | Validator ok on template and on the deployed project; negative control (route removed) exits 1; preflight warning tests |
| AXUM-1 | PASS | Export → `cargo build`, fmt, clippy clean; curl of every route; Chromium against the server with mock off (list, 422, create, toggle, delete) |
| CONV-1 | PASS | `docs/knowdesign/htmx-conversion.md`; PRs prometheus-skills-mini#86, hybrid-mobile-architecture-skill#28 |

## Finding: local scripts do not load in the sandboxed srcdoc preview (this browser)

In the built-in Chromium, an iframe with `sandbox="allow-scripts allow-downloads"` (KnowDesign's preview flags, opaque origin) fails to load **any** script from a loopback address: the daemon/web origin (root-relative, absolute and base-relative URLs all fail) and another local port. The same frame loads htmx from `cdn.jsdelivr.net`. The URLs answer 200 to curl with cross-site headers and no COEP/CORP/CSP is set. Consistent with Chromium's Local Network Access treating opaque origins as public. Effect: any project with local `<script src>` files is non-interactive in the srcdoc preview here. Not specific to od-mock (the page works top-level, over HTTP, and on IPFS). **Packaged app: not affected.** In the packaged KnowDesign renderer (origin `od://app`), the same sandboxed srcdoc probe loads `vendor/htmx.min.js` from the local daemon and htmx initializes; the app's Chromium runs with `LocalNetworkAccessChecks` disabled. A hosted web deployment serves scripts from its own public host, where Local Network Access does not apply. Affected surface: only the web UI opened in an external browser against a loopback daemon (e.g. `tools-dev`). Packaged-app note: folder import from outside the desktop is refused without the desktop auth token (expected); the project was created through `od project create` + `od files upload` instead.
