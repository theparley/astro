// DIE STUNDE UND IHRE HUNDERT — gemeinsames Modul (21.09.2026).
//
// EINE BASIS FUER WEBSITE UND GIF: Zeiten, Kurven, Kamera und Geometrie der
// Stunden-Kachel stehen hier und NUR hier. MultiOutputKacheln.astro liest
// sie fuer die Website (Web Animations API), /stunden-werkstatt liest sie
// fuer den GIF-Export (Canvas-Painter, Bild fuer Bild). Wer eine Zahl
// aendert, aendert beides — dieselbe Lehre wie bei der GIF-Werkstatt der
// Fallblatt-Tafeln (src/lib/fallblatt.ts).
//
// Zu den Werten selbst: siehe die Kommentare bei ZEIT/KAMERA. Die Geschichte
// der Entscheidungen (Fred, 21.09.) steht in den Commits.

export type Sekunden = number;

export const ZEIT = {
	halt: 0,           // Halt am Anfang (0 = die Stunde zeichnet sofort)
	stunde: 2.16,      // die Stunde zeichnet sich (Rand, Fuellung, Zeiger)
	// Rauszoomen von KAMERA.start auf KAMERA.ende. Zahl in Sekunden oder
	// "letzteUhr" (so lang, bis die letzte Uhr fertig ist). DER EINE REGLER:
	// an der Fahrt haengen Uhrendauer, Beschleunigung und Reinzoomen.
	kameraRaus: 4.32 as number | "letzteUhr",
	kameraVorsprung: 0, // nur bei "letzteUhr": so viele Sekunden steht die Kamera frueher
	kameraAbStunde: 0,  // wann die Kamera losfaehrt, als Anteil der Stunden-Zeichnung
	uhrenAbStunde: 0.5, // wann die erste weisse Uhr anfaengt, als Anteil der Stunde
	uhrenStart: "abStunde" as number | "abStunde",
	// Von der ersten bis zum Ende der letzten Uhr. "mitKamera": die letzte
	// Uhr ist genau fertig, wenn die Kamera steht.
	uhrenDauer: "mitKamera" as number | "mitKamera",
	// Die Rate, mit der Uhren anfangen, waechst jede Sekunde um denselben
	// Prozentsatz (exponentiell in der Zeit).
	ersteDauer: 2.16,   // die erste weisse Uhr so lang wie die Stunde
	naechsteBei: 0.5,   // die naechste Uhr faengt an, wenn die laufende hier ist
	dauerMin: 0.3,      // kuerzeste Dauer einer Uhr
	stand: 2,           // draussen: leichtes Weiter-Rauskriechen (KAMERA.drift); 0 = echter Stopp
	kriechenRein: 2,    // genauso langsam zurueck auf ende, bevor das Reinzoomen anzieht
	// Weisse Uhren + Zeichnung der Stunde blenden waehrend des Reinzoomens
	// aus (Deckkraft). "wieRein" = so lang wie das Reinzoomen, Sekunden =
	// eigene Dauer, 0 = auf einen Schlag. Die Website bleibt weich (Fred
	// 21.09.: „Die Webseite sollst du nicht veraendern"); den harten Schnitt
	// probiert nur die GIF-Werkstatt, die den Wert zur Laufzeit ueberschreibt.
	ausblenden: "wieRein" as number | "wieRein",
	kameraRein: "wieRaus" as number | "wieRaus", // Kamera zurueck, so lang wie das Rauszoomen
	innenStand: 2,      // innen: Kriechen naeher ran (KAMERA.drift ueber start hinaus)
	innenZurueck: 2,    // Kriechen zurueck auf start; die naechste Runde faehrt ohne Stopp weiter
	nachlauf: 0,        // kein Halt bis zur naechsten Runde
};

export const KURVE = [0.65, 0, 0.35, 1];               // weich rein und raus: Stunde, Uhren
export const KURVE_RAUS = [0.65, 0.012, 0.35, 0.976];  // Rauszoomen: weicher Ansatz, Resttempo am Ende
export const KURVE_KRIECH_RAUS = [0, 0, 0.35, 1];      // Kriechen raus: faehrt sofort, laeuft weich aus
export const KURVE_KRIECH_REIN = [0.65, 0, 1, 1];      // Kriechen zurueck: weich an, beschleunigend
export const KURVE_REIN = [0.65, 0.012, 0.35, 0.976];  // Reinzoomen: setzt mit Kriechtempo an, kommt mit Resttempo an
export const KURVE_AUSBLENDEN = [0.4, 0, 0.2, 1];

