// Sitemap (Umzug auf parleyfilm.com, 26.10.2026). Bewusst von Hand gepflegt
// statt @astrojs/sitemap: im Repo liegen viele Demo- und Werkstattseiten
// (kacheln, wand, tafel, …), die nicht in den Google-Index gehören. Hier nur
// die Seiten, die über Menü und Footer erreichbar sind. Neue öffentliche
// Seite = hier eintragen.
import type { APIRoute } from "astro";

// Mit Schrägstrich am Ende wie die Canonical-Adressen (Pages leitet /termin
// per 308 auf /termin/ um).
const PAGES = ["/", "/termin/", "/kontakt/", "/impressum/", "/datenschutz/"];

export const GET: APIRoute = ({ site }) => {
	const urls = PAGES.map((path) => `\t<url><loc>${new URL(path, site).href}</loc></url>`).join("\n");
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
		{ headers: { "Content-Type": "application/xml; charset=utf-8" } },
	);
};
