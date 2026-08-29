// POST /api/book  { start, fullname, email, message?, website? }
//
// Proxy vor meetergos POST /v4/booking. Die Terminart wird server-seitig
// per Namens-Lookup aufgelöst (nicht vom Client übernommen) — so kann ein
// Besucher nie eine andere Terminart auf Freds Kalender buchen, selbst wenn
// er die Anfrage manipuliert. Gibt meetergos Fehlerstatus unverändert durch,
// insbesondere 400 (Slot inzwischen belegt) — der Client refetcht dann
// /api/slots?refresh=1 und lässt neu wählen (Website-Brief-Vorgabe).
//
// Audit-Fix A4 (2026-08-30): server-seitige Eingabe-Validierung + Honeypot,
// weil Client-Validierung allein von jedem direkten POST an diese Function
// umgangen werden kann. Eigene Validierungsfehler tragen einen error-Code
// ungleich "upstream_error" (siehe MAX_* unten + isValidEmail), damit der
// Client sie von einem echten meetergo-Konflikt (Slot inzwischen weg)
// unterscheiden kann — Details dazu im buchen.astro-Script.
import { getMeetingType, meetergoFetch, jsonResponse } from "../_lib/meetergo.js";

const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;

// Einfacher, robuster Format-Check (kein Anspruch auf RFC-5322-Vollständigkeit
// — das ist bei einem serverseitigen Vorfilter auch nicht das Ziel, nur
// offensichtlichen Unsinn/Bot-Spam abfangen).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
	return typeof value === "string" && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

export async function onRequestPost({ request, env }) {
	const pat = env.METERGO_PAT;
	if (!pat) {
		return jsonResponse({ error: "server_misconfigured", message: "METERGO_PAT fehlt" }, 500);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "invalid_json", message: "Ungültige Anfrage." }, 400);
	}

	const { start, fullname, email, message, website } = body || {};

	// Honeypot: für Menschen unsichtbares Feld (siehe buchen.astro .hp-field).
	// Ist es gefüllt, kam die Anfrage höchstwahrscheinlich von einem simplen
	// Formular-Bot. Bewusst KEINE Fehlerantwort, die den Bot lernen lassen
	// würde, woran er erkannt wurde — stattdessen eine unauffällige 200er
	// Antwort, ohne tatsächlich zu buchen.
	if (typeof website === "string" && website.trim() !== "") {
		return jsonResponse({ ok: true }, 200);
	}

	if (!start || !fullname || !email) {
		return jsonResponse({ error: "missing_fields", message: "Bitte alle Pflichtfelder ausfüllen." }, 400);
	}
	if (typeof fullname !== "string" || fullname.length > MAX_NAME_LENGTH) {
		return jsonResponse({ error: "field_too_long", message: "Der Name ist zu lang." }, 400);
	}
	if (!isValidEmail(email)) {
		return jsonResponse({ error: "invalid_email", message: "Bitte eine gültige E-Mail-Adresse angeben." }, 400);
	}
	if (typeof message === "string" && message.length > MAX_MESSAGE_LENGTH) {
		return jsonResponse({ error: "field_too_long", message: "Die Nachricht ist zu lang." }, 400);
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
