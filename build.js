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

// Sprachfassung der App-Datenschutzerklärung je Website-Sprache
// ("" = die deutsche Hauptseite; die pt-Seiten sprechen europäisches
// Portugiesisch, also pt-pt statt der brasilianischen pt-Fassung).
const APP_PRIVACY_DIR = {
  de: "", en: "en", fr: "fr", es: "es", it: "it",
  pt: "pt-pt", nl: "nl", jp: "jp", zh: "zh",
};

const esc = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Überschriften: **so markierte** Phrasen werden bernsteinfarben —
// dasselbe Muster wie in den App-Store-Bildern.
const hl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<span class="hl">$1</span>');

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
      <h1>${hl(t.hero.h1)}</h1>
      <p class="hero-sub">${esc(t.hero.sub)}</p>
      <div class="hero-cta">
        ${badge()}
        <a class="btn-secondary" href="#features">${esc(t.hero.secondary)}</a>
      </div>
      <p class="trial-note">${esc(t.hero.trial)}</p>
      <p class="ios-note"><span class="ios-pill">${esc(t.hero.iosPill)}</span> ${esc(t.hero.ios)}</p>
      <figure class="shot hero-shot">
        <img src="${abs(`assets/img/${lang.code}/editor.jpg`)}" alt="${esc(t.hero.shotAlt)}" width="1600" height="778" fetchpriority="high">
      </figure>
    </section>

    <section class="provenance" id="provenance">
      <div class="section-head">
        <h2>${hl(t.prov.h2)}</h2>
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
        <h2>${hl(t.aud.h2)}</h2>
        <p>${esc(t.aud.intro)}</p>
      </div>
      <div class="aud-grid">
${audiences}
      </div>
    </section>

    <section class="pro" id="pro">
      <div class="section-head">
        <h2>${esc(t.pro.h2)}</h2>
        <p>${esc(t.pro.intro)}</p>
      </div>
      <div class="pro-grid">
${t.pro.points.map((p) => `        <article class="pro-point">
          <h3>${esc(p.h3)}</h3>
          <p>${esc(p.p)}</p>
        </article>`).join("\n")}
      </div>
    </section>

    <section class="ios" id="ios">
      <h2>${hl(t.ios.h2)}</h2>
      <p>${esc(t.ios.p)}</p>
    </section>

    <section class="langs" id="languages">
      <h2>${hl(t.langSection.h2)}</h2>
      <p>${esc(t.langSection.p)}</p>
    </section>

    <section class="cta" id="download">
      <h2>${hl(t.cta.h2)}</h2>
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
    <p class="footer-legal">© <span id="year">2026</span> Pascal Hugo · Hybrid · <a href="${lang.dir ? "../impressum/" : "impressum/"}" hreflang="de">${esc(t.footer.imprint)}</a> · <a href="${lang.dir ? "../datenschutz/" : "datenschutz/"}" hreflang="de">${esc(t.footer.privacy)}</a> · <a href="${prefix}datenschutz-app/${APP_PRIVACY_DIR[lang.code] ? APP_PRIVACY_DIR[lang.code] + "/" : ""}" hreflang="${APP_PRIVACY_DIR[lang.code] ? lang.hreflang : "de"}">${esc(t.footer.privacyApp)}</a> · <a href="${prefix}support/">${esc(t.footer.support)}</a></p>
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
      <p>Diese Erklärung betrifft die Website. Für die Mac-App gilt die eigene <a href="../datenschutz-app/">Datenschutzerklärung für die Hybrid-App</a>.</p>

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

