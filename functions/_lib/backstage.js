// BACKSTAGE, STUFE B: Bereiche aus der Datenbank (Cloudflare D1, Bindung „DB“). Begonnen 27.11.2026, NUR LOKAL.
// Rasul 27.11.2026 im Gespräch „Mitgliederbereich“: „Erst B, Code später“; in „Website · Programmierung“: „Ja, lokal
// anfangen“. Auftrag und Bauplan: Marketing-Ordner website/Uebergabe_Mitgliederbereich_2026-11.md.
//
// WAS HIER LIEGT: alles, was die Anmeldung (functions/_middleware.js) und die Auslieferung
// (functions/backstage/[[pfad]].js) gemeinsam brauchen. Schema: datenbank/schema.sql.
// OHNE DATENBANK (env.DB fehlt, so auf dev und live, solange Rasul keine angelegt hat) antwortet jede Funktion
// hier mit „gibt es nicht“. Die Kundenseiten aus Dateien (/hug-ka, /neubauer) laufen davon unberührt weiter.
//
// PASSWORT: In der Datenbank liegen nur salz und pw_summe (PBKDF2-SHA-256, 100.000 Runden; mehr erlaubt Cloudflare
// in Workers nicht). Verglichen wird wie bisher geglättet: ohne Groß und klein, Leerzeichen, Bindestriche, Punkte.
// COOKIE „backstage“: <adresse>.<HMAC>. Der Schlüssel des HMAC ist der Wert AKTE_PFAD zusammen mit pw_summe.
// Folge: Ein neues Passwort macht alle alten Anmeldungen ungültig, und wer nur die Datenbank kennt, kann kein
// Cookie bauen. 30 Tage wie beim Cookie „akte“ (Rasul 27.11.2026: „30 Tage bleiben“).
// NOCH NICHT GEBAUT: Zähler für Fehlversuche, persönlicher Link, Rasuls Seite zum Anlegen.
// Weg zurück: diese Datei, functions/backstage/, datenbank/ und die mit BACKSTAGE markierten Stellen in
// functions/_middleware.js, src/pages/[kunde].astro und astro.config.mjs löschen.

const kodierer = new TextEncoder();
const hex = (puffer) => [...new Uint8Array(puffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
const ausHex = (text) => new Uint8Array((String(text).match(/../g) || []).map((b) => parseInt(b, 16)));

export const BS_COOKIE = "backstage";
export const BS_TAGE = 30;
const ADRESSE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Unter /backstage/ vergeben: Rasuls Seite zum Anlegen und Namen, die verwirren würden.
export const BS_GESPERRT = ["verwaltung", "login", "logout", "api", "neu", "index"];
export const BS_KOPF = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "private, no-store", "Referrer-Policy": "same-origin" };

export const glatt = (wert) => String(wert ?? "").toLowerCase().replace(/[\s\-_.]+/g, "");
export const adresseGueltig = (adresse) => ADRESSE.test(adresse || "") && adresse.length <= 60 && !BS_GESPERRT.includes(adresse);

export async function pwSumme(passwortGlatt, salzHex) {
	const roh = await crypto.subtle.importKey("raw", kodierer.encode(passwortGlatt), "PBKDF2", false, ["deriveBits"]);
	return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: ausHex(salzHex), iterations: 100000 }, roh, 256));
}

