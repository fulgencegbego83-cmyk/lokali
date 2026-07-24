// ===================================================================
// LOKALI — Widget Photos universel (jusqu'à 5 photos, toujours optionnel)
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier.
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-photos-widget.js"></script>
//
// Utilisation dans un formulaire de publication :
//   var photos = LokaliPhotos.creerUploader("monId", 5);
//   document.getElementById("monConteneur").appendChild(photos.element);
//   ... au moment d'enregistrer :
//   var tableauPhotos = photos.getPhotos(); // tableau de data URLs, peut être vide
//
// Utilisation pour afficher une galerie sur une carte d'annonce :
//   var htmlGalerie = LokaliPhotos.creerGalerieHTML(item.photos);
//   // à insérer dans le innerHTML de la carte
//
// ── Compression (feuille de route section 10.3 — vitesse sur réseaux africains) ──
// Chaque photo est automatiquement redimensionnée (1280px max sur le plus grand
// côté) et convertie en WebP côté navigateur avant d'être transformée en data
// URL — donc avant même l'upload vers Supabase. Aucune API publique ne change :
// getPhotos() renvoie toujours un tableau de data URLs, exactement comme avant.
// Si la compression échoue pour une raison quelconque (vieux navigateur, image
// corrompue...), on retombe silencieusement sur la photo d'origine non compressée
// plutôt que de bloquer l'utilisateur.
// ===================================================================
(function(){
  var style = document.createElement("style");
  style.textContent =
    ".lokali-photos-wrap{background:rgba(15,23,42,.03);border-radius:12px;padding:12px;margin:10px 0}" +
    ".lokali-photos-lbl{font-size:11px;font-weight:800;color:var(--orange,#F97316);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}" +
    ".lokali-photos-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}" +
    "@media(max-width:480px){.lokali-photos-grid{grid-template-columns:repeat(3,1fr)}}" +
    ".lokali-photo-slot{aspect-ratio:1;background:var(--card,#fff);border:1.5px dashed var(--border,rgba(15,23,42,.15));" +
    "border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;position:relative;overflow:hidden;color:var(--gray,#64748B)}" +
    ".lokali-photo-slot img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}" +
    ".lokali-photo-remove{position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;border-radius:50%;" +
    "width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:11px;line-height:1;z-index:2}" +
    ".lokali-galerie{display:flex;gap:6px;overflow-x:auto;margin:8px 0;padding-bottom:2px}" +
    ".lokali-galerie img{width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0;cursor:pointer}" +
    ".lokali-galerie-vide{display:none}";
  document.head.appendChild(style);

  var MAX_DIMENSION = 1280;   // plus grand côté, en pixels
  var QUALITE = 0.75;         // 0 à 1

  // Détection du support WebP par le navigateur, une seule fois, mise en cache.
  var _webpSupporte = null;
  function webpSupporte(callback) {
    if (_webpSupporte !== null) { callback(_webpSupporte); return; }
    var img = new Image();
    img.onload = function(){ _webpSupporte = (img.width === 1 && img.height === 1); callback(_webpSupporte); };
    img.onerror = function(){ _webpSupporte = false; callback(false); };
    img.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
  }

  // Redimensionne + compresse une image (File) et renvoie une data URL via callback.
  // Retombe sur l'image d'origine (lecture simple, non compressée) si quoi que
  // ce soit échoue — jamais d'échec silencieux pour l'utilisateur.
  function comprimerImage(file, callback) {
    var lireOriginal = function() {
      var reader = new FileReader();
      reader.onload = function(ev){ callback(ev.target.result); };
      reader.onerror = function(){ callback(null); };
      reader.readAsDataURL(file);
    };

    if (!window.HTMLCanvasElement || !file.type || file.type.indexOf("image/") !== 0) {
      lireOriginal();
      return;
    }

    try {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function() {
        try {
          var w = img.width, h = img.height;
          if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
            if (w >= h) { h = Math.round(h * (MAX_DIMENSION / w)); w = MAX_DIMENSION; }
            else { w = Math.round(w * (MAX_DIMENSION / h)); h = MAX_DIMENSION; }
          }
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);

          webpSupporte(function(supporte) {
            var type = supporte ? "image/webp" : "image/jpeg";
            var dataUrl = canvas.toDataURL(type, QUALITE);
            callback(dataUrl && dataUrl.length > 50 ? dataUrl : null);
            if (!dataUrl || dataUrl.length <= 50) lireOriginal();
          });
        } catch(e) {
          URL.revokeObjectURL(url);
          lireOriginal();
        }
      };
      img.onerror = function() { URL.revokeObjectURL(url); lireOriginal(); };
      img.src = url;
    } catch(e) {
      lireOriginal();
    }
  }

  function creerUploader(id, maxPhotos) {
    maxPhotos = maxPhotos || 5;
    var valeurs = new Array(maxPhotos).fill(null);

    var wrap = document.createElement("div");
    wrap.className = "lokali-photos-wrap";
    var lbl = document.createElement("div");
    lbl.className = "lokali-photos-lbl";
    lbl.textContent = "📷 Photos (optionnel, jusqu'à " + maxPhotos + ")";
    wrap.appendChild(lbl);

    var grid = document.createElement("div");
    grid.className = "lokali-photos-grid";

    for (var i = 0; i < maxPhotos; i++) {
      (function(idx){
        var slot = document.createElement("div");
        slot.className = "lokali-photo-slot";
        slot.id = id + "_photo_" + idx;
        slot.innerHTML = "+";

        function ouvrirSelecteur() {
          var inp = document.createElement("input");
          inp.type = "file";
          inp.accept = "image/*";
          inp.addEventListener("change", function(){
            var file = inp.files[0];
            if (!file) return;
            var s = document.getElementById(id + "_photo_" + idx);
            if (s) s.innerHTML = "<span style='font-size:11px;color:var(--gray,#64748B)'>…</span>";
            comprimerImage(file, function(dataUrl){
              valeurs[idx] = dataUrl;
              afficherSlot(idx);
            });
          });
          inp.click();
        }

        function afficherSlot(idx) {
          var s = document.getElementById(id + "_photo_" + idx);
          if (valeurs[idx]) {
            s.innerHTML = "<img src='" + valeurs[idx] + "'><span class='lokali-photo-remove'>✕</span>";
            s.querySelector(".lokali-photo-remove").addEventListener("click", function(e){
              e.stopPropagation();
              valeurs[idx] = null;
              afficherSlot(idx);
            });
          } else {
            s.innerHTML = "+";
          }
        }

        slot.addEventListener("click", ouvrirSelecteur);
        grid.appendChild(slot);
      })(i);
    }

    wrap.appendChild(grid);

    return {
      element: wrap,
      getPhotos: function() {
        return valeurs.filter(function(v){ return v; });
      }
    };
  }

  function creerGalerieHTML(photos) {
    if (!photos || !photos.length) return "";
    return '<div class="lokali-galerie">' +
      photos.map(function(p){ return '<img src="' + p + '" onclick="event.stopPropagation();window.open(this.src)">'; }).join("") +
      '</div>';
  }

  window.LokaliPhotos = {
    creerUploader: creerUploader,
    creerGalerieHTML: creerGalerieHTML
  };
})();