// ── Datenschutzerklärung für die App ─────────────────────────────────────────
// Zum Verlinken aus der App und für das Feld „Privacy Policy URL" in App Store
// Connect. Deutsch ist die verbindliche Fassung, die vollständige englische
// Übersetzung folgt auf derselben Seite — eine URL genügt für alle Länder.
function renderAppDatenschutz() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Datenschutzerklärung für die Hybrid-App</title>
  <meta name="description" content="Datenschutzerklärung der Mac-App Hybrid: keine eigenen Server, keine Analyse-Dienste — Dokumente bleiben lokal oder in Ihrer iCloud, das Abo läuft über Apple.">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE_URL}/datenschutz-app/">
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
      <h1>Datenschutzerklärung für die Hybrid-App</h1>
      <p lang="en" class="legal-note"><a href="#english">English version below.</a> In short: Hybrid has no account system and no servers of its own, and collects no analytics. Your documents stay on your Mac or in your own iCloud; the subscription is handled entirely by Apple.</p>
      <p class="legal-note">Weitere Sprachen: <a href="en/" lang="en">English</a> · <a href="fr/" lang="fr">Français</a> · <a href="es/" lang="es">Español</a> · <a href="it/" lang="it">Italiano</a> · <a href="pt/" lang="pt-BR">Português (Brasil)</a> · <a href="pt-pt/" lang="pt-PT">Português (Portugal)</a> · <a href="nl/" lang="nl">Nederlands</a> · <a href="jp/" lang="ja">日本語</a> · <a href="zh/" lang="zh-Hans">简体中文</a></p>

      <h2>1. Verantwortlicher</h2>
      <p>
        Pascal Hugo<br>
        Kropsburgstr. 5a<br>
        76767 Hagenbach<br>
        Deutschland<br>
        E-Mail: <a href="mailto:pascal@pascalhugo.de">pascal@pascalhugo.de</a>
      </p>

      <h2>2. Das Wichtigste vorab</h2>
      <p>Hybrid ist ein Markdown-Editor für macOS. Die App hat kein Konto-System, betreibt keine eigenen Server und enthält keine Analyse-, Werbe- oder Tracking-Dienste. Ihre Dokumente werden ausschließlich auf Ihrem Mac und — wenn Sie das nutzen — in Ihrem eigenen iCloud-Konto verarbeitet. Ich als Entwickler habe zu keinem Zeitpunkt Zugriff auf Ihre Dokumente, deren Inhalte oder Metadaten.</p>

      <h2>3. Dokumente und Herkunftsdaten</h2>
      <p>Hybrid speichert Dokumente als Markdown-Dateien dort, wo Sie sie ablegen — lokal oder z. B. in iCloud Drive. Die Herkunftsinformationen, die Hybrid festhält (welche Passage von Ihnen, einer KI, einer benannten Quelle oder einer anderen Person stammt, samt Namen der Beteiligten), liegen als unsichtbarer Kommentar in der Datei selbst. Diese Verarbeitung findet vollständig auf Ihrem Gerät statt.</p>

      <h2>4. iCloud und Zusammenarbeit (CloudKit)</h2>
      <p>Die Zusammenarbeit in Echtzeit und der Versionsverlauf nutzen Apples CloudKit-Dienst. Die Daten liegen dabei im iCloud-Konto des Dokument-Besitzers; Apple verarbeitet sie als dessen Anbieter nach den <a href="https://www.apple.com/legal/privacy/" rel="noopener">Datenschutzbestimmungen von Apple</a>. Ich habe darauf keinen Zugriff.</p>
      <p>Wenn Sie an einer Zusammenarbeit teilnehmen, sehen die anderen aktuell Teilnehmenden Ihren Namen (wie in macOS bzw. Ihrem Apple-Konto hinterlegt), Ihre Beiträge und eine Tipp-Anzeige, während Sie schreiben. Eingeladene sehen Beiträge früherer Teilnehmer nur anonymisiert als „Anderer Teilnehmer"; die vollständige Mitwirkenden-Historie und die Anteils-Statistik sieht nur der Besitzer. Der Versionsverlauf liegt in Ihrem eigenen iCloud-Konto, nicht in der Datei — weitergegebene Dateien enthalten keine Altfassungen.</p>

      <h2>5. Abo und Testphase (App Store)</h2>
      <p>Das Abonnement wird vollständig über Apples App Store abgewickelt (StoreKit). Kauf, Bezahlung, Rechnung, Verlängerung und Kündigung verarbeitet Apple nach eigenen Datenschutzbestimmungen; ich erhalte dabei weder Ihren Namen noch Ihre Adresse oder Zahlungsdaten. Die App fragt beim App Store lediglich ab, ob ein gültiges Abo besteht, um die Funktionen freizuschalten. Der Beginn der kostenlosen Testphase wird lokal im Schlüsselbund Ihres Macs gespeichert. Verwalten und kündigen können Sie das Abo jederzeit in den App-Store-Einstellungen Ihres Apple-Kontos.</p>

      <h2>6. Weitergabe an KI-Tools — nur auf Ihren Befehl</h2>
      <p>Die Funktion „Bereitstellen für KI-Tool" kopiert den Dokumenttext in die Zwischenablage und öffnet das von Ihnen eingestellte Ziel (z. B. ChatGPT, Claude, Perplexity, eine eigene App oder Webseite). Das geschieht ausschließlich, wenn Sie den Befehl selbst auslösen — Hybrid sendet niemals von sich aus Inhalte an KI-Dienste. Ab der Übergabe gelten die Datenschutzbestimmungen des jeweiligen Anbieters.</p>

      <h2>7. Apple-Schreibtools</h2>
      <p>Nutzen Sie Apples Schreibtools (Korrekturlesen, Umschreiben, Zusammenfassen; ab macOS 15.2), verarbeitet Apple den ausgewählten Text nach den Regeln von Apple Intelligence — auf dem Gerät oder in Apples Private Cloud Compute. Diese Verarbeitung liegt bei Apple; Hybrid reicht nur Ihre Auswahl an das System weiter.</p>

      <h2>8. Touch-ID-Sperre</h2>
      <p>Die optionale Sperre nutzt die Biometrie-Funktionen von macOS. Ihre biometrischen Daten verbleiben in der Secure Enclave Ihres Macs und sind für Hybrid nicht zugänglich — die App erfährt nur, ob das Entsperren erfolgreich war.</p>

      <h2>9. Keine Datenerhebung durch den Entwickler</h2>
      <p>Hybrid kontaktiert keine Server des Entwicklers und enthält keine Analyse- oder Absturzberichts-Dienste von Drittanbietern. Absturzberichte erreichen mich höchstens anonymisiert über Apple — und nur, wenn Sie die Weitergabe von Diagnosedaten in den macOS-Einstellungen selbst erlaubt haben.</p>

      <h2>10. Ihre Rechte</h2>
      <p>Soweit ich überhaupt personenbezogene Daten verarbeite (praktisch nur bei E-Mail-Kontakt), haben Sie die Rechte aus Art. 15–21 DSGVO: Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch. Außerdem haben Sie das Recht auf Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO); zuständig ist der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Rheinland-Pfalz, Hintere Bleiche 34, 55116 Mainz. Für Daten in Ihrem iCloud-Konto und beim App Store ist Apple Ihr Ansprechpartner.</p>

      <h2>11. Aktualität</h2>
      <p>Stand: September 2026. Ändert sich die App — etwa durch neue Funktionen —, wird diese Erklärung angepasst. Für die Website gilt die eigene <a href="../datenschutz/">Datenschutzerklärung der Website</a>.</p>

      <hr style="border: 0; border-top: 1px solid #E8E4E0; margin: 3em 0;">

      <div lang="en" id="english">
        <h1>Privacy Policy for the Hybrid App</h1>
        <p class="legal-note">This is a courtesy translation; the German version above is the binding one.</p>

        <h2>1. Controller</h2>
        <p>
          Pascal Hugo<br>
          Kropsburgstr. 5a<br>
          76767 Hagenbach<br>
          Germany<br>
          E-mail: <a href="mailto:pascal@pascalhugo.de">pascal@pascalhugo.de</a>
        </p>

        <h2>2. The essentials first</h2>
        <p>Hybrid is a Markdown editor for macOS. The app has no account system, operates no servers of its own, and contains no analytics, advertising, or tracking services. Your documents are processed exclusively on your Mac and — if you use it — in your own iCloud account. As the developer, I never have access to your documents, their contents, or their metadata.</p>

        <h2>3. Documents and provenance data</h2>
        <p>Hybrid stores documents as Markdown files wherever you keep them — locally or, for example, in iCloud Drive. The provenance information Hybrid records (which passage came from you, an AI, a named source, or another person, including the names of contributors) lives as an invisible comment inside the file itself. This processing happens entirely on your device.</p>

        <h2>4. iCloud and collaboration (CloudKit)</h2>
        <p>Real-time collaboration and the version history use Apple's CloudKit service. The data resides in the document owner's iCloud account; Apple processes it as that person's provider under <a href="https://www.apple.com/legal/privacy/" rel="noopener">Apple's privacy policy</a>. I have no access to it.</p>
        <p>When you take part in a collaboration, the other current participants see your name (as set in macOS or your Apple account), your contributions, and a typing indicator while you write. Invitees see contributions of earlier participants only anonymized as "Other participant"; the full contributor history and the share statistics are visible to the owner alone. The version history lives in your own iCloud account, not in the file — files you pass on contain no old versions.</p>

        <h2>5. Subscription and free trial (App Store)</h2>
        <p>The subscription is handled entirely through Apple's App Store (StoreKit). Purchase, payment, billing, renewal, and cancellation are processed by Apple under Apple's own privacy policy; I receive neither your name nor your address or payment details. The app merely asks the App Store whether a valid subscription exists in order to unlock its features. The start of the free trial is stored locally in your Mac's keychain. You can manage and cancel the subscription at any time in the App Store settings of your Apple account.</p>

        <h2>6. Handing text to AI tools — only on your command</h2>
        <p>The "Provide to AI tool" feature copies the document text to the clipboard and opens the destination you configured (e.g. ChatGPT, Claude, Perplexity, an app or website of your choice). This happens only when you trigger the command yourself — Hybrid never sends content to AI services on its own. From the moment of handover, the privacy policy of the respective provider applies.</p>

        <h2>7. Apple Writing Tools</h2>
        <p>If you use Apple's Writing Tools (proofread, rewrite, summarize; macOS 15.2 or later), Apple processes the selected text under the rules of Apple Intelligence — on device or in Apple's Private Cloud Compute. This processing is Apple's; Hybrid only passes your selection to the system.</p>

        <h2>8. Touch ID lock</h2>
        <p>The optional lock uses the biometric features of macOS. Your biometric data remains in your Mac's Secure Enclave and is not accessible to Hybrid — the app only learns whether unlocking succeeded.</p>

        <h2>9. No data collection by the developer</h2>
        <p>Hybrid contacts no developer servers and contains no third-party analytics or crash-reporting services. Crash reports reach me at most in anonymized form via Apple — and only if you have allowed the sharing of diagnostic data in your macOS settings yourself.</p>

        <h2>10. Your rights</h2>
        <p>To the extent that I process personal data at all (in practice only when you contact me by e-mail), you have the rights under Articles 15–21 GDPR: access, rectification, erasure, restriction, data portability, and objection. You also have the right to lodge a complaint with a supervisory authority (Article 77 GDPR); the authority responsible for me is the State Commissioner for Data Protection and Freedom of Information of Rhineland-Palatinate, Hintere Bleiche 34, 55116 Mainz, Germany. For data in your iCloud account and at the App Store, Apple is your point of contact.</p>

        <h2>11. Currency</h2>
        <p>Version: September 2026. If the app changes — for example through new features — this policy will be updated. For the website, the separate <a href="../datenschutz/">website privacy policy</a> applies.</p>
      </div>

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