// ende 1,2: 92 Uhren ganz im Bild, 32-36 angeschnitten, auch waehrend des
// Kriechens (drift 3 %) unter hundert.
export const KAMERA = { start: 7, ende: 1.2, drift: 0.03 };

export const UHR = { r: 34, cx: 500, cy: 625, abstand: 90, ringe: 7 };
export const VIEWBOX = { w: 1000, h: 1250 };
export const BLATT = {
	// schritt: Minuten je Strich. 1 = 60 Striche (56 + Viertel), 5 = zwoelf
	// Striche (8 + Viertel). Website: 1. Die GIF-Werkstatt probiert 5 zur
	// Laufzeit (Fred 21.09.: „reicht das, damit man die Uhr erkennt?").
	minute: { r: UHR.r - 1 - 1.75, laenge: 3.5, breite: 0.9, schritt: 1 },
	// Fuenf-Minuten-Striche als dritte Stufe zwischen Minute und Viertel
	// (Fred 21.09.: „zusaetzlich die 5-Minuten-Striche rein", Website).
	fuenf: { r: UHR.r - 1 - 2.5, laenge: 5, breite: 1.3 },
	viertel: { r: UHR.r - 1 - 3.5, laenge: 7, breite: 1.8 },
	// Die kleinen Uhren tragen nur die vier Viertelstriche (Fred 21.09.:
	// „lassen wir die Minutenstriche weg"). Die Stunde behaelt ihr volles
	// Blatt. Spart im GIF die groesste Menge Kantenpixel.
	// Fred 21.09. abends: Minutenstriche der kleinen Uhren raus (Fuenf-
	// Minuten und Viertel bleiben), zum Anschauen auf der Startseite —
	// weniger Malaufwand je Bild, die Stunde behaelt ihr volles Blatt.
	kleineMinuten: false,
};
export const STRICH = 2.5;   // Kontur der Stunde und Speichen
// KEIN Zeiger auf den kleinen Uhren (Fred 21.09.): erst 176 drehende
// Linien (ruckelten auf dem Handy), dann ein Sektor an der Vorderkante der
// Fuellung (zu unauffaellig) — Entscheidung: die wachsende weisse Flaeche
// ist die Information, der Zeiger entfaellt.
// Stoppuhr-Beschlag (Fred 21.09., Probe): Krone oben als T mit Hals,
// Druecker rechts oben bei 45 Grad (knoepfe: "beide" fuer links und rechts). Masse in Anteilen des
// Radius, abgeleitet aus Octicons / Noun 2624401 / UXWing (Recherche
// 21.09.): Kappe 0,35 bis 0,6 r breit, Hals 0,15 bis 0,3 r, Knoepfe 0,15
// bis 0,3 r ueber den Rand, Balken quer zur Radialrichtung.
export const knopfWinkel = () => (STOPPUHR.knoepfe === "beide" ? [-STOPPUHR.knopf.winkel, STOPPUHR.knopf.winkel] : [STOPPUHR.knopf.winkel]);
export const STOPPUHR = {
	kappe: { breite: 0.42, hoehe: 0.16 },  // Deckel der Krone
	hals: { breite: 0.2, hoehe: 0.14 },    // Steg zwischen Rand und Kappe
	knopf: { breite: 0.28, hoehe: 0.13, hals: 0.1, halsBreite: 0.16, winkel: 45 }, // Druecker: Hals + Kappe, bei winkel
	// Welche Druecker: "rechts" (einer, rechts oben — Fred 21.09.: „sieht
	// mehr nach Stoppuhr aus") oder "beide" (links und rechts).
	knoepfe: "rechts" as "rechts" | "beide",
};
export const DASH = { muster: [1.04, 2], leer: 1.06 }; // Kuchenstueck-Trick (Splitter/Spalt-frei)
// Beschriftung der Stunde (Fred 21.09.: „in die Uhr reinschreiben 60 Min.",
// dann: „mitzaehlen, hochzaehlen, so wie der Zeiger sich bewegt"): unter
// der Mitte, zaehlt 0 → 60 mit dem Zeiger (gleiche Kurve), steht dann.
// Fred 21.09.: „die 60 in die Mitte, die Minuten klein drunter" — Zahl
// mittig, direkt unter dem Drehpunkt (die Speichen laufen nach oben),
// Einheit klein darunter. Masse in Anteilen von r (Grundlinien ab Mitte).
export const STUNDE_TEXT = { einheit: "Min.", bis: 60, zahlGroesse: 0.34, zahlDy: 0.29, einheitGroesse: 0.14, einheitDy: 0.47 };
export function stundeMinuten(stundeAnteil: number) { return Math.min(STUNDE_TEXT.bis, Math.floor(stundeAnteil * STUNDE_TEXT.bis + 1e-6)); }

