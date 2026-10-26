// robots.txt (Umzug auf parleyfilm.com, 26.10.2026): alles erlaubt, Verweis
// auf die Sitemap. Die Adresse kommt aus `site` in astro.config.mjs.
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) =>
	new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site).href}\n`, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
