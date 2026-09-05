#!/usr/bin/env node
// Baut die statische Website aus locales/*.json.
// Aufruf: node build.js
// Englisch landet im Stammverzeichnis, jede weitere Sprache in ihrem Unterordner.

const fs = require("fs");
const path = require("path");

// ── Vor dem Livegang anpassen ────────────────────────────────────────────────
// Die Domain der Website (ohne Schrägstrich am Ende). Muss zur Datei CNAME
// passen; nach einer Änderung build.js erneut ausführen.
const SITE_URL = "https://hybrid-editor.com";
// Platzhalter: Apple-ID der App aus App Store Connect eintragen.
const APP_STORE_URL = "https://apps.apple.com/app/idAPPLE-ID-EINSETZEN";
// ─────────────────────────────────────────────────────────────────────────────

const LANGS = [
  { code: "en", dir: "",   hreflang: "en",      ogLocale: "en_US" },
  { code: "de", dir: "de", hreflang: "de",      ogLocale: "de_DE" },
  { code: "fr", dir: "fr", hreflang: "fr",      ogLocale: "fr_FR" },
  { code: "es", dir: "es", hreflang: "es",      ogLocale: "es_ES" },
  { code: "it", dir: "it", hreflang: "it",      ogLocale: "it_IT" },
  { code: "pt", dir: "pt", hreflang: "pt",      ogLocale: "pt_PT" },
  { code: "nl", dir: "nl", hreflang: "nl",      ogLocale: "nl_NL" },
  { code: "jp", dir: "jp", hreflang: "ja",      ogLocale: "ja_JP" },
  { code: "zh", dir: "zh", hreflang: "zh-Hans", ogLocale: "zh_CN" },
];

const ROOT = __dirname;

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const urlFor = (lang) => lang.dir ? `${SITE_URL}/${lang.dir}/` : `${SITE_URL}/`;

// Kleine, konsistente Strich-Icons (16er-Raster, stroke-basiert).
const ICONS = {
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>',
  sparkles: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7z"/><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4.5 17.5l4.5-4.5 3 3 3.5-3.5 4 4"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/></svg>',
};

