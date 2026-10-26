import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, VERSION, GO_MODULE, run, json } from './common.mjs';
export async function checkTag(tag = process.env.RELEASE_TAG) {
  assert.match(tag ?? '', /^v\d+\.\d+\.\d+-preview\.\d+$/, 'Use an existing preview version tag.');
  assert.equal(tag, `v${VERSION}`);
  for (const path of ['package.json', 'typescript/package.json', 'protocol/package.json'])
    assert.equal((await json(resolve(ROOT, path))).version, VERSION);
  const head = run('git', ['rev-parse', 'HEAD']).trim();
  for (const ref of [tag, `go/${tag}`])
    assert.equal(run('git', ['rev-parse', `refs/tags/${ref}^{commit}`]).trim(), head, 'Release and Go tags must identify this commit.');
  assert.equal(GO_MODULE, 'github.com/Nuva-Lab/ads-sdk/go');
  return tag;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  console.log(await checkTag());
