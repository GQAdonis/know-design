(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../../design-templates/htmx-alpine-prototype/src/od-mock.ts
  var BACKEND_META = "od-backend";
  var DATA_SCRIPT_ID = "od-mock-data";
  var MOCK_ORIGIN = "https://od-mock.invalid";
  var INTERPOLATION = /\{\{\s*([\w$.-]+)\s*\}\}/g;
  function parseRouteSpec(spec) {
    const match = /^\s*([A-Za-z]+)\s+(\/\S*)\s*$/.exec(spec);
    if (!match) return null;
    return { method: match[1].toUpperCase(), pattern: match[2] };
  }
  function splitPath(pathname) {
    return pathname.split("/").filter((segment) => segment.length > 0);
  }
  function matchPattern(patternSegments, pathname) {
    const requestSegments = splitPath(pathname);
    if (requestSegments.length < patternSegments.length) return null;
    const tail = requestSegments.slice(requestSegments.length - patternSegments.length);
    const params = {};
    for (let i = 0; i < patternSegments.length; i += 1) {
      const expected = patternSegments[i];
      const actual = decodeURIComponent(tail[i]);
      if (expected.startsWith(":")) params[expected.slice(1)] = actual;
      else if (expected !== actual) return null;
    }
    return params;
  }
  function resolvePath(scope, path) {
    let current = scope;
    for (const key of path.split(".")) {
      if (current === null || current === void 0) return void 0;
      current = current[key];
    }
    return current;
  }
  function truthy(value) {
    if (Array.isArray(value)) return value.length > 0;
    if (value === "false" || value === "0" || value === "off") return false;
    return Boolean(value);
  }
  function interpolate(text, scope) {
    return text.replace(INTERPOLATION, (_whole, path) => {
      const value = resolvePath(scope, path);
      return value === null || value === void 0 ? "" : String(value);
    });
  }
  function parseBody(body) {
    const out = {};
    if (!body) return out;
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      body.forEach((value, key) => {
        if (typeof value === "string") out[key] = value;
      });
      return out;
    }
    if (typeof body === "string") {
      const trimmed = body.trim();
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
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
  function nextId(items) {
    const numeric = items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id));
    return String(numeric.length > 0 ? Math.max(...numeric) + 1 : items.length + 1);
  }
  function applyAction(action, store2, params, form) {
    const [verb, listName, field] = action.split(":");
    if (!verb || !listName) return { item: null, missing: false };
    const list = Array.isArray(store2[listName]) ? store2[listName] : [];
    store2[listName] = list;
    if (verb === "create") {
      const item2 = { ...coerce(form), id: form.id || nextId(list) };
      list.push(item2);
      return { item: item2, missing: false };
    }
    const index = list.findIndex((candidate) => String(candidate.id) === String(params.id));
    if (index < 0) return { item: null, missing: true };
    const item = list[index];
    if (verb === "update") Object.assign(item, coerce(form), { id: item.id });
    else if (verb === "delete") list.splice(index, 1);
    else if (verb === "toggle" && field) item[field] = !truthy(item[field]);
    return { item, missing: false };
  }
  function coerce(form) {
    const out = {};
    for (const [key, value] of Object.entries(form)) {
      out[key] = value === "on" || value === "true" ? true : value === "false" ? false : value;
    }
    return out;
  }
  function renderTemplate(template, scope) {
    const fragment = template.content.cloneNode(true);
    for (const child of Array.from(fragment.childNodes)) processNode(child, scope);
    const container = template.ownerDocument.createElement("div");
    container.appendChild(fragment);
    return container.innerHTML;
  }
  function processNode(node, scope) {
    var _a;
    if (node.nodeType === 3) {
      node.textContent = interpolate((_a = node.textContent) != null ? _a : "", scope);
      return;
    }
    if (node.nodeType !== 1) return;
    const element = node;
    const ifPath = element.getAttribute("data-od-if");
    if (ifPath !== null) {
      element.removeAttribute("data-od-if");
      if (!truthy(resolvePath(scope, ifPath))) {
        element.remove();
        return;
      }
    }
    const unlessPath = element.getAttribute("data-od-unless");
    if (unlessPath !== null) {
      element.removeAttribute("data-od-unless");
      if (truthy(resolvePath(scope, unlessPath))) {
        element.remove();
        return;
      }
    }
    const eachPath = element.getAttribute("data-od-each");
    if (eachPath !== null) {
      element.removeAttribute("data-od-each");
      const items = resolvePath(scope, eachPath);
      const list = Array.isArray(items) ? items : [];
      const parent = element.parentNode;
      list.forEach((item, index) => {
        const clone = element.cloneNode(true);
        parent == null ? void 0 : parent.insertBefore(clone, element);
        processNode(clone, { ...scope, item, index });
      });
      element.remove();
      return;
    }
    for (const attr of Array.from(element.attributes)) {
      if (attr.value.includes("{{")) element.setAttribute(attr.name, interpolate(attr.value, scope));
    }
    const children = element instanceof HTMLTemplateElement ? Array.from(element.content.childNodes) : Array.from(element.childNodes);
    for (const child of children) processNode(child, scope);
  }
  var store = null;
  function readStore(doc) {
    if (store) return store;
    const script = doc.getElementById(DATA_SCRIPT_ID);
    try {
      store = (script == null ? void 0 : script.textContent) ? JSON.parse(script.textContent) : {};
    } catch {
      store = {};
    }
    return store;
  }
  function compileRoutes(doc) {
    const routes = [];
    doc.querySelectorAll("template[data-od-route]").forEach((node) => {
      var _a;
      const spec = parseRouteSpec((_a = node.getAttribute("data-od-route")) != null ? _a : "");
      if (!spec) return;
      const segments = splitPath(spec.pattern);
      routes.push({
        ...spec,
        segments,
        keys: segments.filter((s) => s.startsWith(":")).map((s) => s.slice(1)),
        template: node
      });
    });
    return routes.sort((a, b) => b.segments.length - a.segments.length || a.keys.length - b.keys.length);
  }
  function respond(doc, method, url, body) {
    var _a;
    let parsed;
    try {
      parsed = new URL(url, MOCK_ORIGIN);
    } catch {
      return { status: 400, body: "", headers: {} };
    }
    const routes = compileRoutes(doc);
    for (const route of routes) {
      if (route.method !== method) continue;
      const params = matchPattern(route.segments, parsed.pathname);
      if (!params) continue;
      const query = {};
      parsed.searchParams.forEach((value, key) => {
        query[key] = value;
      });
      const form = method === "GET" || method === "DELETE" ? query : parseBody(body);
      const data = readStore(doc);
      const action = route.template.getAttribute("data-od-action");
      let item = null;
      if (action) {
        const result = applyAction(action, data, params, form);
        if (result.missing) return { status: 404, body: "", headers: {} };
        item = result.item;
      }
      const scope = { params, form, query, data, item };
      let headers = {};
      const headerSpec = route.template.getAttribute("data-od-headers");
      if (headerSpec) {
        try {
          headers = JSON.parse(interpolate(headerSpec, scope));
        } catch {
          headers = {};
        }
      }
      const status = Number((_a = route.template.getAttribute("data-od-status")) != null ? _a : 200) || 200;
      return { status, body: renderTemplate(route.template, scope), headers };
    }
    console.warn(`[od-mock] no route for ${method} ${parsed.pathname}; add <template data-od-route="${method} ${parsed.pathname}">`);
    return {
      status: 404,
      body: `<div data-od-mock-missing>No mock route for ${method} ${parsed.pathname}</div>`,
      headers: {}
    };
  }
  function routeDelay(doc, method, url) {
    var _a;
    const pathname = (() => {
      try {
        return new URL(url, MOCK_ORIGIN).pathname;
      } catch {
        return "";
      }
    })();
    for (const route of compileRoutes(doc)) {
      if (route.method === method && matchPattern(route.segments, pathname)) {
        return Number((_a = route.template.getAttribute("data-od-delay")) != null ? _a : 0) || 0;
      }
    }
    return 0;
  }
  var FORWARDED_EVENTS = ["readystatechange", "loadstart", "progress", "load", "error", "abort", "timeout", "loadend"];
  function createMockXhrClass(RealXHR, doc) {
    var _a;
    return _a = class extends EventTarget {
      constructor() {
        super(...arguments);
        __publicField(this, "readyState", 0);
        __publicField(this, "status", 0);
        __publicField(this, "statusText", "");
        __publicField(this, "response", "");
        __publicField(this, "responseText", "");
        __publicField(this, "responseURL", "");
        __publicField(this, "responseType", "");
        __publicField(this, "timeout", 0);
        __publicField(this, "withCredentials", false);
        __publicField(this, "upload", new EventTarget());
        __publicField(this, "onreadystatechange", null);
        __publicField(this, "onloadstart", null);
        __publicField(this, "onprogress", null);
        __publicField(this, "onload", null);
        __publicField(this, "onerror", null);
        __publicField(this, "onabort", null);
        __publicField(this, "ontimeout", null);
        __publicField(this, "onloadend", null);
        __publicField(this, "method", "GET");
        __publicField(this, "url", "");
        __publicField(this, "openArgs", ["GET", "", true]);
        __publicField(this, "requestHeaders", {});
        __publicField(this, "responseHeaders", {});
        __publicField(this, "mimeOverride", null);
        __publicField(this, "real", null);
        __publicField(this, "aborted", false);
      }
      open(method, url, async = true, user, password) {
        this.method = method.toUpperCase();
        this.url = String(url);
        this.openArgs = [method, this.url, async, user, password];
        this.readyState = 1;
      }
      setRequestHeader(name, value) {
        this.requestHeaders[name] = value;
      }
      overrideMimeType(mime) {
        this.mimeOverride = mime;
      }
      getResponseHeader(name) {
        if (this.real) return this.real.getResponseHeader(name);
        const key = Object.keys(this.responseHeaders).find((k) => k.toLowerCase() === name.toLowerCase());
        return key ? this.responseHeaders[key] : null;
      }
      getAllResponseHeaders() {
        if (this.real) return this.real.getAllResponseHeaders();
        return Object.entries(this.responseHeaders).map(([k, v]) => `${k.toLowerCase()}: ${v}\r
`).join("");
      }
      abort() {
        if (this.real) {
          this.real.abort();
          return;
        }
        this.aborted = true;
        this.emit("abort");
        this.emit("loadend");
      }
      send(body) {
        const isHtmx = Object.keys(this.requestHeaders).some((k) => k.toLowerCase() === "hx-request");
        if (!isHtmx) {
          this.passThrough(body);
          return;
        }
        this.emit("loadstart");
        const delay = routeDelay(doc, this.method, this.url);
        setTimeout(() => {
          if (this.aborted) return;
          const result = respond(doc, this.method, this.url, body);
          this.status = result.status;
          this.statusText = result.status >= 200 && result.status < 300 ? "OK" : "Mock";
          this.responseHeaders = result.headers;
          this.response = result.body;
          this.responseText = result.body;
          this.responseURL = new URL(this.url, MOCK_ORIGIN).toString();
          this.readyState = 4;
          this.emit("readystatechange");
          this.emit("load");
          this.emit("loadend");
        }, delay);
      }
      passThrough(body) {
        const real = new RealXHR();
        this.real = real;
        const [method, url, async, user, password] = this.openArgs;
        real.open(method, url, async, user != null ? user : null, password != null ? password : null);
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
              this.responseText = "";
            }
            this.emit(type, event);
          });
          real.upload.addEventListener(type, (event) => {
            this.upload.dispatchEvent(copyProgress(type, event));
          });
        }
        real.send(body != null ? body : null);
      }
      emit(type, source) {
        const event = copyProgress(type, source);
        const handler = this[`on${type}`];
        if (typeof handler === "function") handler.call(this, event);
        this.dispatchEvent(copyProgress(type, source));
      }
    }, __publicField(_a, "UNSENT", 0), __publicField(_a, "OPENED", 1), __publicField(_a, "HEADERS_RECEIVED", 2), __publicField(_a, "LOADING", 3), __publicField(_a, "DONE", 4), _a;
  }
  function copyProgress(type, source) {
    var _a, _b, _c;
    if (typeof ProgressEvent === "function") {
      return new ProgressEvent(type, {
        lengthComputable: (_a = source == null ? void 0 : source.lengthComputable) != null ? _a : false,
        loaded: (_b = source == null ? void 0 : source.loaded) != null ? _b : 0,
        total: (_c = source == null ? void 0 : source.total) != null ? _c : 0
      });
    }
    return new Event(type);
  }
  function backendBase(doc) {
    var _a, _b;
    const content = (_b = (_a = doc.querySelector(`meta[name="${BACKEND_META}"]`)) == null ? void 0 : _a.getAttribute("content")) == null ? void 0 : _b.trim();
    return content ? content.replace(/\/+$/, "") : null;
  }
  function absolutize(path, base, doc) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
    const basePath = (() => {
      try {
        const baseUri = new URL(doc.baseURI);
        return baseUri.protocol.startsWith("http") ? baseUri.pathname : "/";
      } catch {
        return "/";
      }
    })();
    const resolved = path.startsWith("/") ? path : new URL(path, `${MOCK_ORIGIN}${basePath}`).pathname;
    return `${base}${resolved}`;
  }
  function installOdMock(win = window) {
    const doc = win.document;
    const htmx = win.htmx;
    if (!htmx) {
      console.warn("[od-mock] load od-mock.js after htmx.min.js");
      return "unavailable";
    }
    const backend = backendBase(doc);
    htmx.config.selfRequestsOnly = false;
    doc.addEventListener("htmx:configRequest", (event) => {
      const detail = event.detail;
      if (backend) detail.path = absolutize(detail.path, backend, doc);
      else if (win.location.protocol === "about:") detail.path = absolutize(detail.path, MOCK_ORIGIN, doc);
    });
    if (backend) return "backend";
    htmx.config.historyEnabled = false;
    const host = win;
    host.XMLHttpRequest = createMockXhrClass(host.XMLHttpRequest, doc);
    win.odMock = {
      data: () => readStore(doc),
      reset: () => {
        store = null;
      },
      respond: (method, url, body) => respond(doc, method.toUpperCase(), url, body)
    };
    return "mock";
  }
  if (typeof window !== "undefined" && typeof document !== "undefined" && !window.__odMockNoAutoInstall) {
    installOdMock();
  }
})();
