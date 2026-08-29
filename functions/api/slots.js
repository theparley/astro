// GET /api/slots?start=YYYY-MM-DD&end=YYYY-MM-DD[&refresh=1]
//
// Proxy vor meetergos GET /v4/booking-availability — hält den PAT server-
// seitig (siehe functions/_lib/meetergo.js) und cacht die Antwort ~1 Minute
// (meetergo-Empfehlung, Website-Brief). ?refresh=1 überspringt den Cache und
// setzt refreshCache=true stromaufwärts — genau der vom Brief verlangte Pfad
// für "bei Buchungs-400 Slots refreshen".
import { getMeetingType, meetergoFetch, jsonResponse } from "../_lib/meetergo.js";

const SLOT_CACHE_TTL_SECONDS = 60;

export async function onRequestGet({ request, env }) {
	const pat = env.METERGO_PAT;
	if (!pat) {
		return jsonResponse({ error: "server_misconfigured", message: "METERGO_PAT fehlt" }, 500);
	}

	const url = new URL(request.url);
	const start = url.searchParams.get("start");
	const end = url.searchParams.get("end");
	const refresh = url.searchParams.get("refresh") === "1";

	if (!start || !end) {
		return jsonResponse({ error: "start_end_required" }, 400);
	}

	const cache = caches.default;
	const cacheKey = new Request(
		`https://cache.internal.the-parley/slots?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
	);

	if (!refresh) {
		const cached = await cache.match(cacheKey);
		if (cached) return cached;
	}

	let meetingType;
	try {
		meetingType = await getMeetingType(pat, cache);
	} catch (err) {
		return jsonResponse({ error: "meeting_type_lookup_failed", message: String(err?.message || err) }, 502);
	}

	const params = new URLSearchParams({
		meetingTypeId: meetingType.id,
		start,
		end,
		timezone: "Europe/Berlin",
	});
	if (refresh) params.set("refreshCache", "true");

	// Audit-Fix B10: echten Upstream-Status durchreichen (wie book.js es schon
	// tut), statt hier pauschal 502 zu antworten — ein 4xx von meetergo (z. B.
	// ungültige Parameter) ist kein Server-/Netzwerkfehler unsererseits. Ein
	// generisches 502 bleibt reserviert für Netzwerk-/Parse-Fehler (siehe
	// catch-Block bei getMeetingType oben und den impliziten Fehlerfall, wenn
	// meetergoFetch selbst wirft).
	const upstream = await meetergoFetch(`/booking-availability?${params.toString()}`, pat);
	if (!upstream.ok) {
		return jsonResponse(
			{ error: "upstream_error", status: upstream.status, message: await upstream.text() },
			upstream.status,
		);
	}

	const data = await upstream.json();
	const payload = { timezone: data.timezone, dates: data.dates };
	const response = jsonResponse(payload, 200, { "Cache-Control": `max-age=${SLOT_CACHE_TTL_SECONDS}` });

	if (!refresh) {
		await cache.put(cacheKey, response.clone());
	}
	return response;
}
