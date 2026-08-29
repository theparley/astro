// POST /api/book  { start, fullname, email, message? }
//
// Proxy vor meetergos POST /v4/booking. Die Terminart wird server-seitig
// per Namens-Lookup aufgelöst (nicht vom Client übernommen) — so kann ein
// Besucher nie eine andere Terminart auf Freds Kalender buchen, selbst wenn
// er die Anfrage manipuliert. Gibt meetergos Fehlerstatus unverändert durch,
// insbesondere 400 (Slot inzwischen belegt) — der Client refetcht dann
// /api/slots?refresh=1 und lässt neu wählen (Website-Brief-Vorgabe).
import { getMeetingType, meetergoFetch, jsonResponse } from "../_lib/meetergo.js";

export async function onRequestPost({ request, env }) {
	const pat = env.METERGO_PAT;
	if (!pat) {
		return jsonResponse({ error: "server_misconfigured", message: "METERGO_PAT fehlt" }, 500);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "invalid_json" }, 400);
	}

	const { start, fullname, email, message } = body || {};
	if (!start || !fullname || !email) {
		return jsonResponse({ error: "missing_fields" }, 400);
	}

	const cache = caches.default;
	let meetingType;
	try {
		meetingType = await getMeetingType(pat, cache);
	} catch (err) {
		return jsonResponse({ error: "meeting_type_lookup_failed", message: String(err?.message || err) }, 502);
	}

	const payload = {
		meetingTypeId: meetingType.id,
		...(meetingType.userId ? { hostIds: [meetingType.userId] } : {}),
		start,
		attendee: {
			fullname,
			email,
			receiveReminders: true,
			notes: message ? { message } : {},
		},
	};

	const upstream = await meetergoFetch("/booking", pat, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});

	const text = await upstream.text();
	if (!upstream.ok) {
		return jsonResponse({ error: "upstream_error", message: text }, upstream.status);
	}

	let data;
	try {
		data = JSON.parse(text);
	} catch {
		data = {};
	}
	return jsonResponse(data, 201);
}
