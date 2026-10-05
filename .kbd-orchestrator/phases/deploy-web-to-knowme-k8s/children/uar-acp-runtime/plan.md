# PLAN: deploy-web-to-knowme-k8s › uar-acp-runtime

- **Date**: 2026-10-03 · **Inherited from** `../backend-complete-replacement/plan.md` as amended by `plan-amendments.md` (spike result, D-013/D-014). Change text below is copied from the umbrella and is authoritative here.
- **Changes**: 3
- **Round order**: Round 1: uar-acp-wrapper-core · Round 2: uar-acp-tools-permissions-and-files · Round 3: uar-runtime-registration-and-modes
- **Decisions in force**: D-001…D-014 in `../backend-complete-replacement/decision-log.md`.

## CHANGE LIST (ordered)

### 16. `uar-acp-wrapper-core`  *(new component, Rust, in the UAR workspace)*
- **Scope**: new binary · **Depends on**: NONE · **Agent**: Claude Code / Codex · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 4
- **library**: cand-012, cand-013, cand-014
- **Details**: `uar acp` stdio binary on the official `agent-client-protocol` crate, skeleton from `openai-proxy/src/acp.rs`. Implements `initialize`, `session/new|load` (model list in the `session/new` result so `detectAcpModels` works), `set_model`/`set_config_option`, `prompt` (stream → `agent_message_chunk` / `agent_thought_chunk`), `cancel` (→ `POST /api/uar/runs/{id}/cancel`), env-based auth (`UAR_BASE_URL`, `UAR_PAT` → JWT exchange with refresh), keepalive `session/update` under the 10-min watchdog.
- **Acceptance**: passes the open-design ACP conformance mock (`mocks/lib/format-acp.mjs` fixtures) and a real `detectAcpModels` probe; cancellation stops a live UAR run; a 401 on token exchange surfaces as a clear JSON-RPC error on `session/new`.

### 17. `uar-acp-tools-permissions-and-files`
- **Scope**: wrapper · **Depends on**: 16 · **Agent**: Claude Code / Codex · **Est.**: L · **Score**: High · **Model class**: frontier · **Value**: HIGH · **Goals**: 4
- **Details**: Map `TOOL_CALL_*` → `tool_call`/`tool_call_update` (with `locations[].path` and `rawInput` so artifact accounting works); map `uar.tool.approval_required` → `session/request_permission` (**always offer `allow_once`** or the daemon fails the turn) then `POST …/approval`. **Filesystem by mode (D-009):** `UAR_MODE=sidecar` — UAR started with the project cwd as workspace root so its file tools write directly (**needs UAR to accept a caller-provided root: verify, else add it upstream in UAR**); `UAR_MODE=remote` — wrapper materialises file-write results into the cwd with strict confinement (reject `..`/absolute paths outside cwd) and declares shell/binary side effects unsupported.
- **Acceptance**: sidecar mode — a UAR-authored file appears in the project directory and is detected as an artifact; remote mode — same, with a **path-traversal negative test** (`../../etc/x` rejected); an approval round-trip (approve and deny) is exercised; the wrapper never blocks on a missing allow option.

### 18. `uar-runtime-registration-and-modes`
- **Scope**: daemon + contracts + web + mocks + docs · **Depends on**: 16, 17 · **Agent**: Claude Code · **Est.**: M · **Score**: Medium · **Model class**: frontier · **Value**: HIGH · **Goals**: 4
- **Details**: Register `defs/uar.ts` as a kimi-style ACP def (`bin`, `buildArgs: ['acp']`, `streamFormat: 'acp-json-rpc'`, `externalMcpInjection: 'acp-merge'`); wire `UAR_BIN` env map, agent-id lists (`app-config.ts`, `executables.ts`, `auth.ts`, contracts analytics lists, `App.tsx`, `AgentIcon` + SVG), mock `mocks/bin/uar` + manifest, `docs/agent-adapters.md`. **Mode selection (D-009)** as settings: *Local sidecar* (app starts/stops `uar` bound to the app lifecycle through the sidecar boundary, not ad-hoc spawns) vs *Remote* (base URL + PAT; same host or cloud). Settings UI + `od` flag + HTTP together; new strings in 19 locales.
- **Acceptance**: UAR appears in agent detection when the binary is present, and the picker works in both modes; sidecar lifecycle follows app start/stop (stop leaves no orphan process); remote mode works against a URL with a PAT; ACP stays intact for every other runtime (existing runtime suites unchanged); `pnpm guard` + `pnpm typecheck` + 19-locale check pass. **Surface rule:** on web, remote mode only; sidecar is desktop-only (matrix).

