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
	// KI-Assistenten (Fred 15.09., „Zitate für KI"-Zeile): ECHTE Marken-
	// Piktogramme (Pfade aus der Simple-Icons-Sammlung, CC0; Markenrechte
	// liegen bei den Anbietern — Nutzung nach deren Richtlinien).
	chatgpt: '<svg viewBox="0 0 24 24" fill="white"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>',
	claude: '<svg viewBox="0 0 24 24" fill="white"><path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z"/></svg>',
	gemini: '<svg viewBox="0 0 24 24" fill="white"><path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81"/></svg>',
	perplexity: '<svg viewBox="0 0 24 24" fill="white"><path d="M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z"/></svg>',
};
