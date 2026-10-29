/* KnowDesign Review — Projects: the client view and project management for a compliant server.
   GET/POST /api/projects · GET/PATCH/DELETE /api/projects/:id · /files · /export/* · /deploy
   Routes: #/projects · #/projects/archived · #/projects/new · #/projects/:id/:tab */
(function () {
  "use strict";
  const { icon, esc, fmtAgo, fmtDate, toast, busy, pace, copyText, dialog } = window.KD_UI;
  const K = () => window.KD;
  const AD = () => window.KD_ADMIN.data();
  const ui = () => { const st = K().state.ui; st.projects = st.projects || { ws: "", q: "", file: {}, menu: null, newForm: null, settings: {} }; return st.projects; };
  const design = (id) => K().design(id);
  const person = (id) => K().person(id);
  const TABS = [["files", "Files"], ["runs", "Runs"], ["comments", "Comments"], ["share", "Share and deploy"], ["settings", "Settings"], ["access", "Access"]];

  /* Real scenario plugins from plugins/_official/scenarios. */
  const TEMPLATES = [
    { id: "od-new-generation", name: "New design from a brief", d: "Start from a written brief; the agent plans and builds the first version." },
    { id: "od-design-refine", name: "Refine an existing design", d: "Bring a design in and iterate on layout, type and color." },
    { id: "od-figma-migration", name: "Figma migration", d: "Turn Figma frames into editable HTML." },
    { id: "od-code-migration", name: "Code migration", d: "Rebuild an existing page or component as a design project." },
    { id: "od-media-generation", name: "Media generation", d: "Images, short video and audio assets for a campaign." },
    { id: "od-nextjs-export", name: "Next.js export", d: "Design that ships as a Next.js app." },
  ];

  /* Fill in management fields the first time a project is touched. */
  function list() {
    const a = AD();
    if (!a.__pjInit) {
      a.__pjInit = true;
      a.teamProjects = a.teamProjects.map((p) => ({
        description: "", designSystem: "knowme", agent: "uar", model: "claude-sonnet-5-5", archived: false,
        access: { link: true, people: [{ id: p.owner, role: "owner" }, ...a.members.filter((m) => m.id !== p.owner).slice(0, 2).map((m) => ({ id: m.id, role: "edit" }))], invites: [] },
        ...p,
      }));
      a.teamProjects.push({ id: "northwind-intake", name: "Northwind pilot — clinic intake", workspace: "northwind", owner: "dana", files: 12, updatedAt: Date.now() - 5 * 864e5, restricted: true, archived: false, description: "", designSystem: "knowme", agent: "uar", model: "claude-sonnet-5-5", access: { link: false, people: [{ id: "dana", role: "owner" }], invites: [] } });
      a.teamProjects.push({ id: "knowme-moodboard", name: "KnowMe moodboard & journeys", workspace: "knowme", owner: "travis", files: 18, updatedAt: Date.now() - 40 * 864e5, archived: true, description: "Early direction work, superseded by the UI standard.", designSystem: "knowme", agent: "claude", model: "claude-sonnet-5-5", access: { link: true, people: [{ id: "travis", role: "owner" }], invites: [] } });
    }
    return a.teamProjects;
  }
  const project = (id) => list().find((p) => p.id === id);
  const wsName = (id) => (AD().workspaces.find((w) => w.id === id) || { name: id }).name;
  const FILES = {
    default: [["index.html", 18], ["styles/tokens.css", 4], ["styles/app.css", 9], ["assets/knowme-mark.svg", 2], ["DESIGN.md", 3]],
    "consult-capture": [["index.html", 24], ["consult-capture-htmx.html", 31], ["screens/consult-history.html", 6], ["styles/tokens.css", 4], ["assets/consent-icon.svg", 1]],
  };
  const filesOf = (id) => FILES[id] || FILES.default;

  /* ── Shared bits ── */
  function menuHtml(p, where) {
    const u = ui();
    const open = u.menu === `${where}:${p.id}`;
    const items = p.archived
      ? [["restore", "Restore", "refresh"], ["delete", "Delete…", "trash"]]
      : [["rename", "Rename…", "message"], ["duplicate", "Duplicate", "copy"], ["move", "Move to workspace…", "layers"], ["archive", "Archive…", "history"], ["delete", "Delete…", "trash"]];
    return `<div class="pj-menu">
      <button type="button" class="btn btn-icon" aria-haspopup="menu" aria-expanded="${open}" aria-label="Actions for ${esc(p.name)}" data-pj-menu="${where}:${p.id}">${icon("more")}</button>
      ${open ? `<div class="pj-pop" role="menu" aria-label="Actions for ${esc(p.name)}">${items.map(([a, l, ic]) => `<button type="button" role="menuitem" class="${a === "delete" ? "danger" : ""}" data-pj-act="${a}" data-id="${p.id}">${icon(ic, "icon-sm")}${l}</button>`).join("")}</div>` : ""}
    </div>`;
  }

  function cardHtml(p) {
    const d = design(p.id);
    return `<article class="card pj-card ${p.archived ? "is-archived" : ""}">
      <a class="card-thumb" href="#/projects/${p.id}" tabindex="-1" aria-hidden="true">${d && !p.restricted ? K().frameHtml(d) : `<div class="pj-ph">${icon(p.restricted ? "lock" : "layers")}</div>`}</a>
      <div class="card-body">
        <div class="od-row-top"><a class="card-name od-fill" href="#/projects/${p.id}" style="color:var(--fg)">${esc(p.name)}</a>${menuHtml(p, "card")}</div>
        <div class="card-meta"><span>${esc(wsName(p.workspace))}</span><span class="od-nowrap">${p.files} files</span><span class="od-nowrap">updated ${fmtAgo(p.updatedAt)}</span></div>
        <div class="card-foot">${K().avatar(person(p.owner).name)}<span class="od-fill">${esc(person(p.owner).name)}</span>${p.archived ? '<span class="pill">Archived</span>' : p.restricted ? '<span class="pill">No access</span>' : d ? K().pill(d.stage) : ""}</div>
      </div></article>`;
  }

  /* ── List ── */
  function listPage(r, archived) {
    const u = ui(), a = AD();
    const all = list();
    const items = all.filter((p) => !!p.archived === archived && (!u.ws || p.workspace === u.ws) && (!u.q || p.name.toLowerCase().includes(u.q.toLowerCase())));
    const nArch = all.filter((p) => p.archived).length;
    const filtered = u.ws || u.q;
    const empty = filtered
      ? `<div class="empty">${icon("search")}<h3>No projects match</h3><p>Try another workspace or clear the search.</p><button class="btn" data-pj="clear">Clear filters</button></div>`
      : archived
        ? `<div class="empty">${icon("history")}<h3>Nothing archived</h3><p>Archived projects keep their files and runs but leave the main list.</p><a class="btn" href="#/projects">Back to projects</a></div>`
        : `<div class="empty">${icon("layers")}<h3>No projects yet</h3><p>Start one from a brief, a template or an import.</p><a class="btn btn-primary" href="#/projects/new">New project</a></div>`;
    const body = `<div class="page-head">
        <div class="od-stack" style="--od-gap:6px;flex:1 1 320px"><div class="eyebrow">GET /api/projects</div><p class="lede">Every project on <span class="mono">${esc(a.server.host)}</span> you can open — the same list the desktop app shows, served from the cloud.</p></div>
        <div class="field" style="flex:0 1 220px"><label for="pj-ws">Workspace</label><select id="pj-ws" class="select"><option value="">All workspaces</option>${a.workspaces.map((w) => `<option value="${w.id}" ${u.ws === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></div>
        <div class="field" style="flex:0 1 260px"><label for="pj-q">Find a project</label><input id="pj-q" class="input" type="search" value="${esc(u.q)}" placeholder="Search by name" autocomplete="off"></div></div>
      <div class="seg" role="group" aria-label="Show" style="margin-bottom:16px"><a class="seg-a" href="#/projects" aria-pressed="${!archived}">Active · ${all.length - nArch}</a><a class="seg-a" href="#/projects/archived" aria-pressed="${archived}">Archived · ${nArch}</a></div>
      ${items.length ? `<div class="pj-grid">${items.map(cardHtml).join("")}</div>` : empty}`;
    return K().shell(r, archived ? "Archived projects" : "Projects", archived ? `<a href="#/projects">Projects</a>` : null, body,
      `<a class="btn btn-primary" href="#/projects/new">${icon("plus", "icon-sm")}<span>New project</span></a>`);
  }

  /* ── New project ── */
  function newForm() {
    const u = ui();
    u.newForm = u.newForm || { method: "blank", template: "", importName: "", name: "", workspace: "knowme", brief: "", errors: {} };
    return u.newForm;
  }
  function newPage(r) {
    const f = newForm(), a = AD();
    const err = (k) => f.errors[k] ? `<div class="err" id="np-${k}-err">${icon("alert", "icon-sm")}<span>${esc(f.errors[k])}</span></div>` : "";
    const errs = Object.entries(f.errors).filter(([, m]) => m);
    const methods = [["blank", "Blank project", "An empty project. Add files or start a session in Studio."], ["template", "From a template", "A scenario plugin sets up the files and the agent's plan."], ["import", "Import", "Bring in a .zip or a folder of HTML, CSS and assets."]]
      .map(([v, t, d]) => `<label class="radio-card"><input type="radio" name="np-method" value="${v}" ${f.method === v ? "checked" : ""}><div class="od-field"><span class="t">${t}</span><span class="d">${d}</span></div></label>`).join("");
    const tpl = f.method === "template" ? `<div class="form-group"><h3 id="np-template">Template <span class="req" aria-hidden="true">*</span></h3><div class="pj-tpl" role="radiogroup" aria-labelledby="np-template">${TEMPLATES.map((t) => `<label class="radio-card"><input type="radio" name="np-tpl" value="${t.id}" ${f.template === t.id ? "checked" : ""}><div class="od-field"><span class="t">${esc(t.name)}</span><span class="d">${esc(t.d)}</span><span class="mono sub">${esc(t.id)}</span></div></label>`).join("")}</div>${err("template")}</div>` : "";
    const imp = f.method === "import" ? `<div class="field"><label for="np-file">File to import <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="np-file" class="input" type="file" accept=".zip,.html" aria-describedby="np-file-help ${f.errors.file ? "np-file-err" : ""}"><span class="help" id="np-file-help">${f.importName ? `Selected: ${esc(f.importName)}` : "A .zip of the project, or a single .html file. Up to 25 MB."}</span>${err("file")}</div>` : "";
    const body = `<form class="panel form-stack pj-new" id="np-form" novalidate>
      ${errs.length ? `<div class="error-summary" role="alert" tabindex="-1" id="np-errors"><span class="t">Fix ${errs.length} thing${errs.length > 1 ? "s" : ""} to create the project</span><ul>${errs.map(([k, m]) => `<li><a href="#" data-np-jump="${k}">${esc(m)}</a></li>`).join("")}</ul></div>` : ""}
      <div class="form-group"><h3 id="np-method">How do you want to start?</h3><div class="radio-cards" role="radiogroup" aria-labelledby="np-method">${methods}</div></div>
      ${tpl}${imp}
      <div class="two-col">
        <div class="field"><label for="np-name">Project name <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="np-name" class="input" maxlength="80" value="${esc(f.name)}" autocomplete="off" aria-invalid="${!!f.errors.name}" aria-describedby="np-name-help ${f.errors.name ? "np-name-err" : ""}"><span class="help" id="np-name-help">2–80 characters, unique in the workspace.</span>${err("name")}</div>
        <div class="field"><label for="np-ws">Workspace</label><select id="np-ws" class="select">${a.workspaces.map((w) => `<option value="${w.id}" ${f.workspace === w.id ? "selected" : ""}>${esc(w.name)}</option>`).join("")}</select></div>
      </div>
      ${f.method !== "import" ? `<div class="field"><label for="np-brief">Brief</label><textarea id="np-brief" class="textarea" placeholder="Optional. What is this project for?">${esc(f.brief)}</textarea></div>` : ""}
      <div class="od-cluster"><a class="btn btn-ghost" href="#/projects">Cancel</a><span class="od-fill"></span><span class="mono sub">POST /api/projects</span><button type="submit" class="btn btn-primary btn-lg" id="np-submit">Create project</button></div>
    </form>`;
    return K().shell(r, "New project", `<a href="#/projects">Projects</a>`, `<div class="pj-new-wrap">${body}</div>`, "");
  }
  function readNew() {
    const f = newForm();
    const g = (id) => document.getElementById(id);
    const m = document.querySelector('input[name="np-method"]:checked'); if (m) f.method = m.value;
    const t = document.querySelector('input[name="np-tpl"]:checked'); if (t) f.template = t.value;
    if (g("np-name")) f.name = g("np-name").value;
    if (g("np-ws")) f.workspace = g("np-ws").value;
    if (g("np-brief")) f.brief = g("np-brief").value;
    if (g("np-file") && g("np-file").files && g("np-file").files[0]) f.importName = g("np-file").files[0].name;
    return f;
  }
  function validateNew(f) {
    const e = {};
    const n = f.name.trim();
    if (n.length < 2) e.name = "Give the project a name of at least 2 characters.";
    else if (list().some((p) => p.workspace === f.workspace && p.name.toLowerCase() === n.toLowerCase())) e.name = `A project called “${n}” already exists in ${wsName(f.workspace)}.`;
    if (f.method === "template" && !f.template) e.template = "Pick a template.";
    if (f.method === "import" && !f.importName) e.file = "Choose a .zip or .html file to import.";
    else if (f.method === "import" && !/\.(zip|html)$/i.test(f.importName)) e.file = "Only .zip and .html files can be imported.";
    return e;
  }

  /* ── Detail ── */
  function noAccess(r, p) {
    return K().shell(r, p.name, `<a href="#/projects">Projects</a>`, `<div class="empty" style="margin-top:16px">${icon("lock")}<h3>You don't have access to this project</h3><p>${esc(person(p.owner).name)} owns it in ${esc(wsName(p.workspace))}. Ask them to add you.</p><button class="btn btn-primary" data-pj="request" data-id="${p.id}">Request access</button><a class="btn btn-ghost" href="#/projects">Back to projects</a></div>`, "");
  }

  function tabFiles(p) {
    const u = ui(), d = design(p.id), files = filesOf(p.id);
    const sel = u.file[p.id] || files[0][0];
    const isHtml = /\.html$/.test(sel);
    return `<div class="pj-files"><div class="od-stack" style="--od-gap:4px" aria-label="Files">${files.map(([f, kb]) => `<button type="button" class="s-file" data-pj-file="${esc(f)}" aria-current="${f === sel}">${icon("layers", "icon-sm")}<span class="od-truncate od-fill">${esc(f)}</span><span class="mono sub">${kb} KB</span></button>`).join("")}
        <span class="mono sub" style="padding:4px">GET /api/projects/${esc(p.id)}/files</span></div>
      <div class="frame">${isHtml && d ? K().frameHtml(d) : `<div class="empty" style="height:100%">${icon("layers")}<h3>${esc(sel)}</h3><p>Source file. Open it in Studio or the desktop app to edit; the web client previews HTML only.</p></div>`}</div></div>`;
  }
  function tabRuns(p) {
    const a = AD();
    const runs = a.runs.filter((x) => p.name.startsWith(x.project) || x.project.startsWith(p.name.split(" —")[0]));
    return runs.length ? `<div class="od-stack" style="--od-gap:4px">${runs.map((x) => `<div class="adm-row"><div class="od-stack od-fill" style="--od-gap:2px"><span class="t">${esc(x.id)} · ${esc((a.agents.find((g) => g.id === x.agent) || { label: x.agent }).label)}</span><span class="d">${esc(person(x.by).name)} · started ${fmtAgo(x.startedAt)} · <span class="od-nowrap">${Math.floor(x.durationS / 60)} min</span>${x.error ? " · " + esc(x.error) : ""}</span></div>
        <div class="od-cluster od-fixed"><span class="pill ${x.status === "succeeded" ? "stage-approved" : x.status === "running" ? "stage-review" : x.status === "failed" ? "stage-released" : "stage-draft"}">${esc(x.status[0].toUpperCase() + x.status.slice(1))}</span><a class="btn" href="#/admin/runs/${x.id}">Details</a>${x.agent === "uar" ? `<a class="btn" href="#/studio">${icon("sparkles", "icon-sm")}Studio</a>` : ""}</div></div>`).join("")}</div>`
      : `<div class="empty">${icon("history")}<h3>No runs yet</h3><p>Runs started from Studio or the desktop app appear here.</p><a class="btn" href="#/studio">Start in Studio</a></div>`;
  }
  function tabComments(p) {
    const d = design(p.id), cs = d ? d.comments : [];
    return cs.length ? `<div class="od-stack" style="--od-gap:8px">${cs.map((c, i) => `<article class="thread ${c.resolved ? "resolved" : ""}"><div class="thread-head">${K().avatar(K().authorName(c), c.guest ? "guest" : "")}<div class="od-stack"><span class="who">${esc(K().authorName(c))}</span><span class="when">${fmtAgo(c.ts)}${c.resolved ? " · resolved" : ""}</span></div><span class="thread-num">#${i + 1}</span></div><div class="thread-text">${esc(c.text)}</div></article>`).join("")}
        <a class="btn" href="#/design/${p.id}" style="justify-self:start">${icon("pin", "icon-sm")}Open the review room</a></div>`
      : `<div class="empty">${icon("message")}<h3>No comments yet</h3><p>Publish for review to collect comments from your team and guests.</p></div>`;
  }
  function tabShare(p) {
    const a = AD(), d = design(p.id), dep = a.deploy, live = d && d.slug;
    return `<div class="od-stack" style="--od-gap:16px">
      <section class="group od-stack" style="--od-gap:8px"><h3 class="group-title">Review link</h3>
        ${live ? `<div class="link-box"><span class="od-truncate">${esc(K().reviewUrl(d))}</span><button class="btn" data-copy="${esc(K().reviewUrl(d))}">${icon("copy", "icon-sm")}Copy</button></div><div class="od-cluster"><a class="btn" href="#/design/${p.id}">Open review room</a>${d.stage === "approved" ? `<a class="btn btn-primary" href="#/release/${p.id}">Release to customer</a>` : ""}</div>`
          : d ? `<p class="sub" style="font-size:14px">Not published. Publishing uploads a snapshot to the review hub and gives you a link.</p><div><button class="btn btn-primary" data-publish="${p.id}">${icon("upload", "icon-sm")}Publish for review</button></div>`
          : `<p class="sub" style="font-size:14px">This project has no design ready to publish yet.</p>`}</section>
      <section class="group od-stack" style="--od-gap:12px"><h3 class="group-title">Export</h3>
        <div class="od-cluster"><div class="field"><label for="pj-fmt">Format</label><select id="pj-fmt" class="select"><option value="zip">Source (.zip)</option><option value="html">Single HTML file</option><option value="pdf">PDF</option><option value="pptx">Slides (.pptx)</option><option value="image">Image</option></select></div><span class="od-fill"></span><button class="btn" data-pj="export">${icon("upload", "icon-sm")}Export</button></div>
        <span class="mono sub">POST /api/projects/${esc(p.id)}/export/{html,pdf,pptx,image}</span></section>
      <section class="group od-stack" style="--od-gap:12px"><h3 class="group-title">Deploy to Cloudflare Pages</h3>
        ${dep.tokenSet && dep.accountId ? `<p class="sub" style="font-size:14px">Deploys to the <span class="mono">${esc(dep.project)}</span> project. Anyone with the address can open it.</p><div class="od-cluster"><button class="btn btn-primary" data-pj="deploy">${icon("send", "icon-sm")}Deploy</button>${p.deployedUrl ? `<a class="btn" href="${esc(p.deployedUrl)}" target="_blank" rel="noopener">${icon("external", "icon-sm")}Open last deploy</a>` : ""}</div>`
          : `<div class="blocked-panel" style="padding:16px;gap:8px"><b>No deploy target set</b><span style="font-size:14px">An admin needs to add a Cloudflare account and token first.</span><div><a class="btn" href="#/admin/deploy">Open Deploy targets</a></div></div>`}
        <span class="mono sub">POST /api/projects/${esc(p.id)}/deploy/preflight · /deploy · GET /deployments</span></section></div>`;
  }
  function settingsDraft(p) {
    const u = ui();
    u.settings[p.id] = u.settings[p.id] || { v: { name: p.name, description: p.description, designSystem: p.designSystem, agent: p.agent, model: p.model }, dirty: false, errors: {}, saved: false };
    return u.settings[p.id];
  }
  function tabSettings(p) {
    const s = settingsDraft(p), v = s.v, a = AD();
    const models = a.providers.filter((x) => x.keySet).flatMap((x) => x.models.map((m) => [m, `${m} · ${x.label}`]));
    const err = (k) => `<div class="err" id="ps-${k}-err" ${s.errors[k] ? "" : "hidden"}>${s.errors[k] ? `${icon("alert", "icon-sm")}<span>${esc(s.errors[k])}</span>` : ""}</div>`;
    return `<form class="od-stack" style="--od-gap:16px;max-width:760px" id="ps-form" novalidate>
      <div class="group od-stack" style="--od-gap:16px"><h3 class="group-title">General</h3>
        <div class="field"><label for="ps-name">Name <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="ps-name" class="input" maxlength="80" value="${esc(v.name)}" data-ps="name" aria-invalid="${!!s.errors.name}" aria-describedby="ps-name-err">${err("name")}</div>
        <div class="field"><label for="ps-desc">Description</label><textarea id="ps-desc" class="textarea" maxlength="500" data-ps="description" aria-describedby="ps-desc-help ps-description-err">${esc(v.description)}</textarea><span class="help" id="ps-desc-help">Shown on the project card and to reviewers. Up to 500 characters.</span>${err("description")}</div></div>
      <div class="group od-stack" style="--od-gap:16px"><h3 class="group-title">Defaults for new runs</h3>
        <div class="two-col">
          <div class="field"><label for="ps-ds">Design system</label><select id="ps-ds" class="select" data-ps="designSystem">${a.designSystems.map((x) => `<option value="${x.id}" ${v.designSystem === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div>
          <div class="field"><label for="ps-agent">Agent</label><select id="ps-agent" class="select" data-ps="agent">${a.agents.filter((g) => g.state !== "missing").map((g) => `<option value="${g.id}" ${v.agent === g.id ? "selected" : ""}>${esc(g.label)}</option>`).join("")}</select></div>
        </div>
        <div class="field" style="max-width:360px"><label for="ps-model">Model</label><select id="ps-model" class="select" data-ps="model" aria-describedby="ps-model-help">${models.map(([m, l]) => `<option value="${m}" ${v.model === m ? "selected" : ""}>${esc(l)}</option>`).join("")}</select><span class="help" id="ps-model-help">Only models from providers with a key are listed. <a href="#/admin/providers">Manage providers</a></span></div>
      </div>
      <div class="save-bar"><button type="submit" class="btn btn-primary" id="ps-save" ${s.dirty ? "" : 'aria-disabled="true"'}>Save changes</button><button type="button" class="btn btn-ghost" data-pj="ps-discard" ${s.dirty ? "" : "hidden"}>Discard</button>
        <span class="save-msg">${s.saved ? `<span class="msg ok">${icon("check", "icon-sm")}Saved</span>` : s.dirty ? `<span class="msg dirty">Unsaved changes</span>` : ""}</span><span class="od-fill"></span><span class="mono sub">PATCH /api/projects/${esc(p.id)}</span></div>
    </form>`;
  }
  function tabAccess(p) {
    const acc = p.access;
    const people = acc.people.map((x) => {
      const pp = person(x.id);
      const ctl = x.role === "owner" ? '<span class="pill">Owner</span>'
        : `<label class="sr-only" for="pa-${x.id}">Access for ${esc(pp.name)}</label><select id="pa-${x.id}" class="select adm-select" data-pa-role="${x.id}"><option value="edit" ${x.role === "edit" ? "selected" : ""}>Can edit</option><option value="view" ${x.role === "view" ? "selected" : ""}>Can view</option></select><button type="button" class="btn btn-danger" data-pj="pa-remove" data-id="${x.id}">Remove</button>`;
      return `<div class="adm-row"><div class="od-row od-fill">${K().avatar(pp.name, pp.me ? "me" : "")}<div class="od-stack" style="--od-gap:0"><span class="t">${esc(pp.name)}${pp.me ? " (you)" : ""}</span><span class="d">${esc(pp.role || "")}</span></div></div><div class="od-cluster od-fixed">${ctl}</div></div>`;
    }).join("");
    const inv = acc.invites.map((i) => `<div class="adm-row"><div class="od-stack od-fill" style="--od-gap:2px"><span class="t">${esc(i.email)}</span><span class="d">${i.role === "edit" ? "Can edit" : "Can view"} · invited ${fmtAgo(i.at)}</span></div><div class="od-cluster od-fixed"><span class="pill stage-changes">Pending</span><button type="button" class="btn btn-danger" data-pj="pa-uninvite" data-id="${esc(i.email)}">Revoke</button></div></div>`).join("");
    return `<div class="od-stack" style="--od-gap:16px;max-width:860px">
      <div class="note-proposed">${icon("info", "icon-sm")}<span>Proposed for KnowDesign. Upstream Open Design shares projects with the whole workspace; per-project access needs a new server route.</span></div>
      <div class="group"><div class="switch-row"><div class="od-field"><span class="switch-title" id="pa-link-l">Everyone in ${esc(wsName(p.workspace))} can view</span><span class="switch-help">Off means only the people below can open this project.</span></div>
        <button type="button" class="switch-hit" role="switch" aria-checked="${acc.link}" aria-labelledby="pa-link-l" data-pj="pa-link"><span class="switch" aria-checked="${acc.link}"></span></button></div></div>
      <section class="group od-stack" style="--od-gap:8px"><h3 class="group-title">People with access · ${acc.people.length}</h3>${people}</section>
      <section class="group od-stack" style="--od-gap:12px"><h3 class="group-title">Add people</h3>
        <form class="adm-form" id="pa-form" novalidate><div class="field od-fill"><label for="pa-email">Email <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label><input id="pa-email" class="input" type="email" autocomplete="off" placeholder="name@company.com" aria-describedby="pa-email-err"><div class="err" id="pa-email-err" hidden></div></div>
          <div class="field"><label for="pa-role">Access</label><select id="pa-role" class="select"><option value="view">Can view</option><option value="edit">Can edit</option></select></div><button class="btn btn-primary" type="submit">Invite</button></form>
        ${inv}</section></div>`;
  }

  function detailPage(r, p, tab) {
    if (p.restricted) return noAccess(r, p);
    const tabs = TABS.map(([id, l]) => `<a role="tab" href="#/projects/${p.id}/${id}" id="pjt-${id}" aria-selected="${tab === id}" aria-controls="pj-panel" tabindex="${tab === id ? 0 : -1}" data-pj-tab="${id}">${l}</a>`).join("");
    const panel = { files: tabFiles, runs: tabRuns, comments: tabComments, share: tabShare, settings: tabSettings, access: tabAccess }[tab](p);
    const d = design(p.id);
    const banner = p.archived ? `<div class="blocked-panel" style="padding:16px;gap:8px;margin-top:8px"><b>This project is archived</b><span style="font-size:14px">It's read-only and hidden from the main list. Restore it to keep working.</span><div><button class="btn" data-pj-act="restore" data-id="${p.id}">${icon("refresh", "icon-sm")}Restore</button></div></div>` : "";
    const body = `${banner}<div class="pj-head"><dl class="kv"><dt>Workspace</dt><dd>${esc(wsName(p.workspace))}</dd><dt>Owner</dt><dd>${esc(person(p.owner).name)}</dd><dt>Updated</dt><dd>${fmtDate(p.updatedAt)}</dd>${p.description ? `<dt>About</dt><dd>${esc(p.description)}</dd>` : ""}</dl>${d ? K().pill(d.stage) : ""}</div>
      <div class="tabs pj-tabs" role="tablist" aria-label="Project" style="margin:16px 0">${tabs}</div><div id="pj-panel" role="tabpanel" aria-labelledby="pjt-${tab}" tabindex="0">${panel}</div>`;
    return K().shell(r, p.name, `<a href="#/projects">Projects</a>${icon("chevron", "icon-sm")}<span class="mono">${esc(p.id)}</span>`, body, menuHtml(p, "head"));
  }

  function page(r, id) {
    if (!id) return listPage(r, false);
    if (id === "archived") return listPage(r, true);
    if (id === "new") return newPage(r);
    const p = project(id);
    if (!p) return K().shell(r, "Project not found", `<a href="#/projects">Projects</a>`, `<div class="empty" style="margin-top:16px">${icon("search")}<h3>This project isn't on the server</h3><p>It may have been deleted, or moved to a workspace you can't see.</p><a class="btn" href="#/projects">Back to Projects</a></div>`, "");
    const tab = TABS.some(([t]) => t === r.sub) ? r.sub : "files";
    return detailPage(r, p, tab);
  }

  /* ── Lifecycle actions ── */
  const nameErr = (n, ws, exceptId) => n.trim().length < 2 ? "Use at least 2 characters." : list().some((p) => p.id !== exceptId && p.workspace === ws && p.name.toLowerCase() === n.trim().toLowerCase()) ? "Another project in this workspace has that name." : "";
  const ACT = {
    rename: async (p) => {
      const res = await dialog({
        title: "Rename project", initialFocus: "#rn",
        body: `<div class="field"><label for="rn">Name</label><input id="rn" class="input" maxlength="80" value="${esc(p.name)}" aria-describedby="rn-err"><div class="err" id="rn-err" hidden></div></div>`,
        actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Rename", kind: "btn-primary", handler: ({ root }) => {
          const v = root.querySelector("#rn").value, m = nameErr(v, p.workspace, p.id), e = root.querySelector("#rn-err");
          if (m) { e.hidden = false; e.innerHTML = `${icon("alert", "icon-sm")}<span>${esc(m)}</span>`; root.querySelector("#rn").setAttribute("aria-invalid", "true"); return false; }
          p.__name = v.trim();
        } }],
      });
      if (res !== "ok") return;
      p.name = p.__name; delete p.__name; delete ui().settings[p.id]; toast("Project renamed"); K().render();
    },
    duplicate: async (p) => {
      let n = `${p.name} (copy)`, i = 2;
      while (list().some((x) => x.workspace === p.workspace && x.name === n)) n = `${p.name} (copy ${i++})`;
      const id = `${p.id}-copy-${Date.now().toString(36).slice(-4)}`;
      AD().teamProjects = [...list(), { ...JSON.parse(JSON.stringify(p)), id, name: n, owner: K().ME, updatedAt: Date.now(), access: { link: true, people: [{ id: K().ME, role: "owner" }], invites: [] } }];
      toast(`Duplicated as “${n}”`); K().render();
    },
    move: async (p) => {
      const a = AD();
      const res = await dialog({
        title: `Move ${p.name}`,
        body: `<div class="radio-cards" role="radiogroup" aria-label="Destination workspace">${a.workspaces.map((w) => `<label class="radio-card"><input type="radio" name="mv" value="${w.id}" ${w.id === p.workspace ? "checked disabled" : ""}><div class="od-field"><span class="t">${esc(w.name)}</span><span class="d">${w.id === p.workspace ? "Current workspace" : "Members of this workspace will see it"}</span></div></label>`).join("")}</div>`,
        actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Move", kind: "btn-primary", handler: ({ root }) => { const v = root.querySelector('input[name="mv"]:checked:not(:disabled)'); if (!v) { toast("Pick a different workspace.", "error"); return false; } p.__ws = v.value; } }],
      });
      if (res !== "ok") return;
      p.workspace = p.__ws; delete p.__ws; toast(`Moved to ${wsName(p.workspace)}`); K().render();
    },
    archive: async (p) => {
      const res = await dialog({ title: `Archive ${p.name}?`, body: `<div class="consequence"><ul><li>It becomes read-only and leaves the main list.</li><li>Review links and customer links keep working until they expire.</li><li>You can restore it any time from Archived.</li></ul></div>`,
        actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Archive", kind: "btn-primary" }] });
      if (res !== "ok") return;
      p.archived = true; toast("Project archived"); K().render();
    },
    restore: (p) => { p.archived = false; toast("Project restored"); K().render(); },
    delete: async (p) => {
      const res = await dialog({
        title: `Delete ${p.name}?`, initialFocus: "#del",
        body: `<div class="consequence"><ul><li>Files, runs and comments are deleted for everyone.</li><li>Review and customer links stop working.</li><li>This can't be undone.</li></ul></div>
          <div class="field"><label for="del">Type <b>${esc(p.name)}</b> to confirm</label><input id="del" class="input" autocomplete="off" aria-describedby="del-err"><div class="err" id="del-err" hidden></div></div>`,
        actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Delete project", kind: "btn-danger", handler: ({ root }) => {
          if (root.querySelector("#del").value.trim() !== p.name) { const e = root.querySelector("#del-err"); e.hidden = false; e.innerHTML = `${icon("alert", "icon-sm")}<span>The name doesn't match. Type it exactly as shown.</span>`; root.querySelector("#del").setAttribute("aria-invalid", "true"); return false; }
        } }],
      });
      if (res !== "ok") return;
      AD().teamProjects = list().filter((x) => x.id !== p.id);
      toast("Project deleted");
      if (cur().id === p.id) location.hash = "#/projects"; else K().render();
    },
  };

  /* ── Events ── */
  const cur = () => { const m = location.hash.match(/^#\/projects(?:\/([^/]+))?(?:\/([^/]+))?/); return m ? { id: m[1] || null, tab: m[2] || null } : null; };
  const closeMenu = () => { if (ui().menu) { ui().menu = null; K().render(); } };

  document.addEventListener("click", async (e) => {
    const c = cur(); if (!c) return;
    const u = ui();
    let el;
    if ((el = e.target.closest("[data-pj-menu]"))) {
      u.menu = u.menu === el.dataset.pjMenu ? null : el.dataset.pjMenu; K().render();
      const first = document.querySelector(".pj-pop [role=menuitem]"); first && first.focus();
      return;
    }
    if ((el = e.target.closest("[data-pj-act]"))) { const p = project(el.dataset.id); u.menu = null; K().render(); p && ACT[el.dataset.pjAct](p); return; }
    if (u.menu && !e.target.closest(".pj-pop")) closeMenu();
    if ((el = e.target.closest("[data-pj-file]"))) { u.file[c.id] = el.dataset.pjFile; K().render(); return; }
    if ((el = e.target.closest("[data-np-jump]"))) { e.preventDefault(); const k = el.dataset.npJump; const t = document.getElementById(k === "template" ? "np-template" : `np-${k}`) ; if (k === "template") { const r0 = document.querySelector('input[name="np-tpl"]'); r0 && r0.focus(); } else t && t.focus(); return; }
    if (!(el = e.target.closest("[data-pj]"))) return;
    const a = el.dataset.pj, p = c.id && project(c.id);
    if (a === "clear") { u.ws = ""; u.q = ""; K().render(); }
    if (a === "request") { const done = busy(el, "Sending…"); await pace(700); done(); toast(`Access request sent to ${person(project(el.dataset.id).owner).name}`); }
    if (a === "export") { const fmt = document.getElementById("pj-fmt").value; const done = busy(el, "Exporting…"); await pace(1100); done(); toast(`Export ready (${fmt.toUpperCase()}) — downloads are simulated in this prototype`); }
    if (a === "deploy") { const done = busy(el, "Deploying…"); await pace(1600); done(); p.deployedUrl = `https://${p.id}.${AD().deploy.project}.pages.dev`; K().render(); toast("Deployed"); copyText(p.deployedUrl); }
    if (a === "ps-discard") { delete u.settings[p.id]; K().render(); }
    if (a === "pa-link") { p.access.link = !p.access.link; K().render(); const s = document.querySelector('[data-pj="pa-link"]'); s && s.focus(); toast(p.access.link ? "Workspace members can view" : "Only listed people can open it"); }
    if (a === "pa-remove") {
      const who = person(el.dataset.id);
      const res = await dialog({ title: `Remove ${who.name}?`, body: `<div class="consequence"><ul><li>They can't open this project unless everyone in the workspace can view.</li></ul></div>`, actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Remove", kind: "btn-danger" }] });
      if (res !== "ok") return;
      p.access.people = p.access.people.filter((x) => x.id !== el.dataset.id); K().render(); toast(`${who.name} removed`);
    }
    if (a === "pa-uninvite") { p.access.invites = p.access.invites.filter((i) => i.email !== el.dataset.id); K().render(); toast("Invite revoked"); }
  });
  document.addEventListener("keydown", (e) => {
    if (!cur()) return;
    if (e.key === "Escape" && ui().menu) { const m = ui().menu; closeMenu(); const b = document.querySelector(`[data-pj-menu="${m}"]`); b && b.focus(); return; }
    const pop = e.target.closest && e.target.closest(".pj-pop");
    if (pop && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault(); const items = [...pop.querySelectorAll("[role=menuitem]")];
      const i = (items.indexOf(e.target) + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; items[i].focus();
    }
    const tab = e.target.closest && e.target.closest("[data-pj-tab]");
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault(); const ids = TABS.map(([t]) => t);
      const i = (ids.indexOf(tab.dataset.pjTab) + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length;
      location.hash = `#/projects/${cur().id}/${ids[i]}`; setTimeout(() => { const t = document.getElementById(`pjt-${ids[i]}`); t && t.focus(); }, 0);
    }
  });
  let qTimer = 0;
  document.addEventListener("input", (e) => {
    const c = cur(); if (!c) return;
    if (e.target.id === "pj-q") {
      ui().q = e.target.value; clearTimeout(qTimer);
      qTimer = setTimeout(() => { const pos = e.target.selectionStart; K().render(); const s = document.getElementById("pj-q"); if (s) { s.focus(); s.setSelectionRange(pos, pos); } }, 250);
      return;
    }
    const k = e.target.dataset && e.target.dataset.ps;
    if (k && c.id) {
      const s = settingsDraft(project(c.id)); s.v = { ...s.v, [k]: e.target.value }; s.dirty = true; s.saved = false;
      const save = document.getElementById("ps-save"); save && save.setAttribute("aria-disabled", "false");
      const dis = document.querySelector('[data-pj="ps-discard"]'); if (dis) dis.hidden = false;
      const msg = document.querySelector("#ps-form .save-msg"); if (msg) msg.innerHTML = `<span class="msg dirty">Unsaved changes</span>`;
    }
  });
  document.addEventListener("focusout", (e) => {
    const c = cur(); if (!c) return;
    if (e.target.id === "ps-name") {
      const p = project(c.id), m = nameErr(e.target.value, p.workspace, p.id), el = document.getElementById("ps-name-err");
      settingsDraft(p).errors.name = m; el.hidden = !m; el.innerHTML = m ? `${icon("alert", "icon-sm")}<span>${esc(m)}</span>` : ""; e.target.setAttribute("aria-invalid", !!m);
    }
    if (e.target.id === "np-name") {
      const f = readNew(); const m = validateNew(f).name || "";
      const field = e.target.closest(".field"); const old = field.querySelector(".err"); old && old.remove();
      f.errors = { ...f.errors, name: m }; if (!m) delete f.errors.name;
      e.target.setAttribute("aria-invalid", !!m);
      if (m) field.insertAdjacentHTML("beforeend", `<div class="err" id="np-name-err">${icon("alert", "icon-sm")}<span>${esc(m)}</span></div>`);
    }
  });
  document.addEventListener("change", (e) => {
    const c = cur(); if (!c) return;
    if (e.target.id === "pj-ws") { ui().ws = e.target.value; K().render(); const s = document.getElementById("pj-ws"); s && s.focus(); return; }
    if (e.target.name === "np-method" || e.target.id === "np-file") { readNew(); K().render(); const t = document.querySelector(e.target.name ? `input[name="np-method"][value="${e.target.value}"]` : "#np-file"); t && t.focus(); return; }
    if (e.target.name === "np-tpl") { const f = readNew(); delete f.errors.template; return; }
    const pr = e.target.dataset && e.target.dataset.paRole;
    if (pr) { const p = project(c.id); p.access.people = p.access.people.map((x) => (x.id === pr ? { ...x, role: e.target.value } : x)); toast(`${person(pr).name} ${e.target.value === "edit" ? "can edit" : "can view"}`); }
    const k = e.target.dataset && e.target.dataset.ps;
    if (k && e.target.tagName === "SELECT") { const s = settingsDraft(project(c.id)); s.v = { ...s.v, [k]: e.target.value }; s.dirty = true; s.saved = false; K().render(); const t = document.getElementById(e.target.id); t && t.focus(); }
  });
  document.addEventListener("submit", async (e) => {
    const c = cur(); if (!c) return;
    if (e.target.id === "np-form") {
      e.preventDefault();
      const f = readNew(); f.errors = validateNew(f);
      if (Object.keys(f.errors).length) { K().render(); const s = document.getElementById("np-errors"); s && s.focus(); return; }
      const btn = document.getElementById("np-submit"); busy(btn, "Creating…"); await pace(1100);
      const id = f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Date.now().toString(36).slice(-4);
      const tpl = TEMPLATES.find((t) => t.id === f.template);
      AD().teamProjects = [...list(), { id, name: f.name.trim(), workspace: f.workspace, owner: K().ME, files: f.method === "blank" ? 1 : f.method === "template" ? 7 : 12, updatedAt: Date.now(), archived: false,
        description: f.brief.trim() || (tpl ? `Started from ${tpl.name}.` : f.method === "import" ? `Imported from ${f.importName}.` : ""), designSystem: "knowme", agent: "uar", model: "claude-sonnet-5-5",
        access: { link: true, people: [{ id: K().ME, role: "owner" }], invites: [] } }];
      ui().newForm = null;
      toast("Project created");
      location.hash = `#/projects/${id}/files`;
      return;
    }
    if (e.target.id === "ps-form") {
      e.preventDefault();
      const p = project(c.id), s = settingsDraft(p);
      if (!s.dirty) return;
      const m = nameErr(s.v.name, p.workspace, p.id);
      if (m) { s.errors.name = m; K().render(); const n = document.getElementById("ps-name"); n && n.focus(); return; }
      busy(document.getElementById("ps-save"), "Saving…"); await pace(700);
      Object.assign(p, { name: s.v.name.trim(), description: s.v.description.trim(), designSystem: s.v.designSystem, agent: s.v.agent, model: s.v.model, updatedAt: Date.now() });
      ui().settings[p.id] = { ...settingsDraft(p), dirty: false, saved: true, errors: {} };
      K().render(); toast("Project settings saved");
      return;
    }
    if (e.target.id === "pa-form") {
      e.preventDefault();
      const p = project(c.id), inp = document.getElementById("pa-email"), err = document.getElementById("pa-email-err"), v = inp.value.trim();
      const known = AD().members.find((m) => m.email === v);
      const msg = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? "Enter an email address like name@company.com." : (known && p.access.people.some((x) => x.id === known.id)) || p.access.invites.some((i) => i.email === v) ? "This person already has access or an invite." : "";
      if (msg) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>`; inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
      const role = document.getElementById("pa-role").value;
      if (known) p.access.people = [...p.access.people, { id: known.id, role }];
      else p.access.invites = [...p.access.invites, { email: v, role, at: Date.now() }];
      K().render(); toast(known ? `${person(known.id).name} added` : `Invite sent to ${v}`);
      const again = document.getElementById("pa-email"); again && again.focus();
    }
  });

  window.KD_PROJECTS = { page, list, project };
})();
