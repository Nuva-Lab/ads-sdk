import { serviceOrigins } from './service-origins.js';
import type { NuvaEnvironment } from './types.js';

const productionOrigins = Object.freeze({
	agent: 'https://agent.nuvalab.ai/api',
	store: 'https://api.nuvalab.ai',
	generation: 'https://api.nuvalab.ai',
});

export function originsForEnvironment(environment: NuvaEnvironment | undefined) {
	if (environment === undefined || environment === 'sandbox') return serviceOrigins;
	if (environment === 'production') return productionOrigins;
	throw new TypeError('environment must be "sandbox" or "production".');
}
