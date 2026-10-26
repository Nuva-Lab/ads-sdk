/** Exercise the same bundled SDK artifacts and pnpm installation used by customer releases. */
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { buildRelease } from '../../scripts/release/build.mjs';
import { checkRelease } from '../../scripts/release/check.mjs';
const output = await mkdtemp(resolve(tmpdir(), 'ads-sdk-package-check-'));
try {
  await buildRelease({ output });
  console.log(JSON.stringify(await checkRelease(output), null, 2));
} finally {
  await rm(output, { recursive: true, force: true });
}
