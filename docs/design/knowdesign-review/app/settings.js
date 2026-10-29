/* KnowDesign Review — configuration portal for the hub workspace. */
(function () {
  "use strict";
  const { icon, esc, pace, toast, busy } = window.KD_UI;
  const K = () => window.KD;

  const HOST = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  const HTTPS = /^https:\/\/[^\s/$.?#].[^\s]*$/;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const intIn = (lo, hi) => (v) => (Number.isInteger(Number(v)) && v !== "" && Number(v) >= lo && Number(v) <= hi ? "" : `Enter a whole number from ${lo} to ${hi}.`);

  const SECTIONS = [
    {
      id: "identity", label: "Identity", icon: "shield",
      title: "Who can review", lede: "Reviewers open a capability link. Approvers and authors sign in with KnowMe accounts through Kratos; flint-gate turns the session into a JWT the hub trusts.",
      groups: (v) => [
        { title: "Reviewer access", fields: [
          { key: "mode", type: "radio", label: "Allowed reviewers", options: [
            ["guest", "Guest links only", "Anyone with the link enters a display name."],
            ["both", "Guest links and KnowMe accounts", "Guests comment; signed-in people can also approve."],
            ["kratos", "KnowMe accounts only", "Every reviewer signs in. Guest names are disabled."]] },
          v.mode !== "kratos" && { key: "guestCookieDays", type: "number", label: "Remember a guest's name for", suffix: "days", help: "Stored in a signed cookie on the review host only.", validate: intIn(1, 30) },
          { key: "requireKratosForApprovers", type: "switch", label: "Approvers must sign in", help: "Approvals from guest links are never counted." },
        ] },
        v.mode !== "guest" && { title: "Kratos and flint-gate", fields: [
          { key: "kratosUrl", type: "url", label: "Kratos public URL", validate: (x) => (HTTPS.test(x) ? "" : "Use a full https:// address.") },
          { key: "gateIssuer", type: "url", label: "flint-gate JWT issuer", help: "The hub checks tokens against this issuer's JWKS.", validate: (x) => (HTTPS.test(x) ? "" : "Use a full https:// address.") },
          { key: "audience", type: "text", label: "JWT audience", validate: (x) => (/^[a-z0-9-]{3,40}$/.test(x) ? "" : "Use 3–40 lowercase letters, numbers or dashes.") },
        ] },
      ],
    },
    {
      id: "hosting", label: "Hosting & storage", icon: "server",
      title: "Hosting and storage", lede: "Two hostnames on the shared gateway: the review app, and an isolated origin that only serves authored HTML with no cookies.",
      groups: (v) => [
        { title: "Hostnames", fields: [
          { key: "reviewHost", type: "text", label: "Review host", help: "API and reviewer pages.", validate: (x) => (HOST.test(x) ? "" : "Enter a hostname like review.know-me.tools.") },
          { key: "snapHost", type: "text", label: "Snapshot host", help: "Must be a different origin from the review host.", validate: (x, all) => (!HOST.test(x) ? "Enter a hostname like snap.know-me.tools." : x === all.reviewHost ? "Use a different host than the review host — sharing an origin would let a design read reviewer cookies." : "") },
          { key: "csp", type: "switch", label: "Serve snapshots with CSP sandbox", help: "Turning this off lets published designs run scripts against the snapshot origin.", warnOff: true },
        ] },
        { title: "Snapshot storage", fields: [
          { key: "storage", type: "select", label: "Storage backend", options: [["pvc", "Block storage volume (PVC)"], ["s3", "S3-compatible bucket"]] },
          v.storage === "pvc" && { key: "pvcClass", type: "text", label: "Storage class", validate: (x) => (x.trim() ? "" : "Enter the storage class name.") },
          v.storage === "pvc" && { key: "pvcSize", type: "number", label: "Volume size", suffix: "GB", validate: intIn(10, 500) },
          v.storage === "s3" && { key: "s3Bucket", type: "text", label: "Bucket name", required: true, validate: (x) => (/^[a-z0-9.-]{3,63}$/.test(x) ? "" : "Enter a bucket name: 3–63 lowercase letters, numbers, dots or dashes.") },
        ] },
      ],
    },
    {
      id: "limits", label: "Limits", icon: "gauge",
      title: "Limits", lede: "Applies to every new publication and comment. Existing links keep the limits they were published with.",
      groups: (v) => [
        { title: "Publishing", two: true, fields: [
          { key: "snapshotMb", type: "number", label: "Largest snapshot", suffix: "MB", validate: intIn(1, 100) },
          { key: "publishesPerDay", type: "number", label: "Publishes per author", suffix: "per day", validate: intIn(1, 1000) },
          { key: "expiryDays", type: "number", label: "Default link lifetime", suffix: "days", validate: (x, all) => intIn(1, Number(all.maxExpiryDays) || 90)(x) },
          { key: "maxExpiryDays", type: "number", label: "Longest allowed lifetime", suffix: "days", validate: intIn(1, 365) },
        ] },
        { title: "Comments", two: true, fields: [
          { key: "commentChars", type: "number", label: "Longest comment", suffix: "characters", validate: intIn(100, 10000) },
          { key: "commentsPerMin", type: "number", label: "Comments per guest", suffix: "per minute", validate: intIn(1, 120) },
        ] },
      ],
    },
    {
      id: "approvals", label: "Approval policy", icon: "gate",
      title: "Approval policy", lede: "The gate a design has to pass before it can be released to a customer.",
      groups: () => [
        { title: "Gate", fields: [
          { key: "required", type: "select", label: "Approvals needed", options: [["1", "1 approver"], ["2", "2 approvers"], ["3", "3 approvers"]], number: true },
          { key: "blockOnOpen", type: "switch", label: "Block approval while comments are open", help: "Every comment must be resolved or replied to first." },
          { key: "authorCanApprove", type: "switch", label: "Authors can approve their own design", help: "Their approval still counts toward the total." },
          { key: "resetOnNewVersion", type: "switch", label: "Reset approvals on a new version", help: "Each version is approved on its own." },
          { key: "releaseNeedsApproved", type: "switch", label: "Only approved designs can be released", help: "Required for customer workspaces.", locked: true },
        ] },
      ],
    },
    {
      id: "agents", label: "Agents", icon: "bot",
      title: "Review agent", lede: "Which model runs the review agent and what it may touch. Write actions always stop for your confirmation.",
      groups: (v) => [
        { title: "Model", fields: [
          { key: "lane", type: "radio", label: "Where the agent runs", options: [
            ["local", "On-device", "Runs on the author's machine. Comments never leave it."],
            ["remote-user", "Your remote model", "A model endpoint you control, reached through flint-gate."],
            ["cloud", "Commercial cloud", "A hosted provider. Comment text is sent to it."]] },
          { key: "model", type: "text", label: "Model", validate: (x) => (x.trim() ? "" : "Enter the model id the agent uses.") },
        ] },
        { title: "Tools", tools: true, fields: [
          { key: "hub.comments.list", read: true, help: "Read comments on the current design." },
          { key: "hub.comments.cluster", read: true, help: "Group comments into themes." },
          { key: "snap.diff_versions", read: true, help: "Compare two published snapshots." },
          { key: "release.draft_notes", read: true, help: "Draft customer release notes." },
          { key: "notify.reviewers", help: "Tell guests their feedback was received. Needs a notification channel." },
          { key: "knowdesign.prompt.create", help: "Queue a change prompt in the author's KnowDesign project." },
        ] },
      ],
    },
    {
      id: "runtime", label: "Agent runtime", icon: "server", extra: true,
      title: "Agent runtime (UAR)", lede: "Studio runs the design agent on a Universal Agent Runtime instance instead of a CLI on someone's laptop. Leave the URL empty to use the built-in demo stream, which sends the same AG-UI events.",
      groups: () => [
        { title: "Connection", fields: [
          { key: "baseUrl", type: "url", label: "UAR base URL", help: "For example https://uar.know-me.tools. Empty means demo stream.", validate: (x) => (!x || /^https:\/\/[^\s/]+/.test(x) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/.test(x) ? "" : "Use https://, or http://localhost for a local runtime. Leave empty for the demo stream.") },
          { key: "agentId", type: "text", label: "Agent ID", help: "A native agent or a uar:agent:<binding> target.", validate: (x) => (/^[A-Za-z0-9:._-]{2,120}$/.test(x) ? "" : "Use letters, numbers, colons, dots, dashes or underscores.") },
          { key: "workspaceId", type: "text", label: "Workspace ID", help: "Sent as the x-uar-workspace-id header.", validate: (x) => (/^[A-Za-z0-9._-]{2,80}$/.test(x) ? "" : "Use 2–80 letters, numbers, dots, dashes or underscores.") },
        ] },
      ],
    },
    {
      id: "notifications", label: "Notifications", icon: "bell",
      title: "Notifications", lede: "How authors and reviewers hear about new comments, approvals and releases.",
      groups: (v) => [
        { title: "Channels", fields: [
          { key: "inApp", type: "switch", label: "In-app inbox", help: "New comments show in Inbox and as a badge in KnowDesign." },
          { key: "email", type: "switch", label: "Email", help: "Sent through the platform mail relay." },
          v.email && { key: "emailFrom", type: "email", label: "Send from", required: true, validate: (x) => (EMAIL.test(x) ? "" : "Enter an email address like review@know-me.tools.") },
          { key: "webhook", type: "url", label: "Webhook URL", help: "Optional. Receives every hub event as JSON.", validate: (x) => (!x || HTTPS.test(x) ? "" : "Use a full https:// address, or leave it empty.") },
          { key: "digest", type: "select", label: "Author digest", options: [["off", "Off"], ["hourly", "Hourly"], ["daily", "Daily"]] },
        ] },
      ],
    },
  ];

  const drafts = {};
  const draftFor = (id) => (drafts[id] = drafts[id] || { values: JSON.parse(JSON.stringify(K().state.config[id])), errors: {}, dirty: false, saved: false, tried: false });
  const sectionOf = (id) => SECTIONS.find((s) => s.id === id) || SECTIONS[0];
  const groupsOf = (s, v) => s.groups(v).filter(Boolean).map((g) => ({ ...g, fields: g.fields.filter(Boolean) }));
  const fid = (k) => "set-" + k.replace(/\./g, "-");

  function fieldHtml(sec, f, dr) {
    const v = dr.values;
    const id = fid(f.key);
    const err = dr.errors[f.key];
    const errEl = `<div class="err" id="${id}-err" ${err ? "" : "hidden"}>${err ? `${icon("alert", "icon-sm")}<span>${esc(err)}</span>` : ""}</div>`;
    const help = f.help ? `<span class="help" id="${id}-help">${esc(f.help)}</span>` : "";
    const desc = `aria-describedby="${f.help ? id + "-help " : ""}${id}-err"`;
    const req = f.required ? ' <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span>' : "";
    switch (f.type) {
      case "switch": {
        const on = !!v[f.key];
        const warn = f.warnOff && !on ? `<div class="err">${icon("alert", "icon-sm")}<span>Snapshots can run scripts. Only turn this off for trusted, internal designs.</span></div>` : "";
        return `<div><div class="switch-row"><div class="od-field"><span class="switch-title" id="${id}-l">${esc(f.label)}</span>${f.help ? `<span class="switch-help">${esc(f.help)}</span>` : ""}</div>
          <button type="button" class="switch-hit" role="switch" id="${id}" aria-checked="${on}" aria-labelledby="${id}-l" data-set-switch="${f.key}" ${f.locked ? 'aria-disabled="true" title="Required for customer workspaces"' : ""}><span class="switch" aria-checked="${on}"></span></button></div>${warn}</div>`;
      }
      case "radio":
        return `<div class="field"><span class="label" id="${id}-l">${esc(f.label)}</span><div class="radio-cards" role="radiogroup" aria-labelledby="${id}-l">
          ${f.options.map(([val, t, d]) => `<label class="radio-card"><input type="radio" name="${id}" value="${val}" data-set-key="${f.key}" ${v[f.key] === val ? "checked" : ""}><div class="od-field"><span class="t">${esc(t)}</span><span class="d">${esc(d)}</span></div></label>`).join("")}</div></div>`;
      case "select":
        return `<div class="field"><label for="${id}">${esc(f.label)}</label><select id="${id}" class="select" data-set-key="${f.key}" ${f.number ? 'data-number="1"' : ""}>
          ${f.options.map(([val, l]) => `<option value="${val}" ${String(v[f.key]) === val ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>`;
      default: {
        const type = f.type === "number" ? "number" : f.type === "email" ? "email" : f.type === "url" ? "url" : "text";
        const input = `<input id="${id}" class="input" type="${type}" ${type === "number" ? 'inputmode="numeric"' : ""} value="${esc(v[f.key])}" data-set-key="${f.key}" ${f.type === "number" ? 'data-number="1"' : ""} aria-invalid="${!!err}" ${desc} autocomplete="off" spellcheck="false">`;
        return `<div class="field"><label for="${id}">${esc(f.label)}${req}</label>${f.suffix ? `<div class="input-affix">${input}<span class="suffix">${esc(f.suffix)}</span></div>` : input}${help}${errEl}</div>`;
      }
    }
  }

  function toolsHtml(g, dr) {
    const tools = dr.values.tools;
    return g.fields.map((f) => {
      const id = fid("tool-" + f.key);
      return `<div class="tool-toggle"><div class="od-field"><span class="t" id="${id}-l">${esc(f.key)}</span><span class="d">${esc(f.help)} ${f.read ? "<span class=\"pill\">Read</span>" : "<span class=\"pill stage-released\">Write · asks first</span>"}</span></div>
        <button type="button" class="switch-hit" role="switch" aria-checked="${!!tools[f.key]}" aria-labelledby="${id}-l" data-set-tool="${f.key}"><span class="switch" aria-checked="${!!tools[f.key]}"></span></button></div>`;
    }).join("");
  }

  function cardHtml(sec) {
    const dr = draftFor(sec.id);
    const groups = groupsOf(sec, dr.values);
    const errs = Object.entries(dr.errors).filter(([, m]) => m);
    const summary = dr.tried && errs.length ? `<div class="error-summary" role="alert" tabindex="-1" id="set-errors"><span class="t">${errs.length} setting${errs.length > 1 ? "s need" : " needs"} fixing</span><ul>${errs.map(([k, m]) => `<li><a href="#" data-set-jump="${fid(k)}">${esc(m)}</a></li>`).join("")}</ul></div>` : "";
    const status = dr.saving ? "" : dr.saved ? `<span class="msg ok">${icon("check", "icon-sm")}Saved · applies to new publications</span>` : dr.dirty ? `<span class="msg dirty">Unsaved changes</span>` : `<span class="msg dirty">All changes saved</span>`;
    return `<section class="settings-card" aria-labelledby="set-h">
      <header><div class="eyebrow">${esc(sec.label)}</div><h2 id="set-h">${esc(sec.title)}</h2><p>${esc(sec.lede)}</p></header>
      ${summary}
      <form id="set-form" class="od-stack" style="--od-gap:16px" novalidate>
        ${groups.map((g) => `<fieldset class="group" style="margin:0;min-width:0"><legend class="group-title" style="padding:0 0 12px">${esc(g.title)}</legend>
          <div class="${g.two ? "two-col" : "od-stack"}" style="--od-gap:16px">${g.tools ? toolsHtml(g, dr) : g.fields.map((f) => fieldHtml(sec, f, dr)).join("")}</div></fieldset>`).join("")}
        <div class="save-bar"><button type="submit" class="btn btn-primary" id="set-save" ${dr.dirty ? "" : 'aria-disabled="true"'}>Save changes</button>
          <button type="button" class="btn btn-ghost" data-set-reset ${dr.dirty ? "" : "hidden"}>Discard</button><span class="save-msg">${status}</span></div>
      </form>${sec.extra ? runtimeExtra(dr.values) : ""}</section>`;
  }

  function runtimeExtra(v) {
    const has = window.KD_UAR.hasToken();
    const base = (v.baseUrl || "").replace(/\/$/, "");
    const ag = encodeURIComponent(v.agentId || "");
    return `<div class="group od-stack" style="--od-gap:16px">
      <div class="group-title">Access token</div>
      <p class="sub" style="font-size:14px">In production the hub gets this from flint-gate after you sign in. For the prototype, paste a bearer token. It stays in this browser tab only and is never shown again.</p>
      <div class="field"><label for="rt-token">Bearer token</label>
        <div class="od-row"><input id="rt-token" class="input od-fill" type="password" autocomplete="off" spellcheck="false" placeholder="${has ? "A token is stored for this session" : "Paste a token"}" aria-describedby="rt-token-state">
          <button type="button" class="btn od-fixed" data-rt="save-token">Use token</button></div>
        <span class="help" id="rt-token-state">${has ? `${icon("lock", "icon-sm")} Token stored for this tab. <button type="button" class="btn btn-ghost" style="min-height:32px;padding:0 8px" data-rt="clear-token">Forget it</button>` : "No token stored."}</span></div>
      <div class="save-bar"><button type="button" class="btn btn-cyan" data-rt="test" ${base ? "" : 'aria-disabled="true"'}>${icon("refresh", "icon-sm")}Test connection</button>
        <span class="msg dirty">${base ? "Uses the saved URL above." : "Set and save a URL first. Studio uses the demo stream until then."}</span></div>
      <div id="rt-result" aria-live="polite"></div>
      <dl class="kv"><dt>Start a run</dt><dd>POST ${esc(base || "{base}")}/api/uar/ag-ui/agents/${esc(ag)}</dd>
        <dt>Reconnect</dt><dd>GET …/agents/${esc(ag)}/threads/{thread}/runs/{run}/stream</dd>
        <dt>Health</dt><dd>GET ${esc(base || "{base}")}/health</dd>
        <dt>Headers</dt><dd>Authorization: Bearer ••• · x-uar-workspace-id: ${esc(v.workspaceId || "")}</dd></dl></div>`;
  }

  function page(r, id) {
    const sec = sectionOf(id);
    const body = `<div class="settings">${window.KD_ADMIN.navHtml(sec.id)}<div id="set-card">${cardHtml(sec)}</div></div>`;
    return K().shell(r, "Admin", `<span>Review hub</span>${icon("chevron", "icon-sm")}<span class="mono">review.know-me.tools</span>`, body, "");
  }

  const curId = () => { const m = location.hash.match(/^#\/settings\/?([^/]*)/); return m ? sectionOf(m[1]).id : null; };
  function rerenderCard(focusId) {
    const id = curId(); if (!id) return;
    const host = document.getElementById("set-card");
    if (host) host.innerHTML = cardHtml(sectionOf(id));
    if (focusId) { const el = document.getElementById(focusId) || document.querySelector(`[name="${focusId}"]:checked`); el && el.focus(); }
  }
  const updateStatus = () => {
    const id = curId(); const dr = draftFor(id);
    const save = document.getElementById("set-save"); if (save) save.setAttribute("aria-disabled", dr.dirty ? "false" : "true");
    const reset = document.querySelector("[data-set-reset]"); if (reset) reset.hidden = !dr.dirty;
    const msg = document.querySelector(".save-msg"); if (msg) msg.innerHTML = dr.dirty ? `<span class="msg dirty">Unsaved changes</span>` : "";
  };

  function fieldDefs(sec, v) { return groupsOf(sec, v).flatMap((g) => (g.tools ? [] : g.fields)); }
  function validateField(sec, dr, key) {
    const f = fieldDefs(sec, dr.values).find((x) => x.key === key);
    const msg = f && f.validate ? f.validate(String(dr.values[key] == null ? "" : dr.values[key]).trim(), dr.values) : "";
    dr.errors = { ...dr.errors, [key]: msg };
    if (!msg) delete dr.errors[key];
    const el = document.getElementById(fid(key) + "-err"), inp = document.getElementById(fid(key));
    if (el) { el.hidden = !msg; el.innerHTML = msg ? `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>` : ""; }
    if (inp) inp.setAttribute("aria-invalid", !!msg);
    return !msg;
  }

  document.addEventListener("input", (e) => {
    const id = curId(); if (!id) return;
    const k = e.target.dataset && e.target.dataset.setKey; if (!k || e.target.type === "radio") return;
    const dr = draftFor(id);
    dr.values = { ...dr.values, [k]: e.target.dataset.number ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value };
    dr.dirty = true; dr.saved = false;
    updateStatus();
  });
  document.addEventListener("change", (e) => {
    const id = curId(); if (!id) return;
    const k = e.target.dataset && e.target.dataset.setKey; if (!k) return;
    if (e.target.tagName !== "SELECT" && e.target.type !== "radio") return;
    const dr = draftFor(id);
    dr.values = { ...dr.values, [k]: e.target.dataset.number ? Number(e.target.value) : e.target.value };
    dr.dirty = true; dr.saved = false;
    rerenderCard(e.target.type === "radio" ? e.target.name : e.target.id);
  });
  document.addEventListener("focusout", (e) => {
    const id = curId(); if (!id) return;
    const k = e.target.dataset && e.target.dataset.setKey; if (!k || e.target.tagName !== "INPUT" || e.target.type === "radio") return;
    validateField(sectionOf(id), draftFor(id), k);
  });
  document.addEventListener("click", (e) => {
    const id = curId(); if (!id) return;
    const dr = draftFor(id);
    const sw = e.target.closest("[data-set-switch]");
    if (sw) {
      if (sw.getAttribute("aria-disabled") === "true") { toast("This setting is required for customer workspaces."); return; }
      dr.values = { ...dr.values, [sw.dataset.setSwitch]: !dr.values[sw.dataset.setSwitch] }; dr.dirty = true; dr.saved = false;
      rerenderCard(sw.id); return;
    }
    const tl = e.target.closest("[data-set-tool]");
    if (tl) {
      dr.values = { ...dr.values, tools: { ...dr.values.tools, [tl.dataset.setTool]: !dr.values.tools[tl.dataset.setTool] } }; dr.dirty = true; dr.saved = false;
      rerenderCard(); const again = document.querySelector(`[data-set-tool="${tl.dataset.setTool}"]`); again && again.focus(); return;
    }
    const j = e.target.closest("[data-set-jump]");
    if (j) { e.preventDefault(); const t = document.getElementById(j.dataset.setJump); t && t.focus(); return; }
    if (e.target.closest("[data-set-reset]")) { delete drafts[id]; rerenderCard(); toast("Changes discarded"); }
    const rt = e.target.closest("[data-rt]");
    if (rt) handleRuntime(rt);
  });
  document.addEventListener("submit", async (e) => {
    if (e.target.id !== "set-form") return;
    e.preventDefault();
    const id = curId(); const sec = sectionOf(id); const dr = draftFor(id);
    if (!dr.dirty) return;
    dr.errors = {};
    fieldDefs(sec, dr.values).forEach((f) => { if (f.validate) { const m = f.validate(String(dr.values[f.key] == null ? "" : dr.values[f.key]).trim(), dr.values); if (m) dr.errors[f.key] = m; } });
    dr.tried = true;
    if (Object.keys(dr.errors).length) { rerenderCard("set-errors"); return; }
    const btn = document.getElementById("set-save");
    busy(btn, "Saving…");
    await pace(800);
    K().state.config = { ...K().state.config, [id]: JSON.parse(JSON.stringify(dr.values)) };
    drafts[id] = { ...draftFor(id), dirty: false, saved: true, tried: false, errors: {} };
    K().render();
    toast("Settings saved");
  });

  async function handleRuntime(btn) {
    const act = btn.dataset.rt;
    if (act === "save-token") {
      const inp = document.getElementById("rt-token");
      if (!inp.value.trim()) { toast("Paste a token first.", "error"); inp.focus(); return; }
      window.KD_UAR.setToken(inp.value.trim()); inp.value = "";
      rerenderCard("rt-token"); toast("Token stored for this tab");
      return;
    }
    if (act === "clear-token") { window.KD_UAR.setToken(""); rerenderCard("rt-token"); toast("Token forgotten"); return; }
    if (act === "test") {
      const cfg = K().state.config.runtime;
      if (!cfg.baseUrl) { toast("Save a runtime URL first.", "error"); return; }
      const out = document.getElementById("rt-result");
      const done = busy(btn, "Testing…");
      const res = await window.KD_UAR.test(cfg);
      done();
      const cls = res.ok ? "success-panel" : "blocked-panel";
      out.innerHTML = `<div class="${cls}" style="padding:16px;gap:6px"><div style="font-weight:700;display:flex;gap:8px;align-items:center">${icon(res.ok ? "check" : "alert", "icon-sm")}${esc(res.title)}</div><div style="font-size:14px">${esc(res.detail)}</div></div>`;
    }
  }

  window.KD_SETTINGS = { page, mount: () => {}, sections: SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon })) };
})();
