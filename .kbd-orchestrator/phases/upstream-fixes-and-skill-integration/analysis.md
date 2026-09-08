# ANALYSIS: upstream-fixes-and-skill-integration

Phase: `upstream-fixes-and-skill-integration`
Date: 2026-08-09
Mode: **stack-specified** (`project.json` → Next.js 16 + React 18 monorepo, Electron desktop, Node ~24 daemon). No stack-discovery pass; no contested-stack escalation.
Producer: `claude-opus-5`

## Executive summary

This phase is **overwhelmingly in-repo modification, not library adoption.** Of
the four goals, three need zero new runtime dependencies and one needs none at
all. The research therefore concentrated on (a) legal/architectural clearance to
modify, (b) in-repo precedents that make each change an extension rather than an
invention, and (c) the one genuinely blocking scope decision — Goal 3.

The three highest-value findings:

1. **Apache-2.0.** Upstream is Apache-2.0 (`LICENSE`, `package.json.license`).
   Modifying the sign-in gate and redistributing a patched fork is expressly
   licensed. There is no legal obstacle to Goal 1.
2. **A headless path exists, with one caveat.** `od daemon start --headless`
   ships and works (`apps/daemon/src/cli.ts:8319-8323`). **`--serve-web` is
   explicitly reserved, not implemented** — the docblock states *"v1 doesn't
   bundle a separate web port; the flag is reserved so downstream packaged
   callers can branch on it."* The third party
   (`merlining/thoth-opendesign-runtime`) therefore serves the Next.js static
   export itself via `express.static`, per its own README, rather than relying
   on that flag. The daemon is genuinely usable without the gated UI; the
   *bundled web serving* is the part that is downstream work.
3. **OD already writes skill payloads into the user's repo.** `stageActiveSkill`
   copies full skill trees into `<project cwd>/.od-skills/`
   (`cwd-aliases.ts:141-142`), and for folder-bound projects that cwd is the
   user's real directory (`projects.ts:117-126`). Goals 2/4 extend an existing
   write path rather than crossing a new boundary.

**Net dependency verdict: zero new runtime dependencies required.** `jszip@3.10.1`
and `tar@7.5.15` are already daemon dependencies and cover every packaging need.

---

## Research budget

| Tier | Cap | Used | Notes |
|---|---|---|---|
| 1 — GitHub | 8 | 4 | fork landscape, upstream issues, headless precedent, license |
| 2 — Context7/docs | 8 | 0 | **Not needed.** No new library API to confirm; all target APIs are in-repo. |
| 3 — registries | 8 | 1 | confirmed `jszip`/`tar` already present; no new package needed |
| 4 — broad web | 8 | 0 | **Not needed.** Tiers 1+3 answered the questions. |
| minutes | 20 | ~14 | within budget |

Budget was **not** exhausted; research stopped because the questions were
answered, not because a cap was hit. Confidence is correspondingly high for
Goals 1/2/4 and **explicitly lower for Goal 3**, which is a scoping decision
rather than a research question (see below).

---

## Landscape — Goal 1 (remove the forced login)

### Adopt-vs-build

**CORRECTION — this section was rewritten.** An earlier draft claimed "zero
upstream issues track offline/local-only" and concluded there was no prior art.
That was **wrong**: the query was too restrictive. A control query
(`gh search issues --repo nexu-io/open-design "login"`, against 802 open issues)
immediately surfaced the opposite. The corrected picture is the single most
decision-relevant finding in this analysis.

### Upstream issue #6599 — open, active, and exactly this problem

**[Bug]: Login is now mandatory and cannot be skipped** — opened 2026-08-07,
**20 comments**, still OPEN as of 2026-08-09. Reported against v0.18.1.

Maintainer response (`lefarcen`, CONTRIBUTOR, 2026-08-07) **confirms the
assessment's central finding in upstream's own words**:

> This behavior is intentional as of v18.1 … The onboarding was redesigned around
> an **"identity first, runtime second"** approach … The local and BYOK options
> haven't gone away; **they just moved behind the sign-in gate instead of being
> selectable before it.**

This is independent corroboration that BYOK/Local sitting behind sign-in is
deliberate product design, not a bug — so it will not be fixed by simply waiting.
As of the latest comment (2026-08-09) the team has **not** committed to a change;
users are still asking for a response.

