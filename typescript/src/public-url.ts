/** True for a public hostname URL: an allowed scheme, no port or credentials, not an IP literal or internal name. */
export function isPublicUrl(value: string, protocols: readonly string[]): boolean {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return false;
	}
	const host = url.hostname.toLowerCase().replace(/\.$/, '');
	return (
		protocols.includes(url.protocol) &&
		!url.port &&
		!url.username &&
		!url.password &&
		host.includes('.') &&
		!/^\d+\.\d+\.\d+\.\d+$/.test(host) &&
		!host.startsWith('[') &&
		!/(^|\.)(localhost|internal)$/.test(host)
	);
}
