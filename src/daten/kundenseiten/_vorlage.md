---
# VORLAGE FÜR EINE KUNDENSEITE. Diese Datei wird keine Seite (Dateien mit _ am Anfang zählen nicht).
#
# Neue Kundenseite: diese Datei kopieren und nach der Adresse benennen, zum Beispiel hug-ka.md für
# parleyfilm.com/hug-ka. Nur Kleinbuchstaben, Ziffern und Bindestriche. Die Adresse ist die Kurzform, die der Kunde
# selbst benutzt (seine Domain, seine Mailadressen).
#
# Die Seite trägt immer die Überschrift „Akteneinsicht“. Sie steht nicht in der Sitemap und trägt noindex.

# Steht klein unter der Überschrift. Weglassen = keine Unterzeile.
kunde: Name des Kunden

# Passwort: ja oder nein. Fehlt die Zeile, gilt ja.
# Bei ja braucht die Seite einen Wert bei Cloudflare (Pages, Einstellungen, Variablen und Geheimnisse), sonst bleibt
# sie zu. Der Name des Werts: AKTE_ und die Adresse in Großbuchstaben, Bindestrich wird Unterstrich.
# hug-ka wird AKTE_HUG_KA. Das Passwort selbst steht NIE in dieser Datei.
# Am Telefon diktierbar: zwei Wörter und eine Zahl. Groß und klein, Leerzeichen und Bindestriche sind beim Eintippen egal.
passwort: ja

# Videos aus Cloudflare Stream. stream = die Kennung des Videos (32 Zeichen), titel = Zeile darunter (darf fehlen).
# Keine Videos: die Zeile „videos:“ und alles darunter löschen.
videos:
  - stream: 00000000000000000000000000000000
    titel: Titel des Videos

# Der nächste Schritt, ein bis zwei Sätze. Fehlt die Zeile, entfällt der Abschnitt samt Knopf.
naechster_schritt: Was als Nächstes dran ist.
# Aufschrift und Ziel des Knopfs. Fehlen sie, gilt „Termin finden“ und /termin.
knopf: Termin finden
knopf_ziel: /termin
---

Hier stehen zwei Sätze Zusammenhang. Wer nur die Adresse bekommt, soll ohne den Absender verstehen, worum es geht.