// ── Übersetzte Fassungen der App-Datenschutzerklärung ────────────────────────
// Je eine Seite unter /datenschutz-app/<code>/ — für die Datenschutz-URL-Felder
// in App Store Connect, die pro Store-Sprache gefüllt werden. Verbindlich
// bleibt die deutsche Fassung eine Ebene höher; jede Übersetzung sagt das.
function renderAppPrivacyLocale(code, d) {
  const sections = d.sections.map((s) => `      <h2>${s.h}</h2>
${s.html.map((p) => `      <p>${p}</p>`).join("\n")}`).join("\n\n");
  return `<!doctype html>
<html lang="${d.htmlLang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${d.title}</title>
  <meta name="description" content="${d.desc}">
  <meta name="robots" content="noindex, follow">
  <link rel="canonical" href="${SITE_URL}/datenschutz-app/${code}/">
  <meta name="theme-color" content="#F9F8F7">
  <link rel="icon" type="image/svg+xml" href="../../assets/img/hybrid-icon.svg">
  <link rel="icon" type="image/png" sizes="32x32" href="../../assets/img/favicon-32.png">
  <link rel="apple-touch-icon" href="../../assets/img/apple-touch-icon.png">
  <link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body data-lang="${d.homeDir || "en"}">
  <header class="site-header">
    <a class="brand" href="../../${d.homeDir ? d.homeDir + "/" : ""}">
      <img src="../../assets/img/hybrid-icon.svg" alt="" width="48" height="48">
      <span>Hybrid</span>
    </a>
  </header>

  <main>
    <section class="legal">
      <h1>${d.title}</h1>
      <p class="legal-note">${d.note}</p>

${sections}

      <p class="legal-back"><a href="../../${d.homeDir ? d.homeDir + "/" : ""}">${d.back}</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <p class="footer-legal">© 2026 Pascal Hugo · Hybrid · <a href="../../impressum/">Impressum</a></p>
  </footer>
</body>
</html>
`;
}

