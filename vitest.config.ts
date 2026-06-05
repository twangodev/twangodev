import { defineConfig } from 'vitest/config';

// Isolated unit-test config. Intentionally does NOT load the SvelteKit plugin
// (which runs a `buildStart` cobe build) so unit tests stay fast and decoupled
// from Svelte compilation. Lib modules import each other relatively, so no
// `$lib` alias is required here.
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
