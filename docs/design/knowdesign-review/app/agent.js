/* KnowDesign Review — review agent panel rendered as AG-UI blocks
   (KnowMe UI standard §7.5: thinking, tool use, citation, confirmation request). */
(function () {
  "use strict";
  const { icon, esc, pace, toast } = window.KD_UI;
  const K = () => window.KD;
  const R = () => window.KD_ROOM;

  /* Feedback themes per design. Citations point at real comment ids. */
  const SCRIPTS = {
    "consult-capture": {
      themes: [
        { t: "Say where the data goes", d: "Reviewers trust the on-device cue, but the Stop button sounds like it sends something.", cites: ["c1", "c3"] },
        { t: "Name the people and devices", d: "Speaker labels and the paired phone both need names.", cites: ["c2", "c4"] },
        { t: "Let staff find past sessions", d: "Front desk can't see where yesterday's sessions live.", cites: ["c5"] },
      ],
      changes: [
        { id: "k1", t: "Rename the button to “Stop — draft on this device”", d: "Answers #1", on: true },
        { id: "k2", t: "Move the on-device tag into the note header, larger", d: "Answers #3", on: true },
        { id: "k3", t: "Show the patient's first name in speaker labels after consent", d: "Answers #2", on: true },
        { id: "k4", t: "Show the paired phone's name in the session line", d: "Answers #4 · already promised for v4", on: true },
        { id: "k5", t: "Add a Sessions history item to the sidebar", d: "Answers #5", on: false },
      ],
    },
    "patient-chat": {
      themes: [
        { t: "Consent has to gate the chart", d: "The label alone isn't enough; opening the chart must wait for consent.", cites: ["c1"] },
        { t: "Make what it read clickable", d: "Coordinators want to jump from the summary to the lab result.", cites: ["c2"] },
      ],
      changes: [
        { id: "k1", t: "Block opening a chart until consent is captured, with a capture action", d: "Answers #1 and Dana's change request", on: true },
        { id: "k2", t: "Make each item in the thinking summary open its source", d: "Answers #2", on: true },
      ],
    },
  };

  function scriptFor(d) {
    if (SCRIPTS[d.id]) return SCRIPTS[d.id];
    const open = K().openComments(d);
    return {
      themes: open.map((c, i) => ({ t: `Comment ${d.comments.indexOf(c) + 1}`, d: c.text, cites: [c.id] })),
      changes: open.map((c, i) => ({ id: "g" + i, t: c.text.length > 90 ? c.text.slice(0, 88) + "…" : c.text, d: `Answers #${d.comments.indexOf(c) + 1}`, on: true })),
    };
  }

  const cite = (d, id) => {
    const n = d.comments.findIndex((c) => c.id === id) + 1;
    return n ? `<button type="button" class="cite" data-agent-cite="${id}" aria-label="Open comment ${n}">#${n}</button>` : "";
  };

  /* ── Block renderers ── */
  function blockHtml(d, b) {
    switch (b.type) {
      case "user":
        return `<div class="block" style="background:var(--muted)"><div class="who" style="font-size:12px">You</div><div>${esc(b.text)}</div></div>`;
      case "think":
        return `<details class="block block-think"><summary>${icon("chevron", "icon-sm chev")}${icon("brain", "icon-sm")}<span>Thinking</span><span class="mono">${b.secs ? b.secs.toFixed(1) + " s" : "…"}</span></summary>
          <div class="think-body">${b.lines.map((l) => `<div>${esc(l)}</div>`).join("")}</div></details>`;
      case "tool": {
        const labels = { pending: "Queued", running: "Running", completed: "Done", failed: "Failed" };
        const dot = b.state === "running" ? '<span class="pulse" aria-hidden="true"></span>' : icon(b.state === "completed" ? "check" : b.state === "failed" ? "alert" : "history", "icon-sm");
        return `<div class="block tool ${b.state}">
          <div class="tool-head">${icon("wrench", "icon-sm")}<span class="tool-name">${esc(b.name)}</span><span class="tool-state ${b.state}" role="status">${dot}${labels[b.state]}</span></div>
          ${b.summary ? `<div class="tool-summary">${esc(b.summary)}</div>` : ""}
          ${b.action ? `<div><a class="btn" href="${b.action.href}">${esc(b.action.label)}</a></div>` : ""}
          <details><summary>${icon("chevron", "icon-sm chev")}Input</summary><pre>${esc(JSON.stringify(b.input, null, 2))}</pre></details></div>`;
      }
      case "themes":
        return `<div class="block block-text"><p>${esc(b.lead)}</p>
          ${b.themes.map((t) => `<div class="theme-item"><span class="t">${esc(t.t)}</span><span class="d">${esc(t.d)} ${t.cites.map((c) => cite(d, c)).join("")}</span></div>`).join("")}</div>`;
      case "changes":
        return `<div class="block block-text"><h4>Proposed changes for v${d.version + 1}</h4>
          <div class="changes-list" role="group" aria-label="Proposed changes">${b.items.map((c) => `<label class="check-row"><input type="checkbox" data-agent-change="${c.id}" ${c.on ? "checked" : ""} ${b.locked ? "disabled" : ""}><span class="od-field"><span class="t">${esc(c.t)}</span><span class="d">${esc(c.d)}</span></span></label>`).join("")}</div></div>`;
      case "confirm": {
        const n = (b.changes || []).filter((c) => c.on).length;
        if (b.done) return `<div class="block confirm-block done"><div class="t">${icon("check")}Sent to KnowDesign</div><p>${n} changes are waiting as a prompt in <span class="mono">${esc(d.project)}</span>. The published snapshot hasn't changed; reviewers see the update when you publish v${d.version + 1}.</p></div>`;
        if (b.dismissed) return `<div class="block confirm-block"><div class="t">${icon("info")}Not sent</div><p>Nothing left this panel. You can send the change list later.</p><div class="od-cluster"><button class="btn" data-agent="reopen">Review the change list again</button></div></div>`;
        if (b.blocked) return `<div class="block confirm-block"><div class="t">${icon("lock")}Sending is turned off</div><p>The agent can't write to KnowDesign because <span class="mono">knowdesign.prompt.create</span> is off in Settings → Agents.</p><div><a class="btn" href="#/settings/agents">Open agent settings</a></div></div>`;
        return `<div class="block confirm-block" role="group" aria-labelledby="cf-t"><div class="t" id="cf-t">${icon("send")}Send ${n} change${n === 1 ? "" : "s"} to KnowDesign?</div>
          <p>Creates a prompt in the KnowDesign conversation for <span class="mono">${esc(d.project)}</span>. Nothing is published and no reviewer is contacted until you publish the next version.</p>
          <div class="od-cluster"><button class="btn btn-ghost" data-agent="dismiss">Not now</button><button class="btn btn-primary" data-agent="send" ${n ? "" : "disabled"}>${icon("send", "icon-sm")}Send to KnowDesign</button></div></div>`;
      }
      case "text":
        return `<div class="block block-text"><p>${esc(b.text)}</p></div>`;
      default: return "";
    }
  }

  function tab(d, u) {
    const cfg = K().state.config.agents;
    const lane = { local: "On-device", "remote-user": "Your remote model", cloud: "Commercial cloud" }[cfg.lane];
    const a = u.agent;
    const open = K().openComments(d).length;
    const intro = `<div class="agent-intro"><div class="who">${icon("sparkles", "icon-sm")}Review agent</div>
      <p>Reads this design's comments and versions, groups the feedback, and drafts changes for KnowDesign. It never publishes or messages reviewers without asking you.</p>
      <span class="lane-tag"><span class="dot cyan" aria-hidden="true"></span>${esc(lane)} · ${esc(cfg.model)}</span></div>`;
    if (!a) {
      const can = open > 0;
      return `${intro}${can
        ? `<button class="btn btn-cyan btn-lg" data-agent="run">${icon("sparkles", "icon-sm")}Summarize ${open} open comment${open > 1 ? "s" : ""}</button>`
        : `<div class="empty">${icon("message")}<h3>Nothing to summarize yet</h3><p>The agent works from open comments. Share the review link to collect some.</p></div>`}`;
    }
    const blocks = a.blocks.map((b) => blockHtml(d, b)).join("");
    const busy = a.status === "running";
    return `${intro}<div class="blocks" aria-live="polite" aria-busy="${busy}">${blocks}</div>
      <form class="composer" data-agent-form><label class="sr-only" for="agent-ask">Ask the review agent</label>
        <input id="agent-ask" class="input" placeholder="Ask about this feedback" autocomplete="off" ${busy ? "disabled" : ""}>
        <button class="btn btn-primary btn-icon" type="submit" aria-label="Send" ${busy ? "disabled" : ""}>${icon("send", "icon-sm")}</button></form>`;
  }

  /* ── Run simulation (event stream → blocks) ── */
  const refresh = (d) => R().updateSide(d);
  async function step(d, a, block, ms, finalize) {
    a.blocks = [...a.blocks, block];
    refresh(d);
    await pace(ms);
    finalize && Object.assign(block, finalize);
    refresh(d);
  }

  async function run(d) {
    const u = R().ui(d);
    const cfg = K().state.config;
    const tools = cfg.agents.tools;
    const s = scriptFor(d);
    const open = K().openComments(d);
    const guests = open.filter((c) => c.guest).length;
    const a = { status: "running", blocks: [] };
    u.agent = a;

    const t0 = performance.now();
    const think = { type: "think", lines: [
      `Reading ${open.length} open comments on v${d.version} (${guests} from guests).`,
      d.versions.length > 1 ? `Comparing v${d.version - 1} → v${d.version} so I don't suggest something that already shipped.` : "Only one version exists, so there is nothing to compare.",
      "Grouping by what the reviewer is asking for, not by where they clicked.",
    ], secs: 0 };
    a.blocks = [think]; refresh(d);
    await pace(900);
    think.secs = (performance.now() - t0) / 1000;

    if (tools["hub.comments.list"]) {
      await step(d, a, { type: "tool", name: "hub.comments.list", state: "running", input: { design: d.id, version: d.version, status: "open" } }, 700,
        { state: "completed", summary: `${open.length} open · ${guests} from guests · ${d.comments.length - open.length} resolved` });
    }
    if (tools["snap.diff_versions"] && d.versions.length > 1) {
      await step(d, a, { type: "tool", name: "snap.diff_versions", state: "running", input: { from: `v${d.version - 1}`, to: `v${d.version}` } }, 650,
        { state: "completed", summary: d.versions[0].notes.join(" · ") });
    }
    if (tools["hub.comments.cluster"]) {
      await step(d, a, { type: "tool", name: "hub.comments.cluster", state: "running", input: { comments: open.map((c) => c.id) } }, 800,
        { state: "completed", summary: `${s.themes.length} theme${s.themes.length === 1 ? "" : "s"}` });
    }
    a.blocks = [...a.blocks, { type: "themes", lead: `Here is what reviewers are asking for on v${d.version}:`, themes: s.themes }];
    refresh(d); await pace(350);

    const changes = s.changes.map((c) => ({ ...c }));
    a.changes = changes;
    a.blocks = [...a.blocks, { type: "changes", items: changes }];
    refresh(d); await pace(350);

    if (tools["notify.reviewers"]) {
      const n = cfg.notifications;
      const ok = (n.email && n.emailFrom) || n.webhook;
      await step(d, a, { type: "tool", name: "notify.reviewers", state: "running", input: { design: d.id, template: "feedback-received" } }, 600,
        ok ? { state: "completed", summary: `Told ${guests} guest reviewer${guests === 1 ? "" : "s"} their feedback was received.` }
           : { state: "failed", summary: "No channel is set up, so guest reviewers weren't told their feedback was received. Nothing else is affected.", action: { href: "#/settings/notifications", label: "Set up notifications" } });
    }

    a.blocks = [...a.blocks, { type: "confirm", changes, blocked: !tools["knowdesign.prompt.create"] }];
    a.status = "awaiting";
    refresh(d);
  }

  async function send(d) {
    const u = R().ui(d), a = u.agent;
    const confirm = a.blocks.find((b) => b.type === "confirm");
    const chosen = a.changes.filter((c) => c.on);
    a.blocks.find((b) => b.type === "changes").locked = true;
    a.status = "running";
    const tool = { type: "tool", name: "knowdesign.prompt.create", state: "running", input: { project: d.project, changes: chosen.map((c) => c.t) } };
    a.blocks = a.blocks.filter((b) => b !== confirm).concat(tool);
    refresh(d);
    await pace(900);
    tool.state = "completed";
    tool.summary = `Prompt queued in KnowDesign · ${chosen.length} changes`;
    a.blocks = [...a.blocks, { ...confirm, done: true }];
    a.status = "done";
    K().audit(d, K().ME, `Sent ${chosen.length} agent-proposed changes to KnowDesign as a prompt`);
    refresh(d);
    toast("Sent to KnowDesign");
  }

  async function ask(d, text) {
    const u = R().ui(d), a = u.agent;
    a.blocks = [...a.blocks, { type: "user", text }];
    a.status = "running"; refresh(d);
    await pace(700);
    const open = K().openComments(d);
    const guests = open.filter((c) => c.guest);
    const answer = /guest|reviewer|customer/i.test(text)
      ? `${guests.length} of the ${open.length} open comments come from guests. ${guests.length ? "The newest guest comment is #" + (d.comments.indexOf(guests[guests.length - 1]) + 1) + "." : ""}`
      : `I can only answer from this design's ${d.comments.length} comments and ${d.versions.length} version notes. Ask about a theme, a reviewer, or what changed between versions.`;
    a.blocks = [...a.blocks, { type: "text", text: answer }];
    a.status = a.blocks.some((b) => b.type === "confirm" && !b.done && !b.dismissed && !b.blocked) ? "awaiting" : "done";
    refresh(d);
    const inp = document.getElementById("agent-ask"); inp && inp.focus();
  }

  const current = () => { const m = location.hash.match(/^#\/design\/([^/]+)/); return m ? K().design(decodeURIComponent(m[1])) : null; };

  document.addEventListener("click", (e) => {
    const d = current(); if (!d) return;
    const u = R().ui(d);
    const c = e.target.closest("[data-agent-cite]");
    if (c) { R().selectComment(d, c.dataset.agentCite, true); return; }
    const b = e.target.closest("[data-agent]");
    if (!b) return;
    const act = b.dataset.agent;
    if (act === "run") run(d);
    if (act === "send") send(d);
    if (act === "dismiss") { const cf = u.agent.blocks.find((x) => x.type === "confirm"); cf.dismissed = true; u.agent.status = "done"; refresh(d); }
    if (act === "reopen") { const cf = u.agent.blocks.find((x) => x.type === "confirm"); cf.dismissed = false; u.agent.status = "awaiting"; refresh(d); }
  });
  document.addEventListener("change", (e) => {
    const d = current(); if (!d) return;
    const t = e.target.closest("[data-agent-change]"); if (!t) return;
    const a = R().ui(d).agent;
    a.changes = a.changes.map((c) => (c.id === t.dataset.agentChange ? { ...c, on: t.checked } : c));
    a.blocks = a.blocks.map((b) => (b.type === "changes" ? { ...b, items: a.changes } : b.type === "confirm" ? { ...b, changes: a.changes } : b));
    refresh(d);
    const again = document.querySelector(`[data-agent-change="${t.dataset.agentChange}"]`); again && again.focus();
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-agent-form]"); if (!f) return;
    e.preventDefault();
    const d = current(); const inp = f.querySelector("input");
    const v = inp.value.trim(); if (!d || !v) return;
    ask(d, v);
  });

  window.KD_AGENT = { tab };
})();
