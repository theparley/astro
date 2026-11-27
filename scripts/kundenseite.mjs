#!/usr/bin/env node
/* KUNDENSEITE ANLEGEN, DER KURZE WEG (27.11.2026).
   Anlass: Rasul in der Sitzung „Tobias Neubauer“: „das wird natürlich ein bisschen umständlich jedes Mal, da so ins
   Detail gehen zu müssen, wenn wir für jemanden Neues da so einen Bereich anlegen.“ Bis dahin musste jede Sitzung
   functions/_middleware.js, die Vorlage und astro.config.mjs lesen und den Namen des Werts selbst ausrechnen.

   Aufruf (im Ordner the-parley-astro):
     npm run kundenseite -- neu neubauer "Neubauer Immobilien"
         legt src/daten/kundenseiten/neubauer.md aus der Vorlage an, zieht ein Passwort und trägt es in .dev.vars ein.
         Zusatz --titel "Studio-<br>tour" setzt die Überschrift, --offen legt eine Seite ohne Passwort an.
     npm run kundenseite -- kopieren neubauer
         legt das lokale Passwort in die Zwischenablage (für Cloudflare oder für die Mail an den Kunden).
     npm run kundenseite -- passwort neubauer
         zieht ein Passwort für eine Seite, die es schon gibt, wenn lokal noch keins hinterlegt ist.
     npm run kundenseite -- liste
         zeigt alle Kundenseiten und ob lokal ein Passwort hinterlegt ist.

   DAS PASSWORT WIRD NIE AUSGEGEBEN, nur in .dev.vars geschrieben (steht in .gitignore) und auf Wunsch in die
   Zwischenablage gelegt. Grund: Was ein Skript ausgibt, steht danach im Gesprächsverlauf einer Sitzung.
   Bei Cloudflare trägt Rasul den Wert selbst ein. Hochladen auf dev und live gibt nur Rasul in der Sitzung
   „Website · Programmierung“ frei.

   Die Regeln für Adresse und Wertnamen stehen hier ein zweites Mal; maßgeblich sind src/pages/[kunde].astro
   (Adresse, gesperrte Namen) und functions/_middleware.js (Wertname, Vergleich des Passworts). Wer dort etwas
   ändert, ändert es auch hier.
   Weg zurück: diese Datei und die Zeile „kundenseite“ in package.json löschen. Nichts auf der Website hängt daran. */
import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ordner = path.join(wurzel, "src/daten/kundenseiten");
const varsDatei = path.join(wurzel, ".dev.vars");

// Wie in src/pages/[kunde].astro: jede vorhandene Seite und diese festen Namen sind als Adresse gesperrt.
const FEST = ["login", "api", "filme", "fonts", "lab", "lokal", "parley", "test", "werkzeug", "index", "404"];
const belegt = () => readdirSync(path.join(wurzel, "src/pages")).map((d) => d.replace(/\.(astro|ts|md)$/, "").replace(/\.(txt|xml)$/, ""));
const wertName = (slug) => "AKTE_" + slug.toUpperCase().replace(/-/g, "_"); // wie sollPasswort in _middleware.js

// Kurze, eindeutig zu sprechende Wörter ohne Umlaute und ß. Drei davon und eine Zahl: rund 200 Millionen
// Möglichkeiten. Groß und klein, Leerzeichen und Bindestriche zählen beim Vergleich nicht (glatt in _middleware.js).
const WOERTER = ("Apfel Birne Kirsche Pflaume Zitrone Traube Melone Feige Mandel Walnuss Hafer Weizen Roggen Gerste Brot Butter " +
	"Honig Zucker Salz Pfeffer Kaffee Kakao Tee Wasser Wolke Regen Schnee Nebel Wind Sturm Sonne Mond Stern Himmel Berg Tal " +
	"Wiese Wald Feld Fluss Bach See Ufer Insel Hafen Strand Sand Stein Felsen Kiesel Garten Hecke Blume Rose Tulpe Linde Eiche " +
	"Buche Birke Tanne Fichte Ahorn Wurzel Blatt Zweig Rinde Hund Katze Pferd Esel Ziege Schaf Hase Igel Fuchs Dachs Otter " +
	"Biber Adler Falke Amsel Fink Meise Rabe Storch Taube Karpfen Forelle Hecht Biene Hummel Tisch Stuhl Bank Lampe Kerze " +
	"Fenster Treppe Dach Keller Mauer Balken Hammer Zange Nagel Leiter Eimer Besen Kanne Tasse Teller Gabel Messer Schale " +
	"Koffer Mantel Jacke Schal Hut Schuh Knopf Faden Nadel Papier Tinte Feder Pinsel Kreide Karte Brief Buch Seite Glocke " +
	"Trommel Geige Harfe Orgel Anker Segel Ruder Kompass Fernrohr Laterne").split(" ");