// ── Geometrie ───────────────────────────────────────────────────────────
export function uhren(): Array<{ x: number; y: number }> {
	const out: Array<{ x: number; y: number }> = [];
	for (let k = 1; k <= UHR.ringe; k++) {
		const n = Math.round(2 * Math.PI * k);
		for (let j = 0; j < n; j++) {
			const th = -Math.PI / 2 + (j * 2 * Math.PI) / n;
			out.push({ x: +(UHR.cx + UHR.abstand * k * Math.cos(th)).toFixed(2), y: +(UHR.cy + UHR.abstand * k * Math.sin(th)).toFixed(2) });
		}
	}
	return out;
}

// ── Marken (Sekunden ab Rundenbeginn) ───────────────────────────────────
export function marken() {
	const uhrenStart = ZEIT.uhrenStart === "abStunde" ? ZEIT.halt + ZEIT.stunde * ZEIT.uhrenAbStunde : ZEIT.uhrenStart;
	const kameraStart = ZEIT.halt + ZEIT.stunde * ZEIT.kameraAbStunde;
	const uhrenDauer =
		ZEIT.uhrenDauer !== "mitKamera" ? ZEIT.uhrenDauer
		: ZEIT.kameraRaus === "letzteUhr" ? 9.92
		: kameraStart + ZEIT.kameraRaus - uhrenStart;
	const uhrenEnde = uhrenStart + uhrenDauer;
	const stundeEnde = ZEIT.halt + ZEIT.stunde;
	const kameraEnde = ZEIT.kameraRaus === "letzteUhr" ? uhrenEnde - ZEIT.kameraVorsprung : kameraStart + ZEIT.kameraRaus;
	const standEnde = Math.max(uhrenEnde, kameraEnde) + ZEIT.stand;
	const reinStart = standEnde + ZEIT.kriechenRein;
	const kameraRein = ZEIT.kameraRein === "wieRaus" ? kameraEnde - kameraStart : ZEIT.kameraRein;
	const ausblenden = ZEIT.ausblenden === "wieRein" ? kameraRein : ZEIT.ausblenden;
	const reinEnde = reinStart + kameraRein;
	const innenEnde = reinEnde + ZEIT.innenStand;
	const RUNDE = Math.max(reinStart + ausblenden, innenEnde + ZEIT.innenZurueck) + ZEIT.nachlauf;
	return { halt: ZEIT.halt, stundeEnde, kameraStart, kameraEnde, uhrenStart, uhrenEnde, uhrenDauer, standEnde, reinStart, kameraRein, ausblenden, reinEnde, innenEnde, RUNDE };
}
export type Marken = ReturnType<typeof marken>;

// ── Kurven-Loeser: cubic-bezier(x1, y1, x2, y2), gibt zu x (0..1) das y ──
export function bezier(x1: number, y1: number, x2: number, y2: number) {
	const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
	const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
	const X = (t: number) => ((ax * t + bx) * t + cx) * t;
	const Y = (t: number) => ((ay * t + by) * t + cy) * t;
	const dX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
	return (x: number) => {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		let t = x;
		for (let i = 0; i < 8; i++) { const d = X(t) - x; if (Math.abs(d) < 1e-6) break; const g = dX(t); if (!g) break; t -= d / g; }
		return Y(Math.min(1, Math.max(0, t)));
	};
}
const kurve = (k: number[]) => bezier(k[0], k[1], k[2], k[3]);

