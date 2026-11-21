/**
 * An image file larger than the upload limit, made smaller in the browser before it is sent (Nuva-Lab/ads-sdk#47).
 *
 * The upload limit is the service's (`max_bytes` from `POST /v1/assets/uploads`); the Agent and the writers use images
 * of at most 2048 px on the long side anyway, so a scaled copy loses nothing they would use. The steps match the copies
 * the Agent makes of large images itself: WebP at quality 0.8 and at most 2048 px, then 1536 px at quality 0.75.
 */
const STEPS = [
	{ maxSide: 2048, quality: 0.8 },
	{ maxSide: 1536, quality: 0.75 },
] as const;

/**
 * A copy of `file` of at most `maxBytes`, or undefined when this runtime cannot decode or encode images (Node.js, a
 * Web Worker without OffscreenCanvas), the file is not an image it can decode, or no step is small enough.
 */
export async function fitImage(file: File, maxBytes: number): Promise<File | undefined> {
	if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return undefined;
	let bitmap: ImageBitmap;
	try {
		// Applies the photo's EXIF orientation, so a portrait phone photo stays upright.
		bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		return undefined;
	}
	try {
		for (const step of STEPS) {
			const scale = Math.min(1, step.maxSide / Math.max(bitmap.width, bitmap.height));
			const width = Math.max(1, Math.round(bitmap.width * scale)),
				height = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = new OffscreenCanvas(width, height);
			const context = canvas.getContext('2d');
			if (context === null) return undefined;
			context.imageSmoothingQuality = 'high';
			context.drawImage(bitmap, 0, 0, width, height);
			// A browser that cannot encode WebP (Safari) returns PNG, which keeps transparency; the next step is smaller.
			const blob = await canvas.convertToBlob({ type: 'image/webp', quality: step.quality });
			if (blob.size <= maxBytes) return new File([blob], renamed(file.name, blob.type), { type: blob.type, lastModified: file.lastModified });
		}
		return undefined;
	} finally {
		bitmap.close();
	}
}

function renamed(name: string, type: string): string {
	const extension = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';
	const base = name.replace(/\.[^./\\]*$/, '');
	return `${base || 'image'}.${extension}`;
}
