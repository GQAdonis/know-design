/* KnowDesign Review — demo data.
   Designs are the operator's real KnowDesign projects. Reviewer people are
   example names for the demo; nothing here calls the live hub. */
(function () {
  "use strict";

  const now = Date.now();
  const H = 3600e3;
  const D = 24 * H;

  /* ── Snapshot previews ─────────────────────────────────────────────
     Each preview stands in for the published snapshot served from the
     isolated snap.know-me.tools origin. They are rendered with
     sandbox="" (no scripts, no same-origin), exactly as the hub will. */
  const base = `
    *{box-sizing:border-box;margin:0}
    html,body{height:100%}
    body{font-family:Inter,system-ui,sans-serif;font-size:1.25vw;line-height:1.45;overflow:hidden}
    h1,h2,h3{font-family:"Space Grotesk",system-ui,sans-serif;letter-spacing:-.01em;line-height:1.15}
    .mono{font-family:"JetBrains Mono",ui-monospace,monospace}
  `;
  const wrap = (css, body) =>
    `<!doctype html><html><head><meta charset="utf-8"><style>${base}${css}</style></head><body>${body}</body></html>`;

  const previews = {
    consult: (v) => wrap(`
      body{background:#0B0F14;color:#E8EDF3;display:grid;grid-template-columns:22% 1fr 28%;}
      aside{background:#111620;padding:2.2vw 1.6vw;display:grid;gap:1vw;align-content:start}
      .logo{font-family:"Space Grotesk";font-weight:700;font-size:1.7vw}.logo b{color:#FF6A3D}
      .nav{padding:.8vw 1vw;border-radius:.6vw;color:#A7B0BC}.nav.on{background:#2B1A18;color:#E8EDF3}
      main{padding:2.4vw;display:grid;gap:1.4vw;align-content:start}
      .eb{font-family:"JetBrains Mono";font-size:.85vw;letter-spacing:.12em;color:#FF6A3D;text-transform:uppercase}
      h1{font-size:2.8vw}
      .rec{display:flex;gap:1vw;align-items:center;background:#161D29;border-radius:1vw;padding:1.2vw 1.4vw}
      .live{width:1vw;height:1vw;border-radius:50%;background:#EF4444}
      .wave{flex:1;height:2.6vw;background:repeating-linear-gradient(90deg,#00C2DC 0 .25vw,transparent .25vw .7vw);opacity:.8;border-radius:.3vw}
      .btn{background:#FF6A3D;color:#0B0F14;font-weight:700;padding:.8vw 1.4vw;border-radius:.6vw}
      .line{background:#161D29;border-radius:.8vw;padding:1vw 1.2vw;display:grid;gap:.3vw}
      .who{font-size:.9vw;color:#A7B0BC}
      section{background:#161D29;padding:2.2vw 1.6vw;display:grid;gap:1vw;align-content:start}
      .note{background:#1C2535;border-radius:.8vw;padding:1vw}
      .ai{background:#0E2A33;color:#7FE3F0;border-radius:.8vw;padding:1vw}
    `, `
      <aside><div class="logo">Know<b>Me</b></div>
        <div class="nav on">Consult capture</div><div class="nav">Patients</div><div class="nav">Notes</div><div class="nav">Settings</div></aside>
      <main><div class="eb">Session · ${v >= 3 ? "Phone + laptop paired" : "Laptop"}</div>
        <h1>Follow-up consult — R. Kaminski</h1>
        <div class="rec"><div class="live"></div><div class="mono">12:48</div><div class="wave"></div><div class="btn">${v >= 2 ? "Stop &amp; draft note" : "Stop"}</div></div>
        <div class="line"><div class="who">Clinician · 12:31</div><div>How has the new dosage been for the last two weeks?</div></div>
        <div class="line"><div class="who">Patient · 12:33</div><div>Better sleep. Some dizziness in the mornings.</div></div>
        <div class="line"><div class="who">Clinician · 12:35</div><div>Let's check your blood pressure before we change anything.</div></div>
      </main>
      <section><h3 style="font-size:1.4vw">Draft note</h3>
        <div class="ai">Drafted on this device · not sent</div>
        <div class="note"><b>Subjective</b><br>Improved sleep; morning dizziness.</div>
        <div class="note"><b>Plan</b><br>BP check today; review dosage.</div>
        ${v >= 2 ? '<div class="note"><b>Consent</b><br>Recording consent captured 12:30.</div>' : ""}
      </section>`),

    chat: (v) => wrap(`
      body{background:#F7F7F8;color:#0B0F14;display:grid;grid-template-columns:30% 1fr;}
      .list{background:#FFFFFF;padding:2vw 1.4vw;display:grid;gap:.8vw;align-content:start}
      h2{font-size:1.8vw;margin-bottom:.6vw}
      .case{padding:1vw;border-radius:.7vw;background:#F2F4F7;display:grid;gap:.2vw}
      .case.on{background:#FBE8E1}
      .s{font-size:.9vw;color:#4B5563}
      .tag{display:inline-block;font-family:"JetBrains Mono";font-size:.75vw;padding:.15vw .6vw;border-radius:2vw;background:#E3F5EA;color:#15803D}
      .tag.w{background:#FCF0DC;color:#B45309}
      main{padding:2vw 2.4vw;display:grid;gap:1vw;align-content:start}
      .b{max-width:72%;padding:1vw 1.2vw;border-radius:1vw;background:#FFFFFF}
      .b.me{justify-self:end;background:#E04E28;color:#0B0F14}
      .think{background:#E0F4F8;color:#0E7490;border-radius:.8vw;padding:.8vw 1.2vw;font-size:.95vw}
      .comp{margin-top:1.4vw;background:#FFFFFF;border-radius:1vw;padding:1.2vw;color:#6B7280}
    `, `
      <div class="list"><h2>Cases</h2>
        <div class="case on"><b>Renata Kaminski</b><div class="s">Follow-up · today</div><span class="tag">Chart ready</span></div>
        <div class="case"><b>Omar Haddad</b><div class="s">New intake · 2 pm</div><span class="tag w">Needs consent</span></div>
        <div class="case"><b>Lea Fontaine</b><div class="s">Lab review · Fri</div><span class="tag">Chart ready</span></div>
      </div>
      <main><div class="b">Summarize Renata's last three visits.</div>
        <div class="think">${v >= 2 ? "Read 3 visit notes · 2 lab results — tap to expand" : "Thinking…"}</div>
        <div class="b">Sleep has improved since the August dosage change. Morning dizziness is new and worth a BP check.</div>
        <div class="b me">Draft the follow-up plan.</div>
        <div class="comp">Message Renata's chart…</div></main>`),

    meet: (v) => wrap(`
      body{background:#0B0F14;color:#E8EDF3;padding:3vw;display:grid;gap:2vw;align-content:start}
      .eb{font-family:"JetBrains Mono";font-size:.9vw;letter-spacing:.12em;color:#FF6A3D;text-transform:uppercase}
      h1{font-size:4vw}
      .row{display:grid;grid-template-columns:repeat(3,1fr);gap:1.4vw}
      .tile{background:#161D29;border-radius:1.2vw;padding:1.6vw;display:grid;gap:1vw;min-height:14vw}
      .mark{width:5vw;height:5vw;border-radius:1.2vw;background:#1C2535;display:grid;place-items:center}
      .sw{display:flex;gap:.6vw}.sw i{width:3vw;height:3vw;border-radius:.6vw;display:block}
      .type{font-family:"Space Grotesk";font-size:3vw;font-weight:600}
    `, `
      <div class="eb">Brand kit · v${v}</div><h1>Know Meet — Gathering</h1>
      <div class="row">
        <div class="tile"><div class="mark"><svg viewBox="0 0 40 40" width="70%"><circle cx="20" cy="20" r="6" fill="#FF6A3D"/><circle cx="8" cy="12" r="4" fill="#E8EDF3"/><circle cx="32" cy="12" r="4" fill="#E8EDF3"/><circle cx="20" cy="34" r="4" fill="#E8EDF3"/></svg></div><b>Gathering mark</b><div style="color:#A7B0BC">Four nodes, one ember host.</div></div>
        <div class="tile"><b>Palette</b><div class="sw"><i style="background:#0B0F14;box-shadow:0 0 0 .15vw #253044"></i><i style="background:#161D29"></i><i style="background:#FF6A3D"></i><i style="background:#00C2DC"></i><i style="background:#E8EDF3"></i></div><div class="mono" style="font-size:.9vw;color:#A7B0BC">#0B0F14 · #FF6A3D · #00C2DC</div></div>
        <div class="tile"><b>Type</b><div class="type">Aa Gg</div><div style="color:#A7B0BC">Space Grotesk / Inter / JetBrains Mono</div></div>
      </div>`),

    policy: (v) => wrap(`
      body{background:#0B0F14;color:#E8EDF3;display:grid;grid-template-rows:3.4vw 1fr}
      .tb{background:#111620;display:flex;align-items:center;padding:0 1.6vw;gap:.6vw;font-family:"Space Grotesk";font-weight:700}
      .tb b{color:#FF6A3D}
      .body{display:grid;grid-template-columns:20% 1fr}
      aside{background:#111620;padding:1.6vw;display:grid;gap:.6vw;align-content:start;color:#A7B0BC}
      aside .on{background:#2B1A18;color:#E8EDF3;padding:.7vw 1vw;border-radius:.6vw}
      aside div{padding:.7vw 1vw}
      main{padding:2.4vw;display:grid;gap:1.2vw;align-content:start}
      h1{font-size:2.6vw}
      .row{background:#161D29;border-radius:.9vw;padding:1.2vw 1.4vw;display:flex;align-items:center;gap:1.2vw}
      .row .t{flex:1}
      .sw{width:3.4vw;height:1.9vw;border-radius:2vw;background:#FF6A3D;position:relative}
      .sw::after{content:"";position:absolute;right:.3vw;top:.3vw;width:1.3vw;height:1.3vw;border-radius:50%;background:#0B0F14}
      .sw.off{background:#253044}.sw.off::after{left:.3vw;right:auto;background:#A7B0BC}
      .lane{font-family:"JetBrains Mono";font-size:.8vw;padding:.2vw .7vw;border-radius:2vw;background:#0E2A33;color:#00C2DC}
      .s{color:#A7B0BC;font-size:1vw}
    `, `
      <div class="tb">Know<b>Me</b><span style="margin-left:auto" class="lane">On-device · Qwen 3.5</span></div>
      <div class="body"><aside><div>Home</div><div>Chat</div><div>Memory</div><div class="on">Global policy</div><div>Devices</div></aside>
      <main><h1>What leaves this device</h1>
        <div class="row"><div class="t"><b>Cloud models</b><div class="s">Allowed only when you pick one in a chat.</div></div><div class="sw off"></div></div>
        <div class="row"><div class="t"><b>Memory sync</b><div class="s">Encrypted between your devices.</div></div><div class="sw"></div></div>
        <div class="row"><div class="t"><b>Share with agents</b><div class="s">${v >= 2 ? "Ask every time · 3 agents have asked this week" : "Ask every time"}</div></div><div class="sw"></div></div>
      </main></div>`),

    bench: (v) => wrap(`
      body{background:#F7F7F8;color:#0B0F14;padding:4vw 6vw;display:grid;gap:2.4vw;align-content:start}
      .eb{font-family:"JetBrains Mono";font-size:.9vw;letter-spacing:.12em;color:#B83C1A;text-transform:uppercase}
      h1{font-size:5vw;max-width:70%}
      p{font-size:1.5vw;color:#4B5563;max-width:56%}
      .cta{display:flex;gap:1vw}.cta b{background:#E04E28;color:#0B0F14;padding:1vw 1.8vw;border-radius:.7vw}.cta i{font-style:normal;background:#EEF0F3;padding:1vw 1.8vw;border-radius:.7vw}
      .row{display:grid;grid-template-columns:repeat(4,1fr);gap:1vw}
      .r{background:#FFFFFF;border-radius:1vw;padding:1.2vw;display:grid;gap:.4vw}
      .r span{font-size:1vw;color:#4B5563}
    `, `
      <div class="eb">KnowMe for builders</div><h1>Build your bench of agents that know your work.</h1>
      <p>Pick the roles you need. Each one runs on your devices and remembers only what you allow.</p>
      <div class="cta"><b>Start a bench</b><i>See the roles</i></div>
      <div class="row"><div class="r"><b>Researcher</b><span>Reads and cites</span></div><div class="r"><b>Scribe</b><span>Drafts notes</span></div><div class="r"><b>Operator</b><span>Runs your tools</span></div><div class="r"><b>Critic</b><span>Checks the work</span></div></div>`),

    company: (v) => wrap(`
      body{background:#0B0F14;color:#E8EDF3;padding:4vw;display:grid;gap:2vw;align-content:start}
      h1{font-size:4.4vw}.e{color:#FF6A3D}
      .g{display:grid;grid-template-columns:1.3fr 1fr;gap:1.4vw}
      .c{background:#161D29;border-radius:1.2vw;padding:1.8vw;display:grid;gap:.8vw}
      .ph{background:#253044;border-radius:.8vw;height:12vw;display:grid;place-items:center;color:#A7B0BC;font-family:"JetBrains Mono";font-size:.9vw}
    `, `
      <h1>A company of <span class="e">one</span>.</h1>
      <div class="g"><div class="c"><b>Outline · draft</b><div style="color:#A7B0BC">Problem, the private dot, what the bench does, pricing — sections not written yet.</div></div>
      <div class="c"><div class="ph">Hero image — to be chosen</div></div></div>`),
  };

  const people = {
    travis: { id: "travis", name: "Travis James", initials: "TJ", role: "Design lead", me: true },
    dana: { id: "dana", name: "Dana Reyes", initials: "DR", role: "Clinical product" },
    sam: { id: "sam", name: "Sam Okafor", initials: "SO", role: "Engineering" },
    priya: { id: "priya", name: "Priya Nair", initials: "PN", role: "Customer success" },
  };

  const customers = [
    { id: "northwind", name: "Northwind Clinic", workspace: "northwind-clinic", contacts: 4, note: "Clinical pilot workspace" },
    { id: "prometheus", name: "Prometheus AGS", workspace: "prometheus-ags", contacts: 6, note: "Internal partner workspace" },
  ];

  const c = (id, author, guest, x, y, anchor, text, agoH, extra) =>
    Object.assign({ id, author, guest, x, y, anchor, text, ts: now - agoH * H, resolved: false, replies: [], unread: false }, extra || {});

  const designs = [
    {
      id: "consult-capture",
      name: "Consult Capture",
      project: "consult-capture-htmx.html",
      preview: "consult",
      slug: "cc-7Hq2ZfL9wXv3TnKp4R8sJm",
      stage: "review",
      version: 3,
      owner: "travis",
      publishedAt: now - 2 * D,
      expiresAt: now + 12 * D,
      approvers: [
        { id: "travis", status: "pending" },
        { id: "dana", status: "pending" },
      ],
      versions: [
        { v: 3, at: now - 2 * D, notes: ["Phone and laptop pair into one session", "Consent line added to the draft note"] },
        { v: 2, at: now - 5 * D, notes: ["Stop button now drafts the note", "Consent captured at session start"] },
        { v: 1, at: now - 9 * D, notes: ["First published snapshot"] },
      ],
      comments: [
        c("c1", "Clinic reviewer (guest)", true, 60, 21, "div.rec > .btn", "“Stop & draft note” reads like it will send something. Can it say it stays on this device?", 20, { unread: true }),
        c("c2", "dana", false, 44, 50, "main > .line:nth-child(4)", "Speaker labels need the patient's first name once consent is on file.", 30),
        c("c3", "Clinic reviewer (guest)", true, 85, 34, "section > .ai", "The cyan “Drafted on this device” tag is the most reassuring thing on the page. Make it bigger.", 18, { unread: true }),
        c("c4", "sam", false, 30, 22, "main > .eb", "Pairing status should show which phone. Two phones in a room is a real case.", 44, {
          replies: [{ author: "travis", text: "Agreed — adding device name in v4.", ts: now - 40 * H }],
        }),
        c("c5", "Front desk (guest)", true, 12, 30, "aside > .nav", "Where do I find yesterday's sessions?", 6, { unread: true }),
      ],
      audit: [
        { at: now - 2 * D, who: "travis", what: "Published <b>v3</b> for review from KnowDesign" },
        { at: now - 2 * D + 60e3, who: "system", what: "Snapshot stored · 2.1 MB · served from snap.know-me.tools" },
      ],
    },
    {
      id: "patient-chat",
      name: "Patient Chat storyboard",
      project: "patient-chat-storyboard.html",
      preview: "chat",
      slug: "pc-Vb2mN8qR4tK7xZ1cH5dW9s",
      stage: "changes",
      version: 2,
      owner: "travis",
      publishedAt: now - 4 * D,
      expiresAt: now + 10 * D,
      approvers: [
        { id: "travis", status: "approved" },
        { id: "dana", status: "changes", note: "Consent state must be visible before a chart opens." },
      ],
      versions: [
        { v: 2, at: now - 4 * D, notes: ["Thinking block collapses and shows what was read", "Case list shows chart status"] },
        { v: 1, at: now - 8 * D, notes: ["First published snapshot"] },
      ],
      comments: [
        c("c1", "dana", false, 18, 52, ".case:nth-child(3) .tag", "“Needs consent” must block opening the chart, not just label it.", 50),
        c("c2", "Care coordinator (guest)", true, 62, 30, "main > .think", "I like seeing what it read. Can I click a lab result from here?", 26, { unread: true }),
      ],
      audit: [
        { at: now - 4 * D, who: "travis", what: "Published <b>v2</b> for review" },
        { at: now - 2 * D, who: "dana", what: "Requested changes: consent state must be visible before a chart opens" },
      ],
    },
    {
      id: "global-policy",
      name: "KnowMe desktop — Global policy",
      project: "knowme-desktop-global-policy.html",
      preview: "policy",
      slug: "gp-Qw4eR7tY1uI3oP6aS9dF2g",
      stage: "approved",
      version: 2,
      owner: "travis",
      publishedAt: now - 6 * D,
      expiresAt: now + 8 * D,
      approvers: [
        { id: "travis", status: "approved" },
        { id: "sam", status: "approved" },
      ],
      versions: [
        { v: 2, at: now - 6 * D, notes: ["Agent sharing row shows how often agents asked", "Lane pill in the title bar"] },
        { v: 1, at: now - 11 * D, notes: ["First published snapshot"] },
      ],
      comments: [
        c("c1", "sam", false, 70, 72, "main > .row:nth-child(4)", "The weekly count is great. Keep it.", 120, { resolved: true }),
      ],
      audit: [
        { at: now - 6 * D, who: "travis", what: "Published <b>v2</b> for review" },
        { at: now - 3 * D, who: "sam", what: "Approved v2" },
        { at: now - 3 * D + 3 * H, who: "travis", what: "Approved v2 · gate passed (2 of 2)" },
      ],
    },
    {
      id: "build-your-bench",
      name: "Build your bench — landing",
      project: "knowme-build-your-bench.html",
      preview: "bench",
      slug: "bb-Lk9jH6gF3dS1aZ8xC5vB2n",
      stage: "released",
      version: 4,
      owner: "travis",
      publishedAt: now - 15 * D,
      expiresAt: now + 75 * D,
      releasedTo: "northwind",
      releasedAt: now - 9 * D,
      approvers: [
        { id: "travis", status: "approved" },
        { id: "priya", status: "approved" },
      ],
      versions: [{ v: 4, at: now - 15 * D, notes: ["Four starter roles", "Secondary action is plain, not outlined"] }],
      comments: [],
      audit: [
        { at: now - 12 * D, who: "priya", what: "Approved v4" },
        { at: now - 9 * D, who: "travis", what: "Released v4 to <b>Northwind Clinic</b> · link expires in 90 days" },
      ],
    },
    {
      id: "know-meet-kit",
      name: "Know Meet brand kit",
      project: "know-meet-brand-kit.html",
      preview: "meet",
      slug: "km-Tg5hJ8kL2mN4bV7cX1zQ3w",
      stage: "review",
      version: 1,
      owner: "travis",
      publishedAt: now - 1 * D,
      expiresAt: now + 13 * D,
      approvers: [
        { id: "travis", status: "pending" },
        { id: "priya", status: "pending" },
      ],
      versions: [{ v: 1, at: now - 1 * D, notes: ["First published snapshot"] }],
      comments: [],
      audit: [{ at: now - 1 * D, who: "travis", what: "Published <b>v1</b> for review" }],
    },
    {
      id: "company-of-one",
      name: "Company of One — one-pager",
      project: "knowme-company-of-one.html",
      preview: "company",
      slug: null,
      stage: "draft",
      version: 1,
      owner: "travis",
      publishedAt: null,
      expiresAt: null,
      approvers: [
        { id: "travis", status: "pending" },
        { id: "priya", status: "pending" },
      ],
      versions: [{ v: 1, at: now - 3 * H, notes: ["Outline only"] }],
      comments: [],
      audit: [],
    },
  ];

  /* Local KnowDesign projects that can be published (from the daemon). */
  const localProjects = [
    { id: "company-of-one", name: "Company of One — one-pager", file: "knowme-company-of-one.html", size: "0.8 MB" },
    { id: "moodboard", name: "KnowMe moodboard & journeys", file: "knowme-moodboard-user-journeys.html", size: "4.6 MB" },
    { id: "functional-spec", name: "KnowMe functional spec", file: "knowme-functional-spec.html", size: "1.9 MB" },
  ];

  const config = {
    identity: {
      mode: "both",
      guestCookieDays: 14,
      kratosUrl: "https://auth.know-me.tools",
      gateIssuer: "https://gate.know-me.tools",
      audience: "knowdesign-review",
      requireKratosForApprovers: true,
    },
    hosting: {
      reviewHost: "review.know-me.tools",
      snapHost: "snap.know-me.tools",
      storage: "pvc",
      pvcClass: "linode-block-storage-retain",
      pvcSize: 50,
      s3Bucket: "",
      csp: true,
    },
    limits: {
      snapshotMb: 25,
      expiryDays: 14,
      maxExpiryDays: 90,
      publishesPerDay: 60,
      commentChars: 2000,
      commentsPerMin: 30,
    },
    approvals: {
      required: 2,
      blockOnOpen: true,
      authorCanApprove: true,
      resetOnNewVersion: true,
      releaseNeedsApproved: true,
    },
    agents: {
      lane: "remote-user",
      model: "claude-sonnet-5-5",
      tools: {
        "hub.comments.list": true,
        "hub.comments.cluster": true,
        "snap.diff_versions": true,
        "knowdesign.prompt.create": true,
        "notify.reviewers": true,
        "release.draft_notes": true,
      },
      confirmBeforeWrite: true,
    },
    runtime: {
      baseUrl: "",
      agentId: "knowdesign-designer",
      workspaceId: "know-me-tools",
    },
    notifications: {
      email: false,
      emailFrom: "",
      webhook: "",
      digest: "daily",
      inApp: true,
    },
  };

  window.KD_DATA = { people, customers, designs, localProjects, config, previews, H, D };
})();