const ende = (text) => { console.error("\n" + text + "\n"); process.exit(1); };
const slugPruefen = (slug) => {
	if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug || "")) ende(`„${slug ?? ""}“ geht nicht als Adresse. Erlaubt: Kleinbuchstaben, Ziffern und einzelne Bindestriche, zum Beispiel hug-ka.`);
	return slug;
};
const varsLesen = () => (existsSync(varsDatei) ? readFileSync(varsDatei, "utf8") : "");
const lokalerWert = (slug) => {
	const zeile = varsLesen().split("\n").find((z) => z.startsWith(wertName(slug) + "="));
	return zeile ? zeile.slice(wertName(slug).length + 1).trim() : "";
};
const seiten = () => readdirSync(ordner).filter((d) => d.endsWith(".md") && !d.startsWith("_")).map((d) => d.slice(0, -3)).sort();
const heute = () => new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function passwortZiehen(slug) {
	const wort = () => WOERTER[randomInt(WOERTER.length)];
	const passwort = `${wort()} ${wort()} ${wort()} ${randomInt(10, 100)}`;
	const vor = varsLesen();
	appendFileSync(varsDatei, (vor && !vor.endsWith("\n") ? "\n" : "") +
		`# Passwort fuer die Kundenseite /${slug} (${heute()}, angelegt mit npm run kundenseite). Drei Woerter und eine Zahl, zufaellig gezogen. Benutzername: ${slug}. Bei Cloudflare traegt Rasul den Wert selbst ein.\n` +
		`${wertName(slug)}=${passwort}\n`, "utf8");
}

// Für eine Seite, die es schon gibt, der aber lokal das Passwort fehlt. Überschreibt nie einen vorhandenen Wert.
function passwort(args) {
	const slug = slugPruefen(args[0]);
	if (!seiten().includes(slug)) ende(`Es gibt keine Kundenseite /${slug}.`);
	if (lokalerWert(slug)) ende(`In .dev.vars steht schon ein Wert ${wertName(slug)}. Nichts geändert.\nWer ein neues Passwort will, löscht dort erst die Zeile und trägt das neue danach auch bei Cloudflare ein.`);
	passwortZiehen(slug);
	console.log(`\nPasswort für /${slug} gezogen und in .dev.vars eingetragen als ${wertName(slug)} (wird hier nicht angezeigt).\nIn die Zwischenablage: npm run kundenseite -- kopieren ${slug}\n`);
}

