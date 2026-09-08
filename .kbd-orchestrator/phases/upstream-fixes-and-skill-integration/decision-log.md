# Decision log — upstream-fixes-and-skill-integration

### 2026-08-09T15:05Z — Research mode: stack-specified
Stack is fixed by `project.json` (Next.js 16 + React 18 monorepo, Electron
desktop, Node ~24 daemon). No stack-discovery pass, no contested-stack
escalation, no `stack-recommendation.md`.
Provenance: research | Elicitation ID: n/a

### 2026-08-09T15:05Z — Tiers 2 and 4 deliberately not exercised
Tier 2 (Context7/docs) and tier 4 (broad web) returned zero queries. The phase
requires no new library APIs — every target surface is in-repo — so confirming
external API fit had nothing to confirm. Budget was not exhausted; research
stopped on answered questions.
**Consequence, recorded as a known limitation:** this analysis is strong on
in-repo evidence and thin on external-ecosystem alternatives. No survey of
*other* design-to-code generators (as alternatives to KnowMe Builder) was
performed.
Provenance: research | Elicitation ID: n/a

### ~~2026-08-09T15:05Z — Goal 1: build in-repo, no adoption~~ **[SUPERSEDED]**
> **Superseded 15:40Z — see "RETRACTED: zero upstream issues" below.** The
> supporting evidence was false and the verdict changed BUILD → ADAPT. Retained
> for audit; do not act on this entry.

~~Options considered: fork-and-patch (cand-002), headless-only (cand-001).
Decision: build in-repo; adopt `--headless --serve-web` as an interim unblock and
CI story, not as the deliverable. Evidence: Apache-2.0 grants Derivative Works
rights; zero upstream issues track offline/local-only, so no incoming fix will
supersede the patch.~~
Provenance: research (**invalidated**) | Elicitation ID: n/a

### 2026-08-09T15:05Z — Goal 2: adopt the plugin system, do not build a second grammar
`docs/skills-protocol.md:9` states external distribution normally uses the
plugin system. The plugin installer already covers local folders, GitHub,
tarballs, trust tiers, doctor, and upgrade.
Decision: **adopt** (cand-003). Rejected: building a bespoke pack-install path.
Provenance: research | Elicitation ID: n/a

### 2026-08-09T15:05Z — Mandatory `od:` import adapter (new finding)
`SkillMode` (`skills.ts:34`) has **no `utility` value**, contradicting
`docs/skills-protocol.md`. Skills with no `od:` block fall through to
`inferMode()`, which regex-matches prose. Simulated over the 39 hybrid skills:
22 prototype / 6 **image** / 4 template / 4 design-system / 2 **video** /
1 **deck** — nine engineering skills misfiled as media generators.
`designSystemRequired` also defaults to `true`.
Decision: an import adapter injecting `od.mode` and
`design_system.requires: false` is **mandatory**, not optional (cand-004).
Any import work must assert resulting modes — misclassification is silent.
Provenance: research | Elicitation ID: n/a

### 2026-08-09T15:05Z — Ejected payload must not reuse `.od-skills/`
`stageActiveSkill` already writes skill payloads into the user's real repo
(`cwd-aliases.ts:141-142` + `projects.ts:117-126`), but `cwd-aliases.ts:9-18`
makes those copies deliberately *disposable* because agents can write to their
own cwd; the ZIP also filters dotfiles (`projects.ts:499`).
Decision: **adapt** the `plugins/export.ts` pattern to a separate, visible,
git-committable path (cand-005). Rejected: overloading `.od-skills/`.
Provenance: research | Elicitation ID: n/a

### 2026-08-09T15:05Z — External pack detection rejected as an adoption target
Scanning `~/.claude/plugins/` would couple OD to Claude Code's unversioned
private on-disk layout.
Decision: **reject** auto-detection by filesystem sniffing (cand-009); prefer an
explicit user-supplied path. Flows to `build_required`.
Provenance: research | Elicitation ID: n/a

### 2026-08-09T15:05Z — Goal 3 scope: UNRESOLVED, escalated to the user
Options: **3a** import the 39 hybrid skills · **3b** invoke the
`knowme-builder` Rust binary · **3c** port the generation profiles.
These are not variations on one plan; they are three different projects.
Not a research question — research costed the options and cannot choose.
Analysis recommendation: **3a now, 3b as a separate later phase.**
Decision: **UNRESOLVED — pending user input.**
Provenance: **pending-user** | Elicitation ID: n/a (inline escalation per
`/kbd-analyze` step 4 fallback: pmpo-elicit not invoked because this is a scope
choice, not a contested *stack* choice)

Material facts for the decision:
- `knowme-builder` is already built at `~/.cargo/bin/` (3.6 MB, 2026-07-29), so
  the toolchain objection is weaker **on this machine only** — not for CI,
  packaged builds, or other machines.
- It is `2.0.0-alpha.1`; depending on an alpha external generator for a product
  feature is a real stability risk.
- Its authority model states *"Generated applications must not introduce a
  second agent loop beside UAR"*; Open Design would be a fourth agent loop.
