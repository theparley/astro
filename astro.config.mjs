// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	// Adresse der Website (Umzug theparley.de → parleyfilm.com, 26.10.2026).
	// Grundlage für Canonical, Open Graph, Sitemap und robots.txt.
	site: 'https://parleyfilm.com',
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