function render(t, lang) {
  const pageUrl = urlFor(lang);
  const prefix = lang.dir ? "../" : "";
  const abs = (p) => `${prefix}${p}`;

  // Seitenrelativ, damit die Navigation auch in einem Unterpfad
  // (z. B. GitHub Pages) und in der lokalen Vorschau funktioniert.
  const relFor = (l) => {
    if (l.code === lang.code) return "./";
    if (!lang.dir) return `${l.dir}/`;
    return l.dir ? `../${l.dir}/` : "../";
  };

  const alternates = LANGS.map((l) =>
    `  <link rel="alternate" hreflang="${l.hreflang}" href="${urlFor(l)}">`
  ).join("\n") + `\n  <link rel="alternate" hreflang="x-default" href="${SITE_URL}/">`;

  const langLinks = (cls) => LANGS.map((l) => {
    const t2 = locales[l.code];
    const current = l.code === lang.code ? ' aria-current="page"' : "";
    return `<a href="${relFor(l)}" lang="${l.hreflang}" hreflang="${l.hreflang}"${current}>${esc(t2.langName)}</a>`;
  }).join(cls === "footer" ? "\n          " : "\n            ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Hybrid",
    alternateName: t.meta.jsonLdAlternateName,
    description: t.meta.description,
    operatingSystem: "macOS 13.0",
    applicationCategory: "ProductivityApplication",
    inLanguage: LANGS.map((l) => l.hreflang),
    url: pageUrl,
    image: `${SITE_URL}/assets/img/icon-256.png`,
    author: { "@type": "Person", name: "Pascal Hugo" },
  };

  const rows = t.rows.map((row, i) => `
      <div class="feature-row${i % 2 ? " reverse" : ""}">
        <div class="feature-row-text">
          <h3>${esc(row.h3)}</h3>
          <p>${esc(row.p)}</p>
        </div>
        <figure class="shot">
          <img src="${abs(`assets/img/${lang.code}/${row.img}.jpg`)}" alt="${esc(row.alt)}" loading="lazy" width="1600" height="778">
        </figure>
      </div>`).join("\n");

  const cards = t.cards.map((c) => `
        <article class="card">
          <span class="card-icon">${ICONS[c.icon]}</span>
          <h3>${esc(c.h3)}</h3>
          <p>${esc(c.p)}</p>
        </article>`).join("\n");

  const audiences = t.audiences.map((a) => `
        <article class="aud-card">
          <h3>${esc(a.h3)}</h3>
          <p>${esc(a.p)}</p>
        </article>`).join("\n");

  const badge = (extra) => `<a class="store-badge${extra || ""}" href="${APP_STORE_URL}" rel="noopener">
            <img src="${abs(`assets/badges/badge-${lang.code}.svg`)}" alt="${esc(t.hero.badgeAlt)}" width="195" height="49"></a>`;

  return `<!doctype html>
<html lang="${lang.hreflang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(t.meta.title)}</title>
  <meta name="description" content="${esc(t.meta.description)}">
  <meta name="keywords" content="${esc(t.meta.keywords)}">
  <link rel="canonical" href="${pageUrl}">
${alternates}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Hybrid">
  <meta property="og:title" content="${esc(t.meta.title)}">
  <meta property="og:description" content="${esc(t.meta.description)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${SITE_URL}/assets/img/${lang.code}/editor.jpg">
  <meta property="og:locale" content="${lang.ogLocale}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#F9F8F7">
  <link rel="icon" type="image/svg+xml" href="${abs("assets/img/hybrid-icon.svg")}">
  <link rel="icon" type="image/png" sizes="32x32" href="${abs("assets/img/favicon-32.png")}">
  <link rel="apple-touch-icon" href="${abs("assets/img/apple-touch-icon.png")}">
  <link rel="stylesheet" href="${abs("assets/css/style.css")}">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body data-lang="${lang.code}">
  <div id="lang-banner" hidden></div>

  <header class="site-header">
    <a class="brand" href="${lang.dir ? "../" : "./"}">
      <img src="${abs("assets/img/hybrid-icon.svg")}" alt="" width="48" height="48">
      <span>Hybrid</span>
    </a>
    <nav class="site-nav" aria-label="${esc(t.nav.ariaLabel)}">
      <a href="#features">${esc(t.nav.features)}</a>
      <a href="#audiences">${esc(t.nav.audiences)}</a>
      <a href="#download">${esc(t.nav.download)}</a>
    </nav>
    <details class="lang-menu">
      <summary aria-label="${esc(t.nav.languageMenu)}">${ICONS.globe}<span>${esc(t.langName)}</span></summary>
      <div class="lang-menu-list">
            ${langLinks("menu")}
      </div>
    </details>
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow">${esc(t.hero.eyebrow)}</p>
      <h1>${esc(t.hero.h1)}</h1>
      <p class="hero-sub">${esc(t.hero.sub)}</p>
      <div class="hero-cta">
        ${badge()}
        <a class="btn-secondary" href="#features">${esc(t.hero.secondary)}</a>
      </div>
      <p class="ios-note"><span class="ios-pill">${esc(t.hero.iosPill)}</span> ${esc(t.hero.ios)}</p>
      <figure class="shot hero-shot">
        <img src="${abs(`assets/img/${lang.code}/editor.jpg`)}" alt="${esc(t.hero.shotAlt)}" width="1600" height="778" fetchpriority="high">
      </figure>
    </section>

    <section class="provenance" id="provenance">
      <div class="section-head">
        <h2>${esc(t.prov.h2)}</h2>
        <p>${esc(t.prov.p)}</p>
      </div>
      <div class="prov-demo" role="img" aria-label="${esc(t.prov.demoAria)}">
        <p class="prov-line">${esc(t.prov.demoYou)}</p>
        <p class="prov-line prov-ai">${esc(t.prov.demoAi)}<span class="prov-tag tag-ai">${esc(t.prov.aiLabel)}</span></p>
        <p class="prov-line prov-src">${esc(t.prov.demoSource)}<span class="prov-tag tag-src">${esc(t.prov.sourceLabel)}</span></p>
        <div class="prov-meter">
          <span class="meter-bar" aria-hidden="true"><i class="m-you"></i><i class="m-ai"></i><i class="m-src"></i></span>
          <span class="meter-caption">${esc(t.prov.meter)}</span>
        </div>
      </div>
      <p class="prov-promise">${esc(t.prov.promise)}</p>
    </section>

    <section class="features" id="features">
${rows}
      <div class="card-grid">
${cards}
      </div>
    </section>

    <section class="audiences" id="audiences">
      <div class="section-head">
        <h2>${esc(t.aud.h2)}</h2>
        <p>${esc(t.aud.intro)}</p>
      </div>
      <div class="aud-grid">
${audiences}
      </div>
    </section>

    <section class="ios" id="ios">
      <h2>${esc(t.ios.h2)}</h2>
      <p>${esc(t.ios.p)}</p>
    </section>

    <section class="langs" id="languages">
      <h2>${esc(t.langSection.h2)}</h2>
      <p>${esc(t.langSection.p)}</p>
    </section>

    <section class="cta" id="download">
      <h2>${esc(t.cta.h2)}</h2>
      <p>${esc(t.cta.p)}</p>
      ${badge(" badge-lg")}
      <p class="requirements">${esc(t.footer.requirements)}</p>
    </section>
  </main>

  <footer class="site-footer">
    <p class="footer-tagline">${esc(t.footer.tagline)}</p>
    <nav class="footer-langs" aria-label="${esc(t.nav.languageMenu)}">
      <span>${esc(t.footer.languagesLabel)}:</span>
          ${langLinks("footer")}
    </nav>
    <p class="footer-legal">© <span id="year">2026</span> Pascal Hugo · Hybrid · <a href="${lang.dir ? "../impressum/" : "impressum/"}" hreflang="de">${esc(t.footer.imprint)}</a> · <a href="${lang.dir ? "../datenschutz/" : "datenschutz/"}" hreflang="de">${esc(t.footer.privacy)}</a></p>
  </footer>

  <script src="${abs("assets/js/site.js")}" defer></script>
</body>
</html>
`;
}

