/** Local release only. Never publishes, tags, deploys, or reads private runtime state. */
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, VERSION, GO_VERSION, GO_MODULE, DIST, run, files, copy, json, approvedOrigins, sha256 } from './common.mjs';
export async function buildRelease({ output = DIST, origins } = {}) {
	if (origins) approvedOrigins(origins);
	const stage = await mkdtemp(resolve(tmpdir(), 'nuva-release-stage-'));
	try {
		await mkdir(output, { recursive: true });
		await rm(resolve(output, 'verification.json'), { force: true });
		run('pnpm', ['--dir', 'typescript', 'build']);
		const packageFiles = {},
			sourceFiles = [];
		for (const directory of ['protocol', 'typescript']) {
			const source = resolve(ROOT, directory),
				target = resolve(stage, directory),
				manifest = await json(resolve(source, 'package.json'));
			if (manifest.version !== VERSION) throw new Error(`Package version mismatch: ${manifest.name}`);
			for (const path of [
				...(await files(resolve(source, 'dist'))).map((name) => `dist/${name}`),
				'README.md',
				...(directory === 'typescript' ? ['schema/backend.source.json'] : []),
			])
				await copy(resolve(source, path), resolve(target, path));
			if (directory === 'typescript') {
				manifest.dependencies['@nuva/protocol'] = VERSION;
				if (origins)
					await writeFile(
						resolve(target, 'dist/service-origins.js'),
						`/** Explicit release routing supplied by the operator. */\nexport const serviceOrigins = Object.freeze(${JSON.stringify(origins, null, 2)});\n`,
					);
			}
			// Only distribution fields: no maintainer build commands or development dependencies.
			delete manifest.scripts;
			delete manifest.devDependencies;
			delete manifest.packageManager;
			await writeFile(resolve(target, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
			const packed = JSON.parse(run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', output], target))[0];
			packageFiles[manifest.name] = {
				file: packed.filename,
				version: manifest.version,
				files: packed.files.map((file) => file.path).sort(),
			};
			const allow = [
				'package.json',
				'README.md',
				'tsconfig.json',
				...(await files(resolve(source, 'src'))).map((name) => `src/${name}`),
				...(directory === 'typescript'
					? [
							'schema/backend.source.json',
							'schema/backend.openapi.json',
							...(await files(resolve(source, 'scripts'))).map((name) => `scripts/${name}`),
						]
					: []),
			];
			for (const path of allow) {
				const name = `${directory}/${path}`;
				await copy(resolve(source, path), resolve(stage, 'source', name));
				sourceFiles.push(name);
			}
		}
		const goRoot = resolve(ROOT, 'go');
		const goFiles = ['go.mod', 'client.go', 'types.go', 'README.md', 'examples/learning/publisher.go', 'examples/learning/README.md'];
		if (!(await readFile(resolve(goRoot, 'client.go'), 'utf8')).includes(`const Version = "${GO_VERSION}"`))
			throw new Error('Go version mismatch.');
		for (const path of goFiles) {
			await copy(resolve(goRoot, path), resolve(stage, 'go', path));
			const name = `go/${path}`;
			await copy(resolve(goRoot, path), resolve(stage, 'source', name));
			sourceFiles.push(name);
		}
		for (const path of [
			'pnpm-lock.yaml',
			...['common.mjs', 'build.mjs', 'check.mjs', 'archives.py'].map((name) => `scripts/release/${name}`),
		]) {
			await copy(resolve(ROOT, path), resolve(stage, 'source', path));
			sourceFiles.push(path);
		}
		await writeFile(
			resolve(stage, 'source/package.json'),
			JSON.stringify({ name: 'nuva-sdk-release-source', private: true, type: 'module', packageManager: 'pnpm@11.7.0' }, null, 2) + '\n',
		);
		await writeFile(resolve(stage, 'source/pnpm-workspace.yaml'), 'packages:\n  - typescript\n  - protocol\n');
		if (origins) await writeFile(resolve(stage, 'source/approved-origins.json'), JSON.stringify(origins, null, 2) + '\n');
		await writeFile(
			resolve(stage, 'source/BUILD.md'),
			`# SDK source ${VERSION}\n\nInstall with pnpm 11.7.0, Node 22+, Python 3 and Go 1.22+. Run \`pnpm install --frozen-lockfile\`, then \`node scripts/release/build.mjs${origins ? ' --origins approved-origins.json' : ''}\`. Source excludes runtime, credentials, maintainer-only Skill content and tests. This bundle contains public SDK implementations; the root lock retains dependency integrity metadata. No registry publication or Git repository is created.\n`,
		);
		run('python3', [resolve(ROOT, 'scripts/release/archives.py'), stage, output, VERSION, GO_MODULE]);
		// Inventory only this build's outputs. Review bundles and other files beside them belong to their owner.
		const escapedModule = GO_MODULE.replace(/[A-Z]/g, (character) => '!' + character.toLowerCase());
		const proxy = `go-proxy/${escapedModule}/@v`;
		const archivePaths = [
			...Object.values(packageFiles).map((item) => item.file),
			`ads-sdk-source-${VERSION}.tar.gz`,
			`${proxy}/list`,
			...['mod', 'info', 'zip'].map((extension) => `${proxy}/${GO_VERSION}.${extension}`),
		].sort();
		const inventory = [];
		for (const path of archivePaths) {
			const bytes = await readFile(resolve(output, path));
			inventory.push({ path, bytes: bytes.length, sha256: sha256(bytes) });
		}
		const manifest = {
			version: VERSION,
			goVersion: GO_VERSION,
			wireRevision: 1,
			httpSchemaVersion: 1,
			artifactSchemaVersion: 1,
			scriptPackageSchemaVersion: 2,
			serviceOrigins: origins ?? { status: 'Agent/generation not configured; explicit endpoint overrides required' },
			npm: packageFiles,
			go: { module: GO_MODULE, version: GO_VERSION, files: goFiles },
			source: {
				files: await files(resolve(stage, 'source')),
				exclusions: [
					'services/',
					'forks/',
					'tests/',
					'*_test.go',
					'.local/',
					'.dev.vars*',
					'.secrets/',
					'node_modules/',
					'skills/',
					'recipes/',
					'schema/proposed-capabilities.md',
				],
			},
			artifacts: inventory,
		};
		await writeFile(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
		await writeFile(
			resolve(output, 'SHA256SUMS'),
			[
				...inventory.map((item) => `${item.sha256}  ${item.path}`),
				`${sha256(await readFile(resolve(output, 'manifest.json')))}  manifest.json`,
			].join('\n') + '\n',
		);
		return manifest;
	} finally {
		await rm(stage, { recursive: true, force: true });
	}
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
	const args = process.argv.slice(2);
	if (args.length && !(args.length === 2 && args[0] === '--origins')) throw new Error('Usage: node build.mjs [--origins approved.json]');
	const manifest = await buildRelease(args.length ? { origins: await json(resolve(args[1])) } : {});
	console.log(
		JSON.stringify(
			{ output: DIST, version: manifest.version, archives: manifest.artifacts.map((item) => item.path), origins: manifest.serviceOrigins },
			null,
			2,
		),
	);
}
