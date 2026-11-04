import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { buildRelease } from './build.mjs';
import { approvedOrigins, releaseNotes, VERSION, GO_VERSION, run } from './common.mjs';
test('release routing accepts only an explicit complete HTTPS configuration', () => {
	// Syntax fixtures only; these are not approved or deployed service configuration.
	const origins = { agent: 'https://agent.nuvalab.ai/api', store: 'https://api.nuvalab.ai', generation: 'https://writer.nuvalab.ai' };
	assert.deepEqual(approvedOrigins(origins), origins);
	for (const candidate of [
		{ store: origins.store },
		{ ...origins, agent: 'http://localhost:8980' },
		{ ...origins, agent: 'https://u:p@example.com' },
		{ ...origins, generation: 'https://writer.example?token=private' },
	])
		assert.throws(() => approvedOrigins(candidate));
	for (const host of [
		'localhost',
		'localhost.',
		'service.localhost',
		'127.0.0.1',
		'2130706433',
		'10.1.2.3',
		'172.16.1.2',
		'192.168.1.2',
		'169.254.169.254',
		'[::1]',
		'[::]',
		'[fc00::1]',
		'[fe80::1]',
		'[::ffff:127.0.0.1]',
		'service.local',
		'service.internal',
		'service.invalid',
		'service.test',
		'service.example',
		'example.com',
		'home.arpa',
		'service.home.arpa',
	]) {
		assert.throws(() => approvedOrigins({ ...origins, agent: `https://${host}/api` }), /public DNS HTTPS/);
	}
});
test('CHANGELOG.md has a release-notes entry for this version', async () => {
	assert.match(await releaseNotes(VERSION), /Migrating from/);
	const text = '# Changelog\n\n## 2.0.0\n\nNew.\n\n## 1.0.0\n\nOld.\n';
	assert.equal(await releaseNotes('2.0.0', text), 'New.');
	assert.equal(await releaseNotes('1.0.0', text), 'Old.');
	await assert.rejects(releaseNotes('3.0.0', text), /no entry for 3\.0\.0/);
	await assert.rejects(releaseNotes('1.0.0', '## 1.0.0\n\n## 0.9.0\n'), /empty/);
});
test('repeat local builds produce identical delivered bytes and public-only inventories', { timeout: 120000 }, async () => {
	const temporary = await mkdtemp(resolve(tmpdir(), 'nuva-release-repro-'));
	try {
		await mkdir(resolve(temporary, 'first'));
		const unrelated = resolve(temporary, 'first', 'ads-sdk-review-stale.zip');
		await writeFile(unrelated, 'Separate review archive: preserve exact bytes.');
		const first = await buildRelease({ output: resolve(temporary, 'first') }),
			second = await buildRelease({ output: resolve(temporary, 'second') });
		assert.deepEqual(first.artifacts, second.artifacts);
		assert.equal(first.artifacts.length, 7);
		assert.ok(!first.artifacts.some((item) => item.path.includes('review-stale')));
		assert.equal(await readFile(unrelated, 'utf8'), 'Separate review archive: preserve exact bytes.');
		assert.doesNotMatch(await readFile(resolve(temporary, 'first', 'SHA256SUMS'), 'utf8'), /review-stale/);
		assert.equal(first.npm['@nuva/sdk'].version, VERSION);
		assert.equal(first.npm['@nuva/protocol'].version, VERSION);
		assert.equal(first.go.version, GO_VERSION);
		assert.ok(first.go.files.includes('client_test.go'));
		assert.ok(first.go.files.includes('examples/learning/publisher_test.go'));
		assert.ok(first.go.files.includes('scripts/check-package.sh'));
		assert.equal(first.wireRevision, 1);
		assert.equal(first.httpSchemaVersion, 1);
		assert.equal(first.artifactSchemaVersion, 1);
		assert.equal(first.scriptSchemaVersion, 3);
		assert.equal(first.storyboardSchemaVersion, 1);
		assert.equal(first.legacyScriptPackageSchemaVersion, 2);
		for (const item of Object.values(first.npm))
			assert.ok(
				item.files.every(
					(path) => path === 'package.json' || path === 'README.md' || path.startsWith('dist/') || path.startsWith('schema/') || path.startsWith('node_modules/@nuva/protocol/'),
				),
			);
		assert.ok(
			first.source.files.every(
				(path) => !/(^|\/)(services|forks|tests|skills|recipes|\.local|\.secrets|node_modules)(\/|$)|\.dev\.vars/.test(path),
			),
		);
		const sourceList = run('tar', ['-tzf', resolve(temporary, 'first', `ads-sdk-source-${VERSION}.tar.gz`)]);
		assert.doesNotMatch(sourceList, /research-iteration-guide|staging-smoke\.json|\.dev\.vars/);
		assert.ok((await readFile(resolve(temporary, 'first', 'SHA256SUMS'), 'utf8')).includes('manifest.json'));
	} finally {
		await rm(temporary, { recursive: true, force: true });
	}
});
