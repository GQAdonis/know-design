/* KnowDesign Review — Inbox (triage reviewer comments) and Releases (customer links). */
(function () {
  "use strict";
  const { icon, esc, fmtDate, fmtTime, fmtAgo, fmtIn, toast, dialog, busy, pace } = window.KD_UI;
  const K = () => window.KD;

  const ui = () => {
    const st = K().state.ui;
    st.inbox = st.inbox || { tab: "new", who: "all", design: "", replyOpen: null };
    return st.inbox;
  };

  /* ── Inbox ── */
  function rows() {
    const u = ui();
    const out = [];
    K().state.designs.forEach((d) => d.comments.forEach((c) => {
      if (c.resolved) return;
      if (u.tab === "new" && !c.unread) return;
      if (u.who === "guests" && !c.guest) return;
      if (u.who === "members" && c.guest) return;
      if (u.design && d.id !== u.design) return;
      if (c.author === K().ME && !c.guest) return;
      out.push({ d, c });
    }));
    return out.sort((a, b) => b.c.ts - a.c.ts);
  }

  function itemHtml({ d, c }) {
    const u = ui();
    const key = `${d.id}:${c.id}`;
    const n = d.comments.indexOf(c) + 1;
    const name = K().authorName(c);
    const replies = c.replies.map((r) => `<div class="reply"><div class="who">${esc(K().person(r.author).name)} · <span class="when">${fmtAgo(r.ts)}</span></div><div>${esc(r.text)}</div></div>`).join("");
    const box = u.replyOpen === key ? `<div class="reply-box"><label class="sr-only" for="ib-reply">Reply to ${esc(name)}</label>
        <textarea id="ib-reply" class="textarea" placeholder="Reply to ${esc(name)}" maxlength="${K().state.config.limits.commentChars}" aria-describedby="ib-reply-err"></textarea>
        <div class="err" id="ib-reply-err" hidden></div>
        <div class="thread-actions"><button class="btn btn-primary" data-inbox-send="${key}">Send reply</button><button class="btn btn-ghost" data-inbox-reply="${key}">Cancel</button></div></div>` : "";
    return `<article class="thread ib-item" aria-label="Comment ${n} on ${esc(d.name)}">
      <div class="thread-head">${K().avatar(name, c.guest ? "guest" : "")}<div class="od-stack"><span class="who">${esc(name)}</span><span class="when">${fmtAgo(c.ts)} · <a href="#/design/${d.id}" data-open-comment="${key}">${esc(d.name)}</a> #${n}</span></div>
        <span class="od-fill"></span>${c.unread ? '<span class="unread">New</span>' : ""}${c.guest ? '<span class="pill guest">Guest</span>' : ""}</div>
      <div class="thread-text">${esc(c.text)}</div>
      ${replies ? `<div class="replies">${replies}</div>` : ""}${box}
      ${u.replyOpen === key ? "" : `<div class="thread-actions">
        <button class="btn" data-inbox-reply="${key}">${icon("message", "icon-sm")}Reply</button>
        <button class="btn" data-inbox-resolve="${key}">${icon("check", "icon-sm")}Resolve</button>
        ${c.unread ? `<button class="btn" data-inbox-read="${key}">Mark read</button>` : ""}
        <a class="btn" href="#/design/${d.id}" data-open-comment="${key}">${icon("pin", "icon-sm")}Show on design</a></div>`}
    </article>`;
  }

  function inbox(r) {
    const u = ui();
    const list = rows();
    const newCount = K().state.designs.reduce((n, d) => n + d.comments.filter((c) => c.unread && !c.resolved).length, 0);
    const published = K().state.designs.filter((d) => d.comments.length);
    const filters = `<div class="ib-filters">
      <div class="seg" role="group" aria-label="Which comments"><button type="button" data-inbox-tab="new" aria-pressed="${u.tab === "new"}">New · ${newCount}</button><button type="button" data-inbox-tab="open" aria-pressed="${u.tab === "open"}">All open</button></div>
      <div class="seg" role="group" aria-label="From"><button type="button" data-inbox-who="all" aria-pressed="${u.who === "all"}">Everyone</button><button type="button" data-inbox-who="guests" aria-pressed="${u.who === "guests"}">Guests</button><button type="button" data-inbox-who="members" aria-pressed="${u.who === "members"}">Team</button></div>
      <div class="field" style="min-width:220px"><label class="sr-only" for="ib-design">Design</label><select id="ib-design" class="select"><option value="">All designs</option>${published.map((d) => `<option value="${d.id}" ${u.design === d.id ? "selected" : ""}>${esc(d.name)}</option>`).join("")}</select></div></div>`;
    const filtered = u.who !== "all" || u.design;
    const empty = u.tab === "new" && !filtered
      ? `<div class="empty">${icon("inbox")}<h3>You're caught up</h3><p>New comments from reviewers land here, including guests who opened a review link.</p><button class="btn" data-inbox-tab="open">See all open comments</button></div>`
      : `<div class="empty">${icon("search")}<h3>Nothing matches these filters</h3><p>Try everyone, or all designs.</p><button class="btn" data-inbox-clear>Clear filters</button></div>`;
    const body = `<p class="lede" style="margin:8px 0 16px">Reply and resolve here, or jump to the pin on the design. Guests see your replies the next time they open their link.</p>
      ${filters}<div class="od-stack" style="--od-gap:8px;max-width:860px">${list.length ? list.map(itemHtml).join("") : empty}</div>`;
    return K().shell(r, "Inbox", null, body, newCount ? `<button class="btn" type="button" data-mark-all>${icon("check", "icon-sm")}<span>Mark all read</span></button>` : "");
  }

  const find = (key) => { const [did, cid] = key.split(":"); const d = K().design(did); return { d, c: d && d.comments.find((x) => x.id === cid), cid }; };
  const onInbox = () => /^#\/inbox/.test(location.hash);

  /* ── Events ── */
  document.addEventListener("click", (e) => {
    let el;
    if (!onInbox()) return;
    const u = ui();
    if ((el = e.target.closest("[data-inbox-tab]"))) { u.tab = el.dataset.inboxTab; u.replyOpen = null; K().render(); return; }
    if ((el = e.target.closest("[data-inbox-who]"))) { u.who = el.dataset.inboxWho; K().render(); return; }
    if (e.target.closest("[data-inbox-clear]")) { u.who = "all"; u.design = ""; K().render(); return; }
    if ((el = e.target.closest("[data-inbox-reply]"))) {
      u.replyOpen = u.replyOpen === el.dataset.inboxReply ? null : el.dataset.inboxReply; K().render();
      const t = document.getElementById("ib-reply"); t && t.focus(); return;
    }
    if ((el = e.target.closest("[data-inbox-send]"))) {
      const { d, c } = find(el.dataset.inboxSend);
      const ta = document.getElementById("ib-reply"), err = document.getElementById("ib-reply-err");
      if (!ta.value.trim()) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>Write a reply first.</span>`; ta.setAttribute("aria-invalid", "true"); ta.focus(); return; }
      d.comments = d.comments.map((x) => (x.id === c.id ? { ...x, unread: false, replies: [...x.replies, { author: K().ME, text: ta.value.trim(), ts: Date.now() }] } : x));
      u.replyOpen = null; K().render(); toast(c.guest ? "Reply sent. The guest sees it next time they open the link." : "Reply sent");
      return;
    }
    if ((el = e.target.closest("[data-inbox-resolve]"))) {
      const { d, c } = find(el.dataset.inboxResolve);
      d.comments = d.comments.map((x) => (x.id === c.id ? { ...x, resolved: true, unread: false } : x));
      K().render(); toast(`Resolved on ${d.name}`); return;
    }
    if ((el = e.target.closest("[data-inbox-read]"))) {
      const { d, c } = find(el.dataset.inboxRead);
      d.comments = d.comments.map((x) => (x.id === c.id ? { ...x, unread: false } : x));
      K().render();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "ib-design" && onInbox()) { ui().design = e.target.value; K().render(); const s = document.getElementById("ib-design"); s && s.focus(); }
  });

  window.KD_LISTS = { inbox, releases: (r) => window.KD_RELEASES.page(r), customer: (s) => window.KD_RELEASES.customer(s) };
})();
