import test from 'node:test';
import assert from 'node:assert/strict';
import { createNuva } from '../dist/index.js';

// An image over the upload limit is sent as a smaller copy where the runtime can make one (Nuva-Lab/ads-sdk#47).
const asset = {
	id: '01a175e0-31b3-da69-176e-0842e6f6602e',
	kind: 'image',
	mime: 'image/webp',
	source: 'uploaded',
	size_bytes: 50,
	metadata: { width: 2048, height: 1536 },
	label: null,
	description: null,
	created_at: '2026-11-21T00:00:00Z',
	download_url: 'https://files.invalid/a',
	download_url_expires_at: '2026-11-21T01:00:00Z',
};

function service(t, maxBytes) {
	const puts = [];
	const original = globalThis.fetch;
	globalThis.fetch = async (url, options) => {
		url = String(url);
		if (url.endsWith('/v1/assets/uploads'))
			return Response.json({ upload_url: 'https://files.invalid/put', upload_token: 't', expires_at: '2026-11-21T01:00:00Z', max_bytes: maxBytes }, { status: 201 });
		if (url === 'https://files.invalid/put') {
			puts.push({ file: options.body, contentType: options.headers['Content-Type'] });
			return new Response(null, { status: 200 });
		}
		return Response.json(asset, { status: 201 });
	};
	const nuva = createNuva({ baseUrl: 'http://127.0.0.1:1/api', storeBaseUrl: 'https://store.invalid', getAccessToken: async () => 'fixture' });
	t.after(() => {
		nuva.close();
		globalThis.fetch = original;
	});
	return { nuva, puts };
}

/** A browser's image decoding and canvas: `encode(width, quality)` is the encoded size, `type` what it encodes to. */
function browserCanvas(t, { width = 4000, height = 3000, encode, type = 'image/webp' }) {
	const calls = { decoded: [], drawn: [], encoded: [] };
	const saved = { createImageBitmap: globalThis.createImageBitmap, OffscreenCanvas: globalThis.OffscreenCanvas };
	globalThis.createImageBitmap = async (file, options) => {
		calls.decoded.push({ name: file.name, options });
		return { width, height, close: () => (calls.closed = true) };
	};
	globalThis.OffscreenCanvas = class {
		constructor(w, h) {
			this.width = w;
			this.height = h;
		}
		getContext() {
			return { imageSmoothingQuality: 'low', drawImage: (_bitmap, x, y, w, h) => calls.drawn.push([x, y, w, h]) };
		}
		async convertToBlob(options) {
			calls.encoded.push({ ...options, width: this.width, height: this.height });
			return new Blob([new Uint8Array(encode(this.width, options.quality))], { type });
		}
	};
	t.after(() => Object.assign(globalThis, saved));
	return calls;
}

const photo = (bytes, name = 'IMG_0001.JPG') => new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });

test('an image over the limit is sent as WebP of at most 2048 px, upright', async (t) => {
	const canvas = browserCanvas(t, { encode: () => 50 });
	const { nuva, puts } = service(t, 100);
	await nuva.assets.upload(photo(150));
	assert.deepEqual(canvas.decoded, [{ name: 'IMG_0001.JPG', options: { imageOrientation: 'from-image' } }]);
	assert.deepEqual(canvas.drawn, [[0, 0, 2048, 1536]]);
	assert.deepEqual(canvas.encoded, [{ type: 'image/webp', quality: 0.8, width: 2048, height: 1536 }]);
	assert.equal(canvas.closed, true);
	assert.equal(puts.length, 1);
	assert.equal(puts[0].contentType, 'image/webp');
	assert.equal(puts[0].file.name, 'IMG_0001.webp');
	assert.equal(puts[0].file.size, 50);
});

test('a copy still too large is made again at 1536 px', async (t) => {
	const canvas = browserCanvas(t, { width: 3000, height: 4000, encode: (width) => (width > 1200 ? 120 : 80) });
	const { nuva, puts } = service(t, 100);
	await nuva.assets.upload(photo(150));
	assert.deepEqual(
		canvas.encoded.map(({ width, height, quality }) => [width, height, quality]),
		[
			[1536, 2048, 0.8],
			[1152, 1536, 0.75],
		],
	);
	assert.equal(puts[0].file.size, 80);
});

test('a browser that encodes PNG instead of WebP sends PNG', async (t) => {
	browserCanvas(t, { encode: () => 60, type: 'image/png' });
	const { nuva, puts } = service(t, 100);
	await nuva.assets.upload(photo(150, 'product.png'));
	assert.equal(puts[0].contentType, 'image/png');
	assert.equal(puts[0].file.name, 'product.png');
});

test('an image within the limit is sent as it is, without decoding', async (t) => {
	const canvas = browserCanvas(t, { encode: () => 50 });
	const { nuva, puts } = service(t, 100);
	const file = photo(100);
	await nuva.assets.upload(file);
	assert.equal(canvas.decoded.length, 0);
	assert.equal(puts[0].file, file);
});

test('an image no copy can fit is refused before anything is sent', async (t) => {
	browserCanvas(t, { encode: () => 120 });
	const { nuva, puts } = service(t, 100);
	await assert.rejects(nuva.assets.upload(photo(150)), (error) => error.code === 'INVALID_INPUT' && /2048 px/.test(error.message));
	assert.equal(puts.length, 0);
});

test('without a canvas (Node.js) an image over the limit is refused with how to fix it', async (t) => {
	assert.equal(typeof globalThis.OffscreenCanvas, 'undefined');
	const { nuva, puts } = service(t, 100);
	await assert.rejects(nuva.assets.upload(photo(150)), (error) => error.code === 'INVALID_INPUT' && /larger than 100 bytes\. Scale it down/.test(error.message));
	assert.equal(puts.length, 0);
});

test('a video over the limit is refused, not converted', async (t) => {
	const canvas = browserCanvas(t, { encode: () => 50 });
	const { nuva, puts } = service(t, 100);
	const video = new File([new Uint8Array(150)], 'clip.mp4', { type: 'video/mp4' });
	await assert.rejects(nuva.assets.upload(video), (error) => error.code === 'INVALID_INPUT' && error.message === 'The file is larger than 100 bytes.');
	assert.equal(canvas.decoded.length, 0);
	assert.equal(puts.length, 0);
});
