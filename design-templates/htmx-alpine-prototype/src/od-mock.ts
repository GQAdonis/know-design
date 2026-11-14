/**
 * od-mock — an in-page backend for htmx prototypes.
 *
 * Prototypes run in places with no server: KnowDesign's sandboxed preview
 * iframe (opaque origin, often an `about:srcdoc` document) and IPFS gateways.
 * od-mock answers every htmx request from route templates declared in the page,
 * so `hx-get` / `hx-post` / … behave as they would against a real server while
 * no request leaves the page.
 *
 * Declaring routes:
 *
 *   <template data-od-route="GET /api/items">
 *     <li data-od-each="data.items" id="item-{{item.id}}">{{item.title}}</li>
 *   </template>
 *   <template data-od-route="POST /api/items" data-od-action="create:items">
 *     <li id="item-{{item.id}}">{{item.title}}</li>
 *   </template>
 *   <template data-od-route="DELETE /api/items/:id" data-od-action="delete:items"></template>
 *   <script type="application/json" id="od-mock-data">{"items":[{"id":"1","title":"First"}]}</script>
 *
 * Template features: `{{path}}` interpolation in text and attributes (always
 * escaped), `data-od-each="path"`, `data-od-if="path"`, `data-od-unless="path"`.
 * Scope: `params` (path params), `form` (request body), `query`, `data` (the
 * store), `item` / `index` (inside each, or the item an action touched).
 * Guards: `data-od-when="path"` / `data-od-when-not="path"` skip the template
 * unless the path is truthy / falsy, so one route can answer differently
 * (e.g. a 422 for an empty title). Templates are tried in document order.
 * `data-od-item="<list>"` loads the record at `:id` into `item` for read routes.
 * Route options: `data-od-status`, `data-od-delay` (ms),
 * `data-od-headers` (JSON, e.g. `{"HX-Trigger":"saved"}`),
 * `data-od-action` = `create:<list>` | `update:<list>` | `delete:<list>` |
 * `toggle:<list>:<field>`.
 *
 * Real backend: `<meta name="od-backend" content="https://api.example">` turns
 * mocking off and sends htmx requests to that base URL instead (for example the
 * Axum server produced by the od-axum-export scenario).
 *
 * Build: compiled to `assets/vendor/od-mock.js` (see assets/vendor/MANIFEST.json).
 */

export type Scope = Record<string, unknown>;

export interface MockResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
}

interface CompiledRoute {
  method: string;
  pattern: string;
  keys: string[];
  segments: string[];
  template: HTMLTemplateElement;
}

const BACKEND_META = 'od-backend';
const DATA_SCRIPT_ID = 'od-mock-data';
const MOCK_ORIGIN = 'https://od-mock.invalid';
const INTERPOLATION = /\{\{\s*([\w$.-]+)\s*\}\}/g;

// ---- pure helpers (exported for tests) -------------------------------------

export function parseRouteSpec(spec: string): { method: string; pattern: string } | null {
  const match = /^\s*([A-Za-z]+)\s+(\/\S*)\s*$/.exec(spec);
  if (!match) return null;
  return { method: match[1]!.toUpperCase(), pattern: match[2]! };
}

export function splitPath(pathname: string): string[] {
  return pathname.split('/').filter((segment) => segment.length > 0);
}

/**
 * Matches a route pattern against a request pathname. An exact match wins;
 * otherwise the pattern may match the trailing segments, so `/api/items`
 * still matches when a relative `hx-get` resolved under the page's own path.
 */
export function matchPattern(patternSegments: string[], pathname: string): Record<string, string> | null {
  const requestSegments = splitPath(pathname);
  if (requestSegments.length < patternSegments.length) return null;
  const tail = requestSegments.slice(requestSegments.length - patternSegments.length);
  const params: Record<string, string> = {};
  for (let i = 0; i < patternSegments.length; i += 1) {
    const expected = patternSegments[i]!;
    const actual = decodeURIComponent(tail[i]!);
    if (expected.startsWith(':')) params[expected.slice(1)] = actual;
    else if (expected !== actual) return null;
  }
  return params;
}

