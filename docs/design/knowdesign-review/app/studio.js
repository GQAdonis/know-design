/* KnowDesign Review — Studio: cloud design sessions driven by a UAR agent over AG-UI.
   Replaces the desktop daemon's local CLI agents (Claude Code, Codex…) with the same
   block-level experience: reasoning, tool steps, approvals, files and a live preview. */
(function () {
  "use strict";
  const { icon, esc, fmtAgo, fmtTime, toast, dialog } = window.KD_UI;
  const K = () => window.KD;
  const U = () => window.KD_UAR;

  /* ── Demo screen the recorded stream "writes" ── */
  window.KD_STUDIO_DEMO = {
    historyScreen(withIcon, filtered) {
      const badge = withIcon
        ? '<svg viewBox="0 0 24 24" width="1.1vw" height="1.1vw" fill="none" stroke="#22C55E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>'
        : '<span style="display:inline-block;width:.9vw;height:.9vw;border-radius:50%;background:#22C55E"></span>';
      const row = (name, when, len, dev, consent) => `<div class="r"><div><b>${name}</b><div class="s">${when}</div></div><div class="mono">${len}</div><div class="s">${dev}</div><div class="c ${consent ? "" : "no"}">${consent ? badge + "Consent on file" : "&#9888; No consent"}</div></div>`;
      return `<!doctype html><html><head><meta charset="utf-8"><style>
        *{box-sizing:border-box;margin:0}html,body{height:100%}
        body{font-family:Inter,system-ui,sans-serif;font-size:1.2vw;background:#0B0F14;color:#E8EDF3;display:grid;grid-template-columns:22% 1fr;overflow:hidden}
        aside{background:#111620;padding:2.2vw 1.6vw;display:grid;gap:1vw;align-content:start}
        .logo{font-family:"Space Grotesk",sans-serif;font-weight:700;font-size:1.7vw}.logo b{color:#FF6A3D}
        .nav{padding:.8vw 1vw;border-radius:.6vw;color:#A7B0BC}.nav.on{background:#2B1A18;color:#E8EDF3}
        main{padding:2.4vw;display:grid;gap:1.2vw;align-content:start}
        h1{font-family:"Space Grotesk",sans-serif;font-size:2.6vw}
        .mono{font-family:"JetBrains Mono",monospace;font-size:1vw}
        .f{display:flex;gap:.6vw}.f span{padding:.4vw 1vw;border-radius:2vw;background:#253044;color:#A7B0BC;font-size:1vw}.f span.on{background:#2B1A18;color:#E8EDF3}
        .r{display:grid;grid-template-columns:1.4fr .6fr 1fr 1.2fr;gap:1vw;align-items:center;background:#161D29;border-radius:.8vw;padding:1vw 1.2vw}
        .s{color:#A7B0BC;font-size:1vw}.c{display:flex;gap:.5vw;align-items:center;font-size:1vw;color:#22C55E}.c.no{color:#F59E0B}
      </style></head><body>
        <aside><div class="logo">Know<b>Me</b></div><div class="nav">Consult capture</div><div class="nav on">Sessions</div><div class="nav">Patients</div><div class="nav">Settings</div></aside>
        <main><h1>Sessions</h1>
          ${filtered ? '<div class="f"><span class="on">Today</span><span>This week</span><span>Older</span></div>' : ""}
          ${row("Renata Kaminski", "Yesterday · 12:30", "18 min", "iPhone · Front desk", true)}
          ${row("Omar Haddad", "Yesterday · 14:05", "26 min", "Laptop · Room 2", false)}
          ${row("Lea Fontaine", "Mon · 09:15", "12 min", "iPhone · Dr. office", true)}
        </main></body></html>`;
    },
  };

  /* ── State ── */
  const S = () => {
    const st = K().state;
    if (!st.studio) st.studio = { sessions: [seedSession(), watchSession()], draft: null };
    return st.studio;
  };
  /* A teammate's run you can watch but not steer. */
  function watchSession() {
    return {
      id: "s-sam-live", title: "Consult Capture — Sessions screen", project: "consult-capture-htmx.html", threadId: "kd-thread-sam",
      owner: "sam", watch: true, follow: true, status: "running", source: "demo", createdAt: Date.now() - 4 * 60e3,
      runs: ["kd-run-sam-1"], messages: [], files: [], events: 0, watchers: ["travis", "priya"],
      blocks: [{ type: "user", who: "Sam Okafor", text: "Add a Sessions screen to Consult Capture so front-desk staff can find yesterday's consults. Show which device recorded each one and whether consent is on file." }],
    };
  }

  function seedSession() {
    const html = window.KD_DATA.previews.meet(2);
    return {
      id: "s-meet", title: "Know Meet brand kit — darker tiles", project: "know-meet-brand-kit.html", threadId: "kd-thread-meet",
      status: "done", source: "demo", createdAt: Date.now() - 26 * 3600e3, runs: ["kd-run-meet-1"], messages: [],
      files: [{ path: "know-meet-brand-kit.html", bytes: html.length, content: html }], selectedFile: 0,
      blocks: [
        { type: "user", text: "Make the brand kit tiles one step darker so the ember node reads better." },
        { type: "think", text: "Tiles sit on canvas; raising contrast means moving tiles from raised to surface, not changing ember.", done: true, secs: 1.4 },
        { type: "tool", id: "t1", name: "workspace.write_file", args: '{"path":"know-meet-brand-kit.html","mode":"replace"}', state: "completed", result: '{"written":"know-meet-brand-kit.html"}' },
        { type: "text", text: "Moved the tiles to the surface tone. The ember node now stands out more against them." },
      ],
    };
  }
  const session = (id) => S().sessions.find((s) => s.id === id);
  const cfg = () => K().state.config.runtime;
  const isLive = () => !!cfg().baseUrl;

  /* ── Event reducer: AG-UI frames → blocks ── */
  function reduce(s, e) {
    const last = (pred) => { for (let i = s.blocks.length - 1; i >= 0; i--) if (pred(s.blocks[i])) return s.blocks[i]; return null; };
    switch (e.type) {
      case "RUN_STARTED": s.blocks.push({ type: "run", runId: e.runId, at: Date.now() }); break;
      case "REASONING_START": case "THINKING_START": case "REASONING_MESSAGE_START":
        s.blocks.push({ type: "think", id: e.messageId, text: "", started: performance.now(), done: false }); break;
      case "REASONING_MESSAGE_CONTENT": case "REASONING_MESSAGE_CHUNK": {
        const b = last((x) => x.type === "think" && !x.done) || (s.blocks.push({ type: "think", text: "", started: performance.now() }), s.blocks[s.blocks.length - 1]);
        b.text += e.delta || ""; break;
      }
      case "REASONING_MESSAGE_END": case "REASONING_END": case "THINKING_END": {
        const b = last((x) => x.type === "think" && !x.done); if (b) { b.done = true; b.secs = (performance.now() - b.started) / 1000; } break;
      }
      case "TEXT_MESSAGE_START": s.blocks.push({ type: "text", id: e.messageId, text: "", done: false }); break;
      case "TEXT_MESSAGE_CONTENT": case "TEXT_MESSAGE_CHUNK": {
        const b = last((x) => x.type === "text" && (!e.messageId || x.id === e.messageId)) || (s.blocks.push({ type: "text", id: e.messageId, text: "" }), s.blocks[s.blocks.length - 1]);
        b.text += e.delta || ""; break;
      }
      case "TEXT_MESSAGE_END": {
        const b = last((x) => x.type === "text" && x.id === e.messageId);
        if (b) { b.done = true; s.messages.push({ id: b.id || U().rid("m"), role: "assistant", content: b.text }); }
        break;
      }
      case "TOOL_CALL_START": s.blocks.push({ type: "tool", id: e.toolCallId, name: e.toolCallName, args: "", state: "running" }); break;
      case "TOOL_CALL_ARGS": case "TOOL_CALL_CHUNK": { const b = last((x) => x.type === "tool" && x.id === e.toolCallId); if (b) b.args += e.delta || ""; break; }
      case "TOOL_CALL_END": { const b = last((x) => x.type === "tool" && x.id === e.toolCallId); if (b) b.state = "awaiting-result"; break; }
      case "TOOL_CALL_RESULT": { const b = last((x) => x.type === "tool" && x.id === e.toolCallId); if (b) { b.state = "completed"; b.result = e.content; } break; }
      case "STEP_STARTED": s.blocks.push({ type: "step", name: e.stepName, done: false }); break;
      case "STEP_FINISHED": { const b = last((x) => x.type === "step" && x.name === e.stepName); if (b) b.done = true; break; }
      case "STATE_SNAPSHOT": if (e.snapshot && Array.isArray(e.snapshot.files)) s.files = e.snapshot.files.map((f) => ({ ...f })); break;
      case "STATE_DELTA": applyDelta(s, e.delta || []); break;
      case "RUN_FINISHED": {
        const out = e.outcome || {};
        if (out.type === "interrupt") {
          s.status = "awaiting";
          (out.interrupts || []).forEach((it) => {
            const tool = last((x) => x.type === "tool" && x.id === it.toolCallId);
            if (tool) tool.state = "paused";
            s.blocks.push({ type: "approval", interrupt: it, tool: tool ? tool.name : (it.metadata && it.metadata.toolName) || "tool", args: tool ? tool.args : "", decided: null });
          });
        } else {
          s.status = "done";
          s.blocks.forEach((b) => { if (b.type === "tool" && b.state === "awaiting-result") b.state = "completed"; });
        }
        break;
      }
      case "RUN_ERROR":
        s.status = "error";
        s.blocks.push({ type: "error", message: e.message || "The run failed.", code: e.code || "" });
        s.blocks.forEach((b) => { if (b.type === "tool" && (b.state === "running" || b.state === "awaiting-result")) b.state = "failed"; });
        break;
      default: break; // CUSTOM, ACTIVITY_* and future types are ignored, never dumped as raw JSON
    }
  }
  function applyDelta(s, ops) {
    let files = s.files.slice();
    ops.forEach((op) => {
      const m = /^\/files\/(-|\d+)$/.exec(op.path || "");
      if (!m) return;
      if (op.op === "add") { if (m[1] === "-") files = [...files, op.value]; else files.splice(Number(m[1]), 0, op.value); }
      if (op.op === "replace") files = files.map((f, i) => (i === Number(m[1]) ? op.value : f));
      if (op.op === "remove") files = files.filter((_, i) => i !== Number(m[1]));
    });
    s.files = files;
    s.selectedFile = Math.max(0, files.length - 1);
  }

  /* ── Run control ── */
  let raf = 0;
  const schedule = (s) => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; refresh(s); }); };

  async function segment(s, input, ctx) {
    s.status = "running";
    s.runs = [...s.runs, input.runId];
    s.source = isLive() ? "live" : "demo";
    const handle = U().run(cfg(), s, input, ctx, (e, id) => { if (id) s.lastEventId = id; reduce(s, e); schedule(s); });
    s.handle = handle;
    refresh(s);
    await handle.promise;
    if (s.handle === handle && s.status === "running" && !s.stopped) {
      reduce(s, { type: "RUN_ERROR", code: "stream_ended", message: "The stream ended without a finish event. Use Reconnect to pick it up." });
    }
    refresh(s);
  }

  function start(s, prompt) {
    const msg = { id: U().rid("m"), role: "user", content: prompt };
    s.messages = [...s.messages, msg];
    s.blocks.push({ type: "user", text: prompt });
    const input = U().runAgentInput({
      threadId: s.threadId, runId: U().rid("kd-run"), messages: s.messages,
      context: [{ description: "KnowDesign project file", value: s.project }, { description: "Design system", value: "KnowMe Flat 2.0, light and dark" }],
    });
    const followUp = s.runs.length ? prompt : null;
    return segment(s, input, { followUp, approvedBefore: s.approvedFetch, hasHistory: s.files.some((f) => /consult-history/.test(f.path)) });
  }

  function decide(s, idx, approved) {
    const b = s.blocks[idx];
    if (!b || b.decided !== null) return;
    b.decided = approved ? "approved" : "denied";
    const tool = s.blocks.find((x) => x.type === "tool" && x.id === b.interrupt.toolCallId);
    if (tool) tool.state = approved ? "running" : "denied";
    if (b.tool === "web.fetch") s.approvedFetch = approved;
    const input = U().runAgentInput({
      threadId: s.threadId, runId: U().rid("kd-run"), parentRunId: s.runs[s.runs.length - 1], messages: [],
      resume: [{ interruptId: b.interrupt.id, status: "resolved", payload: { approved } }],
    });
    segment(s, input, {});
  }

  function stop(s) {
    if (!s.handle || s.status !== "running") return;
    s.stopped = true;
    s.handle.abort();
    s.status = "stopped";
    s.blocks.push({ type: "notice", text: "You stopped the stream. The run may still be working on the runtime — Reconnect to follow it again." });
    refresh(s);
  }
  async function reconnect(s) {
    if (!s.handle) return;
    s.stopped = false;
    s.status = "running";
    s.blocks = s.blocks.filter((b) => !(b.type === "notice" || (b.type === "error" && b.code === "stream_ended")));
    s.blocks.push({ type: "notice", text: `Reconnected to ${s.runs[s.runs.length - 1]} from event ${s.lastEventId || "start"}.` });
    const h = U().reconnect(cfg(), s, s.handle, (e, id) => { if (id) s.lastEventId = id; reduce(s, e); schedule(s); });
    s.handle = h;
    refresh(s);
    await h.promise;
    if (s.handle === h && s.status === "running" && !s.stopped) reduce(s, { type: "RUN_ERROR", code: "stream_ended", message: "The stream ended without a finish event." });
    refresh(s);
  }

  /* ── Rendering ── */
  const STATE_LABEL = { running: "Running", "awaiting-result": "Waiting for result", completed: "Done", failed: "Failed", paused: "Needs approval", denied: "Not run — denied" };
  const prettyArgs = (a) => { try { return JSON.stringify(JSON.parse(a), null, 2); } catch (_) { return a; } };
  const shortResult = (r) => { if (!r) return ""; try { const o = JSON.parse(r); return Object.entries(o).slice(0, 4).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? "…" : v}`).join(" · "); } catch (_) { return String(r).slice(0, 140); } };

  function blockHtml(s, b, i) {
    switch (b.type) {
      case "user": return `<div class="block s-user"><div class="who">${esc(b.who || "You")}</div><div class="thread-text">${esc(b.text)}</div></div>`;
      case "run": return `<div class="s-run mono">${icon("server", "icon-sm")}Run ${esc(b.runId)} · ${fmtTime(b.at)}</div>`;
      case "step": return `<div class="s-step"><span class="pill ${b.done ? "stage-approved" : "stage-review"}">${b.done ? icon("check", "icon-sm") : '<span class="dot" aria-hidden="true"></span>'}${esc(b.name)}</span></div>`;
      case "think": return `<details class="block block-think"><summary>${icon("chevron", "icon-sm chev")}${icon("brain", "icon-sm")}<span>${b.done ? "Thought" : "Thinking…"}</span><span class="mono">${b.secs ? b.secs.toFixed(1) + " s" : ""}</span></summary><div class="think-body"><div>${esc(b.text)}</div></div></details>`;
      case "text": return `<div class="block block-text"><p style="white-space:pre-wrap">${esc(b.text)}${b.done === false ? '<span class="caret" aria-hidden="true"></span>' : ""}</p></div>`;
      case "tool": {
        const st = b.state;
        const cls = st === "completed" ? "completed" : st === "failed" || st === "denied" ? "failed" : st === "paused" ? "pending" : "running";
        const dot = cls === "running" ? '<span class="pulse" aria-hidden="true"></span>' : icon(cls === "completed" ? "check" : cls === "failed" ? "x" : "lock", "icon-sm");
        const isWrite = /write_file/.test(b.name) && st === "completed";
        let path = ""; try { path = JSON.parse(b.args).path || ""; } catch (_) { /* partial args */ }
        return `<div class="block tool ${cls === "failed" ? "failed" : ""}">
          <div class="tool-head">${icon("wrench", "icon-sm")}<span class="tool-name">${esc(b.name)}</span><span class="tool-state ${cls}">${dot}${STATE_LABEL[st] || st}</span></div>
          ${b.result ? `<div class="tool-summary">${esc(shortResult(b.result))}</div>` : st === "denied" ? `<div class="tool-summary">You denied this call, so it never ran.</div>` : ""}
          ${isWrite && path ? `<div><button class="btn" type="button" data-studio-file="${esc(path)}">${icon("external", "icon-sm")}Show ${esc(path)}</button></div>` : ""}
          <details><summary>${icon("chevron", "icon-sm chev")}Arguments</summary><pre>${esc(prettyArgs(b.args))}</pre></details></div>`;
      }
      case "approval": {
        const it = b.interrupt, md = it.metadata || {};
        if (b.decided) return `<div class="block confirm-block ${b.decided === "approved" ? "done" : ""}"><div class="t">${icon(b.decided === "approved" ? "check" : "x")}${b.by ? esc(K().person(b.by).name) + " " + (b.decided === "approved" ? "approved" : "denied") : b.decided === "approved" ? "Approved" : "Denied"} · ${esc(b.tool)}</div><p>Sent to the runtime as a resume for interrupt <span class="mono">${esc(it.id)}</span>.</p></div>`;
        if (s.watch) return `<div class="block confirm-block" role="status"><div class="t">${icon("shield")}Waiting for ${esc(K().person(s.owner).name)} to approve ${esc(b.tool)}</div>
          <p>${esc(it.message || "This tool call needs the owner's approval.")} Only the person who started the run can answer.</p>
          <dl class="kv"><dt>Why it asks</dt><dd>${esc(md.riskReason || it.reason)}</dd></dl><pre class="s-pre">${esc(prettyArgs(b.args))}</pre>
          <div class="s-run"><span class="pulse" aria-hidden="true"></span>The run is paused until they decide.</div></div>`;
        return `<div class="block confirm-block" role="group" aria-labelledby="apr-${i}">
          <div class="t" id="apr-${i}">${icon("shield")}The agent wants to run ${esc(b.tool)}</div>
          <p>${esc(it.message || "This tool call needs your approval.")}</p>
          <dl class="kv"><dt>Why it asks</dt><dd>${esc(md.riskReason || it.reason)}</dd><dt>Tool call</dt><dd>${esc(it.toolCallId || "")}</dd></dl>
          <pre class="s-pre">${esc(prettyArgs(b.args))}</pre>
          <div class="od-cluster"><button class="btn btn-danger" data-studio-decide="${i}:deny">Deny</button><button class="btn btn-primary" data-studio-decide="${i}:approve">${icon("check", "icon-sm")}Approve and continue</button></div></div>`;
      }
      case "error": return `<div class="block tool failed" role="alert"><div class="tool-head">${icon("alert", "icon-sm")}<span class="tool-name">Run error${b.code ? " · " + esc(b.code) : ""}</span></div><div class="tool-summary">${esc(b.message)}</div></div>`;
      case "notice": return `<div class="s-run">${icon("info", "icon-sm")}${esc(b.text)}</div>`;
      case "note": return `<div class="block s-note"><div class="who">${esc(b.who)} → ${esc(b.to)} · <span class="when">${fmtTime(b.at)}</span></div><div class="thread-text">${esc(b.text)}</div></div>`;
      default: return "";
    }
  }

  function statusPill(s) {
    const map = { running: ["stage-review", "Running"], awaiting: ["stage-changes", "Needs you"], done: ["stage-approved", "Done"], error: ["stage-released", "Error"], stopped: ["stage-draft", "Stopped"], idle: ["stage-draft", "Idle"] };
    const [c, l0] = map[s.status] || map.idle;
    const l = s.watch && s.status === "awaiting" ? `Waiting on ${K().person(s.owner).name.split(" ")[0]}` : l0;
    return `<span class="pill ${c}"><span class="dot" aria-hidden="true"></span>${l}</span>`;
  }

  function watchThreadHtml(s) {
    const owner = K().person(s.owner);
    const people = [s.owner, ...s.watchers];
    const presence = people.map((id) => { const p = K().person(id); return K().avatar(p.name, id === s.owner ? "me" : p.me ? "guest" : ""); }).join("");
    const names = people.map((id) => (K().person(id).me ? "You" : K().person(id).name.split(" ")[0])).join(", ");
    const blocks = s.blocks.map((b, i) => blockHtml(s, b, i)).join("");
    const live = s.status === "running" || s.status === "awaiting";
    return `<div class="s-thread-head">${statusPill(s)}<span class="od-fill od-truncate">Watching <b>${esc(owner.name)}</b>'s run</span>
        <div class="avatar-stack" title="${esc(names)}" aria-label="In this session: ${esc(names)}">${presence}</div>
        <button class="btn ${s.follow ? "btn-cyan" : ""}" type="button" data-watch="follow" aria-pressed="${!!s.follow}">${icon(s.follow ? "check" : "refresh", "icon-sm")}${s.follow ? "Following live" : "Follow live"}</button></div>
      <div class="watch-bar"><span class="pill">${icon("lock", "icon-sm")}Read-only</span><span class="mono sub od-truncate od-fill">thread ${esc(s.threadId)} · event ${s.events || 0}${live ? "" : " · finished"}</span>
        ${!s.follow && live ? `<button class="btn" type="button" data-watch="latest">${icon("chevron", "icon-sm")}Jump to latest</button>` : ""}</div>
      <div class="s-blocks" id="studio-blocks" aria-live="${s.follow ? "polite" : "off"}" aria-busy="${s.status === "running"}">${blocks}</div>
      <form class="od-stack" style="--od-gap:4px" data-watch-form novalidate>
        <div class="composer"><label class="sr-only" for="watch-note">Note to ${esc(owner.name)}</label>
          <input id="watch-note" class="input" autocomplete="off" maxlength="600" placeholder="Send ${esc(owner.name.split(" ")[0])} a note" aria-describedby="watch-note-help watch-note-err">
          <button class="btn btn-primary btn-icon" type="submit" aria-label="Send note">${icon("send", "icon-sm")}</button></div>
        <span class="help" id="watch-note-help">${esc(owner.name.split(" ")[0])} sees notes in their session. Watching never steers the agent or answers its approvals.</span>
        <div class="err" id="watch-note-err" hidden></div></form>`;
  }

  function threadHtml(s) {
    if (s.watch) return watchThreadHtml(s);
    const blocks = s.blocks.map((b, i) => blockHtml(s, b, i)).join("");
    const running = s.status === "running";
    const controls = running
      ? `<button class="btn" data-studio="stop">${icon("x", "icon-sm")}Stop</button>`
      : (s.status === "stopped" || (s.status === "error" && s.handle)) ? `<button class="btn btn-cyan" data-studio="reconnect">${icon("refresh", "icon-sm")}Reconnect</button>` : "";
    const canAsk = s.status === "done" || s.status === "error" || s.status === "stopped";
    return `<div class="s-thread-head">${statusPill(s)}<span class="mono sub od-truncate od-fill">thread ${esc(s.threadId)}</span>${controls}</div>
      <div class="s-blocks" id="studio-blocks" aria-live="polite" aria-busy="${running}">${blocks}</div>
      <form class="composer" data-studio-form><label class="sr-only" for="studio-ask">Message the design agent</label>
        <input id="studio-ask" class="input" autocomplete="off" placeholder="${s.status === "awaiting" ? "Answer the approval above first" : canAsk ? "Ask for a change" : "The agent is working…"}" ${canAsk ? "" : "disabled"}>
        <button class="btn btn-primary btn-icon" type="submit" aria-label="Send" ${canAsk ? "" : "disabled"}>${icon("send", "icon-sm")}</button></form>`;
  }

  function projectHtml(s) {
    if (!s.files.length) return `<div class="empty">${icon("layers")}<h3>No files yet</h3><p>Files the agent writes into the cloud workspace show up here with a live preview.</p></div>`;
    const sel = s.files[s.selectedFile || 0] || s.files[0];
    const files = s.files.map((f, i) => `<button type="button" class="s-file" data-studio-pick="${i}" aria-current="${f === sel}">${icon("layers", "icon-sm")}<span class="od-truncate od-fill">${esc(f.path)}</span><span class="mono sub">${Math.max(1, Math.round((f.bytes || (f.content || "").length) / 1024))} KB</span></button>`).join("");
    return `<div class="od-stack" style="--od-gap:4px">${files}</div>
      <div class="frame" data-studio-frame="${esc(sel.path)}:${(sel.content || "").length}">${sel.content ? `<iframe sandbox="" referrerpolicy="no-referrer" title="Preview of ${esc(sel.path)}" srcdoc="${esc(sel.content)}"></iframe>` : `<div class="empty" style="height:100%">${icon("lock")}<p>The runtime didn't send this file's content. Open it from the workspace.</p></div>`}</div>
      ${s.watch ? `<p class="sub" style="font-size:13px">${icon("lock", "icon-sm")} Only ${esc(K().person(s.owner).name)} can publish this session.</p>` : `<button class="btn btn-primary btn-lg" data-studio="publish" ${sel.content && s.status !== "running" && s.status !== "awaiting" ? "" : "disabled"}>${icon("upload", "icon-sm")}Publish for review</button>
      <p class="sub" style="font-size:13px">Publishing hands this file to the review hub. The pipeline, inbox and approvals work the same as for desktop designs.</p>`}`;
  }

  function runtimeBadge() {
    return isLive()
      ? `<span class="pill stage-approved"><span class="dot" aria-hidden="true"></span>Live · ${esc(cfg().baseUrl.replace(/^https?:\/\//, ""))}</span>`
      : `<a class="pill" href="#/settings/runtime" title="Set a runtime URL in Settings">${icon("info", "icon-sm")}Demo stream — set a UAR URL</a>`;
  }

  function newSessionHtml() {
    const d = S().draft || (S().draft = { title: "", project: "consult-capture-htmx.html", brief: "Add a Sessions screen to Consult Capture so front-desk staff can find yesterday's consults. Show which device recorded each one and whether consent is on file.", errors: {} });
    const projects = [["consult-capture-htmx.html", "Consult Capture"], ["patient-chat-storyboard.html", "Patient Chat storyboard"], ["know-meet-brand-kit.html", "Know Meet brand kit"], ["", "New blank project"]];
    const err = (k) => d.errors[k] ? `<div class="err" id="ns-${k}-err">${icon("alert", "icon-sm")}<span>${esc(d.errors[k])}</span></div>` : "";
    return `<form class="panel form-stack" id="studio-new" novalidate>
      <div class="od-stack" style="--od-gap:6px"><div class="eyebrow">New cloud session</div><h2 class="section-title">What should the agent design?</h2>
        <p class="sub">Runs on the Universal Agent Runtime in the cloud — no CLI on your machine. You see every step and approve anything that leaves the workspace.</p></div>
      <div class="field"><label for="ns-brief">Brief <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
        <textarea id="ns-brief" class="textarea" style="min-height:140px" aria-invalid="${!!d.errors.brief}" aria-describedby="ns-brief-help ${d.errors.brief ? "ns-brief-err" : ""}">${esc(d.brief)}</textarea>
        <span class="help" id="ns-brief-help">Say what to make and who it's for. At least 12 characters.</span>${err("brief")}</div>
      <div class="two-col">
        <div class="field"><label for="ns-project">Start from</label><select id="ns-project" class="select">${projects.map(([v, l]) => `<option value="${v}" ${d.project === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
        <div class="field"><label for="ns-title">Session name</label><input id="ns-title" class="input" maxlength="60" value="${esc(d.title)}" aria-describedby="ns-title-help"><span class="help" id="ns-title-help">Optional. We'll name it from the brief.</span></div>
      </div>
      <div class="od-cluster">${runtimeBadge()}<span class="od-fill"></span><button type="submit" class="btn btn-primary btn-lg">${icon("sparkles", "icon-sm")}Start session</button></div>
    </form>`;
  }

  function listHtml(activeId) {
    const item = (s) => `<a class="s-item" href="#/studio/${s.id}" ${s.id === activeId ? 'aria-current="page"' : ""}>
        <span class="t od-clamp-2">${esc(s.title)}</span>${s.watch ? `<span class="d od-row">${K().avatar(K().person(s.owner).name)}<span class="when">${esc(K().person(s.owner).name)}</span></span>` : ""}<span class="d od-row">${statusPill(s)}<span class="when">${fmtAgo(s.createdAt)}</span></span></a>`;
    const all = S().sessions.slice().sort((a, b) => b.createdAt - a.createdAt);
    const team = all.filter((s) => s.watch), mine = all.filter((s) => !s.watch);
    return `<a class="btn btn-primary" href="#/studio" ${!activeId ? 'aria-current="page"' : ""}>${icon("plus", "icon-sm")}New session</a>
      ${team.length ? `<div class="od-stack" style="--od-gap:4px"><div class="eyebrow s-group">Team · watch live</div>${team.map(item).join("")}</div>` : ""}
      <div class="od-stack" style="--od-gap:4px"><div class="eyebrow s-group">Your sessions</div>${mine.map(item).join("") || '<p class="sub" style="font-size:13px">None yet.</p>'}</div>`;
  }

  function page(r, id) {
    const s = id ? session(id) : null;
    const center = s
      ? `<section class="s-thread panel panel-tight" aria-label="Agent conversation" id="studio-thread">${threadHtml(s)}</section>`
      : newSessionHtml();
    const right = s ? `<aside class="s-project panel panel-tight" aria-label="Project files and preview" id="studio-project"><div class="eyebrow">Cloud workspace · ${esc(s.project || "new project")}</div>${projectHtml(s)}</aside>` : explainerHtml();
    const body = `<div class="studio"><nav class="s-list" aria-label="Sessions">${listHtml(s && s.id)}</nav>${center}${right}</div>`;
    const crumb = s && s.watch ? `<a href="#/studio">Studio</a>${icon("chevron", "icon-sm")}<span>Watching ${esc(K().person(s.owner).name)}</span>`
      : s ? `<a href="#/studio">Studio</a>${icon("chevron", "icon-sm")}<span class="mono">${esc(s.source === "live" ? "live runtime" : "demo stream")}</span>` : null;
    return K().shell(r, s ? s.title : "Studio", crumb, body, s ? runtimeBadge() : "");
  }

  function explainerHtml() {
    return `<aside class="panel panel-tight od-stack" style="--od-gap:12px" aria-label="How Studio works"><div class="eyebrow">Desktop vs cloud</div>
      <dl class="kv"><dt>Desktop</dt><dd>daemon → local CLI agent (Claude Code, Codex…) → files on disk</dd><dt>Cloud</dt><dd>hub → UAR /api/uar/ag-ui/agents/{id} → workspace tools</dd><dt>Same</dt><dd>AG-UI events · approval pauses · file preview · publish</dd></dl>
      <p class="sub" style="font-size:14px">Approvals use UAR interrupts: the stream stops with <span class="mono">RUN_FINISHED</span> and an interrupt, and your answer starts the next run with <span class="mono">parentRunId</span> and <span class="mono">resume[]</span>.</p>
      <a class="btn" href="storyboard.html#studio">${icon("external", "icon-sm")}See the Studio flow step by step</a></aside>`;
  }

  /* ── Partial refresh: thread and project only ── */
  function refresh(s) {
    const m = location.hash.match(/^#\/studio\/([^/]+)/);
    if (!m || m[1] !== s.id) { const li = document.querySelector(".s-list"); if (li) li.innerHTML = listHtml(m && m[1]); return; }
    const th = document.getElementById("studio-thread");
    if (th) {
      const box = document.getElementById("studio-blocks");
      const near = s.watch ? s.follow : box ? box.scrollHeight - box.scrollTop - box.clientHeight < 80 : true;
      const focusId = document.activeElement && ["studio-ask", "watch-note"].includes(document.activeElement.id) ? document.activeElement.id : null;
      const hadFocus = !!focusId;
      const typed = hadFocus ? document.activeElement.value : "";
      const openDetails = box ? [...box.querySelectorAll("details")].map((d) => d.open) : [];
      th.innerHTML = threadHtml(s);
      const nb = document.getElementById("studio-blocks");
      if (nb) { [...nb.querySelectorAll("details")].forEach((d, i) => { if (openDetails[i]) d.open = true; }); if (near) nb.scrollTop = nb.scrollHeight; }
      if (hadFocus) { const a = document.getElementById(focusId); if (a && !a.disabled) { a.value = typed; a.focus(); } }
    }
    const pr = document.getElementById("studio-project");
    if (pr) {
      const frame = pr.querySelector("[data-studio-frame]");
      const sel = s.files[s.selectedFile || 0];
      const key = sel ? `${sel.path}:${(sel.content || "").length}` : "";
      if (!frame || frame.dataset.studioFrame !== key || pr.dataset.files !== String(s.files.length) || pr.dataset.status !== s.status) {
        pr.innerHTML = `<div class="eyebrow">Cloud workspace · ${esc(s.project || "new project")}</div>${projectHtml(s)}`;
        pr.dataset.files = String(s.files.length); pr.dataset.status = s.status;
      }
    }
    const li = document.querySelector(".s-list"); if (li) li.innerHTML = listHtml(s.id);
    const pill = document.querySelector(".topbar .od-row > .pill, .topbar .od-row > a.pill");
    if (pill) pill.outerHTML = runtimeBadge();
  }

  /* ── Watching: the hub fans the owner's AG-UI stream out to watchers.
     In the prototype the fan-out is the recorded demo stream. ── */
  const later = (ms) => new Promise((r) => setTimeout(r, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? Math.min(ms, 30) : ms));
  async function play(s, frames, from) {
    for (let i = from; i < frames.length; i++) {
      const t = frames[i].type;
      await later(t.endsWith("_CONTENT") || t === "TOOL_CALL_ARGS" ? 70 : t === "TOOL_CALL_END" ? 800 : 240);
      reduce(s, frames[i]); s.events += 1; s.lastEventId = `${s.runs[s.runs.length - 1]}:${i}`;
      schedule(s);
    }
  }
  async function startWatch(s) {
    if (s.watchStarted) return;
    s.watchStarted = true;
    if (isLive()) s.blocks.push({ type: "notice", text: "Your runtime URL is set, but watching another person's run needs the hub to relay their stream. UAR's reconnect stream only serves the run's owner, so this view shows the recorded stream." });
    const frames = U().demoFrames({ threadId: s.threadId, runId: s.runs[0] }, {});
    const skip = Math.floor(frames.length * 0.4);
    frames.slice(0, skip).forEach((f) => reduce(s, f));
    s.blocks.forEach((b) => { if (b.type === "think" && b.done) b.secs = 2.1; });
    s.events = skip;
    s.blocks.push({ type: "notice", text: `You joined 4 minutes in. Caught up on ${skip} earlier events; new ones stream live.` });
    s.status = "running";
    refresh(s);
    await play(s, frames, skip);
    await later(6500);
    const apr = s.blocks.find((b) => b.type === "approval" && !b.decided);
    if (!apr) return;
    apr.decided = "approved"; apr.by = s.owner;
    const tool = s.blocks.find((x) => x.type === "tool" && x.id === apr.interrupt.toolCallId); if (tool) tool.state = "running";
    const run2 = U().rid("kd-run-sam");
    s.runs = [...s.runs, run2];
    s.status = "running";
    schedule(s);
    const f2 = U().demoFrames({ threadId: s.threadId, runId: run2, parentRunId: s.runs[0], resume: [{ interruptId: apr.interrupt.id, status: "resolved", payload: { approved: true } }] }, {});
    await play(s, f2, 0);
    s.blocks.push({ type: "notice", text: `${K().person(s.owner).name}'s run finished. They decide whether to publish it.` });
    schedule(s);
  }

  function mount(id) {
    const ws = id && session(id);
    if (ws && ws.watch) startWatch(ws);
    const b = document.getElementById("studio-blocks");
    if (b) b.scrollTop = b.scrollHeight;
  }

  /* ── Events ── */
  const cur = () => { const m = location.hash.match(/^#\/studio(?:\/([^/]+))?/); return m ? { id: m[1] || null } : null; };

  document.addEventListener("submit", (e) => {
    const c = cur(); if (!c) return;
    if (e.target.id === "studio-new") {
      e.preventDefault();
      const d = S().draft;
      d.brief = document.getElementById("ns-brief").value; d.title = document.getElementById("ns-title").value; d.project = document.getElementById("ns-project").value;
      d.errors = d.brief.trim().length < 12 ? { brief: "Describe what to design in at least 12 characters." } : {};
      if (d.errors.brief) { K().render(); const t = document.getElementById("ns-brief"); t && t.focus(); return; }
      const brief = d.brief.trim();
      const s = { id: U().rid("s"), title: d.title.trim() || (brief.length > 56 ? brief.slice(0, 54).replace(/\s+\S*$/, "") + "…" : brief), project: d.project,
        threadId: U().rid("kd-thread"), status: "idle", source: isLive() ? "live" : "demo", createdAt: Date.now(), runs: [], messages: [], files: [], blocks: [] };
      S().sessions = [...S().sessions, s];
      S().draft = null;
      location.hash = `#/studio/${s.id}`;
      start(s, brief);
      return;
    }
    const wf = e.target.closest("[data-watch-form]");
    if (wf && c.id) {
      e.preventDefault();
      const s = session(c.id), inp = document.getElementById("watch-note"), err = document.getElementById("watch-note-err");
      const v = inp.value.trim();
      const msg = !v ? "Write the note first." : v.length > 500 ? "Keep notes under 500 characters." : "";
      if (msg) { err.hidden = false; err.innerHTML = `${icon("alert", "icon-sm")}<span>${esc(msg)}</span>`; inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
      inp.value = "";
      s.blocks.push({ type: "note", who: "You", to: K().person(s.owner).name, text: v, at: Date.now() });
      refresh(s);
      toast(`Note sent to ${K().person(s.owner).name}`);
      const again = document.getElementById("watch-note"); again && again.focus();
      return;
    }
    const f = e.target.closest("[data-studio-form]");
    if (f && c.id) {
      e.preventDefault();
      const s = session(c.id), inp = f.querySelector("input");
      const v = inp.value.trim(); if (!v || !s) return;
      inp.value = "";
      start(s, v);
    }
  });

  document.addEventListener("click", async (e) => {
    const c = cur(); if (!c || !c.id) return;
    const s = session(c.id); if (!s) return;
    let el;
    if ((el = e.target.closest("[data-watch]"))) {
      if (el.dataset.watch === "follow") s.follow = !s.follow;
      if (el.dataset.watch === "latest") s.follow = true;
      refresh(s);
      const nb = document.getElementById("studio-blocks"); if (nb && s.follow) nb.scrollTop = nb.scrollHeight;
      return;
    }
    if ((el = e.target.closest("[data-studio-decide]"))) {
      const [i, act] = el.dataset.studioDecide.split(":");
      if (act === "approve") {
        const b = s.blocks[Number(i)];
        const res = await dialog({
          title: `Allow ${b.tool}?`,
          body: `<p>${esc(b.interrupt.message || "")}</p><div class="consequence"><ul><li>The runtime runs this one call with the arguments shown.</li><li>Your decision is recorded against interrupt <span class="mono">${esc(b.interrupt.id)}</span>.</li><li>Other risky calls will still ask.</li></ul></div>`,
          actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, { id: "ok", label: "Approve", kind: "btn-primary" }],
        });
        if (res !== "ok") return;
      }
      decide(s, Number(i), act === "approve");
      return;
    }
    if ((el = e.target.closest("[data-studio]"))) {
      const a = el.dataset.studio;
      if (a === "stop") stop(s);
      if (a === "reconnect") reconnect(s);
      if (a === "publish") publish(s);
      return;
    }
    if ((el = e.target.closest("[data-studio-pick]"))) { s.selectedFile = Number(el.dataset.studioPick); refresh(s); return; }
    if ((el = e.target.closest("[data-studio-file]"))) {
      const i = s.files.findIndex((f) => f.path === el.dataset.studioFile);
      if (i >= 0) { s.selectedFile = i; refresh(s); const p = document.getElementById("studio-project"); p && p.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    }
  });

  function publish(s) {
    const f = s.files[s.selectedFile || 0];
    if (!f || !f.content) return;
    const id = "studio-" + s.id;
    window.KD_DATA.previews[id] = () => f.content;
    const st = K().state;
    if (!st.localProjects.some((p) => p.id === id)) st.localProjects = [{ id, name: s.title, file: f.path, size: `${Math.max(1, Math.round(f.content.length / 1024))} KB`, preview: id }, ...st.localProjects];
    K().publishDialog(id);
    toast("Pick how long the review link lasts, then publish.");
  }

  window.KD_STUDIO = { page, mount };
})();
