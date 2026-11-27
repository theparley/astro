-- BACKSTAGE, STUFE B (begonnen 27.11.2026, Rasul: „Erst B, Code später“, in „Website · Programmierung“: „Ja, lokal anfangen“).
-- Auftrag und Bauplan: Marketing-Ordner website/Uebergabe_Mitgliederbereich_2026-11.md.
-- Eine Zeile je Bereich. Das Passwort steht NIE hier, nur salz und pw_summe (PBKDF2-SHA-256, functions/_lib/backstage.js).
-- Zeiten als Text in UTC (ISO 8601). clips ist JSON: [{"stream":"<32 Zeichen>","titel":"…"}].
CREATE TABLE IF NOT EXISTS bereich (
	adresse            TEXT PRIMARY KEY,          -- parleyfilm.com/backstage/<adresse>, zugleich der Benutzername
	name               TEXT NOT NULL DEFAULT '',  -- klein unter der Überschrift
	titel              TEXT NOT NULL DEFAULT '',  -- Überschrift; ein Zeilenumbruch darin = fester Umbruch mit Trennstrich
	text               TEXT NOT NULL DEFAULT '',  -- Absätze, getrennt durch eine Leerzeile; kein HTML
	clips              TEXT NOT NULL DEFAULT '[]',
	schritt            TEXT NOT NULL DEFAULT '',  -- „Nächster Schritt“; leer = Abschnitt entfällt
	knopf              TEXT NOT NULL DEFAULT '',
	knopf_ziel         TEXT NOT NULL DEFAULT '',
	salz               TEXT NOT NULL,
	pw_summe           TEXT NOT NULL,
	link_summe         TEXT NOT NULL DEFAULT '',  -- persönlicher Link, noch unbenutzt (Schritt 4 des Bauplans)
	gesperrt           INTEGER NOT NULL DEFAULT 0,
	angelegt           TEXT NOT NULL,
	geaendert          TEXT NOT NULL,
	zuletzt_angemeldet TEXT NOT NULL DEFAULT '',  -- nur das Datum je Bereich, keine Person, keine IP-Adresse
	notiz              TEXT NOT NULL DEFAULT '',  -- nur für Rasul: für wen, wozu
	mail               TEXT NOT NULL DEFAULT ''   -- für den späteren Zahlencode, noch unbenutzt
);
-- Zähler für Fehlversuche je Adresse (Schritt 4 des Bauplans, noch unbenutzt). Auch für Adressen, die es nicht gibt.
CREATE TABLE IF NOT EXISTS fehlversuch (
	adresse TEXT PRIMARY KEY,
	anzahl  INTEGER NOT NULL DEFAULT 0,
	pause_bis TEXT NOT NULL DEFAULT ''
);
