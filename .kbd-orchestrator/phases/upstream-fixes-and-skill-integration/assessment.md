# ASSESSMENT: upstream-fixes-and-skill-integration

Project: open-design (fork of `nexu-io/open-design`; origin `GQAdonis/open-design`)
Date: 2026-08-09
Codebase baseline: v0.16.2, `main` @ `6fe7f5284`, 7 commits ahead of merge-base `4e47119ed` and **25 commits behind `upstream/main`**.
Cross-tool progress: none — this is the phase's first assessment.

---

## IMPLEMENTATION STATUS

Mapped to the four phase goals.

### Goal 1 — Remove the forced cloud login

- **The blocking gate**: [CONFIRMED] `apps/web/src/components/EntryShell.tsx:588-594`

  ```ts
  useEffect(() => {
    // The entry shell is the authenticated Home surface. A definitive
    // signed-out result returns it to the Cloud identity gate ...
    if (amrLoggedIn !== false || view === 'onboarding') return;
    navigate({ kind: 'home', view: 'onboarding' }, { replace: true });
  }, [amrLoggedIn, view]);
  ```

  A confirmed-signed-out user is redirected from **every** Home surface to the
  sign-in screen. `{ replace: true }` destroys history, so Back does not escape.
  The dependency array is `[amrLoggedIn, view]`, so the redirect re-fires on any
  change to either — i.e. every attempt to navigate to another Home view while
  signed out is re-caught. The upstream comment names the mechanism itself:
  *"the Cloud identity gate."*

- **BYOK/Local-CLI are downstream of sign-in**: [CONFIRMED] The model-source
  screen (`setStep(1)`) — which is where Local CLI and BYOK live — is reachable
  only from `continueAfterCloudSignIn()` (`EntryShell.tsx:2497-2506`) and
  `handleBackWithTracking()` (`:2484`, which requires already being at step 2).
  Every caller of `continueAfterCloudSignIn` is gated on a positive signed-in
  status. **You cannot choose the local/BYOK runtime without first
  authenticating to the cloud.** This is the sharpest finding in the assessment.

- **The gate is client-side only**: [CONFIRMED] The daemon has no blanket cloud
  auth middleware. Workspace enforcement is switched by
  `OD_WORKSPACE_CONTEXT_SOURCE === 'vela'`, checked at `server.ts:2948, 3014,
  4781, 6637`. The **only** non-test setter in the tree is
  `apps/packaged/src/workspace-team.ts:37`, and it fires only for baked AMR
  profiles `{feature-test, prod, test}` *and* an injected Vela web origin. Its
  own docblock (`:11-13`) states a build without that origin *"degrades to
  local-only instead of pointing at an unknown backend"* — local-only is a
  **named, supported degradation mode** upstream.

- **`od` CLI never consults the gate**: [CONFIRMED] `SUBCOMMAND_MAP`
  (`apps/daemon/src/cli.ts:370-411`) exposes 40 subcommands; none check
  `amrLoggedIn`. The single vela reference (`cli.ts:799`) is the *opt-in* login
  command. The CLI is already unblocked today.

