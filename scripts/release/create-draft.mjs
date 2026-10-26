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
await writeFile(notes, `# Ads SDK ${VERSION}\n\nTypeScript client and Go Admin SDK for ad creation, resource management and Agent chat.\n\n## Install\n\nDownload the SDK bundle and run:\n\n\`\`\`sh\npnpm add /path/to/nuva-sdk-${VERSION}.tgz\n\`\`\`\n\nWith private repository access, Go applications can use \`${manifest.go.module}@${manifest.go.version}\`.\n\n## Documentation\n\nThe bundle includes frontend.html, store.html and backend-go.html, plus examples and checksums. See verification.json for package installation checks.\n`);
console.log(run('gh', ['release', 'create', tag, '--repo', repository, '--verify-tag', '--draft', '--prerelease', '--title', `Ads SDK ${VERSION}`, '--notes-file', notes, ...assets]));
