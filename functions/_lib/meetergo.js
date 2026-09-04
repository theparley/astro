// Gemeinsamer Helper für die meetergo-API — genutzt von /api/slots und
// /api/book. Der PAT kommt ausschließlich aus env.METERGO_PAT (Cloudflare
// Pages Secret, siehe README/Website-Brief) und verlässt diese Function-
// Umgebung nie in Richtung Client.
//
// Architektur-MUSS (Website-Brief, 29.08.): der PAT darf NIEMALS in den
// Browser/Client-Code — jeder Besucher könnte ihn sonst auslesen und hätte
// Vollzugriff aufs meetergo-Konto. Diese Function ist der einzige Ort, an
// dem der PAT existiert.

export const API_BASE = "https://api.meetergo.com/v4";

// Terminart, wie sie bei meetergo angelegt ist. Fred-Entscheid 2026-06-14
// (zweite Runde): Das 30-Min-Gespräch heißt "Let's Parley" — identisch mit
// dem CTA der Website (gerades Apostroph, exakt dieses Zeichen!). Slug bei
// meetergo: lets-parley. ACHTUNG: Name-Matching — bei Umbenennung in
// meetergo MUSS diese Konstante zeichengenau mitziehen. Der Name ist nicht
// geheim — die ID wird per Lookup aufgelöst und kurz gecacht.
export const MEETING_TYPE_NAME = "Let's Parley";

const MEETING_TYPE_CACHE_KEY = "https://cache.internal.the-parley/meetergo-meeting-type";
const MEETING_TYPE_CACHE_TTL_SECONDS = 3600; // Terminarten ändern sich praktisch nie

export async function meetergoFetch(path, pat, init = {}) {
	return fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${pat}`,
			...(init.headers || {}),
		},
	});
}

// Löst den Terminart-Namen zu {id, userId} auf — userId wird als hostIds
// beim Buchen mitgeschickt (meetergo-Doku: "Required for one-on-one
// bookings"). Ergebnis wird über die Cloudflare Cache API zwischengelegt,
// getrennt vom kurzlebigen Slot-Cache in slots.js (andere TTL, anderer Key).
export async function getMeetingType(pat, cache) {
	if (cache) {
		const cached = await cache.match(MEETING_TYPE_CACHE_KEY);
		if (cached) return cached.json();
	}

	const res = await meetergoFetch("/meeting-type", pat);
	if (!res.ok) {
		throw new Error(`meeting-type lookup fehlgeschlagen: ${res.status} ${await res.text()}`);
	}
	const list = await res.json();
	const match = list.find((mt) => mt?.meetingInfo?.name === MEETING_TYPE_NAME);
	if (!match) {
		throw new Error(`Terminart "${MEETING_TYPE_NAME}" nicht gefunden`);
	}

	const result = { id: match.id, userId: match.userId ?? null };

	if (cache) {
		const cacheResponse = new Response(JSON.stringify(result), {
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": `max-age=${MEETING_TYPE_CACHE_TTL_SECONDS}`,
			},
		});
		await cache.put(MEETING_TYPE_CACHE_KEY, cacheResponse);
	}

	return result;
}

export function jsonResponse(data, status = 200, extraHeaders = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...extraHeaders },
	});
}
