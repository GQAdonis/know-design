// @vitest-environment jsdom

// od-mock runs inside the web app's sandboxed preview frame, so it is tested
// here with jsdom against the real vendored htmx 2.0.8 build and the compiled
// od-mock.js (scenario MOCK-1, phase htmx-prototypes-and-ipfs-deploy).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  applyAction,
  installOdMock,
  interpolate,
  matchPattern,
  parseBody,
  parseRouteSpec,
  splitPath,
} from '../../../../design-templates/htmx-alpine-prototype/src/od-mock';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.resolve(here, '../../../../design-templates/htmx-alpine-prototype/assets/vendor');

type HtmxGlobal = {
  process: (el: Element) => void;
  config: Record<string, unknown>;
};
type MockGlobal = { reset: () => void; data: () => Record<string, unknown> };

function evalInWindow(file: string) {
  // Indirect eval in the jsdom window so `var htmx` becomes a window global.
  (window as unknown as { eval: (code: string) => void }).eval(readFileSync(path.join(vendor, file), 'utf8'));
}

let realXhrConstructed = 0;

function waitFor(eventName: string, target: EventTarget = document.body): Promise<Event> {
  return new Promise((resolve) => target.addEventListener(eventName, resolve, { once: true }));
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

describe('od-mock pure helpers', () => {
  it('parses route specs', () => {
    expect(parseRouteSpec('post /api/items')).toEqual({ method: 'POST', pattern: '/api/items' });
    expect(parseRouteSpec('nonsense')).toBeNull();
  });

  it('matches exact paths, params and trailing segments', () => {
    expect(matchPattern(splitPath('/api/items/:id'), '/api/items/7')).toEqual({ id: '7' });
    expect(matchPattern(splitPath('/api/items'), '/preview/abc/api/items')).toEqual({});
    expect(matchPattern(splitPath('/api/items'), '/api/other')).toBeNull();
    expect(matchPattern(splitPath('/api/items/:id'), '/api/items')).toBeNull();
  });

  it('interpolates dotted paths and blanks missing values', () => {
    expect(interpolate('{{item.title}} ({{data.items.length}}) {{nope.x}}', {
      item: { title: 'A' },
      data: { items: [1, 2] },
    })).toBe('A (2) ');
  });

  it('parses urlencoded, JSON and FormData bodies', () => {
    expect(parseBody('title=Hi&done=on')).toEqual({ title: 'Hi', done: 'on' });
    expect(parseBody('{"title":"Hi"}')).toEqual({ title: 'Hi' });
    const form = new FormData();
    form.append('title', 'Hi');
    expect(parseBody(form)).toEqual({ title: 'Hi' });
  });

  it('applies create, update, toggle and delete actions', () => {
    const store: Record<string, unknown> = { items: [{ id: '1', title: 'A', done: false }] };
    expect(applyAction('create:items', store, {}, { title: 'B' }).item).toMatchObject({ id: '2', title: 'B' });
    expect(applyAction('update:items', store, { id: '1' }, { title: 'A2', done: 'on' }).item).toMatchObject({ id: '1', title: 'A2', done: true });
    expect(applyAction('toggle:items:done', store, { id: '1' }, {}).item).toMatchObject({ done: false });
    expect(applyAction('delete:items', store, { id: '2' }, {}).item).toMatchObject({ title: 'B' });
    expect(store.items).toHaveLength(1);
    expect(applyAction('delete:items', store, { id: '99' }, {})).toEqual({ item: null, missing: true });
  });
});

describe('od-mock request paths in documents without an http origin', () => {
  // htmx resolves a request path with `new URL(path, document.location.href)`.
  // That throws for root-relative paths when the document URL is about:srcdoc
  // (web preview) or blob:od://app/… (packaged desktop preview), so no request
  // is ever made. od-mock must hand htmx an absolute URL in both.
  function configuredPath(protocol: string, requestPath: string): string {
    const doc = document.implementation.createHTMLDocument('preview');
    const fakeWin = {
      document: doc,
      location: { protocol },
      htmx: { config: {} as Record<string, unknown> },
      XMLHttpRequest: class {},
    };
    installOdMock(fakeWin as unknown as Parameters<typeof installOdMock>[0]);
    const detail = { path: requestPath };
    doc.dispatchEvent(new CustomEvent('htmx:configRequest', { detail }));
    return detail.path;
  }

  it.each(['about:', 'blob:', 'data:'])('makes root-relative paths absolute in a %s document', (protocol) => {
    const resolved = configuredPath(protocol, '/api/books');
    expect(() => new URL(resolved)).not.toThrow();
    expect(new URL(resolved).pathname).toBe('/api/books');
  });

  it('leaves paths alone on an http(s) page, where htmx can resolve them', () => {
    expect(configuredPath('https:', '/api/books')).toBe('/api/books');
  });
});

describe('od-mock with real htmx 2.0.8', () => {
  beforeAll(() => {
    // Any request that reaches the real XHR is a failure: mocked htmx traffic
    // must never touch the network.
    class ForbiddenXhr {
      constructor() {
        realXhrConstructed += 1;
      }
      open() {}
      send() {}
      setRequestHeader() {}
      addEventListener() {}
      upload = { addEventListener() {} };
    }
    (window as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = ForbiddenXhr;
    // jsdom requires the XPath result type argument that browsers default to 0
    // (ANY_TYPE); htmx 2 omits it in `XPathExpression.evaluate(elt)` when
    // scanning for hx-on attributes.
    const expressionProto = Object.getPrototypeOf(new XPathEvaluator().createExpression('.', null)) as {
      evaluate: (node: Node, type?: number, result?: XPathResult | null) => XPathResult;
    };
    const evaluate = expressionProto.evaluate;
    expressionProto.evaluate = function patchedEvaluate(node: Node, type?: number, result?: XPathResult | null) {
      return evaluate.call(this, node, type ?? 0, result ?? null);
    };
    evalInWindow('htmx.min.js');
    evalInWindow('ext/response-targets.min.js');
    evalInWindow('od-mock.js');
  });

  beforeEach(() => {
    (window as unknown as { odMock: MockGlobal }).odMock.reset();
    // Extensions run for the swap target, so hx-ext sits on <body> (as the
    // template's conventions require), not on the requesting form.
    document.body.setAttribute('hx-ext', 'response-targets');
    document.body.innerHTML = `
      <script type="application/json" id="od-mock-data">{"items":[{"id":"1","title":"First"},{"id":"2","title":"Second"}]}</script>
      <span id="count">0</span>
      <button id="load" hx-get="/api/items" hx-target="#items">Load</button>
      <ul id="items"></ul>
      <form id="add" hx-post="/api/items" hx-target="#items" hx-swap="beforeend" hx-target-422="#errors">
        <input name="title" value="Third">
      </form>
      <div id="errors"></div>
      <button id="missing" hx-get="/api/nowhere" hx-target="#errors">Missing</button>
      <template data-od-route="GET /api/items">
        <li data-od-each="data.items" id="item-{{item.id}}">{{item.title}}<button hx-delete="/api/items/{{item.id}}" hx-target="#item-{{item.id}}" hx-swap="outerHTML">x</button></li>
      </template>
      <template data-od-route="POST /api/items" data-od-action="create:items" data-od-headers='{"HX-Trigger":"item-created"}'>
        <li id="item-{{item.id}}">{{item.title}}</li>
        <span id="count" hx-swap-oob="true">{{data.items.length}}</span>
      </template>
      <template data-od-route="DELETE /api/items/:id" data-od-action="delete:items"></template>
    `;
    (window as unknown as { htmx: HtmxGlobal }).htmx.process(document.body);
  });

  it('reports mock mode and sets the config it relies on', () => {
    const htmx = (window as unknown as { htmx: HtmxGlobal }).htmx;
    expect(htmx.config.selfRequestsOnly).toBe(false);
    expect(htmx.config.historyEnabled).toBe(false);
  });

  it('lists, creates with an OOB update and a trigger header, and deletes', async () => {
    const swapped = waitFor('htmx:afterSettle');
    (document.getElementById('load') as HTMLButtonElement).click();
    await swapped;
    expect(Array.from(document.querySelectorAll('#items li')).map((li) => li.id)).toEqual(['item-1', 'item-2']);

    const triggered = waitFor('item-created');
    const created = waitFor('htmx:afterSettle');
    (document.getElementById('add') as HTMLFormElement).requestSubmit();
    await Promise.all([triggered, created]);
    expect(document.getElementById('item-3')?.textContent).toBe('Third');
    expect(document.getElementById('count')?.textContent).toBe('3');

    // The swapped-out element is gone, so htmx re-dispatches afterOnLoad on a
    // surviving parent; afterSettle would fire on the detached node.
    const deleted = waitFor('htmx:afterOnLoad');
    (document.querySelector('#item-1 button') as HTMLButtonElement).click();
    await deleted;
    await settle();
    expect(document.getElementById('item-1')).toBeNull();
    expect((window as unknown as { odMock: MockGlobal }).odMock.data().items).toHaveLength(2);
    expect(realXhrConstructed).toBe(0);
  });

  it('escapes interpolated values instead of injecting markup', async () => {
    const input = document.querySelector('#add input') as HTMLInputElement;
    input.value = '<img src=x onerror=alert(1)>';
    const created = waitFor('htmx:afterSettle');
    (document.getElementById('add') as HTMLFormElement).requestSubmit();
    await created;
    expect(document.querySelector('#items img')).toBeNull();
    expect(document.getElementById('item-3')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('routes error statuses through response-targets', async () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<template data-od-route="POST /api/items" data-od-status="422"><p class="err">Title taken</p></template>',
    );
    // The more recent 422 route is not more specific, so make it the only POST.
    document.querySelector('template[data-od-route="POST /api/items"][data-od-action]')?.remove();
    const loaded = waitFor('htmx:afterOnLoad');
    (document.getElementById('add') as HTMLFormElement).requestSubmit();
    await loaded;
    await settle();
    expect(document.querySelector('#errors .err')?.textContent).toBe('Title taken');
  });

  it('uses data-od-when-not guards to answer a 422 for invalid input', async () => {
    document.querySelector('template[data-od-action="create:items"]')?.insertAdjacentHTML(
      'beforebegin',
      '<template data-od-route="POST /api/items" data-od-status="422" data-od-when-not="form.title"><p class="err">Title is required</p></template>',
    );
    (document.querySelector('#add input') as HTMLInputElement).value = '';
    const loaded = waitFor('htmx:afterOnLoad');
    (document.getElementById('add') as HTMLFormElement).requestSubmit();
    await loaded;
    await settle();
    expect(document.querySelector('#errors .err')?.textContent).toBe('Title is required');
    expect((window as unknown as { odMock: MockGlobal }).odMock.data().items).toHaveLength(2);

    (document.querySelector('#add input') as HTMLInputElement).value = 'Valid';
    const created = waitFor('htmx:afterSettle');
    (document.getElementById('add') as HTMLFormElement).requestSubmit();
    await created;
    expect(document.getElementById('item-3')?.textContent).toBe('Valid');
  });

  it('loads one record with data-od-item and 404s a missing id', async () => {
    document.body.insertAdjacentHTML('beforeend', '<template data-od-route="GET /api/items/:id" data-od-item="items"><h2>{{item.title}}</h2></template>');
    const odMock = window as unknown as { odMock: { respond: (m: string, u: string) => { status: number; body: string } } };
    expect(odMock.odMock.respond('GET', '/api/items/2')).toMatchObject({ status: 200, body: '<h2>Second</h2>' });
    expect(odMock.odMock.respond('GET', '/api/items/99').status).toBe(404);
  });

  it('answers unknown routes with a 404 instead of reaching the network', async () => {
    const failed = waitFor('htmx:responseError');
    (document.getElementById('missing') as HTMLButtonElement).click();
    const event = await failed as CustomEvent<{ xhr: { status: number } }>;
    expect(event.detail.xhr.status).toBe(404);
    expect(realXhrConstructed).toBe(0);
  });
});
