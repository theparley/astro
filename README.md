# the-parley-astro

Marketing-Website von The Parley (theparley.de). Statisches Astro-Frontend +
zwei Cloudflare Pages Functions als serverseitiger Proxy vor der
meetergo-Buchungsstrecke (`/buchen`).

## Stack

- **Astro** (statischer Output, `ClientRouter`-View-Transitions zwischen Seiten)
- **Cloudflare Pages** als Hosting + Functions-Runtime (`functions/api/*.js`)
- Kein Framework-Frontend (React/Vue/…), kein CSS-Framework — reines
  Astro-Component-CSS, Design-Tokens in `src/layouts/Layout.astro`

## Struktur

```
src/pages/         Seiten (Datei-Routing: index, buchen, impressum, datenschutz)
src/components/     Astro-Komponenten (aktiv + archivierte, siehe Kommentar-Köpfe)
src/layouts/        Layout.astro — Farb-Treppe/Tokens, globale Styles, <head>
functions/api/      Cloudflare Pages Functions (slots.js, book.js)
functions/_lib/      Gemeinsamer meetergo-API-Helper
public/             Statische Assets (Fonts, SVGs, Favicon)
```

## Entwicklung

```sh
npm install
npm run dev       # localhost:4321
npm run build      # → ./dist/
npm run preview    # Build lokal vorschauen
```

## Deploy

Push auf `main` → Cloudflare Pages baut und deployt automatisch
(ca. 3 Minuten). Kein manueller Deploy-Schritt nötig.

## `/buchen` — Secret-Setup

Die Buchungsstrecke ruft `functions/api/slots.js` und `functions/api/book.js`
auf, die als Proxy vor der meetergo-API stehen. Beide brauchen die
Umgebungsvariable `METERGO_PAT` (Personal Access Token von meetergo):

- **Produktiv (Cloudflare Pages):** als Secret in den Projekteinstellungen
  hinterlegen (Cloudflare Dashboard → Pages-Projekt → Settings →
  Environment variables → `METERGO_PAT`, Typ "Secret").
- **Lokal:** in `.dev.vars` im Projekt-Root (Datei liegt nicht im Repo,
  siehe `.gitignore` — bei Bedarf selbst anlegen: `METERGO_PAT=…`).

### Sicherheitsregel

Der PAT darf **niemals** in Client-Code (Browser-JS, `<script>`-Blöcke in
`.astro`-Dateien, o. ä.) landen — jeder Besucher könnte ihn sonst auslesen
und hätte vollen Zugriff auf das meetergo-Konto. Er existiert ausschließlich
serverseitig in `functions/_lib/meetergo.js` und den beiden Functions, die
ihn importieren. Neue Buchungs-Features immer über die Functions bauen,
nie über einen direkten Client-Aufruf an die meetergo-API.

## Entscheidungs-Dokument

Konzeptionelle Entscheidungen (Farb-Treppe, Layout-Prinzipien, Konversions-
Kapitel, Menü-Rückbau-Begründung usw.) leben nicht im Code, sondern im
Website-Brief außerhalb dieses Repos:
`letitbeam Marketing/website/Website_Astro_Neubau_Brief_2026-08.md`.
Bei Unklarheiten über das "Warum" hinter einer Design- oder Architektur-
Entscheidung dort zuerst nachsehen, bevor Code geändert wird.
