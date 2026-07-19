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
            var reader = new FileReader();
            reader.onload = function(ev){
              valeurs[idx] = ev.target.result;
              afficherSlot(idx);
            };
            reader.readAsDataURL(file);
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
