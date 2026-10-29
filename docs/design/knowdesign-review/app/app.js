/* KnowDesign Review — state, router, shell, pipeline, inbox, releases. */
(function () {
  "use strict";
  const { icon, MARK, esc, fmtDate, fmtAgo, fmtIn, slug, pace, toast, dialog, busy, getThemePref, setThemePref, applyTheme, copyText } = window.KD_UI;
  const DATA = window.KD_DATA;

  /* ── State (in-memory; the live hub persists to Postgres) ── */
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const state = {
    designs: clone(DATA.designs),
    config: clone(DATA.config),
    customers: DATA.customers,
    people: DATA.people,
    localProjects: DATA.localProjects,
    ui: { stageFilter: null, search: "", room: {}, scroll: {} },
  };
  const ME = "travis";

  const STAGES = [
    { id: "draft", label: "Draft", help: "Not published yet" },
    { id: "review", label: "In review", help: "Link is live for reviewers" },
    { id: "changes", label: "Changes requested", help: "An approver asked for changes" },
    { id: "approved", label: "Approved", help: "Gate passed — ready for customers" },
    { id: "released", label: "Released", help: "Shared with a customer" },
  ];
  const stageOf = (id) => STAGES.find((s) => s.id === id);

  const design = (id) => state.designs.find((d) => d.id === id);
  const person = (id) => state.people[id] || { id, name: id, initials: (id || "?").slice(0, 2).toUpperCase(), role: "" };
  const authorName = (c) => (c.guest ? c.author : person(c.author).name);
  const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const openComments = (d) => d.comments.filter((c) => !c.resolved);
  const unreadCount = (d) => d.comments.filter((c) => c.unread).length;
  const approvalsOf = (d) => d.approvers.filter((a) => a.status === "approved").length;
  const reviewUrl = (d) => `https://${state.config.hosting.reviewHost}/r/${d.slug}`;
  const snapUrl = (d) => `https://${state.config.hosting.snapHost}/${d.slug}/v${d.version}/index.html`;
  const customerUrl = (d) => `https://${state.config.hosting.reviewHost}/c/${d.releaseSlug || d.slug}`;

  const pill = (stage) =>
    `<span class="pill stage-${stage}"><span class="dot" aria-hidden="true"></span>${esc(stageOf(stage).label)}</span>`;

  const avatar = (name, cls) => `<span class="avatar ${cls || ""}" aria-hidden="true">${esc(initialsOf(name))}</span>`;

  const frameHtml = (d, v, extraCls) => {
    const src = DATA.previews[d.preview](v || d.version);
    return `<iframe class="${extraCls || ""}" sandbox="" referrerpolicy="no-referrer" loading="lazy" title="${esc(d.name)} — published snapshot v${v || d.version}" srcdoc="${esc(src)}"></iframe>`;
  };

  function audit(d, who, what) {
    d.audit = [{ at: Date.now(), who, what }, ...d.audit];
  }

  /* ── Router ── */
  function parse() {
    const h = location.hash.replace(/^#\/?/, "");
    const [name, arg, sub] = h.split("/");
    return { name: name || "pipeline", arg: arg ? decodeURIComponent(arg) : null, sub: sub ? decodeURIComponent(sub) : null };
  }
  const go = (hash) => { if (location.hash !== hash) location.hash = hash; else render(); };

  /* ── Shell ── */
  const NAV = [
    { id: "pipeline", label: "Pipeline", icon: "pipeline", href: "#/pipeline" },
    { id: "studio", label: "Studio", icon: "sparkles", href: "#/studio" },
    { id: "projects", label: "Projects", icon: "layers", href: "#/projects" },
    { id: "inbox", label: "Inbox", icon: "inbox", href: "#/inbox" },
    { id: "releases", label: "Releases", icon: "send", href: "#/releases" },
    { id: "admin", label: "Admin", icon: "settings", href: "#/admin/status", group: "Server" },
  ];
  const BOTTOM = ["pipeline", "studio", "projects", "inbox"];
  const activeNav = (r) => (r.name === "design" ? "pipeline" : r.name === "release" ? "releases" : r.name === "settings" ? "admin" : r.name);

  function themeSeg() {
    const p = getThemePref();
    const b = (id, ic, label) =>
      `<button type="button" data-theme-set="${id}" aria-pressed="${p === id}" aria-label="${label} theme" title="${label}">${icon(ic, "icon-sm")}</button>`;
    return `<div class="seg" role="group" aria-label="Theme">${b("system", "monitor", "System")}${b("light", "sun", "Light")}${b("dark", "moon", "Dark")}</div>`;
  }

  function railStatus() {
    const c = state.config;
    const idLabel = { guest: "Guest links", kratos: "KnowMe accounts", both: "Guest links + KnowMe accounts" }[c.identity.mode];
    const lane = { local: "On-device", "remote-user": "Your remote model", cloud: "Commercial cloud" }[c.agents.lane];
    return `<div class="rail-status" aria-label="Hub status">
      <div class="status-line"><span class="dot" aria-hidden="true"></span><div class="od-fill"><div class="mono od-truncate">${esc(c.hosting.reviewHost)}</div><div>Hub reachable (demo)</div></div></div>
      <div class="status-line">${icon("shield", "icon-sm")}<div class="od-fill">${esc(idLabel)}</div></div>
      <div class="status-line"><span class="dot cyan" aria-hidden="true"></span><div class="od-fill"><div>${esc(lane)}</div><div class="mono od-truncate">${esc(c.agents.model)}</div></div></div>
      <a class="status-line" href="#/settings/runtime" style="color:inherit">${icon("server", "icon-sm")}<div class="od-fill"><div>${c.runtime.baseUrl ? "UAR · live" : "UAR · demo stream"}</div><div class="mono od-truncate">${esc(c.runtime.baseUrl ? c.runtime.baseUrl.replace(/^https?:\/\//, "") : "no runtime URL set")}</div></div></a>
      ${themeSeg()}
    </div>`;
  }

  function shell(r, title, crumbs, body, actions) {
    const act = activeNav(r);
    const inbox = state.designs.reduce((n, d) => n + unreadCount(d), 0);
    const item = (n) => `<a class="nav-item" href="${n.href}" ${act === n.id ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}</span>${
        n.id === "inbox" && inbox ? `<span class="count" aria-label="${inbox} unread">${inbox}</span>` : ""
      }</a>`;
    const navItems = `<div class="eyebrow nav-group">Work</div>${NAV.filter((n) => !n.group).map(item).join("")}<div class="eyebrow nav-group">Server</div>${NAV.filter((n) => n.group).map(item).join("")}`;
    const moreActive = !BOTTOM.includes(act);
    const bottom = NAV.filter((n) => BOTTOM.includes(n.id)).map(
      (n) => `<a href="${n.href}" ${act === n.id ? 'aria-current="page"' : ""}>${icon(n.icon)}<span>${n.label}${n.id === "inbox" && inbox ? ` · ${inbox}` : ""}</span></a>`
    ).join("") + `<button type="button" data-more ${moreActive ? 'aria-current="page"' : ""} aria-haspopup="dialog">${icon("layers")}<span>More</span></button>`;
    const p = getThemePref();
    const nextTheme = { system: "light", light: "dark", dark: "system" }[p];
    return `<div class="shell">
      <nav class="rail" aria-label="Primary">
        <a class="brand" href="#/pipeline" aria-label="KnowDesign Review home">${MARK(36)}<div><div class="wordmark">Know<b>Design</b></div><div class="brand-sub">REVIEW HUB</div></div></a>
        <div class="nav">${navItems}</div>
        ${railStatus()}
      </nav>
      <div class="main">
        <header class="topbar">
          <a class="mobile-brand" href="#/pipeline" aria-label="KnowDesign Review home">${MARK(28)}</a>
          <div class="od-fill od-stack" style="--od-gap:2px">
            ${crumbs ? `<div class="crumbs">${crumbs}</div>` : ""}
            <h1 class="od-truncate">${esc(title)}</h1>
          </div>
          <div class="od-row od-fixed">${actions || ""}
            <button class="btn btn-ghost btn-icon mobile-theme" type="button" data-theme-set="${nextTheme}" aria-label="Theme: ${p}. Switch to ${nextTheme}">${icon(p === "dark" ? "moon" : p === "light" ? "sun" : "monitor")}</button>
          </div>
        </header>
        <main class="content" id="content" tabindex="-1"><div class="content-inner">${body}</div></main>
      </div>
      <nav class="bottom-nav" aria-label="Primary">${bottom}</nav>
    </div>`;
  }

  /* ── Pipeline ── */
  function card(d) {
    const open = openComments(d).length;
    const unread = unreadCount(d);
    const appr = approvalsOf(d);
    const live = d.expiresAt ? `Live until ${fmtDate(d.expiresAt)}` : "Not published";
    return `<a class="card" href="#/design/${d.id}">
      <div class="card-thumb" aria-hidden="true">${frameHtml(d)}</div>
      <div class="card-body">
        <div class="card-name">${esc(d.name)}</div>
        <div class="card-meta"><span class="mono od-nowrap">v${d.version}</span><span class="od-nowrap">${esc(live)}</span></div>
        <div class="card-foot">
          <div class="avatar-stack" aria-hidden="true">${d.approvers.map((a) => avatar(person(a.id).name, a.status === "approved" ? "me" : "")).join("")}</div>
          <div class="od-fill od-nowrap">${appr} of ${state.config.approvals.required} approved · ${open} open</div>
          ${unread ? `<span class="unread">${unread} new</span>` : ""}
        </div>
      </div></a>`;
  }

  function pipelinePage(r) {
    const q = state.ui.search.trim().toLowerCase();
    const f = state.ui.stageFilter;
    const visible = state.designs.filter((d) => (!q || d.name.toLowerCase().includes(q)) && (!f || d.stage === f));
    const strip = STAGES.map((s) => {
      const n = state.designs.filter((d) => d.stage === s.id).length;
      return `<button type="button" data-stage-filter="${s.id}" aria-pressed="${f === s.id}"><span class="n">${n}</span><span class="cap">${s.label}</span></button>`;
    }).join("");
    const lanes = STAGES.filter((s) => !f || s.id === f).map((s) => {
      const items = visible.filter((d) => d.stage === s.id);
      return `<section class="lane" aria-labelledby="lane-${s.id}">
        <div class="lane-head">${pill(s.id)}<h2 id="lane-${s.id}" class="sr-only">${s.label}</h2><span class="mono">${items.length}</span></div>
        ${items.length ? items.map(card).join("") : `<div class="lane-empty">${q ? "No designs match your search." : esc(s.help) + "."}</div>`}
      </section>`;
    }).join("");

    const body = `
      <div class="page-head">
        <div class="od-stack" style="--od-gap:6px;flex:1 1 360px">
          <div class="eyebrow">Publish · review · approve · release</div>
          <p class="lede">Designs published from KnowDesign get a review link on <span class="mono">${esc(state.config.hosting.reviewHost)}</span>. Reviewers comment without an account, the gate collects approvals, and approved work goes to customers.</p>
        </div>
        <div class="field" style="flex:0 1 300px">
          <label for="search">Find a design</label>
          <input id="search" class="input" type="search" placeholder="Search by name" value="${esc(state.ui.search)}" autocomplete="off">
        </div>
      </div>
      <div class="summary-strip" role="group" aria-label="Filter by stage">${strip}</div>
      ${f ? `<div class="od-row" style="margin-bottom:12px"><button class="btn btn-ghost" data-stage-filter="${f}">${icon("x", "icon-sm")}Show all stages</button></div>` : ""}
      <div class="board">${lanes}</div>`;
    return shell(r, "Review pipeline", null, body,
      `<button class="btn btn-primary" type="button" data-publish>${icon("upload", "icon-sm")}<span>Publish from KnowDesign</span></button>`);
  }

  /* ── Publish dialog (create or new version) ── */
  async function publishDialog(preId, newVersionOf) {
    const L = state.config.limits;
    const existing = newVersionOf ? design(newVersionOf) : null;
    const drafts = state.designs.filter((d) => d.stage === "draft");
    const options = [
      ...drafts.map((d) => ({ id: d.id, name: d.name, file: d.project })),
      ...state.localProjects.filter((p) => !state.designs.some((d) => d.id === p.id)).map((p) => ({ id: p.id, name: p.name, file: p.file })),
    ];
    const body = existing
      ? `<p class="sub">Publishes <b>v${existing.version + 1}</b> of ${esc(existing.name)} from <span class="mono">${esc(existing.project)}</span>. The review link stays the same; reviewers see the new version next time they open it.</p>
         <div class="field"><label for="pub-notes">What changed <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
           <textarea id="pub-notes" class="textarea" placeholder="One change per line" aria-describedby="pub-notes-err"></textarea>
           <div id="pub-notes-err" class="err" hidden></div></div>
         ${state.config.approvals.resetOnNewVersion ? `<div class="consequence">${icon("info", "icon-sm")} Approvals reset to pending — the approval policy says each version is approved on its own.</div>` : ""}`
      : `<div class="field"><label for="pub-project">KnowDesign project <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
           <select id="pub-project" class="select" aria-describedby="pub-project-err">
             <option value="">Choose a project</option>
             ${options.map((o) => `<option value="${o.id}" ${o.id === preId ? "selected" : ""}>${esc(o.name)} — ${esc(o.file)}</option>`).join("")}
           </select><div id="pub-project-err" class="err" hidden></div></div>
         <div class="field"><label for="pub-exp">Link expires after</label>
           <div class="input-affix"><input id="pub-exp" class="input" type="number" inputmode="numeric" min="1" max="${L.maxExpiryDays}" value="${L.expiryDays}" aria-describedby="pub-exp-help pub-exp-err"><span class="suffix">days</span></div>
           <span id="pub-exp-help" class="help">1–${L.maxExpiryDays} days. You can revoke the link at any time.</span><div id="pub-exp-err" class="err" hidden></div></div>
         <div class="field"><span class="label" id="pub-acc-l">Who can open the link</span>
           <div class="radio-cards" role="radiogroup" aria-labelledby="pub-acc-l">
             <label class="radio-card"><input type="radio" name="pub-acc" value="guest" ${state.config.identity.mode !== "kratos" ? "checked" : ""} ${state.config.identity.mode === "kratos" ? "disabled" : ""}><div class="od-field"><span class="t">Anyone with the link</span><span class="d">Reviewers enter a display name. No account needed.</span></div></label>
             <label class="radio-card"><input type="radio" name="pub-acc" value="kratos" ${state.config.identity.mode === "kratos" ? "checked" : ""}><div class="od-field"><span class="t">Signed-in KnowMe accounts</span><span class="d">Sign-in through Kratos; flint-gate issues the session.</span></div></label>
           </div></div>
         <div class="consequence"><div>The snapshot is uploaded to <span class="mono">${esc(state.config.hosting.snapHost)}</span> (limit ${L.snapshotMb} MB) and served in a sandbox with no access to reviewer cookies.</div></div>`;

    const showErr = (root, id, msg) => {
      const el = root.querySelector(`#${id}-err`), inp = root.querySelector(`#${id}`);
      if (!el) return;
      el.hidden = !msg; el.innerHTML = msg ? `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>` : "";
      inp && inp.setAttribute("aria-invalid", msg ? "true" : "false");
    };
    const validate = (root) => {
      let ok = true;
      if (existing) {
        const v = root.querySelector("#pub-notes").value.trim();
        const m = v.length < 4 ? "Describe what changed so reviewers know what to look at." : "";
        showErr(root, "pub-notes", m); ok = !m;
      } else {
        const p = root.querySelector("#pub-project").value;
        const m1 = p ? "" : "Choose the KnowDesign project to publish.";
        showErr(root, "pub-project", m1);
        const e = Number(root.querySelector("#pub-exp").value);
        const m2 = Number.isInteger(e) && e >= 1 && e <= L.maxExpiryDays ? "" : `Enter a whole number from 1 to ${L.maxExpiryDays}.`;
        showErr(root, "pub-exp", m2);
        ok = !m1 && !m2;
      }
      return ok;
    };

    const res = await dialog({
      title: existing ? "Publish a new version" : "Publish for review",
      body,
      initialFocus: existing ? "#pub-notes" : "#pub-project",
      onMount: ({ root }) => {
        root.querySelectorAll("input,select,textarea").forEach((el) => el.addEventListener("blur", () => validate(root) || null));
      },
      actions: [
        { id: "cancel", label: "Cancel", kind: "btn-ghost" },
        {
          id: "publish", label: existing ? `Publish v${existing.version + 1}` : "Publish and get link", kind: "btn-primary",
          handler: async ({ root }, btn) => {
            if (!validate(root)) { const bad = root.querySelector('[aria-invalid="true"]'); bad && bad.focus(); return false; }
            const done = busy(btn, "Uploading snapshot…");
            await pace(1100);
            done();
            if (existing) {
              const notes = root.querySelector("#pub-notes").value.split("\n").map((s) => s.trim()).filter(Boolean);
              existing.version += 1;
              existing.versions = [{ v: existing.version, at: Date.now(), notes }, ...existing.versions];
              existing.stage = "review";
              if (state.config.approvals.resetOnNewVersion) existing.approvers = existing.approvers.map((a) => ({ id: a.id, status: "pending" }));
              existing.expiresAt = Math.max(existing.expiresAt || 0, Date.now() + state.config.limits.expiryDays * 864e5);
              audit(existing, ME, `Published <b>v${existing.version}</b> for review from KnowDesign`);
              state.ui.lastPublished = existing.id;
            } else {
              const pid = root.querySelector("#pub-project").value;
              const days = Number(root.querySelector("#pub-exp").value);
              let d = design(pid);
              if (!d) {
                const lp = state.localProjects.find((p) => p.id === pid);
                d = {
                  id: pid, name: lp.name, project: lp.file, preview: lp.preview || "company", stage: "draft", version: 1, owner: ME,
                  approvers: [{ id: ME, status: "pending" }, { id: "priya", status: "pending" }],
                  versions: [{ v: 1, at: Date.now(), notes: ["First published snapshot"] }], comments: [], audit: [],
                };
                state.designs = [d, ...state.designs];
              }
              d.slug = `${pid.slice(0, 2)}-${slug()}`;
              d.stage = "review";
              d.publishedAt = Date.now();
              d.expiresAt = Date.now() + days * 864e5;
              d.access = root.querySelector('input[name="pub-acc"]:checked').value;
              audit(d, ME, `Published <b>v${d.version}</b> for review · link expires in ${days} days`);
              state.ui.lastPublished = d.id;
            }
          },
        },
      ],
    });
    if (res === "publish") {
      const id = state.ui.lastPublished;
      toast("Published. The review link is ready to share.");
      go(`#/design/${id}`);
    }
  }

  /* Inbox and Releases live in lists.js */
  const inboxPage = (r) => window.KD_LISTS.inbox(r);
  const releasesPage = (r) => window.KD_LISTS.releases(r);

  /* ── Render ── */
  let lastRoute = "";
  function render() {
    const r = parse();
    const app = document.getElementById("app");
    const key = r.name + "/" + (r.arg || "");
    const prevContent = document.getElementById("content");
    if (prevContent && lastRoute) state.ui.scroll[lastRoute] = prevContent.scrollTop;

    let html;
    if (r.name === "r") html = window.KD_GUEST.page(r.arg);
    else if (r.name === "c") html = window.KD_LISTS.customer(r.arg);
    else if (r.name === "design" && design(r.arg)) html = window.KD_ROOM.page(r, design(r.arg));
    else if (r.name === "release" && design(r.arg)) html = window.KD_RELEASE.page(r, design(r.arg));
    else if (r.name === "settings") html = window.KD_SETTINGS.page(r, r.arg || "identity");
    else if (r.name === "inbox") html = inboxPage(r);
    else if (r.name === "studio") html = window.KD_STUDIO.page(r, r.arg);
    else if (r.name === "admin") html = window.KD_ADMIN.page(r, r.arg || "status", r.sub);
    else if (r.name === "projects") html = window.KD_PROJECTS.page(r, r.arg);
    else if (r.name === "releases") html = releasesPage(r);
    else html = pipelinePage({ name: "pipeline" });

    app.innerHTML = html;
    const c = document.getElementById("content");
    if (c) c.scrollTop = key === lastRoute ? state.ui.scroll[key] || 0 : state.ui.scroll[key] || 0;
    if (key !== lastRoute) window.scrollTo(0, 0);
    lastRoute = key;
    document.title = (document.querySelector(".topbar h1, .guest-title, .welcome h1") || {}).textContent + " · KnowDesign Review";
    if (r.name === "design") window.KD_ROOM.mount(design(r.arg));
    if (r.name === "release") window.KD_RELEASE.mount(design(r.arg));
    if (r.name === "settings") window.KD_SETTINGS.mount(r.arg || "identity");
    if (r.name === "r") window.KD_GUEST.mount(r.arg);
    if (r.name === "studio") window.KD_STUDIO.mount(r.arg);
  }

  /* ── Global events ── */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-more]")) {
      dialog({ title: "More", body: `<p class="sub">Everything else in KnowDesign.</p>`,
        actions: [{ id: "cancel", label: "Close", kind: "btn-ghost" }, { id: "releases", label: "Releases" }, { id: "admin", label: "Admin" }] })
        .then((v) => { if (v === "releases") go("#/releases"); if (v === "admin") go("#/admin/status"); });
      return;
    }
    const t = e.target.closest("[data-theme-set],[data-stage-filter],[data-publish],[data-copy],[data-mark-all],[data-open-comment],[data-new-version]");
    if (!t) return;
    if (t.dataset.themeSet) { setThemePref(t.dataset.themeSet); render(); return; }
    if (t.dataset.stageFilter) { state.ui.stageFilter = state.ui.stageFilter === t.dataset.stageFilter ? null : t.dataset.stageFilter; render(); return; }
    if (t.hasAttribute("data-publish")) { publishDialog(t.dataset.publish || null); return; }
    if (t.hasAttribute("data-new-version")) { publishDialog(null, t.dataset.newVersion); return; }
    if (t.dataset.copy) { copyText(t.dataset.copy); return; }
    if (t.hasAttribute("data-mark-all")) { state.designs.forEach((d) => d.comments.forEach((c) => (c.unread = false))); render(); toast("All comments marked read"); return; }
    if (t.dataset.openComment) {
      const [did, cid] = t.dataset.openComment.split(":");
      state.ui.room[did] = Object.assign(state.ui.room[did] || {}, { tab: "comments", active: cid });
    }
  });
  let searchTimer = 0;
  document.addEventListener("input", (e) => {
    if (e.target.id === "search") {
      state.ui.search = e.target.value;
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        const s0 = document.getElementById("search");
        const pos = s0 ? s0.selectionStart : 0;
        render();
        const s = document.getElementById("search");
        if (s) { s.focus(); s.setSelectionRange(pos, pos); }
      }, 250);
    }
  });

  window.KD = { state, ME, STAGES, design, person, authorName, initialsOf, openComments, unreadCount, approvalsOf, reviewUrl, snapUrl, customerUrl, pill, avatar, frameHtml, audit, shell, go, render, publishDialog };

  window.addEventListener("hashchange", render);
  window.addEventListener("DOMContentLoaded", () => { applyTheme(); render(); });
})();
