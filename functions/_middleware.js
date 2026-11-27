// PASSWORT FÜR KUNDENSEITEN „AKTENEINSICHT“ (27.11.2026). Auftrag aus der Sitzung „Rastetter“ auf Rasuls Wort vom
// 27.11.2026, Vorlage: src/pages/[kunde].astro, Inhalt: src/daten/kundenseiten/<slug>.md. Auftrag und Begründung im
// Marketing-Ordner: website/Uebergabe_Kundenseiten_2026-11.md, website/Website_Kundenseiten_Konzept_2026-11.md.
//
// WAS DAS TUT: Vor einer Kundenseite steht ein Formular. Nach dem richtigen Passwort setzt die Antwort ein Cookie,
// danach kommt die Seite ohne neue Frage. Bewusst nicht Cloudflare Access: Das schickt dem Besucher eine Mail mit
// Einmal-Code, und genau das können diese Kunden nicht annehmen.
//
// WELCHE ADRESSEN: alle Seitenaufrufe der Website, nicht nur die Kundenpfade. Ob eine Seite geschützt ist, entscheidet
// allein ihr Inhalt: das Merkmal data-akte-schutz="passwort" oder "offen" am <main> der gebauten Seite, daneben
// data-akte="<slug>". Jeder andere Wert als "offen" gilt als geschlossen. Seiten ohne Merkmal laufen unverändert durch.
// WARUM SO (gemessen auf dev am 27.11.2026, mit Platzhalterseite): Die erste Fassung lief nur für /hug-ka und
// /hug-ka/* (Liste in _routes.json). Cloudflare vergleicht diese Liste mit der Adresse, wie sie getippt wurde, liefert
// die Datei aber auch unter anders kodierten Schreibweisen aus: /hug%2Dka/, /%68ug-ka/, /hug-ka%2F und //hug-ka/
// brachten die Seite ohne Passwort. Deshalb hängt der Schutz jetzt am Inhalt, der ausgeliefert würde, und nicht an der
// Schreibweise der Adresse. Der Preis: Diese Datei läuft bei jedem Seitenaufruf mit (nicht bei Dateien aus /_astro,
// /fonts, /filme, /parley, siehe astro.config.mjs). Das weicht von der Regel vom 16.11.2026 in public/_headers ab
// („kein Code je Aufruf“). Damit die Website nicht an dieser Datei hängt: Tritt ein Fehler auf, bevor eine Seite als
// geschützt erkannt ist, wird sie normal ausgeliefert; danach bleibt sie zu.
//
// DAS PASSWORT steht als Wert bei Cloudflare (Pages, Einstellungen, Variablen und Geheimnisse), nie im Repo, lokal
// in .dev.vars (steht in .gitignore). Name: AKTE_ und die Adresse in Großbuchstaben, Bindestrich wird Unterstrich:
// /hug-ka → AKTE_HUG_KA. Fehlt der Wert, bleibt die Seite zu.
// Verglichen wird ohne Groß und klein, ohne Leerzeichen und ohne Bindestriche, damit ein am Telefon diktiertes
// Passwort („zwei Wörter und eine Zahl“) nicht an der Schreibweise scheitert.
//
// DAS COOKIE trägt nicht das Passwort, sondern eine Prüfsumme daraus (HMAC-SHA-256 mit dem Passwort als Schlüssel).
// Es gilt nur für die eine Kundenseite, 30 Tage. Wird das Passwort bei Cloudflare geändert, gelten alte Cookies nicht mehr.
//
// GRENZEN: Es gibt keinen Zähler für Fehlversuche (bräuchte einen Speicher, also einen neuen Dienst). Nach einem
// falschen Passwort wartet die Antwort eine Sekunde. Das Passwort schützt die Seite, nicht die Adressen der Videos
// bei Cloudflare Stream.
//
// Weg zurück: diese Datei löschen. Die Kundenseiten sind dann offen erreichbar, also vorher auch sie entfernen.

