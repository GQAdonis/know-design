/* KnowDesign Review — AG-UI client for the Universal Agent Runtime.
   Wire contract: universal-agent-runtime/docs/AGUI_V1.md
     POST {base}/api/uar/ag-ui/agents/{agent_id}            RunAgentInput → SSE data: frames
     GET  {base}/api/uar/ag-ui/agents/{agent_id}/threads/{thread_id}/runs/{run_id}/stream   reconnect
   A pending approval closes the segment with RUN_FINISHED { outcome: { type: "interrupt", interrupts: [...] } }.
   The next request uses the same thread, a new runId, parentRunId, and resume[] answering every interrupt.
   With no base URL the client replays a recorded demo stream made of the same frames. */
(function () {
  "use strict";
  const TOKEN_KEY = "kd-uar-token";
  const getToken = () => sessionStorage.getItem(TOKEN_KEY) || "";
  const setToken = (t) => (t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY));
  const hasToken = () => !!getToken();
  const rid = (p) => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const trimBase = (u) => (u || "").replace(/\/+$/, "");

  function headers(cfg, extra) {
    const h = Object.assign({ Accept: "text/event-stream", "x-uar-workspace-id": cfg.workspaceId }, extra || {});
    const t = getToken();
    if (t) h.Authorization = `Bearer ${t}`;
    return h;
  }

  /* ── SSE parsing over fetch (EventSource cannot POST or send auth headers) ── */
  async function pump(response, onEvent, signal) {
    const reader = response.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let lastId = null;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.search(/\r?\n\r?\n/)) >= 0) {
        const raw = buf.slice(0, idx);
        buf = buf.slice(idx).replace(/^\r?\n\r?\n/, "");
        const data = [];
        raw.split(/\r?\n/).forEach((line) => {
          if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
          else if (line.startsWith("id:")) lastId = line.slice(3).trim();
        });
        if (!data.length) continue;
        try { onEvent(JSON.parse(data.join("\n")), lastId); }
        catch (_) { onEvent({ type: "RUN_ERROR", message: "The runtime sent a frame that isn't valid JSON.", code: "client_parse_error" }, lastId); }
      }
      if (signal && signal.aborted) break;
    }
  }

  async function failure(res) {
    let body = "";
    try { body = (await res.text()).slice(0, 300); } catch (_) { /* body unreadable */ }
    const known = { 401: "The runtime rejected the token (401). Sign in again or paste a fresh token in Settings → Agent runtime.",
      403: "The token is valid but not allowed to run this agent in this workspace (403).",
      404: "The runtime doesn't know this agent ID (404). Check Settings → Agent runtime.",
      409: "Another run is already active on this thread (409). Wait for it or stop it first." };
    return { type: "RUN_ERROR", code: `http_${res.status}`, message: known[res.status] || `The runtime answered ${res.status}. ${body}` };
  }

  /* ── Live source ── */
  async function liveRun(cfg, input, onEvent, signal) {
    const url = `${trimBase(cfg.baseUrl)}/api/uar/ag-ui/agents/${encodeURIComponent(cfg.agentId)}`;
    let res;
    try {
      res = await fetch(url, { method: "POST", headers: headers(cfg, { "Content-Type": "application/json" }), body: JSON.stringify(input), signal });
    } catch (err) {
      if (signal && signal.aborted) return;
      onEvent({ type: "RUN_ERROR", code: "network", message: "Couldn't reach the runtime. It may be offline, or it doesn't allow requests from this page (CORS)." });
      return;
    }
    if (!res.ok || !res.body) { onEvent(await failure(res)); return; }
    try { await pump(res, onEvent, signal); }
    catch (err) { if (!(signal && signal.aborted)) onEvent({ type: "RUN_ERROR", code: "stream_interrupted", message: "The stream dropped. Use Reconnect to pick up where it left off." }); }
  }

  async function liveReconnect(cfg, threadId, runId, lastEventId, onEvent, signal) {
    const url = `${trimBase(cfg.baseUrl)}/api/uar/ag-ui/agents/${encodeURIComponent(cfg.agentId)}/threads/${encodeURIComponent(threadId)}/runs/${encodeURIComponent(runId)}/stream`;
    let res;
    try { res = await fetch(url, { headers: headers(cfg, lastEventId ? { "Last-Event-ID": lastEventId } : {}), signal }); }
    catch (_) { if (!(signal && signal.aborted)) onEvent({ type: "RUN_ERROR", code: "network", message: "Couldn't reach the runtime to reconnect." }); return; }
    if (!res.ok || !res.body) { onEvent(await failure(res)); return; }
    try { await pump(res, onEvent, signal); }
    catch (_) { if (!(signal && signal.aborted)) onEvent({ type: "RUN_ERROR", code: "stream_interrupted", message: "The stream dropped again." }); }
  }

  async function test(cfg) {
    const base = trimBase(cfg.baseUrl);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    try {
      const res = await fetch(`${base}/health`, { headers: headers(cfg, { Accept: "application/json" }), signal: ctl.signal });
      clearTimeout(timer);
      if (res.ok) return { ok: true, title: "Runtime reachable", detail: `${base}/health answered ${res.status}. Studio will use this runtime for new sessions.${hasToken() ? "" : " No token is stored, so runs may be rejected."}` };
      if (res.status === 401 || res.status === 403) return { ok: false, title: "Reached the runtime, but it refused the token", detail: `It answered ${res.status}. Paste a fresh token above.` };
      return { ok: false, title: `Runtime answered ${res.status}`, detail: "The host is up but /health isn't healthy. Check the runtime logs." };
    } catch (err) {
      clearTimeout(timer);
      return { ok: false, title: ctl.signal.aborted ? "No answer within 8 seconds" : "Couldn't reach the runtime",
        detail: "Check the URL. If it's right, the runtime must allow this page's origin (CORS) and the Authorization and x-uar-workspace-id headers." };
    }
  }

  /* ── Demo source: recorded frames in the AG-UI wire shape ── */
  const sleep = (ms) => new Promise((r) => setTimeout(r, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? Math.min(ms, 40) : ms));
  const chunks = (s, n) => { const out = []; for (let i = 0; i < s.length; i += n) out.push(s.slice(i, i + n)); return out; };

  function textFrames(id, text, role) {
    return [{ type: "TEXT_MESSAGE_START", messageId: id, role: role || "assistant" },
      ...chunks(text, 18).map((d) => ({ type: "TEXT_MESSAGE_CONTENT", messageId: id, delta: d })),
      { type: "TEXT_MESSAGE_END", messageId: id }];
  }
  function reasoningFrames(id, text) {
    return [{ type: "REASONING_MESSAGE_START", messageId: id, role: "assistant" },
      ...chunks(text, 24).map((d) => ({ type: "REASONING_MESSAGE_CONTENT", messageId: id, delta: d })),
      { type: "REASONING_MESSAGE_END", messageId: id }];
  }
  function toolFrames(id, name, args, result) {
    const a = JSON.stringify(args);
    const f = [{ type: "TOOL_CALL_START", toolCallId: id, toolCallName: name },
      ...chunks(a, 40).map((d) => ({ type: "TOOL_CALL_ARGS", toolCallId: id, delta: d })),
      { type: "TOOL_CALL_END", toolCallId: id }];
    if (result !== undefined) f.push({ type: "TOOL_CALL_RESULT", messageId: id + "-r", toolCallId: id, content: typeof result === "string" ? result : JSON.stringify(result) });
    return f;
  }

  /* segment builders get (input, ctx) and return frames */
  function demoSegments(input, ctx) {
    const { threadId, runId } = input;
    const start = { type: "RUN_STARTED", threadId, runId };
    const ok = { type: "RUN_FINISHED", threadId, runId, outcome: { type: "success" } };
    const D = window.KD_STUDIO_DEMO;

    if (input.resume && input.resume.length) {
      const approved = input.resume[0].status === "resolved" && input.resume[0].payload && input.resume[0].payload.approved;
      const page = D.historyScreen(approved);
      return [start,
        approved
          ? { type: "TOOL_CALL_RESULT", messageId: "t-fetch-r", toolCallId: "t-fetch", content: JSON.stringify({ status: 200, saved: "assets/consent-icon.svg", bytes: 1184 }) }
          : null,
        ...textFrames("m-after", approved ? "Got the consent icon set. Writing the screen now." : "Skipped the download. I'll draw the consent badge with the existing line icons instead."),
        { type: "STEP_STARTED", stepName: "write" },
        ...toolFrames("t-write", "workspace.write_file", { path: "screens/consult-history.html", bytes: page.length, mode: "create" }, { written: "screens/consult-history.html", bytes: page.length }),
        { type: "STATE_DELTA", delta: [{ op: "add", path: "/files/-", value: { path: "screens/consult-history.html", bytes: page.length, content: page } }] },
        { type: "STEP_FINISHED", stepName: "write" },
        ...textFrames("m-done", "Done. The Sessions screen lists yesterday's and earlier consults, shows which device recorded each one, and marks consent with a badge plus a text label. It reuses the Consult Capture tokens. Publish it for review when you're happy."),
        ok].filter(Boolean);
    }

    if (ctx.followUp && !ctx.hasHistory) {
      return [start, ...textFrames("m-x", "This is the demo stream, so I can only replay the recorded Consult Capture session. Add a UAR runtime URL in Settings → Agent runtime and I'll work on this design for real."), ok];
    }
    if (ctx.followUp) {
      const page = D.historyScreen(ctx.approvedBefore, true);
      return [start,
        ...reasoningFrames("r-f", `The request: ${ctx.followUp.slice(0, 120)}. Smallest change that does it: adjust the existing screen, keep tokens.`),
        ...toolFrames("t-edit", "workspace.write_file", { path: "screens/consult-history.html", bytes: page.length, mode: "replace" }, { written: "screens/consult-history.html", bytes: page.length }),
        { type: "STATE_DELTA", delta: [{ op: "replace", path: "/files/0", value: { path: "screens/consult-history.html", bytes: page.length, content: page } }] },
        ...textFrames("m-f", "Updated the screen. I added a filter row for today, this week and older, and kept everything else as it was."),
        ok];
    }

    return [start,
      { type: "STATE_SNAPSHOT", snapshot: { files: [] } },
      { type: "STEP_STARTED", stepName: "plan" },
      ...reasoningFrames("r-1", "The brief asks for a place to find past consult sessions — the front-desk comment on Consult Capture v3. I should reuse that project's tokens and sidebar so it reads as the same product. Consent state must not rely on color alone."),
      ...toolFrames("t-tokens", "design_system.get_tokens", { system: "knowme", theme: "dark" }, { canvas: "#0B0F14", surface: "#161D29", ember: "#FF6A3D", cyan: "#00C2DC", fonts: ["Space Grotesk", "Inter", "JetBrains Mono"] }),
      ...toolFrames("t-read", "workspace.read_file", { path: "consult-capture-htmx.html", range: "sidebar" }, { lines: 42, found: ["aside", ".nav", ".nav.on"] }),
      { type: "STEP_FINISHED", stepName: "plan" },
      ...textFrames("m-plan", "Plan: a Sessions screen in the Consult Capture sidebar with a list of past consults — patient, date, length, recording device and consent. I'd like to pull the official consent icon set from the KnowMe asset library."),
      { type: "STEP_STARTED", stepName: "assets" },
      ...toolFrames("t-fetch", "web.fetch", { url: "https://assets.know-me.tools/icons/consent.svg", save_as: "assets/consent-icon.svg" }),
      { type: "RUN_FINISHED", threadId, runId, outcome: { type: "interrupt", interrupts: [{
        id: "apr-" + runId, reason: "tool_approval", toolCallId: "t-fetch",
        message: "web.fetch reaches outside the project workspace.",
        metadata: { toolName: "web.fetch", riskReason: "Network request to a host outside the workspace allow-list" },
      }] } }];
  }

  async function demoRun(input, ctx, onEvent, signal, cursorRef) {
    const frames = ctx.frames || demoSegments(input, ctx);
    ctx.frames = frames;
    for (let i = cursorRef.i || 0; i < frames.length; i++) {
      if (signal && signal.aborted) { cursorRef.i = i; return; }
      const f = frames[i];
      const t = f.type;
      await sleep(t.endsWith("_CONTENT") || t === "TOOL_CALL_ARGS" ? 45 : t === "TOOL_CALL_END" ? 650 : t === "RUN_STARTED" ? 250 : 160);
      if (signal && signal.aborted) { cursorRef.i = i; return; }
      onEvent(f, `${input.runId}:${i}`);
      cursorRef.i = i + 1;
    }
  }

  /* ── Public API: one run segment at a time ── */
  function run(cfg, session, input, ctx, onEvent) {
    const ctl = new AbortController();
    const live = !!cfg.baseUrl;
    const cursor = { i: 0 };
    const promise = live ? liveRun(cfg, input, onEvent, ctl.signal) : demoRun(input, ctx, onEvent, ctl.signal, cursor);
    return { live, abort: () => ctl.abort(), promise, cursor, ctx, input };
  }
  function reconnect(cfg, session, prev, onEvent) {
    const ctl = new AbortController();
    const promise = prev.live
      ? liveReconnect(cfg, prev.input.threadId, prev.input.runId, session.lastEventId, onEvent, ctl.signal)
      : demoRun(prev.input, prev.ctx, onEvent, ctl.signal, prev.cursor);
    return Object.assign({}, prev, { abort: () => ctl.abort(), promise });
  }
  function runAgentInput({ threadId, runId, parentRunId, messages, resume, context }) {
    const body = { threadId, runId, protocolVersion: "1.0", messages: messages || [], tools: [], context: context || [] };
    if (parentRunId) body.parentRunId = parentRunId;
    if (resume) body.resume = resume;
    return body;
  }

  window.KD_UAR = { run, reconnect, runAgentInput, test, rid, setToken, hasToken, demoFrames: (input, ctx) => demoSegments(input, ctx || {}) };
})();