export function resolvePath(scope: Scope, path: string): unknown {
  let current: unknown = scope;
  for (const key of path.split('.')) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function truthy(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value === 'false' || value === '0' || value === 'off') return false;
  return Boolean(value);
}

export function interpolate(text: string, scope: Scope): string {
  return text.replace(INTERPOLATION, (_whole, path: string) => {
    const value = resolvePath(scope, path);
    return value === null || value === undefined ? '' : String(value);
  });
}

export function parseBody(body: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!body) return out;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    body.forEach((value, key) => {
      if (typeof value === 'string') out[key] = value;
    });
    return out;
  }
  if (typeof body === 'string') {
    const trimmed = body.trim();
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        for (const [key, value] of Object.entries(parsed)) out[key] = String(value);
        return out;
      } catch {
        return out;
      }
    }
    new URLSearchParams(body).forEach((value, key) => {
      out[key] = value;
    });
  }
  return out;
}

export function nextId(items: Array<Record<string, unknown>>): string {
  const numeric = items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
  return String(numeric.length > 0 ? Math.max(...numeric) + 1 : items.length + 1);
}

/** Applies a route action to the store and returns the touched item, or null when it is missing. */
export function applyAction(
  action: string,
  store: Record<string, unknown>,
  params: Record<string, string>,
  form: Record<string, string>,
): { item: Record<string, unknown> | null; missing: boolean } {
  const [verb, listName, field] = action.split(':');
  if (!verb || !listName) return { item: null, missing: false };
  const list = Array.isArray(store[listName]) ? store[listName] as Array<Record<string, unknown>> : [];
  store[listName] = list;
  if (verb === 'create') {
    const item = { ...coerce(form), id: form.id || nextId(list) };
    list.push(item);
    return { item, missing: false };
  }
  const index = list.findIndex((candidate) => String(candidate.id) === String(params.id));
  if (index < 0) return { item: null, missing: true };
  const item = list[index]!;
  if (verb === 'update') Object.assign(item, coerce(form), { id: item.id });
  else if (verb === 'delete') list.splice(index, 1);
  else if (verb === 'toggle' && field) item[field] = !truthy(item[field]);
  return { item, missing: false };
}

function coerce(form: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(form)) {
    out[key] = value === 'on' || value === 'true' ? true : value === 'false' ? false : value;
  }
  return out;
}

// ---- template rendering ------------------------------------------------------

