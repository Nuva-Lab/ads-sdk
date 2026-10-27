import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as sdk from '../../typescript/dist/index.js';
import * as schemas from '../../typescript/dist/schemas.js';
import { draftValue } from '../../typescript/dist/message.js';

const requireDocs = createRequire(new URL('../package.json', import.meta.url));
const requireSDK = createRequire(new URL('../../typescript/package.json', import.meta.url));
const ts = requireDocs('typescript');
const jsx = requireSDK('react/jsx-runtime');

// Execute the actual example functions with a small hook fixture. This checks
// returned React elements and event handlers, not browser layout or reconciliation.
function example(file) {
  const values = [];
  let cursor = 0, effects = [];
  const react = {
    Fragment: jsx.Fragment,
    useState(initial) {
      const index = cursor++;
      if (!(index in values)) values[index] = initial;
      return [values[index], (next) => {
        values[index] = typeof next === 'function' ? next(values[index]) : next;
      }];
    },
    useMemo: (factory) => factory(),
    useEffect: (effect) => effects.push(effect),
  };
  const source = readFileSync(new URL(file, import.meta.url), 'utf8')
    + (file === 'guide.tsx' ? '\nexport { Conversation };\n' : '');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, { exports, Error, require: (name) => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === '@nuva/sdk') return sdk;
    if (name === '@nuva/sdk/schemas') return schemas;
    throw new Error(`Unexpected import: ${name}`);
  } });
  return {
    exports,
    render(name, props) {
      cursor = 0;
      effects = [];
      const result = exports[name](props);
      for (const effect of effects) effect();
      return result;
    },
  };
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object') return [];
  return [node, ...elements(node.props.children)];
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('');
  if (node == null || typeof node === 'boolean') return '';
  return typeof node === 'object' ? text(node.props.children) : String(node);
}
function find(node, type) {
  const result = elements(node).find((item) => item.type === type);
  assert.ok(result, `Expected ${type.name ?? type}`);
  return result;
}

const failure = { code: 'CONNECTION_ERROR', message: 'Connection lost', retryable: true };

test('Product listing follows every returned cursor', async () => {
  const component = example('guide.tsx');
  const calls = [];
  const products = await component.exports.listProducts({ products: { async list(query) {
    calls.push(JSON.parse(JSON.stringify(query)));
    const index = query.cursor === undefined ? 1 : Number(query.cursor);
    return { items: [{ id: 'product-' + index }], nextCursor: index < 3 ? String(index + 1) : null };
  } } });
  assert.deepEqual(Array.from(products, item => item.id), ['product-1', 'product-2', 'product-3']);
  assert.deepEqual(calls, [{ limit: 20 }, { limit: 20, cursor: '2' }, { limit: 20, cursor: '3' }]);
});

test('followVideo forwards polling errors and returns the unsubscribe function', () => {
  const component = example('store-usage.ts');
  const errors = [], progress = [];
  const stop = () => {};
  const client = { jobs: { subscribe(id, listener, onError) {
    assert.equal(id, 'saved-job'); listener({ status: 'running' }); onError(failure); return stop;
  } } };
  assert.equal(component.exports.followVideo(client, 'saved-job', value => progress.push(value), value => errors.push(value)), stop);
  assert.equal(progress[0].status, 'running');
  assert.deepEqual(errors, [failure]);
});

test('assembly example sends ordered saved resources through the Agent', async () => {
  const component = example('guide.tsx');
  const clips = ['first', 'second'].map(id => ({ ref: { kind: 'asset', id }, label: id }));
  let submitted;
  const receipt = await component.exports.requestAssembly({ async send(message) { submitted = draftValue(message); return { accepted: true }; } }, clips);
  assert.equal(receipt.accepted, true);
  assert.deepEqual(submitted.attachments, clips);
  assert.match(submitted.content[0].text, /attachment order/);
});
const message = {
  ref: { sessionId: 'session', messageId: 'reply' },
  createdAt: '2026-10-26T12:00:00Z', role: 'assistant', state: 'failed',
  content: [{ id: 'text', type: 'text', format: 'plain', text: 'Partial reply' }],
  attachments: [], error: { ...failure, message: 'Generation failed' },
};
const loaded = {
  status: 'idle',
  session: { id: 'session', kind: 'main', title: 'Example', owner: { userId: 'user' }, createdAt: message.createdAt },
  messages: { items: [message], nextCursor: null },
};

