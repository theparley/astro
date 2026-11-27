// PASSWORT FÜR KUNDENSEITEN „AKTENEINSICHT“ (27.11.2026). Auftrag aus der Sitzung „Rastetter“ auf Rasuls Wort vom
// 27.11.2026, Vorlage: src/pages/[kunde].astro, Inhalt: src/daten/kundenseiten/<slug>.md. Auftrag und Begründung im
// Marketing-Ordner: website/Uebergabe_Kundenseiten_2026-11.md, website/Website_Kundenseiten_Konzept_2026-11.md.
//
// WAS DAS TUT: Vor einer Kundenseite steht ein Formular. Nach dem richtigen Passwort setzt die Antwort ein Cookie,
// danach kommt die Seite ohne neue Frage. Bewusst nicht Cloudflare Access: Das schickt dem Besucher eine Mail mit
// Einmal-Code, und genau das können diese Kunden nicht annehmen.
//
// WO DIE SEITE LIEGT (Umbau 27.11.2026, Rasul: „Ja, bau das“): Unter /hug-ka liegt im Bau KEINE Datei. Astro baut die
// Kundenseite unter einem internen Pfad, den niemand erraten kann: /a-<40 Zeichen>/, gerechnet als HMAC-SHA-256 aus
// dem Wert AKTE_PFAD und dem Slug (dieselbe Rechnung in src/pages/[kunde].astro). Diese Datei holt die Seite von dort
// und liefert sie unter /<slug>/ aus. Den internen Pfad ersetzt sie dabei im Quelltext durch die Kundenadresse, damit
// er nirgends zu lesen ist.
// WARUM SO (gemessen auf dev am 27.11.2026, mit Platzhalterseite): Lag die Seite als Datei unter /hug-ka/, lieferte
// Cloudflare sie auch unter /hug%2Dka/, /%68ug-ka/, /hug-ka%2F und //hug-ka/ aus, an dieser Datei vorbei: Die Liste
// in _routes.json wird mit der getippten Schreibweise verglichen, ausgeliefert wird nach dem Entschlüsseln. Eine
// endliche Liste aller Schreibweisen gibt es nicht. Jetzt endet jede andere Schreibweise bei „nicht gefunden“.
// Zwischenstand davor (wenige Stunden auf dev, Commits a28c08b und 1371f43): Datei unter /hug-ka/, diese Datei lief
// bei jedem Seitenaufruf der Website und prüfte den Inhalt. Verworfen, weil die ganze Website dann an dieser Datei
// hing (Regel vom 16.11.2026 in public/_headers: kein Code je Aufruf).
//
// WELCHE ADRESSEN: Cloudflare ruft diese Datei nur für /api/* und je Kundenseite für /<slug> und /<slug>/* auf. Die
// Liste schreibt astro.config.mjs (Abschnitt „kundenseiten“) aus den Dateinamen in src/daten/kundenseiten/. Alle
// anderen Seiten laufen an dieser Datei vorbei. Fehlt _routes.json doch einmal, läuft sie überall mit und reicht
// alles weiter, was keine Kundenseite ist.
//
// DER WERT AKTE_PFAD ist eine gewöhnliche Variable bei Cloudflare (kein Geheimwert): Er wird beim Bau UND hier
// gebraucht, und nur für gewöhnliche Variablen sagt Cloudflare beides zu. Er schützt nichts, er versteckt nur eine
// Adresse. Wird er bekannt: Wert ändern, neu bauen. Fehlt er beim Bau, entstehen keine Kundenseiten; fehlt er hier,
// findet diese Datei keine.
//
// LOGIN (27.11.2026, Rasul: „geh doch auf meine Webseite unter Login“): Die Seite /login/ (src/pages/login.astro) ist
// eine gewöhnliche gebaute Seite mit zwei Feldern, Kürzel und Passwort. Sie schickt hierher (POST /login/). Stimmt
// beides, gibt es das Cookie und die Weiterleitung auf die Kundenseite. Stimmt etwas nicht, geht es mit ?fehler=1
// zurück, immer mit demselben Satz: Die Antwort verrät nicht, ob es das Kürzel gibt.
// Wer eine geschützte Kundenadresse ohne Cookie aufruft, wird auf /login/?k=<slug> geleitet. Das eigene Formular
// dieser Datei (formular unten) zeigt nur noch die Meldung „noch nicht eingerichtet“.
//
// OB EINE SEITE EIN PASSWORT BRAUCHT, steht in der gebauten Seite: data-akte-schutz="passwort" oder "offen" am <main>,
// daneben data-akte="<slug>". Jeder andere Wert als "offen" gilt als geschlossen.
//
// DAS PASSWORT steht als Wert bei Cloudflare (Pages, Einstellungen, Variablen und Geheimnisse), nie im Repo, lokal
// in .dev.vars (steht in .gitignore). Name: AKTE_ und die Adresse in Großbuchstaben, Bindestrich wird Unterstrich:
// /hug-ka → AKTE_HUG_KA. Fehlt der Wert, bleibt die Seite zu.
// Verglichen wird ohne Groß und klein, ohne Leerzeichen und ohne Bindestriche, damit ein am Telefon diktiertes
// Passwort („zwei Wörter und eine Zahl“) nicht an der Schreibweise scheitert.
//
// DAS COOKIE trägt nicht das Passwort, sondern eine Prüfsumme daraus (HMAC-SHA-256 mit dem Passwort als Schlüssel).
// 30 Tage. Wird das Passwort bei Cloudflare geändert, gelten alte Cookies nicht mehr.
// EIN COOKIE FÜR DIE GANZE WEBSITE (27.11.2026, Rasul: „wenn ich dann auf eine andere Seite gehe und dann steht immer
// noch beim Rückweg Login da und ich müsste mich nochmal einloggen“): Das Cookie heißt „akte“, gilt für Path=/ und
// trägt Slug und Prüfsumme (hug-ka.<Prüfsumme>). Wer angemeldet ist und auf die Kachel Login geht (GET /login/ ohne
// ?k und ohne ?fehler), wird hier geprüft und gleich auf seine Kundenseite geleitet. Es bleibt das eine
// Anmelde-Cookie; im Browser wird sonst nichts gemerkt (kein localStorage, siehe MenuBBH.astro „KEIN RÜCKWEG“).
// Die Kachel heißt weiter „Login“: Die gebauten Seiten wissen nichts von der Anmeldung, das Cookie ist HttpOnly.
// Folge: je Browser eine Kundenseite zur selben Zeit. Vorher: Cookie akte_<slug> mit Path=/<slug>, die Kachel Login
// zeigte immer das Formular. Weg zurück: cookieZeile und die zwei Stellen mit angemeldet() auf den Stand von
// Commit 82a0320 setzen.
//
// GRENZEN: Es gibt keinen Zähler für Fehlversuche (bräuchte einen Speicher, also einen neuen Dienst). Nach einem
// falschen Passwort wartet die Antwort eine Sekunde. Das Passwort schützt die Seite, nicht die Adressen der Videos
// bei Cloudflare Stream.
//
// Weg zurück: diese Datei löschen. Die Kundenseiten sind dann offen erreichbar, also vorher auch sie entfernen.

