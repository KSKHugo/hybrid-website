# Hybrid — Website

Die Onepage-Website für [Hybrid](../../README.md), den Markdown-Editor für
macOS, in allen neun Sprachen der App. Statisches HTML ohne Abhängigkeiten —
jeder beliebige Webspace genügt.

## Vor dem Livegang: zwei Platzhalter ersetzen

Beide stehen am Anfang von `build.js`:

1. **`SITE_URL`** — steht auf `https://example.com`. Die echte Domain
   eintragen (ohne Schrägstrich am Ende). Sie landet in Canonical-Links,
   hreflang-Alternativen, Open-Graph-Tags, `sitemap.xml` und `robots.txt`.
2. **`APP_STORE_URL`** — steht auf `https://apps.apple.com/app/idAPPLE-ID-EINSETZEN`.
   Die Apple-ID der App aus App Store Connect einsetzen, sobald die App
   angenommen ist.

Danach einmal neu bauen:

```bash
node build.js
```

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Englische Version (Stammverzeichnis = Standard) |
| `de/ fr/ es/ it/ pt/ nl/ jp/ zh/` | Die übrigen acht Sprachversionen |
| `locales/*.json` | Sämtliche Texte, eine Datei je Sprache |
| `build.js` | Erzeugt alle Seiten, `sitemap.xml` und `robots.txt` |
| `assets/img/<sprache>/` | Screenshots der App in der jeweiligen Sprache (aus `Dokumentation/Bilder/`, auf 1600 px verkleinert) |
| `assets/badges/` | Die offiziellen, lokalisierten Mac-App-Store-Badges von Apple |
| `assets/css/style.css` | Gestaltung — Farbwelt der App (Papierweiß, Tinte, Bernstein) |
| `assets/js/site.js` | Spracherkennung samt Hinweisbanner |
| `serve.js` | Lokale Vorschau: `node serve.js` → http://localhost:8123 |

Die generierten `index.html`-Dateien sind eingecheckt, damit das Repository
direkt deploybar ist. Quelltext der Inhalte sind die `locales/*.json` —
Textänderungen dort vornehmen und `node build.js` ausführen, nie im HTML.

## Spracherkennung

Die Seite liest `navigator.languages`. Passt die Browsersprache nicht zur
angezeigten Version und gibt es sie als Übersetzung, erscheint oben ein
schmales Banner in der Zielsprache („Diese Seite gibt es auch auf …“) mit
Wechsel-Link. Wegklicken oder Wechseln wird in `localStorage` gemerkt und
nicht erneut gefragt. Es gibt keine automatische Weiterleitung — Suchmaschinen
und Nutzer landen immer auf der Version, die sie aufgerufen haben.

## SEO

- Ein `<title>` und eine Meta-Description je Sprache, auf die Schlüsselbegriffe
  zugeschnitten (KI, Markdown, Editor, Zusammenarbeit, Teilen, PR, Marketing,
  Öffentlichkeitsarbeit, Agentur, Redaktion, Journalismus, Online-Publishing, Mac).
- `hreflang`-Alternativen auf jeder Seite und in der `sitemap.xml`;
  `x-default` zeigt auf die englische Version im Stamm.
- Strukturierte Daten (`SoftwareApplication`, schema.org) auf jeder Seite.
- Open-Graph- und Twitter-Card-Tags mit sprachrichtigem Screenshot.

## Deployment

Den kompletten Ordner (ohne `.git`) auf einen beliebigen statischen Host
legen — GitHub Pages, Cloudflare Pages, Netlify oder klassischer Webspace.
Die Seiten setzen voraus, dass sie im Stammverzeichnis der Domain liegen
(Sprachlinks sind wurzelrelativ, z. B. `/de/`).

## Eine Sprache ergänzen

1. `locales/<code>.json` anlegen (Struktur wie `en.json`).
2. In `build.js` die Sprache in `LANGS` eintragen.
3. Screenshots nach `assets/img/<code>/` legen, Badge nach
   `assets/badges/badge-<code>.svg` (Quelle: `Website Sachen/Download-on-the-Mac-App-Store/`).
4. In `assets/js/site.js` `SITE_DIRS`, `DIR_LANG` und `STRINGS` ergänzen.
5. `node build.js`.
