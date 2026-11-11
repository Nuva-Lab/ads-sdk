import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat, mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const VERSION = '0.1.0-preview.6';
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
/**
 * The CHANGELOG.md section for a version, without its heading; a release needs one. The heading is the exact line
 * `## <version>`; the section ends at the next `## ` heading. Lines inside fenced code blocks are never headings.
 */
export async function releaseNotes(version = VERSION, text) {
	text ??= await readFile(resolve(ROOT, 'CHANGELOG.md'), 'utf8');
	const lines = text.replace(/\r\n?/g, '\n').split('\n');
	let fence = null, start = -1, end = lines.length;
	for (const [index, line] of lines.entries()) {
		const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
		if (marker !== undefined && (fence === null || (marker[0] === fence[0] && marker.length >= fence.length))) {
			fence = fence === null ? marker : null;
			continue;
		}
		if (fence !== null || !/^## /.test(line)) continue;
		if (start !== -1) {
			end = index;
			break;
		}
		if (line.trimEnd() === `## ${version}`) start = index + 1;
	}
	if (start === -1) throw new Error(`CHANGELOG.md has no entry for ${version}.`);
	const notes = lines.slice(start, end).join('\n').trim();
	if (!notes) throw new Error(`The CHANGELOG.md entry for ${version} is empty.`);
	return notes;
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
