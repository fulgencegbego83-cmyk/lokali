// ===================================================================
// LOKALI — Porte d'accès par code (tarifs sponsors + candidature sponsor)
// Fichier IDENTIQUE sur les deux pages. Ne pas modifier séparément.
//
// Fonctionnement :
// - Le code admin permanent donne un accès illimité, jamais consommé
// - Un code à usage unique (table lokt_codes_sponsors) donne accès pour
//   la session en cours ; il n'est marqué "utilisé" qu'au moment où la
//   candidature est réellement soumise (voir lokali-devenir-sponsor.html)
// ===================================================================
(function(){
  var SUPA_URL = "https://qmwdneqxyyvrcrseudwt.supabase.co";
  var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2RuZXF4eXl2cmNyc2V1ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDIwMDEsImV4cCI6MjA5ODIxODAwMX0.pQIxHsk080-SY-eeG268zS-uhJHuFQv6QE6pcH5vBB8";
  var ADMIN_PWD = "26Decembre83@@";

  var style = document.createElement("style");
  style.textContent =
    "#lokaliGateOverlay{position:fixed;inset:0;background:#F1F5F9;z-index:99999;" +
    "display:flex;align-items:center;justify-content:center;padding:20px}" +
    "#lokaliGateOverlay .box{background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:20px;" +
    "padding:32px;max-width:340px;width:100%;text-align:center;font-family:'Segoe UI',Arial,sans-serif}" +
    "#lokaliGateOverlay input{width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(15,23,42,.1);" +
    "font-size:15px;margin-bottom:12px}" +
    "#lokaliGateOverlay button{width:100%;background:#F97316;color:#fff;border:none;padding:12px;" +
    "border-radius:30px;font-weight:800;cursor:pointer;font-size:14px}" +
    "#lokaliGateOverlay .err{color:#DC2626;font-size:13px;margin-top:8px;display:none}" +
    "#lokaliGateOverlay h3{margin-bottom:6px;font-size:16px;color:#1E293B}" +
    "#lokaliGateOverlay p{font-size:13px;color:#64748B;margin-bottom:16px}";
  document.head.appendChild(style);

  var overlay = document.createElement("div");
  overlay.id = "lokaliGateOverlay";
  overlay.innerHTML =
    '<div class="box">' +
      '<h3>🔒 Accès par invitation</h3>' +
      '<p>Cette page est réservée aux entreprises invitées. Entrez le code qui vous a été communiqué.</p>' +
      '<input type="text" id="lokaliGateCode" placeholder="Code d\'accès">' +
      '<button id="lokaliGateBtn">Accéder</button>' +
      '<div class="err" id="lokaliGateErr">Code invalide ou déjà utilisé.</div>' +
    '</div>';

  function afficherPage() {
    overlay.remove();
    document.dispatchEvent(new Event("lokaliGateOk"));
  }

  async function verifierCode() {
    var val = document.getElementById("lokaliGateCode").value.trim();
    if (!val) return;

    if (val === ADMIN_PWD) {
      sessionStorage.setItem("lokaliSponsorGate", "admin");
      afficherPage();
      return;
    }

    try {
      var res = await fetch(SUPA_URL + "/rest/v1/lokt_codes_sponsors?code=eq." + encodeURIComponent(val) + "&statut=eq.actif&select=code", {
        headers: { "apikey": SUPA_KEY, "Authorization": "Bearer " + SUPA_KEY }
      });
      var data = await res.json();
      if (data && data.length) {
        sessionStorage.setItem("lokaliSponsorGate", "code");
        sessionStorage.setItem("lokaliSponsorCodeUsed", val);
        afficherPage();
        return;
      }
    } catch(e) {}

    document.getElementById("lokaliGateErr").style.display = "block";
  }

  function initGate() {
    var existant = sessionStorage.getItem("lokaliSponsorGate");
    if (existant) { document.dispatchEvent(new Event("lokaliGateOk")); return; }

    document.body.appendChild(overlay);
    document.getElementById("lokaliGateBtn").addEventListener("click", verifierCode);
    document.getElementById("lokaliGateCode").addEventListener("keypress", function(e) {
      if (e.key === "Enter") verifierCode();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGate);
  } else {
    initGate();
  }
})();
