/** Release-owned routing. Store is documented in ads_backend/README.md at the pinned backend source.
 * New Agent/writing origins have not been assigned to this unpublished preview. */
export const serviceOrigins: { readonly agent?: string; readonly store: string; readonly generation?: string } = Object.freeze({
	store: 'https://api.nuvalab.ai',
});
