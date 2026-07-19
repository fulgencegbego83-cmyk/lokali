// ===================================================================
// LOKALI — Bandeau sponsors défilant (façon panneaux de stade)
// Fichier IDENTIQUE partout où il est utilisé. Ne jamais le modifier ici.
// Installation : une ligne juste après la balise <nav> de la page :
// <script src="/lokali-bandeau-sponsors.js"></script>
//
// N'affiche que les sponsors avec statut = "valide" ET date_fin non dépassée.
// Un sponsor dont la période se termine disparaît automatiquement, sans
// aucune action manuelle.
// ===================================================================
(function(){
  var SUPA_URL = "https://qmwdneqxyyvrcrseudwt.supabase.co";
  var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2RuZXF4eXl2cmNyc2V1ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDIwMDEsImV4cCI6MjA5ODIxODAwMX0.pQIxHsk080-SY-eeG268zS-uhJHuFQv6QE6pcH5vBB8";

  var style = document.createElement("style");
  style.textContent =
    ".lokali-bandeau-sponsors{width:100%;overflow:hidden;background:rgba(15,23,42,.03);" +
    "border-top:1px solid rgba(15,23,42,.08);border-bottom:1px solid rgba(15,23,42,.08);padding:10px 0;position:relative}" +
    ".lokali-bandeau-track{display:flex;align-items:center;gap:36px;width:max-content;" +
    "animation:lokaliScrollSponsors 32s linear infinite}" +
    ".lokali-bandeau-sponsors:hover .lokali-bandeau-track{animation-play-state:paused}" +
    ".lokali-sponsor-item{display:flex;align-items:center;gap:8px;flex-shrink:0;text-decoration:none;" +
    "opacity:.85;transition:opacity .2s}" +
    ".lokali-sponsor-item:hover{opacity:1}" +
    ".lokali-sponsor-item img{height:34px;width:auto;max-width:110px;object-fit:contain;border-radius:4px}" +
    ".lokali-sponsor-item span{font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px}" +
    "@keyframes lokaliScrollSponsors{from{transform:translateX(0)}to{transform:translateX(-50%)}}";
  document.head.appendChild(style);

  async function chargerSponsorsActifs() {
    try {
      var url = SUPA_URL + "/rest/v1/lokt_sponsors?statut=eq.valide&select=entreprise,photos,site_web,lien_video,formule,date_fin";
      var res = await fetch(url, {
        headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY }
      });
      var data = await res.json();
      var maintenant = new Date();
      var actifs = (data || []).filter(function(s) {
        return !s.date_fin || new Date(s.date_fin) > maintenant;
      });
      var ordreFormule = { "Officiel": 0, "Diamant": 1, "Or": 2, "Argent": 3, "Bronze": 4 };
      actifs.sort(function(a, b) {
        return (ordreFormule[a.formule] || 9) - (ordreFormule[b.formule] || 9);
      });
      return actifs;
    } catch (e) {
      return [];
    }
  }

  function creerItem(s) {
    var lien = s.site_web || s.lien_video || "#";
    var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
    var html = "<a class='lokali-sponsor-item' href='" + lien + "' target='_blank' rel='noopener'>";
    if (logo) {
      html += "<img src='" + logo + "' alt='" + s.entreprise + "'>";
    } else {
      html += "<span>" + s.entreprise + "</span>";
    }
    html += "</a>";
    return html;
  }

  async function initBandeau() {
    var sponsors = await chargerSponsorsActifs();
    if (!sponsors.length) return;

    var wrap = document.createElement("div");
    wrap.className = "lokali-bandeau-sponsors";
    var track = document.createElement("div");
    track.className = "lokali-bandeau-track";

    var itemsHtml = sponsors.map(creerItem).join("");
    track.innerHTML = itemsHtml + itemsHtml;

    wrap.appendChild(track);

    var nav = document.querySelector("nav.nav") || document.querySelector("nav");
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(wrap, nav.nextSibling);
    } else {
      document.body.insertBefore(wrap, document.body.firstChild);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBandeau);
  } else {
    initBandeau();
  }
})();
