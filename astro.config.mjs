// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	devToolbar: {
		enabled: false,
	},
	// /buchen → /termin (Struktur-Entscheid 2026-06-14). Produktiv macht
	// public/_redirects den 301 auf Cloudflare Pages; dieser Eintrag deckt
	// den Dev-Server und dient als Fallback (Meta-Refresh-Seite im Build).
	redirects: {
		"/buchen": "/termin",
	},
});
