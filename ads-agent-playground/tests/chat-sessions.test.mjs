import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const directory = await mkdtemp(join(tmpdir(), "playground-sessions-"));
after(() => rm(directory, { recursive: true, force: true }));
await build({
  entryPoints: [new URL("../src/chat.ts", import.meta.url).pathname],
  outfile: join(directory, "chat.mjs"), bundle: true, format: "esm", platform: "node",
});
const { ChatController } = await import(pathToFileURL(join(directory, "chat.mjs")));
const sessions = Array.from({ length: 205 }, (_, index) => ({
  id: `session-${index}`, title: `Saved ${index}`, createdAt: "2026-10-25T12:00:00Z",
}));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
// Minimal DOM adapter: exercise the controller's actual pagination/selection logic
// without a browser, network, live Agent, or model invocation.
function element() {
  return {
    children: [], value: "", disabled: false,
    get options() { return this.children; },
    append(...items) { for (const item of items) { item.parentNode = this; this.children.push(item); } },
    replaceChildren(...items) { this.children = []; this.append(...items); },
  };
}
function fixture(t, saved) {
  const priorDocument = globalThis.document, priorStorage = globalThis.localStorage;
  const selector = element(), values = new Map(saved ? [["test:session", saved]] : []);
  const elements = new Map([["sessions", selector], ["new-session", element()]]);
  globalThis.document = {
    getElementById: (id) => elements.get(id),
    createElement: () => element(), createTextNode: (text) => ({ textContent: text }),
  };
  globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) };
  t.after(() => { globalThis.document = priorDocument; globalThis.localStorage = priorStorage; });
  const requests = [], gets = [], selected = [];
  const controller = Object.create(ChatController.prototype);
  Object.assign(controller, {
    host: { scope: "test", selected: (id) => selected.push(id), sdk: {
      sessions: {
        list: async (query) => {
          requests.push(query);
          const offset = Number(query.cursor ?? 0);
          return { items: sessions.slice(offset, offset + query.limit), nextCursor: offset + query.limit < sessions.length ? String(offset + query.limit) : null };
        },
        get: async (id) => { gets.push(id); return sessions.find((s) => s.id === id); },
        create: async () => ({ ...sessions[0], id: "created" }),
      }, agent: () => ({ subscribe: () => () => {} }),
    } },
    epoch: 0, connectionEpoch: 0, sessionsEpoch: 0, sessionsCursor: null,
    sessionsLoading: false, sessionsError: false, closed: false, sending: false,
    sessionId: "", status: "loading", olderSessions: element(),
    composer: { draft: "unsent draft", clear() { this.draft = ""; } },
    messageReferences: { clear() {} },
    list: element(), cards: { dispose() {} },
    controls() {}, makeCards: () => ({ dispose() {} }), drawAttachments() {},
    renderHistoryNotice() {}, emptyState: () => element(),
  });
  return { controller, selector, requests, gets, selected, values };
}

test("bounded first page, load older across 205 sessions, preserve selection and draft, deduplicate", async (t) => {
  const { controller: c, selector, requests } = fixture(t);
  await c.start();
  assert.deepEqual(requests, [{ limit: 100 }]);
  assert.equal(selector.options.length, 100);
  c.composer.draft = "keep this draft";
  await c.loadSessions(true);
  await c.loadSessions(true);
  assert.deepEqual(requests, [{ limit: 100 }, { limit: 100, cursor: "100" }, { limit: 100, cursor: "200" }]);
  assert.equal(selector.options.length, 205);
  assert.equal(selector.value, sessions[0].id);
  assert.equal(c.sessionId, sessions[0].id);
  assert.equal(c.composer.draft, "keep this draft");
  assert.equal(c.olderSessions.hidden, true);
  await c.loadSessions(true);
  assert.equal(requests.length, 3);
  c.addSessionOptions([sessions[0], sessions[204]]);
  assert.equal(selector.options.length, 205);
});

