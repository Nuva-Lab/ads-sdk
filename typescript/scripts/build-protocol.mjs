/**
 * Builds the `@nuva/protocol` package this SDK resolves to: `../protocol` in this repository, or the canonical
 * protocol package when a parent workspace (the WhatIf monorepo) links its own copy instead.
 */
import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const linked = realpathSync(resolve(here, '../node_modules/@nuva/protocol'));
execFileSync('pnpm', ['--dir', linked, 'build'], { stdio: 'inherit' });