const TAGE = 30;
const TEXT = {
	titel: "Backstage", // bis 27.11.2026 abends „Kundenbereich“ (Rasuls Namenswahl), davor „Akteneinsicht“, siehe src/pages/[kunde].astro (TITEL AUS DER KUNDENDATEI)
	hinweis: "Diese Seite ist mit einem Passwort geschützt.",
	feld: "Passwort",
	knopf: "Öffnen",
	falsch: "Das Passwort stimmt nicht.",
	fehlt: "Diese Seite ist noch nicht eingerichtet.",
};

const kodierer = new TextEncoder();
const glatt = (wert) => String(wert ?? "").toLowerCase().replace(/[\s\-_.]+/g, "");
const hex = (puffer) => [...new Uint8Array(puffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

// Interner Pfad einer Kundenseite. Dieselbe Rechnung steht in src/pages/[kunde].astro, beide müssen gleich bleiben.
async function internerPfad(geheim, slug) {
	const schluessel = await crypto.subtle.importKey("raw", kodierer.encode(geheim), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	return "/a-" + hex(await crypto.subtle.sign("HMAC", schluessel, kodierer.encode("akteneinsicht-pfad:" + slug))).slice(0, 40);
}

async function pruefsumme(passwort, slug) {
	const schluessel = await crypto.subtle.importKey("raw", kodierer.encode(passwort), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	return hex(await crypto.subtle.sign("HMAC", schluessel, kodierer.encode("akteneinsicht:" + slug)));
}

// Vergleich ohne frühen Abbruch: Beide Seiten werden erst gehasht, dann ganz verglichen.
async function gleich(a, b) {
	const [ha, hb] = await Promise.all([a, b].map(async (t) => new Uint8Array(await crypto.subtle.digest("SHA-256", kodierer.encode(t)))));
	let unterschied = 0;
	for (let i = 0; i < ha.length; i++) unterschied |= ha[i] ^ hb[i];
	return unterschied === 0;
}

function cookieWert(request, name) {
	for (const teil of (request.headers.get("Cookie") || "").split(";")) {
		const i = teil.indexOf("=");
		if (i > 0 && teil.slice(0, i).trim() === name) return teil.slice(i + 1).trim();
	}
	return "";
}

const KOPF = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin" };

function formular(pfad, { fehler = "", status = 401, ohneFeld = false } = {}) {
	const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${TEXT.titel} · Parley Film</title>
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<style>
@font-face { font-family: "Geist"; src: url("/fonts/frei/Geist-Variable.woff2") format("woff2"); font-weight: 100 900; font-display: swap; }
* { box-sizing: border-box; }
html, body { height: 100%; }
body { margin: 0; background: #000; color: #fff; font-family: "Geist", -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 18px; line-height: 1.4; letter-spacing: -0.02em; display: grid; place-items: center; padding: 16px; }
main { width: 100%; max-width: 420px; }
h1 { font-size: 28px; line-height: 1.1; font-weight: 600; margin: 0 0 0.5em; }
p { margin: 0 0 1.5em; }
label { display: block; margin-bottom: 0.4em; }
input { display: block; width: 100%; font: inherit; font-size: 18px; color: #fff; background: #000; border: 1px solid #fff; border-radius: 0; padding: 0.7em 0.8em; }
input:focus-visible, button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
button { display: block; width: 100%; margin-top: 16px; font: inherit; font-weight: 600; color: #000; background: #fff; border: 1px solid #fff; border-radius: 0; padding: 0.7em 0.8em; cursor: pointer; }
.fehler { margin: 16px 0 0; }
</style>
</head>
<body>
<main>
<h1>${TEXT.titel}</h1>
${ohneFeld ? `<p role="alert">${TEXT.fehlt}</p>` : `<p>${TEXT.hinweis}</p>
<form method="post" action="${pfad}">
<label for="passwort">${TEXT.feld}</label>
<input id="passwort" name="passwort" type="password" required autofocus autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false">
<button type="submit">${TEXT.knopf}</button>
${fehler ? `<p class="fehler" role="alert">${fehler}</p>` : ""}
</form>`}
</main>
</body>
</html>`;
	return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...KOPF } });
}

// NIE EINE KUNDENSEITE ALS DATEI DURCHREICHEN (gemessen auf dev am 27.11.2026): Cloudflare Pages hält Dateien eines
// früheren Baus bis zu eine Woche im Zwischenspeicher vor (Antwort mit „s-maxage=604800“, cf-cache-status HIT) und
// liefert sie weiter aus, auch wenn der neue Bau sie nicht mehr enthält. Lag unter einer Kundenadresse je eine Datei,
// käme sie über next() ohne Passwort zurück. Deshalb: Trägt die weitergereichte Antwort das Merkmal einer
// Kundenseite, gibt es „nicht gefunden“ statt der Seite.
async function weiter(next) {
	const antwort = await next();
	if (antwort.status !== 200 || !(antwort.headers.get("Content-Type") || "").includes("text/html")) return antwort;
	const text = await antwort.text();
	if (text.includes("data-akte-schutz=")) return new Response("Nicht gefunden.", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...KOPF } });
	return new Response(text, { status: 200, headers: antwort.headers });
}

// Holt die gebaute Kundenseite vom internen Pfad. null = keine Kundenseite unter diesem Slug.
async function kundenseite(env, origin, slug) {
	const geheim = String(env.AKTE_PFAD || "");
	if (!geheim || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
	const intern = await internerPfad(geheim, slug);
	const seite = await env.ASSETS.fetch(new Request(new URL(intern + "/", origin).toString(), { method: "GET" }));
	if (seite.status !== 200 || !(seite.headers.get("Content-Type") || "").includes("text/html")) return null;
	const roh = await seite.text();
	const merkmal = roh.match(/data-akte-schutz="([^"]*)"/);
	if (!merkmal || !roh.includes(`data-akte="${slug}"`)) return null;
	// Der interne Pfad steht in der gebauten Seite (Canonical, Open Graph). Er geht nie nach außen.
	return { html: roh.split(intern).join("/" + slug), offen: merkmal[1] === "offen", kopf: seite.headers };
}

const COOKIE = "akte";
// LOGOUT (27.11.2026, Rasul: „ich müsste dann auf der Kundenseite auch einen Logout anbieten“): Die Kundenseite
// schickt ein Formular an POST /login/ mit dem Feld abmelden=1. Die Antwort löscht das Anmelde-Cookie und führt auf
// /login/. Bewusst POST und kein Verweis: Einen Verweis könnte der Browser vorab laden und damit abmelden.
// Ein lesbares Merkzeichen für das Menü („Version A“, akte_da) gab es am 27.11.2026 kurz auf localhost; es ist
// wieder heraus, die Antwort hier löscht ein übrig gebliebenes mit.
const loeschZeile = (name, url) => `${name}=; Path=/; Max-Age=0; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`;
function abmelden(url) {
	const kopf = new Headers(KOPF);
	kopf.set("Location", "/login/");
	kopf.append("Set-Cookie", loeschZeile(COOKIE, url) + "; HttpOnly");
	kopf.append("Set-Cookie", loeschZeile("akte_da", url));
	return new Response(null, { status: 303, headers: kopf });
}

const sollPasswort = (env, slug) => glatt(env["AKTE_" + slug.toUpperCase().replace(/-/g, "_")]);
const cookieZeile = (slug, summe, url) => `${COOKIE}=${slug}.${summe}; Path=/; Max-Age=${TAGE * 86400}; HttpOnly; SameSite=Lax${url.protocol === "https:" ? "; Secure" : ""}`;

// Slug aus dem Cookie, wenn es eines gibt; geprüft ist damit noch nichts.
function cookieSlug(request) {
	const wert = cookieWert(request, COOKIE), i = wert.indexOf(".");
	const slug = i > 0 ? wert.slice(0, i) : "";
	return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) ? { slug, summe: wert.slice(i + 1) } : null;
}
// Stimmt das Cookie für diesen Slug? soll = das geglättete Passwort der Seite.
async function angemeldet(request, soll, slug) {
	const c = cookieSlug(request);
	return !!(c && soll && c.slug === slug && c.summe && await gleich(c.summe, await pruefsumme(soll, slug)));
}

// POST /login/: Kürzel und Passwort prüfen. Jeder Fehler sieht gleich aus und dauert gleich lang.
async function anmelden(request, env, url) {
	let kuerzel = "", eingabe = "";
	try {
		const felder = await request.formData();
		if (felder.get("abmelden")) return abmelden(url);
		kuerzel = String(felder.get("kuerzel") ?? "").trim().toLowerCase().replace(/\s+/g, "-");
		eingabe = glatt(felder.get("passwort"));
	} catch { /* leere oder kaputte Eingabe gilt als falsch */ }
	const start = Date.now();
	let ziel = "";
	const seite = await kundenseite(env, url.origin, kuerzel);
	const kopf = new Headers(KOPF);
	if (seite) {
		if (seite.offen) ziel = `/${kuerzel}/`;
		else {
			const soll = sollPasswort(env, kuerzel);
			if (soll && eingabe && await gleich(eingabe, soll)) {
				ziel = `/${kuerzel}/`;
				kopf.append("Set-Cookie", cookieZeile(kuerzel, await pruefsumme(soll, kuerzel), url));
			}
		}
	}
	if (ziel) { kopf.set("Location", ziel); return new Response(null, { status: 303, headers: kopf }); }
	await new Promise((fertig) => setTimeout(fertig, Math.max(0, 1000 - (Date.now() - start))));
	const k = /^[a-z0-9-]{1,60}$/.test(kuerzel) ? "&k=" + kuerzel : "";
	return new Response(null, { status: 303, headers: { Location: "/login/?fehler=1" + k, ...KOPF } });
}

export async function onRequest({ request, env, next }) {
	const methode = request.method;
	let geschuetzt = false;
	try {
		if (!["GET", "HEAD", "POST"].includes(methode)) return next();
		const url = new URL(request.url);
		const teile = url.pathname.split("/"); // "", slug, rest
		let slug = "";
		try { slug = decodeURIComponent(teile[1] || ""); } catch { return next(); }
		const rest = teile.slice(2).join("/");
		if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || !(rest === "" || rest === "index.html")) return next();
		// Login: Die Seite selbst ist eine gewöhnliche Datei, nur das Absenden wird hier geprüft.
		if (slug === "login") {
			if (methode === "POST") return anmelden(request, env, url);
			// Schon angemeldet: von der Kachel Login direkt auf die eigene Kundenseite. Mit ?k oder ?fehler bleibt das
			// Formular stehen (so kommt man auch an eine andere Kundenseite).
			const c = cookieSlug(request);
			if (c && !url.searchParams.has("k") && !url.searchParams.has("fehler")) {
				const eigene = await kundenseite(env, url.origin, c.slug);
				if (eigene && !eigene.offen && await angemeldet(request, sollPasswort(env, c.slug), c.slug)) return new Response(null, { status: 303, headers: { Location: `/${c.slug}/`, ...KOPF } });
			}
			return next();
		}

		const seite = await kundenseite(env, url.origin, slug);
		if (!seite) return weiter(next);
		geschuetzt = !seite.offen;
		const pfad = `/${slug}/`;

		const ausliefern = () => {
			// Eine Adresse je Seite, wie überall auf der Website: mit Schrägstrich am Ende.
			if (url.pathname !== pfad) return new Response(null, { status: 308, headers: { Location: pfad, ...KOPF } });
			const kopf = new Headers(seite.kopf);
			for (const [name, wert] of Object.entries(KOPF)) kopf.set(name, wert);
			kopf.delete("ETag");
			return new Response(methode === "HEAD" ? null : seite.html, { status: 200, headers: kopf });
		};
		if (methode === "POST") return new Response(null, { status: 405, headers: KOPF });
		if (!geschuetzt) return ausliefern();

		const soll = sollPasswort(env, slug);
		if (!soll) return formular(pfad, { status: 503, ohneFeld: true });
		if (await angemeldet(request, soll, slug)) return ausliefern();
		// Ohne gültiges Cookie zum Login, das Kürzel steht dort schon im Feld.
		return new Response(null, { status: 303, headers: { Location: "/login/?k=" + slug, ...KOPF } });
	} catch {
		if (geschuetzt) return formular("/", { status: 503, ohneFeld: true });
		return next();
	}
}
