// @vitest-environment jsdom

// od-mock backend mode: with <meta name="od-backend">, mocking is off and htmx
// requests go to that base URL (the od-axum-export server, scenario AXUM-1).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const vendor = path.resolve(here, '../../../../design-templates/htmx-alpine-prototype/assets/vendor');
const opened: string[] = [];

describe('od-mock backend mode', () => {
  beforeAll(() => {
    const expressionProto = Object.getPrototypeOf(new XPathEvaluator().createExpression('.', null)) as {
      evaluate: (node: Node, type?: number, result?: XPathResult | null) => XPathResult;
    };
    const evaluate = expressionProto.evaluate;
    expressionProto.evaluate = function patchedEvaluate(node: Node, type?: number, result?: XPathResult | null) {
      return evaluate.call(this, node, type ?? 0, result ?? null);
    };
    class RecordingXhr {
      open(_method: string, url: string) {
        opened.push(url);
      }
      send() {}
      setRequestHeader() {}
      overrideMimeType() {}
      addEventListener() {}
      upload = { addEventListener() {} };
    }
    (window as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = RecordingXhr;
    document.head.insertAdjacentHTML('beforeend', '<meta name="od-backend" content="https://api.example.test/">');
    const run = (file: string) => (window as unknown as { eval: (code: string) => void }).eval(readFileSync(path.join(vendor, file), 'utf8'));
    run('htmx.min.js');
    run('od-mock.js');
  });

  it('leaves XMLHttpRequest alone and rewrites request paths to the backend', async () => {
    expect((window as unknown as { odMock?: unknown }).odMock).toBeUndefined();
    document.body.innerHTML = '<button id="go" hx-get="/api/items" hx-target="this">go</button>';
    (window as unknown as { htmx: { process: (el: Element) => void } }).htmx.process(document.body);
    (document.getElementById('go') as HTMLButtonElement).click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(opened).toEqual(['https://api.example.test/api/items']);
  });
});
