// BACKSTAGE, STUFE B: RASULS SEITE ZUM ANLEGEN unter /backstage/verwaltung/ (begonnen 28.11.2026, NUR LOKAL).
// Rasul 27.11.2026 im Gespräch „Mitgliederbereich“ auf die Frage, wer anlegt: „Ich selbst“; in „Website ·
// Programmierung“: „Ja, weiter“. Bauplan: Marketing-Ordner website/Uebergabe_Mitgliederbereich_2026-11.md, Punkt 3.
//
// WAS SIE KANN: Liste aller Bereiche mit „zuletzt angemeldet“, anlegen, ändern, ansehen wie ein Gast, sperren und
// entsperren, neues Passwort ziehen, eigenes Passwort setzen (für den Umzug von /hug-ka und /neubauer), löschen mit
// Rückfrage, alles herunterladen (ohne Passwörter). NOCH NICHT: persönlicher Link, Zähler für Fehlversuche.
//
// SCHUTZ: ein eigenes Passwort, Geheimwert BACKSTAGE_VERWALTUNG bei Cloudflare (lokal in .dev.vars), mindestens
// 16 Zeichen. Es wird genau verglichen, nicht geglättet: Es soll ein langes Zufallspasswort aus dem Passwortmanager
// sein, kein diktierbares (Abweichung vom Bauplan, Rasul am 27.11.2026 genannt). Wer hier hineinkommt, sieht und
// ändert alle Bereiche. Cookie „backstage_v“: gilt 12 Stunden, nur für diesen Pfad, HttpOnly, SameSite=Strict.
// Jedes Absenden muss von dieser Website selbst kommen (Kopfzeile Origin), sonst wird es abgelehnt.
// Fehlt der Geheimwert oder die Datenbank, ist die Seite zu (so auf dev und live, bis Rasul beides angelegt hat).
//
// PASSWÖRTER DER BEREICHE: werden hier gezogen (drei Wörter und eine Zahl, am Telefon diktierbar) und GENAU EINMAL
// gezeigt, in der Antwort auf das Absenden. In der Datenbank liegen nur Salz und Prüfsumme. Kein Passwort steht in
// einer Adresse, einem Protokoll oder einer Datei.
// GESTALTUNG: Entwurf der Programmierung im Stil der Website (schwarz, weiß, Geist), von Rasul nicht abgenommen.
// Eigene kleine Seite ohne Astro, damit hier kein Bau nötig ist und nichts von ihr im öffentlichen Bau liegt.
// Weg zurück: diese Datei löschen und in functions/backstage/[[pfad]].js die zwei Zeilen mit „verwaltung“.
import { BS_KOPF, adresseGueltig, bereich, fuellen, glatt, gleich, hmac, pwSumme, sicher } from "./backstage.js";

const V_COOKIE = "backstage_v";
const V_STUNDEN = 12;
const PFAD = "/backstage/verwaltung/";
// Dieselbe Liste wie in scripts/kundenseite.mjs: kurze, eindeutig zu sprechende Wörter ohne Umlaute und ß.
const WOERTER = ("Apfel Birne Kirsche Pflaume Zitrone Traube Melone Feige Mandel Walnuss Hafer Weizen Roggen Gerste Brot Butter " +
	"Honig Zucker Salz Pfeffer Kaffee Kakao Tee Wasser Wolke Regen Schnee Nebel Wind Sturm Sonne Mond Stern Himmel Berg Tal " +
	"Wiese Wald Feld Fluss Bach See Ufer Insel Hafen Strand Sand Stein Felsen Kiesel Garten Hecke Blume Rose Tulpe Linde Eiche " +
	"Buche Birke Tanne Fichte Ahorn Wurzel Blatt Zweig Rinde Hund Katze Pferd Esel Ziege Schaf Hase Igel Fuchs Dachs Otter " +
	"Biber Adler Falke Amsel Fink Meise Rabe Storch Taube Karpfen Forelle Hecht Biene Hummel Tisch Stuhl Bank Lampe Kerze " +
	"Fenster Treppe Dach Keller Mauer Balken Hammer Zange Nagel Leiter Eimer Besen Kanne Tasse Teller Gabel Messer Schale " +
	"Koffer Mantel Jacke Schal Hut Schuh Knopf Faden Nadel Papier Tinte Feder Pinsel Kreide Karte Brief Buch Seite Glocke " +
	"Trommel Geige Harfe Orgel Anker Segel Ruder Kompass Fernrohr Laterne").split(" ");

