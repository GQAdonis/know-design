/* KnowDesign Review — demo state for the server admin console and Projects client.
   Names (agents, plugins, skills, design systems) come from this repository; the
   version matches apps/daemon/package.json. Counts and timestamps are simulated. */
(function () {
  "use strict";
  const now = Date.now(), M = 60e3, H = 3600e3, D = 24 * H;

  window.KD_ADMIN_DATA = {
    server: {
      name: "KnowDesign server", host: "design.know-me.tools", version: "0.25.1", build: "knowdesign",
      mode: "cloud", startedAt: now - 3 * D - 5 * H,
      db: { engine: "PostgreSQL 18 (flint-forge image)", sizeMb: 412, lastVerify: now - 2 * D, lastVacuum: now - 9 * D, verify: "ok" },
      checks: [
        { id: "api", label: "API", route: "GET /api/health", state: "ok", detail: "Answering" },
        { id: "db", label: "Database", route: "GET /api/daemon/db", state: "ok", detail: "Connected · 18 ms" },
        { id: "hub", label: "Review hub", route: "review.know-me.tools", state: "ok", detail: "Publishing and comments" },
        { id: "uar", label: "Agent runtime (UAR)", route: "/api/uar/ag-ui", state: "warn", detail: "No runtime URL set — Studio uses the demo stream" },
        { id: "kratos", label: "Sign-in (Kratos)", route: "auth.know-me.tools", state: "ok", detail: "Sessions issued by flint-gate" },
      ],
    },
    runs: [
      { id: "run-8f21", project: "Consult Capture", agent: "uar", status: "running", startedAt: now - 4 * M, durationS: 240, by: "sam" },
      { id: "run-8f1c", project: "Know Meet brand kit", agent: "uar", status: "succeeded", startedAt: now - 26 * H, durationS: 312, by: "travis" },
      { id: "run-8e90", project: "Patient Chat storyboard", agent: "claude", status: "succeeded", startedAt: now - 2 * D, durationS: 905, by: "travis" },
      { id: "run-8e77", project: "Company of One", agent: "codex", status: "failed", startedAt: now - 2 * D - 3 * H, durationS: 41, by: "dana", error: "Codex CLI isn't signed in on this server" },
      { id: "run-8e31", project: "Global policy", agent: "claude", status: "canceled", startedAt: now - 4 * D, durationS: 128, by: "sam" },
      { id: "run-8d02", project: "Build your bench", agent: "claude", status: "succeeded", startedAt: now - 9 * D, durationS: 1460, by: "priya" },
    ],
    members: [
      { id: "travis", email: "travis@know-me.tools", role: "owner", joinedAt: now - 120 * D, lastSeen: now - 2 * M },
      { id: "dana", email: "dana.reyes@example.com", role: "admin", joinedAt: now - 60 * D, lastSeen: now - 5 * H },
      { id: "sam", email: "sam.okafor@example.com", role: "member", joinedAt: now - 40 * D, lastSeen: now - 1 * M },
      { id: "priya", email: "priya.nair@example.com", role: "member", joinedAt: now - 20 * D, lastSeen: now - 2 * D },
    ],
    invites: [
      { id: "inv-1", email: "clinic.lead@northwind-clinic.example", role: "member", sentAt: now - 1 * D, expiresAt: now + 6 * D, status: "pending" },
    ],
    workspaces: [
      { id: "personal", name: "Personal" },
      { id: "knowme", name: "KnowMe team" },
      { id: "northwind", name: "Northwind pilot" },
    ],
    teamProjects: [
      { id: "consult-capture", name: "Consult Capture", workspace: "knowme", owner: "travis", files: 14, updatedAt: now - 2 * D },
      { id: "patient-chat", name: "Patient Chat storyboard", workspace: "northwind", owner: "travis", files: 22, updatedAt: now - 4 * D },
      { id: "global-policy", name: "KnowMe desktop — Global policy", workspace: "knowme", owner: "sam", files: 9, updatedAt: now - 6 * D },
      { id: "build-your-bench", name: "Build your bench — landing", workspace: "knowme", owner: "priya", files: 11, updatedAt: now - 15 * D },
      { id: "know-meet-kit", name: "Know Meet brand kit", workspace: "personal", owner: "travis", files: 6, updatedAt: now - 1 * D },
      { id: "company-of-one", name: "Company of One — one-pager", workspace: "personal", owner: "travis", files: 3, updatedAt: now - 3 * H },
    ],
    agents: [
      { id: "uar", label: "UAR cloud agent", kind: "runtime", version: "1.0.0", state: "warn", diagnostic: "Set a runtime URL in Agent runtime to run for real", fix: { label: "Open Agent runtime", href: "#/settings/runtime" } },
      { id: "claude", label: "Claude Code", kind: "cli", version: "detected", state: "ok", diagnostic: "Signed in · available on this server" },
      { id: "codex", label: "Codex", kind: "cli", version: "detected", state: "error", diagnostic: "Installed but not signed in", fix: { label: "Sign in", action: "agent-oauth" } },
      { id: "opencode", label: "OpenCode", kind: "cli", version: "—", state: "missing", diagnostic: "Not installed. Cloud servers run agents through UAR instead of CLIs." },
      { id: "cursor-agent", label: "Cursor Agent", kind: "cli", version: "—", state: "missing", diagnostic: "Not installed" },
      { id: "byok-opencode", label: "Your own API key", kind: "byok", version: "built in", state: "ok", diagnostic: "Uses the providers below" },
    ],
    providers: [
      { id: "anthropic", label: "Anthropic", keySet: true, models: ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"], defaultModel: "claude-sonnet-5-5" },
      { id: "openai", label: "OpenAI", keySet: false, models: [] },
      { id: "google", label: "Google", keySet: false, models: [] },
      { id: "openrouter", label: "OpenRouter", keySet: true, models: ["auto"], defaultModel: "auto" },
    ],
    plugins: [
      { id: "od-default", name: "Default design flow", source: "Official registry", version: "1.4.0", trusted: true, installed: true, update: null },
      { id: "od-design-refine", name: "Design refine", source: "Official registry", version: "1.2.1", trusted: true, installed: true, update: "1.3.0" },
      { id: "od-figma-migration", name: "Figma migration", source: "Official registry", version: "0.9.0", trusted: true, installed: true, update: null },
      { id: "od-nextjs-export", name: "Next.js export", source: "Official registry", version: "0.7.2", trusted: false, installed: true, update: null },
      { id: "od-media-generation", name: "Media generation", source: "Official registry", version: "1.1.0", trusted: false, installed: false, update: null },
      { id: "knowme-review", name: "KnowMe review hub", source: "KnowMe registry", version: "0.1.0", trusted: true, installed: true, update: null },
    ],
    marketplaces: [
      { id: "official", name: "Open Design official", url: "https://github.com/nexu-io/open-design/tree/main/plugins/registry", trusted: true, plugins: 48, refreshedAt: now - 1 * D },
      { id: "knowme", name: "KnowMe registry", url: "https://registry.know-me.tools/catalog.json", trusted: true, plugins: 3, refreshedAt: now - 3 * H },
    ],
    skills: [
      { id: "brand-guidelines", name: "brand-guidelines", source: "Built in", enabled: true },
      { id: "brand-extract", name: "brand-extract", source: "Built in", enabled: true },
      { id: "article-magazine", name: "article-magazine", source: "Built in", enabled: true },
      { id: "brainstorming", name: "brainstorming", source: "Built in", enabled: false },
      { id: "apple-hig", name: "apple-hig", source: "Built in", enabled: true },
      { id: "knowme-flat-2", name: "knowme-flat-2", source: "Imported · KnowMe", enabled: true },
    ],
    designSystems: [
      { id: "knowme", name: "KnowMe Flat 2.0", source: "Custom", default: true },
      { id: "agentic", name: "agentic", source: "Built in" },
      { id: "apple", name: "apple", source: "Built in" },
      { id: "bento", name: "bento", source: "Built in" },
      { id: "atelier-zero", name: "atelier-zero", source: "Built in" },
    ],
    brands: [
      { id: "knowme", name: "KnowMe", state: "ready", from: "know-me-system" },
      { id: "northwind", name: "Northwind Clinic", state: "extracting", from: "northwind-clinic.example" },
    ],
    mcp: [
      { id: "open-design", name: "open-design", transport: "stdio", auth: "none", enabled: true, connected: true },
      { id: "github", name: "github", transport: "http", url: "https://api.githubcopilot.com/mcp/", auth: "oauth", enabled: true, connected: true },
      { id: "linear", name: "linear", transport: "http", url: "https://mcp.linear.app/mcp", auth: "oauth", enabled: false, connected: false },
    ],
    connectors: [
      { id: "slack", name: "Slack", status: "connected", account: "know-me.slack.com", tools: 6 },
      { id: "notion", name: "Notion", status: "disconnected", tools: 9 },
      { id: "googledrive", name: "Google Drive", status: "connected", account: "travis@know-me.tools", tools: 5 },
      { id: "figma", name: "Figma", status: "error", tools: 4, error: "Token expired — reconnect" },
    ],
    deploy: { provider: "cloudflare-pages", accountId: "", project: "knowdesign-demos", tokenSet: false, lastDeploy: null },
    memory: {
      enabled: true, autoExtract: true, includeInPrompts: true, entries: 37,
      queue: [
        { id: "mx-1", text: "KnowMe designs never use borders; areas differ by background color only.", source: "Consult Capture chat" },
        { id: "mx-2", text: "Northwind pilot reviewers prefer short release notes.", source: "Releases" },
      ],
    },
    library: [
      { id: "a1", name: "knowme-mark.svg", kind: "logo", size: "2 KB", from: "know-me-system" },
      { id: "a2", name: "knowdesign-app-icon.svg", kind: "logo", size: "1 KB", from: "apps/web/public/brands" },
      { id: "a3", name: "consent-icon.svg", kind: "icon", size: "1 KB", from: "Studio session" },
    ],
    routines: [
      { id: "rt-1", name: "Weekly review digest", schedule: "Every Monday · 09:00", target: "Reuse project", enabled: true, last: "succeeded" },
      { id: "rt-2", name: "Re-run brand extraction", schedule: "Daily · 06:00", target: "Northwind brand", enabled: false, last: "never" },
    ],
  };
})();
