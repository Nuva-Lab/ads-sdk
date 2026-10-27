import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const VERSION = '0.1.0-preview.2';
export const GO_VERSION = `v${VERSION}`;
export const GO_MODULE = 'github.com/Nuva-Lab/ads-sdk/go';
export const DIST = resolve(ROOT, 'scripts/release/dist', VERSION);
export const run = (command, args, cwd = ROOT, env = {}) =>
	execFileSync(command, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', stdio: 'pipe', timeout: 180000 });
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export async function files(directory) {
	const result = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		if (entry.isSymbolicLink()) throw new Error(`Symlink excluded from release: ${entry.name}`);
		if (entry.isDirectory()) result.push(...(await files(resolve(directory, entry.name))).map((path) => `${entry.name}/${path}`));
		else if (entry.isFile()) result.push(entry.name);
	}
	return result.sort();
}
export async function copy(source, target) {
	const stat = await lstat(source);
	if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Release input must be a regular file: ${source}`);
	await mkdir(dirname(target), { recursive: true });
	await copyFile(source, target);
}
export async function json(path) {
	return JSON.parse(await readFile(path, 'utf8'));
}
export function approvedOrigins(value) {
	if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).sort().join(',') !== 'agent,generation,store')
		throw new Error('Origins must contain exactly agent, generation and store.');
	for (const origin of Object.values(value)) {
		const url = new URL(origin);
		const host = url.hostname.toLowerCase().replace(/\.$/, '');
		// Baked defaults use public DNS names. IP literals and local/documentation namespaces
		// are not release destinations; this is syntax validation, not a DNS readiness probe.
		const nonPublicHost =
			!host.includes('.') ||
			/^\d+\.\d+\.\d+\.\d+$/.test(host) ||
			host.startsWith('[') ||
			/(^|\.)(localhost|local|internal|invalid|test|example|onion|home|lan|corp)$/.test(host) ||
			/(^|\.)home\.arpa$/.test(host) ||
			/(^|\.)example\.(com|net|org)$/.test(host);
		if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.port || nonPublicHost)
			throw new Error('Approved origins require public DNS HTTPS URLs without credentials, query, fragment or port.');
	}
	return value;
}
