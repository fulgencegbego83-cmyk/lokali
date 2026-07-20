// ===================================================================
// LOKALI — Hiérarchie visuelle Sponsors & Partenaires
// Fichier IDENTIQUE partout où il est utilisé. Ne jamais le modifier ici.
// Installation : une ligne juste après la balise <nav> de la page :
// <script src="/lokali-bandeau-sponsors.js"></script>
//
// N'affiche que statut = "valide" ET date_fin non dépassée.
//
// Hiérarchie (chacun payant plus a une place visuelle qui le montre) :
//   SPONSORS (orange)              PARTENAIRES (bleu)
//   1. Officiel  → bannière waouh  1. Officiel → bannière waouh
//   2. Diamant   → bannière sobre  2. Argent   → rangée de cartes
//   3. Or        → rangée cartes   3. Bronze   → bandeau défilant
//   4. Argent    → bandeau défilant (avec Bronze sponsor + Bronze partenaire)
//   5. Bronze    → bandeau défilant
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

  var ORANGE = { fond: "linear-gradient(135deg,rgba(249,115,22,.10),rgba(251,146,60,.05))", bord: "rgba(249,115,22,.35)", texte: "#F97316", ombre: "rgba(249,115,22,.12)" };
  var BLEU   = { fond: "linear-gradient(135deg,rgba(8,145,178,.10),rgba(34,211,238,.05))",  bord: "rgba(8,145,178,.35)",  texte: "#0891B2", ombre: "rgba(8,145,178,.12)" };

  var style = document.createElement("style");
  style.textContent =
    /* ═ Niveau 1 : bannière "waouh" (Officiel sponsor + Officiel partenaire) ═ */
    ".lka-vedette{max-width:640px;margin:10px auto;padding:0 16px}" +
    ".lka-vedette-inner{display:flex;align-items:center;gap:14px;border-radius:18px;padding:14px 18px;text-decoration:none;border:2px solid}" +
    ".lka-vedette-inner:active{transform:scale(.98)}" +
    ".lka-vedette-waouh{animation:lkaGlow 2.8s ease-in-out infinite}" +
    "@keyframes lkaGlow{0%,100%{box-shadow:0 4px 18px var(--lka-ombre)}50%{box-shadow:0 4px 32px var(--lka-ombre),0 0 0 3px var(--lka-ombre)}}" +
    ".lka-vedette img{height:56px;width:auto;max-width:130px;object-fit:contain;border-radius:8px;background:#fff;padding:5px;flex-shrink:0}" +
    ".lka-vedette-txt{flex:1;min-width:0}" +
    ".lka-vedette-badge{display:inline-block;font-size:10.5px;font-weight:800;border-radius:20px;padding:2px 11px;margin-bottom:4px;letter-spacing:.3px}" +
    ".lka-vedette-nom{font-weight:900;font-size:16px;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".lka-vedette-cta{font-size:11.5px;font-weight:700;margin-top:2px}" +
    /* ═ Niveau 2 : bannière sobre (Diamant sponsor) ═ */
    ".lka-vedette-sobre img{height:46px}" +
    ".lka-vedette-sobre .lka-vedette-nom{font-size:14.5px;font-weight:800}" +
    /* ═ Niveau 3 : rangée de cartes fixes (Or sponsor / Argent partenaire) ═ */
    ".lka-rangee{max-width:640px;margin:8px auto;padding:0 16px;display:flex;gap:10px;overflow-x:auto}" +
    ".lka-carte{flex:1;min-width:150px;display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:10px 12px;text-decoration:none;border:1px solid rgba(15,23,42,.08);box-shadow:0 2px 8px rgba(15,23,42,.05)}" +
    ".lka-carte:active{transform:scale(.97)}" +
    ".lka-carte img{height:32px;width:auto;max-width:70px;object-fit:contain;flex-shrink:0}" +
    ".lka-carte-nom{font-size:12px;font-weight:700;color:#1E293B;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".lka-carte-badge{font-size:8.5px;font-weight:800;letter-spacing:.3px;display:block}" +
    /* ═ Niveau 4-5 : bandeau défilant (Argent/Bronze sponsor + Bronze partenaire) ═ */
    ".lka-bandeau{width:100%;overflow:hidden;background:rgba(15,23,42,.03);border-top:1px solid rgba(15,23,42,.08);border-bottom:1px solid rgba(15,23,42,.08);padding:10px 0;position:relative}" +
    ".lka-bandeau-track{display:flex;align-items:center;gap:36px;width:max-content;animation:lkaScroll 32s linear infinite}" +
    ".lka-bandeau:hover .lka-bandeau-track{animation-play-state:paused}" +
    ".lka-bandeau-item{display:flex;align-items:center;gap:8px;flex-shrink:0;text-decoration:none;opacity:.9;transition:opacity .2s}" +
    ".lka-bandeau-item:hover{opacity:1}" +
    ".lka-bandeau-item img{height:40px;width:auto;max-width:120px;object-fit:contain;border-radius:6px}" +
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

  function creerVedette(s, palette, waouh) {
    var lien = lienValide(s.site_web) || lienValide(s.lien_video) || "#";
    var logo = (s.photos && s.photos.length) ? s.photos[0] : null;
    var labelBadge = (estPartenaire(s) ? "🤝 Partenaire " : "🏆 Sponsor ") + s.formule;

    var wrap = document.createElement("div");
    wrap.className = "lka-vedette";
    var innerClass = "lka-vedette-inner" + (waouh ? " lka-vedette-waouh" : " lka-vedette-sobre");
    var html = "<a class='" + innerClass + "' href='" + lien + "' target='_blank' rel='noopener' " +
      "style='background:" + palette.fond + ";border-color:" + palette.bord + ";--lka-ombre:" + palette.ombre + "'>";
    if (logo) html += "<img src='" + logo + "' alt='" + s.entreprise + "'>";
    html += "<div class='lka-vedette-txt'>" +
      "<span class='lka-vedette-badge' style='background:" + palette.ombre + ";color:" + palette.texte + "'>" + labelBadge + "</span>" +
      "<div class='lka-vedette-nom'>" + s.entreprise + "</div>" +
      "<div class='lka-vedette-cta' style='color:" + palette.texte + "'>Découvrir →</div>" +
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
        (logo ? "<img src='" + logo + "' alt='" + s.entreprise + "'>" : "") +
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

  async function initBandeau() {
    var tous = await chargerActifs();
    if (!tous.length) return;

    var nav = document.querySelector("nav.nav") || document.querySelector("nav");
    var point = nav || document.body.firstChild;
    function inserer(el) {
      if (nav && nav.parentNode) { nav.parentNode.insertBefore(el, point.nextSibling); point = el; }
      else { document.body.insertBefore(el, document.body.firstChild); }
    }

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

    // 1. Sponsor Officiel — waouh
    sponsorOfficiel.forEach(function(s){ inserer(creerVedette(s, ORANGE, true)); });
    // 2. Partenaire Officiel — waouh
    partenaireOfficiel.forEach(function(s){ inserer(creerVedette(s, BLEU, true)); });
    // 3. Sponsor Diamant — sobre
    sponsorDiamant.forEach(function(s){ inserer(creerVedette(s, ORANGE, false)); });
    // 4. Sponsor Or — rangée de cartes
    if (sponsorOr.length) inserer(creerRangee(sponsorOr, ORANGE));
    // 5. Partenaire Argent — rangée de cartes
    if (partenaireArgent.length) inserer(creerRangee(partenaireArgent, BLEU));
    // 6. Bandeau défilant — Argent/Bronze sponsor + Bronze partenaire
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
      inserer(wrap);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBandeau);
  } else {
    initBandeau();
  }
})();
