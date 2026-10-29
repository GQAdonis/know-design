/* KnowDesign Review — release an approved design to a customer workspace. */
(function () {
  "use strict";
  const { icon, esc, fmtDate, fmtTime, fmtIn, pace, toast, dialog, busy, slug } = window.KD_UI;
  const K = () => window.KD;

  const forms = {};
  const formFor = (d) => {
    forms[d.id] = forms[d.id] || {
      customer: "northwind", expiry: 30, passcodeOn: true, passcode: "", watermark: true, comments: true,
      notes: draftNotes(d), drafting: false, errors: {},
    };
    return forms[d.id];
  };

  function draftNotes(d) {
    const v = d.versions[0];
    return `${d.name} — version ${d.version}\n\nWhat's in this version:\n${v.notes.map((n) => `• ${n}`).join("\n")}\n\nThis is a design preview, not working software. Comments you leave go straight to the KnowDesign team.`;
  }

  function validate(f) {
    const e = {};
    if (!f.customer) e.customer = "Choose the customer workspace.";
    if (f.passcodeOn && !/^\S{6,32}$/.test(f.passcode)) e.passcode = "Use 6–32 characters with no spaces.";
    if (f.notes.trim().length < 20) e.notes = "Release notes need at least a sentence for the customer.";
    if (f.notes.length > 4000) e.notes = "Keep release notes under 4,000 characters.";
    return e;
  }

  const errHtml = (f, k) => f.errors[k] ? `<div class="err" id="rel-${k}-err">${icon("alert", "icon-sm")}<span>${esc(f.errors[k])}</span></div>` : "";

  function page(r, d) {
    const crumbs = `<a href="#/releases">Releases</a>${icon("chevron", "icon-sm")}<a href="#/design/${d.id}">${esc(d.name)}</a>`;
    if (d.stage === "released") return K().shell(r, "Released to customer", crumbs, releasedHtml(d), K().pill(d.stage));
    if (d.stage !== "approved") {
      return K().shell(r, "Release to customer", crumbs, `<div class="blocked-panel" style="max-width:640px;margin-top:8px">
        <h2 style="font-size:20px">Only approved designs can be released</h2>
        <p>${esc(d.name)} is ${esc(K().STAGES.find((s) => s.id === d.stage).label.toLowerCase())}. It needs ${K().state.config.approvals.required} approvals on the current version before it can go to a customer.</p>
        <div><a class="btn" href="#/design/${d.id}">Back to the review</a></div></div>`, K().pill(d.stage));
    }
    const f = formFor(d);
    const errs = Object.keys(f.errors);
    const summary = errs.length ? `<div class="error-summary" role="alert" tabindex="-1" id="rel-errors"><span class="t">Fix ${errs.length} thing${errs.length > 1 ? "s" : ""} before releasing</span><ul>${errs.map((k) => `<li><a href="#" data-rel-jump="${k === "customer" ? "rel-customer-" + K().state.customers[0].id : "rel-" + k}">${esc(f.errors[k])}</a></li>`).join("")}</ul></div>` : "";
    const custCards = K().state.customers.map((c) => `<label class="radio-card"><input type="radio" name="rel-customer" id="rel-customer-${c.id}" value="${c.id}" ${f.customer === c.id ? "checked" : ""}>
      <div class="od-field"><span class="t">${esc(c.name)}</span><span class="d">${esc(c.note)} · ${c.contacts} contacts · <span class="mono">${esc(c.workspace)}</span></span></div></label>`).join("");
    const sw = (key, title, help) => `<div class="switch-row"><div class="od-field"><span class="switch-title" id="rel-${key}-l">${title}</span><span class="switch-help">${help}</span></div>
      <button type="button" class="switch-hit" role="switch" aria-checked="${f[key]}" aria-labelledby="rel-${key}-l" data-rel-switch="${key}"><span class="switch" aria-checked="${f[key]}"></span></button></div>`;

    const body = `<div class="release-grid">
      <form class="panel form-stack" id="rel-form" novalidate>
        ${summary}
        <div class="form-group"><h3 id="rel-customer">Customer workspace</h3><div class="radio-cards" role="radiogroup" aria-labelledby="rel-customer">${custCards}</div>${errHtml(f, "customer")}</div>
        <div class="form-group"><h3>Customer link</h3>
          <div class="field"><label for="rel-expiry">Link expires after</label>
            <select id="rel-expiry" class="select">${[7, 30, 60, 90].filter((n) => n <= K().state.config.limits.maxExpiryDays).map((n) => `<option value="${n}" ${f.expiry === n ? "selected" : ""}>${n} days — ${fmtDate(Date.now() + n * 864e5)}</option>`).join("")}</select></div>
          ${sw("passcodeOn", "Require a passcode", "Send the passcode separately from the link.")}
          ${f.passcodeOn ? `<div class="field"><label for="rel-passcode">Passcode <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
            <input id="rel-passcode" class="input" type="text" autocomplete="off" spellcheck="false" value="${esc(f.passcode)}" aria-invalid="${!!f.errors.passcode}" aria-describedby="rel-passcode-help ${f.errors.passcode ? "rel-passcode-err" : ""}">
            <span class="help" id="rel-passcode-help">6–32 characters, no spaces.</span>${errHtml(f, "passcode")}</div>` : ""}
          ${sw("watermark", "Watermark with the customer's name", "Each screen shows the workspace name in a corner.")}
          ${sw("comments", "Let the customer comment", "Customer comments arrive in your Inbox like any reviewer's.")}
        </div>
        <div class="form-group"><div class="od-row"><h3 class="od-fill"><label for="rel-notes">Release notes <span class="req" aria-hidden="true">*</span><span class="sr-only">(required)</span></label></h3>
            <button type="button" class="btn btn-cyan" data-rel="redraft" ${f.drafting ? "disabled" : ""}>${f.drafting ? '<span class="spinner" aria-hidden="true"></span>Drafting…' : `${icon("sparkles", "icon-sm")}Redraft with agent`}</button></div>
          ${f.drafted ? `<div class="block tool completed"><div class="tool-head">${icon("wrench", "icon-sm")}<span class="tool-name">release.draft_notes</span><span class="tool-state completed">${icon("check", "icon-sm")}Done</span></div><div class="tool-summary">Drafted from the v${d.version} change notes and ${d.comments.filter((c) => c.resolved).length} resolved comments. Edit freely.</div></div>` : ""}
          <textarea id="rel-notes" class="textarea" style="min-height:200px" aria-invalid="${!!f.errors.notes}" aria-describedby="rel-notes-help ${f.errors.notes ? "rel-notes-err" : ""}">${esc(f.notes)}</textarea>
          <span class="help" id="rel-notes-help">The customer sees this above the design.</span>${errHtml(f, "notes")}</div>
        <div class="od-cluster"><a class="btn btn-ghost" href="#/design/${d.id}">Cancel</a><span class="od-fill"></span><button type="submit" class="btn btn-primary btn-lg" id="rel-submit">${icon("send", "icon-sm")}Release v${d.version}</button></div>
      </form>
      <aside class="od-stack" style="--od-gap:16px">
        <div class="panel panel-tight od-stack" style="--od-gap:12px"><div class="eyebrow">What the customer gets</div>
          <div class="card-thumb" style="border-radius:12px" aria-hidden="true">${K().frameHtml(d)}</div>
          <dl class="kv"><dt>Design</dt><dd>${esc(d.name)} v${d.version}</dd><dt>Approved by</dt><dd>${d.approvers.filter((a) => a.status === "approved").map((a) => esc(K().person(a.id).name)).join(", ")}</dd>
          <dt>Link</dt><dd>${esc(K().state.config.hosting.reviewHost)}/c/…</dd><dt>Snapshot</dt><dd>${esc(K().state.config.hosting.snapHost)} · sandboxed</dd></dl></div>
        <div class="panel panel-tight od-stack" style="--od-gap:8px"><div class="eyebrow">Audit trail</div>${auditHtml(d)}</div>
      </aside></div>`;
    return K().shell(r, "Release to customer", crumbs, body, K().pill(d.stage));
  }

  function auditHtml(d) {
    return d.audit.length ? `<div class="audit">${d.audit.map((a) => `<div class="audit-row"><span class="mono">${fmtDate(a.at)} ${fmtTime(a.at)}</span><span class="what"><b>${esc(a.who === "system" ? "Hub" : K().person(a.who).name)}</b> — ${a.what}</span></div>`).join("")}</div>` : `<p class="sub">No activity yet.</p>`;
  }

  function releasedHtml(d) {
    const c = K().state.customers.find((x) => x.id === d.releasedTo) || { name: "Customer" };
    const url = K().customerUrl(d);
    return `<div class="release-grid">
      <div class="od-stack" style="--od-gap:16px">
        <section class="success-panel" aria-labelledby="ok-h">
          <h2 id="ok-h">${icon("check")}Shared with ${esc(c.name)}</h2>
          <p>v${d.version} is live for the <b>${esc(c.name)}</b> workspace. The link expires ${fmtIn(d.expiresAt)} (${fmtDate(d.expiresAt)}).</p>
          <div class="link-box"><span class="od-truncate">${esc(url)}</span><button class="btn btn-primary" data-copy="${esc(url)}">${icon("copy", "icon-sm")}Copy link</button></div>
          <div class="od-cluster"><a class="btn" href="#/releases/${esc(d.lastRecordId || "rel-bench-northwind")}">Open release details</a><a class="btn" href="#/c/${esc(d.releaseSlug || "")}" target="_blank" rel="noopener">${icon("external", "icon-sm")}Open as customer</a></div>
          ${d.releasePasscode ? `<p class="sub">Passcode set. Send it to the customer separately — it isn't shown again.</p>` : ""}
        </section>
        <div class="panel od-stack" style="--od-gap:8px"><div class="eyebrow">Release notes</div><p style="white-space:pre-wrap">${esc(d.releaseNotes || "Released before release notes were required.")}</p></div>
      </div>
      <div class="panel panel-tight od-stack" style="--od-gap:8px"><div class="eyebrow">Audit trail</div>${auditHtml(d)}</div></div>`;
  }

  const current = () => { const m = location.hash.match(/^#\/release\/([^/]+)/); return m ? K().design(decodeURIComponent(m[1])) : null; };
  const rerender = (focusId) => { K().render(); if (focusId) { const el = document.getElementById(focusId); el && el.focus(); } };

  function readForm(f) {
    const g = (id) => document.getElementById(id);
    const cust = document.querySelector('input[name="rel-customer"]:checked');
    f.customer = cust ? cust.value : "";
    if (g("rel-expiry")) f.expiry = Number(g("rel-expiry").value);
    if (g("rel-passcode")) f.passcode = g("rel-passcode").value;
    if (g("rel-notes")) f.notes = g("rel-notes").value;
  }

  async function submit(d) {
    const f = formFor(d);
    readForm(f);
    f.errors = validate(f);
    if (Object.keys(f.errors).length) { rerender("rel-errors"); return; }
    const c = K().state.customers.find((x) => x.id === f.customer);
    const res = await dialog({
      title: `Release to ${c.name}?`,
      body: `<div class="consequence"><ul>
        <li>${c.contacts} people in <span class="mono">${esc(c.workspace)}</span> can open v${d.version} for ${f.expiry} days.</li>
        <li>${f.passcodeOn ? "They'll need the passcode you send them separately." : "Anyone with the link can open it — there's no passcode."}</li>
        <li>${f.comments ? "Their comments come back to your Inbox." : "Comments are turned off for this release."}</li>
        <li>You can revoke the customer link at any time from Releases.</li></ul></div>`,
      actions: [{ id: "cancel", label: "Cancel", kind: "btn-ghost" }, {
        id: "ok", label: "Release now", kind: "btn-primary",
        handler: async (_, btn) => { const done = busy(btn, "Releasing…"); await pace(1000); done(); },
      }],
    });
    if (res !== "ok") return;
    d.stage = "released";
    d.releasedTo = c.id; d.releasedAt = Date.now();
    d.releaseSlug = "c-" + slug();
    d.expiresAt = Date.now() + f.expiry * 864e5;
    d.releaseNotes = f.notes;
    d.releasePasscode = f.passcodeOn;
    const rec = window.KD_RELEASES.add(d, f, c);
    d.lastRecordId = rec.id;
    K().audit(d, K().ME, `Released v${d.version} to <b>${esc(c.name)}</b> · link expires in ${f.expiry} days${f.passcodeOn ? " · passcode required" : ""}`);
    toast(`Released to ${c.name}`);
    rerender();
  }

  document.addEventListener("click", async (e) => {
    const d = current(); if (!d) return;
    const f = formFor(d);
    const sw = e.target.closest("[data-rel-switch]");
    if (sw) { readForm(f); f[sw.dataset.relSwitch] = !f[sw.dataset.relSwitch]; rerender(null); const again = document.querySelector(`[data-rel-switch="${sw.dataset.relSwitch}"]`); again && again.focus(); return; }
    const jump = e.target.closest("[data-rel-jump]");
    if (jump) { e.preventDefault(); const t = document.getElementById(jump.dataset.relJump) || document.getElementById(jump.dataset.relJump + "-" + (K().state.customers[0] || {}).id); t && t.focus(); return; }
    const b = e.target.closest('[data-rel="redraft"]');
    if (b) {
      readForm(f); f.drafting = true; rerender(null);
      await pace(1200);
      f.notes = draftNotes(d) + (d.comments.some((c) => c.resolved) ? `\n\nBased on reviewer feedback we kept: ${d.comments.filter((c) => c.resolved).map((c) => c.text.replace(/\.$/, "")).join("; ")}.` : "");
      f.drafting = false; f.drafted = true; rerender("rel-notes");
    }
  });
  document.addEventListener("submit", (e) => {
    if (e.target.id !== "rel-form") return;
    e.preventDefault();
    const d = current(); d && submit(d);
  });
  document.addEventListener("focusout", (e) => {
    const d = current(); if (!d || !e.target.id || !e.target.id.startsWith("rel-")) return;
    const f = formFor(d);
    readForm(f);
    const all = validate(f);
    const key = e.target.id.replace("rel-", "");
    if (!(key in all) && !f.errors[key]) return;
    const next = { ...f.errors };
    if (all[key]) next[key] = all[key]; else delete next[key];
    if (JSON.stringify(next) === JSON.stringify(f.errors)) return;
    f.errors = next;
    const field = e.target.closest(".field, .form-group");
    const old = field && field.querySelector(".err");
    old && old.remove();
    e.target.setAttribute("aria-invalid", !!next[key]);
    if (next[key] && field) field.insertAdjacentHTML("beforeend", errHtml(f, key));
  });

  window.KD_RELEASE = { page, mount: () => {} };
})();
