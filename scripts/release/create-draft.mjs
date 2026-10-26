/** Explicit maintainer command; creates a private draft release, never publishes to npm. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { VERSION, DIST, run, json, sha256 } from './common.mjs';
import { checkTag } from './check-tag.mjs';
const tag = await checkTag();
const repository = 'Nuva-Lab/ads-sdk';
if (process.env.GITHUB_REPOSITORY) assert.equal(process.env.GITHUB_REPOSITORY, repository);
assert.equal(JSON.parse(run('gh', ['api', `repos/${repository}`])).private, true, 'Release repository must remain private.');
const manifest = await json(resolve(DIST, 'manifest.json'));
const verification = await json(resolve(DIST, 'verification.json'));
assert.equal(manifest.version, VERSION);
assert.equal(verification.version, VERSION);
assert.equal(verification.archivesUnchanged, true);
for (const item of manifest.artifacts) {
  const file = resolve(DIST, item.path);
  assert.ok(file.startsWith(DIST + '/'));
  assert.equal(sha256(await readFile(file)), item.sha256);
}
const assets = [
  `ads-sdk-review-${VERSION}.zip`, `nuva-sdk-${VERSION}.tgz`, `nuva-protocol-${VERSION}.tgz`,
  `ads-sdk-source-${VERSION}.tar.gz`, 'manifest.json', 'SHA256SUMS', 'verification.json',
].map(name => resolve(DIST, name));
assets.push(resolve(DIST, '../../../..', 'docs/customer-sdk-docs.zip'));
for (const file of assets) await readFile(file);
const notes = resolve(DIST, 'RELEASE-NOTES.md');
await writeFile(notes, `# Ads SDK ${VERSION}\n\nPrivate preview for maintainer review. Includes TypeScript SDK, protocol, Go Admin module, customer reference and reproducible source builds.\n\nDownload the review ZIP for all packages, the offline Go module proxy, documentation and checksums. Go module: \`${manifest.go.module}@${manifest.go.version}\`; repository tag: \`go/${tag}\`.\n\nPackage/API boundary: SDK ${VERSION}; public wire/API/Artifact schemas v1; embedded ScriptPackage v2.\n\nService routing: \`${JSON.stringify(manifest.serviceOrigins)}\`. This release does not deploy the Agent or backend, issue credentials, or publish packages to npm. Current video calls require saved Prompt IDs; upcoming backend contracts need coordinated SDK adoption.\n\nThe exact npm tarballs and Go module zip passed clean-consumer installation locally. See verification.json. Hosted CI status must be assessed separately before publishing this draft.\n`);
console.log(run('gh', ['release', 'create', tag, '--repo', repository, '--verify-tag', '--draft', '--prerelease', '--title', `SDK ${VERSION}`, '--notes-file', notes, ...assets]));
