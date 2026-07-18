// ===================================================================
// LOKALI — Widget Mode Sombre universel
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier.
// Fonctionne automatiquement avec toutes les pages LOKALI car elles
// utilisent déjà les mêmes variables CSS (--card, --border, --white, --gray, --gradient).
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-darkmode-widget.js"></script>
// ===================================================================
(function(){
  var STORAGE_KEY = "lokali_theme";

  var styleSombre = document.createElement("style");
  styleSombre.textContent =
    "html.lokali-dark{" +
    "  --card:#1E293B;" +
    "  --border:rgba(255,255,255,.12);" +
    "  --white:#F1F5F9;" +
    "  --gray:#94A3B8;" +
    "  --gradient:linear-gradient(135deg,#0B1120 0%,#0F172A 50%,#1E293B 100%);" +
    "}" +
    "html.lokali-dark input, html.lokali-dark textarea{color:#F1F5F9 !important;}" +
    "html.lokali-dark .hero h1{-webkit-text-fill-color:initial;}";
  document.head.appendChild(styleSombre);

  function appliquerTheme(theme) {
    if (theme === "dark") {
      document.documentElement.classList.add("lokali-dark");
    } else {
      document.documentElement.classList.remove("lokali-dark");
    }
    majBouton();
  }

  function themeActuel() {
    return localStorage.getItem(STORAGE_KEY) || "light";
  }

  function toggleTheme() {
    var nouveau = themeActuel() === "dark" ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, nouveau);
    appliquerTheme(nouveau);
  }

  function majBouton() {
    var btn = document.getElementById("lokaliDarkBtn");
    if (!btn) return;
    btn.textContent = themeActuel() === "dark" ? "☀️" : "🌙";
  }

  function init() {
    var btn = document.createElement("button");
    btn.id = "lokaliDarkBtn";
    btn.style.cssText = "position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:9999;" +
      "border:none;color:#fff;background:rgba(15,23,42,.85);font-size:18px;width:46px;height:46px;" +
      "border-radius:50%;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.25);display:flex;" +
      "align-items:center;justify-content:center";
    btn.onclick = toggleTheme;
    document.body.appendChild(btn);
    appliquerTheme(themeActuel());
  }

  // Applique le thème immédiatement (avant même l'affichage) pour éviter le clignotement
  if (themeActuel() === "dark") {
    document.documentElement.classList.add("lokali-dark");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
