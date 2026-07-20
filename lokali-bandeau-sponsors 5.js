// ===================================================================
// LOKALI — Bandeau sponsors (mise en avant Officiel/Diamant + défilement)
// Fichier IDENTIQUE partout où il est utilisé. Ne jamais le modifier ici.
// Installation : une ligne juste après la balise <nav> de la page :
// <script src="/lokali-bandeau-sponsors.js"></script>
//
// N'affiche que les sponsors avec statut = "valide" ET date_fin non dépassée.
// Un sponsor dont la période se termine disparaît automatiquement, sans
// aucune action manuelle.
//
// Le sponsor "Officiel" (et "Diamant") a payé pour une visibilité maximale :
// il est donc mis en avant dans un bloc large et net, séparé du bandeau
// défilant réservé aux formules Bronze/Argent/Or.
// ===================================================================
(function(){
  var SUPA_URL = "https://qmwdneqxyyvrcrseudwt.supabase.co";
  var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2RuZXF4eXl2cmNyc2V1ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDIwMDEsImV4cCI6MjA5ODIxODAwMX0.pQIxHsk080-SY-eeG268zS-uhJHuFQv6QE6pcH5vBB8";

  // Un sponsor peut avoir enregistré son site sans "https://" devant (ex: "erenik.site").
  // Sans ça, le navigateur traite le lien comme un chemin interne à LOKALI, ce qui casse
  // tout. On corrige systématiquement au moment de l'affichage, quelle que soit la donnée
  // déjà en base.
  function lienValide(url) {
    if (!url) return null;
    var u = url.trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }

  var style = document.createElement("style");
  style.textContent =
    /* Bloc mis en avant : Officiel / Diamant */
    ".lokali-sponsor-vedette{max-width:640px;margin:10px auto;padding:0 16px}" +
    ".lokali-sponsor-vedette-inner{display:flex;align-items:center;gap:14px;background:linear-gradient(135deg,rgba(249,115,22,.10),rgba(251,146,60,.05));" +
    "border:1.5px solid rgba(249,115,22,.35);border-radius:16px;padding:12px 16px;text-decoration:none;box-shadow:0 4px 16px rgba(249,115,22,.12)}" +
    ".lokali-sponsor-vedette-inner:active{transform:scale(.98)}" +
    ".lokali-sponsor-vedette img{height:52px;width:auto;max-width:120px;object-fit:contain;border-radius:8px;background:#fff;padding:4px;flex-shrink:0}" +
    ".lokali-sponsor-vedette-txt{flex:1;min-width:0}" +
    ".lokali-sponsor-vedette-badge{display:inline-block;font-size:10px;font-weight:800;color:#F97316;background:rgba(249,115,22,.15);" +
    "border-radius:20px;padding:2px 10px;margin-bottom:4px;letter-spacing:.3px}" +
    ".lokali-sponsor-vedette-nom{font-weight:800;font-size:15px;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".lokali-sponsor-vedette-cta{font-size:11px;color:#F97316;font-weight:700;margin-top:2px}" +
    /* Bandeau défilant : Bronze / Argent / Or */
    ".lokali-bandeau-sponsors{width:100%;overflow:hidden;background:rgba(15,23,42,.03);" +
    "border-top:1px solid rgba(15,23,42,.08);border-bottom:1px solid rgba(15,23,42,.08);padding:10px 0;position:relative}" +
    ".lokali-bandeau-track{display:flex;align-items:center;gap:36px;width:max-content;" +
    "animation:lokaliScrollSponsors 32s linear infinite}" +
    ".lokali-bandeau-sponsors:hover .lokali-bandeau-track{animation-play-state:paused}" +
    ".lokali-sponsor-item{display:flex;align-items:center;gap:8px;flex-shrink:0;text-decoration:none;" +
    "opacity:.9;transition:opacity .2s}" +
    ".lokali-sponsor-item:hover{opacity:1}" +
    ".lokali-sponsor-item img{height:44px;width:auto;max-width:130px;object-fit:contain;border-radius:6px}" +
    ".lokali-sponsor-item span{font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px}" +
    "@keyframes lokaliScrollSponsors{from{transform:translateX(0)}to{transform:translateX(-50%)}}";
  document.head.appendChild(style);

  async function chargerSponsorsActifs() {
    try {
      var url = SUPA_URL + "/rest/v1/lokt_sponsors?statut=eq.valide&select=entreprise,photos,site_web,lien_video,formule,type,date_fin";
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

  function creerVedette(s) {
    var lien = lienValide(s.site_web) || lienValide(s.lien_video) || "#";
    var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
    var estPartenaire = s.type === "partenaire";
    var labelBadge = (estPartenaire ? "🤝 Partenaire " : "🏆 Sponsor ") + s.formule;

    var wrap = document.createElement("div");
    wrap.className = "lokali-sponsor-vedette";
    var html = "<a class='lokali-sponsor-vedette-inner' href='" + lien + "' target='_blank' rel='noopener'>";
    if (logo) html += "<img src='" + logo + "' alt='" + s.entreprise + "'>";
    html += "<div class='lokali-sponsor-vedette-txt'>" +
      "<span class='lokali-sponsor-vedette-badge'>" + labelBadge + "</span>" +
      "<div class='lokali-sponsor-vedette-nom'>" + s.entreprise + "</div>" +
      "<div class='lokali-sponsor-vedette-cta'>Découvrir →</div>" +
    "</div></a>";
    wrap.innerHTML = html;
    return wrap;
  }

  function creerItem(s) {
    var lien = lienValide(s.site_web) || lienValide(s.lien_video) || "#";
    var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
    var estPartenaire = s.type === "partenaire";
    var html = "<a class='lokali-sponsor-item' href='" + lien + "' target='_blank' rel='noopener'>";
    if (estPartenaire) html += "<span style='font-size:10px;margin-right:3px'>🤝</span>";
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

    var nav = document.querySelector("nav.nav") || document.querySelector("nav");
    var pointInsertion = nav || document.body.firstChild;

    // Les formules "Officiel" et "Diamant" ont payé pour une visibilité maximale :
    // chacune obtient son propre bloc large, impossible à manquer.
    var vedettes = sponsors.filter(function(s){ return s.formule === "Officiel" || s.formule === "Diamant"; });
    var autres = sponsors.filter(function(s){ return s.formule !== "Officiel" && s.formule !== "Diamant"; });

    vedettes.forEach(function(s) {
      var bloc = creerVedette(s);
      if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(bloc, pointInsertion.nextSibling);
        pointInsertion = bloc;
      } else {
        document.body.insertBefore(bloc, document.body.firstChild);
      }
    });

    if (autres.length) {
      var wrap = document.createElement("div");
      wrap.className = "lokali-bandeau-sponsors";
      var track = document.createElement("div");
      track.className = "lokali-bandeau-track";
      var itemsHtml = autres.map(creerItem).join("");
      track.innerHTML = itemsHtml + itemsHtml;
      wrap.appendChild(track);

      if (nav && nav.parentNode) {
        nav.parentNode.insertBefore(wrap, pointInsertion.nextSibling);
      } else {
        document.body.insertBefore(wrap, document.body.firstChild);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBandeau);
  } else {
    initBandeau();
  }
})();
