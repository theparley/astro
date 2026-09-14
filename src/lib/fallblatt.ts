// fallblatt.ts — DAS gemeinsame Fallblatt-Material aller Boards der Seite
// (Fred 14.09. abends: "dass wirklich bei allen drei Boards und auch bei
// allen zukünftigen Boards die gleiche Logik hinten dran ist").
//
// Hier lebt alles, was eine Tafel zur Tafel macht: die Zeichentrommel, die
// zweiphasige Lamellen-Klappe (Ober-/Unterklappe wie eine echte Solari-
// Lamelle), der MAX_FLAPS-Deckel, der Klacker-Sound. Die Komponenten
// (SplitFlap.astro = Sequenz-Boards, MultiOutputTafel.astro = Timeline-
// Wand) steuern nur noch WAS wann auf welcher Kachel steht — WIE geklappt
// wird, entscheidet ausschließlich dieses Modul. Das zugehörige Layer-CSS
// liegt in src/styles/fallblatt.css (von beiden Komponenten importiert).

// Zeichentrommel — Reihenfolge = Klapper-Richtung: eine echte
// Fallblattanzeige dreht nur VORWÄRTS, nie zurück.
export const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ.,!?'-0123456789";

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
		current: el.dataset.char || "&nbsp;",
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
	if (g.innerHTML !== html) g.innerHTML = html;
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
	klick();
	setGlyph(tile.topStaticGlyph, html);
	tile.frontFlapEl.style.transitionTimingFunction = "ease-in";
	tile.frontFlapEl.style.transitionDuration = halfMs + "ms";
	// Reflow erzwingen, damit der Übergang wirklich bei 0deg startet.
	void tile.frontFlapEl.offsetHeight;
	tile.frontFlapEl.style.transform = "rotateX(-90deg)";
	await wait(halfMs);

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

// ── Klapper-Sound (Fred 14.09. abends: "jetzt brauche ich nur noch den
// Sound von so einem Flipperboard") ──
// Synthetisch per WebAudio statt Sample: ein ~20ms-Rauschimpuls durch
// einen Bandpass mit leicht zufälliger Mittenfrequenz — klingt wie das
// mechanische Klacken einer Lamelle, braucht keine Datei und keine Lizenz.
// Browser-Autoplay-Regel: ein AudioContext läuft erst nach der ersten
// echten Nutzer-Geste (Klick/Taste/Touch) — bis dahin klappern die Tafeln
// stumm. Global gedrosselt (max. ein Klick je 18ms, über ALLE Boards),
// damit parallel klappernde Kacheln ein Rattern ergeben statt eines Breis.
//
// SOUND VORERST AUS (Fred 14.09. abends, vor dem Live-Push: "den Sound
// lassen wir mal noch draußen") — aber als PROBE-SCHALTER erreichbar:
// ?sound an der URL macht ihn an (Fred will die Kopplung anhören können,
// ohne dass die Live-Seite für Besucher klackert). Der typeof-Guard
// schützt den Node-Build (SplitFlap-Frontmatter importiert FLAP_STEP_MS
// aus diesem Modul — dort gibt es kein location).
const SOUND_AN =
	typeof location !== "undefined" &&
	new URLSearchParams(location.search).has("sound");
let audioCtx: AudioContext | null = null;
let noiseBuf: AudioBuffer | null = null;
let lastKlickAt = 0;
let armed = false;

function armAudio() {
	if (audioCtx) return;
	try {
		audioCtx = new AudioContext();
		const len = Math.floor(audioCtx.sampleRate * 0.03);
		noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
		const data = noiseBuf.getChannelData(0);
		for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
	} catch {
		audioCtx = null;
	}
}

/** Einmal pro Seite aufrufen (idempotent): rüstet den Sound scharf, sobald
 *  die erste Nutzer-Geste kommt. */
export function armSound() {
	if (!SOUND_AN || armed) return;
	armed = true;
	document.addEventListener("pointerdown", armAudio, { once: true, passive: true });
	document.addEventListener("keydown", armAudio, { once: true });
}

export function klick() {
	if (!SOUND_AN || !audioCtx || !noiseBuf || audioCtx.state !== "running") return;
	const now = performance.now();
	if (now - lastKlickAt < 18) return;
	lastKlickAt = now;
	const t = audioCtx.currentTime;
	const src = audioCtx.createBufferSource();
	src.buffer = noiseBuf;
	const bp = audioCtx.createBiquadFilter();
	bp.type = "bandpass";
	bp.frequency.value = 2200 + Math.random() * 1600;
	bp.Q.value = 1.4;
	const g = audioCtx.createGain();
	g.gain.setValueAtTime(0.1, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.022);
	src.connect(bp);
	bp.connect(g);
	g.connect(audioCtx.destination);
	src.start(t);
	src.stop(t + 0.03);
}
