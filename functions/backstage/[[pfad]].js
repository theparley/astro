// BACKSTAGE, STUFE B: liefert einen Bereich unter /backstage/<adresse>/ aus (begonnen 27.11.2026, NUR LOKAL).
// Begründung, Cookie und Weg zurück: functions/_lib/backstage.js.
// WER NICHT ANGEMELDET IST, bekommt für jede Adresse dieselbe Antwort: weiter zur Anmeldung. Ob es den Bereich gibt,
// ob er gesperrt ist oder ob nur das Cookie fehlt, ist von außen nicht zu unterscheiden (Punkt 22 der Offen-Liste).
// Die Hülle der Seite baut Astro (src/pages/[kunde].astro, Zweig „huelle“); hier wird sie gefüllt.
import { BS_KOPF, adresseGueltig, backstageAngemeldet, backstageLink, fuellen, huellenPfad } from "../_lib/backstage.js";
import { verwaltung } from "../_lib/verwaltung.js";

const zurAnmeldung = (adresse = "") => new Response(null, { status: 303, headers: { Location: "/login/" + (adresse ? "?k=" + adresse : ""), ...BS_KOPF } });
const stoerung = () => new Response("Backstage ist gerade nicht erreichbar.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", ...BS_KOPF } });

export async function onRequest({ request, env, params }) {
	try {
		const url = new URL(request.url);
		const teile = Array.isArray(params.pfad) ? params.pfad : params.pfad ? [params.pfad] : [];
		const adresse = teile[0] || "";
		// Die Hülle der Seite, schon auf die Adresse des Bereichs umgeschrieben (der interne Pfad geht nie nach außen).
		const huelleHolen = async (fuer) => {
			const intern = await huellenPfad(env);
			const h = intern ? await env.ASSETS.fetch(new Request(new URL(intern + "/", url.origin).toString(), { method: "GET" })) : null;
			return h && h.status === 200 ? (await h.text()).split(intern).join(`/backstage/${fuer}`) : null;
		};
		// Rasuls Seite zum Anlegen (functions/_lib/verwaltung.js). Nur sie nimmt POST an.
		if (adresse === "verwaltung") return verwaltung({ request, env, url, teile, huelleHolen });
		if (!["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: BS_KOPF });
		if (!adresse) return zurAnmeldung();
		const rest = teile.slice(1).join("/");
		if (!adresseGueltig(adresse) || !(rest === "" || rest === "index.html")) return zurAnmeldung();
		// Persönlicher Link: gilt der Schlüssel, gibt es das Cookie und es geht sofort auf die Adresse ohne Schlüssel.
		const zugang = url.searchParams.get("zugang");
		if (zugang) {
			const l = await backstageLink(env, adresse, zugang, url).catch(() => null);
			return l ? new Response(null, { status: 303, headers: { Location: `/backstage/${adresse}/`, "Set-Cookie": l.cookie, ...BS_KOPF } }) : zurAnmeldung(adresse);
		}
		const b = await backstageAngemeldet(request, env, adresse);
		if (!b) return zurAnmeldung(adresse);
		// Eine Adresse je Seite, mit Schrägstrich am Ende. Erst hier, damit die Weiterleitung nichts über Bereiche verrät.
		const pfad = `/backstage/${adresse}/`;
		if (url.pathname !== pfad) return new Response(null, { status: 308, headers: { Location: pfad, ...BS_KOPF } });
		const huelle = await huelleHolen(adresse);
		if (!huelle) return stoerung();
		const html = fuellen(huelle, b);
		return new Response(request.method === "HEAD" ? null : html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...BS_KOPF } });
	} catch {
		return stoerung();
	}
}
