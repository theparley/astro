// fallblatt.ts — DAS gemeinsame Fallblatt-Material aller Boards der Seite
// (Fred 14.09. abends: "dass wirklich bei allen drei Boards und auch bei
// allen zukünftigen Boards die gleiche Logik hinten dran ist").
//
// Hier lebt alles, was eine Tafel zur Tafel macht: die Zeichentrommel, die
// zweiphasige Lamellen-Klappe (Ober-/Unterklappe wie eine echte Solari-
// Lamelle), der MAX_FLAPS-Deckel. (Der Klacker-Sound von der Proberunde
// 14.09. ist auf Freds Entscheidung KOMPLETT entfernt — Fassung mit
// WebAudio-Synthese steht in der Git-Historie, Commit 2da084b.) Die Komponenten
// (SplitFlap.astro = Sequenz-Boards, MultiOutputTafel.astro = Timeline-
// Wand) steuern nur noch WAS wann auf welcher Kachel steht — WIE geklappt
// wird, entscheidet ausschließlich dieses Modul. Das zugehörige Layer-CSS
// liegt in src/styles/fallblatt.css (von beiden Komponenten importiert).

// Zeichentrommel — Reihenfolge = Klapper-Richtung: eine echte
// Fallblattanzeige dreht nur VORWÄRTS, nie zurück.
// Das letzte Zeichen ist das SONDERZEICHEN ● (Fred 14.09. abends: die
// Uhr-Kachel soll wie ein Buchstabe durch die Kette laufen) — es rendert
// nicht als Text, sondern als Kreis-Span (siehe SONDERZEICHEN unten);
// die Wand nutzt es für die Stunden-Uhr.
export const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ.,!?'-&0123456789●";

// Trommel-Zeichen mit eigener Darstellung: Zeichen in der Kette, aber als
// Markup gerendert (setGlyph übersetzt beim Schreiben; tile.current und
// die Trommel-Logik rechnen weiter mit dem Zeichen selbst).
const SONDERZEICHEN: Record<string, string> = {
	"●": '<span class="mo-uhr"></span>',
};

// Sichtbare Klappen pro Wechsel deckeln (Fred 14.09. abends: "es blendet
// rein statt zu flippern"): damit die Lamellen-Drehung wirklich GEZEICHNET
// wird, braucht eine Halbklappe Wand-Tempo (~85ms) — bei vollem Trommelweg
// (bis zu 45 Zeichen) würde ein Wechsel damit sekundenlang rattern.
// Deshalb springt die Trommel lautlos bis kurz vors Ziel und die ERSTE
// Klappe überbrückt den Rest — jede sichtbare Änderung bleibt eine echte
// Klappbewegung, gedreht wird optisch weiterhin nur vorwärts.
export const MAX_FLAPS = 6;

// Der eine Takt für ALLE Boards. Untergrenze der Sichtbarkeit: eine
// Halbklappe braucht ~3 Bildschirm-Frames (≥50ms), sonst kippt der
// Eindruck wieder ins Blenden (die 30/60ms-Lektion vom 14.09.).
// 170 (Wand-Tempo) war Fred "ein bisschen langsam" → 110 = 55ms je
// Halbklappe, knapp über der Frame-Grenze.
export const FLAP_STEP_MS = 110;