test("saved session outside first 100 is restored by get without scanning pages", async (t) => {
  const { controller: c, selector, requests, gets, selected } = fixture(t, sessions[204].id);
  await c.start();
  assert.deepEqual(gets, [sessions[204].id]);
  assert.equal(requests.length, 1);
  assert.equal(selector.options.length, 101);
  assert.equal(selector.value, sessions[204].id);
  assert.deepEqual(selected, [sessions[204].id]);
  await c.loadSessions(true);
  await c.loadSessions(true);
  assert.equal(selector.options.length, 205);
  assert.equal(selector.value, sessions[204].id);
});

test("saved lookup failure is surfaced without selecting another session or overwriting saved ID", async (t) => {
  const { controller: c, selected, values } = fixture(t, "inaccessible");
  c.host.sdk.sessions.get = async () => { throw new Error("Not authorized"); };
  await assert.rejects(c.start(), /Not authorized/);
  assert.deepEqual(selected, []);
  assert.equal(c.status, "error");
  assert.equal(values.get("test:session"), "inaccessible");
});

test("duplicate load clicks coalesce; failed page retains cursor and can be retried", async (t) => {
  const { controller: c, selector } = fixture(t);
  await c.start();
  const pending = deferred(); let calls = 0;
  c.host.sdk.sessions.list = () => { calls++; return pending.promise; };
  const loading = c.loadSessions(true);
  await c.loadSessions(true);
  assert.equal(calls, 1);
  assert.equal(c.olderSessions.disabled, true);
  pending.reject(new Error("Temporary failure"));
  await assert.rejects(loading, /Temporary failure/);
  assert.equal(c.sessionsCursor, "100");
  assert.equal(c.sessionsError, true);
  assert.equal(c.olderSessions.disabled, false);
  assert.equal(selector.options.length, 100);
  c.host.sdk.sessions.list = async () => ({ items: sessions.slice(99), nextCursor: null });
  await c.loadSessions(true);
  assert.equal(selector.options.length, 205);
  assert.equal(c.sessionsError, false);
});

test("late pages and get responses cannot mutate a closed controller", async (t) => {
  const { controller: c, selector, selected } = fixture(t);
  await c.start();
  const page = deferred(), lookup = deferred();
  c.host.sdk.sessions.list = () => page.promise;
  c.host.sdk.sessions.get = () => lookup.promise;
  const loading = c.loadSessions(true), connecting = c.connect(sessions[200].id);
  c.closed = true;
  page.resolve({ items: sessions.slice(100), nextCursor: null });
  lookup.resolve(sessions[200]);
  await Promise.all([loading, connecting]);
  assert.equal(selector.options.length, 100);
  assert.deepEqual(selected, [sessions[0].id]);
});

test("creating while an older page loads retains created selection and appended older options", async (t) => {
  const { controller: c, selector, requests } = fixture(t);
  await c.start();
  const pending = deferred();
  c.host.sdk.sessions.list = () => pending.promise;
  c.host.sdk.sessions.get = async (id) => ({ ...sessions[0], id });
  const loading = c.loadSessions(true);
  await c.create();
  c.composer.draft = "new conversation draft";
  pending.resolve({ items: sessions.slice(100), nextCursor: null });
  await loading;
  assert.equal(c.sessionId, "created");
  assert.equal(selector.value, "created");
  assert.equal(selector.options.length, 206);
  assert.equal(c.composer.draft, "new conversation draft");
  assert.equal(requests.length, 1);
});

test("a later selection wins when authorized lookups resolve out of order", async (t) => {
  const { controller: c, selector, selected } = fixture(t);
  await c.start();
  const first = deferred(), second = deferred();
  c.host.sdk.sessions.get = (id) => id === sessions[200].id ? first.promise : second.promise;
  const one = c.connect(sessions[200].id), two = c.connect(sessions[201].id);
  second.resolve(sessions[201]);
  await two;
  c.composer.draft = "latest draft";
  first.resolve(sessions[200]);
  await one;
  assert.equal(selector.value, sessions[201].id);
  assert.equal(c.sessionId, sessions[201].id);
  assert.equal(c.composer.draft, "latest draft");
  assert.deepEqual(selected, [sessions[0].id, sessions[201].id]);
});
