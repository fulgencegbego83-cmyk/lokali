// ===================================================================
// LOKALI — Hiérarchie visuelle Sponsors & Partenaires
// Fichier IDENTIQUE partout où il est utilisé. Ne jamais le modifier ici.
// Installation : une ligne juste après la balise <nav> de la page :
// <script src="/lokali-bandeau-sponsors.js"></script>
//
// N'affiche que statut = "valide" ET date_fin non dépassée.
//
// Principe (standard publicitaire international) : le logo n'est JAMAIS
// recadré ni déformé — toujours affiché entier, sur fond neutre, avec de
// l'espace autour. C'est la TAILLE de l'espace qui signale le rang payé,
// jamais un effet photo/couleur criard.
//
// Hiérarchie :
//   SPONSORS (orange)                PARTENAIRES (bleu)
//   1. Officiel  → carte large (grand format, type "leaderboard")
//   2. Diamant   → carte moyenne
//   3. Or        → rangée de cartes format "medium rectangle"
//   4. Argent    → bandeau défilant (avec Bronze sponsor + Bronze partenaire)
//   5. Bronze    → bandeau défilant
//   Partenaire Officiel → carte large (juste après Sponsor Officiel)
//   Partenaire Argent   → rangée de cartes
//   Partenaire Bronze   → bandeau défilant
// ===================================================================
(function(){
  var SUPA_URL = "https://qmwdneqxyyvrcrseudwt.supabase.co";
  var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2RuZXF4eXl2cmNyc2V1ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDIwMDEsImV4cCI6MjA5ODIxODAwMX0.pQIxHsk080-SY-eeG268zS-uhJHuFQv6QE6pcH5vBB8";

  function lienValide(url) {
    if (!url) return null;
    var u = url.trim();
    if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = "https://" + u;
    return u;
  }

  var ORANGE = { texte: "#F97316", teinte: "rgba(249,115,22,.10)" };
  var BLEU   = { texte: "#0891B2", teinte: "rgba(8,145,178,.10)" };

  var style = document.createElement("style");
  style.textContent =
    /* ═ Carte sponsor — style unique, sobre, sur fond blanc, logo intact ═
       Seule la taille change selon le rang (grand = Officiel, moyen = Diamant) */
    ".lka-carte-sp{max-width:680px;margin:10px auto;padding:0 14px}" +
    ".lka-carte-sp-inner{display:flex;align-items:center;gap:16px;background:#fff;" +
    "border:1px solid rgba(15,23,42,.09);border-radius:12px;box-shadow:0 1px 4px rgba(15,23,42,.05);" +
    "text-decoration:none;padding:14px 18px}" +
    ".lka-carte-sp-inner:active{background:rgba(15,23,42,.02)}" +
    ".lka-carte-sp-inner.grand{padding:20px 24px}" +
    ".lka-carte-sp-logo{flex-shrink:0;display:flex;align-items:center;justify-content:center;" +
    "background:#fff;border-radius:8px}" +
    ".lka-carte-sp-inner.grand .lka-carte-sp-logo{width:100px;height:72px}" +
    ".lka-carte-sp-inner.moyen .lka-carte-sp-logo{width:76px;height:56px}" +
    ".lka-carte-sp-logo img{max-width:100%;max-height:100%;object-fit:contain}" +
    ".lka-carte-sp-txt{flex:1;min-width:0;border-left:1px solid rgba(15,23,42,.08);padding-left:16px}" +
    ".lka-carte-sp-eyebrow{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#94A3B8;margin-bottom:3px}" +
    ".lka-carte-sp-badge{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:800;border-radius:20px;padding:2px 10px;margin-bottom:5px}" +
    ".lka-carte-sp-nom{font-weight:800;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".lka-carte-sp-inner.grand .lka-carte-sp-nom{font-size:17px}" +
    ".lka-carte-sp-inner.moyen .lka-carte-sp-nom{font-size:14.5px}" +
    ".lka-carte-sp-cta{font-size:11.5px;font-weight:700;margin-top:3px}" +
    /* ═ Rangée de cartes "medium rectangle" (Or sponsor / Argent partenaire) ═ */
    ".lka-rangee{max-width:680px;margin:8px auto;padding:0 14px;display:flex;gap:10px;overflow-x:auto}" +
    ".lka-carte{flex:1;min-width:150px;display:flex;align-items:center;gap:8px;background:#fff;" +
    "border-radius:10px;padding:10px 12px;text-decoration:none;border:1px solid rgba(15,23,42,.08)}" +
    ".lka-carte-logo{flex-shrink:0;width:54px;height:38px;display:flex;align-items:center;justify-content:center}" +
    ".lka-carte-logo img{max-width:100%;max-height:100%;object-fit:contain}" +
    ".lka-carte-nom{font-size:12px;font-weight:700;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".lka-carte-badge{font-size:8.5px;font-weight:800;letter-spacing:.3px;display:block}" +
    /* ═ Bandeau défilant (Argent/Bronze sponsor + Bronze partenaire) ═ */
    ".lka-bandeau{width:100%;overflow:hidden;background:rgba(15,23,42,.03);border-top:1px solid rgba(15,23,42,.08);" +
    "border-bottom:1px solid rgba(15,23,42,.08);padding:10px 0;position:relative}" +
    ".lka-bandeau-track{display:flex;align-items:center;gap:36px;width:max-content;animation:lkaScroll 32s linear infinite}" +
    ".lka-bandeau:hover .lka-bandeau-track{animation-play-state:paused}" +
    ".lka-bandeau-item{display:flex;align-items:center;gap:8px;flex-shrink:0;text-decoration:none;opacity:.85;transition:opacity .2s}" +
    ".lka-bandeau-item:hover{opacity:1}" +
    ".lka-bandeau-item img{height:30px;width:auto;max-width:100px;object-fit:contain}" +
    ".lka-bandeau-item span{font-size:11.5px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.5px}" +
    "@keyframes lkaScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}";
  document.head.appendChild(style);

  async function chargerActifs() {
    try {
      var url = SUPA_URL + "/rest/v1/lokt_sponsors?statut=eq.valide&select=entreprise,photos,site_web,lien_video,formule,type,date_fin";
      var res = await fetch(url, { headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY } });
      var data = await res.json();
      var maintenant = new Date();
      return (data || []).filter(function(s){ return !s.date_fin || new Date(s.date_fin) > maintenant; });
    } catch(e) { return []; }
  }

  function estPartenaire(s) { return s.type === "partenaire"; }

  // taille : "grand" (Officiel) ou "moyen" (Diamant)
  function creerCarteSponsor(s, palette, taille) {
    var lien = lienValide(s.site_web) || lienValide(s.lien_video) || "#";
    var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
    var estOfficiel = s.formule === "Officiel";
    var labelBadge = (estPartenaire(s) ? "🤝 Partenaire " : "🏆 Sponsor ") + s.formule;

    var wrap = document.createElement("div");
    wrap.className = "lka-carte-sp";
    var html = "<a class='lka-carte-sp-inner " + taille + "' href='" + lien + "' target='_blank' rel='noopener'>" +
      "<div class='lka-carte-sp-logo'>" + (logo ? "<img src='" + logo + "' alt='" + s.entreprise + "'>" : "") + "</div>" +
      "<div class='lka-carte-sp-txt'>" +
        (estOfficiel ? "<div class='lka-carte-sp-eyebrow'>Sponsorisé par</div>" : "") +
        "<span class='lka-carte-sp-badge' style='background:" + palette.teinte + ";color:" + palette.texte + "'>" + labelBadge + "</span>" +
        "<div class='lka-carte-sp-nom'>" + s.entreprise + "</div>" +
        "<div class='lka-carte-sp-cta' style='color:" + palette.texte + "'>Découvrir →</div>" +
      "</div></a>";
    wrap.innerHTML = html;
    return wrap;
  }

  function creerRangee(liste, palette) {
    var wrap = document.createElement("div");
    wrap.className = "lka-rangee";
    wrap.innerHTML = liste.map(function(s) {
      var lien = lienValide(s.site_web) || lienValide(s.lien_video) || "#";
      var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
      return "<a class='lka-carte' href='" + lien + "' target='_blank' rel='noopener'>" +
        "<div class='lka-carte-logo'>" + (logo ? "<img src='" + logo + "' alt='" + s.entreprise + "'>" : "") + "</div>" +
        "<div><span class='lka-carte-badge' style='color:" + palette.texte + "'>" + (estPartenaire(s) ? "🤝" : "🥇") + " " + s.formule + "</span>" +
        "<span class='lka-carte-nom'>" + s.entreprise + "</span></div></a>";
    }).join("");
    return wrap;
  }

  function creerItemBandeau(s) {
    var lien = lienValide(s.site_web) || lienValide(s.lien_video) || "#";
    var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
    var html = "<a class='lka-bandeau-item' href='" + lien + "' target='_blank' rel='noopener'>";
    if (estPartenaire(s)) html += "<span style='font-size:10px;margin-right:3px'>🤝</span>";
    if (logo) { html += "<img src='" + logo + "' alt='" + s.entreprise + "'>"; }
    else { html += "<span>" + s.entreprise + "</span>"; }
    html += "</a>";
    return html;
  }

  function construireBlocs(tous) {
    var blocs = [];

    var sponsorOfficiel   = tous.filter(function(s){ return !estPartenaire(s) && s.formule === "Officiel"; });
    var partenaireOfficiel= tous.filter(function(s){ return estPartenaire(s)  && s.formule === "Officiel"; });
    var sponsorDiamant    = tous.filter(function(s){ return !estPartenaire(s) && s.formule === "Diamant"; });
    var sponsorOr         = tous.filter(function(s){ return !estPartenaire(s) && s.formule === "Or"; });
    var partenaireArgent  = tous.filter(function(s){ return estPartenaire(s)  && s.formule === "Argent"; });
    var FORMULES_CONNUES = ["Officiel", "Diamant", "Or", "Argent", "Bronze"];
    var enBandeau         = tous.filter(function(s){
      var formuleInconnue = FORMULES_CONNUES.indexOf(s.formule) === -1;
      return formuleInconnue ||
             (!estPartenaire(s) && (s.formule === "Argent" || s.formule === "Bronze")) ||
             (estPartenaire(s)  && s.formule === "Bronze");
    });

    sponsorOfficiel.forEach(function(s){ blocs.push(creerCarteSponsor(s, ORANGE, "grand")); });
    partenaireOfficiel.forEach(function(s){ blocs.push(creerCarteSponsor(s, BLEU, "grand")); });
    sponsorDiamant.forEach(function(s){ blocs.push(creerCarteSponsor(s, ORANGE, "moyen")); });
    if (sponsorOr.length) blocs.push(creerRangee(sponsorOr, ORANGE));
    if (partenaireArgent.length) blocs.push(creerRangee(partenaireArgent, BLEU));
    if (enBandeau.length) {
      var ordre = { "Argent": 0, "Bronze": 1 };
      enBandeau.sort(function(a,b){ return (ordre[a.formule]||9) - (ordre[b.formule]||9); });
      var wrap = document.createElement("div");
      wrap.className = "lka-bandeau";
      var track = document.createElement("div");
      track.className = "lka-bandeau-track";
      var itemsHtml = enBandeau.map(creerItemBandeau).join("");
      track.innerHTML = itemsHtml + itemsHtml;
      wrap.appendChild(track);
      blocs.push(wrap);
    }
    return blocs;
  }

  async function initBandeau() {
    var tous = await chargerActifs();
    if (!tous.length) return;

    var nav = document.querySelector("nav.nav") || document.querySelector("nav");
    var point = nav || document.body.firstChild;
    construireBlocs(tous).forEach(function(el) {
      if (nav && nav.parentNode) { nav.parentNode.insertBefore(el, point.nextSibling); point = el; }
      else { document.body.insertBefore(el, document.body.firstChild); }
    });

    var milieu = document.getElementById("lokaliSponsorsMilieu");
    if (milieu) {
      construireBlocs(tous).forEach(function(el){ milieu.appendChild(el); });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBandeau);
  } else {
    initBandeau();
  }
})();