function neu(args) {
	const frei = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--titel");
	const slug = slugPruefen(frei[0]);
	const name = frei[1];
	const offen = args.includes("--offen");
	const titel = args.includes("--titel") ? args[args.indexOf("--titel") + 1] : "";
	if (!name) ende(`Es fehlt der Name, der klein unter der Überschrift steht.\nBeispiel: npm run kundenseite -- neu ${slug} "Neubauer Immobilien"`);
	if (FEST.includes(slug) || belegt().includes(slug)) ende(`Die Adresse /${slug} ist auf der Website schon belegt.`);
	const datei = path.join(ordner, slug + ".md");
	if (existsSync(datei)) ende(`src/daten/kundenseiten/${slug}.md gibt es schon. Nichts geändert.\nPasswort in die Zwischenablage: npm run kundenseite -- kopieren ${slug}`);
	if (!offen && lokalerWert(slug)) ende(`In .dev.vars steht schon ein Wert ${wertName(slug)}, aber die Seite fehlt. Bitte erst klären, nichts geändert.`);

	// Inhalt: die Vorlage mit ihren Erklärungen, darüber ein Kopf mit Anlass, darin Name, Titel und Passwort-Angabe.
	let text = readFileSync(path.join(ordner, "_vorlage.md"), "utf8");
	const zitat = (s) => JSON.stringify(s);
	const ersetze = (alt, neuText) => { if (!text.includes(alt)) ende(`Die Vorlage hat sich geändert (Zeile „${alt}“ fehlt). Bitte scripts/kundenseite.mjs anpassen.`); text = text.replace(alt, neuText); };
	ersetze("# VORLAGE FÜR EINE KUNDENSEITE. Diese Datei wird keine Seite (Dateien mit _ am Anfang zählen nicht).",
		`# KUNDENSEITE ${name.toUpperCase()}, angelegt am ${heute()} mit „npm run kundenseite“.\n# ANLASS: (hier eintragen: wer, wozu, Rasuls Wortlaut mit Datum)\n# BENUTZERNAME: ${slug}.` +
		(offen ? " OHNE PASSWORT." : ` PASSWORT: Wert ${wertName(slug)} bei Cloudflare, lokal in .dev.vars, nie in dieser Datei.`) +
		"\n#\n# Aus der Vorlage (_vorlage.md), die Erklärungen stehen bei den Angaben:");
	ersetze("kunde: Name des Kunden", (titel ? `titel: ${zitat(titel)}\n` : "# titel: Studiotour\n") + `kunde: ${zitat(name)}`);
	if (offen) ersetze("passwort: ja", "passwort: nein");
	writeFileSync(datei, text, "utf8");

	if (!offen) passwortZiehen(slug);

	console.log(`
Angelegt: src/daten/kundenseiten/${slug}.md${offen ? "" : `\nPasswort gezogen und in .dev.vars eingetragen als ${wertName(slug)} (wird hier nicht angezeigt).`}

Was jetzt noch zu tun ist:
 1. Die Datei öffnen: Anlass eintragen, Videos (Kennung aus Cloudflare Stream) und den Text unten schreiben.
    Ohne nächsten Schritt: die drei Zeilen naechster_schritt, knopf, knopf_ziel löschen.
 2. Ansehen ohne Anmeldung: http://localhost:4321/${slug}/ (Dev-Server).
    Die Anmeldung selbst gibt es nur im Nachbau der Sitzung „Website · Programmierung“.
${offen ? "" : ` 3. Rasul trägt das Passwort bei Cloudflare ein: Workers & Pages, the-parley, Einstellungen, Variablen und
    Geheimnisse, Name ${wertName(slug)}, als Geheimnis, einmal für „Production“ und einmal für „Preview“.
    Den Wert holt er sich mit:   npm run kundenseite -- kopieren ${slug}
`} ${offen ? 3 : 4}. Hochladen auf dev und live: nur auf Rasuls Wort in der Sitzung „Website · Programmierung“.
    Der Zugang für den Kunden: parleyfilm.com/${slug}, Benutzername ${slug}${offen ? "" : ", Passwort wie eingetragen"}.
`);
}

function kopieren(args) {
	const slug = slugPruefen(args[0]);
	const wert = lokalerWert(slug);
	if (!wert) ende(`In .dev.vars steht kein Wert ${wertName(slug)}.`);
	try { execFileSync("pbcopy", { input: wert }); } catch { ende("Die Zwischenablage ließ sich nicht füllen (pbcopy fehlt)."); }
	console.log(`\nDas Passwort für /${slug} liegt in der Zwischenablage (${wertName(slug)}). Es wird hier nicht angezeigt.\n`);
}

function liste() {
	console.log("\nKundenseiten (src/daten/kundenseiten):");
	for (const slug of seiten()) {
		const kopf = readFileSync(path.join(ordner, slug + ".md"), "utf8").split(/^---\s*$/m)[1] || "";
		const offen = /^passwort:\s*nein\s*$/m.test(kopf);
		console.log(`  /${slug}`.padEnd(22) + (offen ? "ohne Passwort" : lokalerWert(slug) ? `Passwort lokal hinterlegt (${wertName(slug)})` : `KEIN lokaler Wert ${wertName(slug)}`));
	}
	console.log("\nOb ein Wert bei Cloudflare eingetragen und die Seite auf dev oder live ist, sieht dieses Skript nicht.\n");
}

const [befehl, ...rest] = process.argv.slice(2);
if (befehl === "neu") neu(rest);
else if (befehl === "kopieren") kopieren(rest);
else if (befehl === "liste") liste();
else if (befehl === "passwort") passwort(rest);
else ende(`Aufruf:
  npm run kundenseite -- neu <adresse> "<Name>" [--titel "<Überschrift>"] [--offen]
  npm run kundenseite -- passwort <adresse>     (nur wenn lokal noch keins hinterlegt ist)
  npm run kundenseite -- kopieren <adresse>
  npm run kundenseite -- liste`);