// ── Impressum ────────────────────────────────────────────────────────────────
// Anbieterkennzeichnung nach deutschem Recht (§ 5 DDG). Die Seite ist auf
// Deutsch — der Anbieter sitzt in Deutschland — und von jeder Sprachversion
// aus dem Footer erreichbar.
function renderImpressum() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Impressum — Hybrid</title>
  <meta name="description" content="Anbieterkennzeichnung der Hybrid-Website gemäß § 5 DDG.">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE_URL}/impressum/">
  <meta name="theme-color" content="#F9F8F7">
  <link rel="icon" type="image/svg+xml" href="../assets/img/hybrid-icon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32.png">
  <link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body data-lang="de">
  <header class="site-header">
    <a class="brand" href="../">
      <img src="../assets/img/hybrid-icon.svg" alt="" width="48" height="48">
      <span>Hybrid</span>
    </a>
  </header>

  <main>
    <section class="legal">
      <h1>Impressum</h1>
      <p lang="en" class="legal-note">This legal notice is required by German law (§ 5 DDG) and therefore provided in German.</p>

      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        Pascal Hugo<br>
        Kropsburgstr. 5a<br>
        76767 Hagenbach<br>
        Deutschland
      </p>

      <h2>Kontakt</h2>
      <p>E-Mail: <a href="mailto:pascal@pascalhugo.de">pascal@pascalhugo.de</a></p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Pascal Hugo<br>
        Kropsburgstr. 5a<br>
        76767 Hagenbach
      </p>

      <h2>Umsatzsteuer-ID</h2>
      <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz:<br>DE306952683</p>

      <h2>Verbraucherstreitbeilegung</h2>
      <p>Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

      <h2>Urheberrecht</h2>
      <p>Die Inhalte dieser Website unterliegen dem deutschen Urheberrecht. Vervielfältigung, Bearbeitung und Verbreitung außerhalb der Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des Anbieters. Das „Laden im Mac App Store“-Zeichen ist eine Marke der Apple Inc.</p>

      <p class="legal-back"><a href="../">← Zurück zur Startseite</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <p class="footer-legal">© 2026 Pascal Hugo · Hybrid · <a href="../datenschutz/">Datenschutz</a></p>
  </footer>
