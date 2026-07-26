// ===================================================================
// LOKALI — Widget unifié (Favoris + QR Code + Mode sombre + Traduction + Retour intelligent)
// Remplace les 4 anciens fichiers séparés par UNE seule capsule élégante.
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier.
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-widgets-unifie.js"></script>
// (Retire les 4 anciennes lignes lokali-favoris-widget.js, lokali-qrcode-widget.js,
//  lokali-darkmode-widget.js, lokali-traduction-widget.js si elles étaient présentes)
// ===================================================================
(function(){
  var FAV_KEY = "lokali_favoris";
  var THEME_KEY = "lokali_theme";

  // ---------- Styles ----------
  var style = document.createElement("style");
  style.textContent =
    "#lokaliToolbar{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;" +
    "background:rgba(15,23,42,.92);backdrop-filter:blur(10px);border-radius:40px;display:flex;gap:4px;" +
    "padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.3);font-family:'Segoe UI',Arial,sans-serif}" +
    "#lokaliToolbar button{border:none;background:transparent;color:#fff;font-size:18px;width:42px;height:42px;" +
    "border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}" +
    "#lokaliToolbar button:active{background:rgba(255,255,255,.15)}" +
    "#lokaliToolbar button.actif{background:rgba(249,115,22,.9)}" +
    "#lokaliTradMenu{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);z-index:9999;background:#fff;" +
    "border-radius:14px;box-shadow:0 8px 22px rgba(0,0,0,.2);padding:8px;display:none;flex-direction:column;gap:2px;min-width:130px}" +
    "#lokaliTradMenu.open{display:flex}" +
    "#lokaliTradMenu button{border:none;background:transparent;text-align:left;padding:8px 10px;border-radius:8px;" +
    "font-size:13px;font-weight:700;color:#1E293B;cursor:pointer;width:100%;height:auto;border-radius:8px}" +
    "#lokaliTradMenu button:hover{background:rgba(249,115,22,.1)}" +
    "#lokaliQrOverlay{position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;display:flex;" +
    "align-items:center;justify-content:center;padding:20px;font-family:'Segoe UI',Arial,sans-serif}" +
    "html.lokali-dark{--card:#1E293B;--border:rgba(255,255,255,.12);--white:#F1F5F9;--gray:#94A3B8;" +
    "--gradient:linear-gradient(135deg,#0B1120 0%,#0F172A 50%,#1E293B 100%);--dark:#0F172A}" +
    ".goog-te-banner-frame{display:none !important}body{top:0 !important}" +
    ".goog-te-gadget{font-size:0 !important;height:0;overflow:hidden}";
  document.head.appendChild(style);

  // ---------- Favoris ----------
  function getFavoris(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY))||[]; }catch(e){ return []; } }
  function setFavoris(l){ localStorage.setItem(FAV_KEY, JSON.stringify(l)); }
  function estFavori(url){ return getFavoris().some(function(f){ return f.url===url; }); }
  function toggleFavori(){
    var url = window.location.pathname + window.location.search;
    var titre = document.title.replace(" — LOKALI","").replace("LOKALI — ","") || url;
    var liste = getFavoris();
    var idx = liste.findIndex(function(f){ return f.url===url; });
    if (idx>-1) liste.splice(idx,1); else liste.unshift({url:url,titre:titre,date:new Date().toISOString()});
    setFavoris(liste);
    majBoutonFavori();
  }
  function majBoutonFavori(){
    var btn = document.getElementById("btnFav");
    if (!btn) return;
    var actif = estFavori(window.location.pathname + window.location.search);
    btn.textContent = actif ? "★" : "☆";
    btn.classList.toggle("actif", actif);
  }

  // ---------- QR Code / Partage ----------
  function ouvrirQr(){
    var urlComplete = window.location.href;
    var qrSrc = "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" + encodeURIComponent(urlComplete);
    var overlay = document.createElement("div");
    overlay.id = "lokaliQrOverlay";
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:20px;padding:24px;max-width:300px;width:100%;text-align:center">' +
      '<div style="font-weight:900;font-size:16px;color:#1E293B;margin-bottom:14px">📱 Partager cette page</div>' +
      '<img src="' + qrSrc + '" style="width:170px;height:170px;border-radius:12px;margin:0 auto 14px;display:block">' +
      '<div style="font-size:11px;color:#64748B;word-break:break-all;margin-bottom:14px;padding:8px;background:#F1F5F9;border-radius:10px">' + urlComplete + '</div>' +
      '<button id="btnCopierLien" style="background:#F97316;color:#fff;border:none;padding:11px 18px;border-radius:20px;font-weight:800;font-size:13px;cursor:pointer;width:100%;margin-bottom:8px">📋 Copier le lien</button>' +
      '<button id="btnFermerQr" style="background:rgba(15,23,42,.08);color:#1E293B;border:none;padding:11px 18px;border-radius:20px;font-weight:700;font-size:13px;cursor:pointer;width:100%">Fermer</button>' +
      '</div>';
    overlay.onclick = function(e){ if (e.target===overlay) overlay.remove(); };
    document.body.appendChild(overlay);
    document.getElementById("btnFermerQr").onclick = function(){ overlay.remove(); };
    document.getElementById("btnCopierLien").onclick = function(){
      if (navigator.clipboard){
        navigator.clipboard.writeText(urlComplete);
        var b = document.getElementById("btnCopierLien");
        b.textContent = "✅ Lien copié !";
        setTimeout(function(){ b.textContent = "📋 Copier le lien"; }, 2000);
      }
    };
  }

  // ---------- Mode sombre ----------
  function themeActuel(){ return localStorage.getItem(THEME_KEY) || "light"; }
  function appliquerTheme(t){
    document.documentElement.classList.toggle("lokali-dark", t==="dark");
    var btn = document.getElementById("btnDark");
    if (btn) btn.textContent = t==="dark" ? "☀️" : "🌙";
  }
  function toggleTheme(){
    var n = themeActuel()==="dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, n);
    appliquerTheme(n);
  }
  if (themeActuel()==="dark") document.documentElement.classList.add("lokali-dark");

  // ---------- Traduction ----------
  window.initGoogleTranslateLokali = function(){
    new google.translate.TranslateElement({ pageLanguage:"fr", includedLanguages:"fr,en,pt", autoDisplay:false }, "google_translate_element");
  };
  function chargerTraduction(){
    var mount = document.createElement("div");
    mount.id = "google_translate_element";
    mount.style.cssText = "position:fixed;top:-999px;left:-999px";
    document.body.appendChild(mount);
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=initGoogleTranslateLokali";
    document.body.appendChild(s);
  }
  function changerLangue(code){
    var tentatives = 0;
    var interval = setInterval(function(){
      var combo = document.querySelector(".goog-te-combo");
      tentatives++;
      if (combo){ combo.value = code; combo.dispatchEvent(new Event("change")); clearInterval(interval); }
      else if (tentatives>20) clearInterval(interval);
    }, 300);
    document.getElementById("lokaliTradMenu").classList.remove("open");
  }

  // ---------- Retour intelligent ----------
  // Problème résolu : sur chaque page, le bouton ".nav-back" pointait en dur
  // vers le hub ou l'accueil, ce qui faisait "sauter" loin en arrière au lieu
  // de revenir à l'écran précédent réellement visité (ex: en plein remplissage de CV).
  // Solution : si la personne vient bien d'une autre page LOKALI (même origine)
  // et qu'un historique existe, on utilise history.back(). Sinon (arrivée directe,
  // favori, lien partagé...), le lien garde son comportement normal (href).
  function corrigerBoutonsRetour(){
    document.querySelectorAll(".nav-back").forEach(function(lien){
      lien.addEventListener("click", function(e){
        var vientDuMemeSite = document.referrer && document.referrer.indexOf(window.location.origin) === 0;
        if (vientDuMemeSite && window.history.length > 1) {
          e.preventDefault();
          window.history.back();
        }
        // sinon : comportement normal du lien (fallback vers son href d'origine)
      });
    });
  }

  // ---------- Construction de la capsule ----------
  // ⏸️ Temporairement désactivée à la demande (masque des éléments de l'interface).
  // Pour réactiver : remettre "true" à la place de "false" ci-dessous.
  var LOKALI_TOOLBAR_ACTIVE = false;

  function init(){
    corrigerBoutonsRetour();
    if (!LOKALI_TOOLBAR_ACTIVE) { return; }
    chargerTraduction();

    var toolbar = document.createElement("div");
    toolbar.id = "lokaliToolbar";
    toolbar.innerHTML =
      '<button id="btnFav" title="Favoris">☆</button>' +
      '<button id="btnQr" title="Partager">📱</button>' +
      '<button id="btnDark" title="Mode sombre">🌙</button>' +
      '<button id="btnTrad" title="Traduire">🌐</button>';
    document.body.appendChild(toolbar);

    var menu = document.createElement("div");
    menu.id = "lokaliTradMenu";
    menu.innerHTML =
      '<button data-lang="fr">🇫🇷 Français</button>' +
      '<button data-lang="en">🇬🇧 English</button>' +
      '<button data-lang="pt">🇵🇹 Português</button>';
    document.body.appendChild(menu);

    document.getElementById("btnFav").onclick = toggleFavori;
    document.getElementById("btnQr").onclick = ouvrirQr;
    document.getElementById("btnDark").onclick = toggleTheme;
    document.getElementById("btnTrad").onclick = function(){ menu.classList.toggle("open"); };
    menu.querySelectorAll("button").forEach(function(b){
      b.onclick = function(){ changerLangue(b.dataset.lang); };
    });

    majBoutonFavori();
    appliquerTheme(themeActuel());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
