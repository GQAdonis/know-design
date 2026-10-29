/* KnowDesign Review — shared UI helpers: icons, formatting, dialogs, toasts, theme. */
(function () {
  "use strict";

  const ICONS = {
    pipeline: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>',
    server: '<rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    gate: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',
    bot: '<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
    layers: '<path d="m12.83 2.18 8.58 3.91a1 1 0 0 1 0 1.83l-8.58 3.9a2 2 0 0 1-1.66 0L2.6 7.92a1 1 0 0 1 0-1.83l8.58-3.9a2 2 0 0 1 1.66 0Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    brain: '<path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>',
    wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  };

  const icon = (name, cls) =>
    `<svg class="icon ${cls || ""}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;

  const MARK = (size) => `<svg viewBox="0 0 1024 1024" width="${size}" height="${size}" aria-hidden="true">
    <rect width="1024" height="1024" rx="225" fill="#0B0F14"/>
    <rect x="272" y="212" width="100" height="600" rx="50" fill="#E8EDF3"/>
    <path d="M322 262H452A250 250 0 0 1 452 762H322" fill="none" stroke="#E8EDF3" stroke-width="100" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="322" cy="512" r="62" fill="#FF6A3D"/></svg>`;

  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtDate = (t) => { const d = new Date(t); return `${MONTHS[d.getMonth()]} ${d.getDate()}`; };
  const fmtTime = (t) => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const fmtAgo = (t) => {
    const s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 60) return "just now";
    const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24); return `${d} d ago`;
  };
  const fmtIn = (t) => {
    const d = Math.round((t - Date.now()) / 864e5);
    if (d <= 0) return "today";
    return d === 1 ? "in 1 day" : `in ${d} days`;
  };

  const slug = () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint8Array(22);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(bytes) : bytes.forEach((_, i) => (bytes[i] = Math.random() * 255));
    return Array.from(bytes, (b) => a[b % a.length]).join("");
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pace = (ms) => sleep(reduced() ? Math.min(ms, 60) : ms);

  /* ── Toasts ── */
  function toast(msg, kind) {
    let host = document.querySelector(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `${icon(kind === "error" ? "alert" : "check", "icon-sm")}<div>${esc(msg)}</div>`;
    host.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  }

  /* ── Dialog: returns a promise resolving to the action id or null ── */
  function dialog({ title, body, actions, onMount, initialFocus }) {
    return new Promise((resolve) => {
      const prev = document.activeElement;
      const scrim = document.createElement("div");
      scrim.className = "scrim";
      const id = "dlg-" + Math.random().toString(36).slice(2, 8);
      scrim.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="${id}">
        <h2 id="${id}">${esc(title)}</h2>
        <div class="od-stack" style="--od-gap:16px">${body}</div>
        <div class="dialog-actions">${actions
          .map((a) => `<button class="btn ${a.kind || ""}" data-act="${a.id}">${a.label}</button>`)
          .join("")}</div></div>`;
      document.body.appendChild(scrim);

      const close = (val) => {
        scrim.classList.add("leaving");
        document.removeEventListener("keydown", onKey, true);
        setTimeout(() => { scrim.remove(); prev && prev.focus && prev.focus(); }, reduced() ? 0 : 140);
        resolve(val);
      };
      const api = { close, root: scrim };
      const onKey = (e) => {
        if (e.key === "Escape") { e.preventDefault(); close(null); }
        if (e.key === "Tab") {
          const f = scrim.querySelectorAll("button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex='-1'])");
          if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener("keydown", onKey, true);
      scrim.addEventListener("mousedown", (e) => { if (e.target === scrim) close(null); });
      scrim.querySelectorAll("[data-act]").forEach((b) =>
        b.addEventListener("click", async () => {
          const a = actions.find((x) => x.id === b.dataset.act);
          if (a.handler) {
            const ok = await a.handler(api, b);
            if (ok === false) return;
          }
          close(a.id === "cancel" ? null : a.id);
        })
      );
      onMount && onMount(api);
      const target = (initialFocus && scrim.querySelector(initialFocus)) || scrim.querySelector("[data-act]");
      target && target.focus();
    });
  }

  function busy(btn, label) {
    btn.disabled = true;
    btn.dataset.label = btn.innerHTML;
    btn.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(label)}`;
    return () => { btn.disabled = false; btn.innerHTML = btn.dataset.label; };
  }

  /* ── Theme: system default, persisted manual choice ── */
  const THEME_KEY = "kd-review-theme";
  const media = window.matchMedia("(prefers-color-scheme: light)");
  function getThemePref() { return localStorage.getItem(THEME_KEY) || "system"; }
  /* ?theme=light|dark pins the theme for this page load without saving it (used by screens.html). */
  const THEME_LOCK = (() => { const v = new URLSearchParams(location.search).get("theme"); return v === "light" || v === "dark" ? v : null; })();
  function applyTheme() {
    if (THEME_LOCK) { document.documentElement.dataset.theme = THEME_LOCK; return; }
    const pref = getThemePref();
    const t = pref === "system" ? (media.matches ? "light" : "dark") : pref;
    document.documentElement.dataset.theme = t;
  }
  function setThemePref(p) { localStorage.setItem(THEME_KEY, p); applyTheme(); }
  media.addEventListener("change", applyTheme);

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast("Link copied"); }
    catch (_) { toast("Copy blocked by the browser. Select the link and copy it."); }
  }

  window.KD_UI = { icon, MARK, esc, fmtDate, fmtTime, fmtAgo, fmtIn, slug, sleep, pace, toast, dialog, busy, getThemePref, setThemePref, applyTheme, copyText };
})();
