/* KnowDesign Review — review room: snapshot preview, pinned comments, approval gate, versions. */
(function () {
  "use strict";
  const { icon, esc, fmtDate, fmtTime, fmtAgo, fmtIn, pace, toast, dialog, busy, copyText } = window.KD_UI;
  const K = () => window.KD;

  const ui = (d) => {
    const s = K().state.ui.room;
    if (!s[d.id] || !s[d.id].__init) s[d.id] = Object.assign({ tab: "comments", active: null, adding: false, pending: null, filter: "all", viewV: null, replyOpen: null, agent: null, draft: "", __init: true }, s[d.id] || {});
    return s[d.id];
  };
  const currentDesign = () => {
    const m = location.hash.match(/^#\/design\/([^/]+)/);
    return m ? K().design(decodeURIComponent(m[1])) : null;
  };

  /* ── Gate ── */
  function gateInfo(d) {
    const cfg = K().state.config.approvals;
    const n = K().approvalsOf(d);
    const open = K().openComments(d).length;
    const mine = d.approvers.find((a) => a.id === K().ME);
    const blocked = cfg.blockOnOpen && open > 0;
    let title, sub;
    switch (d.stage) {
      case "draft": title = "Not published"; sub = "Publish to get a review link. Nothing is visible outside KnowDesign yet."; break;
      case "review": title = `Approval gate · ${n} of ${cfg.required}`; sub = blocked ? `${open} open comment${open > 1 ? "s" : ""} must be resolved before anyone can approve.` : "Approvers can sign off on this version."; break;
      case "changes": { const who = d.approvers.find((a) => a.status === "changes"); title = "Changes requested"; sub = who ? `${K().person(who.id).name}: “${who.note || "See comments"}”` : "Publish a new version to restart review."; break; }
      case "approved": title = `Approved · ${n} of ${cfg.required}`; sub = "The gate passed. You can release this version to a customer."; break;
      default: title = "Released"; sub = `Shared with a customer ${fmtAgo(d.releasedAt)}.`;
    }
    return { title, sub, blocked, mine, open, n };
  }

  function gateHtml(d) {
    const g = gateInfo(d);
    const stateLabel = { approved: "Approved", changes: "Asked for changes", pending: "Waiting" };
    const stateIcon = { approved: "check", changes: "alert", pending: "history" };
    const approvers = d.approvers.map((a) => {
      const p = K().person(a.id);
      return `<div class="approver">${K().avatar(p.name, p.me ? "me" : "")}<div class="od-stack"><span class="approver-name">${esc(p.name)}${p.me ? " (you)" : ""}</span><span class="approver-state ${a.status}">${icon(stateIcon[a.status], "icon-sm")}${stateLabel[a.status]}</span></div></div>`;
    }).join("");
    let actions = "";
    if (d.stage === "draft") actions = `<button class="btn btn-primary" data-publish="${d.id}">${icon("upload", "icon-sm")}Publish for review</button>`;
    else if (d.stage === "review") {
      const done = g.mine && g.mine.status === "approved";
      actions = `<button class="btn btn-danger" data-room="request-changes">Request changes</button>
        <button class="btn btn-primary" data-room="approve" ${g.blocked || done ? 'aria-disabled="true"' : ""} ${g.blocked ? 'aria-describedby="gate-sub"' : ""}>${icon("check", "icon-sm")}${done ? "You approved" : "Approve v" + d.version}</button>`;
    } else if (d.stage === "changes") actions = `<button class="btn btn-primary" data-new-version="${d.id}">${icon("upload", "icon-sm")}Publish v${d.version + 1}</button>`;
    else if (d.stage === "approved") actions = `<a class="btn btn-primary" href="#/release/${d.id}">${icon("send", "icon-sm")}Release to customer</a>`;
    else actions = `<a class="btn" href="#/release/${d.id}">View release</a>`;
    return `<section class="gate" aria-label="Approval gate">
      <div class="od-fill od-stack" style="--od-gap:2px"><span class="gate-title">${esc(g.title)}</span><span class="gate-sub" id="gate-sub">${esc(g.sub)}</span></div>
      <div class="approvers">${approvers}</div>
      <div class="od-cluster">${actions}</div></section>`;
  }

  /* ── Preview + pins ── */
  function pinsHtml(d) {
    const u = ui(d);
    const shown = d.comments.filter((c) => u.filter !== "resolved" ? true : c.resolved);
    const pins = shown.map((c, i) => {
      const n = d.comments.indexOf(c) + 1;
      const cls = ["pin", c.guest ? "guest" : "", c.resolved ? "resolved" : "", u.active === c.id ? "active" : ""].join(" ");
      return `<button type="button" class="${cls}" style="left:${c.x}%;top:${c.y}%" data-room-pin="${c.id}" aria-label="Comment ${n} by ${esc(K().authorName(c))}${c.resolved ? ", resolved" : ""}">${n}</button>`;
    }).join("");
    const pending = u.pending ? `<span class="pin pending" style="left:${u.pending.x}%;top:${u.pending.y}%" aria-hidden="true">+</span>` : "";
    return pins + pending;
  }

  function stageHtml(d) {
    const u = ui(d);
    const v = u.viewV || d.version;
    const published = d.stage !== "draft" && d.slug;
    const versionsSeg = d.versions.length > 1
      ? `<div class="seg" role="group" aria-label="Snapshot version">${d.versions.slice().reverse().map((x) => `<button type="button" data-room-ver="${x.v}" aria-pressed="${x.v === v}">v${x.v}</button>`).join("")}</div>` : "";
    return `<section class="stage-wrap" aria-label="Published snapshot">
      <div class="stage-bar">
        <div class="origin od-fill" title="Served from the isolated snapshot origin">${icon("lock", "icon-sm")}<span class="od-truncate">${published ? esc(K().snapUrl(d).replace(/v\d+\//, `v${v}/`)) : "Not published — local KnowDesign file " + esc(d.project)}</span></div>
        ${versionsSeg}
      </div>
      <div class="frame">
        ${K().frameHtml(d, v)}
        <div class="frame-overlay ${u.adding ? "adding" : ""}" data-room-overlay ${u.adding ? 'role="button" tabindex="0" aria-label="Click on the design to place a comment"' : ""}>${pinsHtml(d)}</div>
      </div>
      <div class="od-cluster">
        <button class="btn ${u.adding ? "btn-cyan" : ""}" data-room="toggle-add" aria-pressed="${u.adding}">${icon(u.adding ? "x" : "pin", "icon-sm")}${u.adding ? "Cancel comment" : "Add comment"}</button>
        ${u.adding ? `<span class="add-hint">${icon("info", "icon-sm")}Click the spot you want to comment on.</span>` : ""}
        ${v !== d.version ? `<span class="add-hint">${icon("history", "icon-sm")}Viewing v${v}. Comments were left on the versions they name.</span>` : ""}
        <span class="od-fill"></span>
        ${published ? `<button class="btn" data-copy="${esc(K().reviewUrl(d))}">${icon("copy", "icon-sm")}Copy review link</button>
          <a class="btn" href="#/r/${esc(d.slug)}" target="_blank" rel="noopener">${icon("external", "icon-sm")}Open as reviewer</a>
          ${d.stage !== "released" ? `<button class="btn btn-danger" data-room="revoke">${icon("trash", "icon-sm")}Revoke</button>` : ""}` : ""}
      </div>
      ${published ? `<div class="sub" style="font-size:13px;padding:0 4px">Review link ${esc(K().reviewUrl(d))} · expires ${fmtIn(d.expiresAt)} (${fmtDate(d.expiresAt)})</div>` : ""}
    </section>`;
  }

  /* ── Side panel ── */
  function threadHtml(d, c) {
    const u = ui(d);
    const n = d.comments.indexOf(c) + 1;
    const name = K().authorName(c);
    const replies = c.replies.map((r) => `<div class="reply"><div class="who">${esc(K().person(r.author).name)} · <span class="when">${fmtAgo(r.ts)}</span></div><div>${esc(r.text)}</div></div>`).join("");
    const replyBox = u.replyOpen === c.id ? `<div class="reply-box">
        <label class="sr-only" for="reply-${c.id}">Reply to comment ${n}</label>
        <textarea id="reply-${c.id}" class="textarea" placeholder="Reply to ${esc(name)}" maxlength="${K().state.config.limits.commentChars}"></textarea>
        <div id="reply-${c.id}-err" class="err" hidden></div>
        <div class="thread-actions"><button class="btn btn-primary" data-room-reply-send="${c.id}">Send reply</button><button class="btn btn-ghost" data-room-reply="${c.id}">Cancel</button></div></div>` : "";
    return `<article class="thread ${u.active === c.id ? "active" : ""} ${c.resolved ? "resolved" : ""}" id="thread-${c.id}" aria-label="Comment ${n}">
      <div class="thread-head">${K().avatar(name, c.guest ? "guest" : "")}<div class="od-stack"><span class="who">${esc(name)}</span><span class="when">${fmtAgo(c.ts)}${c.unread ? " · new" : ""}</span></div>
        <span class="thread-num">#${n}</span></div>
      <div class="thread-text">${esc(c.text)}</div>
      <span class="anchor od-truncate" title="Anchor saved with the comment">${esc(c.anchor)} · ${Math.round(c.x)}%, ${Math.round(c.y)}%</span>
      ${replies ? `<div class="replies">${replies}</div>` : ""}
      ${replyBox}
      ${u.replyOpen === c.id ? "" : `<div class="thread-actions">
        <button class="btn" data-room-show="${c.id}">${icon("pin", "icon-sm")}Show</button>
        <button class="btn" data-room-reply="${c.id}">${icon("message", "icon-sm")}Reply</button>
        <button class="btn" data-room-resolve="${c.id}">${icon(c.resolved ? "refresh" : "check", "icon-sm")}${c.resolved ? "Reopen" : "Resolve"}</button></div>`}
    </article>`;
  }

  function commentsTab(d) {
    const u = ui(d);
    const L = K().state.config.limits;
    const f = u.filter;
    const list = d.comments.filter((c) => f === "all" ? !c.resolved : f === "guests" ? c.guest && !c.resolved : c.resolved);
    const filters = [["all", "Open"], ["guests", "Guests"], ["resolved", "Resolved"]]
      .map(([id, l]) => `<button type="button" data-room-filter="${id}" aria-pressed="${f === id}">${l}</button>`).join("");
    const composer = u.pending ? `<div class="thread" style="background:var(--cyan-soft)">
        <div class="field"><label for="new-comment">New comment at ${Math.round(u.pending.x)}%, ${Math.round(u.pending.y)}%</label>
          <textarea id="new-comment" class="textarea" maxlength="${L.commentChars}" placeholder="What should change here?" aria-describedby="new-comment-err">${esc(u.draft)}</textarea>
          <div id="new-comment-err" class="err" hidden></div></div>
        <div class="thread-actions"><button class="btn btn-primary" data-room="post-comment">Post comment</button><button class="btn btn-ghost" data-room="toggle-add">Cancel</button></div></div>` : "";
    const empty = f === "resolved"
      ? `<div class="empty">${icon("check")}<h3>No resolved comments</h3><p>Resolved threads stay here so you can see what was settled.</p></div>`
      : d.stage === "draft"
        ? `<div class="empty">${icon("upload")}<h3>Publish to collect comments</h3><p>Reviewers can only comment once there's a review link.</p></div>`
        : `<div class="empty">${icon("message")}<h3>No open comments</h3><p>Share the review link, or click “Add comment” to leave the first one yourself.</p><button class="btn" data-copy="${esc(K().reviewUrl(d))}">${icon("copy", "icon-sm")}Copy review link</button></div>`;
    return `<div class="seg filter-row" role="group" aria-label="Filter comments">${filters}</div>${composer}${list.length ? list.map((c) => threadHtml(d, c)).join("") : composer ? "" : empty}`;
  }

  function versionsTab(d) {
    const u = ui(d);
    const v = u.viewV || d.version;
    return `<div class="versions">${d.versions.map((x) => `<button type="button" class="version" data-room-ver="${x.v}" aria-current="${x.v === v}">
        <div class="version-head"><b>v${x.v}</b>${x.v === d.version ? '<span class="pill">Current</span>' : ""}<span class="od-fill"></span><span class="when">${fmtDate(x.at)}</span></div>
        <ul>${x.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></button>`).join("")}</div>`;
  }

  function activityTab(d) {
    if (!d.audit.length) return `<div class="empty">${icon("history")}<h3>No activity yet</h3><p>Publishing, approvals, revokes and releases are recorded here.</p></div>`;
    return `<div class="audit">${d.audit.map((a) => `<div class="audit-row"><span class="mono">${fmtDate(a.at)} ${fmtTime(a.at)}</span><span class="what"><b>${esc(a.who === "system" ? "Hub" : K().person(a.who).name)}</b> — ${a.what}</span></div>`).join("")}</div>`;
  }

  function sideHtml(d) {
    const u = ui(d);
    const open = K().openComments(d).length;
    const tab = (id, label, count) => `<button role="tab" type="button" id="tab-${id}" aria-controls="tabpanel" aria-selected="${u.tab === id}" data-room-tab="${id}" tabindex="${u.tab === id ? 0 : -1}">${label}${count != null ? `<span class="count">${count}</span>` : ""}</button>`;
    const body = u.tab === "agent" ? window.KD_AGENT.tab(d, u) : u.tab === "versions" ? versionsTab(d) : u.tab === "activity" ? activityTab(d) : commentsTab(d);
    return `<div class="side-head"><div class="tabs" role="tablist" aria-label="Review panel">${tab("comments", "Comments", open)}${tab("agent", `${icon("sparkles", "icon-sm")}Agent`)}${tab("versions", "Versions")}${tab("activity", "Activity")}</div></div>
      <div class="side-body" role="tabpanel" id="tabpanel" aria-labelledby="tab-${u.tab}" tabindex="0">${body}</div>`;
  }

  function page(r, d) {
    const crumbs = `<a href="#/pipeline">Pipeline</a>${icon("chevron", "icon-sm")}<span class="mono od-truncate">${esc(d.project)}</span>`;
    const body = `${gateHtml(d)}<div class="room">${stageHtml(d)}<aside class="side" aria-label="Comments, agent and history">${sideHtml(d)}</aside></div>`;
    return K().shell(r, d.name, crumbs, body, K().pill(d.stage));
  }

  /* ── Partial updates (keep the iframe alive) ── */
  function updateSide(d, focusSel) {
    const side = document.querySelector(".side");
    if (!side) return;
    const body = side.querySelector(".side-body");
    const st = body ? body.scrollTop : 0;
    side.innerHTML = sideHtml(d);
    const nb = side.querySelector(".side-body");
    if (nb) nb.scrollTop = st;
    if (focusSel) { const el = side.querySelector(focusSel); el && el.focus(); }
  }
  function updatePins(d) {
    const o = document.querySelector("[data-room-overlay]");
    if (o) o.innerHTML = pinsHtml(d);
  }
  function rerenderStage(d) {
    const s = document.querySelector(".stage-wrap");
    if (s) s.outerHTML = stageHtml(d);
  }
  function rerenderGate(d) {
    const g = document.querySelector(".gate");
    if (g) g.outerHTML = gateHtml(d);
    const pillHost = document.querySelector(".topbar .od-row .pill");
    if (pillHost) pillHost.outerHTML = K().pill(d.stage);
  }

  function selectComment(d, id, scroll) {
    const u = ui(d);
    u.active = id;
    const c = d.comments.find((x) => x.id === id);
    if (c) { c.unread = false; if (c.resolved && u.filter !== "resolved") u.filter = "resolved"; if (!c.resolved && u.filter === "resolved") u.filter = "all"; if (!c.guest && u.filter === "guests") u.filter = "all"; }
    u.tab = "comments";
    updateSide(d);
    updatePins(d);
    if (scroll) { const t = document.getElementById("thread-" + id); t && t.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  }

  /* ── Actions ── */
  async function approve(d) {
    const g = gateInfo(d);
    if (g.blocked) { toast(`Resolve ${g.open} open comment${g.open > 1 ? "s" : ""} first, or change the policy in Settings → Approvals.`, "error"); return; }
    if (g.mine && g.mine.status === "approved") return;
    const cfg = K().state.config.approvals;
    const after = g.n + 1;
    const passes = after >= cfg.required;
    const res = await dialog({
      title: `Approve v${d.version}?`,
      body: `<p>You're signing off on <b>${esc(d.name)}</b> as it appears in snapshot v${d.version}.</p>
        <div class="consequence"><ul>
          <li>Your approval is recorded with your KnowMe account and this version.</li>
          <li>${passes ? "This completes the gate. The design moves to Approved and can be released." : `The gate still needs ${cfg.required - after} more approval${cfg.required - after > 1 ? "s" : ""}.`}</li>
          ${cfg.resetOnNewVersion ? "<li>Publishing a new version resets approvals.</li>" : ""}</ul></div>`,
      actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Approve", kind: "btn-primary" }],
    });
    if (res !== "ok") return;
    d.approvers = d.approvers.map((a) => (a.id === K().ME ? { id: a.id, status: "approved" } : a));
    audit(d, `Approved v${d.version}${passes ? ` · gate passed (${after} of ${cfg.required})` : ""}`);
    if (passes) d.stage = "approved";
    toast(passes ? "Approved. Ready to release." : "Approval recorded. Waiting on the other approvers.");
    K().render();
  }

  async function requestChanges(d) {
    const res = await dialog({
      title: "Request changes",
      body: `<div class="field"><label for="rc-note">What needs to change <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
        <textarea id="rc-note" class="textarea" placeholder="The one thing that has to be fixed before you'll approve" aria-describedby="rc-help rc-err"></textarea>
        <span id="rc-help" class="help">The author and other approvers see this on the gate.</span><div id="rc-err" class="err" hidden></div></div>`,
      initialFocus: "#rc-note",
      actions: [
        { id: "cancel", label: "Cancel", kind: "btn-ghost" },
        {
          id: "ok", label: "Request changes", kind: "btn-danger",
          handler: ({ root }) => {
            const t = root.querySelector("#rc-note"), err = root.querySelector("#rc-err");
            if (t.value.trim().length < 10) {
              err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>Say what needs to change (at least 10 characters).</span>`;
              t.setAttribute("aria-invalid", "true"); t.focus(); return false;
            }
            d.__rcNote = t.value.trim();
          },
        },
      ],
    });
    if (res !== "ok") return;
    d.approvers = d.approvers.map((a) => (a.id === K().ME ? { id: a.id, status: "changes", note: d.__rcNote } : a));
    d.stage = "changes";
    audit(d, `Requested changes: ${esc(d.__rcNote)}`);
    delete d.__rcNote;
    toast("Changes requested. The author has been told.");
    K().render();
  }

  async function revoke(d) {
    const res = await dialog({
      title: "Revoke the review link?",
      body: `<div class="consequence"><ul>
          <li>The link <span class="mono">${esc(K().reviewUrl(d))}</span> stops working right away and returns “not found”.</li>
          <li>The snapshot is removed from <span class="mono">${esc(K().state.config.hosting.snapHost)}</span>.</li>
          <li>Comments stay here. You can publish again to get a new link.</li></ul></div>`,
      actions: [{ id: "cancel", label: "Keep the link", kind: "btn-ghost" }, { id: "ok", label: "Revoke link", kind: "btn-danger" }],
    });
    if (res !== "ok") return;
    d.revokedSlugs = [...(d.revokedSlugs || []), d.slug];
    audit(d, `Revoked review link · snapshot deleted`);
    d.slug = null; d.stage = "draft"; d.expiresAt = null;
    d.approvers = d.approvers.map((a) => ({ id: a.id, status: "pending" }));
    toast("Link revoked. It now returns “not found”.");
    K().render();
  }

  const audit = (d, what) => K().audit(d, K().ME, what);

  function postComment(d) {
    const u = ui(d);
    const t = document.getElementById("new-comment");
    const err = document.getElementById("new-comment-err");
    const max = K().state.config.limits.commentChars;
    const v = t.value.trim();
    const msg = !v ? "Write the comment before posting." : v.length > max ? `Keep it under ${max} characters.` : "";
    if (msg) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>`; t.setAttribute("aria-invalid", "true"); t.focus(); return; }
    const id = "c" + (d.comments.length + 1) + "-" + Date.now().toString(36).slice(-3);
    d.comments = [...d.comments, { id, author: K().ME, guest: false, x: u.pending.x, y: u.pending.y, anchor: "author pin", text: v, ts: Date.now(), resolved: false, replies: [], unread: false }];
    u.pending = null; u.adding = false; u.draft = ""; u.active = id; u.filter = "all";
    rerenderStage(d); updateSide(d); rerenderGate(d);
    toast("Comment posted");
  }

  /* ── Event delegation (installed once) ── */
  document.addEventListener("click", async (e) => {
    const d = currentDesign();
    if (!d) return;
    const u = ui(d);
    const t = e.target;
    const q = (sel) => t.closest(sel);
    let el;

    if ((el = q("[data-room-pin]"))) { e.stopPropagation(); selectComment(d, el.dataset.roomPin, true); return; }
    if ((el = q("[data-room-overlay]")) && u.adding) {
      const rect = el.getBoundingClientRect();
      u.pending = { x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 };
      u.tab = "comments";
      updatePins(d); updateSide(d, "#new-comment");
      return;
    }
    if ((el = q("[data-room-tab]"))) { u.tab = el.dataset.roomTab; updateSide(d); return; }
    if ((el = q("[data-room-filter]"))) { u.filter = el.dataset.roomFilter; updateSide(d); updatePins(d); return; }
    if ((el = q("[data-room-ver]"))) { u.viewV = Number(el.dataset.roomVer); rerenderStage(d); updateSide(d); return; }
    if ((el = q("[data-room-show]"))) { selectComment(d, el.dataset.roomShow, false); document.querySelector(".frame").scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
    if ((el = q("[data-room-reply]"))) { u.replyOpen = u.replyOpen === el.dataset.roomReply ? null : el.dataset.roomReply; updateSide(d, u.replyOpen ? `#reply-${u.replyOpen}` : null); return; }
    if ((el = q("[data-room-reply-send]"))) {
      const id = el.dataset.roomReplySend, ta = document.getElementById("reply-" + id), err = document.getElementById(`reply-${id}-err`);
      if (!ta.value.trim()) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>Write a reply first.</span>`; ta.setAttribute("aria-invalid", "true"); ta.focus(); return; }
      d.comments = d.comments.map((c) => (c.id === id ? { ...c, replies: [...c.replies, { author: K().ME, text: ta.value.trim(), ts: Date.now() }] } : c));
      u.replyOpen = null; updateSide(d); toast("Reply sent. Guests see it next time they open the link.");
      return;
    }
    if ((el = q("[data-room-resolve]"))) {
      const id = el.dataset.roomResolve;
      d.comments = d.comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved, unread: false } : c));
      updateSide(d); updatePins(d); rerenderGate(d);
      return;
    }
    if ((el = q("[data-room]"))) {
      const a = el.dataset.room;
      if (a === "toggle-add") { u.adding = !u.adding; if (!u.adding) u.pending = null; rerenderStage(d); updateSide(d); return; }
      if (a === "post-comment") { postComment(d); return; }
      if (a === "approve") { approve(d); return; }
      if (a === "request-changes") { requestChanges(d); return; }
      if (a === "revoke") { revoke(d); return; }
    }
  });
  document.addEventListener("input", (e) => {
    const d = currentDesign();
    if (d && e.target.id === "new-comment") ui(d).draft = e.target.value;
  });
  document.addEventListener("keydown", (e) => {
    const d = currentDesign();
    if (!d) return;
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      const tabs = [...document.querySelectorAll('.side [role="tab"]')];
      const i = tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
      const next = tabs[(i + tabs.length) % tabs.length];
      ui(d).tab = next.dataset.roomTab; updateSide(d, `#tab-${next.dataset.roomTab}`);
    }
    if (e.target.matches && e.target.matches("[data-room-overlay]") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      ui(d).pending = { x: 50, y: 50 }; ui(d).tab = "comments"; updatePins(d); updateSide(d, "#new-comment");
    }
  });

  function mount(d) {
    const u = ui(d);
    if (u.active) {
      const c = d.comments.find((x) => x.id === u.active);
      if (c && c.unread) { c.unread = false; }
      const t = document.getElementById("thread-" + u.active);
      t && t.scrollIntoView({ block: "nearest" });
    }
  }

  window.KD_ROOM = { page, mount, updateSide, updatePins, rerenderGate, selectComment, ui };
})();