const TAGE = 30;
const TEXT = {
	titel: "Akteneinsicht",
	hinweis: "Diese Seite ist mit einem Passwort geschützt.",
	feld: "Passwort",
	knopf: "Öffnen",
	falsch: "Das Passwort stimmt nicht.",
	fehlt: "Diese Seite ist noch nicht eingerichtet.",
};

const kodierer = new TextEncoder();
const glatt = (wert) => String(wert ?? "").toLowerCase().replace(/[\s\-_.]+/g, "");
const hex = (puffer) => [...new Uint8Array(puffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

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

export async function onRequest({ request, env, next }) {
	const methode = request.method;
	let geschuetzt = false;
	try {
		const url = new URL(request.url);
		// Keine Abkürzung für /api/: Auch dort entscheidet nur, welche Datei ausgeliefert würde. Eine Ausnahme nach der
		// Schreibweise der Adresse wäre wieder eine Stelle, an der man vorbeikäme.
		if (!["GET", "HEAD", "POST"].includes(methode)) return next();

		// Die Datei holen, die Cloudflare unter dieser Adresse ausliefern würde, ohne die Kopfzeilen des Besuchers
		// (sonst käme bei „nicht geändert“ kein Inhalt).
		const seite = await env.ASSETS.fetch(new Request(url.toString(), { method: "GET" }));
		const istHtml = seite.status === 200 && (seite.headers.get("Content-Type") || "").includes("text/html");
		if (!istHtml) return next(); // Umleitungen, 404, Dateien
		const html = await seite.text();
		const merkmal = html.match(/data-akte-schutz="([^"]*)"/);
		if (!merkmal) return next(); // gewöhnliche Seite
		geschuetzt = merkmal[1] !== "offen";

		const ausliefern = () => {
			const kopf = new Headers(seite.headers);
			for (const [name, wert] of Object.entries(KOPF)) kopf.set(name, wert);
			kopf.delete("ETag");
			return new Response(methode === "HEAD" ? null : html, { status: 200, headers: kopf });
		};
		if (!geschuetzt) return methode === "POST" ? next() : ausliefern();

		// Der Slug kommt aus der Seite selbst, nicht aus der Adresse: Formular, Cookie und Wert gelten für die eine
		// richtige Schreibweise, egal wie die Adresse getippt wurde.
		const slug = (html.match(/data-akte="([a-z0-9]+(?:-[a-z0-9]+)*)"/) || [])[1];
		if (!slug) return formular("/", { status: 503, ohneFeld: true });
		const pfad = `/${slug}/`;
		const soll = glatt(env["AKTE_" + slug.toUpperCase().replace(/-/g, "_")]);
		if (!soll) return formular(pfad, { status: 503, ohneFeld: true });

		const name = "akte_" + slug.replace(/-/g, "_");
		const summe = await pruefsumme(soll, slug);

		if (methode === "POST") {
			let eingabe = "";
			try { eingabe = glatt((await request.formData()).get("passwort")); } catch { /* leere oder kaputte Eingabe gilt als falsch */ }
			if (eingabe && await gleich(eingabe, soll)) {
				const sicher = url.protocol === "https:" ? "; Secure" : "";
				return new Response(null, {
					status: 303,
					headers: { Location: pfad, "Set-Cookie": `${name}=${summe}; Path=/${slug}; Max-Age=${TAGE * 86400}; HttpOnly; SameSite=Lax${sicher}`, ...KOPF },
				});
			}
			await new Promise((fertig) => setTimeout(fertig, 1000));
			return formular(pfad, { fehler: TEXT.falsch });
		}

		const hat = cookieWert(request, name);
		if (hat && await gleich(hat, summe)) return ausliefern();
		return formular(pfad);
	} catch {
		if (geschuetzt) return formular("/", { status: 503, ohneFeld: true });
		return next();
	}
}
