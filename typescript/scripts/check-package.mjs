import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const temporary = await mkdtemp(resolve(tmpdir(), 'nuva-package-consumer-'));
const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'pipe', encoding: 'utf8', timeout: 120000 });
try {
	run('pnpm', ['pack', '--pack-destination', temporary], resolve(root, '../protocol'));
	run('pnpm', ['pack', '--pack-destination', temporary], root);
	const archives = (await readdir(temporary)).filter((name) => name.endsWith('.tgz')).map((name) => resolve(temporary, name));
	assert.equal(archives.length, 2);
	for (const archive of archives) {
		const files = run('tar', ['-tzf', archive], temporary).trim().split('\n');
		assert.ok(files.every((file) => !/(?:\.dev\.vars|node_modules\/|runtime\/|tests\/)/.test(file)));
		const manifest = JSON.parse(run('tar', ['-xOf', archive, 'package/package.json'], temporary));
		assert.ok(Object.keys(manifest.dependencies).every((name) => ['zod', '@nuva/protocol'].includes(name)));
		assert.ok(Object.values(manifest.dependencies).every((version) => !version.startsWith('workspace:')));
		for (const file of files.filter((file) => /\.(?:js|d\.ts)$/.test(file))) {
			const code = run('tar', ['-xOf', archive, file], temporary);
			assert.doesNotMatch(
				code,
				/@nuva\/(?:agent-harness|telemetry|ads-agent-runtime|ai-chat)|node:async_hooks|DurableObjectNamespace|AZURE_API_KEY|MODEL_API_KEY/,
			);
		}
	}
	await writeFile(resolve(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
	run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', ...archives], temporary);
	assert.equal(existsSync(resolve(temporary, 'node_modules/react')), false, 'Headless install unexpectedly pulled React.');
	await writeFile(
		resolve(temporary, 'headless.mjs'),
		`import assert from 'node:assert/strict';
import {createNuva,Message} from '@nuva/sdk';
import {CLIENT_PROTOCOL_REVISION} from '@nuva/protocol';
import {ScriptSchema} from '@nuva/sdk/schemas';
assert.equal(CLIENT_PROTOCOL_REVISION,1);assert.ok(ScriptSchema);
const client=createNuva({baseUrl:'https://agent.invalid/api',storeBaseUrl:'https://store.invalid',getAccessToken:async()=> 'unused'});
assert.equal(client.sessions.getMain,undefined);
assert.equal(typeof client.agent({sessionId:'consumer'}).respond,'function');
assert.ok(Message.create().quote({ref:{kind:'product',id:'p'},label:'Product'}));client.close();
`,
	);
	run(process.execPath, ['headless.mjs'], temporary);
	await writeFile(
		resolve(temporary, 'consumer.ts'),
		`import {createNuva,Message,type DynamicToolUIPart} from '@nuva/sdk';
const client=createNuva({baseUrl:'https://agent.invalid/api',storeBaseUrl:'https://store.invalid',getAccessToken:async()=> 'unused'});
const agent=client.agent({sessionId:'consumer'});
declare const call:Extract<DynamicToolUIPart,{state:'input-available'}>;
const answer=()=>agent.respond(call,{answer:'A'});
declare const productImage:File;
const creation = async () => {
 const brand = await client.brands.create({data:{name:'Brand'}});
 const original = await client.products.create({brand_id:brand.id,data:{name:'Product',attributes:{catalog:{color:'blue'}}}});
 const {product}=await client.products.uploadImage({base:original,file:productImage});
 const script = await client.scripts.generate({product:product.id,acceptable_duration_ms:{min:8000,max:15000}});
 const {prompts} = await client.prompts.generate({script:script.id});
 const prompt = await client.prompts.get(prompts[0]!.ref);
 const job = await client.videos.generate({prompt:prompt.id});
 return {revision:product.revision,content:script.content,prompts:prompts.map(p=>p.id),job:job.id};
};
Message.create().attach({ref:{kind:'asset',id:'a'},label:'Asset'}).quote({ref:{kind:'product',id:'p'},label:'Product'});
// @ts-expect-error Main is not a first-release client capability.
client.sessions.getMain();
`,
	);
	await writeFile(
		resolve(temporary, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				target: 'ES2022',
				module: 'NodeNext',
				moduleResolution: 'NodeNext',
				strict: true,
				skipLibCheck: false,
				noEmit: true,
				types: [],
				lib: ['ES2023', 'DOM'],
			},
			include: ['consumer.ts'],
		}),
	);
	const compiler = resolve(dirname(require.resolve('typescript/package.json')), 'bin/tsc');
	run(process.execPath, [compiler, '-p', 'tsconfig.json'], temporary);
	run(
		'npm',
		['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', 'react@18.3.1', '@types/react@18.3.27'],
		temporary,
	);
	await writeFile(
		resolve(temporary, 'react.mjs'),
		`import assert from 'node:assert/strict';import {NuvaProvider,useAgent} from '@nuva/sdk/react';assert.equal(typeof NuvaProvider,'function');assert.equal(typeof useAgent,'function');`,
	);
	run(process.execPath, ['react.mjs'], temporary);
	await writeFile(
		resolve(temporary, 'consumer.ts'),
		(await readFile(resolve(temporary, 'consumer.ts'), 'utf8')) +
			`\nimport {NuvaProvider,useAgent} from '@nuva/sdk/react';const hooks=[NuvaProvider,useAgent];\n`,
	);
	run(process.execPath, [compiler, '-p', 'tsconfig.json'], temporary);
	const contents = await readFile(resolve(temporary, 'node_modules/@nuva/sdk/package.json'), 'utf8');
	assert.doesNotMatch(contents, /@nuva\/(?:agent-harness|telemetry|ads-agent-runtime|ai-chat)/);
	console.log(
		'Packed consumer passed: headless imports without React, strict TypeScript, React 18 subpath, no private runtime dependencies or credential files.',
	);
} catch (error) {
	if (error.stdout) console.error(String(error.stdout));
	if (error.stderr) console.error(String(error.stderr));
	throw error;
} finally {
	await rm(temporary, { recursive: true, force: true });
}
