// @ts-check
import { defineConfig } from 'astro/config';
import { rm, readdir, writeFile } from 'node:fs/promises';
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
	// Forma DJR als Schriftdatei bleibt lokal: Seit Richtung 12 (17.11.2026) steht „parley Film“ im Menü als Umriss
	// (LogoBiss), die Datei wird im Bau nicht gebraucht. Zwischenstand mit Datei im Bau: Commit 9ad9520.
	'fonts/FormaDJRVariable.woff2',
	'fonts/FormaDJRMonoVariable.woff2',
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

// KUNDENSEITEN „AKTENEINSICHT“ (27.11.2026, src/pages/[kunde].astro): Nach dem Bau entsteht _routes.json. Die Datei
// sagt Cloudflare Pages, für welche Adressen die Functions laufen: für alle, außer für die Ordner und Dateien unten,
// in denen nie eine Seite liegt. So prüft functions/_middleware.js jeden Seitenaufruf, aber nicht jede Schrift, jedes
// Bild und jedes Skript.
// VORHER (wenige Stunden auf dev): nur /api/* und je Kundenseite /<slug> und /<slug>/*. Auf dev gemessen: Cloudflare
// lieferte die Seite unter anders kodierten Adressen (/hug%2Dka/, //hug-ka/) an der Mittelschicht vorbei aus. Die
// Liste verriet außerdem die Kundenpfade im Bau. Begründung und Preis stehen in functions/_middleware.js.
// Weg zurück: diesen Abschnitt und den Eintrag in integrations löschen (dann auch functions/_middleware.js und die
// Kundenseiten löschen, sonst liegen sie offen).
const kundenseiten = {
	name: 'kundenseiten',
	hooks: {
		'astro:build:done': async ({ dir, logger }) => {
			const exclude = ['/_astro/*', '/fonts/*', '/filme/*', '/parley/*', '/favicon.ico', '/favicon.svg', '/apple-touch-icon.png', '/og-parleyfilm.png', '/robots.txt', '/sitemap.xml'];
			await writeFile(path.join(fileURLToPath(dir), '_routes.json'), JSON.stringify({ version: 1, include: ['/*'], exclude }, null, '\t') + '\n');
			logger.info(`_routes.json: Functions laufen für alle Adressen außer ${exclude.length} Ausnahmen`);
		},
	},
};

// https://astro.build/config
export default defineConfig({
	integrations: [nurLokal, kundenseiten],
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