export function renderTemplate(template: HTMLTemplateElement, scope: Scope): string {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  for (const child of Array.from(fragment.childNodes)) processNode(child, scope);
  const container = template.ownerDocument.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

function processNode(node: Node, scope: Scope): void {
  if (node.nodeType === 3) {
    node.textContent = interpolate(node.textContent ?? '', scope);
    return;
  }
  if (node.nodeType !== 1) return;
  const element = node as Element;
  const ifPath = element.getAttribute('data-od-if');
  if (ifPath !== null) {
    element.removeAttribute('data-od-if');
    if (!truthy(resolvePath(scope, ifPath))) {
      element.remove();
      return;
    }
  }
  const unlessPath = element.getAttribute('data-od-unless');
  if (unlessPath !== null) {
    element.removeAttribute('data-od-unless');
    if (truthy(resolvePath(scope, unlessPath))) {
      element.remove();
      return;
    }
  }
  const eachPath = element.getAttribute('data-od-each');
  if (eachPath !== null) {
    element.removeAttribute('data-od-each');
    const items = resolvePath(scope, eachPath);
    const list = Array.isArray(items) ? items : [];
    const parent = element.parentNode;
    list.forEach((item, index) => {
      const clone = element.cloneNode(true) as Element;
      parent?.insertBefore(clone, element);
      processNode(clone, { ...scope, item, index });
    });
    element.remove();
    return;
  }
  for (const attr of Array.from(element.attributes)) {
    if (attr.value.includes('{{')) element.setAttribute(attr.name, interpolate(attr.value, scope));
  }
  const children = element instanceof HTMLTemplateElement
    ? Array.from(element.content.childNodes)
    : Array.from(element.childNodes);
  for (const child of children) processNode(child, scope);
}

// ---- runtime -----------------------------------------------------------------

interface HtmxLike {
  config: Record<string, unknown>;
}

let store: Record<string, unknown> | null = null;

function readStore(doc: Document): Record<string, unknown> {
  if (store) return store;
  const script = doc.getElementById(DATA_SCRIPT_ID);
  try {
    store = script?.textContent ? JSON.parse(script.textContent) as Record<string, unknown> : {};
  } catch {
    store = {};
  }
  return store;
}

function compileRoutes(doc: Document): CompiledRoute[] {
  const routes: CompiledRoute[] = [];
  doc.querySelectorAll('template[data-od-route]').forEach((node) => {
    const spec = parseRouteSpec(node.getAttribute('data-od-route') ?? '');
    if (!spec) return;
    const segments = splitPath(spec.pattern);
    routes.push({
      ...spec,
      segments,
      keys: segments.filter((s) => s.startsWith(':')).map((s) => s.slice(1)),
      template: node as HTMLTemplateElement,
    });
  });
  // More specific (longer, fewer params) routes first.
  return routes.sort((a, b) => b.segments.length - a.segments.length || a.keys.length - b.keys.length);
}

/** Resolves a request against the page's routes. Never throws. */
export function respond(doc: Document, method: string, url: string, body: unknown): MockResponse {
  let parsed: URL;
  try {
    parsed = new URL(url, MOCK_ORIGIN);
  } catch {
    return { status: 400, body: '', headers: {} };
  }
  const routes = compileRoutes(doc);
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = matchPattern(route.segments, parsed.pathname);
    if (!params) continue;
    const query: Record<string, string> = {};
    parsed.searchParams.forEach((value, key) => {
      query[key] = value;
    });
    const form = method === 'GET' || method === 'DELETE' ? query : parseBody(body);
    const data = readStore(doc);
    // Guards let several templates share one route: e.g. a 422 template with
    // data-od-when-not="form.title" before the create template.
    const guardScope: Scope = { params, form, query, data };
    const when = route.template.getAttribute('data-od-when');
    if (when !== null && !truthy(resolvePath(guardScope, when))) continue;
    const whenNot = route.template.getAttribute('data-od-when-not');
    if (whenNot !== null && truthy(resolvePath(guardScope, whenNot))) continue;
    const action = route.template.getAttribute('data-od-action');
    let item: Record<string, unknown> | null = null;
    if (action) {
      const result = applyAction(action, data, params, form);
      if (result.missing) return { status: 404, body: '', headers: {} };
      item = result.item;
    } else {
      const itemList = route.template.getAttribute('data-od-item');
      if (itemList) {
        const list = Array.isArray(data[itemList]) ? data[itemList] as Array<Record<string, unknown>> : [];
        item = list.find((candidate) => String(candidate.id) === String(params.id)) ?? null;
        if (!item) return { status: 404, body: '', headers: {} };
      }
    }
    const scope: Scope = { params, form, query, data, item };
    let headers: Record<string, string> = {};
    const headerSpec = route.template.getAttribute('data-od-headers');
    if (headerSpec) {
      try {
        headers = JSON.parse(interpolate(headerSpec, scope)) as Record<string, string>;
      } catch {
        headers = {};
      }
    }
    const status = Number(route.template.getAttribute('data-od-status') ?? 200) || 200;
    return { status, body: renderTemplate(route.template, scope), headers };
  }
  console.warn(`[od-mock] no route for ${method} ${parsed.pathname}; add <template data-od-route="${method} ${parsed.pathname}">`);
  return {
    status: 404,
    body: `<div data-od-mock-missing>No mock route for ${method} ${parsed.pathname}</div>`,
    headers: {},
  };
}