async function hmac(schluessel, text) {
	const k = await crypto.subtle.importKey("raw", kodierer.encode(schluessel), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
	return hex(await crypto.subtle.sign("HMAC", k, kodierer.encode(text)));
}

// Vergleich ohne frühen Abbruch (wie gleich() in _middleware.js).
async function gleich(a, b) {
	const [ha, hb] = await Promise.all([a, b].map(async (t) => new Uint8Array(await crypto.subtle.digest("SHA-256", kodierer.encode(String(t))))));
	let unterschied = 0;
	for (let i = 0; i < ha.length; i++) unterschied |= ha[i] ^ hb[i];
	return unterschied === 0;
}

// Interner Pfad der Hülle. Dieselbe Rechnung steht in src/pages/[kunde].astro, beide müssen gleich bleiben.
export async function huellenPfad(env) {
	const geheim = String(env.AKTE_PFAD || "");
	return geheim ? "/a-" + (await hmac(geheim, "akteneinsicht-pfad:backstage-huelle")).slice(0, 40) : "";
}

export async function bereich(env, adresse) {
	if (!env.DB || !adresseGueltig(adresse)) return null;
	return (await env.DB.prepare("SELECT * FROM bereich WHERE adresse = ?1").bind(adresse).first()) || null;
}

const cookieSumme = (env, b) => hmac(String(env.AKTE_PFAD || "") + ":" + b.pw_summe, "backstage:" + b.adresse);

function cookieLesen(request) {
	for (const teil of (request.headers.get("Cookie") || "").split(";")) {
		const i = teil.indexOf("=");
		if (i > 0 && teil.slice(0, i).trim() === BS_COOKIE) {
			const wert = teil.slice(i + 1).trim(), p = wert.indexOf(".");
			return p > 0 ? { adresse: wert.slice(0, p), summe: wert.slice(p + 1) } : null;
		}
	}
	return null;
}

// Anmeldung mit Benutzername (= Adresse) und Passwort. null = stimmt nicht; der Aufrufer antwortet für alle Fehler gleich.
// Gerechnet wird auch für Adressen, die es nicht gibt, damit die Antwort gleich lange dauert.
export async function backstageAnmelden(env, adresse, eingabeGlatt, url) {
	if (!env.DB || !env.AKTE_PFAD) return null;
	const b = await bereich(env, adresse);
	const summe = await pwSumme(eingabeGlatt || "-", b?.salz || "00000000000000000000000000000000");
	if (!b || b.gesperrt || !eingabeGlatt || !(await gleich(summe, b.pw_summe))) return null;
	await env.DB.prepare("UPDATE bereich SET zuletzt_angemeldet = ?2 WHERE adresse = ?1").bind(b.adresse, new Date().toISOString()).run();
	const sicher = url.protocol === "https:" ? "; Secure" : "";
	return {
		ziel: `/backstage/${b.adresse}/`,
		cookie: `${BS_COOKIE}=${b.adresse}.${await cookieSumme(env, b)}; Path=/; Max-Age=${BS_TAGE * 86400}; HttpOnly; SameSite=Lax${sicher}`,
	};
}

// Der Bereich, für den das Cookie gilt, oder null. Mit adresse: nur wenn das Cookie genau für diese Adresse gilt.
export async function backstageAngemeldet(request, env, adresse = "") {
	if (!env.DB || !env.AKTE_PFAD) return null;
	const c = cookieLesen(request);
	if (!c || !c.summe || (adresse && c.adresse !== adresse)) return null;
	const b = await bereich(env, c.adresse);
	if (!b || b.gesperrt || !(await gleich(c.summe, await cookieSumme(env, b)))) return null;
	return b;
}

// ENTSCHÄRFEN: Alles aus der Datenbank geht nur als Text in die Seite, nie als HTML.
const sicher = (text) => String(text ?? "").replace(/[&<>"']/g, (z) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[z]));
const zwischen = (html, name) => {
	const a = `<!--bs:${name}-->`, e = `<!--/bs:${name}-->`;
	const i = html.indexOf(a), j = html.indexOf(e);
	return i < 0 || j < i ? null : { vor: html.slice(0, i), innen: html.slice(i + a.length, j), nach: html.slice(j + e.length) };
};
const ersetzen = (html, paare) => Object.entries(paare).reduce((t, [name, wert]) => t.split(`[[bs:${name}]]`).join(wert), html);

// Füllt die von Astro gebaute Hülle (src/pages/[kunde].astro, Zweig „huelle“) mit einem Bereich.
export function fuellen(huelle, b) {
	const titel = String(b.titel || "").trim() || "Backstage";
	let html = huelle;
	// Clips: Der Block zwischen den Marken ist das Muster für EIN Video und wird je Clip wiederholt.
	let clips = [];
	try { clips = JSON.parse(b.clips || "[]").filter((c) => c && /^[0-9a-f]{32}$/.test(c.stream || "")); } catch { clips = []; }
	const cl = zwischen(html, "clips");
	if (cl) {
		const stuecke = clips.map((c) => {
			let s = cl.innen.split("bsclipkennungbsclipkennungbsclipk").join(c.stream);
			if (!String(c.titel || "").trim()) s = s.replace(/<figcaption[\s\S]*?<\/figcaption>/, "").replace(/Abspielen: \[\[bs:cliptitel\]\]/g, "Abspielen").replace(/ aria-label="\[\[bs:cliptitel\]\]"/g, "");
			return ersetzen(s, { cliptitel: sicher(String(c.titel || "").trim()) });
		});
		html = cl.vor + stuecke.join("") + cl.nach;
	}
	const sc = zwischen(html, "schritt");
	if (sc) {
		const ziel = /^(\/[^/\\]|https:\/\/)/.test(b.knopf_ziel || "") ? b.knopf_ziel : "/termin";
		html = sc.vor + (String(b.schritt || "").trim() ? ersetzen(sc.innen, { schritt: sicher(b.schritt.trim()), knopf: sicher(String(b.knopf || "").trim() || "Termin finden") }).split("/bs-knopfziel").join(sicher(ziel)) : "") + sc.nach;
	}
	const absaetze = String(b.text || "").split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean).map((a) => `<p>${sicher(a).replace(/\n/g, "<br>")}</p>`).join("");
	html = html.split("<!--bs:text-->").join(absaetze);
	// Leere Reste entfernen: Unterzeile ohne Namen, Videoblock ohne Clips (gemessen am 27.11.2026 am Testbereich probe-zwei).
	if (!String(b.name || "").trim()) html = html.replace(/<p class="[^"]*seitentitel__unter[^"]*"[^>]*>\[\[bs:name\]\]<\/p>/, "");
	if (!clips.length) html = html.replace(/<div class="akte__videos"[^>]*>\s*<\/div>/, "");
	return ersetzen(html, {
		titel: sicher(titel).replace(/\n+/g, "-<br>"),
		titelglatt: sicher(titel.replace(/\n+/g, "")),
		name: sicher(String(b.name || "").trim()),
		adresse: sicher(b.adresse),
	});
}
