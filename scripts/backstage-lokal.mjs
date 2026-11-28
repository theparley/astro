#!/usr/bin/env node
/* BACKSTAGE, STUFE B: LOKALE TESTDATENBANK (27.11.2026, Rasul: „Ja, lokal anfangen“).
   Legt die lokale Datenbank nach datenbank/schema.sql an und setzt Testbereiche hinein. Nur Platzhalter, keine
   Kundennamen. Das Testpasswort wird zufällig gezogen, steht nur in .dev.vars (BACKSTAGE_PROBE_PASSWORT, nicht in
   Git) und wird nie ausgegeben. In die Datenbank gehen nur Salz und Prüfsumme, gerechnet wie in
   functions/_lib/backstage.js (pwSumme).
   Aufruf im Ordner des Repositorys:  node scripts/backstage-lokal.mjs
   Danach:  npx astro build && npx wrangler pages dev dist --d1 DB=backstage-lokal --port 4399 --compatibility-date=2026-11-01
   Weg zurück: Ordner .wrangler löschen. */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from "node:fs";
import { pbkdf2Sync, randomBytes, randomInt } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const varsDatei = path.join(wurzel, ".dev.vars");
const glatt = (w) => String(w ?? "").toLowerCase().replace(/[\s\-_.]+/g, "");
const sql = (w) => "'" + String(w).replace(/'/g, "''") + "'";

let vars = existsSync(varsDatei) ? readFileSync(varsDatei, "utf8") : "";
let passwort = (vars.match(/^BACKSTAGE_PROBE_PASSWORT="?([^"\n]+)"?$/m) || [])[1];
if (!passwort) {
	const W = ["Apfel", "Birne", "Wolke", "Regen", "Tanne", "Fuchs", "Lampe", "Anker", "Segel", "Kerze", "Hafen", "Stern", "Feder", "Kanne", "Mauer", "Wiese"];
	passwort = `${W[randomInt(W.length)]} ${W[randomInt(W.length)]} ${W[randomInt(W.length)]} ${randomInt(10, 100)}`;
	appendFileSync(varsDatei, (vars && !vars.endsWith("\n") ? "\n" : "") + "# Testpasswort fuer die lokalen Backstage-Probebereiche (Stufe B, scripts/backstage-lokal.mjs). Gilt nirgends ausser lokal.\nBACKSTAGE_PROBE_PASSWORT=" + passwort + "\n");
}
// Passwort der Verwaltungsseite, nur lokal: lang und zufällig, wie es auch bei Cloudflare sein soll. Wird nie ausgegeben.
vars = existsSync(varsDatei) ? readFileSync(varsDatei, "utf8") : "";
if (!/^BACKSTAGE_VERWALTUNG=/m.test(vars)) appendFileSync(varsDatei, (vars && !vars.endsWith("\n") ? "\n" : "") + "# Passwort der lokalen Backstage-Verwaltung (Stufe B). Gilt nirgends ausser lokal.\nBACKSTAGE_VERWALTUNG=" + randomBytes(24).toString("base64url") + "\n");
const jetzt = new Date().toISOString();
const zeile = (b) => {
	const salz = randomBytes(16).toString("hex");
	const summe = pbkdf2Sync(glatt(passwort), Buffer.from(salz, "hex"), 100000, 32, "sha256").toString("hex");
	return `INSERT OR REPLACE INTO bereich (adresse, name, titel, text, clips, schritt, knopf, knopf_ziel, salz, pw_summe, gesperrt, angelegt, geaendert, notiz) VALUES (${[b.adresse, b.name, b.titel, b.text, JSON.stringify(b.clips), b.schritt || "", b.knopf || "", b.ziel || "", salz, summe].map(sql).join(", ")}, ${b.gesperrt ? 1 : 0}, ${sql(jetzt)}, ${sql(jetzt)}, ${sql(b.notiz || "")});`;
};
const bereiche = [
	{ adresse: "probe-eins", name: "Probe & Söhne GmbH", titel: "Studio\ntour", text: "Erster Absatz mit <b>Zeichen</b>, die als Text erscheinen müssen: \" ' & < >.\n\nZweiter Absatz.\nMit einem Zeilenumbruch.", clips: [{ stream: "a30dd58bbc23d63b8f2744704a66cebd", titel: "Platzhalter-Titel eins" }, { stream: "afe940c897856579527b15f3b98d54bd", titel: "" }, { stream: "kaputt", titel: "darf nicht erscheinen" }], schritt: "Hier steht der nächste Schritt.", knopf: "Termin finden", ziel: "/termin", notiz: "Testbereich mit allem" },
	{ adresse: "probe-zwei", name: "", titel: "", text: "Nur Text, keine Clips, kein nächster Schritt, kein Name, kein Titel.", clips: [], notiz: "Testbereich fast leer" },
	{ adresse: "probe-gesperrt", name: "Gesperrt", titel: "Gesperrt", text: "Darf nie zu sehen sein.", clips: [], gesperrt: true, notiz: "Testbereich gesperrt" },
];
mkdirSync(path.join(wurzel, ".wrangler"), { recursive: true });
const datei = path.join(wurzel, ".wrangler", "backstage-probe.sql");
writeFileSync(datei, readFileSync(path.join(wurzel, "datenbank/schema.sql"), "utf8") + "\n" + bereiche.map(zeile).join("\n") + "\n", "utf8");
execFileSync("npx", ["wrangler", "d1", "execute", "backstage-lokal", "--local", "--config", "datenbank/wrangler.lokal.toml", "--persist-to", ".wrangler/state", "--file", datei, "--yes"], { cwd: wurzel, stdio: ["ignore", "ignore", "inherit"] });
console.log(`Lokale Datenbank angelegt, ${bereiche.length} Testbereiche: ${bereiche.map((b) => b.adresse).join(", ")}. Passwort steht in .dev.vars (wird nicht angezeigt).`);