The thread also establishes that this is not a niche complaint. Recurring themes:
air-gapped Kubernetes deployments, corporate proxy whitelisting, enterprise BYOK
compliance, and one user geoblocked from the login page entirely.

Two facts from the maintainer worth carrying into design:

- **The self-hosted daemon API is unaffected.** `OD_API_TOKEN`, or
  `OPEN_DESIGN_DISABLE_API_AUTH=1` behind a trusted proxy, needs no cloud
  registration and no egress. This corroborates our own read of the code.
- The gate is scoped to the **web UI**, which is exactly where our assessment
  located it (`EntryShell.tsx:588-594`).

### Prior art: a de-gated fork already exists

`tony-box/open-design` (Apache-2.0, fork of `nexu-io/open-design`, pushed
2026-08-08) carries commits including:

| Commit | Subject |
|---|---|
| `9dfc269e` | **fix(web): make Open Design Cloud sign-in optional again** |
| `82bfa63d` | feat(packaging): disable automatic updates by default |
| `a65a8429` / `9d784379` | fork Windows/macOS release packaging |

**This is a direct, license-compatible reference implementation of Goal 1** —
and its second commit independently answers the assessment's open question about
auto-update opt-out, confirming the concern was real (the thread reports 0.18.1
auto-updating over a pinned 0.18.0).

**Verdict change: Goal 1 moves from "build blind" to "adapt a known-good patch."**
Read `9dfc269e` before writing our own. Caveats: it is one contributor's
unreviewed fork, it targets **0.18.1** while we are on **0.16.2**, and it reverts
rather than adds a mode — so it is a *reference*, not a drop-in cherry-pick.

### The headless precedent is the important find

`merlining/thoth-opendesign-runtime` ships "self-contained **headless**
open-design runtime bundles — per-platform daemon + web static export + embedded
Node," invoked as:

```
node/bin/node apps/daemon/bin/od.mjs daemon start --serve-web --no-open --host 127.0.0.1 --port 7456
```

Our tree has the same flags (`cli.ts:201` flag list; `cli.ts:8319-8323` docblock).
This **independently corroborates the assessment's claim** that the daemon is
fully functional without the gated web UI, using a third party's shipping product
rather than our own reading of the code.

**Implication for design:** the minimum viable fix is small and the fallback is
proven. But note it does *not* make the desktop UI usable — it sidesteps the UI.
Goal 1 asks for an operational app, so the UI gate still has to be addressed.

### Design options (for Spec to choose between)

| Option | Change | Cost | Risk |
|---|---|---|---|
| **A. Invert the gate** | Make `EntryShell.tsx:588-594` conditional on an explicit "cloud mode" setting rather than on `amrLoggedIn` | ~1 file + config + UI toggle + 19 locales | Merge conflict on every upstream touch of EntryShell |
| **B. Reorder onboarding** | Move model-source selection (BYOK/Local) *ahead* of cloud sign-in | Larger web diff | Higher conflict surface, but fixes the root problem |
| **C. Env escape hatch** | `OD_LOCAL_ONLY=1` short-circuits `amrLoggedIn` to `null` | Smallest diff | Not user-discoverable; violates the dual-surface spirit |
| **D. Headless only** | Ship `--headless`, don't fix the UI | Zero code | **Does not satisfy the goal** |