// ── Support-Seite ────────────────────────────────────────────────────────────
// Für das Feld „Support-URL" in App Store Connect: E-Mail-Kontakt, zwei Sätze,
// Link auf die App-Datenschutzerklärung — Deutsch zuerst, darunter alle
// weiteren Store-Sprachen, damit eine URL für jedes Land genügt.
const SUPPORT_BLOCKS = [
  { lang: "en", h2: "Support (English)", mail: "E-mail:", privacyDir: "en",
    p1: "Questions, problems, or requests about Hybrid? Send me an e-mail — I'm happy to help. It helps to include your macOS and Hybrid version (About Hybrid) and, for problems, a short description of the steps.",
    privacyPre: "How Hybrid handles your data is described in the ", privacyLabel: "app privacy policy", privacyPost: "." },
  { lang: "fr", h2: "Assistance (Français)", mail: "E-mail :", privacyDir: "fr",
    p1: "Des questions, des problèmes ou des suggestions à propos de Hybrid ? Écrivez-moi un e-mail — je vous aiderai volontiers. Il est utile d'indiquer vos versions de macOS et de Hybrid (À propos de Hybrid) et, en cas de problème, une brève description des étapes.",
    privacyPre: "La manière dont Hybrid traite vos données est décrite dans la ", privacyLabel: "politique de confidentialité de l'app", privacyPost: "." },
  { lang: "es", h2: "Soporte (Español)", mail: "Correo:", privacyDir: "es",
    p1: "¿Preguntas, problemas o sugerencias sobre Hybrid? Escríbeme un correo — te ayudaré con gusto. Ayuda indicar tu versión de macOS y de Hybrid (Acerca de Hybrid) y, si hay problemas, una breve descripción de los pasos.",
    privacyPre: "Cómo trata Hybrid tus datos se describe en la ", privacyLabel: "política de privacidad de la app", privacyPost: "." },
  { lang: "it", h2: "Supporto (Italiano)", mail: "E-mail:", privacyDir: "it",
    p1: "Domande, problemi o suggerimenti su Hybrid? Scrivimi un'e-mail — sarò felice di aiutarti. È utile indicare la versione di macOS e di Hybrid (Informazioni su Hybrid) e, in caso di problemi, una breve descrizione dei passaggi.",
    privacyPre: "Come Hybrid tratta i tuoi dati è descritto nell'", privacyLabel: "informativa sulla privacy dell'app", privacyPost: "." },
  { lang: "pt-BR", h2: "Suporte (Português do Brasil)", mail: "E-mail:", privacyDir: "pt",
    p1: "Perguntas, problemas ou sugestões sobre o Hybrid? Envie-me um e-mail — ficarei feliz em ajudar. Ajuda incluir sua versão do macOS e do Hybrid (Sobre o Hybrid) e, em caso de problemas, uma breve descrição dos passos.",
    privacyPre: "Como o Hybrid trata seus dados está descrito na ", privacyLabel: "política de privacidade do app", privacyPost: "." },
  { lang: "pt-PT", h2: "Suporte (Português de Portugal)", mail: "E-mail:", privacyDir: "pt-pt",
    p1: "Perguntas, problemas ou sugestões sobre o Hybrid? Envie-me um e-mail — terei todo o gosto em ajudar. Ajuda incluir a sua versão do macOS e do Hybrid (Acerca do Hybrid) e, em caso de problemas, uma breve descrição dos passos.",
    privacyPre: "Como o Hybrid trata os seus dados está descrito na ", privacyLabel: "política de privacidade da app", privacyPost: "." },
  { lang: "nl", h2: "Ondersteuning (Nederlands)", mail: "E-mail:", privacyDir: "nl",
    p1: "Vragen, problemen of suggesties over Hybrid? Stuur me een e-mail — ik help je graag. Het helpt om je macOS- en Hybrid-versie te vermelden (Over Hybrid) en bij problemen een korte beschrijving van de stappen.",
    privacyPre: "Hoe Hybrid met je gegevens omgaat, staat in het ", privacyLabel: "privacybeleid van de app", privacyPost: "." },
  { lang: "ja", h2: "サポート（日本語）", mail: "メール:", privacyDir: "jp",
    p1: "Hybridについての質問・問題・ご要望は、メールでお知らせください。喜んでお手伝いします。macOSとHybridのバージョン（「Hybridについて」）と、問題の場合は手順の簡単な説明を添えていただけると助かります。",
    privacyPre: "Hybridのデータの扱いは", privacyLabel: "アプリのプライバシーポリシー", privacyPost: "に記載しています。" },
  { lang: "zh-Hans", h2: "支持（简体中文）", mail: "电子邮件:", privacyDir: "zh",
    p1: "关于Hybrid有疑问、问题或建议？请给我发电子邮件——我很乐意帮忙。请附上你的macOS和Hybrid版本（「关于Hybrid」），如遇问题，最好再简单描述一下操作步骤。",
    privacyPre: "Hybrid如何处理你的数据，见", privacyLabel: "应用隐私政策", privacyPost: "。" },
];