</body>
</html>
`;
}

// ── Datenschutzerklärung ─────────────────────────────────────────────────────
// DSGVO-Pflichtseite für eine statische Seite ohne Cookies und Tracking:
// GitHub Pages als Hoster, localStorage für die Sprachwahl, Kontakt per Mail.
function renderDatenschutz() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Datenschutzerklärung — Hybrid</title>
  <meta name="description" content="Datenschutzerklärung der Hybrid-Website gemäß DSGVO.">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE_URL}/datenschutz/">
  <meta name="theme-color" content="#F9F8F7">
  <link rel="icon" type="image/svg+xml" href="../assets/img/hybrid-icon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="../assets/img/favicon-32.png">
  <link rel="apple-touch-icon" href="../assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="../assets/css/style.css">
</head>
<body data-lang="de">
  <header class="site-header">
    <a class="brand" href="../">
      <img src="../assets/img/hybrid-icon.svg" alt="" width="48" height="48">
      <span>Hybrid</span>
    </a>
  </header>

  <main>
    <section class="legal">
      <h1>Datenschutzerklärung</h1>
      <p lang="en" class="legal-note">This privacy policy is required by the GDPR and German law and therefore provided in German. In short: this site sets no cookies, runs no analytics and no tracking; the hoster GitHub Pages processes server logs, and your language choice is stored only on your own device.</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Pascal Hugo<br>
        Kropsburgstr. 5a<br>
        76767 Hagenbach<br>
        Deutschland<br>
        E-Mail: <a href="mailto:pascal@pascalhugo.de">pascal@pascalhugo.de</a>
      </p>

      <h2>2. Das Wichtigste vorab</h2>
      <p>Diese Website ist eine rein statische Informationsseite. Sie setzt keine Cookies, bindet keine Analyse-, Tracking- oder Werbedienste ein und lädt keine Inhalte von Drittservern — auch keine externen Schriften. Ein Nutzerkonto gibt es nicht, Formulare gibt es nicht.</p>

      <h2>3. Hosting bei GitHub Pages</h2>
      <p>Die Website wird bei GitHub Pages gehostet, einem Dienst der GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA. Beim Aufruf der Seiten verarbeitet GitHub technisch notwendige Daten, insbesondere die IP-Adresse des aufrufenden Geräts, Datum und Uhrzeit des Zugriffs, die abgerufene Datei und den User-Agent des Browsers (Server-Logdaten).</p>
      <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO — das berechtigte Interesse an der sicheren und zuverlässigen Bereitstellung der Website. Die Verarbeitung findet teilweise in den USA statt; GitHub, Inc. ist nach dem EU-U.S. Data Privacy Framework zertifiziert, womit ein Angemessenheitsbeschluss der EU-Kommission nach Art. 45 DSGVO greift. Näheres in der <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">Datenschutzerklärung von GitHub</a> und den Angaben zu <a href="https://docs.github.com/de/pages/getting-started-with-github-pages/what-is-github-pages#data-collection" rel="noopener">GitHub Pages</a>. Auf die Logdaten von GitHub habe ich keinen Zugriff und führe sie mit keinen anderen Daten zusammen.</p>

      <h2>4. Speicherung der Sprachwahl (localStorage)</h2>
      <p>Erkennt die Website, dass Ihre Browsersprache nicht zur angezeigten Sprachversion passt, bietet ein Hinweis den Wechsel an. Ihre Entscheidung — Wechsel oder Ausblenden — wird im localStorage Ihres Browsers gespeichert, damit der Hinweis nicht erneut erscheint. Diese Information verbleibt ausschließlich auf Ihrem Gerät, wird nicht an mich oder Dritte übertragen und enthält keine personenbezogenen Daten. Die Speicherung ist für diese von Ihnen genutzte Funktion erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); Sie können sie jederzeit über die Website-Daten-Einstellungen Ihres Browsers löschen.</p>

      <h2>5. Kontakt per E-Mail</h2>
      <p>Wenn Sie mir per E-Mail schreiben, verarbeite ich die übermittelten Daten (E-Mail-Adresse, Inhalt der Nachricht), um Ihre Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO bzw. Art. 6 Abs. 1 lit. b DSGVO, wenn sich die Anfrage auf ein Vertragsverhältnis bezieht. Die Daten werden gelöscht, sobald sie für die Bearbeitung nicht mehr erforderlich sind und keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>

      <h2>6. Externe Links</h2>
      <p>Die Website verlinkt auf den Mac App Store von Apple und auf Dokumentationsseiten von GitHub. Erst wenn Sie einem solchen Link folgen, verarbeitet der jeweilige Anbieter Daten nach seinen eigenen Datenschutzbestimmungen.</p>

      <h2>7. Ihre Rechte</h2>
      <p>Sie haben gegenüber dem Verantwortlichen das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20) sowie das Recht, einer Verarbeitung auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO aus Gründen Ihrer besonderen Situation zu widersprechen (Art. 21 DSGVO).</p>
      <p>Außerdem haben Sie das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO). Für den Verantwortlichen zuständig ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz.</p>

      <h2>8. Aktualität</h2>
      <p>Stand dieser Datenschutzerklärung: August 2026. Ändert sich die Website — etwa durch neue Funktionen oder einen anderen Hoster —, wird die Erklärung angepasst.</p>

      <p class="legal-back"><a href="../">← Zurück zur Startseite</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <p class="footer-legal">© 2026 Pascal Hugo · Hybrid · <a href="../impressum/">Impressum</a></p>
  </footer>
</body>
</html>
`;
}

// ── Bauen ────────────────────────────────────────────────────────────────────
const locales = {};
for (const lang of LANGS) {
  const file = path.join(ROOT, "locales", `${lang.code}.json`);
  locales[lang.code] = JSON.parse(fs.readFileSync(file, "utf8"));
}

for (const lang of LANGS) {
  const outDir = lang.dir ? path.join(ROOT, lang.dir) : ROOT;
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "index.html"), render(locales[lang.code], lang));
  console.log(`✓ ${lang.dir || "(root)"} — ${locales[lang.code].langName}`);
}

fs.mkdirSync(path.join(ROOT, "impressum"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "impressum", "index.html"), renderImpressum());
fs.mkdirSync(path.join(ROOT, "datenschutz"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "datenschutz", "index.html"), renderDatenschutz());
console.log("✓ impressum, datenschutz");

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.map((l) => `  <url>
    <loc>${urlFor(l)}</loc>
    <lastmod>${today}</lastmod>
${LANGS.map((a) => `    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${urlFor(a)}"/>`).join("\n")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/"/>
  </url>`).join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), sitemap);

fs.writeFileSync(path.join(ROOT, "robots.txt"), `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`);

console.log("✓ sitemap.xml, robots.txt");
