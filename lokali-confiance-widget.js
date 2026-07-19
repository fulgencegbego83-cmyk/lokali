// ===================================================================
// LOKALI — Badge de score de confiance (étoiles + nombre d'avis)
// Corrige l'appel à afficherScoreConfiance() présent sur plusieurs
// pages (Talents, Entreprises, CV) mais jamais défini jusqu'ici.
//
// Installation : une ligne avant le script principal de la page :
// <script src="/lokali-confiance-widget.js"></script>
// ===================================================================
async function afficherScoreConfiance(supabaseClient, userId, elementId) {
  var el = document.getElementById(elementId);
  if (!el || !userId) return;

  try {
    var r = await supabaseClient.from("lokt_avis_utilisateur").select("note").eq("evalue_id", userId);
    var liste = r.data || [];
    if (!liste.length) { el.innerHTML = ""; return; }

    var moyenne = liste.reduce(function(s, a) { return s + a.note; }, 0) / liste.length;

    el.innerHTML =
      '<a href="/lokali-confiance.html?id=' + userId + '" ' +
      'style="display:inline-flex;align-items:center;gap:4px;text-decoration:none;' +
      'background:rgba(202,138,4,.15);color:#CA8A04;border-radius:20px;padding:3px 9px;' +
      'font-size:11px;font-weight:700">' +
      '★ ' + moyenne.toFixed(1) + ' (' + liste.length + ' avis)' +
      '</a>';
  } catch (e) {
    el.innerHTML = "";
  }
}