test('MessageContent preserves partial output and displays its failure', () => {
  const component = example('guide.tsx');
  const props = { message, onOpenResource() {}, onOpenMessage() {}, renderInteraction() {} };
  const tree = component.render('MessageContent', props);
  assert.match(text(tree), /Partial reply/);
  assert.match(text(find(tree, 'p')), /Partial reply/);
  assert.ok(elements(tree).some((item) => item.props.role === 'alert' && text(item).includes('Generation failed')));
  const complete = component.render('MessageContent', { ...props, message: { ...message, state: 'complete' } });
  assert.equal(elements(complete).some((item) => item.props.role === 'alert'), false);
});

for (const [file, name] of [['guide.tsx', 'Conversation'], ['react-usage.tsx', 'MessageListExample']]) {
  test(`${name} retains content across sync errors; refresh is explicit and exposes failure`, async () => {
    const component = example(file);
    let state = loaded, refreshCalls = 0, failRefresh = true, sends = 0;
    const agent = {
      subscribe(listener) { listener(state); return () => {}; },
      async refresh() { refreshCalls++; if (failRefresh) throw new Error('Snapshot unavailable'); },
      async send() { sends++; },
    };
    const client = { agent: () => agent };
    function render(next) {
      state = next;
      const props = { client, sessionId: 'session', agent, state, renderMessage: (value) => value.content[0].text };
      component.render(name, props); // Commit the subscription's immediate snapshot.
      return component.render(name, props);
    }
    let tree = render(loaded);
    const composerIndex = file === 'guide.tsx'
      ? tree.props.children.findIndex((child) => child?.type === component.exports.MessageInput) : null;
    for (const status of ['idle', 'running', 'waiting_for_response']) {
      tree = render({ ...loaded, status, ...(status === 'waiting_for_response' ? { callIds: ['review'] } : {}), error: failure });
      assert.match(text(tree), /Connection lost/);
      assert.match(text(tree), /Partial reply/);
      assert.match(text(tree), /Generation failed/);
      if (composerIndex !== null) {
        assert.equal(tree.props.children[composerIndex].type, component.exports.MessageInput);
        assert.equal(tree.props.children[composerIndex].props.busy, true);
      }
    }
    assert.equal(refreshCalls, 0);
    await find(tree, 'button').props.onClick();
    tree = render(state);
    assert.match(text(tree), /Refresh failed: Snapshot unavailable/);
    assert.match(text(tree), /Partial reply/);
    failRefresh = false;
    await find(tree, 'button').props.onClick();
    tree = render(loaded);
    assert.doesNotMatch(text(tree), /Snapshot unavailable|Connection lost/);
    assert.equal(refreshCalls, 2);
    assert.equal(sends, 0);
    tree = render({ status: 'error', error: failure });
    assert.match(text(tree), /Connection lost/);
    assert.ok(find(tree, 'button'));
    if (composerIndex !== null) assert.equal(tree.props.children[composerIndex].type, component.exports.MessageInput);
  });
}

test('composer keeps a failed draft and never replays it on render', async () => {
  const component = example('guide.tsx');
  let sends = 0;
  const props = { agent: { async send() { sends++; throw new Error('Send receipt unavailable'); } }, busy: false };
  let tree = component.render('MessageInput', props);
  find(tree, 'textarea').props.onChange({ target: { value: 'Keep my draft' } });
  tree = component.render('MessageInput', props);
  await tree.props.onSubmit({ preventDefault() {} });
  tree = component.render('MessageInput', props);
  assert.equal(find(tree, 'textarea').props.value, 'Keep my draft');
  assert.match(text(tree), /Send receipt unavailable/);
  tree = component.render('MessageInput', { ...props, busy: true });
  assert.equal(find(tree, 'textarea').props.value, 'Keep my draft');
  assert.equal(find(tree, 'button').props.disabled, true);
  assert.equal(sends, 1);
});

test('input hook reports send failures and retains the submitted text', async () => {
  const component = example('react-usage.tsx');
  const agent = { async send() { throw new Error('Not accepted'); } };
  let input = component.render('useMessageInputExample', agent);
  input.setText('Keep this too');
  input = component.render('useMessageInputExample', agent);
  await input.send();
  input = component.render('useMessageInputExample', agent);
  assert.equal(input.text, 'Keep this too');
  assert.equal(input.error, 'Not accepted');
  assert.equal(input.sending, false);
});
