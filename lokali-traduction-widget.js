// ===================================================================
// LOKALI — Widget Traduction automatique (FR / EN / PT)
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier.
// Gratuit, sans clé API (basé sur Google Translate).
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-traduction-widget.js"></script>
// ===================================================================
(function(){

  // Style : cache l'interface Google par défaut, ne garde que notre bouton perso
  var style = document.createElement("style");
  style.textContent =
    ".goog-te-banner-frame, .goog-te-gadget-icon, .goog-logo-link, .goog-te-gadget span{display:none !important;}" +
    "body{top:0 !important;}" +
    ".goog-te-gadget{font-size:0 !important;height:0;overflow:hidden;}" +
    "#lokaliTradMenu{position:fixed;top:66px;right:14px;z-index:9999;background:#fff;border-radius:14px;" +
    "box-shadow:0 8px 22px rgba(0,0,0,.2);padding:8px;display:none;flex-direction:column;gap:4px;min-width:120px;}" +
    "#lokaliTradMenu.open{display:flex;}" +
    "#lokaliTradMenu button{border:none;background:transparent;text-align:left;padding:8px 10px;border-radius:8px;" +
    "font-size:13px;font-weight:700;color:#1E293B;cursor:pointer;font-family:'Segoe UI',Arial,sans-serif;}" +
    "#lokaliTradMenu button:hover{background:rgba(249,115,22,.1);}" +
    "#lokaliTradBtn{position:fixed;top:14px;right:14px;z-index:9999;border:none;color:#fff;" +
    "background:rgba(15,23,42,.85);font-size:16px;width:40px;height:40px;border-radius:50%;cursor:pointer;" +
    "box-shadow:0 8px 22px rgba(0,0,0,.25);}";
  document.head.appendChild(style);

  // Zone technique invisible utilisée par Google Translate
  var mount = document.createElement("div");
  mount.id = "google_translate_element";
  mount.style.cssText = "position:fixed;top:-999px;left:-999px;";
  document.body.appendChild(mount);

  window.initGoogleTranslateLokali = function() {
    new google.translate.TranslateElement(
      { pageLanguage: "fr", includedLanguages: "fr,en,pt", autoDisplay: false },
      "google_translate_element"
    );
  };

  var script = document.createElement("script");
  script.src = "https://translate.google.com/translate_a/element.js?cb=initGoogleTranslateLokali";
  document.body.appendChild(script);

  function changerLangue(code) {
    var tentatives = 0;
    var interval = setInterval(function(){
      var combo = document.querySelector(".goog-te-combo");
      tentatives++;
      if (combo) {
        combo.value = code;
        combo.dispatchEvent(new Event("change"));
        clearInterval(interval);
      } else if (tentatives > 20) {
        clearInterval(interval);
      }
    }, 300);
    document.getElementById("lokaliTradMenu").classList.remove("open");
  }

  function init() {
    var btn = document.createElement("button");
    btn.id = "lokaliTradBtn";
    btn.textContent = "🌐";
    btn.onclick = function(){
      document.getElementById("lokaliTradMenu").classList.toggle("open");
    };

    var menu = document.createElement("div");
    menu.id = "lokaliTradMenu";
    menu.innerHTML =
      '<button onclick="window.__lokaliChangerLangue(\'fr\')">🇫🇷 Français</button>' +
      '<button onclick="window.__lokaliChangerLangue(\'en\')">🇬🇧 English</button>' +
      '<button onclick="window.__lokaliChangerLangue(\'pt\')">🇵🇹 Português</button>';

    window.__lokaliChangerLangue = changerLangue;

    document.body.appendChild(btn);
    document.body.appendChild(menu);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
