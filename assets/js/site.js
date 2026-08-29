// Erkennt die Browsersprache und bietet die passende Sprachversion an.
// Die Wahl (Wechsel oder Ablehnen) wird gemerkt und nicht erneut gefragt.
(function () {
  "use strict";

  // Browser-Sprachcode → Unterordner der Website ("" = Englisch im Stamm)
  var SITE_DIRS = {
    en: "", de: "de", fr: "fr", es: "es", it: "it",
    pt: "pt", nl: "nl", ja: "jp", zh: "zh"
  };

  // Banner-Texte, jeweils in der Sprache, die angeboten wird.
  var STRINGS = {
    en: { text: "This page is also available in English.", link: "View in English", close: "Dismiss" },
    de: { text: "Diese Seite gibt es auch auf Deutsch.", link: "Auf Deutsch ansehen", close: "Schließen" },
    fr: { text: "Cette page existe aussi en français.", link: "Voir en français", close: "Fermer" },
    es: { text: "Esta página también está disponible en español.", link: "Ver en español", close: "Cerrar" },
    it: { text: "Questa pagina è disponibile anche in italiano.", link: "Vedi in italiano", close: "Chiudi" },
    pt: { text: "Esta página também está disponível em português.", link: "Ver em português", close: "Fechar" },
    nl: { text: "Deze pagina is ook beschikbaar in het Nederlands.", link: "Bekijk in het Nederlands", close: "Sluiten" },
    ja: { text: "このページは日本語でもご覧いただけます。", link: "日本語で表示", close: "閉じる" },
    zh: { text: "本页面也提供简体中文版。", link: "查看中文版", close: "关闭" }
  };

  // Unterordner → Sprachcode (Umkehrung von SITE_DIRS)
  var DIR_LANG = { "": "en", de: "de", fr: "fr", es: "es", it: "it", pt: "pt", nl: "nl", jp: "ja", zh: "zh" };

  var KEY = "hybrid-lang-choice";
  var current = document.body.getAttribute("data-lang") || "en";
  var currentLang = DIR_LANG[current] || current; // data-lang nutzt Ordnernamen (jp)

  function preferredLang() {
    var prefs = navigator.languages || [navigator.language || ""];
    for (var i = 0; i < prefs.length; i++) {
      var primary = String(prefs[i]).toLowerCase().split("-")[0];
      if (Object.prototype.hasOwnProperty.call(SITE_DIRS, primary)) return primary;
    }
    return null;
  }

  function siteRoot() {
    // Seiten liegen im Stamm oder genau eine Ebene tief.
    var path = location.pathname.replace(/index\.html?$/, "");
    var dir = document.body.getAttribute("data-lang") === "en" ? "" : current;
    if (dir && path.length >= dir.length + 2) {
      return path.slice(0, path.length - dir.length - 1);
    }
    return path;
  }

  try {
    var stored = localStorage.getItem(KEY);
    var target = preferredLang();
    if (target && target !== currentLang && stored !== "dismissed" && stored !== target) {
      var s = STRINGS[target];
      var dir = SITE_DIRS[target];
      var banner = document.getElementById("lang-banner");
      if (banner && s) {
        var span = document.createElement("span");
        span.textContent = s.text;

        var link = document.createElement("a");
        link.href = siteRoot() + (dir ? dir + "/" : "");
        link.textContent = s.link;
        link.setAttribute("lang", target);
        link.addEventListener("click", function () {
          try { localStorage.setItem(KEY, target); } catch (e) { /* egal */ }
        });

        var close = document.createElement("button");
        close.type = "button";
        close.textContent = "×";
        close.setAttribute("aria-label", s.close);
        close.addEventListener("click", function () {
          banner.hidden = true;
          try { localStorage.setItem(KEY, "dismissed"); } catch (e) { /* egal */ }
        });

        banner.setAttribute("lang", target);
        banner.appendChild(span);
        banner.appendChild(link);
        banner.appendChild(close);
        banner.hidden = false;
      }
    }
  } catch (e) { /* Privatmodus o. Ä. — Banner entfällt */ }

  // Sprachmenü schließen, wenn daneben geklickt wird.
  var menu = document.querySelector(".lang-menu");
  if (menu) {
    document.addEventListener("click", function (ev) {
      if (menu.open && !menu.contains(ev.target)) menu.open = false;
    });
  }

  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