function routeDelay(doc: Document, method: string, url: string): number {
  const pathname = (() => {
    try {
      return new URL(url, MOCK_ORIGIN).pathname;
    } catch {
      return '';
    }
  })();
  for (const route of compileRoutes(doc)) {
    if (route.method === method && matchPattern(route.segments, pathname)) {
      return Number(route.template.getAttribute('data-od-delay') ?? 0) || 0;
    }
  }
  return 0;
}

const FORWARDED_EVENTS = ['readystatechange', 'loadstart', 'progress', 'load', 'error', 'abort', 'timeout', 'loadend'];

function createMockXhrClass(RealXHR: typeof XMLHttpRequest, doc: Document) {
  return class OdMockXMLHttpRequest extends EventTarget {
    static readonly UNSENT = 0;
    static readonly OPENED = 1;
    static readonly HEADERS_RECEIVED = 2;
    static readonly LOADING = 3;
    static readonly DONE = 4;

    readyState = 0;
    status = 0;
    statusText = '';
    response: unknown = '';
    responseText = '';
    responseURL = '';
    responseType: XMLHttpRequestResponseType = '';
    timeout = 0;
    withCredentials = false;
    readonly upload = new EventTarget();
    onreadystatechange: ((event: Event) => void) | null = null;
    onloadstart: ((event: Event) => void) | null = null;
    onprogress: ((event: Event) => void) | null = null;
    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    onabort: ((event: Event) => void) | null = null;
    ontimeout: ((event: Event) => void) | null = null;
    onloadend: ((event: Event) => void) | null = null;

    private method = 'GET';
    private url = '';
    private openArgs: [string, string, boolean, (string | null)?, (string | null)?] = ['GET', '', true];
    private requestHeaders: Record<string, string> = {};
    private responseHeaders: Record<string, string> = {};
    private mimeOverride: string | null = null;
    private real: XMLHttpRequest | null = null;
    private aborted = false;

    open(method: string, url: string | URL, async = true, user?: string | null, password?: string | null) {
      this.method = method.toUpperCase();
      this.url = String(url);
      this.openArgs = [method, this.url, async, user, password];
      this.readyState = 1;
    }

    setRequestHeader(name: string, value: string) {
      this.requestHeaders[name] = value;
    }

    overrideMimeType(mime: string) {
      this.mimeOverride = mime;
    }

    getResponseHeader(name: string): string | null {
      if (this.real) return this.real.getResponseHeader(name);
      const key = Object.keys(this.responseHeaders).find((k) => k.toLowerCase() === name.toLowerCase());
      return key ? this.responseHeaders[key]! : null;
    }

    getAllResponseHeaders(): string {
      if (this.real) return this.real.getAllResponseHeaders();
      return Object.entries(this.responseHeaders).map(([k, v]) => `${k.toLowerCase()}: ${v}\r\n`).join('');
    }

    abort() {
      if (this.real) {
        this.real.abort();
        return;
      }
      this.aborted = true;
      this.emit('abort');
      this.emit('loadend');
    }

    send(body?: Document | XMLHttpRequestBodyInit | null) {
      const isHtmx = Object.keys(this.requestHeaders).some((k) => k.toLowerCase() === 'hx-request');
      if (!isHtmx) {
        this.passThrough(body);
        return;
      }
      this.emit('loadstart');
      const delay = routeDelay(doc, this.method, this.url);
      setTimeout(() => {
        if (this.aborted) return;
        const result = respond(doc, this.method, this.url, body);
        this.status = result.status;
        this.statusText = result.status >= 200 && result.status < 300 ? 'OK' : 'Mock';
        this.responseHeaders = result.headers;
        this.response = result.body;
        this.responseText = result.body;
        this.responseURL = new URL(this.url, MOCK_ORIGIN).toString();
        this.readyState = 4;
        this.emit('readystatechange');
        this.emit('load');
        this.emit('loadend');
      }, delay);
    }

    private passThrough(body?: Document | XMLHttpRequestBodyInit | null) {
      const real = new RealXHR();
      this.real = real;
      const [method, url, async, user, password] = this.openArgs;
      real.open(method, url, async, user ?? null, password ?? null);
      real.timeout = this.timeout;
      real.withCredentials = this.withCredentials;
      if (this.responseType) real.responseType = this.responseType;
      if (this.mimeOverride) real.overrideMimeType(this.mimeOverride);
      for (const [k, v] of Object.entries(this.requestHeaders)) real.setRequestHeader(k, v);
      for (const type of FORWARDED_EVENTS) {
        real.addEventListener(type, (event) => {
          this.readyState = real.readyState;
          this.status = real.status;
          this.statusText = real.statusText;
          this.response = real.response;
          this.responseURL = real.responseURL;
          try {
            this.responseText = real.responseText;
          } catch {
            this.responseText = '';
          }
          this.emit(type, event as ProgressEvent);
        });
        real.upload.addEventListener(type, (event) => {
          this.upload.dispatchEvent(copyProgress(type, event as ProgressEvent));
        });
      }
      real.send(body ?? null);
    }

    private emit(type: string, source?: ProgressEvent) {
      const event = copyProgress(type, source);
      const handler = (this as unknown as Record<string, ((event: Event) => void) | null>)[`on${type}`];
      if (typeof handler === 'function') handler.call(this, event);
      this.dispatchEvent(copyProgress(type, source));
    }
  };
}

