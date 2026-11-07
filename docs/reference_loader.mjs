// Module hooks for reference_contract.mjs and reference_examples.mjs: load the SDK's TypeScript sources as they are,
// without a build. A relative `./x.js` import resolves to `./x.ts` when that file exists; `@nuva/sdk`,
// `@nuva/sdk/schemas` and `@nuva/protocol` resolve to their sources, as the docs' tsconfig maps them; `.ts` files are
// transpiled to ESM with the workspace's TypeScript compiler (types are dropped; nothing else changes).
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ts = createRequire(import.meta.url)('typescript');
const sources = {
	'@nuva/sdk': '../typescript/src/index.ts',
	'@nuva/sdk/schemas': '../typescript/src/schemas.ts',
	'@nuva/protocol': '../protocol/src/index.ts',
};

export async function resolve(specifier, context, next) {
	if (Object.hasOwn(sources, specifier)) return { url: new URL(sources[specifier], import.meta.url).href, shortCircuit: true };
	if (specifier.endsWith('.js') && (specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.endsWith('.ts')) {
		const candidate = new URL(specifier.slice(0, -3) + '.ts', context.parentURL);
		if (existsSync(fileURLToPath(candidate))) return { url: candidate.href, shortCircuit: true };
	}
	return next(specifier, context);
}

export async function load(url, context, next) {
	if (!url.endsWith('.ts')) return next(url, context);
	const source = readFileSync(fileURLToPath(url), 'utf8');
	const output = ts.transpileModule(source, {
		fileName: fileURLToPath(url),
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, verbatimModuleSyntax: false },
	}).outputText;
	return { format: 'module', source: output, shortCircuit: true };
}
