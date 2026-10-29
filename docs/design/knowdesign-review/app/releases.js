/* KnowDesign Review — Releases: customer link records, release detail, and the customer view.
   Routes: #/releases · #/releases/:id · #/c/:slug (customer, outside the app shell)
   Hub (proposed): POST /v1/publications/:id/releases · PATCH/DELETE /v1/releases/:id · GET /c/:slug */
(function () {
  "use strict";
  const { icon, MARK, esc, fmtDate, fmtTime, fmtAgo, fmtIn, toast, dialog, busy, pace, slug: mkSlug, getThemePref } = window.KD_UI;
  const K = () => window.KD;
  const D = 864e5;
  const ui = () => { const st = K().state.ui; st.rel = st.rel || { filter: "live", tries: {} }; return st.rel; };
  const customer = (id) => K().state.customers.find((c) => c.id === id) || { name: "Customer", workspace: "", contacts: 0, note: "" };
  const urlOf = (r) => `https://${K().state.config.hosting.reviewHost}/c/${r.slug}`;

  function records() {
    const st = K().state;
    if (st.releaseRecords) return st.releaseRecords;
    const now = Date.now();
    const bench = K().design("build-your-bench");
    if (bench) bench.releaseSlug = bench.releaseSlug || "c-Bb7xK2mQ9vL4nT8wPd3a";
    const ev = (ago, kind, who, text) => ({ at: now - ago, kind, who, text });
    st.releaseRecords = [
      { id: "rel-bench-northwind", designId: "build-your-bench", customer: "northwind", version: 4, slug: "c-Bb7xK2mQ9vL4nT8wPd3a", createdAt: now - 9 * D, expiresAt: bench ? bench.expiresAt : now + 75 * D, passcode: "bench-2026", watermark: true, comments: true, status: "live", by: "travis",
        notes: "Build your bench — version 4\n\nWhat's in this version:\n• Four starter roles\n• Secondary action is plain, not outlined\n\nThis is a design preview, not working software. Comments you leave go straight to the KnowDesign team.",
        events: [ev(2 * 3600e3, "view", "Clinic lead"), ev(26 * 3600e3, "comment", "Clinic lead", "Can the Scribe role mention it never sends notes on its own?"), ev(3 * D, "view", "Operations manager"), ev(8 * D, "view", "Clinic lead")] },
      { id: "rel-bench-prom", designId: "build-your-bench", customer: "prometheus", version: 3, slug: "c-Pr4mT9xQ2wL7nV5kJ8sd", createdAt: now - 20 * D, expiresAt: now + 40 * D, passcode: null, watermark: false, comments: false, status: "live", by: "priya",
        notes: "Build your bench — version 3 for partner review.", events: [ev(5 * D, "view", "Partner team")] },
      { id: "rel-chat-northwind", designId: "patient-chat", customer: "northwind", version: 1, slug: "c-Ex9pR3dT6yU1iO4pA7sd", createdAt: now - 38 * D, expiresAt: now - 8 * D, passcode: "chat-pilot", watermark: true, comments: true, status: "live", by: "travis",
        notes: "Patient Chat storyboard — first look.", events: [ev(30 * D, "view", "Care coordinator")] },
      { id: "rel-policy-prom", designId: "global-policy", customer: "prometheus", version: 1, slug: "c-Rv2kL8mN5bV1cX7zQ3wx", createdAt: now - 12 * D, expiresAt: now + 18 * D, passcode: null, watermark: true, comments: true, status: "revoked", revokedAt: now - 7 * D, by: "sam",
        notes: "KnowMe desktop — Global policy v1.", events: [ev(10 * D, "view", "Partner team")] },
    ];
    return st.releaseRecords;
  }
  const stateOf = (r) => (r.status === "revoked" ? "revoked" : r.expiresAt < Date.now() ? "expired" : "live");
  const statePill = (r) => {
    const s = stateOf(r);
    return s === "live" ? `<span class="pill stage-approved">${icon("check", "icon-sm")}Live</span>` : s === "expired" ? `<span class="pill stage-draft">${icon("history", "icon-sm")}Expired</span>` : `<span class="pill stage-released">${icon("x", "icon-sm")}Revoked</span>`;
  };
  const byId = (id) => records().find((r) => r.id === id);
  const bySlug = (s) => records().find((r) => r.slug === s);

  /* Called by release.js when a new release is confirmed. */
  function add(d, f, c) {
    const r = { id: "rel-" + mkSlug().slice(0, 8).toLowerCase(), designId: d.id, customer: c.id, version: d.version, slug: d.releaseSlug, createdAt: Date.now(), expiresAt: d.expiresAt,
      passcode: f.passcodeOn ? f.passcode : null, watermark: f.watermark, comments: f.comments, status: "live", by: K().ME, notes: f.notes, events: [] };
    K().state.releaseRecords = [r, ...records()];
    return r;
  }

  /* ── List ── */
  function listPage(r) {
    const st = K().state, u = ui();
    const ready = st.designs.filter((d) => d.stage === "approved");
    const readyRows = ready.map((d) => `<a class="list-row" href="#/release/${d.id}">
        <div class="od-stack od-fill"><span class="t">${esc(d.name)}</span><span class="d">v${d.version} · ${K().approvalsOf(d)} of ${st.config.approvals.required} approvals${d.lastReleasedTo ? ` · link for ${esc(customer(d.lastReleasedTo).name)} was revoked` : ""}</span></div>
        <span class="btn btn-primary od-fixed">Release</span></a>`).join("");
    const all = records();
    const cnt = (s) => all.filter((x) => s === "all" || stateOf(x) === s).length;
    const seg = [["live", "Live"], ["expired", "Expired"], ["revoked", "Revoked"], ["all", "All"]].map(([v, l]) => `<button type="button" data-rel-filter="${v}" aria-pressed="${u.filter === v}">${l} · ${cnt(v)}</button>`).join("");
    const shown = all.filter((x) => u.filter === "all" || stateOf(x) === u.filter);
    const groups = st.customers.map((c) => {
      const mine = shown.filter((x) => x.customer === c.id).sort((a, b) => b.createdAt - a.createdAt);
      if (!mine.length) return "";
      return `<section class="panel od-stack" style="--od-gap:12px" aria-labelledby="cust-${c.id}">
        <div class="od-row"><div class="od-stack od-fill" style="--od-gap:2px"><h3 id="cust-${c.id}" class="section-title">${esc(c.name)}</h3><span class="sub" style="font-size:13px">${esc(c.note)} · ${c.contacts} contacts · <span class="mono">${esc(c.workspace)}</span></span></div></div>
        ${mine.map((x) => { const d = K().design(x.designId); return `<a class="rel-row rel-link" href="#/releases/${x.id}">
          <div class="od-stack od-fill" style="--od-gap:2px"><span class="t">${esc(d ? d.name : x.designId)} · v${x.version}</span>
            <span class="d">${stateOf(x) === "revoked" ? `Revoked ${fmtDate(x.revokedAt)}` : stateOf(x) === "expired" ? `Expired ${fmtDate(x.expiresAt)}` : `Expires <span class="od-nowrap">${fmtDate(x.expiresAt)}</span> (${fmtIn(x.expiresAt)})`} · ${x.events.filter((e) => e.kind === "view").length} views${x.passcode ? " · passcode" : ""}</span></div>
          <div class="od-cluster od-fixed">${statePill(x)}${icon("chevron", "icon-sm")}</div></a>`; }).join("")}
      </section>`;
    }).join("");
    const empty = `<div class="empty">${icon("send")}<h3>${u.filter === "live" ? "No live customer links" : u.filter === "expired" ? "No expired links" : u.filter === "revoked" ? "Nothing revoked" : "No releases yet"}</h3><p>${u.filter === "live" ? "Release an approved design to give a customer a link." : "Links show up here when they reach this state."}</p></div>`;
    const body = `
      <section class="od-stack" style="--od-gap:12px;margin:8px 0 32px" aria-labelledby="ready-h">
        <h2 id="ready-h" class="section-title">Ready to release</h2>
        ${readyRows ? `<div class="list">${readyRows}</div>` : `<div class="empty">${icon("gate")}<h3>Nothing approved yet</h3><p>A design shows up here once it passes the approval gate.</p><a class="btn" href="#/pipeline">Go to the pipeline</a></div>`}
      </section>
      <section class="od-stack" style="--od-gap:12px" aria-labelledby="rel-h">
        <div class="od-row" style="flex-wrap:wrap"><h2 id="rel-h" class="section-title od-fill">Customer links</h2><div class="seg" role="group" aria-label="Filter customer links">${seg}</div></div>
        ${groups ? `<div class="rel-grid">${groups}</div>` : empty}
      </section>`;
    return K().shell(r, "Releases", null, body, "");
  }

  /* ── Detail ── */
  function timeline(x) {
    const life = [{ at: x.createdAt, kind: "created", who: K().person(x.by).name }, ...(x.extendedAt ? [{ at: x.extendedAt, kind: "extended", who: K().person(K().ME).name }] : []), ...(x.revokedAt ? [{ at: x.revokedAt, kind: "revoked", who: K().person(x.revokedBy || x.by).name }] : [])];
    const items = [...x.events, ...life].sort((a, b) => b.at - a.at);
    const label = { view: ["Opened the link", "external"], comment: ["Commented", "message"], created: ["Released", "send"], extended: ["Extended the link", "history"], revoked: ["Revoked the link", "x"] };
    return `<ol class="rel-tl">${items.map((e) => `<li><span class="rel-tl-ic" aria-hidden="true">${icon(label[e.kind][1], "icon-sm")}</span><div class="od-stack od-fill" style="--od-gap:2px"><span class="t">${esc(e.who)} · ${label[e.kind][0]}</span>${e.text ? `<span class="d">“${esc(e.text)}”</span>` : ""}</div><span class="when od-nowrap">${fmtDate(e.at)} ${fmtTime(e.at)}</span></li>`).join("")}</ol>`;
  }
  function detailPage(r, id) {
    const x = byId(id);
    if (!x) return K().shell(r, "Release not found", `<a href="#/releases">Releases</a>`, `<div class="empty" style="margin-top:16px">${icon("search")}<h3>This release doesn't exist</h3><p>It may have been deleted with its project.</p><a class="btn" href="#/releases">Back to Releases</a></div>`, "");
    const d = K().design(x.designId), c = customer(x.customer), s = stateOf(x);
    const actions = s === "live"
      ? `<button class="btn" data-rel-act="extend" data-id="${x.id}">${icon("history", "icon-sm")}Extend</button><button class="btn btn-danger" data-rel-act="revoke" data-id="${x.id}">${icon("trash", "icon-sm")}Revoke</button>`
      : `<button class="btn btn-primary" data-rel-act="again" data-id="${x.id}">${icon("send", "icon-sm")}Release again</button>`;
    const body = `<div class="release-grid">
      <div class="od-stack" style="--od-gap:16px">
        ${s !== "live" ? `<div class="blocked-panel" style="padding:16px;gap:6px"><b>${s === "expired" ? `This link expired on ${fmtDate(x.expiresAt)}` : `This link was revoked on ${fmtDate(x.revokedAt)}`}</b><span style="font-size:14px">${esc(c.name)} sees a “link doesn't work” page. Release again to give them a new link.</span></div>` : ""}
        <section class="panel od-stack" style="--od-gap:12px" aria-labelledby="rd-link"><h2 id="rd-link" class="section-title">Customer link</h2>
          <div class="link-box"><span class="od-truncate">${esc(urlOf(x))}</span><button class="btn" data-copy="${esc(urlOf(x))}">${icon("copy", "icon-sm")}Copy</button></div>
          <div class="od-cluster"><a class="btn" href="#/c/${esc(x.slug)}" target="_blank" rel="noopener">${icon("external", "icon-sm")}Open as customer</a><span class="od-fill"></span>${actions}</div>
          <dl class="kv"><dt>Customer</dt><dd>${esc(c.name)} · ${c.contacts} contacts</dd><dt>Design</dt><dd>${esc(d ? d.name : x.designId)} · v${x.version}</dd><dt>Released by</dt><dd>${esc(K().person(x.by).name)} · ${fmtDate(x.createdAt)}</dd><dt>Expires</dt><dd>${fmtDate(x.expiresAt)}${s === "live" ? ` (${fmtIn(x.expiresAt)})` : ""}</dd>
            <dt>Passcode</dt><dd>${x.passcode ? "Required — sent separately, not shown here" : "None — anyone with the link can open it"}</dd><dt>Watermark</dt><dd>${x.watermark ? `On · “${esc(c.name)}”` : "Off"}</dd><dt>Comments</dt><dd>${x.comments ? "Allowed — they arrive in your Inbox" : "Off"}</dd></dl>
          <span class="mono sub">PATCH /v1/releases/${esc(x.id)} · DELETE /v1/releases/${esc(x.id)} (proposed hub API)</span></section>
        <section class="panel od-stack" style="--od-gap:8px" aria-labelledby="rd-tl"><h2 id="rd-tl" class="section-title">Activity</h2><p class="sub" style="font-size:13px">Views and comments are simulated in this prototype.</p>${timeline(x)}</section>
      </div>
      <aside class="od-stack" style="--od-gap:16px">
        <div class="panel panel-tight od-stack" style="--od-gap:12px"><div class="eyebrow">What ${esc(c.name)} sees</div><div class="card-thumb" style="border-radius:12px" aria-hidden="true">${d ? K().frameHtml(d, x.version) : ""}</div></div>
        <div class="panel panel-tight od-stack" style="--od-gap:8px"><div class="eyebrow">Release notes</div><p style="white-space:pre-wrap;font-size:15px">${esc(x.notes || "")}</p></div>
      </aside></div>`;
    return K().shell(r, `${d ? d.name : "Release"} → ${c.name}`, `<a href="#/releases">Releases</a>${icon("chevron", "icon-sm")}<span class="mono">${esc(x.id)}</span>`, body, statePill(x));
  }

  function page(r) { return r.arg ? detailPage(r, r.arg) : listPage(r); }

  /* ── Customer view ── */
  const unlockKey = (s) => `kd-c-unlock-${s}`;
  function themeButton() {
    const p = getThemePref(), next = { system: "light", light: "dark", dark: "system" }[p];
    return `<button class="btn btn-ghost btn-icon" type="button" data-theme-set="${next}" aria-label="Theme: ${p}. Switch to ${next}">${icon(p === "dark" ? "moon" : p === "light" ? "sun" : "monitor")}</button>`;
  }
  function custTop(x, d, c) {
    return `<header class="guest-top"><span class="brand" style="padding:0">${MARK(32)}<span class="wordmark" style="font-size:17px">Know<b>Design</b></span></span>
      <div class="od-fill od-stack" style="--od-gap:0">${x && d ? `<span class="guest-title od-truncate">${esc(d.name)}</span><span class="sub" style="font-size:13px">Shared with ${esc(c.name)} · version ${x.version} · available until ${fmtDate(x.expiresAt)}</span>` : ""}</div>${themeButton()}</header>`;
  }
  function customerView(slugArg) {
    const x = bySlug(slugArg);
    const d = x && K().design(x.designId), c = x ? customer_(x.customer) : null;
    const dead = (title, msg) => `<div class="guest-shell">${custTop(null)}<main id="content"><div class="expired">${icon("link")}<h1 style="font-size:24px">${title}</h1><p class="sub">${msg}</p></div></main></div>`;
    if (!x || !d) return dead("This link doesn't work", "The address may be incomplete. Ask the person who sent it for a new one.");
    const s = stateOf(x);
    if (s === "revoked") return dead("This link was turned off", `The KnowMe team stopped sharing this design with ${esc(c.name)}. Ask them if you need it again.`);
    if (s === "expired") return dead("This link has expired", `It was available until ${fmtDate(x.expiresAt)}. Ask the KnowMe team for a new link.`);
    if (x.passcode && !sessionStorage.getItem(unlockKey(x.slug))) {
      const u = ui(), t = u.tries[x.slug] || 0, locked = t >= 5;
      return `<div class="guest-shell">${custTop(x, d, c)}<main id="content"><form class="welcome" id="cust-pass" novalidate>
        <div class="eyebrow">Private preview</div><h1>Enter the passcode</h1>
        <p class="sub">${esc(c.name)}'s preview of <b>${esc(d.name)}</b> is protected. The passcode came in a separate message from the KnowMe team.</p>
        <div class="field"><label for="cust-code">Passcode</label><input id="cust-code" class="input" type="password" autocomplete="off" ${locked ? "disabled" : ""} aria-invalid="${t > 0}" aria-describedby="cust-code-err">
          <div class="err" id="cust-code-err" ${t > 0 ? "" : "hidden"}>${t > 0 ? `${icon("alert", "icon-sm")}<span>${locked ? "Too many tries. Wait a minute, then try again." : `That passcode isn't right. Check the message it came in (${5 - t} ${5 - t === 1 ? "try" : "tries"} left).`}</span>` : ""}</div></div>
        <button type="submit" class="btn btn-primary btn-lg" ${locked ? "disabled" : ""}>Open preview</button>
        <div class="note">${icon("lock", "icon-sm")}<span>Only people in ${esc(c.name)} should have this link.</span></div></form></main></div>`;
    }
    const mine = d.comments.filter((cm) => cm.relId === x.id);
    const wm = x.watermark ? `<div class="wm" aria-hidden="true">${Array.from({ length: 12 }, () => `<span>${esc(c.name)} · confidential</span>`).join("")}</div>` : "";
    const comments = x.comments
      ? `<form class="od-stack" style="--od-gap:8px" id="cust-cm" novalidate>
          <div class="field"><label for="cust-name">Your name <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="cust-name" class="input" maxlength="60" autocomplete="name" value="${esc(sessionStorage.getItem("kd-c-name") || "")}" aria-describedby="cust-name-err"><div class="err" id="cust-name-err" hidden></div></div>
          <div class="field"><label for="cust-text">Comment <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><textarea id="cust-text" class="textarea" maxlength="${K().state.config.limits.commentChars}" placeholder="What works, what doesn't?" aria-describedby="cust-text-err"></textarea><div class="err" id="cust-text-err" hidden></div></div>
          <button type="submit" class="btn btn-primary" id="cust-send">${icon("send", "icon-sm")}Send to the KnowMe team</button></form>
        ${mine.length ? `<div class="od-stack" style="--od-gap:8px">${mine.map((cm) => `<article class="thread"><div class="thread-head">${K().avatar(cm.author, "guest")}<div class="od-stack"><span class="who">${esc(cm.author.replace(/ \(.*\)$/, ""))}</span><span class="when">${fmtAgo(cm.ts)}</span></div></div><div class="thread-text">${esc(cm.text)}</div></article>`).join("")}</div>` : ""}`
      : `<p class="sub" style="font-size:14px">Comments are turned off for this preview. Reply to the KnowMe team directly if you have feedback.</p>`;
    return `<div class="guest-shell">${custTop(x, d, c)}<main class="guest-main" id="content">
      <section class="stage-wrap" aria-label="Design preview"><div class="frame">${K().frameHtml(d, x.version)}${wm}</div>
        <p class="sub" style="font-size:13px;padding:0 4px">This is a design preview, not working software.</p></section>
      <aside class="side" aria-label="Release notes and comments" style="min-height:0"><div class="side-head"><h2 class="section-title">About this version</h2></div>
        <div class="side-body"><p style="white-space:pre-wrap;font-size:15px">${esc(x.notes || "")}</p><div class="group od-stack" style="--od-gap:12px"><h3 class="group-title">Comments</h3>${comments}</div></div></aside>
    </main></div>`;
  }
  const customer_ = (id) => K().state.customers.find((c) => c.id === id) || { name: "Customer", contacts: 0 };

  /* ── Actions ── */
  async function extend(x) {
    const max = K().state.config.limits.maxExpiryDays, cap = Date.now() + max * D;
    const opts = [7, 30, 60].map((n) => ({ n, at: Math.min(x.expiresAt + n * D, cap) })).filter((o, i, a) => o.at > x.expiresAt && (i === 0 || o.at !== a[i - 1].at));
    if (!opts.length) { toast(`This link already runs to the ${max}-day limit.`, "error"); return; }
    const res = await dialog({
      title: "Extend the customer link",
      body: `<p>Expires ${fmtDate(x.expiresAt)} now. Links can't run longer than ${max} days from today.</p><div class="radio-cards" role="radiogroup" aria-label="New expiry">${opts.map((o, i) => `<label class="radio-card"><input type="radio" name="ext" value="${o.at}" ${i === Math.min(1, opts.length - 1) ? "checked" : ""}><div class="od-field"><span class="t">Until ${fmtDate(o.at)}</span><span class="d">${o.at === cap ? "The longest allowed" : `${o.n} more days`}</span></div></label>`).join("")}</div>`,
      actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Extend link", kind: "btn-primary", handler: ({ root }) => { x.__ext = Number(root.querySelector('input[name="ext"]:checked').value); } }],
    });
    if (res !== "ok") return;
    x.expiresAt = x.__ext; x.extendedAt = Date.now(); delete x.__ext;
    const d = K().design(x.designId); if (d && d.releaseSlug === x.slug) d.expiresAt = x.expiresAt;
    if (d) K().audit(d, K().ME, `Extended the customer link for <b>${esc(customer_(x.customer).name)}</b> until ${fmtDate(x.expiresAt)}`);
    toast("Link extended"); K().render();
  }
  async function revoke(x) {
    const c = customer_(x.customer);
    const res = await dialog({
      title: `Revoke the link for ${c.name}?`,
      body: `<div class="consequence"><ul><li>${c.contacts} people lose access right away and see “this link was turned off”.</li><li>Their comments stay in your Inbox.</li><li>You can release again with a new link.</li></ul></div>`,
      actions: [{ id: "cancel", label: "Keep the link", kind: "btn-ghost" }, { id: "ok", label: "Revoke link", kind: "btn-danger", handler: async (_, b) => { const done = busy(b, "Revoking…"); await pace(600); done(); } }],
    });
    if (res !== "ok") return;
    x.status = "revoked"; x.revokedAt = Date.now(); x.revokedBy = K().ME;
    const d = K().design(x.designId);
    if (d) {
      K().audit(d, K().ME, `Revoked the customer link for <b>${esc(c.name)}</b>`);
      if (d.releaseSlug === x.slug && d.stage === "released") { d.lastReleasedTo = d.releasedTo; d.stage = "approved"; d.releaseSlug = null; d.releasedTo = null; }
    }
    toast(`Link for ${c.name} revoked`); K().render();
  }
  async function again(x) {
    const max = K().state.config.limits.maxExpiryDays, c = customer_(x.customer), d = K().design(x.designId);
    const res = await dialog({
      title: `Release ${d ? d.name : "this design"} to ${c.name} again`,
      body: `<p>Creates a new link with the same settings. The old link stays ${stateOf(x)}.</p>
        <div class="field"><label for="ag-exp">Link expires after</label><select id="ag-exp" class="select">${[7, 30, 60, 90].filter((n) => n <= max).map((n) => `<option value="${n}" ${n === 30 ? "selected" : ""}>${n} days — ${fmtDate(Date.now() + n * D)}</option>`).join("")}</select></div>
        <div class="consequence">${x.passcode ? "The same passcode is required. Send it again separately." : "No passcode — anyone with the link can open it."}</div>`,
      actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Release again", kind: "btn-primary", handler: async ({ root }, b) => { x.__days = Number(root.querySelector("#ag-exp").value); const done = busy(b, "Releasing…"); await pace(800); done(); } }],
    });
    if (res !== "ok") return;
    const n = { ...JSON.parse(JSON.stringify(x)), id: "rel-" + mkSlug().slice(0, 8).toLowerCase(), slug: "c-" + mkSlug(), createdAt: Date.now(), expiresAt: Date.now() + x.__days * D, status: "live", by: K().ME, events: [], revokedAt: null, revokedBy: null, extendedAt: null };
    delete x.__days; delete n.__days;
    K().state.releaseRecords = [n, ...records()];
    if (d) K().audit(d, K().ME, `Released v${n.version} to <b>${esc(c.name)}</b> again · link expires in ${Math.round((n.expiresAt - Date.now()) / D)} days`);
    toast(`New link for ${c.name} is live`);
    location.hash = `#/releases/${n.id}`;
  }

  /* ── Events ── */
  document.addEventListener("click", (e) => {
    let el;
    if ((el = e.target.closest("[data-rel-filter]"))) { ui().filter = el.dataset.relFilter; K().render(); const b = document.querySelector(`[data-rel-filter="${ui().filter}"]`); b && b.focus(); return; }
    if ((el = e.target.closest("[data-rel-act]"))) { const x = byId(el.dataset.id); if (!x) return; ({ extend, revoke, again })[el.dataset.relAct](x); }
  });
  document.addEventListener("submit", async (e) => {
    const m = location.hash.match(/^#\/c\/([^/]+)/); if (!m) return;
    const x = bySlug(decodeURIComponent(m[1])); if (!x) return;
    if (e.target.id === "cust-pass") {
      e.preventDefault();
      const v = document.getElementById("cust-code").value;
      if (v === x.passcode) { sessionStorage.setItem(unlockKey(x.slug), "1"); x.events = [{ at: Date.now(), kind: "view", who: "Customer (you)" }, ...x.events]; K().render(); }
      else { const u = ui(); u.tries[x.slug] = (u.tries[x.slug] || 0) + 1; K().render(); const i = document.getElementById("cust-code"); i && !i.disabled && i.focus(); }
      return;
    }
    if (e.target.id === "cust-cm") {
      e.preventDefault();
      const n = document.getElementById("cust-name"), t = document.getElementById("cust-text");
      const show = (el, id, msg) => { const er = document.getElementById(id); er.hidden = !msg; er.innerHTML = msg ? `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>` : ""; el.setAttribute("aria-invalid", !!msg); if (msg) el.focus(); return !msg; };
      if (!show(n, "cust-name-err", n.value.trim().length < 2 ? "Enter your name so the team knows who wrote this." : "")) return;
      const max = K().state.config.limits.commentChars;
      if (!show(t, "cust-text-err", !t.value.trim() ? "Write your comment first." : t.value.length > max ? `Keep it under ${max} characters.` : "")) return;
      const done = busy(document.getElementById("cust-send"), "Sending…"); await pace(700); done();
      const c = customer_(x.customer), d = K().design(x.designId), name = n.value.trim();
      sessionStorage.setItem("kd-c-name", name);
      d.comments = [...d.comments, { id: "cc" + Date.now().toString(36), relId: x.id, author: `${name} (${c.name})`, guest: true, x: 50, y: 50, anchor: "customer link", text: t.value.trim(), ts: Date.now(), resolved: false, replies: [], unread: true }];
      x.events = [{ at: Date.now(), kind: "comment", who: name, text: t.value.trim() }, ...x.events];
      K().render(); toast("Sent. The KnowMe team will see it in their inbox.");
    }
  });

  records(); // seed now so design.releaseSlug is set before any screen reads it
  window.KD_RELEASES = { page, customer: customerView, add, records };
})();
