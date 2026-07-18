// ===================================================================
// LOKALI — Widget Favoris universel
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier.
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-favoris-widget.js"></script>
// ===================================================================
(function(){
  var STORAGE_KEY = "lokali_favoris";

  function getFavoris() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e) { return []; }
  }
  function setFavoris(liste) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(liste));
  }
  function estFavori(url) {
    return getFavoris().some(function(f){ return f.url === url; });
  }
  function toggleFavori() {
    var url = window.location.pathname + window.location.search;
    var titre = document.title.replace(" — LOKALI", "").replace("LOKALI — ", "") || url;
    var liste = getFavoris();
    var idx = liste.findIndex(function(f){ return f.url === url; });
    if (idx > -1) {
      liste.splice(idx, 1);
    } else {
      liste.unshift({ url: url, titre: titre, date: new Date().toISOString() });
    }
    setFavoris(liste);
    majBouton();
  }
  function majBouton() {
    var url = window.location.pathname + window.location.search;
    var actif = estFavori(url);
    var btn = document.getElementById("lokaliFavBtn");
    if (!btn) return;
    btn.textContent = actif ? "★ Dans vos favoris" : "☆ Ajouter aux favoris";
    btn.style.background = actif ? "#F97316" : "rgba(15,23,42,.85)";
  }

  function init() {
    var btn = document.createElement("button");
    btn.id = "lokaliFavBtn";
    btn.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:9999;border:none;color:#fff;" +
      "font-weight:800;font-size:13px;padding:12px 18px;border-radius:30px;cursor:pointer;" +
      "box-shadow:0 8px 22px rgba(0,0,0,.25);font-family:'Segoe UI',Arial,sans-serif;transition:background .2s";
    btn.onclick = toggleFavori;
    document.body.appendChild(btn);
    majBouton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