const zufall = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const hexZufall = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
const passwortZiehen = () => `${WOERTER[zufall(WOERTER.length)]} ${WOERTER[zufall(WOERTER.length)]} ${WOERTER[zufall(WOERTER.length)]} ${10 + zufall(90)}`;
const jetzt = () => new Date().toISOString();
const datum = (iso) => { try { return iso ? new Date(iso).toLocaleDateString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" }) : "noch nie"; } catch { return "?"; } };

const schluessel = (env) => String(env.AKTE_PFAD || "") + ":" + String(env.BACKSTAGE_VERWALTUNG || "");
async function cookieZeile(env, url) {
	const ablauf = Date.now() + V_STUNDEN * 3600 * 1000;
	return `${V_COOKIE}=${ablauf}.${await hmac(schluessel(env), "verwaltung:" + ablauf)}; Path=/backstage/verwaltung; Max-Age=${V_STUNDEN * 3600}; HttpOnly; SameSite=Strict${url.protocol === "https:" ? "; Secure" : ""}`;
}
async function drin(request, env) {
	for (const teil of (request.headers.get("Cookie") || "").split(";")) {
		const i = teil.indexOf("=");
		if (i > 0 && teil.slice(0, i).trim() === V_COOKIE) {
			const [ablauf, summe] = teil.slice(i + 1).trim().split(".");
			return !!(summe && /^\d+$/.test(ablauf) && Number(ablauf) > Date.now() && await gleich(summe, await hmac(schluessel(env), "verwaltung:" + ablauf)));
		}
	}
	return false;
}

// Clips aus dem Eingabefeld: je Zeile eine Kennung (32 Zeichen, auch mitten in einer eingefügten Adresse) und nach „|“ der Titel.
function clipsLesen(text) {
	const clips = [], fehler = [];
	for (const zeile of String(text || "").split("\n").map((z) => z.trim()).filter(Boolean)) {
		const i = zeile.indexOf("|");
		const kennung = (i < 0 ? zeile : zeile.slice(0, i)).match(/[0-9a-f]{32}/i);
		if (!kennung) { fehler.push(zeile); continue; }
		clips.push({ stream: kennung[0].toLowerCase(), titel: i < 0 ? "" : zeile.slice(i + 1).trim() });
	}
	return { clips, fehler };
}
const clipsZeigen = (json) => { try { return JSON.parse(json || "[]").map((c) => c.stream + (c.titel ? " | " + c.titel : "")).join("\n"); } catch { return ""; } };

const STIL = `@font-face{font-family:"Geist";src:url("/fonts/frei/Geist-Variable.woff2") format("woff2");font-weight:100 900;font-display:swap}
*{box-sizing:border-box}body{margin:0;background:#000;color:#fff;font-family:"Geist",-apple-system,"Helvetica Neue",Arial,sans-serif;font-size:17px;line-height:1.4;letter-spacing:-0.01em;padding:20px 16px 80px}
main{max-width:720px;margin:0 auto}h1{font-size:26px;line-height:1.1;margin:0 0 4px}h2{font-size:19px;margin:36px 0 10px}a{color:#fff}
.kopf{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:24px}.klein{font-size:14px;opacity:.7}
label{display:block;margin:16px 0 5px;font-weight:600}.hilfe{font-size:14px;opacity:.7;margin:4px 0 0}
input[type=text],input[type=password],textarea{display:block;width:100%;font:inherit;color:#fff;background:#000;border:1px solid #fff;border-radius:0;padding:.6em .7em}
textarea{min-height:7em;resize:vertical}input[readonly]{background:#161616}
button,.knopf{display:inline-block;font:inherit;font-weight:600;color:#000;background:#fff;border:1px solid #fff;border-radius:0;padding:.6em 1em;cursor:pointer;text-decoration:none;margin:14px 8px 0 0}
button.leise,.knopf.leise{color:#fff;background:#000}button.rot{background:#000;color:#ff6b6b;border-color:#ff6b6b}
:focus-visible{outline:2px solid #fff;outline-offset:3px}
.liste{list-style:none;margin:0;padding:0;border-top:1px solid #444}.liste li{border-bottom:1px solid #444;padding:12px 0;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
.liste a{font-weight:600;text-decoration:none}.marke{font-size:13px;border:1px solid #ff6b6b;color:#ff6b6b;padding:1px 6px;margin-left:8px}
.kasten{border:1px solid #fff;padding:16px;margin:20px 0}.meldung{border:1px solid #fff;padding:12px 16px;margin:0 0 20px}.fehler{border-color:#ff6b6b;color:#ff6b6b}
.zeile{display:flex;gap:8px;align-items:stretch}.zeile input{flex:1}.zeile button{margin:0}form.neben{display:inline}hr{border:0;border-top:1px solid #444;margin:32px 0}`;

function seite(titel, inhalt, status = 200, kopf = {}) {
	const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${sicher(titel)} · Backstage</title><link rel="icon" type="image/svg+xml" href="/favicon.svg"><style>${STIL}</style></head><body><main>${inhalt}</main>
<script>document.addEventListener("click",function(e){var k=e.target.closest("[data-kopieren]");if(!k)return;var f=document.getElementById(k.dataset.kopieren);if(!f)return;navigator.clipboard.writeText(f.value).then(function(){k.textContent="Kopiert"});});</script></body></html>`;
	const h = new Headers({ "Content-Type": "text/html; charset=utf-8", ...BS_KOPF });
	for (const [n, w] of Object.entries(kopf)) h.append(n, w);
	return new Response(html, { status, headers: h });
}
const kopfzeile = (unter) => `<div class="kopf"><div><h1>Backstage · Verwaltung</h1><div class="klein">${unter}</div></div><form method="post" action="${PFAD}"><input type="hidden" name="aktion" value="abmelden"><button class="leise" style="margin:0">Logout</button></form></div>`;
const meldungHtml = (m) => (m ? `<p class="meldung${m.fehler ? " fehler" : ""}" role="${m.fehler ? "alert" : "status"}">${sicher(m.text)}</p>` : "");

function anmeldeSeite(fehler = "", status = 200) {
	return seite("Verwaltung", `<h1>Backstage · Verwaltung</h1><form method="post" action="${PFAD}"><input type="hidden" name="aktion" value="anmelden">
<label for="p">Passwort</label><input id="p" name="passwort" type="password" required autofocus autocomplete="current-password">
<button>Öffnen</button></form>${fehler ? `<p class="meldung fehler" role="alert" style="margin-top:20px">${sicher(fehler)}</p>` : ""}`, status);
}

async function listenSeite(env, meldung) {
	const { results } = await env.DB.prepare("SELECT adresse, name, gesperrt, zuletzt_angemeldet, notiz FROM bereich ORDER BY angelegt DESC").all();
	const zeilen = (results || []).map((b) => `<li><span><a href="${PFAD}?b=${sicher(b.adresse)}">${sicher(b.adresse)}</a>${b.gesperrt ? '<span class="marke">gesperrt</span>' : ""}<br><span class="klein">${sicher(b.name || b.notiz || "")}</span></span><span class="klein">zuletzt angemeldet: ${sicher(datum(b.zuletzt_angemeldet))}</span></li>`).join("");
	return seite("Verwaltung", `${kopfzeile(`${(results || []).length} Bereich(e)`)}${meldungHtml(meldung)}
<a class="knopf" href="${PFAD}?neu=1" style="margin-top:0">Neuer Bereich</a><a class="knopf leise" href="${PFAD}sicherung.json" style="margin-top:0">Alles herunterladen</a>
<h2>Bereiche</h2><ul class="liste">${zeilen || '<li class="klein">Noch keiner.</li>'}</ul>`);
}

function felder(b, neu) {
	const w = (n) => sicher(b?.[n] ?? "");
	return `${neu ? `<label for="adresse">Adresse</label><input id="adresse" name="adresse" type="text" required value="${w("adresse")}" autocapitalize="none" autocorrect="off" spellcheck="false"><p class="hilfe">Wird zu parleyfilm.com/backstage/… und ist zugleich der Benutzername. Kleinbuchstaben, Ziffern, Bindestriche. Später nicht änderbar.</p>` : `<input type="hidden" name="adresse" value="${w("adresse")}">`}
<label for="name">Name</label><input id="name" name="name" type="text" value="${w("name")}"><p class="hilfe">Steht klein unter der Überschrift, zum Beispiel die Firma. Darf leer bleiben.</p>
<label for="titel">Überschrift</label><textarea id="titel" name="titel" style="min-height:4.2em">${w("titel")}</textarea><p class="hilfe">Leer = „Backstage“. Eine neue Zeile setzt einen festen Umbruch mit Trennstrich („Studio“ / „tour“ wird „Studio-“ / „tour“).</p>
<label for="text">Text</label><textarea id="text" name="text">${w("text")}</textarea><p class="hilfe">Eine Leerzeile trennt Absätze.</p>
<label for="clips">Clips</label><textarea id="clips" name="clips" spellcheck="false">${sicher(neu && !b?.clips ? "" : clipsZeigen(b?.clips))}</textarea><p class="hilfe">Je Zeile ein Clip: Kennung aus Cloudflare Stream, dann | und der Titel. Nur freigegebene Clips: Wer die Kennung kennt, sieht den Clip auch ohne Anmeldung.</p>
<label for="schritt">Nächster Schritt</label><textarea id="schritt" name="schritt" style="min-height:4.2em">${w("schritt")}</textarea><p class="hilfe">Leer = der Abschnitt entfällt.</p>
<label for="knopf">Knopf: Aufschrift und Ziel</label><div class="zeile"><input id="knopf" name="knopf" type="text" value="${w("knopf")}" placeholder="Termin finden"><input name="knopf_ziel" type="text" value="${w("knopf_ziel")}" placeholder="/termin" aria-label="Ziel des Knopfs"></div>
<label for="notiz">Notiz, nur für dich</label><input id="notiz" name="notiz" type="text" value="${w("notiz")}"><p class="hilfe">Für wen, wozu. Erscheint nirgends auf der Website.</p>`;
}

function neuSeite(b, meldung) {
	return seite("Neuer Bereich", `${kopfzeile(`<a href="${PFAD}">zur Liste</a>`)}${meldungHtml(meldung)}<h2 style="margin-top:0">Neuer Bereich</h2>
<form method="post" action="${PFAD}"><input type="hidden" name="aktion" value="anlegen">${felder(b, true)}<button>Anlegen und Passwort ziehen</button></form>`, meldung?.fehler ? 400 : 200);
}

function bereichSeite(b, meldung, zugang) {
	const a = sicher(b.adresse);
	const klein = (aktion, text, klasse = "leise", extra = "") => `<form class="neben" method="post" action="${PFAD}"><input type="hidden" name="aktion" value="${aktion}"><input type="hidden" name="adresse" value="${a}">${extra}<button class="${klasse}">${text}</button></form>`;
	return seite(b.adresse, `${kopfzeile(`<a href="${PFAD}">zur Liste</a>`)}${meldungHtml(meldung)}${zugang || ""}
<h2 style="margin-top:0">${a}${b.gesperrt ? '<span class="marke">gesperrt</span>' : ""}</h2>
<p class="klein">parleyfilm.com/backstage/${a} · angelegt ${sicher(datum(b.angelegt))} · geändert ${sicher(datum(b.geaendert))} · zuletzt angemeldet: ${sicher(datum(b.zuletzt_angemeldet))}</p>
<a class="knopf leise" href="${PFAD}ansehen/${a}/" target="_blank" rel="noopener">Ansehen wie ein Gast</a>
<form method="post" action="${PFAD}"><input type="hidden" name="aktion" value="aendern">${felder(b, false)}<button>Speichern</button></form>
<hr><h2>Zugang</h2>
${klein(b.gesperrt ? "entsperren" : "sperren", b.gesperrt ? "Entsperren" : "Sperren")}${klein("passwort-ziehen", "Neues Passwort ziehen")}
<p class="hilfe">Sperren und ein neues Passwort melden alle sofort ab, die gerade angemeldet sind.</p>
<form method="post" action="${PFAD}"><input type="hidden" name="aktion" value="passwort-setzen"><input type="hidden" name="adresse" value="${a}">
<label for="eigenes">Eigenes Passwort setzen</label><div class="zeile"><input id="eigenes" name="passwort" type="text" required autocomplete="off" autocapitalize="none" spellcheck="false"><button class="leise">Setzen</button></div><p class="hilfe">Nur, wenn ein Gast sein bisheriges Passwort behalten soll. Mindestens 10 Zeichen ohne Leerzeichen und Bindestriche.</p></form>
<hr><h2>Löschen</h2><form method="post" action="${PFAD}"><input type="hidden" name="aktion" value="loeschen"><input type="hidden" name="adresse" value="${a}">
<label style="font-weight:400"><input type="checkbox" name="sicher" value="ja" required> Ja, diesen Bereich endgültig löschen. Das lässt sich nicht zurückholen.</label><button class="rot">Löschen</button></form>`, meldung?.fehler ? 400 : 200);
}

// Der Kasten mit dem Zugang, GENAU EINMAL in der Antwort auf das Absenden.
const zugangKasten = (adresse, passwort) => `<div class="kasten"><strong>Zugang, wird nur jetzt gezeigt</strong>
<label for="z1">Adresse</label><div class="zeile"><input id="z1" type="text" readonly value="parleyfilm.com/backstage/${sicher(adresse)}"><button type="button" class="leise" data-kopieren="z1">Kopieren</button></div>
<label for="z2">Benutzername</label><div class="zeile"><input id="z2" type="text" readonly value="${sicher(adresse)}"><button type="button" class="leise" data-kopieren="z2">Kopieren</button></div>
<label for="z3">Passwort</label><div class="zeile"><input id="z3" type="text" readonly value="${sicher(passwort)}"><button type="button" class="leise" data-kopieren="z3">Kopieren</button></div>
<p class="hilfe">Groß und klein, Leerzeichen und Bindestriche sind beim Eintippen egal. Nach dem Verlassen dieser Seite ist das Passwort nicht mehr abrufbar, dann hilft nur ein neues.</p></div>`;

const text = (f, n, max) => String(f.get(n) ?? "").replace(/\r\n/g, "\n").trim().slice(0, max);
function eingaben(f) {
	const { clips, fehler } = clipsLesen(text(f, "clips", 6000));
	return { werte: { adresse: text(f, "adresse", 60).toLowerCase(), name: text(f, "name", 120), titel: text(f, "titel", 120), text: text(f, "text", 6000), clips: JSON.stringify(clips), schritt: text(f, "schritt", 600), knopf: text(f, "knopf", 60), knopf_ziel: text(f, "knopf_ziel", 300), notiz: text(f, "notiz", 300) }, clipFehler: fehler };
}

export async function verwaltung({ request, env, url, teile, huelleHolen }) {
	const methode = request.method;
	const zu = () => new Response("Die Verwaltung ist nicht eingerichtet.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8", ...BS_KOPF } });
	if (!env.DB || !env.AKTE_PFAD || String(env.BACKSTAGE_VERWALTUNG || "").length < 16) return zu();
	if (!["GET", "HEAD", "POST"].includes(methode)) return new Response(null, { status: 405, headers: BS_KOPF });
	const unter = teile.slice(1);
	if (url.pathname === "/backstage/verwaltung") return new Response(null, { status: 308, headers: { Location: PFAD, ...BS_KOPF } });
	const angemeldet = await drin(request, env);

	if (methode === "POST") {
		// Nur Absenden von dieser Website selbst (Schutz gegen fremde Seiten, die ein Formular hierher schicken).
		if (request.headers.get("Origin") !== url.origin) return new Response("Abgelehnt.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8", ...BS_KOPF } });
		const f = await request.formData().catch(() => new FormData());
		const aktion = String(f.get("aktion") || "");
		if (aktion === "anmelden") {
			const start = Date.now();
			if (await gleich(String(f.get("passwort") ?? ""), String(env.BACKSTAGE_VERWALTUNG))) return new Response(null, { status: 303, headers: { Location: PFAD, "Set-Cookie": await cookieZeile(env, url), ...BS_KOPF } });
			await new Promise((fertig) => setTimeout(fertig, Math.max(0, 1000 - (Date.now() - start))));
			return anmeldeSeite("Das Passwort stimmt nicht.", 401);
		}
		if (aktion === "abmelden") return new Response(null, { status: 303, headers: { Location: PFAD, "Set-Cookie": `${V_COOKIE}=; Path=/backstage/verwaltung; Max-Age=0; HttpOnly; SameSite=Strict${url.protocol === "https:" ? "; Secure" : ""}`, ...BS_KOPF } });
		if (!angemeldet) return anmeldeSeite("Bitte erst anmelden.", 401);

		const { werte, clipFehler } = eingaben(f);
		const clipText = clipFehler.length ? `Diese Clip-Zeilen enthalten keine Kennung mit 32 Zeichen: ${clipFehler.join(" · ")}` : "";
		if (aktion === "anlegen") {
			let fehler = clipText;
			if (!fehler && !adresseGueltig(werte.adresse)) fehler = "Die Adresse geht so nicht: nur Kleinbuchstaben, Ziffern und einzelne Bindestriche, und kein vergebener Name wie „verwaltung“.";
			if (!fehler && await bereich(env, werte.adresse)) fehler = `Die Adresse „${werte.adresse}“ gibt es schon.`;
			if (fehler) return neuSeite({ ...werte, clips: JSON.stringify(clipsLesen(text(f, "clips", 6000)).clips) }, { text: fehler, fehler: true });
			const passwort = passwortZiehen(), salz = hexZufall(16), z = jetzt();
			await env.DB.prepare("INSERT INTO bereich (adresse, name, titel, text, clips, schritt, knopf, knopf_ziel, salz, pw_summe, angelegt, geaendert, notiz) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11, ?12)")
				.bind(werte.adresse, werte.name, werte.titel, werte.text, werte.clips, werte.schritt, werte.knopf, werte.knopf_ziel, salz, await pwSumme(glatt(passwort), salz), z, werte.notiz).run();
			return bereichSeite(await bereich(env, werte.adresse), { text: "Der Bereich ist angelegt." }, zugangKasten(werte.adresse, passwort));
		}
		const b = await bereich(env, werte.adresse);
		if (!b) return listenSeite(env, { text: "Diesen Bereich gibt es nicht (mehr).", fehler: true });
		if (aktion === "aendern") {
			if (clipText) return bereichSeite({ ...b, ...werte, clips: b.clips }, { text: clipText + " Nichts gespeichert.", fehler: true });
			await env.DB.prepare("UPDATE bereich SET name = ?2, titel = ?3, text = ?4, clips = ?5, schritt = ?6, knopf = ?7, knopf_ziel = ?8, notiz = ?9, geaendert = ?10 WHERE adresse = ?1")
				.bind(b.adresse, werte.name, werte.titel, werte.text, werte.clips, werte.schritt, werte.knopf, werte.knopf_ziel, werte.notiz, jetzt()).run();
			return bereichSeite(await bereich(env, b.adresse), { text: "Gespeichert." });
		}
		if (aktion === "sperren" || aktion === "entsperren") {
			await env.DB.prepare("UPDATE bereich SET gesperrt = ?2, geaendert = ?3 WHERE adresse = ?1").bind(b.adresse, aktion === "sperren" ? 1 : 0, jetzt()).run();
			return bereichSeite(await bereich(env, b.adresse), { text: aktion === "sperren" ? "Gesperrt. Niemand kommt mehr hinein, auch nicht mit dem richtigen Passwort." : "Entsperrt." });
		}
		if (aktion === "passwort-ziehen" || aktion === "passwort-setzen") {
			const passwort = aktion === "passwort-ziehen" ? passwortZiehen() : String(f.get("passwort") ?? "").trim();
			if (glatt(passwort).length < 10) return bereichSeite(b, { text: "Das Passwort ist zu kurz: mindestens 10 Zeichen ohne Leerzeichen und Bindestriche. Nichts geändert.", fehler: true });
			const salz = hexZufall(16);
			await env.DB.prepare("UPDATE bereich SET salz = ?2, pw_summe = ?3, geaendert = ?4 WHERE adresse = ?1").bind(b.adresse, salz, await pwSumme(glatt(passwort), salz), jetzt()).run();
			return bereichSeite(await bereich(env, b.adresse), { text: "Das Passwort ist neu. Wer angemeldet war, muss sich neu anmelden." }, zugangKasten(b.adresse, passwort));
		}
		if (aktion === "loeschen") {
			if (f.get("sicher") !== "ja") return bereichSeite(b, { text: "Zum Löschen bitte das Häkchen setzen. Nichts gelöscht.", fehler: true });
			await env.DB.prepare("DELETE FROM bereich WHERE adresse = ?1").bind(b.adresse).run();
			return listenSeite(env, { text: `Der Bereich „${b.adresse}“ ist gelöscht.` });
		}
		return listenSeite(env, { text: "Unbekannte Aktion.", fehler: true });
	}

	if (!angemeldet) return anmeldeSeite();
	// Ansehen wie ein Gast: die echte Seite, gefüllt aus der Datenbank, ohne Gast-Cookie. Zählt nicht als Anmeldung.
	if (unter[0] === "ansehen") {
		const b = await bereich(env, unter[1] || "");
		const huelle = b ? await huelleHolen(b.adresse) : null;
		if (!huelle) return listenSeite(env, { text: "Dieser Bereich lässt sich gerade nicht anzeigen.", fehler: true });
		return new Response(fuellen(huelle, b), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...BS_KOPF } });
	}
	// Alles herunterladen: ohne Salz, Prüfsummen und Link-Schlüssel.
	if (unter[0] === "sicherung.json") {
		const { results } = await env.DB.prepare("SELECT adresse, name, titel, text, clips, schritt, knopf, knopf_ziel, gesperrt, angelegt, geaendert, zuletzt_angemeldet, notiz, mail FROM bereich ORDER BY adresse").all();
		const daten = { stand: jetzt(), hinweis: "Backstage-Bereiche ohne Passwörter. Enthält Kundennamen.", bereiche: (results || []).map((b) => ({ ...b, clips: (() => { try { return JSON.parse(b.clips); } catch { return []; } })() })) };
		return new Response(JSON.stringify(daten, null, "\t") + "\n", { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="backstage-sicherung-${jetzt().slice(0, 10)}.json"`, ...BS_KOPF } });
	}
	if (unter.length && unter[0] !== "" && unter[0] !== "index.html") return new Response(null, { status: 303, headers: { Location: PFAD, ...BS_KOPF } });
	if (url.searchParams.has("neu")) return neuSeite(null);
	if (url.searchParams.has("b")) {
		const b = await bereich(env, url.searchParams.get("b") || "");
		return b ? bereichSeite(b) : listenSeite(env, { text: "Diesen Bereich gibt es nicht.", fehler: true });
	}
	return listenSeite(env);
}
