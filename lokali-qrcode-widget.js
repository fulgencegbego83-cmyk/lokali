// ===================================================================
// LOKALI — Widget QR Code / Partage universel
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier.
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-qrcode-widget.js"></script>
// ===================================================================
(function(){

  function ouvrirModal() {
    var urlComplete = window.location.href;
    var qrSrc = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(urlComplete);

    var overlay = document.createElement("div");
    overlay.id = "lokaliQrOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:10000;" +
      "display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Segoe UI',Arial,sans-serif";

    var box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:20px;padding:24px;max-width:320px;width:100%;text-align:center";

    var titre = document.createElement("div");
    titre.textContent = "📱 Partager cette page";
    titre.style.cssText = "font-weight:900;font-size:16px;color:#1E293B;margin-bottom:14px";

    var img = document.createElement("img");
    img.src = qrSrc;
    img.alt = "QR Code";
    img.style.cssText = "width:180px;height:180px;border-radius:12px;margin:0 auto 14px;display:block";

    var lienTxt = document.createElement("div");
    lienTxt.textContent = urlComplete;
    lienTxt.style.cssText = "font-size:11px;color:#64748B;word-break:break-all;margin-bottom:14px;padding:8px;background:#F1F5F9;border-radius:10px";

    var btnCopier = document.createElement("button");
    btnCopier.textContent = "📋 Copier le lien";
    btnCopier.style.cssText = "background:#F97316;color:#fff;border:none;padding:11px 18px;border-radius:20px;" +
      "font-weight:800;font-size:13px;cursor:pointer;width:100%;margin-bottom:8px";
    btnCopier.onclick = function(){
      if (navigator.clipboard) {
        navigator.clipboard.writeText(urlComplete);
        btnCopier.textContent = "✅ Lien copié !";
        setTimeout(function(){ btnCopier.textContent = "📋 Copier le lien"; }, 2000);
      }
    };

    var btnFermer = document.createElement("button");
    btnFermer.textContent = "Fermer";
    btnFermer.style.cssText = "background:rgba(15,23,42,.08);color:#1E293B;border:none;padding:11px 18px;" +
      "border-radius:20px;font-weight:700;font-size:13px;cursor:pointer;width:100%";
    btnFermer.onclick = function(){ overlay.remove(); };

    box.appendChild(titre);
    box.appendChild(img);
    box.appendChild(lienTxt);
    box.appendChild(btnCopier);
    box.appendChild(btnFermer);
    overlay.appendChild(box);
    overlay.onclick = function(e){ if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
  }

  function init() {
    var btn = document.createElement("button");
    btn.textContent = "📱 Partager";
    btn.style.cssText = "position:fixed;bottom:18px;left:18px;z-index:9999;border:none;color:#fff;" +
      "background:rgba(15,23,42,.85);font-weight:800;font-size:13px;padding:12px 18px;border-radius:30px;" +
      "cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.25);font-family:'Segoe UI',Arial,sans-serif";
    btn.onclick = ouvrirModal;
    document.body.appendChild(btn);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