export function wait(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function reduceMotion(): boolean {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── Kachel-Handle ────────────────────────────────────────────────────────
// Eine Kachel besteht aus vier Schichten (SSG-Markup in SplitFlap.astro
// bzw. client-seitig gebaut via buildTileLayers): statische Ober- und
// Unterhälfte, Vorder- und Rückklappe, dazu die Scharnier-Linie.
export interface FlapTile {
	el: HTMLElement;
	topStaticGlyph: HTMLElement;
	bottomStaticGlyph: HTMLElement;
	frontFlapEl: HTMLElement;
	backFlapEl: HTMLElement;
	frontGlyph: HTMLElement;
	backGlyph: HTMLElement;
	/** aktueller Inhalt als HTML (einzelnes Zeichen ODER z. B. ein Logo-SVG) */
	current: string;
	/** Generationszähler: seekInstant/Reset erhöht ihn, laufende
	 *  Klapper-Schleifen brechen dann ab (kein Schreiben auf alte Stände). */
	gen: number;
	/** Warteschlange, damit Ereignisse pro Kachel strikt nacheinander
	 *  klappen (Timeline-Boards feuern fire-and-forget). */
	queue: Promise<void>;
}

const LAYER_HTML =
	'<span class="sf-static sf-static--top"><span class="sf-glyph" data-layer="top-static">&nbsp;</span></span>' +
	'<span class="sf-static sf-static--bottom"><span class="sf-glyph" data-layer="bottom-static">&nbsp;</span></span>' +
	'<span class="sf-flap sf-flap--front" data-layer="front-flap"><span class="sf-glyph">&nbsp;</span></span>' +
	'<span class="sf-flap sf-flap--back" data-layer="back-flap"><span class="sf-glyph">&nbsp;</span></span>' +
	'<span class="sf-hinge"></span>';

function grab(el: HTMLElement): FlapTile {
	return {
		el,
		topStaticGlyph: el.querySelector('[data-layer="top-static"]') as HTMLElement,
		bottomStaticGlyph: el.querySelector('[data-layer="bottom-static"]') as HTMLElement,
		frontFlapEl: el.querySelector(".sf-flap--front") as HTMLElement,
		backFlapEl: el.querySelector(".sf-flap--back") as HTMLElement,
		frontGlyph: el.querySelector(".sf-flap--front .sf-glyph") as HTMLElement,
		backGlyph: el.querySelector(".sf-flap--back .sf-glyph") as HTMLElement,
		// Fallback " " statt "&nbsp;" (Review 14.09.): das Leerzeichen IST
		// das Trommel-Blank — so rattert auch der allererste Wechsel einer
		// client-gebauten Kachel durch die Trommel statt hart zu tauschen.
		current: el.dataset.char || " ",
		gen: 0,
		queue: Promise.resolve(),
	};
}

/** Adoptiert eine bereits (server-)gerenderte Vier-Schichten-Kachel. */
export function wireTileLayers(el: HTMLElement): FlapTile {
	return grab(el);
}

/** Baut die Vier-Schichten-Struktur client-seitig in einen leeren
 *  Kachel-Container (Timeline-Wand: startet ohnehin leer, kein sichtbarer
 *  Sprung). Der Container braucht die Klassen-Umgebung aus fallblatt.css
 *  (.sf-static/.sf-flap/.sf-glyph sind global). */
export function buildTileLayers(el: HTMLElement): FlapTile {
	el.innerHTML = LAYER_HTML;
	return grab(el);
}

function setGlyph(g: HTMLElement, html: string) {
	const dargestellt = SONDERZEICHEN[html] ?? html;
	if (g.innerHTML !== dargestellt) g.innerHTML = dargestellt;
}

export function setInstant(tile: FlapTile, html: string) {
	setGlyph(tile.topStaticGlyph, html);
	setGlyph(tile.bottomStaticGlyph, html);
	setGlyph(tile.frontGlyph, html);
	setGlyph(tile.backGlyph, html);
	tile.frontFlapEl.style.transitionDuration = "0ms";
	tile.backFlapEl.style.transitionDuration = "0ms";
	tile.frontFlapEl.style.transform = "rotateX(0deg)";
	tile.backFlapEl.style.transform = "rotateX(0deg)";
	tile.current = html;
}

/** Reset für Seek/Loop-Neustart: bricht laufende Klapper-Schleifen der
 *  Kachel ab (Generation) und setzt den Inhalt hart. */
export function resetInstant(tile: FlapTile, html: string) {
	tile.gen++;
	tile.queue = Promise.resolve();
	setInstant(tile, html);
}

// Ein einzelner Klapp-Schritt, zweiphasig wie eine echte Fallblatt-Lamelle:
// Phase 1 — Oberklappe fällt (zeigt weiterhin ALT), während die statische
//   obere Hälfte darunter schon lautlos auf NEU umspringt.
// Phase 2 — Unterklappe schwingt hoch in die Endposition (zeigt NEU).
// onMid (optional) feuert am Phasenwechsel — z. B. für Zustandsklassen wie
// die Uhr-Kacheln der Wand, deren Aufbau mit dem Aufklappen starten soll.
export async function flapOnce(
	tile: FlapTile,
	html: string,
	halfMs: number,
	onMid?: () => void,
) {
	// Generations-Wache IN der Klappe (Bugfix 14.09. abends, Fred: "beim
	// Hochscrollen bleiben Buchstaben stehen"): eine Klappe, die beim
	// Reset (seekInstant/Loop-Neustart) gerade in der Luft ist, darf nach
	// ihren waits NICHTS mehr schreiben — sonst überschreibt sie den
	// frisch gesetzten Zustand mit ihrem alten Ziel und der Buchstabe
	// steht als Geist in der leeren Wand.
	const gen = tile.gen;
	setGlyph(tile.topStaticGlyph, html);
	tile.frontFlapEl.style.transitionTimingFunction = "ease-in";
	tile.frontFlapEl.style.transitionDuration = halfMs + "ms";
	// Reflow erzwingen, damit der Übergang wirklich bei 0deg startet.
	void tile.frontFlapEl.offsetHeight;
	tile.frontFlapEl.style.transform = "rotateX(-90deg)";
	await wait(halfMs);
	if (tile.gen !== gen) return;

	tile.frontFlapEl.style.transitionDuration = "0ms";
	tile.frontFlapEl.style.transform = "rotateX(0deg)";
	setGlyph(tile.frontGlyph, html);
	if (onMid) onMid();

	setGlyph(tile.backGlyph, html);
	tile.backFlapEl.style.transitionDuration = "0ms";
	tile.backFlapEl.style.transform = "rotateX(90deg)";
	void tile.backFlapEl.offsetHeight;
	tile.backFlapEl.style.transitionTimingFunction = "ease-out";
	tile.backFlapEl.style.transitionDuration = halfMs + "ms";
	tile.backFlapEl.style.transform = "rotateX(0deg)";
	await wait(halfMs);
	if (tile.gen !== gen) return;

	setGlyph(tile.bottomStaticGlyph, html);
	tile.current = html;
}

/** Klappt eine Kachel zum Zielinhalt. Einzelzeichen aus der Trommel
 *  rattern durch (kürzester Weg vorwärts, gedeckelt auf MAX_FLAPS);
 *  alles andere (Logos, Mehrzeichen-HTML, Leerinhalt von außerhalb der
 *  Trommel) wechselt mit EINER echten Klappe. */
export async function flapTo(
	tile: FlapTile,
	targetHtml: string,
	stepMs: number = FLAP_STEP_MS,
	onMid?: () => void,
) {
	if (tile.current === targetHtml) {
		if (onMid) onMid();
		return;
	}
	const gen = tile.gen;
	const halfMs = Math.max(8, stepMs / 2);
	const fromCh = tile.current.length === 1 ? tile.current : null;
	const toCh = targetHtml.length === 1 ? targetHtml : null;
	const fromIdx = fromCh ? DRUM.indexOf(fromCh) : -1;
	const toIdx = toCh ? DRUM.indexOf(toCh) : -1;
	if (fromIdx === -1 || toIdx === -1) {
		await flapOnce(tile, targetHtml, halfMs, onMid);
		return;
	}
	let distance = (toIdx - fromIdx + DRUM.length) % DRUM.length;
	let cursor = fromIdx;
	if (distance > MAX_FLAPS) {
		cursor = (toIdx - MAX_FLAPS + DRUM.length) % DRUM.length;
		distance = MAX_FLAPS;
	}
	for (let i = 0; i < distance; i++) {
		if (tile.gen !== gen) return;
		cursor = (cursor + 1) % DRUM.length;
		const letzter = i === distance - 1;
		await flapOnce(tile, DRUM[cursor], halfMs, letzter ? onMid : undefined);
	}
}

/** Timeline-Helfer: reiht einen beliebigen Auftrag in die Kachel-
 *  Warteschlange ein (fire-and-forget, aber pro Kachel strikt geordnet;
 *  nach einem Reset verfallen wartende Aufträge über die Generation). */
export function enqueue(tile: FlapTile, fn: () => Promise<void> | void) {
	const gen = tile.gen;
	tile.queue = tile.queue.then(() => {
		if (tile.gen !== gen) return;
		return fn() || undefined;
	});
}

/** Timeline-Helfer: reiht einen Klapp-Auftrag in die Kachel-Warteschlange
 *  ein. */
export function queueFlap(
	tile: FlapTile,
	targetHtml: string,
	stepMs: number = FLAP_STEP_MS,
	onMid?: () => void,
) {
	enqueue(tile, () => flapTo(tile, targetHtml, stepMs, onMid));
}

// ── Kachel-Versätze (geteilt Website ↔ GIF-Werkstatt) ──
// Streu: deterministischer "Zufalls"-Versatz je Kachel — organisches
// Klappern, echte Anlagen laufen nie im Gleichtakt.
// Welle: disziplinierter Ablauf von oben nach unten (Zeile führt,
// Spalte schiebt leicht nach) — der Wand-Abbau und Freds gewünschter
// Folien-Wechsel im GIF-Creator.
export const stagStreu = (r: number, c: number) => ((r * 37 + c * 23) % 9) * 26;
export const stagWelle = (r: number, c: number) => r * 90 + c * 6;

// ── Vereinfachte Plattform-Logos (geteilt Wand ↔ GIF-Werkstatt; Entwurf
// 1:1 — Flagge „echte Brand-Logos nach Markenrichtlinien" bleibt offen,
// siehe Website-Brief). linkedin ist bewusst Text („in"), kein SVG. ──
export const LOGOS: Record<string, string> = {
	linkedin: '<span class="mo-logo-text">in</span>',
	youtube: '<svg viewBox="0 0 24 24" fill="none"><rect x="1" y="4" width="22" height="16" rx="4.5" stroke="white" stroke-width="1.8"/><path d="M10 8.8v6.4l5.6-3.2z" fill="white"/></svg>',
	instagram: '<svg viewBox="0 0 24 24" fill="none"><rect x="2.2" y="2.2" width="19.6" height="19.6" rx="5.5" stroke="white" stroke-width="1.8"/><circle cx="12" cy="12" r="4.6" stroke="white" stroke-width="1.8"/><circle cx="17.6" cy="6.4" r="1.4" fill="white"/></svg>',
	tiktok: '<svg viewBox="0 0 24 24" fill="white"><path d="M14.5 3h2.2c.2 1.8 1.4 3.3 3.8 3.7v2.5c-1.5 0-2.8-.5-3.8-1.2v6.6c0 3.4-2.3 5.9-5.6 5.9-3.1 0-5.6-2.3-5.6-5.5 0-3.4 2.9-5.8 6.2-5.4v2.6c-1.9-.5-3.6.8-3.6 2.7 0 1.7 1.3 3 3 3 1.9 0 3.4-1.4 3.4-3.7V3z"/></svg>',
	spotify: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="white" stroke-width="1.8"/><path d="M6.8 9.6c3.4-1 7.2-.7 10.2 1M7.4 12.6c2.8-.8 5.8-.5 8.2.8M8 15.4c2.2-.6 4.4-.4 6.3.6" stroke="white" stroke-width="1.5" stroke-linecap="round"/></svg>',
	apple: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="white" stroke-width="1.6"/><circle cx="12" cy="8.8" r="2.5" fill="white"/><path d="M9.3 17.8c.3-3.2 1.1-4.8 2.7-4.8s2.4 1.6 2.7 4.8a6.9 6.9 0 0 1-5.4 0z" fill="white"/></svg>',
	web: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.6"><circle cx="12" cy="12" r="9.5"/><ellipse cx="12" cy="12" rx="4.2" ry="9.5"/><path d="M2.8 12h18.4M4 7h16M4 17h16"/></svg>',
	mail: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2.5"/><path d="M3 6.5l9 7 9-7"/></svg>',
	ki: '<svg viewBox="0 0 24 24" fill="white"><path d="M12 2.5l1.9 6.2 6.2 1.9-6.2 1.9L12 18.7l-1.9-6.2-6.2-1.9 6.2-1.9z"/><path d="M19 15.5l.9 2.8 2.8.9-2.8.9-.9 2.8-.9-2.8-2.8-.9 2.8-.9z" opacity="0.85"/></svg>',
};