function renderSupport() {
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Support — Hybrid</title>
  <meta name="description" content="Support für die Mac-App Hybrid: Fragen, Probleme und Wünsche per E-Mail an den Entwickler.">
  <link rel="canonical" href="${SITE_URL}/support/">
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
      <h1>Support</h1>

      <p>Fragen, Probleme oder Wünsche zu Hybrid? Schreiben Sie mir eine E-Mail — ich helfe gern weiter. Hilfreich sind Ihre macOS- und Hybrid-Version (Über Hybrid) und, bei Problemen, eine kurze Beschreibung der Schritte.</p>
      <p>E-Mail: <a href="mailto:pascal@pascalhugo.de">pascal@pascalhugo.de</a></p>
      <p>Wie Hybrid mit Ihren Daten umgeht, steht in der <a href="../datenschutz-app/">Datenschutzerklärung für die App</a>.</p>

${SUPPORT_BLOCKS.map((b) => `      <hr style="border: 0; border-top: 1px solid #E8E4E0; margin: 3em 0;">

      <div lang="${b.lang}">
        <h2>${b.h2}</h2>
        <p>${b.p1}</p>
        <p>${b.mail} <a href="mailto:pascal@pascalhugo.de">pascal@pascalhugo.de</a></p>
        <p>${b.privacyPre}<a href="../datenschutz-app/${b.privacyDir}/">${b.privacyLabel}</a>${b.privacyPost}</p>
      </div>`).join("\n\n")}

      <p class="legal-back"><a href="../">← Zurück zur Startseite</a></p>
    </section>
  </main>

  <footer class="site-footer">
    <p class="footer-legal">© 2026 Pascal Hugo · Hybrid · <a href="../impressum/">Impressum</a> · <a href="../datenschutz/">Datenschutz</a></p>
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
fs.mkdirSync(path.join(ROOT, "datenschutz-app"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "datenschutz-app", "index.html"), renderAppDatenschutz());
const appPrivacy = JSON.parse(fs.readFileSync(path.join(ROOT, "locales", "app-privacy.json"), "utf8"));
for (const code of Object.keys(appPrivacy)) {
  const dir = path.join(ROOT, "datenschutz-app", code);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), renderAppPrivacyLocale(code, appPrivacy[code]));
}
fs.mkdirSync(path.join(ROOT, "support"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "support", "index.html"), renderSupport());
console.log(`✓ impressum, datenschutz, datenschutz-app (+${Object.keys(appPrivacy).length} Sprachen), support`);

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
