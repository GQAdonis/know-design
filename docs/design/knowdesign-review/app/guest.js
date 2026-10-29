/* KnowDesign Review — guest reviewer page at review.know-me.tools/r/<slug>. No account needed. */
(function () {
  "use strict";
  const { icon, MARK, esc, fmtDate, fmtAgo, pace, toast, busy, getThemePref } = window.KD_UI;
  const K = () => window.KD;
  const NAME_KEY = "kd-review-guest-name";

  const g = { adding: false, pending: null, draft: "", sentTimes: [], error: "" };
  const find = (s) => K().state.designs.find((d) => d.slug === s);
  const revoked = (s) => K().state.designs.find((d) => (d.revokedSlugs || []).includes(s));
  const guestName = () => sessionStorage.getItem(NAME_KEY) || "";

  function themeButton() {
    const p = getThemePref();
    const next = { system: "light", light: "dark", dark: "system" }[p];
    return `<button class="btn btn-ghost btn-icon" type="button" data-theme-set="${next}" aria-label="Theme: ${p}. Switch to ${next}">${icon(p === "dark" ? "moon" : p === "light" ? "sun" : "monitor")}</button>`;
  }
  const top = (d, right) => `<header class="guest-top">
      <span class="brand" style="padding:0">${MARK(32)}<span class="wordmark" style="font-size:17px">Know<b>Design</b></span></span>
      <div class="od-fill od-stack" style="--od-gap:0">${d ? `<span class="guest-title od-truncate">${esc(d.name)}</span><span class="sub" style="font-size:13px">Shared by ${esc(K().person(d.owner).name)} · v${d.version} · link works until ${fmtDate(d.expiresAt)}</span>` : ""}</div>
      ${right || ""}${themeButton()}</header>`;

  function page(s) {
    const d = find(s);
    if (!d || d.stage === "draft") {
      return `<div class="guest-shell">${top(null)}<main id="content"><div class="expired">${icon("link")}<h1 style="font-size:24px">This link doesn't work anymore</h1>
        <p class="sub">${revoked(s) ? "The author revoked it." : "It may have expired, or the address is incomplete."} Ask the person who sent it for a new one.</p></div></main></div>`;
    }
    const mode = K().state.config.identity.mode;
    const name = guestName();
    if (!name) {
      const kratos = mode === "kratos";
      return `<div class="guest-shell">${top(d)}<main id="content"><form class="welcome" id="guest-hello" novalidate>
        <div class="eyebrow">Design review</div>
        <h1>${esc(K().person(d.owner).name)} wants your feedback</h1>
        <p class="sub">Look through <b>${esc(d.name)}</b> and pin comments where something should change. It takes a couple of minutes.</p>
        ${kratos
          ? `<div class="note">${icon("shield", "icon-sm")}<span>This review is limited to KnowMe accounts.</span></div>
             <button type="button" class="btn btn-primary btn-lg" data-guest="kratos">${icon("lock", "icon-sm")}Sign in with KnowMe</button>`
          : `<div class="field"><label for="guest-name">Your name <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
              <input id="guest-name" class="input" autocomplete="name" maxlength="40" placeholder="How the team should see you" aria-describedby="guest-name-help guest-name-err" aria-invalid="${!!g.error}">
              <span class="help" id="guest-name-help">Shown next to your comments. 2–40 characters.</span>
              <div class="err" id="guest-name-err" ${g.error ? "" : "hidden"}>${g.error ? `${icon("alert", "icon-sm")}<span>${esc(g.error)}</span>` : ""}</div></div>
             <button type="submit" class="btn btn-primary btn-lg">Start reviewing</button>
             <div class="note">${icon("info", "icon-sm")}<span>No account needed. Your name and comments are visible to the design team. A cookie on this site remembers your name for ${K().state.config.identity.guestCookieDays} days.</span></div>`}
        </form></main></div>`;
    }
    return `<div class="guest-shell">${top(d, `<span class="pill guest od-fixed">${icon("users", "icon-sm")}${esc(name)}</span>`)}
      <main class="guest-main" id="content">
        <section class="stage-wrap" aria-label="Design preview">
          <div class="frame">${K().frameHtml(d)}<div class="frame-overlay ${g.adding ? "adding" : ""}" data-guest-overlay ${g.adding ? 'role="button" tabindex="0" aria-label="Click on the design to place your comment"' : ""}>${pins(d, name)}</div></div>
          <div class="od-cluster"><button class="btn ${g.adding ? "btn-cyan" : "btn-primary"}" data-guest="toggle" aria-pressed="${g.adding}">${icon(g.adding ? "x" : "pin", "icon-sm")}${g.adding ? "Cancel" : "Add a comment"}</button>
            ${g.adding ? `<span class="add-hint">${icon("info", "icon-sm")}Click the spot you want to comment on.</span>` : ""}</div>
        </section>
        <aside class="side" aria-label="Your comments">${sideHtml(d, name)}</aside>
      </main></div>`;
  }

  const mine = (d, name) => d.comments.filter((c) => c.guest && c.author === name);
  function pins(d, name) {
    const list = mine(d, name).map((c) => `<span class="pin guest" style="left:${c.x}%;top:${c.y}%" aria-hidden="true">${mine(d, name).indexOf(c) + 1}</span>`).join("");
    return list + (g.pending ? `<span class="pin pending" style="left:${g.pending.x}%;top:${g.pending.y}%" aria-hidden="true">+</span>` : "");
  }

  function sideHtml(d, name) {
    const max = K().state.config.limits.commentChars;
    const left = max - g.draft.length;
    const composer = g.pending ? `<form class="thread" style="background:var(--cyan-soft)" id="guest-form" novalidate>
        <div class="field"><label for="guest-comment">Your comment</label>
          <textarea id="guest-comment" class="textarea" maxlength="${max + 200}" placeholder="What should change here, and why?" aria-describedby="guest-count guest-comment-err">${esc(g.draft)}</textarea>
          <span class="counter ${left < 0 ? "over" : ""}" id="guest-count" aria-live="polite">${left} left</span>
          <div class="err" id="guest-comment-err" hidden></div></div>
        <div class="thread-actions"><button type="submit" class="btn btn-primary" id="guest-send">${icon("send", "icon-sm")}Send to ${esc(K().person(d.owner).name.split(" ")[0])}</button><button type="button" class="btn btn-ghost" data-guest="toggle">Cancel</button></div></form>` : "";
    const list = mine(d, name);
    const items = list.map((c, i) => `<article class="thread"><div class="thread-head">${K().avatar(name, "guest")}<div class="od-stack"><span class="who">You</span><span class="when">${fmtAgo(c.ts)}</span></div><span class="thread-num">#${i + 1}</span></div>
        <div class="thread-text">${esc(c.text)}</div>
        ${c.replies.map((r) => `<div class="reply"><div class="who">${esc(K().person(r.author).name)}</div><div>${esc(r.text)}</div></div>`).join("")}</article>`).join("");
    const empty = !g.pending && !list.length ? `<div class="empty">${icon("pin")}<h3>Pin your first comment</h3><p>Press “Add a comment”, then click the part of the design you're talking about.</p></div>` : "";
    return `<div class="side-head"><h2 class="section-title">Your comments</h2><p class="sub" style="font-size:13px">Only the design team sees these.</p></div>
      <div class="side-body">${composer}${items}${empty}</div>`;
  }

  const current = () => { const m = location.hash.match(/^#\/r\/([^/]+)/); return m ? decodeURIComponent(m[1]) : null; };
  const refreshSide = (focusSel) => {
    const s = current(); const d = find(s); const side = document.querySelector(".guest-main .side");
    if (!side || !d) return; side.innerHTML = sideHtml(d, guestName());
    const o = document.querySelector("[data-guest-overlay]"); if (o) o.innerHTML = pins(d, guestName());
    if (focusSel) { const el = document.querySelector(focusSel); el && el.focus(); }
  };

  document.addEventListener("submit", async (e) => {
    const s = current(); if (!s) return;
    const d = find(s);
    if (e.target.id === "guest-hello") {
      e.preventDefault();
      const v = document.getElementById("guest-name").value.trim();
      if (v.length < 2) { g.error = "Enter at least 2 characters so the team knows who you are."; K().render(); const n = document.getElementById("guest-name"); n && n.focus(); return; }
      g.error = ""; sessionStorage.setItem(NAME_KEY, v); K().render();
      return;
    }
    if (e.target.id === "guest-form") {
      e.preventDefault();
      const ta = document.getElementById("guest-comment"), err = document.getElementById("guest-comment-err");
      const L = K().state.config.limits;
      const v = ta.value.trim();
      const now = Date.now();
      g.sentTimes = g.sentTimes.filter((t) => now - t < 60e3);
      const msg = !v ? "Write your comment first." : v.length > L.commentChars ? `Shorten it to ${L.commentChars} characters or fewer.` : g.sentTimes.length >= L.commentsPerMin ? "You've sent a lot of comments in the last minute. Wait a moment and try again." : "";
      if (msg) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>`; ta.setAttribute("aria-invalid", "true"); ta.focus(); return; }
      const done = busy(document.getElementById("guest-send"), "Sending…");
      await pace(700);
      done();
      const name = guestName();
      d.comments = [...d.comments, { id: "g" + now.toString(36), author: name, guest: true, x: g.pending.x, y: g.pending.y, anchor: "guest pin", text: v, ts: now, resolved: false, replies: [], unread: true }];
      g.sentTimes = [...g.sentTimes, now];
      g.pending = null; g.adding = false; g.draft = "";
      K().render();
      toast(`Sent. ${K().person(d.owner).name} will see it in their inbox.`);
    }
  });
  document.addEventListener("click", (e) => {
    const s = current(); if (!s) return;
    const b = e.target.closest("[data-guest]");
    if (b && b.dataset.guest === "toggle") { g.adding = !g.adding; if (!g.adding) { g.pending = null; } K().render(); return; }
    if (b && b.dataset.guest === "kratos") { sessionStorage.setItem(NAME_KEY, "Signed-in reviewer"); toast("Signed in with KnowMe (demo)"); K().render(); return; }
    const o = e.target.closest("[data-guest-overlay]");
    if (o && g.adding) {
      const r = o.getBoundingClientRect();
      g.pending = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
      refreshSide("#guest-comment");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (!current()) return;
    if (e.target.matches && e.target.matches("[data-guest-overlay]") && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault(); g.pending = { x: 50, y: 50 }; refreshSide("#guest-comment");
    }
  });
  document.addEventListener("input", (e) => {
    if (!current() || e.target.id !== "guest-comment") return;
    g.draft = e.target.value;
    const max = K().state.config.limits.commentChars, left = max - g.draft.length;
    const c = document.getElementById("guest-count");
    if (c) { c.textContent = `${left} left`; c.classList.toggle("over", left < 0); }
  });

  window.KD_GUEST = { page, mount: () => {} };
})();