**Recommendation: A + B together, with C as the CLI/CI affordance.** A alone
leaves BYOK behind the wall (the assessment's sharpest finding); B alone leaves
signed-out users redirected. D is rejected as goal-noncompliant but is a valid
interim unblock for the user *today*.

**Caveat carried from assess:** removing the gate does not by itself deliver
"fully operational offline." AMR ships `fallbackModels: []`
(`runtimes/defs/amr.ts:649`), so the default runtime resolves no models without
network. Goal 1 needs a local/BYOK runtime reachable *and* selected by default in
local mode, or the user lands on a working screen with a non-working agent.

---

## Landscape — Goal 2 (Prometheus skill pack)

### The decisive technical finding: naive import misclassifies every skill

OD's skill parser tolerates a missing `od:` block — every read is optional-chained
(`skills.ts:287-310`) — so the 606 Prometheus skills and 39 hybrid skills *will*
parse. **But they will parse into the wrong thing.**

`SkillMode` is `"image" | "video" | "audio" | "deck" | "design-system" |
"template" | "prototype"` (`skills.ts:34`). **There is no `utility` mode**,
despite `docs/skills-protocol.md` documenting `od.mode: utility`. With no `od:`
block, `normalizeMode` falls through to `inferMode()`, which regex-matches the
skill's *prose* (`skills.ts` `inferMode`).

I simulated `inferMode` over the 39 hybrid skills:

| Inferred mode | Count |
|---|---|
| prototype | 22 |
| **image** | **6** |
| template | 4 |
| design-system | 4 |
| **video** | **2** |
| **deck** | **1** |

Nine architecture/engineering skills would be filed as **image, video, or deck
generators**. `designSystemRequired` also defaults to `true` (`skills.ts:301-304`),
so code skills would demand a design system.

**This is the single most consequential finding in this analysis.** It means
"just install them" is not a viable reading of Goal 2 or Goal 3 — an import path
must set `od:` metadata, or the catalogue becomes unusable.

Mitigating facts, both verified:
- **Zero name collisions** between the 606 Prometheus skill names and OD's
  bundled `skills/` — no shadowing hazard.
- Local-directory install **already works at the HTTP layer**
  (`routes/static-resource.ts:1085-1088`, `{source:'local', path}`), merely
  unadvertised in CLI help.

### Adopt-vs-build

- **Adopt:** the existing plugin bundle format. `docs/skills-protocol.md:9` states
  external distribution "normally uses the plugin system," and the plugin
  installer already handles local folders, GitHub, tarballs, trust tiers, doctor,
  and upgrade. **Do not build a second pack-install grammar.**
- **Build (small):** an import adapter that injects `od:` frontmatter
  (`mode`, `design_system.requires: false`) during install. Without it, see above.
- **Build (new):** "detect" has no mechanism at all — nothing scans
  `~/.claude/plugins/` or any external location. This is net-new and should be
  scoped explicitly, not assumed.

### The purpose clause is the real work

Goal 2's stated purpose — skills "integrated with the code projects that this may
be ejected to" — is **not** an install problem. Findings:

- `.od-skills/` staging already writes skill payloads into the user's bound
  working directory (`cwd-aliases.ts:141-142` + `projects.ts:117-126`).
- But it is **deliberately excluded from every export path**: the ZIP skips
  dotfiles (`projects.ts:499`, verified), and collab mirroring blacklists it.
- `od plugin export --as claude-plugin --out <dir>` already writes `SKILL.md` +
  `.claude-plugin/plugin.json` to an arbitrary directory
  (`plugins/export.ts:69-127`) — the closest shipping precedent.
- Writing `AGENTS.md` / `CLAUDE.md` / `.claude/` into a project has **zero
  precedent** anywhere in the repo.

**Design tension to resolve in Spec:** `cwd-aliases.ts:9-18` makes staged copies
deliberately *disposable* because agents can write to their own cwd. An ejected
payload is the opposite: durable and git-committable. These must not share a
directory. Recommend a separate, visible, non-dotfile output path.

---

## Landscape — Goal 3 (hybrid architecture) — **the blocking decision**

This is a **scoping decision, not a research gap.** Research clarified the
options and their true costs; it cannot choose among them.

New evidence gathered:

- `knowme-builder` is **already built and installed** at
  `~/.cargo/bin/knowme-builder` (3.6 MB, 2026-07-29). The "requires a Rust
  toolchain" objection is **weaker than the assessment assumed** — on *this*
  machine. It remains true for any other machine, CI, or packaged build.
- **The crate source is NOT in this repo.** It lives at
  `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/tools/knowme-builder`
  (7 `.rs` files, a thin `clap` wrapper over a `knowme_builder` library). This
  repo's `tools/` contains only `dev`, `pack`, `release`, `serve`, `AGENTS.md`.
  *(Corrected: an earlier draft implied an in-repo crate, which would have made
  reading 3b look materially cheaper than it is. 3b means depending on an
  **external, separately-versioned** binary — see the 3b cost row.)*
- `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/builder.manifest.json`
  (4865 B, v2.0.0-alpha.1) defines profiles that map onto the goal's "web,
  desktop, and mobile": `sovereign-hybrid` (Flutter + Tauri + Rust),
  `governed-web-shell` (React + Axum), `flutter-mobile`. **Externally sourced:**
  verified by direct filesystem read; not reproducible from this repo alone.
- **Version caution:** `2.0.0-alpha.1`. Depending on an alpha external generator
  is a real stability risk for a product feature.
- **Authority conflict:** its README assigns application architecture to KnowMe
  Builder, lifecycle to Prometheus, and agent runs to UAR, and states *"Generated
  applications must not introduce a second agent loop beside UAR."* Open Design
  is a fourth agent loop. This is not fatal but is unresolved, and it is a design
  question, not an implementation detail.

### The three readings, now costed

| Reading | What it means | Cost | Verdict |
|---|---|---|---|
| **3a. Install the 39 skills** | Import `.claude/skills/` as OD skills | **S** — but requires the `od:` adapter (see Goal 2), else 9 skills land as image/video/deck | Viable; lowest risk; delivers knowledge, not generation |
| **3b. Invoke `knowme-builder`** | OD shells out to the Rust binary to scaffold | **L** — subprocess capability, binary distribution for non-dev machines, alpha dependency, authority conflict | Highest capability, highest risk |
| **3c. Port the profiles** | Reimplement generation as OD templates/atoms | **XL** — reimplements someone else's actively-developed generator | Not recommended; duplicates upstream work |

**Recommendation: 3a now, 3b behind a capability flag later.** 3a is
independently useful, unblocks Goal 4's cheap path, and does not bet the phase on
an alpha binary. If the user's actual intent is "OD generates my apps," that is
3b and should be its own phase — it is plausibly larger than goals 1, 2, and 4
combined.

**This recommendation is not a decision.** It is flagged for the user in
Open Questions and recorded in `decision-log.md` as UNRESOLVED.

---

## Landscape — Goal 4 (export plugin)

Blocked on Goal 3 by the goal's own wording ("export projects using the skill in
the last point"), but the *hosting* decision is already clear and stack-internal.

- **Adopt:** `plugins/_official/scenarios/od-react-export` as the template.
  Verified git-tracked source (`git ls-files plugins/_official/scenarios/`), not
  build output — this refutes a round-2 reviewer concern. Its manifest is exactly
  the needed shape: `kind: scenario`, `scenario: downstream-export`,
  `mode: export`, `capabilities: [prompt:inject, fs:read, fs:write]`,
  `pipeline.stages: [{id: handoff, atoms: [handoff]}]`.
- **Constraint:** plugins cannot ship executable atoms — the worker registry is
  in-process and daemon-internal (`plugins/atoms/registry.ts:55-81`). Anything
  deterministic needs a first-party atom.

| Path | Shape | Cost | When |
|---|---|---|---|
| **4a. Prompt-only plugin** | Clone `od-react-export`, point at hybrid skills | **S–M** (see dual-surface note) | If Goal 3 = 3a |
| **4b. First-party atom** | New atom + contract DTO + route + CLI + UI (dual-surface, one PR) | **L** | If deterministic output required |
| **4c. Wrap `knowme-builder`** | Plugin with `subprocess` capability | **L** | Only if Goal 3 = 3b |

**Dual-surface caveat (raised in review, verified):** grepping `apps/web/src` for
`downstream-export` / `od-react-export` / scenario-plugin wiring returns **no
plugin-scenario surface** — the only `scenario` hits are the unrelated Orbit
placeholder carousel (`HomeHero.tsx:155-157`, `state/config.ts:73`). So it is
**not established** that shipped scenario plugins are reachable from the web UI.
Since `AGENTS.md` requires every user-facing capability to land UI + CLI in the
same PR, 4a must either (a) demonstrate an existing UI entry point, or (b) budget
for building one. **4a is therefore S–M, not S.** This needs one verification
step at Spec time; I did not fully trace plugin→UI wiring here.

**Recommendation: 4a**, upgradeable to 4b once the output shape is proven.

---

## Build-vs-adopt summary

| Gap | Verdict | Rationale |
|---|---|---|
| Local-only mode | **ADAPT (reference `tony-box` fork)** | A license-compatible de-gating patch already exists (`9dfc269e`); read it before writing ours. Targets 0.18.1, we are on 0.16.2 |
| Headless operation | **ADOPT (already shipped)** | `--headless --serve-web` exists; third-party corroboration |
| Skill pack install | **ADOPT (plugin system)** | Explicit upstream guidance; don't build a second grammar |
| `od:` import adapter | **BUILD (small)** | No `utility` mode exists; naive import misclassifies |
| External pack detection | **BUILD (new)** | Zero precedent |
| Skills-travel-with-eject | **ADAPT** | Extend `plugins/export.ts` pattern; do NOT reuse `.od-skills/` |
| Hybrid architecture | **UNRESOLVED** | Scoping decision — see Open Questions |
| Export plugin | **ADAPT** | Clone `od-react-export`; blocked on Goal 3 |
| Packaging deps | **NONE NEEDED** | `jszip@3.10.1`, `tar@7.5.15` already present |

---

## Open questions (blocking Spec)

1. **[BLOCKING] Goal 3 scope — 3a, 3b, or 3c?** Everything downstream of Goal 4
   depends on this. Recommendation: 3a now, 3b as a later phase.
2. **Goal 1 shape** — options A+B (recommended), or C for speed? Does local mode
   need a UI toggle (⇒ 19 locale keys) or is config + CLI enough for v1?
3. **Rebase timing — and a version correction that matters.**

   **`package.json` says `0.16.2`, but that is a stale in-repo development
   version, not the release we are tracking.** Verified: `upstream/main`'s
   `package.json` *also* reads `0.16.2` while upstream ships releases as 0.18.x,
   so the field simply is not bumped per release on `main`.

   **The gate is already in our tree.** `git merge-base --is-ancestor 886bcc4db
   HEAD` → true, where `886bcc4db` is *"feat(web): streamline onboarding model
   source flow (#6475)"*, the commit that introduced the "Cloud identity gate"
   comment. `git show HEAD:apps/web/src/components/EntryShell.tsx` reproduces the
   gate verbatim at lines 588-594.

   **Therefore "stay put and the gate doesn't affect us" is NOT an available
   option** — an earlier draft of this section offered it, which was wrong and
   contradicted the assessment. The real options are:
   - **Patch now, rebase later** — smallest diff today; conflicts grow with the
     25-commit gap.
   - **Rebase to upstream `main`, then patch** — the `tony-box` reference is
     written against a tree closer to upstream HEAD than ours, so it ports more
     directly; larger immediate conflict cost.

   Recommendation: **rebase first**, so the reference patch applies against a
   comparable tree. **Caveat:** issue #6599 shows users deliberately pinning to
   0.18.0 or forking to avoid 0.18.1, so moving forward carries its own cost —
   this is a genuine trade-off, not a formality.
4. **Bound-project fallback** — what happens to already workspace-bound projects
   in local mode? (Binding is sticky by design:
   `routes/project/index.ts:2406-2416`.)
5. **Offline runtime default** — which runtime does local mode select, given AMR
   has no offline models?
6. **Ejected payload location** — a visible directory (git-committable) vs.
   `.od-skills/` (deliberately disposable). Recommend separate.

---

## Adversarial review

Vetted per `/adversarial-review --mode artifact analyze`. Structural isolation:
producer `claude-opus-5`, judge `k3` (distinct model, fresh context).

**Round 1 verdict: BLOCK — 1 CRITICAL, 2 WARNING, 2 SUGGESTION.** All accepted;
the CRITICAL was a genuine error on my part.

- **[CRITICAL] Claimed the `knowme-builder` crate lives in-repo at
  `tools/knowme-builder`** — *accepted, corrected.* It does not. This repo's
  `tools/` holds only `dev`, `pack`, `release`, `serve`, `AGENTS.md`; the crate
  is in the **external** hybrid tree. The judge correctly identified that this
  made reading 3b look cheaper than it is — 3b means depending on an external,
  separately-versioned binary. The Goal 3 cost table and cand-007 now say so.
- **[WARNING] `builder.manifest.json` evidence unverifiable from the packet** —
  *accepted.* Re-verified by direct read (4865 B, v2.0.0-alpha.1) and now cited
  with its absolute path plus an explicit "externally sourced; not reproducible
  from this repo alone" marker.
- **[WARNING] `gaps_addressed` skipped gap-8** — *accepted.* My gap IDs did not
  match the assessment's numbering. All **10** assessment gaps are now enumerated
  and every one is covered by a candidate or a `build_required` entry (verified
  programmatically: zero uncovered).
- **[SUGGESTION] cand-002 verdict contradicted its own rationale** — *accepted.*
  It was `adopt`/1.0 while the rationale said "build is the only path", which
  would let Plan double-count gap-1. Downgraded to `reference`; gap-1 stays
  solely in `build_required`.
- **[SUGGESTION] Goal 4's dual-surface UI cost unscoped** — *accepted and
  verified.* Grepping `apps/web/src` found **no** scenario-plugin surface (only
  the unrelated Orbit carousel). 4a re-costed **S → S–M** with an explicit
  verification step for Spec.

**Also corrected during this round, self-caught:** the claim that
`--serve-web` serves the web bundle. The docblock says it is **reserved, not
implemented** in v1.

### Round 2 (revised artifacts, same isolation)

**Verdict: BLOCK — 2 CRITICAL, 1 WARNING, 1 SUGGESTION.** Round cap reached; all
four accepted and fixed. Both CRITICALs were real defects, and one exposed a
factual error the assessment had also carried.

- **[CRITICAL] `build_required[0]` still asserted the retracted "zero upstream
  issues" claim** — *accepted.* I corrected `analysis.md` but left the stale
  claim in the JSON, so the machine contract contradicted the narrative. Now
  cites #6599 and the maintainer's "intentional as of v18.1" statement, with an
  explicit retraction note.
- **[CRITICAL] "Stay on 0.16.2 — the gate largely does not affect us yet"
  contradicted the assessment** — *accepted; the judge was right and my option
  was invalid.* Investigation resolved the confusion: **`package.json`'s `0.16.2`
  is a stale in-repo development version**, not the tracked release —
  `upstream/main` also reads `0.16.2` while shipping 0.18.x. The gate **is** in
  our tree: `git merge-base --is-ancestor 886bcc4db HEAD` → true (`886bcc4db` =
  "feat(web): streamline onboarding model source flow (#6475)", which introduced
  the gate), and `git show HEAD:…EntryShell.tsx` reproduces it at 588-594. The
  bogus "stay put" option was removed and the version claim corrected.
- **[WARNING] cand-001 re-created the gap-1 double-count** — *accepted.* gap-1 is
  now explicitly split three ways with no overlap: cand-001 = headless interim
  (0.4), cand-002 = reference to read (0.8, produces no code), `build_required` =
  the actual UI-gate deliverable.
- **[SUGGESTION] cand-001 named for a flag that is a no-op** — *accepted.*
  Renamed to `od daemon start --headless`.

**Vet closed at the round cap with no unresolved findings.**

**Separately — the largest correction in this stage was not found by the judge.**
My "zero upstream issues track offline/local-only" claim was wrong; the query was
too restrictive. A control query surfaced open issue **#6599** with 20 comments
and a maintainer confirmation, plus a de-gated Apache-2.0 fork. This rewrote the
Goal 1 section and changed its verdict from BUILD to ADAPT. A judge confined to
the packet could not have caught it — worth noting as a limit of artifact-mode
isolation for claims about the outside world.

## Risks

1. **Upstream churn on the exact files.** 25 commits behind; `EntryShell.tsx` is
   actively edited upstream. Every option in Goal 1 touches it.
2. **`inferMode` misclassification** is silent — skills appear installed and
   simply behave wrong. Any import work needs a verification step that asserts
   resulting modes, not just successful install.
3. **Alpha external dependency** (3b) — `knowme-builder` is `2.0.0-alpha.1` and
   installed only on this machine.
4. **Authority-model conflict** (3b) — KnowMe Builder forbids a second agent loop;
   OD is one.
5. **Research asymmetry.** Tiers 2 and 4 were not exercised. Justified (no new
   library APIs), but it means this analysis is strong on in-repo evidence and
   thin on external-ecosystem alternatives. If the user wants a survey of
   *other* design-to-code generators as alternatives to KnowMe Builder, that
   research has not been done.
