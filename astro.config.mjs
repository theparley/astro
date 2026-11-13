// @ts-check
import { defineConfig } from 'astro/config';
import { rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Werkstatt- und Probeseiten bleiben lokal (Dev-Server), werden aber nicht hochgeladen (13.11.2026, Rasul „Ja,
// entfernen“ zur Forma-Frage: die hochgeladene Fassung darf Forma DJR nicht ausliefern, solange nur Testlizenzen
// vorliegen). Nach dem Bau werden diese Seiten, die Werkstatt-Ordner aus public und die Forma-Dateien aus dist
// gelöscht. Öffentliche Seiten: siehe PAGES in src/pages/sitemap.xml.ts. Rückweg: Eintrag aus der Liste nehmen.
const NUR_LOKAL = [
	'bausteine', 'kacheln', 'kopf-demo', 'stoppuhr-demo', 'studio', 'stunden-werkstatt', 'tafel',
	'uhr-varianten', 'wand', 'wand-drei', 'werkstatt',
	'lab', 'test', 'werkzeug', 'bausteine-demo.html',
	'fonts/FormaDJRVariable.woff2', 'fonts/FormaDJRMonoVariable.woff2',
	'lokal', // Gast-Videos ohne Freigabe (Symlinks, ohnehin nicht in Git)
];
const nurLokal = {
	name: 'nur-lokal',
	hooks: {
		'astro:build:done': async ({ dir, logger }) => {
			const wurzel = fileURLToPath(dir);
			for (const eintrag of NUR_LOKAL) {
				await rm(path.join(wurzel, eintrag), { recursive: true, force: true });
				await rm(path.join(wurzel, eintrag + '.html'), { force: true });
			}
			// Skript-Bündel, die nur zu diesen Seiten gehören (z. B. werkstatt.astro_astro_type_script…js)
			const astroDir = path.join(wurzel, '_astro');
			for (const datei of await readdir(astroDir)) {
				if (NUR_LOKAL.some((seite) => datei.startsWith(seite + '.astro_'))) await rm(path.join(astroDir, datei), { force: true });
			}
			logger.info(`nur lokal, nicht hochgeladen: ${NUR_LOKAL.length} Einträge entfernt`);
		},
	},
};

// https://astro.build/config
export default defineConfig({
	integrations: [nurLokal],
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
