// POST /api/contact  { firstName, lastName, email, phone?, message, website? }
//
// 1:1-Port des bewährten Nuxt-Endpoints (RoboCitrus/the-parley,
// server/api/contact.post.ts) auf Cloudflare Pages Functions — gleiche
// Architektur wie der meetergo-Proxy daneben: der MailerLite-API-Key bleibt
// server-seitig als Pages-Secret (env.MAILERLITE_API_KEY), nie im Client.
// Statt des MailerLite-SDK ein direkter REST-Aufruf (POST /api/subscribers
// wirkt als createOrUpdate — upsert über die E-Mail-Adresse).
//
// Zielgruppe "The First Parley Anfragen" (angelegt 2026-06-07): dort landen
// alle Website-Anfragen, und der Gruppen-Beitritt löst die Bestätigungs-
// Automation aus (subscriber_joins_group → Bestätigungsmail an den
// Absender). Gleiche Gruppen-ID wie auf der Nuxt-Seite — beide Seiten
// speisen denselben Trichter.
import { jsonResponse } from "../_lib/meetergo.js";

const FIRST_PARLEY_ANFRAGEN_GROUP_ID = "189646946497988383";

const MAX_NAME_LENGTH = 200;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 2000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
	return typeof value === "string" && value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

export async function onRequestPost({ request, env }) {
	const apiKey = env.MAILERLITE_API_KEY;
	if (!apiKey) {
		return jsonResponse({ error: "server_misconfigured", message: "Interner Serverfehler. Bitte später erneut versuchen." }, 500);
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return jsonResponse({ error: "invalid_json", message: "Ungültige Anfrage." }, 400);
	}

	const { firstName, lastName, email, phone, message, website } = body || {};

	// Honeypot wie in book.js (Audit-Fix A4): unsichtbares Feld, gefüllt =
	// Bot. Unauffällige 200er Antwort ohne echten Eintrag, damit der Bot
	// nicht lernt, woran er erkannt wurde.
	if (typeof website === "string" && website.trim() !== "") {
		return jsonResponse({ ok: true }, 200);
	}

	if (!firstName || !lastName || !email || !message) {
		return jsonResponse({ error: "missing_fields", message: "Bitte füllt alle Pflichtfelder aus." }, 400);
	}
	if (typeof firstName !== "string" || firstName.length > MAX_NAME_LENGTH
		|| typeof lastName !== "string" || lastName.length > MAX_NAME_LENGTH) {
		return jsonResponse({ error: "field_too_long", message: "Der Name ist zu lang." }, 400);
	}
	if (!isValidEmail(email)) {
		return jsonResponse({ error: "invalid_email", message: "Bitte gebt eine gültige E-Mail-Adresse ein." }, 400);
	}
	if (typeof phone === "string" && phone.length > MAX_PHONE_LENGTH) {
		return jsonResponse({ error: "field_too_long", message: "Die Telefonnummer ist zu lang." }, 400);
	}
	if (typeof message !== "string" || message.length > MAX_MESSAGE_LENGTH) {
		return jsonResponse({ error: "field_too_long", message: "Die Nachricht ist zu lang." }, 400);
	}

	const upstream = await fetch("https://connect.mailerlite.com/api/subscribers", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Accept": "application/json",
			"Authorization": `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			email,
			fields: {
				name: firstName,
				last_name: lastName,
				phone: typeof phone === "string" ? phone : "",
				message,
			},
			groups: [FIRST_PARLEY_ANFRAGEN_GROUP_ID],
			status: "active",
		}),
	});

	if (!upstream.ok) {
		// Upstream-Details nur ins Log, nicht an den Besucher (wie im
		// Nuxt-Original: generische deutsche Fehlermeldung).
		console.error("MailerLite API error:", upstream.status, await upstream.text());
		return jsonResponse({ error: "upstream_error", message: "Das Formular konnte nicht gesendet werden. Bitte versucht es später erneut." }, 502);
	}

	return jsonResponse({ ok: true }, 200);
}