function copyProgress(type: string, source?: ProgressEvent): Event {
  if (typeof ProgressEvent === 'function') {
    return new ProgressEvent(type, {
      lengthComputable: source?.lengthComputable ?? false,
      loaded: source?.loaded ?? 0,
      total: source?.total ?? 0,
    });
  }
  return new Event(type);
}

function backendBase(doc: Document): string | null {
  const content = doc.querySelector(`meta[name="${BACKEND_META}"]`)?.getAttribute('content')?.trim();
  return content ? content.replace(/\/+$/, '') : null;
}

/** Turns a relative or root-relative request path into an absolute URL under `base`. */
export function absolutize(path: string, base: string, doc: Document): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const basePath = (() => {
    try {
      const baseUri = new URL(doc.baseURI);
      return baseUri.protocol.startsWith('http') ? baseUri.pathname : '/';
    } catch {
      return '/';
    }
  })();
  const resolved = path.startsWith('/') ? path : new URL(path, `${MOCK_ORIGIN}${basePath}`).pathname;
  return `${base}${resolved}`;
}

export function installOdMock(win: Window & { htmx?: HtmxLike; odMock?: unknown } = window): 'mock' | 'backend' | 'unavailable' {
  const doc = win.document;
  const htmx = win.htmx;
  if (!htmx) {
    console.warn('[od-mock] load od-mock.js after htmx.min.js');
    return 'unavailable';
  }
  const backend = backendBase(doc);
  // Absolute request URLs are required in an about:srcdoc document (htmx would
  // resolve a relative path against the opaque origin and throw) and when a
  // separate backend serves the requests; same-origin checks therefore cannot
  // apply in either mode.
  htmx.config.selfRequestsOnly = false;
  doc.addEventListener('htmx:configRequest', (event) => {
    const detail = (event as CustomEvent<{ path: string }>).detail;
    if (backend) detail.path = absolutize(detail.path, backend, doc);
    else if (win.location.protocol === 'about:') detail.path = absolutize(detail.path, MOCK_ORIGIN, doc);
  });
  if (backend) return 'backend';
  // The preview frame cannot rewrite its own history.
  htmx.config.historyEnabled = false;
  const host = win as unknown as { XMLHttpRequest: typeof XMLHttpRequest };
  host.XMLHttpRequest = createMockXhrClass(host.XMLHttpRequest, doc) as unknown as typeof XMLHttpRequest;
  win.odMock = {
    data: () => readStore(doc),
    reset: () => {
      store = null;
    },
    respond: (method: string, url: string, body?: unknown) => respond(doc, method.toUpperCase(), url, body),
  };
  return 'mock';
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && !(window as { __odMockNoAutoInstall?: boolean }).__odMockNoAutoInstall) {
  installOdMock();
}
