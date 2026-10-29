/* KnowDesign Review — Admin console for an Open Design compliant server.
   Each section maps to the daemon routes in apps/daemon (see server-interfaces.md).
   Everything is simulated except Server conformance, which makes real read-only GETs. */
(function () {
  "use strict";
  const { icon, esc, fmtDate, fmtTime, fmtAgo, fmtIn, toast, dialog, busy, pace, copyText } = window.KD_UI;
  const K = () => window.KD;
  const A = () => { const st = K().state; if (!st.admin) st.admin = JSON.parse(JSON.stringify(window.KD_ADMIN_DATA)); return st.admin; };
  const ui = () => { const st = K().state.ui; st.admin = st.admin || { runFilter: "all", openRun: null, wsFilter: "", picked: [], doctor: {}, probe: null, probeUrl: "" }; return st.admin; };

  /* ── Section registry ── */
  const GROUPS = [
    { label: "Server", items: [
      { id: "status", label: "Status & health", icon: "gauge", api: "GET /api/health · /api/version · /api/daemon/*" },
      { id: "conformance", label: "Server conformance", icon: "shield", api: "GET /api/* (read-only probes)" },
      { id: "runs", label: "Runs", icon: "history", api: "/api/runs · /api/runs/:id/{events,cancel,replay}" },
    ] },
    { label: "People", items: [
      { id: "members", label: "Members & invites", icon: "users", api: "/api/workspace/members · /api/workspace/invite" },
      { id: "team-projects", label: "Team projects", icon: "layers", api: "/api/workspaces/:id/projects{/batch-move,/batch-delete}" },
    ] },
    { label: "Agents & models", items: [
      { id: "agents", label: "Agents", icon: "bot", api: "GET /api/agents · /api/agents/:id/oauth-launch" },
      { id: "providers", label: "Model providers", icon: "server", api: "/api/app-config · /api/provider" },
    ] },
    { label: "Extensions", items: [
      { id: "plugins", label: "Plugins", icon: "layers", api: "/api/plugins · /install · /:id/{trust,upgrade,uninstall,doctor}" },
      { id: "marketplaces", label: "Registries", icon: "link", api: "/api/marketplaces · /:id/{refresh,trust}" },
      { id: "skills", label: "Skills & design systems", icon: "sparkles", api: "/api/skills · /api/design-systems · /api/brands" },
    ] },
    { label: "Integrations", items: [
      { id: "mcp", label: "MCP servers", icon: "wrench", api: "PUT /api/mcp/servers · /api/mcp/oauth/*" },
      { id: "connectors", label: "Connectors", icon: "link", api: "/api/connectors · /:id/{connect,connection}" },
      { id: "deploy", label: "Deploy targets", icon: "upload", api: "/api/deploy/config · /cloudflare-pages/zones" },
    ] },
    { label: "Data", items: [
      { id: "memory", label: "Memory", icon: "brain", api: "/api/memory · /config · /extractions" },
      { id: "library", label: "Asset library", icon: "layers", api: "/api/library/assets" },
      { id: "automations", label: "Routines", icon: "history", api: "/api/routines · /api/automation-templates" },
    ] },
  ];
  const ALL = GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  const sectionOf = (id) => ALL.find((s) => s.id === id) || ALL[0];

  function navHtml(active) {
    const hub = (window.KD_SETTINGS && window.KD_SETTINGS.sections) || [];
    const groups = [...GROUPS, { label: "Review hub", items: hub.map((s) => ({ ...s, href: `#/settings/${s.id}` })) }];
    const link = (i) => `<a href="${i.href || `#/admin/${i.id}`}" ${i.id === active ? 'aria-current="page"' : ""}>${icon(i.icon)}${esc(i.label)}</a>`;
    const desktop = groups.map((g) => `<div class="adm-group" role="group" aria-label="${esc(g.label)}"><div class="eyebrow adm-glabel">${esc(g.label)}</div>${g.items.map(link).join("")}</div>`).join("");
    const mobile = `<div class="field adm-jump"><label for="adm-jump">Section</label><select id="adm-jump" class="select">${groups.map((g) => `<optgroup label="${esc(g.label)}">${g.items.map((i) => `<option value="${i.href || `#/admin/${i.id}`}" ${i.id === active ? "selected" : ""}>${esc(i.label)}</option>`).join("")}</optgroup>`).join("")}</select></div>`;
    return `<nav class="settings-nav adm-nav" aria-label="Admin sections">${desktop}</nav>${mobile}`;
  }
  const crumbs = () => `<span>Server</span>${icon("chevron", "icon-sm")}<span class="mono">${esc(A().server.host)}</span>`;

  /* ── Small builders ── */
  const STATE = {
    ok: ["stage-approved", "check", "OK"], warn: ["stage-changes", "alert", "Attention"], error: ["stage-released", "x", "Error"], missing: ["stage-draft", "info", "Not installed"],
    running: ["stage-review", "refresh", "Running"], succeeded: ["stage-approved", "check", "Succeeded"], failed: ["stage-released", "x", "Failed"], canceled: ["stage-draft", "x", "Canceled"],
    connected: ["stage-approved", "check", "Connected"], disconnected: ["stage-draft", "info", "Not connected"], pending: ["stage-changes", "history", "Pending"],
  };
  const pill = (state, label) => { const [c, ic, l] = STATE[state] || STATE.missing; return `<span class="pill ${c}">${icon(ic, "icon-sm")}${esc(label || l)}</span>`; };
  const sw = (key, on, labelId, disabled) => `<button type="button" class="switch-hit" role="switch" aria-checked="${!!on}" aria-labelledby="${labelId}" data-adm="${key}" ${disabled ? 'aria-disabled="true"' : ""}><span class="switch" aria-checked="${!!on}"></span></button>`;
  const btn = (act, id, label, kind, ic) => `<button type="button" class="btn ${kind || ""}" data-adm="${act}" data-id="${esc(id || "")}">${ic ? icon(ic, "icon-sm") : ""}${esc(label)}</button>`;
  const row = (main, actions, extra) => `<div class="adm-row"><div class="od-stack od-fill" style="--od-gap:2px">${main}</div>${actions ? `<div class="od-cluster od-fixed">${actions}</div>` : ""}${extra || ""}</div>`;
  const t = (s) => `<span class="t">${s}</span>`;
  const d = (s) => `<span class="d">${s}</span>`;
  const group = (title, body, aside) => `<section class="group od-stack" style="--od-gap:12px"><div class="od-row"><h3 class="group-title od-fill">${esc(title)}</h3>${aside || ""}</div>${body}</section>`;
  const fieldErr = (id) => `<div class="err" id="${id}-err" hidden></div>`;
  function showErr(id, msg) {
    const el = document.getElementById(id + "-err"), inp = document.getElementById(id);
    if (el) { el.hidden = !msg; el.innerHTML = msg ? `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>` : ""; }
    if (inp) inp.setAttribute("aria-invalid", msg ? "true" : "false");
    if (msg && inp) inp.focus();
    return !msg;
  }
  const person = (id) => K().person(id);

  /* ── Search ── */
  const SEARCH = { runs: "runs", members: "members", "team-projects": "projects", agents: "agents", providers: "providers", plugins: "plugins", marketplaces: "registries", skills: "skills", mcp: "MCP servers", connectors: "connectors", library: "assets", automations: "routines" };
  const Q = (sec) => ((ui().q || {})[sec] || "").trim().toLowerCase();
  const hit = (sec, ...vals) => { const q = Q(sec); return !q || vals.join(" ").toLowerCase().includes(q); };
  const searchBox = (sec) => `<div class="field adm-search"><label for="adm-q">Search ${esc(SEARCH[sec])}</label><input id="adm-q" class="input" type="search" data-adm-q="${sec}" value="${esc((ui().q || {})[sec] || "")}" autocomplete="off" placeholder="Type to filter"></div>`;
  const noHits = (sec) => `<div class="empty">${icon("search")}<h3>Nothing matches “${esc(Q(sec))}”</h3><p>Try a shorter search, or clear it.</p><button class="btn" data-adm="clear-q" data-id="${sec}">Clear search</button></div>`;

  /* ── Detail screens: #/admin/:section/:id ── */
  const back = (sec, label) => `<a class="btn btn-ghost adm-back" href="#/admin/${sec}">${icon("back", "icon-sm")}All ${esc(label)}</a>`;
  const notFound = (sec, label) => `${back(sec, label)}<div class="empty">${icon("search")}<h3>Not found</h3><p>It may have been removed.</p></div>`;
  const TOOLS = {
    github: [["search_code", "read"], ["get_file_contents", "read"], ["create_issue", "write"], ["create_pull_request", "write"]],
    linear: [["list_issues", "read"], ["create_issue", "write"], ["update_issue", "write"]],
    "open-design": [["list_projects", "read"], ["get_file", "read"], ["write_file", "write"], ["start_run", "write"]],
  };
  const CTOOLS = { slack: [["Search messages", "read"], ["Read a channel", "read"], ["Post a message", "write"]], notion: [["Search pages", "read"], ["Create a page", "write"]], googledrive: [["Search files", "read"], ["Read a file", "read"], ["Upload a file", "write"]], figma: [["Read a file", "read"], ["Export frames", "read"]] };
  const DETAIL = {
    members: (id) => {
      const m = A().members.find((x) => x.id === id); if (!m) return notFound("members", "members");
      const p = person(id);
      const owns = A().teamProjects.filter((x) => x.owner === id);
      const runs = A().runs.filter((x) => x.by === id);
      return `${back("members", "members")}
        <div class="adm-hero">${K().avatar(p.name, p.me ? "me" : "")}<div class="od-stack od-fill" style="--od-gap:2px"><h2 class="section-title">${esc(p.name)}${p.me ? " (you)" : ""}</h2><span class="sub">${esc(m.email)} · ${esc(p.role || "")}</span></div>
          ${m.role === "owner" ? '<span class="pill">Owner</span>' : `<label class="sr-only" for="role-${m.id}">Role</label><select id="role-${m.id}" class="select adm-select" data-adm-change="role" data-id="${m.id}"><option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option><option value="member" ${m.role === "member" ? "selected" : ""}>Member</option></select>`}</div>
        <dl class="kv"><dt>Joined</dt><dd>${fmtDate(m.joinedAt)}</dd><dt>Last seen</dt><dd>${fmtAgo(m.lastSeen)}</dd><dt>Sign-in</dt><dd>KnowMe account (Kratos)</dd></dl>
        ${group(`Owns ${owns.length} project${owns.length === 1 ? "" : "s"}`, owns.length ? owns.map((x) => row(`<a class="t adm-link" href="#/projects/${x.id}">${esc(x.name)}</a>${d(`${x.files} files · updated ${fmtAgo(x.updatedAt)}`)}`)).join("") : `<p class="sub" style="font-size:14px">No projects.</p>`)}
        ${group("Recent runs", runs.length ? runs.map((x) => row(`<a class="t adm-link" href="#/admin/runs/${x.id}">${esc(x.project)} <span class="mono sub">${esc(x.id)}</span></a>${d(`started ${fmtAgo(x.startedAt)}`)}`, pill(x.status))).join("") : `<p class="sub" style="font-size:14px">No runs yet.</p>`)}
        ${m.role === "owner" ? "" : group("Danger zone", `<p class="sub" style="font-size:14px">Removing ${esc(p.name)} moves their projects to you.</p><div>${btn("member-remove", m.id, "Remove from workspace", "btn-danger")}</div>`)}`;
    },
    plugins: (id) => {
      const p = A().plugins.find((x) => x.id === id); if (!p) return notFound("plugins", "plugins");
      const doc = ui().doctor[id];
      const caps = [["Prompts", "Adds the plan and build steps the agent follows", "read"], ["Skills", "Loads design skills into runs that use it", "read"], ["Tools", "Can write files in the project and fetch assets", "write"]];
      return `${back("plugins", "plugins")}
        <div class="adm-hero"><div class="od-stack od-fill" style="--od-gap:2px"><h2 class="section-title">${esc(p.name)}</h2><span class="mono sub">${esc(p.id)} · ${esc(p.source)}</span></div>${p.installed ? pill(p.trusted ? "ok" : "warn", p.trusted ? "Trusted" : "Not trusted") : pill("missing")}</div>
        <div class="od-cluster">${!p.installed ? btn("plugin-install", p.id, "Install", "btn-primary") : `${p.trusted ? "" : btn("plugin-trust", p.id, "Trust", "", "shield")}${p.update ? btn("plugin-upgrade", p.id, `Upgrade to ${p.update}`, "btn-cyan") : ""}${btn("plugin-doctor", p.id, "Run doctor", "")}${btn("plugin-uninstall", p.id, "Uninstall", "btn-danger")}`}</div>
        ${group("What it can do", caps.map(([n, dd, k]) => row(`${t(n)}${d(dd)}`, k === "write" ? pill("warn", "Writes · asks first") : pill("ok", "Read"))).join(""))}
        ${group("Versions", `${row(`${t(`v${esc(p.version)}`)}${d(p.installed ? "Installed" : "Latest")}`, pill("ok", "Current"))}${p.update ? row(`${t(`v${esc(p.update)}`)}${d("Available from " + esc(p.source))}`, btn("plugin-upgrade", p.id, "Upgrade", "btn-cyan")) : ""}`)}
        ${doc ? group("Doctor", `<ul class="adm-doctor">${doc.map((c) => `<li>${icon(c.ok ? "check" : "alert", "icon-sm")}${esc(c.text)}</li>`).join("")}</ul>`) : ""}
        <span class="mono sub">GET /api/plugins/${esc(p.id)} · POST /api/plugins/${esc(p.id)}/{trust,upgrade,doctor,uninstall}</span>`;
    },
    mcp: (id) => {
      const m = A().mcp.find((x) => x.id === id); if (!m) return notFound("mcp", "MCP servers");
      m.toolState = m.toolState || {};
      const tools = (TOOLS[m.id] || [["(tools load after connecting)", "read"]]);
      return `${back("mcp", "MCP servers")}
        <div class="adm-hero"><div class="od-stack od-fill" style="--od-gap:2px"><h2 class="section-title">${esc(m.name)}</h2><span class="mono sub">${esc(m.transport)}${m.url ? " · " + esc(m.url) : ""} · auth: ${esc(m.auth)}</span></div>${m.auth === "oauth" ? (m.connected ? pill("connected") : pill("disconnected")) : pill(m.enabled ? "ok" : "missing", m.enabled ? "Enabled" : "Disabled")}</div>
        <div class="od-cluster">${m.auth === "oauth" ? (m.connected ? btn("mcp-disconnect", m.id, "Disconnect", "") : btn("mcp-connect", m.id, "Connect", "btn-primary")) : ""}${btn("mcp-test", m.id, "Test", "", "refresh")}${btn("mcp-remove", m.id, "Remove", "btn-danger")}</div>
        ${group(`Tools · ${tools.length}`, tools.map(([n, k]) => { const lid = `mt-${m.id}-${n}`; const on = m.toolState[n] !== false; return row(`<span class="t mono" id="${lid}">${esc(n)}</span>${d(k === "write" ? "Changes data — asks for approval in every run" : "Reads data")}`, (k === "write" ? pill("warn", "Write") : pill("ok", "Read")) + sw(`mcp-tool:${m.id}|${n}`, on, lid)); }).join(""))}
        <span class="mono sub">PUT /api/mcp/servers · POST /api/mcp/oauth/start</span>`;
    },
    connectors: (id) => {
      const c = A().connectors.find((x) => x.id === id); if (!c) return notFound("connectors", "connectors");
      const tools = CTOOLS[c.id] || [];
      return `${back("connectors", "connectors")}
        <div class="adm-hero"><div class="od-stack od-fill" style="--od-gap:2px"><h2 class="section-title">${esc(c.name)}</h2><span class="sub">${c.account ? esc(c.account) : "No account connected"}</span></div>${pill(c.status === "error" ? "error" : c.status, c.status === "error" ? "Needs attention" : null)}</div>
        ${c.error ? `<div class="blocked-panel" style="padding:16px;gap:6px"><b>${esc(c.error)}</b><span style="font-size:14px">Agents can't use ${esc(c.name)} until you reconnect.</span></div>` : ""}
        <div class="od-cluster">${c.status === "connected" ? btn("conn-disconnect", c.id, "Disconnect", "") : btn("conn-connect", c.id, c.status === "error" ? "Reconnect" : "Connect", "btn-primary")}</div>
        ${group(`Tools agents can use · ${tools.length}`, tools.map(([n, k]) => row(`${t(esc(n))}${d(k === "write" ? "Asks for approval in every run" : "Read only")}`, k === "write" ? pill("warn", "Write") : pill("ok", "Read"))).join(""))}
        <span class="mono sub">GET /api/connectors/${esc(c.id)} · POST /connect · DELETE /connection</span>`;
    },
    runs: (id) => {
      const r = A().runs.find((x) => x.id === id); if (!r) return notFound("runs", "runs");
      const ag = (A().agents.find((g) => g.id === r.agent) || { label: r.agent }).label;
      const t0 = r.startedAt, s = (n) => fmtTime(t0 + n * 1000);
      const ev = [[0, "RUN_STARTED", r.id], [2, "STEP_STARTED", "plan"], [4, "REASONING_MESSAGE", "Reading the brief and project files"], [9, "TOOL_CALL_START", "design_system.get_tokens"], [11, "TOOL_CALL_RESULT", "ok"], [14, "TOOL_CALL_START", "workspace.read_file"], [16, "TOOL_CALL_RESULT", "ok"],
        ...(r.status === "failed" ? [[18, "RUN_ERROR", r.error]] : r.status === "running" ? [[19, "TOOL_CALL_START", "web.fetch"], [20, "RUN_FINISHED", "interrupt · waiting for approval"]] : r.status === "canceled" ? [[30, "RUN_FINISHED", "canceled by user"]] : [[40, "TOOL_CALL_START", "workspace.write_file"], [44, "TOOL_CALL_RESULT", "ok"], [Math.max(50, r.durationS), "RUN_FINISHED", "success"]])];
      return `${back("runs", "runs")}
        <div class="adm-hero"><div class="od-stack od-fill" style="--od-gap:2px"><h2 class="section-title">${esc(r.project)}</h2><span class="mono sub">${esc(r.id)} · ${esc(ag)} · ${esc(person(r.by).name)}</span></div>${pill(r.status)}</div>
        <div class="od-cluster">${r.status === "running" ? btn("run-cancel", r.id, "Cancel run", "btn-danger") : btn("run-replay", r.id, "Replay from events", "")}${r.agent === "uar" ? `<a class="btn" href="#/studio">${icon("sparkles", "icon-sm")}Open in Studio</a>` : ""}</div>
        <dl class="kv"><dt>Started</dt><dd>${fmtDate(r.startedAt)} ${fmtTime(r.startedAt)}</dd><dt>Duration</dt><dd>${Math.floor(r.durationS / 60)} min ${r.durationS % 60} s</dd>${r.error ? `<dt>Error</dt><dd>${esc(r.error)}</dd>` : ""}</dl>
        ${group(`Events · ${ev.length}`, `<ol class="rel-tl">${ev.map(([n, k, v]) => `<li><span class="rel-tl-ic" aria-hidden="true">${icon(k.startsWith("TOOL") ? "wrench" : k === "RUN_ERROR" ? "alert" : k.startsWith("REASON") ? "brain" : "history", "icon-sm")}</span><div class="od-stack od-fill" style="--od-gap:2px"><span class="t mono">${esc(k)}</span><span class="d">${esc(v)}</span></div><span class="when od-nowrap">${s(n)}</span></li>`).join("")}</ol>`)}
        <span class="mono sub">GET /api/runs/${esc(r.id)}/events · POST /cancel · POST /replay</span>`;
    },
  };

  /* ── Sections ── */
  const R = {};

  R.status = () => {
    const s = A().server;
    const checks = s.checks.map((c) => row(`${t(esc(c.label))}${d(`${esc(c.detail)} · <span class="mono">${esc(c.route)}</span>`)}`, pill(c.state))).join("");
    return `<dl class="kv"><dt>Server</dt><dd>${esc(s.name)} · ${esc(s.host)}</dd><dt>Version</dt><dd>${esc(s.version)} (${esc(s.build)} build)</dd><dt>Mode</dt><dd>${s.mode === "cloud" ? "Cloud — agents run through UAR" : "Desktop — agents run as local CLIs"}</dd><dt>Up since</dt><dd>${fmtDate(s.startedAt)} ${fmtTime(s.startedAt)} (${fmtAgo(s.startedAt).replace(" ago", "")})</dd></dl>
      ${group("Health checks", checks, btn("recheck", "", "Check again", "", "refresh"))}
      ${group("Database", `<dl class="kv"><dt>Engine</dt><dd>${esc(s.db.engine)}</dd><dt>Size</dt><dd>${s.db.sizeMb} MB</dd><dt>Last check</dt><dd>${fmtDate(s.db.lastVerify)} · ${s.db.verify === "ok" ? "no problems" : esc(s.db.verify)}</dd><dt>Last compaction</dt><dd>${fmtDate(s.db.lastVacuum)}</dd></dl>
        <div class="od-cluster">${btn("db-verify", "", "Check integrity", "", "check")}${btn("db-vacuum", "", "Compact database", "", "refresh")}</div>`)}
      ${group("Danger zone", `<p class="sub" style="font-size:14px">Stops the server process. Running agent sessions are cut off and reviewers see errors until it restarts.</p><div>${btn("shutdown", "", "Shut down server", "btn-danger", "x")}</div>`)}`;
  };

  const PROBES = [
    ["Health", "/api/health"], ["Version", "/api/version"], ["App config", "/api/app-config"], ["Projects", "/api/projects"],
    ["Agents", "/api/agents"], ["Skills", "/api/skills"], ["Design systems", "/api/design-systems"], ["Plugins", "/api/plugins"],
    ["MCP servers", "/api/mcp/servers"], ["Connectors", "/api/connectors"], ["Members", "/api/workspace/members"], ["Runs", "/api/runs"],
  ];
  R.conformance = () => {
    const u = ui();
    const base = u.probeUrl || (/^https?:/.test(location.origin) ? location.origin : "");
    const p = u.probe;
    const res = p ? PROBES.map(([label, path], i) => {
      const r = p.results[i];
      const st = !r ? ["pending", "Waiting"] : r.kind === "ok" ? ["ok", `Supported · ${r.status}`] : r.kind === "auth" ? ["warn", `Needs sign-in · ${r.status}`] : r.kind === "missing" ? ["error", `Missing · ${r.status}`] : r.kind === "other" ? ["warn", `Answered ${r.status}`] : ["missing", "Unreachable"];
      return row(`${t(esc(label))}${d(`<span class="mono">GET ${esc(path)}</span>`)}`, pill(st[0], st[1]));
    }).join("") : "";
    const done = p && p.results.filter(Boolean).length === PROBES.length;
    const cnt = (k) => p ? p.results.filter((r) => r && r.kind === k).length : 0;
    const summary = done ? (cnt("net") === PROBES.length
      ? `<div class="blocked-panel" style="padding:16px;gap:6px"><b>Nothing answered</b><span style="font-size:14px">Either the server is down, or it doesn't allow requests from this page (CORS). A compliant server must allow this origin and the Authorization header for the web client to work.</span></div>`
      : `<div class="${cnt("missing") ? "blocked-panel" : "success-panel"}" style="padding:16px;gap:6px"><b>${cnt("ok") + cnt("auth")} of ${PROBES.length} areas answered</b><span style="font-size:14px">${cnt("ok")} supported, ${cnt("auth")} need sign-in, ${cnt("missing")} missing, ${cnt("net")} unreachable${cnt("other") ? `, ${cnt("other")} other` : ""}.</span></div>`) : "";
    return `<p class="sub">Checks whether a server answers the routes the KnowDesign web client depends on. Every request is a read-only GET. If a bearer token is stored in Agent runtime, it's sent too.</p>
      <form class="od-stack" style="--od-gap:12px" data-adm-form="probe" novalidate>
        <div class="field"><label for="probe-url">Server URL <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
          <div class="od-row"><input id="probe-url" class="input od-fill" type="url" value="${esc(base)}" placeholder="https://design.know-me.tools" autocomplete="off" aria-describedby="probe-url-err">
          <button class="btn btn-cyan od-fixed" type="submit" ${p && !done ? "disabled" : ""}>${p && !done ? '<span class="spinner" aria-hidden="true"></span>Checking…' : `${icon("refresh", "icon-sm")}Run checks`}</button></div>${fieldErr("probe-url")}</div>
      </form>${summary}${res ? `<div class="od-stack" style="--od-gap:4px" aria-live="polite">${res}</div>` : ""}`;
  };
  async function runProbe(base) {
    const u = ui();
    u.probeUrl = base;
    u.probe = { base, results: [] };
    rerender();
    const tok = sessionStorage.getItem("kd-uar-token");
    for (let i = 0; i < PROBES.length; i++) {
      const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 6000);
      let r;
      try {
        const res = await fetch(base.replace(/\/+$/, "") + PROBES[i][1], { headers: Object.assign({ Accept: "application/json" }, tok ? { Authorization: `Bearer ${tok}` } : {}), credentials: "omit", signal: ctl.signal });
        r = { status: res.status, kind: res.ok ? "ok" : res.status === 401 || res.status === 403 ? "auth" : res.status === 404 || res.status === 405 ? "missing" : "other" };
      } catch (_) { r = { kind: "net" }; }
      clearTimeout(timer);
      u.probe.results[i] = r;
      rerender();
    }
  }

  R.runs = () => {
    const u = ui(), runs = A().runs;
    const list = runs.filter((r) => (u.runFilter === "all" || r.status === u.runFilter) && hit("runs", JSON.stringify(r), person(r.by).name));
    const active = runs.filter((r) => r.status === "running").length;
    const seg = [["all", "All"], ["running", "Running"], ["failed", "Failed"]].map(([v, l]) => `<button type="button" data-adm="run-filter" data-id="${v}" aria-pressed="${u.runFilter === v}">${l}</button>`).join("");
    const agentName = (id) => (A().agents.find((a) => a.id === id) || { label: id }).label;
    const rows = list.map((r) => {
      const open = u.openRun === r.id;
      const acts = (r.status === "running" ? btn("run-cancel", r.id, "Cancel", "btn-danger") : btn("run-replay", r.id, "Replay", "")) + btn("run-events", r.id, open ? "Hide events" : "Events", "");
      const ev = open ? `<pre class="code-ev">${esc([`RUN_STARTED          ${r.id}`, "STEP_STARTED         plan", "TOOL_CALL_START      design_system.get_tokens", "TOOL_CALL_RESULT     ok", r.status === "failed" ? `RUN_ERROR            ${r.error}` : r.status === "running" ? "TOOL_CALL_START      web.fetch   (waiting for approval)" : r.status === "canceled" ? "RUN_FINISHED         canceled by user" : "RUN_FINISHED         success"].join("\n"))}</pre>` : "";
      return row(`<a class="t adm-link" href="#/admin/runs/${r.id}">${esc(r.project)} <span class="mono sub">${esc(r.id)}</span></a>${d(`${esc(agentName(r.agent))} · ${esc(person(r.by).name)} · started ${fmtAgo(r.startedAt)} · <span class="od-nowrap">${Math.floor(r.durationS / 60)} min ${r.durationS % 60} s</span>${r.error ? ` · ${esc(r.error)}` : ""}`)}`, pill(r.status) + acts, ev);
    }).join("");
    return `<div class="od-row" style="flex-wrap:wrap"><div class="od-stat"><span class="adm-big">${active}</span><span class="sub">running now · GET /api/runs/active-count</span></div><span class="od-fill"></span><div class="seg" role="group" aria-label="Filter runs">${seg}</div></div>
      <div class="od-stack" style="--od-gap:4px">${rows || `<div class="empty">${icon("history")}<h3>No runs match</h3><p>Try a different filter.</p></div>`}</div>`;
  };

  R.members = () => {
    const a = A();
    const roleSel = (m) => m.role === "owner" ? `<span class="pill">Owner</span>` : `<label class="sr-only" for="role-${m.id}">Role for ${esc(person(m.id).name)}</label><select id="role-${m.id}" class="select adm-select" data-adm-change="role" data-id="${m.id}"><option value="admin" ${m.role === "admin" ? "selected" : ""}>Admin</option><option value="member" ${m.role === "member" ? "selected" : ""}>Member</option></select>`;
    const members = a.members.filter((m) => hit("members", JSON.stringify(m), person(m.id).name)).map((m) => row(`<div class="od-row">${K().avatar(person(m.id).name, person(m.id).me ? "me" : "")}<div class="od-stack od-fill" style="--od-gap:0"><a class="t adm-link" href="#/admin/members/${m.id}">${esc(person(m.id).name)}${person(m.id).me ? " (you)" : ""}</a>${d(`${esc(m.email)} · seen ${fmtAgo(m.lastSeen)}`)}</div></div>`, roleSel(m) + (m.role === "owner" ? "" : btn("member-remove", m.id, "Remove", "btn-danger")))).join("");
    const inv = a.invites.filter((i) => i.status === "pending").map((i) => row(`${t(esc(i.email))}${d(`${i.role === "admin" ? "Admin" : "Member"} · sent ${fmtAgo(i.sentAt)} · expires ${fmtIn(i.expiresAt)}`)}`, pill("pending") + btn("invite-copy", i.id, "Copy link", "", "copy") + btn("invite-revoke", i.id, "Revoke", "btn-danger"))).join("");
    return `${group(`Members · ${a.members.length}`, `<div class="od-stack" style="--od-gap:4px">${members}</div>`)}
      ${group("Invite someone", `<form class="adm-form" data-adm-form="invite" novalidate>
        <div class="field od-fill"><label for="inv-email">Email <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="inv-email" class="input" type="email" autocomplete="off" placeholder="name@company.com" aria-describedby="inv-email-err">${fieldErr("inv-email")}</div>
        <div class="field"><label for="inv-role">Role</label><select id="inv-role" class="select"><option value="member">Member</option><option value="admin">Admin</option></select></div>
        <button class="btn btn-primary" type="submit">${icon("send", "icon-sm")}Send invite</button></form>
        <p class="sub" style="font-size:13px">Members create and edit projects. Admins also manage people, extensions and server settings. Invites expire after 7 days.</p>`)}
      ${group("Pending invites", inv || `<p class="sub" style="font-size:14px">No pending invites.</p>`)}`;
  };

  R["team-projects"] = () => {
    const a = A(), u = ui();
    const ws = (id) => (a.workspaces.find((w) => w.id === id) || { name: id }).name;
    const list = a.teamProjects.filter((p) => (!u.wsFilter || p.workspace === u.wsFilter) && hit("team-projects", p.name, person(p.owner).name));
    const rows = list.map((p) => `<label class="adm-row adm-check"><input type="checkbox" data-adm-pick="${p.id}" ${u.picked.includes(p.id) ? "checked" : ""}><div class="od-stack od-fill" style="--od-gap:2px">${t(esc(p.name))}${d(`${esc(ws(p.workspace))} · ${esc(person(p.owner).name)} · ${p.files} files · updated ${fmtAgo(p.updatedAt)}`)}</div><a class="btn od-fixed" href="#/projects/${p.id}">Open</a></label>`).join("");
    const n = u.picked.length;
    return `<div class="od-cluster"><div class="field" style="min-width:220px"><label for="ws-filter">Workspace</label><select id="ws-filter" class="select" data-adm-change="ws-filter"><option value="">All workspaces</option>${a.workspaces.map((w) => `<option value="${w.id}" ${u.wsFilter === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></div>
        <span class="od-fill"></span><span class="sub" aria-live="polite">${n ? `${n} selected` : "Select projects to move or delete"}</span>
        <button class="btn" data-adm="tp-move" ${n ? "" : "disabled"}>${icon("layers", "icon-sm")}Move</button><button class="btn btn-danger" data-adm="tp-delete" ${n ? "" : "disabled"}>${icon("trash", "icon-sm")}Delete</button></div>
      <div class="od-stack" style="--od-gap:4px">${rows || `<div class="empty">${icon("layers")}<h3>No projects here</h3><p>Pick another workspace.</p></div>`}</div>`;
  };

  R.agents = () => {
    const a = A();
    const rows = a.agents.filter((x) => hit("agents", JSON.stringify(x))).map((g) => row(`${t(`${esc(g.label)} <span class="mono sub">${esc(g.id)}</span>`)}${d(`${g.kind === "cli" ? "CLI agent" : g.kind === "runtime" ? "Agent runtime" : "Built in"} · ${esc(g.version)} · ${esc(g.diagnostic)}`)}`,
      pill(g.state) + (g.fix ? (g.fix.href ? `<a class="btn" href="${g.fix.href}">${esc(g.fix.label)}</a>` : btn(g.fix.action, g.id, g.fix.label, "btn-primary")) : ""))).join("");
    return `<p class="sub">Agents the server can start for design runs. On a cloud server, CLI agents usually aren't installed — runs go through UAR instead.</p>
      <div class="field" style="max-width:320px"><label for="def-agent">Default agent for new runs</label><select id="def-agent" class="select" data-adm-change="def-agent">${a.agents.filter((g) => g.state !== "missing").map((g) => `<option value="${g.id}" ${a.defaultAgent === g.id ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></div>
      <div class="od-stack" style="--od-gap:4px">${rows}</div>`;
  };

  R.providers = () => {
    const rows = A().providers.filter((x) => hit("providers", JSON.stringify(x))).map((p) => row(`${t(esc(p.label))}${d(p.keySet ? `Key set · ${p.models.length} models · default <span class="mono">${esc(p.defaultModel || "—")}</span>` : "No key — models from this provider are unavailable")}`,
      (p.keySet ? pill("ok", "Key set") + btn("prov-test", p.id, "Test", "") + btn("prov-key", p.id, "Replace key", "") + btn("prov-remove", p.id, "Remove", "btn-danger") : btn("prov-key", p.id, "Add key", "btn-primary", "lock")))).join("");
    return `<p class="sub">Used when someone runs with their own API key. Keys are stored on the server and never shown again after you save them.</p><div class="od-stack" style="--od-gap:4px">${rows}</div>`;
  };

  R.plugins = () => {
    const u = ui();
    const rows = A().plugins.filter((x) => hit("plugins", JSON.stringify(x))).map((p) => {
      const doc = u.doctor[p.id];
      const docHtml = doc ? `<ul class="adm-doctor">${doc.map((c) => `<li>${icon(c.ok ? "check" : "alert", "icon-sm")}${esc(c.text)}</li>`).join("")}</ul>` : "";
      const acts = !p.installed ? btn("plugin-install", p.id, "Install", "btn-primary") : [
        p.trusted ? "" : btn("plugin-trust", p.id, "Trust", "", "shield"),
        p.update ? btn("plugin-upgrade", p.id, `Upgrade to ${p.update}`, "btn-cyan") : "",
        btn("plugin-doctor", p.id, "Doctor", ""), btn("plugin-uninstall", p.id, "Uninstall", "btn-danger")].join("");
      return row(`<a class="t adm-link" href="#/admin/plugins/${p.id}">${esc(p.name)} <span class="mono sub">${esc(p.id)}</span></a>${d(`${esc(p.source)} · ${p.installed ? "v" + esc(p.version) : "not installed"}`)}`, (p.installed ? pill(p.trusted ? "ok" : "warn", p.trusted ? "Trusted" : "Not trusted") : "") + acts, docHtml);
    }).join("");
    return `${group("Install a plugin", `<form class="adm-form" data-adm-form="plugin" novalidate><div class="field od-fill"><label for="pl-src">Plugin ID, https link or folder path <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="pl-src" class="input" autocomplete="off" placeholder="od-media-generation" aria-describedby="pl-src-help pl-src-err"><span class="help" id="pl-src-help">IDs resolve against trusted registries. Links and folders install untrusted until you trust them.</span>${fieldErr("pl-src")}</div><button class="btn btn-primary" type="submit">Install</button></form>`)}
      <div class="od-stack" style="--od-gap:4px">${rows}</div>`;
  };

  R.marketplaces = () => {
    const rows = A().marketplaces.filter((x) => hit("marketplaces", JSON.stringify(x))).map((m) => row(`${t(esc(m.name))}${d(`<span class="mono">${esc(m.url)}</span> · ${m.plugins} plugins · refreshed ${fmtAgo(m.refreshedAt)}`)}`,
      pill(m.trusted ? "ok" : "warn", m.trusted ? "Trusted" : "Not trusted") + btn("mk-refresh", m.id, "Refresh", "", "refresh") + (m.trusted ? "" : btn("mk-trust", m.id, "Trust", "", "shield")) + (m.id === "official" ? "" : btn("mk-remove", m.id, "Remove", "btn-danger")))).join("");
    return `${group("Add a registry", `<form class="adm-form" data-adm-form="market" novalidate><div class="field od-fill"><label for="mk-url">Catalog URL <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="mk-url" class="input" type="url" autocomplete="off" placeholder="https://registry.example.com/catalog.json" aria-describedby="mk-url-err">${fieldErr("mk-url")}</div><button class="btn btn-primary" type="submit">Add registry</button></form>
      <p class="sub" style="font-size:13px">A static catalog or a private GitHub repo, as described in docs/self-hosting-a-registry.md.</p>`)}
      <div class="od-stack" style="--od-gap:4px">${rows}</div>`;
  };

  R.skills = () => {
    const a = A();
    const skills = a.skills.filter((x) => hit("skills", JSON.stringify(x))).map((s) => { const lid = `sk-${s.id}`; return row(`<span class="t" id="${lid}">${esc(s.name)}</span>${d(esc(s.source))}`, sw(`skill-toggle:${s.id}`, s.enabled, lid)); }).join("");
    const ds = a.designSystems.map((s) => row(`${t(esc(s.name))}${d(esc(s.source))}`, s.default ? pill("ok", "Default") : btn("ds-default", s.id, "Make default", ""))).join("");
    const br = a.brands.map((b) => row(`${t(esc(b.name))}${d(`From ${esc(b.from)}`)}`, b.state === "ready" ? pill("ok", "Ready") : pill("running", "Extracting") + btn("brand-cancel", b.id, "Cancel", ""))).join("");
    return `${group("Skills", `<form class="adm-form" data-adm-form="skill" novalidate><div class="field od-fill"><label for="sk-src">Import a skill from a link or folder</label><input id="sk-src" class="input" autocomplete="off" placeholder="https://github.com/org/repo/tree/main/skills/name" aria-describedby="sk-src-err">${fieldErr("sk-src")}</div><button class="btn" type="submit">Import</button></form><div class="od-stack" style="--od-gap:4px">${skills}</div>`)}
      ${group("Design systems", `<div class="od-stack" style="--od-gap:4px">${ds}</div>`, `<span class="mono sub">/api/design-systems</span>`)}
      ${group("Brands", `<div class="od-stack" style="--od-gap:4px">${br}</div>`, `<span class="mono sub">/api/brands</span>`)}`;
  };

  R.mcp = () => {
    const rows = A().mcp.filter((x) => hit("mcp", JSON.stringify(x))).map((m) => { const lid = `mcp-${m.id}`; return row(`<a class="t adm-link" id="${lid}" href="#/admin/mcp/${m.id}">${esc(m.name)}</a>${d(`${esc(m.transport)}${m.url ? ` · <span class="mono">${esc(m.url)}</span>` : ""} · auth: ${esc(m.auth)}`)}`,
      (m.auth === "oauth" ? (m.connected ? pill("connected") + btn("mcp-disconnect", m.id, "Disconnect", "") : btn("mcp-connect", m.id, "Connect", "btn-primary")) : "") + sw(`mcp-toggle:${m.id}`, m.enabled, lid) + btn("mcp-remove", m.id, "Remove", "btn-danger")); }).join("");
    const u = ui();
    const tr = u.mcpTransport || "http";
    return `<div class="od-stack" style="--od-gap:4px">${rows}</div>
      ${group("Add an MCP server", `<form class="od-stack" style="--od-gap:12px" data-adm-form="mcp" novalidate>
        <div class="two-col"><div class="field"><label for="mcp-name">Name <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="mcp-name" class="input" autocomplete="off" placeholder="figma" aria-describedby="mcp-name-err">${fieldErr("mcp-name")}</div>
        <div class="field"><label for="mcp-transport">Transport</label><select id="mcp-transport" class="select" data-adm-change="mcp-transport"><option value="http" ${tr === "http" ? "selected" : ""}>Streamable HTTP</option><option value="sse" ${tr === "sse" ? "selected" : ""}>SSE</option><option value="stdio" ${tr === "stdio" ? "selected" : ""}>Local command (stdio)</option></select></div></div>
        <div class="field"><label for="mcp-target">${tr === "stdio" ? "Command" : "URL"} <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="mcp-target" class="input" autocomplete="off" placeholder="${tr === "stdio" ? "npx -y @scope/server" : "https://mcp.example.com/mcp"}" aria-describedby="mcp-target-help mcp-target-err"><span class="help" id="mcp-target-help">${tr === "stdio" ? "Cloud servers usually can't run local commands; prefer HTTP." : "Must be https://."}</span>${fieldErr("mcp-target")}</div>
        <div class="field" style="max-width:280px"><label for="mcp-auth">Authentication</label><select id="mcp-auth" class="select"><option value="none">None</option><option value="oauth">OAuth (connect after saving)</option><option value="bearer">Bearer token</option></select></div>
        <div><button class="btn btn-primary" type="submit">Save server</button></div></form>`)}`;
  };

  R.connectors = () => {
    const rows = A().connectors.filter((x) => hit("connectors", JSON.stringify(x))).map((c) => row(`<a class="t adm-link" href="#/admin/connectors/${c.id}">${esc(c.name)}</a>${d(`${c.tools} tools${c.account ? ` · ${esc(c.account)}` : ""}${c.error ? ` · ${esc(c.error)}` : ""}`)}`,
      pill(c.status === "error" ? "error" : c.status, c.status === "error" ? "Needs attention" : null) + (c.status === "connected" ? btn("conn-disconnect", c.id, "Disconnect", "") : btn("conn-connect", c.id, c.status === "error" ? "Reconnect" : "Connect", "btn-primary")))).join("");
    return `<p class="sub">Connectors give agents tools for outside services. Write tools still ask for approval in every run.</p><div class="od-stack" style="--od-gap:4px">${rows}</div>`;
  };

  R.deploy = () => {
    const c = A().deploy;
    return `<p class="sub">Where Projects → Share and deploy publishes static builds.</p>
      <form class="od-stack" style="--od-gap:16px" data-adm-form="deploy" novalidate>
        <div class="two-col"><div class="field"><label for="dp-account">Cloudflare account ID <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="dp-account" class="input mono" autocomplete="off" value="${esc(c.accountId)}" placeholder="32 hex characters" aria-describedby="dp-account-err">${fieldErr("dp-account")}</div>
        <div class="field"><label for="dp-project">Pages project <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="dp-project" class="input" autocomplete="off" value="${esc(c.project)}" aria-describedby="dp-project-err">${fieldErr("dp-project")}</div></div>
        <div class="field"><label for="dp-token">API token${c.tokenSet ? "" : ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>'}</label><input id="dp-token" class="input" type="password" autocomplete="off" placeholder="${c.tokenSet ? "Token set — leave empty to keep it" : "Paste a token with Pages:Edit"}" aria-describedby="dp-token-err">${fieldErr("dp-token")}</div>
        <div class="od-cluster"><button class="btn btn-primary" type="submit">Save</button>${c.tokenSet ? `${pill("ok", "Token set")}${btn("dp-zones", "", "List zones", "")}` : ""}</div></form>`;
  };

  R.memory = () => {
    const m = A().memory;
    const tog = (k, title, help) => `<div class="switch-row"><div class="od-field"><span class="switch-title" id="mem-${k}">${title}</span><span class="switch-help">${help}</span></div>${sw(`mem:${k}`, m[k], `mem-${k}`)}</div>`;
    const q = m.queue.map((x) => row(`${t(esc(x.text))}${d(`Suggested from ${esc(x.source)}`)}`, btn("mem-keep", x.id, "Keep", "btn-primary") + btn("mem-discard", x.id, "Discard", ""))).join("");
    return `${group("Settings", tog("enabled", "Memory", "Remember facts across projects.") + tog("autoExtract", "Suggest memories from chats", "New suggestions wait here for approval.") + tog("includeInPrompts", "Use memory in agent prompts", "Agents see kept memories as context."))}
      ${group(`Waiting for review · ${m.queue.length}`, q || `<p class="sub" style="font-size:14px">Nothing waiting. ${m.entries} memories kept.</p>`)}`;
  };

  R.library = () => {
    const rows = A().library.filter((x) => hit("library", JSON.stringify(x))).map((x) => row(`${t(esc(x.name))}${d(`${esc(x.kind)} · ${esc(x.size)} · from ${esc(x.from)}`)}`, btn("lib-remove", x.id, "Remove", "btn-danger"))).join("");
    return `<p class="sub">Shared logos, icons and images agents can use in any project.</p><div class="od-stack" style="--od-gap:4px">${rows || `<div class="empty">${icon("layers")}<h3>Library is empty</h3><p>Assets saved from runs show up here.</p></div>`}</div>`;
  };

  R.automations = () => {
    const rows = A().routines.filter((x) => hit("automations", JSON.stringify(x))).map((r) => { const lid = `rt-${r.id}`; return row(`<span class="t" id="${lid}">${esc(r.name)}</span>${d(`${esc(r.schedule)} · ${esc(r.target)} · last run: ${esc(r.last)}`)}`, btn("rt-run", r.id, "Run now", "") + sw(`rt-toggle:${r.id}`, r.enabled, lid)); }).join("");
    return `<p class="sub">Scheduled runs. Each run uses the default agent and still stops for approvals.</p><div class="od-stack" style="--od-gap:4px">${rows}</div>`;
  };

  /* ── Page ── */
  function cardHtml(id, sub) {
    const s = sectionOf(id);
    if (sub && DETAIL[s.id]) return `<section class="settings-card adm-card" aria-label="${esc(s.label)} detail"><div class="eyebrow">${esc(s.group)} · ${esc(s.label)}</div>${DETAIL[s.id](sub)}</section>`;
    let body = R[s.id]();
    if (SEARCH[s.id] && Q(s.id) && !body.includes('class="adm-row')) body += noHits(s.id);
    return `<section class="settings-card adm-card" aria-labelledby="adm-h"><header><div class="eyebrow">${esc(s.group)}</div><h2 id="adm-h">${esc(s.label)}</h2><span class="mono sub adm-api">${esc(s.api)}</span></header>${SEARCH[s.id] ? searchBox(s.id) : ""}${body}</section>`;
  }
  function page(r, id, sub) {
    const s = sectionOf(id);
    return K().shell({ name: "admin" }, sub ? `Admin · ${s.label}` : "Admin", crumbs(), `<div class="settings">${navHtml(s.id)}<div id="adm-card">${cardHtml(s.id, sub)}</div></div>`, "");
  }
  const cur = () => { const m = location.hash.match(/^#\/admin\/?([^/]*)/); return m ? sectionOf(m[1]).id : null; };
  function rerender(focusSel) {
    const id = cur(); const host = document.getElementById("adm-card");
    if (!id || !host) return;
    const sm = location.hash.match(/^#\/admin\/[^/]+\/([^/]+)/);
    host.innerHTML = cardHtml(id, sm ? decodeURIComponent(sm[1]) : null);
    if (focusSel) { const el = host.querySelector(focusSel); el && el.focus(); }
  }
  const find = (list, id) => A()[list].find((x) => x.id === id);
  const confirmBox = (title, items, label, kind) => dialog({ title, body: `<div class="consequence"><ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`, actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label, kind: kind || "btn-danger" }] });

  /* ── Actions ── */
  const ACT = {
    recheck: async (_, b) => { const done = busy(b, "Checking…"); await pace(700); done(); toast("All checks answered"); },
    "db-verify": async (_, b) => { const done = busy(b, "Checking…"); await pace(1200); done(); A().server.db.lastVerify = Date.now(); rerender(); toast("Database check found no problems"); },
    "db-vacuum": async () => {
      if (await confirmBox("Compact the database?", ["Writes pause for about a minute while space is reclaimed.", "Nothing is deleted."], "Compact", "btn-primary") !== "ok") return;
      A().server.db.lastVacuum = Date.now(); A().server.db.sizeMb = Math.round(A().server.db.sizeMb * 0.86); rerender(); toast("Database compacted");
    },
    shutdown: async () => {
      if (await confirmBox("Shut down the server?", ["Running sessions stop immediately.", "Reviewers and customers get errors until it restarts.", "It restarts only if your deployment restarts it."], "Shut down") !== "ok") return;
      toast("Shutdown sent. In this prototype the server keeps running.");
    },
    "run-filter": (id) => { ui().runFilter = id; rerender(); },
    "run-events": (id) => { ui().openRun = ui().openRun === id ? null : id; rerender(); },
    "run-cancel": async (id) => {
      const r = find("runs", id);
      if (await confirmBox(`Cancel ${r.project}'s run?`, [`${esc(person(r.by).name)}'s agent stops after its current step.`, "Files already written stay in the project."], "Cancel run") !== "ok") return;
      r.status = "canceled"; rerender(); toast("Run canceled");
    },
    "clear-q": (sec) => { ui().q = { ...(ui().q || {}), [sec]: "" }; rerender("#adm-q"); },
    "mcp-test": async (id, b) => { const done = busy(b, "Testing…"); await pace(900); done(); toast(`${find("mcp", id).name} answered · ${(TOOLS[id] || []).length} tools listed`); },
    "run-replay": (id) => toast(`Replaying ${id} from saved events — no model is called.`),
    "member-remove": async (id) => {
      const p = person(id);
      if (await confirmBox(`Remove ${p.name}?`, ["They lose access to every project in this workspace.", "Their projects stay; ownership moves to you."], "Remove member") !== "ok") return;
      A().members = A().members.filter((m) => m.id !== id); toast(`${p.name} removed`);
      if (/^#\/admin\/members\//.test(location.hash)) location.hash = "#/admin/members"; else rerender();
    },
    "invite-copy": (id) => copyText(`https://${A().server.host}/invite/${id}`),
    "invite-revoke": async (id) => {
      const i = find("invites", id);
      if (await confirmBox(`Revoke the invite for ${i.email}?`, ["The invite link stops working."], "Revoke invite") !== "ok") return;
      i.status = "revoked"; rerender(); toast("Invite revoked");
    },
    "tp-move": async () => {
      const u = ui(), a = A();
      const res = await dialog({
        title: `Move ${u.picked.length} project${u.picked.length > 1 ? "s" : ""}`,
        body: `<div class="radio-cards" role="radiogroup" aria-label="Destination workspace">${a.workspaces.map((w, i) => `<label class="radio-card"><input type="radio" name="mv" value="${w.id}" ${i === 1 ? "checked" : ""}><div class="od-field"><span class="t">${esc(w.name)}</span></div></label>`).join("")}</div>`,
        actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Move", kind: "btn-primary", handler: ({ root }) => { u.__mv = root.querySelector('input[name="mv"]:checked').value; } }],
      });
      if (res !== "ok") return;
      a.teamProjects = a.teamProjects.map((p) => (u.picked.includes(p.id) ? { ...p, workspace: u.__mv } : p));
      toast(`Moved to ${a.workspaces.find((w) => w.id === u.__mv).name}`); u.picked = []; rerender();
    },
    "tp-delete": async () => {
      const u = ui();
      if (await confirmBox(`Delete ${u.picked.length} project${u.picked.length > 1 ? "s" : ""}?`, ["Files, runs and comments are deleted.", "Published review links stop working.", "This can't be undone."], "Delete projects") !== "ok") return;
      A().teamProjects = A().teamProjects.filter((p) => !u.picked.includes(p.id)); toast("Projects deleted"); u.picked = []; rerender();
    },
    "agent-oauth": async (id, b) => { const done = busy(b, "Opening sign-in…"); await pace(1300); done(); const g = find("agents", id); g.state = "ok"; g.diagnostic = "Signed in · available on this server"; g.fix = null; rerender(); toast(`${g.label} signed in`); },
    "prov-key": async (id) => {
      const p = find("providers", id);
      const res = await dialog({
        title: `${p.keySet ? "Replace" : "Add"} ${p.label} key`,
        body: `<div class="field"><label for="pk">API key</label><input id="pk" class="input" type="password" autocomplete="off" aria-describedby="pk-err"><div class="err" id="pk-err" hidden></div><span class="help">Stored on the server. You won't see it again.</span></div>`,
        initialFocus: "#pk",
        actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Save key", kind: "btn-primary", handler: ({ root }) => {
          const v = root.querySelector("#pk").value.trim(), err = root.querySelector("#pk-err");
          if (v.length < 8 || /\s/.test(v)) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>Paste the full key — at least 8 characters, no spaces.</span>`; root.querySelector("#pk").setAttribute("aria-invalid", "true"); return false; }
        } }],
      });
      if (res !== "ok") return;
      p.keySet = true; if (!p.models.length) { p.models = ["default"]; p.defaultModel = "default"; } rerender(); toast(`${p.label} key saved`);
    },
    "prov-test": async (id, b) => { const done = busy(b, "Testing…"); await pace(900); done(); toast(`${find("providers", id).label} answered (simulated in this prototype)`); },
    "prov-remove": async (id) => {
      const p = find("providers", id);
      if (await confirmBox(`Remove the ${p.label} key?`, ["Runs that use this provider will fail until a key is added."], "Remove key") !== "ok") return;
      p.keySet = false; p.models = []; rerender(); toast("Key removed");
    },
    "plugin-install": async (id, b) => { const done = busy(b, "Installing…"); await pace(1000); done(); const p = find("plugins", id); p.installed = true; rerender(); toast(`${p.name} installed — not trusted yet`); },
    "plugin-trust": async (id) => {
      const p = find("plugins", id);
      if (await confirmBox(`Trust ${p.name}?`, ["Its prompts, skills and tools can be used in every project.", "Its tools still ask before writing or reaching the network.", `Source: ${esc(p.source)}`], "Trust plugin", "btn-primary") !== "ok") return;
      p.trusted = true; rerender(); toast(`${p.name} trusted`);
    },
    "plugin-upgrade": async (id, b) => { const p = find("plugins", id); const done = busy(b, "Upgrading…"); await pace(1000); done(); p.version = p.update; p.update = null; rerender(); toast(`${p.name} upgraded to ${p.version}`); },
    "plugin-doctor": async (id, b) => {
      const done = busy(b, "Checking…"); await pace(800); done();
      const p = find("plugins", id);
      ui().doctor[id] = [{ ok: true, text: "Manifest is valid" }, { ok: true, text: "All referenced skills found" }, { ok: p.trusted, text: p.trusted ? "Trusted source" : "Not trusted — its tools are disabled" }];
      rerender();
    },
    "plugin-uninstall": async (id) => {
      const p = find("plugins", id);
      if (await confirmBox(`Uninstall ${p.name}?`, ["Projects that use it keep their files but can't run it."], "Uninstall") !== "ok") return;
      p.installed = false; p.trusted = false; delete ui().doctor[id]; rerender(); toast(`${p.name} uninstalled`);
    },
    "mk-refresh": async (id, b) => { const done = busy(b, "Refreshing…"); await pace(900); done(); find("marketplaces", id).refreshedAt = Date.now(); rerender(); toast("Catalog refreshed"); },
    "mk-trust": async (id) => {
      const m = find("marketplaces", id);
      if (await confirmBox(`Trust ${m.name}?`, ["Plugins installed from it are trusted automatically.", `<span class="mono">${esc(m.url)}</span>`], "Trust registry", "btn-primary") !== "ok") return;
      m.trusted = true; rerender();
    },
    "mk-remove": async (id) => {
      const m = find("marketplaces", id);
      if (await confirmBox(`Remove ${m.name}?`, ["Installed plugins stay, but won't get upgrades from it."], "Remove registry") !== "ok") return;
      A().marketplaces = A().marketplaces.filter((x) => x.id !== id); rerender();
    },
    "ds-default": (id) => { A().designSystems = A().designSystems.map((s) => ({ ...s, default: s.id === id })); rerender(); toast("Default design system changed"); },
    "brand-cancel": (id) => { const b = find("brands", id); A().brands = A().brands.filter((x) => x.id !== id); rerender(); toast(`Stopped extracting ${b.name}`); },
    "mcp-connect": async (id, b) => { const done = busy(b, "Opening sign-in…"); await pace(1200); done(); const m = find("mcp", id); m.connected = true; m.enabled = true; rerender(); toast(`${m.name} connected`); },
    "mcp-disconnect": async (id) => {
      const m = find("mcp", id);
      if (await confirmBox(`Disconnect ${m.name}?`, ["Agents lose its tools until you connect again.", "The stored OAuth token is deleted."], "Disconnect") !== "ok") return;
      m.connected = false; rerender();
    },
    "mcp-remove": async (id) => {
      const m = find("mcp", id);
      if (await confirmBox(`Remove ${m.name}?`, ["Agents lose its tools.", "Its saved credentials are deleted."], "Remove server") !== "ok") return;
      A().mcp = A().mcp.filter((x) => x.id !== id); rerender();
    },
    "conn-connect": async (id, b) => { const done = busy(b, "Connecting…"); await pace(1200); done(); const c = find("connectors", id); c.status = "connected"; c.error = null; c.account = c.account || "travis@know-me.tools"; rerender(); toast(`${c.name} connected`); },
    "conn-disconnect": async (id) => {
      const c = find("connectors", id);
      if (await confirmBox(`Disconnect ${c.name}?`, ["Agents lose its tools in every project."], "Disconnect") !== "ok") return;
      c.status = "disconnected"; rerender();
    },
    "dp-zones": async (_, b) => { const done = busy(b, "Loading…"); await pace(800); done(); toast("Zones: know-me.tools (simulated)"); },
    "mem-keep": (id) => { const m = A().memory; m.queue = m.queue.filter((x) => x.id !== id); m.entries += 1; rerender(); toast("Memory kept"); },
    "mem-discard": (id) => { const m = A().memory; m.queue = m.queue.filter((x) => x.id !== id); rerender(); },
    "lib-remove": async (id) => {
      const x = find("library", id);
      if (await confirmBox(`Remove ${x.name}?`, ["Projects that already use it keep their copy."], "Remove asset") !== "ok") return;
      A().library = A().library.filter((y) => y.id !== id); rerender();
    },
    "rt-run": async (id, b) => { const done = busy(b, "Starting…"); await pace(800); done(); find("routines", id).last = "running"; rerender(); toast("Routine started"); },
  };
  const TOGGLES = {
    "skill-toggle": (id) => { const s = find("skills", id); s.enabled = !s.enabled; },
    "mcp-toggle": (id) => { const m = find("mcp", id); m.enabled = !m.enabled; },
    "rt-toggle": (id) => { const r = find("routines", id); r.enabled = !r.enabled; },
    "mcp-tool": (key) => { const [sid, tool] = key.split("|"); const m = find("mcp", sid); m.toolState = m.toolState || {}; m.toolState[tool] = m.toolState[tool] === false; toast(`${tool} ${m.toolState[tool] === false ? "turned off" : "turned on"}`); },
    mem: (k) => { A().memory[k] = !A().memory[k]; toast("Memory settings saved"); },
  };

  /* ── Forms ── */
  const FORMS = {
    probe: () => {
      const v = document.getElementById("probe-url").value.trim();
      if (!showErr("probe-url", /^https?:\/\/[^\s/]+/.test(v) ? "" : "Enter the server's address, starting with https://")) return;
      runProbe(v);
    },
    invite: () => {
      const e = document.getElementById("inv-email").value.trim(), role = document.getElementById("inv-role").value;
      const taken = A().members.some((m) => m.email === e) || A().invites.some((i) => i.email === e && i.status === "pending");
      if (!showErr("inv-email", !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? "Enter an email address like name@company.com." : taken ? "This person is already a member or has a pending invite." : "")) return;
      A().invites = [...A().invites, { id: "inv-" + Date.now().toString(36), email: e, role, sentAt: Date.now(), expiresAt: Date.now() + 7 * 864e5, status: "pending" }];
      rerender(); toast(`Invite sent to ${e}`);
    },
    plugin: async () => {
      const v = document.getElementById("pl-src").value.trim();
      if (!showErr("pl-src", !v ? "Enter a plugin ID, link or folder." : /^http:\/\//.test(v) ? "Use an https:// link." : "")) return;
      await pace(900);
      const id = v.split(/[/\\]/).filter(Boolean).pop().replace(/\.zip$/, "");
      const known = find("plugins", id);
      if (known) known.installed = true;
      else A().plugins = [...A().plugins, { id, name: id, source: /^https:/.test(v) ? "Link" : /[/\\]/.test(v) ? "Folder" : "Official registry", version: "0.1.0", trusted: false, installed: true, update: null }];
      rerender(); toast(`${id} installed — not trusted yet`);
    },
    market: async () => {
      const v = document.getElementById("mk-url").value.trim();
      if (!showErr("mk-url", !/^https:\/\/[^\s/]+/.test(v) ? "Enter an https:// catalog URL." : A().marketplaces.some((m) => m.url === v) ? "This registry is already added." : "")) return;
      await pace(700);
      A().marketplaces = [...A().marketplaces, { id: "mk-" + Date.now().toString(36), name: new URL(v).hostname, url: v, trusted: false, plugins: 0, refreshedAt: Date.now() }];
      rerender(); toast("Registry added — not trusted yet");
    },
    skill: async () => {
      const v = document.getElementById("sk-src").value.trim();
      if (!showErr("sk-src", !v ? "Enter a link or folder path." : "")) return;
      await pace(700);
      const id = v.split(/[/\\]/).filter(Boolean).pop();
      A().skills = [...A().skills, { id, name: id, source: "Imported", enabled: true }]; rerender(); toast(`Skill ${id} imported`);
    },
    mcp: () => {
      const name = document.getElementById("mcp-name").value.trim(), tr = document.getElementById("mcp-transport").value, target = document.getElementById("mcp-target").value.trim(), auth = document.getElementById("mcp-auth").value;
      const ok1 = showErr("mcp-name", !/^[a-z0-9][a-z0-9-]{1,40}$/.test(name) ? "Use lowercase letters, numbers and dashes." : A().mcp.some((m) => m.id === name) ? "A server with this name already exists." : "");
      if (!ok1) return;
      if (!showErr("mcp-target", tr === "stdio" ? (target ? "" : "Enter the command to start the server.") : (/^https:\/\/[^\s/]+/.test(target) ? "" : "Enter an https:// URL."))) return;
      A().mcp = [...A().mcp, { id: name, name, transport: tr, url: tr === "stdio" ? "" : target, auth, enabled: auth !== "oauth", connected: auth !== "oauth" }];
      rerender(); toast(auth === "oauth" ? `${name} saved — connect it to finish` : `${name} saved`);
    },
    deploy: () => {
      const c = A().deploy;
      const acc = document.getElementById("dp-account").value.trim(), proj = document.getElementById("dp-project").value.trim(), tok = document.getElementById("dp-token").value.trim();
      if (!showErr("dp-account", /^[a-f0-9]{32}$/.test(acc) ? "" : "Account IDs are 32 lowercase hex characters — find it in the Cloudflare dashboard sidebar.")) return;
      if (!showErr("dp-project", /^[a-z0-9][a-z0-9-]{0,57}$/.test(proj) ? "" : "Use lowercase letters, numbers and dashes.")) return;
      if (!showErr("dp-token", c.tokenSet || tok.length >= 20 ? "" : "Paste the API token (at least 20 characters).")) return;
      A().deploy = { ...c, accountId: acc, project: proj, tokenSet: c.tokenSet || !!tok };
      rerender(); toast("Deploy target saved");
    },
  };

  /* ── Events ── */
  document.addEventListener("click", async (e) => {
    if (!cur()) return;
    const b = e.target.closest("[data-adm]");
    if (!b || b.disabled) return;
    const key = b.dataset.adm;
    if (key.includes(":")) {
      if (b.getAttribute("aria-disabled") === "true") return;
      const k = key.slice(0, key.indexOf(":")), id = key.slice(key.indexOf(":") + 1);
      if (TOGGLES[k]) { TOGGLES[k](id); rerender(`[data-adm="${key}"]`); }
      return;
    }
    if (ACT[key]) ACT[key](b.dataset.id, b);
  });
  let qTimer = 0;
  document.addEventListener("input", (e) => {
    const sec = e.target.dataset && e.target.dataset.admQ; if (!sec || !cur()) return;
    ui().q = { ...(ui().q || {}), [sec]: e.target.value };
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { const pos = e.target.selectionStart; rerender("#adm-q"); const i = document.getElementById("adm-q"); if (i) i.setSelectionRange(pos, pos); }, 200);
  });
  document.addEventListener("submit", (e) => {
    if (!cur()) return;
    const f = e.target.closest("[data-adm-form]");
    if (!f) return;
    e.preventDefault();
    FORMS[f.dataset.admForm] && FORMS[f.dataset.admForm]();
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "adm-jump") { location.hash = e.target.value; return; }
    if (!cur()) return;
    const pk = e.target.closest("[data-adm-pick]");
    if (pk) { const u = ui(); u.picked = pk.checked ? [...u.picked, pk.dataset.admPick] : u.picked.filter((x) => x !== pk.dataset.admPick); rerender(`[data-adm-pick="${pk.dataset.admPick}"]`); return; }
    const c = e.target.closest("[data-adm-change]");
    if (!c) return;
    const k = c.dataset.admChange;
    if (k === "role") { const m = find("members", c.dataset.id); m.role = c.value; toast(`${person(m.id).name} is now ${c.value === "admin" ? "an admin" : "a member"}`); }
    if (k === "ws-filter") { ui().wsFilter = c.value; ui().picked = []; rerender("#ws-filter"); }
    if (k === "def-agent") { A().defaultAgent = c.value; toast("Default agent saved"); }
    if (k === "mcp-transport") { ui().mcpTransport = c.value; rerender("#mcp-transport"); }
  });

  window.KD_ADMIN = { page, navHtml, data: A };
})();
