// ═══════════════════════════════════════════════════════════
// LOKALI — Widget QR Code "carte de visite pro"
// Fichier partagé, identique partout où il est utilisé.
// Installation : <script src="/lokali-qrcode-widget.js"></script>
// puis, après le chargement de la lib QRCode (CDN chargée par ce fichier) :
//   LokaliQR.genererDansElement("monConteneurId", "https://...", { label: "...", nomFichier: "..." });
//
// Distinct du système de parrainage (lokali-tableau-bord.html) : ici, aucune
// donnée n'est enregistrée en base, c'est un simple générateur d'image à la volée.
// Disponible sans exception pour tout utilisateur — jamais réservé au premium.
// ═══════════════════════════════════════════════════════════
(function() {
  // Charge la librairie QRCode (légère, sans dépendance) une seule fois
  if (!window.QRCode) {
    var s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js";
    document.head.appendChild(s);
  }

  function attendreLib(callback, tentatives) {
    tentatives = tentatives || 0;
    if (window.QRCode) { callback(); return; }
    if (tentatives > 40) return; // ~4s, abandonne proprement sans erreur bruyante
    setTimeout(function(){ attendreLib(callback, tentatives + 1); }, 100);
  }

  function genererDansElement(containerId, url, options) {
    options = options || {};
    var container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '<div style="font-size:12px;color:#64748B;text-align:center;padding:20px">Génération du QR Code...</div>';

    attendreLib(function() {
      container.innerHTML = "";

      var wrapper = document.createElement("div");
      wrapper.style.cssText = "display:inline-block;background:#fff;padding:16px;border-radius:18px;border:3px solid #F97316;text-align:center;box-shadow:0 4px 16px rgba(15,23,42,.08)";

      var canvas = document.createElement("canvas");
      wrapper.appendChild(canvas);

      // Correction d'erreur "H" (haute) : jusqu'à ~30% du code peut être recouvert
      // sans casser le scan — c'est ce qui permet le petit logo LOKALI au centre.
      window.QRCode.toCanvas(canvas, url, {
        width: 220, margin: 1, errorCorrectionLevel: "H",
        color: { dark: "#1E293B", light: "#FFFFFF" }
      }, function(err) {
        if (err) {
          container.innerHTML = '<div style="font-size:12px;color:#DC2626;text-align:center">QR Code indisponible pour le moment.</div>';
          return;
        }

        // Petit logo LOKALI au centre (pastille blanche + pin orange)
        var ctx = canvas.getContext("2d");
        var cx = canvas.width / 2, cy = canvas.height / 2, r = 22;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#F97316";
        ctx.beginPath(); ctx.arc(cx, cy, r - 4, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("📍", cx, cy + 1);

        container.appendChild(wrapper);

        if (options.label) {
          var label = document.createElement("div");
          label.style.cssText = "font-size:11.5px;color:#64748B;margin-top:10px;text-align:center;max-width:220px;margin-left:auto;margin-right:auto";
          label.textContent = options.label;
          container.appendChild(label);
        }

        var btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap";

        var btnPng = document.createElement("button");
        btnPng.type = "button";
        btnPng.textContent = "📥 Télécharger le QR Code";
        btnPng.style.cssText = "background:#F97316;color:#fff;border:none;border-radius:20px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer";
        btnPng.onclick = function() {
          var lien = document.createElement("a");
          lien.download = (options.nomFichier || "lokali-qrcode") + ".png";
          lien.href = canvas.toDataURL("image/png");
          lien.click();
        };
        btnRow.appendChild(btnPng);

        var btnCopier = document.createElement("button");
        btnCopier.type = "button";
        btnCopier.textContent = "🔗 Copier le lien";
        btnCopier.style.cssText = "background:rgba(15,23,42,.08);color:#1E293B;border:none;border-radius:20px;padding:9px 16px;font-size:12px;font-weight:700;cursor:pointer";
        btnCopier.onclick = function() {
          navigator.clipboard.writeText(url).then(function(){ alert("Lien copié ✅"); });
        };
        btnRow.appendChild(btnCopier);

        container.appendChild(btnRow);
      });
    });
  }

  window.LokaliQR = { genererDansElement: genererDansElement };
})();