// ── Startzeiten und Dauern der weissen Uhren (Beschleunigung je Sekunde) ─
export function uhrenPlan(N: number, m: Marken) {
	const r0 = 1 / (ZEIT.ersteDauer * ZEIT.naechsteBei);
	const startBei = (i: number, k: number) => (k < 1e-9 ? i / r0 : Math.log(1 + (i * k) / r0) / k);
	const dauerVon = (luecke: number) => Math.max(ZEIT.dauerMin, luecke / ZEIT.naechsteBei);
	const gesamt = (k: number) => startBei(N - 1, k) + dauerVon(startBei(N - 1, k) - startBei(N - 2, k));
	let lo = 0, hi = 5;
	for (let s = 0; s < 80; s++) { const mid = (lo + hi) / 2; if (gesamt(mid) > m.uhrenDauer) lo = mid; else hi = mid; }
	const k = (lo + hi) / 2;
	const starts = Array.from({ length: N }, (_, i) => m.uhrenStart + startBei(i, k));
	const dauern = starts.map((t, i) => dauerVon(i < N - 1 ? starts[i + 1] - t : t - starts[i - 1]));
	dauern[0] = ZEIT.ersteDauer;
	return { starts, dauern, k, proSekunde: Math.exp(k) };
}

// ── Keyframe-Auswertung wie die Web Animations API: Marke = { t, wert,
//    kurve zum NAECHSTEN Punkt } ───────────────────────────────────────────
export type Marke = { t: number; v: number; k?: number[] };
export function wert(marken: Marke[], t: number): number {
	if (t <= marken[0].t) return marken[0].v;
	for (let i = 0; i < marken.length - 1; i++) {
		const a = marken[i], b = marken[i + 1];
		if (t <= b.t) {
			if (b.t === a.t) return b.v;
			const u = (t - a.t) / (b.t - a.t);
			const e = a.k ? kurve(a.k)(u) : u;
			return a.v + (b.v - a.v) * e;
		}
	}
	return marken[marken.length - 1].v;
}

// ── Der Zustand eines Bildes zur Zeit t (Sekunden in der Runde) ─────────
export function zustand(t: number, m: Marken, plan: ReturnType<typeof uhrenPlan>, N: number) {
	const SCHUTZ = 0.06;
	const S0 = KAMERA.start, S1 = KAMERA.ende;
	const SD = S1 * (1 - (ZEIT.stand > 0 ? KAMERA.drift : 0));
	const SI = S0 * (1 + (ZEIT.innenStand > 0 ? KAMERA.drift : 0));
	const skala = wert([
		{ t: 0, v: S0 },
		{ t: m.kameraStart, v: S0, k: KURVE_RAUS },
		{ t: m.kameraEnde, v: S1, k: KURVE_KRIECH_RAUS },
		{ t: m.standEnde, v: SD, k: KURVE_KRIECH_REIN },
		{ t: m.reinStart, v: S1, k: KURVE_REIN },
		{ t: m.reinEnde, v: S0, k: KURVE_KRIECH_RAUS },
		{ t: m.innenEnde, v: SI, k: KURVE_KRIECH_REIN },
		{ t: m.RUNDE, v: S0 },
	], t);
	const deckkraft = wert([
		{ t: 0, v: 0 },
		{ t: SCHUTZ, v: 0 },
		{ t: SCHUTZ * 1.5, v: 1 },
		{ t: m.reinStart, v: 1, k: KURVE_AUSBLENDEN },
		{ t: m.reinStart + m.ausblenden, v: 0 },
		{ t: m.RUNDE, v: 0 },
	], t);
	const leerVorEnde = m.RUNDE - SCHUTZ;
	// Stunde: Anteil gezeichnet (0..1)
	const stundeAnteil = t >= leerVorEnde ? 0 : wert([
		{ t: 0, v: 0 },
		{ t: m.halt, v: 0, k: KURVE },
		{ t: m.stundeEnde, v: 1 },
		{ t: m.RUNDE, v: 1 },
	], t);
	// Uhren: Anteil gefuellt (0..1) je Uhr
	const anteile = new Float32Array(N);
	for (let i = 0; i < N; i++) {
		const s = plan.starts[i], e = Math.min(leerVorEnde, s + plan.dauern[i]);
		anteile[i] = t >= leerVorEnde ? 0 : wert([{ t: 0, v: 0 }, { t: Math.min(e, s), v: 0, k: KURVE }, { t: e, v: 1 }, { t: m.RUNDE, v: 1 }], t);
	}
	return { skala, deckkraft, stundeAnteil, anteile };
}