- **Unbound projects stay reachable**: [CONFIRMED] Row-conditional early-outs at
  `collab/workspace-resource-mutation.ts:620,686` — *"No persisted Workspace
  binding means this is a genuine legacy/local resource."* Upstream is actively
  patching workspace-less paths back in (`254d31287` "allow workspace-less
  design system deletion").

- **No offline-mode flag exists**: [CONFIRMED] Grep for
  `OD_OFFLINE|offlineMode|localOnlyMode|disableCloud|skipSignIn|SELF_HOST`
  across `apps/daemon/src`, `apps/web/src`, `apps/packaged/src` returns **zero
  hits**. There is no first-class user-facing way to *choose* local-only.

- **Other cloud couplings (post-gate offline operability)**: surveyed, because
  removing the gate alone does not satisfy "fully operational offline."
  - **Telemetry — fail-safe.** [CONFIRMED] `apps/daemon/src/analytics.ts:1-3`:
    *"without `POSTHOG_KEY` in the env every entry point is a no-op, so dev
    builds and third-party forks impose zero overhead."* Key check at `:182`.
    A fork that does not set the key sends nothing. **Not a blocker.**
  - **Auto-update — present, opt-out unverified.** [PARTIAL] A scheduler exists
    (`apps/desktop/src/main/updater/scheduler.ts:105`,
    `apps/desktop/src/main/runtime.ts:2480`). Grep for
    `OD_DISABLE_UPDATE|updateCheckEnabled|disableUpdate` returned **no hits**, so
    whether checks can be disabled — and whether they fail gracefully with no
    network — is **UNKNOWN**. Needs confirmation in analyze.
  - **Model resolution — fails closed by design.** [CONFIRMED] The AMR runtime
    ships `fallbackModels: []` (`runtimes/defs/amr.ts:649`) and fetches its model
    list remotely. Signed out or offline, AMR has no models. This is intended
    upstream behavior, but it means **"remove the gate" alone leaves the default
    runtime unusable offline** — a local CLI or BYOK runtime must be selected,
    which is exactly what the gate currently makes unreachable. The two problems
    are linked.

  **This survey is not exhaustive** — asset/CDN fetches and first-run resource
  downloads were not audited.

**Status: MISSING** (a local-first mode as a supported, user-selectable state).
The substrate is intact; the choice is absent. Note that Goal 1 as written
("fully operational offline") is **broader than the gate**: at minimum it also
requires a runtime whose models resolve without the network.

### Goal 2 — Prometheus skill pack integration

- **External skill install already ships**: [CONFIRMED]
  `POST /api/skills/install` (`apps/daemon/src/routes/static-resource.ts:1073`)
  and `od skill install` (`cli.ts:8953`). Accepts `github:owner/repo` and
  HTTPS `.tar.gz`.
- **Local-path install already works at the HTTP layer**: [CONFIRMED]
  `static-resource.ts:1085-1088` handles `{source:'local', path}` — but the CLI
  help (`cli.ts` usage string) advertises only GitHub/tarball. The capability
  exists and is under-surfaced.
- **Discovery is not repo-limited**: [CONFIRMED] `USER_SKILLS_DIR` =
  `<RUNTIME_DATA_DIR>/skills` shadows the bundled root; re-scanned per request,
  no restart needed (`skills.ts:232-490`, `server.ts:1131,1152`).
- **The source pack is large and is NOT a single skill**: [CONFIRMED]
  `/Users/gqadonis/Projects/prometheus/prometheus-skill-pack` contains **606
  `SKILL.md` files** (`find … -not -path '*/node_modules/*' | wc -l`) across 18
  domains, and is already a Claude plugin (`.claude-plugin/plugin.json`, v1.7.0)
  installed in the user's Claude plugin cache at
  `~/.claude/plugins/cache/prometheus-skill-pack/prometheus-skill-pack/1.7.0/`.
  *(Corrected from an earlier count of 619, which had not excluded
  `node_modules`.)*

- **"Detect" has no existing mechanism**: [CONFIRMED — MISSING] The goal says
  *"detect or install"*. Detection does not exist: skill discovery reads only
  `USER_SKILLS_DIR` and `SKILLS_DIR` (`server.ts:1152`), and plugin discovery
  walks its own six fixed tiers (`docs/plugins-spec.md:455-467`). Nothing scans
  `~/.claude/plugins/`, `~/.claude/skills/`, or any external pack location. The
  pack is installed *for Claude Code* on this machine and is invisible to Open
  Design. Detection would be net-new.
- **Multi-skill pack install is missing**: [CONFIRMED] The installer expects one
  top-level `SKILL.md`; folder/zip import is explicitly Phase-2 *not
  implemented* (`specs/current/skills-and-design-templates.md:83-91`).

- **The stated *purpose* is ungapped, not just the mechanics.** The goal says the
  pack must be present "so the work done here can be more easily integrated with
  the code projects that this may be ejected to." Install mechanics are only half
  of that. The other half — **does an ejected project carry the Prometheus skills
  with it?** — has no supporting machinery today:
  - `od plugin export` exports a *plugin definition*, not a project
    (`apps/daemon/src/plugins/export.ts`).
  - The archive ZIP (`projects.ts:516`) emits `DESIGN-HANDOFF.md` /
    `DESIGN-MANIFEST.json` but carries **no** skill/plugin payload and no
    `.claude/` or `AGENTS.md` scaffolding.
  - Nothing writes a consuming project's agent config.

  So even with the pack installed in OD, an ejected codebase would arrive with
  none of it. **Status of the purpose clause: MISSING.** This overlaps Goal 4 and
  is the strongest argument for treating goals 2 and 4 as one workstream.

**Status: PARTIAL** — single-skill install exists; pack-level install does not;
the "travels with the ejected project" purpose is entirely unbuilt.

### Goal 3 — Hybrid architecture knowledge

- **The directory is not a skill collection — it is a Rust CLI generator**:
  [CONFIRMED] `/Users/gqadonis/Projects/hybrid-mobile-architecture-src` is
  **KnowMe Builder v2.0.0-alpha.1**, with `builder.manifest.json`, generation
  profiles (`sovereign-hybrid`, `governed-web-shell`, `flutter-mobile`), an
  `assets/templates` tree, and a `knowme-builder` Rust binary
  (`tools/knowme-builder/src/main.rs`). It ships **39 skills** under
  `.claude/skills/`, but the skills are the *instruction pack around* the
  generator, not the generator itself.
- **Its own authority model excludes Open Design**: [CONFIRMED] `README.md`
  assigns application architecture to KnowMe Builder, lifecycle to Prometheus,
  and agent runs to UAR — and states *"Generated applications must not
  introduce a second agent loop beside UAR."* Open Design is not in this model.

**Status: MISSING**, and **the goal as written under-specifies the target.**
"Include the knowledge of the hybrid architecture skills" admits at least three
readings with very different cost: (a) install the 39 `.claude/skills/` as OD
skills, (b) have OD *invoke* the `knowme-builder` binary, (c) port the
generation profiles into OD templates. This needs a decision in analyze.

### Goal 4 — Custom export plugin

- **Plugin system is mature**: [CONFIRMED] Declarative folders (`SKILL.md` +
  `open-design.json`), Zod manifest (`packages/contracts/src/plugins/manifest.ts:139`),
  capability gating incl. `fs:write`, trust tiers, 31 `od plugin` subcommands
  including `scaffold`, `validate`, `pack`, `publish`.
- **Direct precedent exists**: [CONFIRMED] `plugins/_official/scenarios/`
  contains `od-react-export`, `od-nextjs-export`, `od-vue-export`,
  `od-code-migration`. `od-react-export/open-design.json` declares exactly the
  shape a new export plugin needs: `kind: scenario`, `scenario:
  downstream-export`, `mode: export`, `capabilities: [prompt:inject, fs:read,
  fs:write]`, `pipeline.stages: [{id: handoff, atoms: [handoff]}]`.
- **Plugins cannot ship executable atoms**: [CONFIRMED] The atom worker registry
  (`apps/daemon/src/plugins/atoms/registry.ts:55-81`) is in-process and
  daemon-internal. A plugin *composes* the 23 first-party atom ids; it cannot
  contribute new atom code. Deterministic scaffolding therefore requires a
  first-party atom, not a pure plugin.
- **Code-scaffold export does not exist**: [CONFIRMED]
  `EXPORT_FORMATS = ['pdf','image','pptx']`
  (`packages/contracts/src/api/export.ts:12`). Nothing walks a design project
  and writes a build-ready codebase.
- **Handoff docs already exist on BOTH surfaces**: [CONFIRMED — and this
  corrects a subagent finding I initially carried] `DESIGN-HANDOFF.md` /
  `DESIGN-MANIFEST.json` are generated by the daemon at
  `apps/daemon/src/projects.ts:640` and bundled into the archive ZIP at `:516`,
  **and separately** by the web at `apps/web/src/runtime/exports.ts:239`. This
  is not a missing surface — it is **two parallel implementations of the same
  artifact**, which is a divergence risk worth confirming in analyze.

- **Goal 4 is NOT a standalone generic export.** The goal text is explicit:
  *"export projects using the skill in the last point"* — i.e. using the **hybrid
  architecture skill** from Goal 3. This makes Goal 4 **strictly dependent on
  Goal 3's unresolved scope**, and the dependency is load-bearing:
  - If Goal 3 = "install the 39 skills", Goal 4 is a prompt-only plugin that
    references them — cheap, close to `od-react-export`.
  - If Goal 3 = "invoke `knowme-builder`", Goal 4 needs a `subprocess` capability
    grant, a Rust binary dependency, and profile mapping (OD project →
    `--profile sovereign-hybrid | governed-web-shell`) — a different and much
    larger build.
  - If Goal 3 = "port the profiles into OD templates", Goal 4 becomes a
    first-party atom writing the scaffold natively.

  **These are not variations on one plan; they are three different projects.**
  Goal 3's scoping decision must precede any Goal 4 planning.

**Status: PARTIAL, and BLOCKED on Goal 3** — the hosting mechanism, precedent,
and handoff atom all exist; the scaffold-writing capability does not; and its
required shape is undetermined until Goal 3 is scoped.

---

## CROSS-TOOL PROGRESS

NONE — no cross-tool activity recorded. `progress.json` is at its
`kbd-new-phase` seed values (implementation 0/0).

---

## SPEC GAP SUMMARY

1. **No local-first mode as a first-class state.** The daemon supports it, the
   packaged build disables it, and no setting exposes it. The fix is a *product
   surface*, not a re-architecture.
2. **Sign-in is upstream of runtime choice.** Ordering BYOK/Local behind cloud
   auth is the specific thing that breaks the open-source model — more so than
   the redirect itself.
3. **No multi-skill pack install.** Both external sources are packs (619 and 39
   skills). The one-skill-per-install grammar does not fit either.
4. **No code-scaffold export format.** `pdf|image|pptx` only.
5. **Two `DESIGN-HANDOFF` generators.** Daemon and web build the same artifact
   independently.
6. **Goal 3 is under-specified, and Goal 4 is blocked behind it.** Three
   defensible interpretations, materially different cost. Goal 4 explicitly
   consumes Goal 3's skill, so its shape is undetermined until Goal 3 is scoped.
7. **Nothing carries skills into an ejected project.** Goal 2's stated purpose
   ("integrated with the code projects this may be ejected to") has no
   supporting machinery: no export path emits skills, plugins, `.claude/`, or
   `AGENTS.md`.
8. **No detection of externally-installed skill packs.** Goal 2's "detect or"
   clause has no mechanism; discovery reads only OD's own roots.
9. **Offline ≠ gate removal.** AMR ships `fallbackModels: []`, so the default
   runtime has no models without the network. Auto-update opt-out is UNKNOWN.
10. **Fork is 25 commits behind upstream.** Any gate edit will collide with
    upstream churn in exactly these files; rebase strategy is a real decision.

---

## BUILD HEALTH

- `pnpm guard`: **PASS** (exit 0) — design-system fixtures, token parity, 151
  brands all green.
- `pnpm typecheck`: **PASS** (exit 0) — all workspace packages.
- Package tests: **UNKNOWN** — `pnpm --filter @open-design/daemon test` exceeded
  a 2-minute probe and was killed. Not a failure signal; the suite is simply
  long. **A full baseline must be captured before any edit**, so regressions are
  attributable.
- Known violations: NONE detected by guard.
- Test coverage of the areas in scope: **UNKNOWN** pending that baseline.

---

## CONSTRAINT CHECK

- `AGENTS.md` violations: **NONE** introduced by this phase (no code written yet).
- `constraints.md` violations: **NONE**.

Constraints that will bind the planned work:

- **Dual-surface rule** — every capability needs HTTP endpoint + contract DTO +
  web UI + `od` subcommand **in one PR**. Goals 1, 2, and 4 each touch this.
- **`packages/contracts` purity** — a scaffold-export DTO may carry types/Zod
  only; all fs work stays in `apps/daemon/src`.
- **No cross-app private imports** — reusing the web's handoff builder daemon-side
  requires promoting it to a pure package, not importing it.
- **i18n** — any new UI string needs `types.ts` first, then all 19 locales.
- **Tests in `tests/`, never `src/`.**
- **No `Co-authored-by` trailers.**

---

## GOAL PROGRESS

| # | Goal | Status | Reason |
|---|---|---|---|
| 1 | Remove forced cloud login | **NOT MET** | Hard gate live at `EntryShell.tsx:592`; BYOK/Local sit behind it; no offline flag exists |
| 2 | Prometheus skill pack integration | **NOT MET** | Single-skill install exists (incl. undocumented local-path); 619-skill pack install does not; nothing carries skills into an ejected project |
| 3 | Hybrid architecture knowledge | **NOT MET** | Source is a Rust generator + 39 skills, not a skill set; goal admits 3 readings — needs scoping. **Gates goal 4.** |
| 4 | Export plugin | **NOT MET / BLOCKED** | Precedent + handoff atom + manifest exist; no code-scaffold export; plugins can't ship atoms; required shape depends on goal 3's scoping |
| 5 | Strict phase gating | **IN PROGRESS** | Assess complete; stopping here for evaluation |

---

## RISKS AND CONCERNS

1. **Fork divergence is the top execution risk.** 25 commits behind, and
   `EntryShell.tsx` / `server.ts` / the collab tree are exactly where upstream is
   most active. A one-line patch to `:592` will conflict repeatedly. Decide
   rebase-vs-hold in analyze, before writing code.

2. **The env-var bypass is a trap, not a fix.** `VELA_RUNTIME_KEY` +
   `VELA_LINK_URL` returns `loggedIn: true` with no network call
   (`integrations/vela.ts:469-479`), which dissolves the gate. It is tempting
   and wrong for this phase: it *fakes* a signed-in state rather than supporting
   a signed-out one, leaves the gate intact for everyone else, and would break
   the moment upstream changes that early-return. Note it as a stopgap, not the
   deliverable.

3. **Goal 3 could silently become the largest item.** If it means "OD invokes
   `knowme-builder`", that is a cross-runtime integration with a Rust binary
   dependency, its own authority model, and a subprocess capability grant —
   plausibly larger than goals 1, 2, and 4 combined. This is the phase's main
   scope risk.

4. **Workspace binding is a one-way door.** Projects lazy-adopted while signed in
   become permanently workspace-bound (`routes/project/index.ts:2406-2416`:
   *"Failing closed is essential because this binding is sticky"*). Any local-mode
   work must define what happens to already-bound projects, or users will lose
   access to their own work.

5. **Missing test baseline.** Starting edits without a captured baseline makes
   every later failure ambiguous.

6. **Upstream-intent caution.** The maintainers are not hostile to local-only —
   they named it a supported degradation and keep patching workspace-less paths.
   But the gate is deliberate product behavior, so a fork carrying a patch here
   should expect to carry it indefinitely, or upstream it deliberately.

---

## OPEN QUESTIONS FOR ANALYZE

1. **Goal 3 scope** — install 39 skills / invoke `knowme-builder` / port profiles?
2. **Rebase strategy** — take the 25 upstream commits first, or patch and rebase later?
3. **Local-mode shape** — config setting, env var, build flag, or all three? Does
   it need a UI toggle (→ 19 locales) or is CLI+config enough for v1?
4. **Bound-project fallback** — what happens to already-adopted projects offline?
5. **Pack install shape** — plugin bundle with nested `skills/`, N× local-path
   installs, or a new pack-install grammar?
6. **Export target** — prompt-only plugin (cheap, agent-authored, follows
   `od-react-export`) vs. first-party atom + contract + CLI (deterministic,
   dual-surface, much larger)?

---

## ADVERSARIAL REVIEW

Vetted per `/adversarial-review --mode artifact assess`. Structural isolation:
producer `claude-opus-5`, judge `k3` (distinct model, fresh context, REST
gateway). **Verdict: PASS — 0 CRITICAL, 3 WARNING, 2 SUGGESTION.**

Resolved in this revision:

- **[WARNING] Goal 4 treated as standalone** — *accepted.* Goal 4 explicitly
  consumes Goal 3's skill; recorded as a hard dependency, and Goal 4's status
  changed to BLOCKED.
- **[WARNING] Goal 2's purpose clause ungapped** — *accepted.* Added the
  "travels with the ejected project" gap; nothing today emits skills/plugins/
  agent config into an exported project.
- **[SUGGESTION] "re-fires on every render" imprecise** — *accepted.* Corrected
  to the actual `[amrLoggedIn, view]` dependency semantics.
- **[SUGGESTION] offline-flag grep scoped to 3 trees** — *accepted and
  re-verified.* Re-ran repo-wide across `.ts/.tsx/.json/.md` excluding
  `node_modules`: still zero hits. Claim holds with wider evidence.

Rejected, with evidence:

- **[WARNING] "19 locales contradicts the project constraint of 18"** —
  *rejected; the judge's source was stale.* `apps/web/src/i18n/locales/` contains
  **19** files and `AGENTS.md:260` enumerates 19. The stale "18" was in this
  repo's `.kbd-orchestrator/constraints.md`, which the judge treated as
  authoritative. Per `constraints.md`'s own preamble (*"the root `AGENTS.md` is
  the source of truth … update this file"*), the constraint file was the defect.
  **Fixed** — `constraints.md` now reads 19 with the locale list.

### Round 2 (revised artifact, same isolation: producer `claude-opus-5` / judge `k3`)

**Verdict: PASS — 0 CRITICAL, 3 WARNING, 1 SUGGESTION.** Round cap reached; all
findings dispositioned below.

- **[WARNING] Post-gate offline couplings never surveyed** — *accepted.* Added a
  survey to Goal 1: telemetry is fail-safe (no `POSTHOG_KEY` ⇒ no-op, explicitly
  for forks), auto-update opt-out is **UNKNOWN**, and AMR's `fallbackModels: []`
  means the default runtime cannot resolve models offline. Goal 1 is broader than
  the gate.
- **[SUGGESTION] "Detect" half of Goal 2 ungapped** — *accepted.* Added a
  CONFIRMED-MISSING finding: nothing scans `~/.claude/plugins/` or any external
  pack location; the pack is installed for Claude Code on this machine and is
  invisible to OD.
- **[WARNING] External-tree claims unverifiable from the packet** — *partially
  accepted; claims re-verified and one corrected.* The judge is correct that the
  packet cannot see outside the repo — a structural limit of artifact-mode
  isolation, not a defect in the claims. Re-verified directly:
  `builder.manifest.json` (4725 B, `version: 2.0.0-alpha.1`) and
  `tools/knowme-builder/src/main.rs` both exist; hybrid skills = 39.
  **One real error found and fixed:** the Prometheus pack is **606** `SKILL.md`
  files, not 619 — the original count did not exclude `node_modules`.
- **[WARNING] Precedent plugins may be build output, not source** — *rejected
  with evidence.* The judge saw only `.tmp/tools-pack/out/**` paths in the
  packet. `git ls-files plugins/_official/scenarios/` confirms
  `od-react-export/open-design.json`, `od-code-migration/`, `od-default/`,
  `od-design-refine/`, `od-figma-migration/` are **git-tracked source**, not
  build artifacts. Precedent claim stands.

**Standing caveat for analyze:** claims about the two external directories rest
on direct filesystem reads that no in-repo reviewer can independently confirm.
Treat the Goal 3 readings as well-evidenced but **externally sourced**.

## SYCOPHANCY SELF-CHECK

- **S-02** — Existing patterns were independently evaluated, not accepted. The
  daemon's local-first substrate is called intact *because* the row-conditional
  early-outs and the `OD_WORKSPACE_CONTEXT_SOURCE` switch were read directly;
  the client gate is called a hard gate *despite* upstream framing it as routing.
- **S-03** — Six risks and six open questions surfaced, including one
  (Goal 3 scope) that challenges the user's own framing, and one correction to
  my own earlier finding (`DESIGN-HANDOFF` exists daemon-side).
- **S-06** — No "clearly"/"obviously". Every status carries a file:line or an
  explicit UNKNOWN.
- Deliberately **not** softened: goal 1 is a real hard gate. Deliberately **not**
  inflated: it is one `useEffect`, not a licensing lock, and the CLI is already
  free of it.

---

## ASSESSMENT COMPLETE