- **Goal 4 is blocked by this**: its wording ("export projects using the skill in
  the last point") makes its required shape a function of this answer.

### 2026-08-09T15:05Z — Zero new runtime dependencies
`jszip@3.10.1` and `tar@7.5.15` are already daemon dependencies and cover all
packaging needs (cand-008).
Provenance: research (tier 3) | Elicitation ID: n/a

---

## Corrections after adversarial review (2 rounds, judge k3, producer claude-opus-5)

### 2026-08-09T15:40Z — RETRACTED: "zero upstream issues track offline/local-only"
The original tier-1 query was too restrictive and returned empty; I read that as
"upstream is not tracking this." A control query (`"login"`, against 802 open
issues) immediately refuted it.
**Corrected finding:** upstream issue **#6599 "[Bug]: Login is now mandatory and
cannot be skipped"** is OPEN (2026-08-07, 20 comments). Maintainer `lefarcen`
confirms the behaviour is *intentional* as of v18.1 — "identity first, runtime
second"; local/BYOK "just moved behind the sign-in gate instead of being
selectable before it." No committed change as of 2026-08-09.
**Consequence:** Goal 1's verdict changed **BUILD → ADAPT**. A license-compatible
de-gated fork exists (`tony-box/open-design`, Apache-2.0, commit `9dfc269e`
"fix(web): make Open Design Cloud sign-in optional again"), plus `82bfa63d`
disabling auto-update — which independently answers the assessment's UNKNOWN on
auto-update opt-out.
Provenance: research (tier 1, corrected) | Elicitation ID: n/a

### 2026-08-09T15:45Z — CORRECTED: knowme-builder crate is NOT in this repo
An earlier draft implied an in-repo crate at `tools/knowme-builder`. This repo's
`tools/` holds only `dev`, `pack`, `release`, `serve`, `AGENTS.md`. The crate is
in the external hybrid tree. Reading **3b therefore means depending on an
external, separately-versioned binary** — materially more expensive than an
in-repo crate. Caught by the round-1 CRITICAL.
Provenance: adversarial-review (CRITICAL, accepted) | Elicitation ID: n/a

### 2026-08-09T15:50Z — CORRECTED: the version field is stale; the gate IS in our tree
`package.json` reads `0.16.2`, but so does `upstream/main` while upstream ships
0.18.x — the field is not bumped per release on `main`. Verified the gate is
present at our HEAD: `git merge-base --is-ancestor 886bcc4db HEAD` → true
(`886bcc4db` = "feat(web): streamline onboarding model source flow (#6475)"),
and `git show HEAD:apps/web/src/components/EntryShell.tsx` reproduces lines
588-594.
**Consequence:** the "stay put, the gate doesn't affect us" rebase option was
**invalid and has been removed.** Remaining options: patch-now-rebase-later, or
rebase-then-patch (recommended).
Provenance: adversarial-review (CRITICAL, accepted) | Elicitation ID: n/a

### 2026-08-09T15:52Z — gap-1 split three ways to prevent double-counting
cand-001 = headless interim workaround (0.4) · cand-002 = reference
implementation to read (0.8, produces no code) · `build_required` = the actual
UI-gate deliverable. cand-002 downgraded `adopt` → `reference`; cand-001 renamed
after confirming `--serve-web` is a reserved no-op in this tree.
Provenance: adversarial-review (WARNING + SUGGESTION, accepted) | Elicitation ID: n/a

### 2026-08-09T15:53Z — Goal 4 re-costed S → S–M
No scenario-plugin surface found in `apps/web/src` (only the unrelated Orbit
carousel). Since `AGENTS.md` requires UI + CLI in the same PR, 4a must either
demonstrate an existing UI entry point or budget for building one.
Provenance: adversarial-review (SUGGESTION, accepted + verified) | Elicitation ID: n/a

### 2026-08-10T00:00Z — RESOLVED: Goal 3 scope = 3a (import the 39 hybrid skills)
Previously UNRESOLVED and blocking. The user reviewed the costed options and
directed: "Go with your recommendation."

**Decision: 3a — import the 39 hybrid `.claude/skills/` as OD skills via the
mandatory `od:` import adapter (cand-004). 3b (invoke the external
`knowme-builder` binary) is explicitly DEFERRED to its own later phase; 3c
(port the generation profiles) is rejected as duplicating an actively-developed
external generator.**

Rationale carried from analysis:
- 3a is independently useful and delivers the architecture *knowledge* the goal
  asks for.
- It avoids betting the phase on `knowme-builder` 2.0.0-**alpha**.1, an external,
  separately-versioned binary present only on this machine.
- It sidesteps the unresolved authority conflict (KnowMe Builder's docs forbid a
  second agent loop beside UAR; OD would be a fourth).
- It unblocks Goal 4's cheap path (4a, prompt-only plugin).

**Consequence — Goal 4 is now UNBLOCKED and its shape is fixed: 4a**, a
prompt-only scenario plugin cloned from `od-react-export` that references the
imported hybrid skills. Re-costed S–M pending the dual-surface UI verification.

**Explicitly NOT delivered by this decision** (so it is not silently assumed):
OD will not *generate* applications in this phase. 3a imports guidance the agent
reads; it does not scaffold Flutter/Tauri/Axum code. If the user's underlying
intent is "OD generates my apps," that is 3b and remains open.

Provenance: **user** ("Go with your recommendation") | Elicitation ID: n/a
