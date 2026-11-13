/* Gemeinsame Daten der Startseite und der Unterseiten (13.11.2026: Abschnitte als eigene Bausteine, damit
   Startseite und Unterseiten dieselben Teile benutzen; Rasul: „mach's mal als Variante zum Ausprobieren“). */
// Sprechblasen zum Rohschnitt „Szene Beweisaufnahme“ v1 (Rasul 13.11.2026). Sätze aus
// website/video/Szene_Beweisaufnahme_Clipvorschlag_2026-11.md, Schnitte bei 4,5 · 9 · 18 · 24 s.
export const BLASEN = [
	{ an: 0.4, aus: 4.4, stelle: "OR", text: "Es fühlt sich so natürlich an, hier zu sitzen." },
	{ an: 4.9, aus: 8.9, stelle: "OL", text: "Die gesamte Angst vor Kamera ist null." },
	{ an: 9.4, aus: 17.9, stelle: "OR", text: "… dass ich dir direkt in die Augen schaue und gleichzeitig der Zuschauer meinen Augenkontakt hat." },
	{ an: 18.4, aus: 23.9, stelle: "OL", text: "Er sitzt hier zwei Meter von mir weg in einem Display in Lebensgröße." },
	{ an: 24.3, aus: 26.6, stelle: "OL", text: "Wir können es sehr empfehlen, oder?" },
	{ an: 26.7, aus: 28.2, stelle: "OR", text: "Total." },
] as const;

export const FORMATE = [
	{ buchstabe: "A", name: "Videopodcast", form: "169", art: "video", text: "Das ganze Gespräch, so wie es war. Für alle, die euch länger zuhören wollen." },
	{ buchstabe: "B", name: "Audio-Podcast", form: "11", art: "audio", text: "Dieselbe Folge zum Hören, unterwegs oder beim Laufen." },
	{ buchstabe: "C", name: "Clip", form: "916", art: "video", text: "Eine Frage, eine Antwort. Kurz genug für den Feed, lang genug, um zu zeigen, wie ihr denkt." },
	{ buchstabe: "D", name: "Zitat", form: "11", art: "zitat", text: "Ein Satz, der hängen bleibt. Zum Teilen und Zitieren." },
	{ buchstabe: "E", name: "Newsletter", form: "45", art: "newsletter", text: "Die Folge zum Lesen, direkt im Postfach eurer Kunden." },
	{ buchstabe: "F", name: "Transkript", form: "45", art: "transkript", text: "Jedes Wort zum Nachlesen, damit euch Suchmaschinen und KI-Assistenten finden." },
];
