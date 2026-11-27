// @ts-check
import { defineConfig } from 'astro/config';
import { rm, readdir, readFile, writeFile } from 'node:fs/promises';
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

// KUNDENSEITEN „AKTENEINSICHT“ (27.11.2026, src/pages/[kunde].astro, functions/_middleware.js).
// 1. Der Wert AKTE_PFAD, aus dem der interne Pfad der Kundenseiten entsteht: Bei Cloudflare kommt er aus der
//    Umgebung des Baus. Lokal steht er in .dev.vars (nicht in Git) und wird hier eingelesen, wenn er nicht gesetzt ist.
// 2. Nach dem Bau entsteht _routes.json. Die Datei sagt Cloudflare Pages, für welche Adressen die Functions laufen:
//    wie bisher /api/*, dazu je Kundenseite /<slug> und /<slug>/*. Alle anderen Seiten laufen an der Mittelschicht
//    vorbei (Regel vom 16.11.2026 in public/_headers: kein Code je Aufruf). Die Liste kommt aus den Dateinamen in
//    src/daten/kundenseiten/ (ohne die mit _ am Anfang). Der interne Pfad steht NICHT darin.
//    Zwischenstand davor (wenige Stunden auf dev): Functions für alle Adressen, siehe functions/_middleware.js.
// Weg zurück: diesen Abschnitt und den Eintrag in integrations löschen, dazu functions/_middleware.js und die Vorlage.
if (!process.env.AKTE_PFAD) {
	const lokal = await readFile(new URL('./.dev.vars', import.meta.url), 'utf8').catch(() => '');
	const treffer = lokal.match(/^AKTE_PFAD="?([^"\n]+)"?$/m);
	if (treffer) process.env.AKTE_PFAD = treffer[1];
}
const kundenseiten = {
	name: 'kundenseiten',
	hooks: {
		'astro:build:done': async ({ dir, logger }) => {
			const quelle = fileURLToPath(new URL('./src/daten/kundenseiten/', import.meta.url));
			const slugs = (await readdir(quelle).catch(() => [])).filter((d) => d.endsWith('.md') && !d.startsWith('_')).map((d) => d.slice(0, -3)).sort();
			// /login: Dort prüft die Mittelschicht das Absenden des Login-Formulars (src/pages/login.astro).
			const include = ['/api/*', '/login', '/login/*', ...slugs.flatMap((s) => [`/${s}`, `/${s}/*`])];
			await writeFile(path.join(fileURLToPath(dir), '_routes.json'), JSON.stringify({ version: 1, include, exclude: [] }, null, '\t') + '\n');
			logger.info(`_routes.json: Functions laufen für /api/* und ${slugs.length} Kundenseite(n): ${slugs.join(', ') || 'keine'}`);
			if (slugs.length && !process.env.AKTE_PFAD) logger.warn('AKTE_PFAD fehlt: Es wurden KEINE Kundenseiten gebaut.');
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
