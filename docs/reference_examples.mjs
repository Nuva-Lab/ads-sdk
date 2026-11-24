// Runs every API reference example (examples/reference.ts) through the SDK, with `fetch` answering from
// examples/reference-responses.ts, and prints as JSON, per example:
//   requests  each HTTP request the SDK sent: its method and the route it matched (`/v1/products/{product_id}`);
//   result    what the example's call returned, as JSON (functions, such as a Job's `result`, are left out);
//   problems  anything wrong: an answer that does not match its route's public response schema (backendSchema),
//             a request to no known route, an answer left over or missing, or the SDK refusing an answer.
// With ADDED_VALUES=1, each answer first gets what a later backend may add (added_values.mjs), is checked with the
// schema the SDK reads with (responseSchema), and each example also lists where something was added (`added`).
// The sources are loaded as they are (reference_loader.mjs), so no SDK build is needed.
import { register } from 'node:module';
import { readFileSync } from 'node:fs';

register('./reference_loader.mjs', import.meta.url);
const at = (path) => new URL(path, import.meta.url).href;
const { createNuva } = await import(at('../typescript/src/client.ts'));
const { backendSchema, responseSchema, adapted } = await import(at('../typescript/src/backend-schema.ts'));
const { backendDefinitions } = await import(at('../typescript/src/backend-definitions.ts'));
const { widener } = await import(at('./added_values.mjs'));
const ADDED_VALUES = process.env.ADDED_VALUES === '1';
const widen = widener(adapted(backendDefinitions));
const { examples } = await import(at('./examples/reference.ts'));
const { responses } = await import(at('./examples/reference-responses.ts'));
const openapi = JSON.parse(readFileSync(new URL('../typescript/schema/backend.openapi.json', import.meta.url), 'utf8'));

const STORE = 'https://api.example.com';
const UPLOAD = 'https://upload.example.com';
// The generation writers are a separate service; their answers are checked by the SDK as it reads them.
const generation = ['/v1/generate/script', '/v1/generate/storyboard', '/v1/generate/prompt'];
// What each writer answers with, to widen it with ADDED_VALUES.
const generated = {
	'/v1/generate/script': (body, added) => widen(body, 'Script', added),
	'/v1/generate/storyboard': (body, added) => widen(body, 'Storyboard', added),
	'/v1/generate/prompt': (body, added) => ({ ...body, prompts: body.prompts.map((prompt) => widen(prompt, 'Prompt', added)), added_later: true }),
};
const routes = Object.entries(openapi.paths).map(([template, operations]) => ({
	template,
	operations,
	pattern: new RegExp('^' + template.replace(/\{[^}]+\}/g, '[^/]+') + '$'),
}));
const success = (operation) => {
	const [status, response] = Object.entries(operation.responses).find(([code]) => code.startsWith('2')) ?? [];
	const ref = response?.content?.['application/json']?.schema?.$ref;
	return { status: Number(status ?? 200), schema: ref?.split('/').pop() };
};

const output = {};
let shown = [];
globalThis.file = new File([new Uint8Array(284113)], 'mug-front.jpg', { type: 'image/jpeg' });
globalThis.showProgress = (state) => shown.push(state);
for (const [name, run] of Object.entries(examples)) {
	const queue = [...(responses[name] ?? [])];
	const requests = [];
	const problems = [];
	const added = new Set();
	shown = [];
	if (responses[name] === undefined) problems.push('no answers in reference-responses.ts');
	globalThis.fetch = async (input, init = {}) => {
		const url = new URL(String(input));
		const method = init.method ?? 'GET';
		if (url.origin === UPLOAD) {
			requests.push({ method, path: 'upload_url' });
			return new Response(null, { status: 200 });
		}
		const route = routes.find((candidate) => candidate.pattern.test(url.pathname));
		const operation = route?.operations[method.toLowerCase()];
		const template = operation ? route.template : generation.includes(url.pathname) && method === 'POST' ? url.pathname : undefined;
		if (template === undefined) problems.push(`${method} ${url.pathname}: not a public route`);
		requests.push({ method, path: template ?? url.pathname, query: Object.fromEntries(url.searchParams) });
		if (method === 'DELETE') return new Response(null, { status: 204 });
		if (queue.length === 0) {
			problems.push(`${method} ${url.pathname}: no answer left`);
			return new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'No fixture.', retryable: false }, request_id: 'docs' }), { status: 404 });
		}
		let body = queue.shift();
		if (operation) {
			const { status, schema } = success(operation);
			if (schema === undefined) problems.push(`${method} ${route.template}: the contract has no JSON response`);
			else {
				if (ADDED_VALUES) body = widen(body, schema, added);
				const parsed = (ADDED_VALUES ? responseSchema : backendSchema)(schema).safeParse(body);
				if (!parsed.success) problems.push(`${method} ${route.template}: the answer is not a ${schema}: ${parsed.error.message}`);
			}
			return new Response(JSON.stringify(body), { status });
		}
		if (ADDED_VALUES) body = generated[template](body, added);
		return new Response(JSON.stringify(body), { status: 200 });
	};
	const client = createNuva({ environment: 'production', storeBaseUrl: STORE, generationBaseUrl: STORE, getAccessToken: async () => 'docs-token', jobPollIntervalMs: 10 });
	let result;
	try {
		result = await run(client);
		// A subscription answers through showProgress: wait for its answers to be read.
		for (let waited = 0; queue.length > 0 && waited < 2000; waited += 10) await new Promise((resolve) => setTimeout(resolve, 10));
		await new Promise((resolve) => setTimeout(resolve, 30));
		if (typeof result === 'function') {
			result();
			result = shown.at(-1);
			if (result === undefined) problems.push('the listener was never called');
		}
	} catch (error) {
		problems.push(`the example threw ${error?.code ?? ''} ${error?.message ?? error}`);
	}
	client.close();
	if (queue.length) problems.push(`${queue.length} answers left unused`);
	output[name] = { requests, result: result === undefined ? null : JSON.parse(JSON.stringify(result)), problems, ...(ADDED_VALUES ? { added: [...added].sort() } : {}) };
}
process.stdout.write(JSON.stringify(output, null, 1) + '\n');
