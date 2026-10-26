/** Install and exercise the exact delivered archives; never patch them or link SDK source. */
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { ROOT, VERSION, GO_VERSION, GO_MODULE, DIST, run, json, sha256 } from './common.mjs';
export async function checkRelease(output = DIST) {
	const manifest = await json(resolve(output, 'manifest.json'));
	assert.equal(manifest.version, VERSION);
	for (const item of manifest.artifacts) {
		const path = resolve(output, item.path);
		assert.ok(path.startsWith(output + '/'));
		assert.equal(sha256(await readFile(path)), item.sha256, `Artifact hash mismatch: ${item.path}`);
	}
	const consumer = await mkdtemp(resolve(tmpdir(), 'nuva-delivered-consumer-'));
	try {
		const archives = ['@nuva/protocol', '@nuva/sdk'].map((name) => resolve(output, manifest.npm[name].file));
		for (const archive of archives) {
			const entries = run('tar', ['-tzf', archive]).trim().split('\n');
			assert.ok(
				entries.every(
					(path) => !/(^|\/)(?:tests?|node_modules|services|forks|skills|recipes|\.local|\.secrets)(\/|$)|\.dev\.vars|\.pem$/.test(path),
				),
			);
			const metadata = JSON.parse(run('tar', ['-xOf', archive, 'package/package.json']));
			assert.equal(metadata.version, VERSION);
			assert.ok(Object.values(metadata.dependencies).every((version) => !version.startsWith('workspace:')));
			if (metadata.name === '@nuva/sdk') assert.equal(metadata.dependencies['@nuva/protocol'], VERSION);
		}
		await writeFile(resolve(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
		run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', ...archives], consumer);
		await writeFile(
			resolve(consumer, 'consumer.mjs'),
			`import assert from 'node:assert/strict';
import {realpathSync,readFileSync,existsSync} from 'node:fs';
import {createNuva,Message} from '@nuva/sdk';
import {CLIENT_PROTOCOL_REVISION} from '@nuva/protocol';
import {backendIdSchema,generateScriptSchema,ScriptSchema} from '@nuva/sdk/schemas';
for (const name of ['sdk','protocol']) { const path = realpathSync('node_modules/@nuva/'+name); assert.ok(path.startsWith(process.cwd()+'/node_modules/')); assert.equal(JSON.parse(readFileSync(path+'/package.json')).version,'${VERSION}'); }
assert.equal(existsSync('node_modules/react'),false);
assert.equal(CLIENT_PROTOCOL_REVISION,1); assert.equal(ScriptSchema.schemaVersion,1);
const id='01a175e0-20c1-3f18-da7c-5afa67a79363'; assert.equal(backendIdSchema.parse(id),id);
assert.equal(generateScriptSchema.parse({product:id,acceptable_duration_ms:{min:5000,max:10000}}).product,id);
const client=createNuva({baseUrl:'https://fixture.invalid/api',storeBaseUrl:'https://fixture.invalid',getAccessToken:async()=> 'not-used'});
assert.equal(typeof client.agent({sessionId:'fixture'}).respond,'function'); assert.equal(client.sessions.getMain,undefined);
assert.ok(Message.create().text('Customer handoff').attach({ref:{kind:'product',id},label:'Saved Product'})); client.close();
const releasedOrigins=${JSON.stringify(manifest.serviceOrigins)};
if(releasedOrigins.agent){
 const calls=[];const prior=globalThis.fetch;
 globalThis.fetch=async(url)=>{calls.push(String(url));return Response.json({error:{code:'NOT_FOUND',message:'Local routing fixture',retryable:false},request_id:crypto.randomUUID()},{status:404});};
 const defaults=createNuva({getAccessToken:async()=> 'not-used'});
 try{
  await assert.rejects(defaults.products.get(id));
  await assert.rejects(defaults.scripts.generate({product:id,acceptable_duration_ms:{min:5000,max:10000}}));
  await assert.rejects(defaults.prompts.generate({script:id}));
  assert.equal(new URL(calls[0]).origin,new URL(releasedOrigins.store).origin);
  assert.equal(calls[1],(releasedOrigins.generation.endsWith('/')?releasedOrigins.generation.slice(0,-1):releasedOrigins.generation)+'/v1/generate/script');
  assert.equal(calls[2],(releasedOrigins.generation.endsWith('/')?releasedOrigins.generation.slice(0,-1):releasedOrigins.generation)+'/v1/generate/prompt');
 }finally{defaults.close();globalThis.fetch=prior;}
}else assert.throws(()=>createNuva({getAccessToken:async()=> 'not-used'}),/origin is not configured/);
`,
		);
		run(process.execPath, ['consumer.mjs'], consumer);
		await writeFile(
			resolve(consumer, 'consumer.ts'),
			`import {createNuva,Message,type ScriptPackage} from '@nuva/sdk';
import {CLIENT_PROTOCOL_REVISION} from '@nuva/protocol';
const wire:1=CLIENT_PROTOCOL_REVISION;
const client=createNuva({getAccessToken:async()=>({token:'backend-issued',expiresAt:0})});
async function creation(file:File){const brand=await client.brands.create({data:{name:'Brand'}});const base=await client.products.create({brand_id:brand.id,data:{name:'Product',attributes:{nested:{ok:true}}}});const {product}=await client.products.uploadImage({base,file});const script=await client.scripts.generate({product:product.id,acceptable_duration_ms:{min:5000,max:10000}});const {prompts}=await client.prompts.generate({script:script.id});const job=await client.videos.generate({prompt:prompts[0]!.id});return {script:script.content,job};}
declare const content:ScriptPackage;const inner:2=content.schema_version;
Message.create().text('Hello');
`,
		);
		await writeFile(
			resolve(consumer, 'tsconfig.json'),
			JSON.stringify({
				compilerOptions: {
					target: 'ES2022',
					module: 'NodeNext',
					moduleResolution: 'NodeNext',
					strict: true,
					noEmit: true,
					skipLibCheck: false,
					types: [],
					lib: ['ES2023', 'DOM'],
				},
				include: ['consumer.ts'],
			}),
		);
		const require = createRequire(resolve(ROOT, 'typescript/package.json'));
		const compiler = resolve(dirname(require.resolve('typescript/package.json')), 'bin/tsc');
		run(process.execPath, [compiler, '-p', 'tsconfig.json'], consumer);
		run(
			'npm',
			['install', '--ignore-scripts', '--no-audit', '--no-fund', '--prefer-offline', 'react@18.3.1', '@types/react@18.3.27'],
			consumer,
		);
		await writeFile(
			resolve(consumer, 'react.mjs'),
			"import assert from 'node:assert/strict';import {NuvaProvider,useAgent} from '@nuva/sdk/react';assert.equal(typeof NuvaProvider,'function');assert.equal(typeof useAgent,'function');\n",
		);
		run(process.execPath, ['react.mjs'], consumer);
		await writeFile(
			resolve(consumer, 'consumer.ts'),
			(await readFile(resolve(consumer, 'consumer.ts'), 'utf8')) +
				"\nimport {NuvaProvider,useAgent} from '@nuva/sdk/react';const hooks=[NuvaProvider,useAgent];\n",
		);
		run(process.execPath, [compiler, '-p', 'tsconfig.json'], consumer);
		const go = resolve(consumer, 'go');
		await mkdir(go);
		await writeFile(
			resolve(go, 'go.mod'),
			`module example.com/nuva-independent-customer\n\ngo 1.22.0\n\nrequire ${GO_MODULE} ${GO_VERSION}\n`,
		);
		await writeFile(
			resolve(go, 'consumer_test.go'),
			`package customer
import("testing";"context";admin "${GO_MODULE}")
func TestDeliveredSDK(t *testing.T){if admin.Version!="${GO_VERSION}"{t.Fatal(admin.Version)};client,err:=admin.NewAdminClient("https://fixture.invalid","fixture-key");if err!=nil{t.Fatal(err)};var token func(context.Context,string)(admin.TokenResponse,error)=client.IssueUserToken;var skill func(context.Context,string,admin.SkillRegistration)(admin.RegisteredSkill,error)=client.RegisterSkill;_=token;_=skill}
`,
		);
		const goenv = {
			GOTOOLCHAIN: 'local',
			GOWORK: 'off',
			GOFLAGS: '-modcacherw',
			GOPATH: resolve(consumer, 'gopath'),
			GOMODCACHE: resolve(consumer, 'gomodcache'),
			GOPROXY: pathToFileURL(resolve(output, 'go-proxy')).href,
			GOSUMDB: 'off',
			GOPRIVATE: '',
			GONOPROXY: 'none',
		};
		run('go', ['test', '-mod=mod', './...'], go, goenv);
		const module = JSON.parse(run('go', ['list', '-m', '-json', GO_MODULE], go, goenv));
		assert.equal(module.Version, GO_VERSION);
		assert.equal(module.Replace, undefined);
		assert.ok(module.Dir.startsWith(goenv.GOMODCACHE + '/'));
		assert.equal(
			await readFile(resolve(module.Dir, 'client.go'), 'utf8'),
			run('unzip', [
				'-p',
				resolve(output, `go-proxy/github.com/!nuva-!lab/ads-sdk/go/@v/${GO_VERSION}.zip`),
				`${GO_MODULE}@${GO_VERSION}/client.go`,
			]),
		);
		// Recheck exact archive hashes after every consumer operation.
		for (const item of manifest.artifacts) assert.equal(sha256(await readFile(resolve(output, item.path))), item.sha256);
		const evidence = {
			version: VERSION,
			archivesUnchanged: true,
			npm: {
				exactDeliveredTarballs: true,
				physicalInstallNoWorkspaceLinks: true,
				headlessWithoutReact: true,
				strictTypeScript: true,
				react18Subpath: true,
			},
			go: { module: GO_MODULE, version: GO_VERSION, exactDeliveredZip: true, moduleCacheNotReplace: true },
			schemas: { wire: 1, artifact: 1, scriptPackage: 2 },
			network: 'Only package-manager dependency resolution; no service/model/GPU calls',
		};
		await writeFile(resolve(output, 'verification.json'), JSON.stringify(evidence, null, 2) + '\n');
		return evidence;
	} catch (error) {
		if (error.stdout) console.error(String(error.stdout));
		if (error.stderr) console.error(String(error.stderr));
		throw error;
	} finally {
		await rm(consumer, { recursive: true, force: true });
	}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
	console.log(JSON.stringify(await checkRelease(process.argv[2] ? resolve(process.argv[2]) : DIST), null, 2));
