// ===================================================================
// LOKALI — Widget Photos universel (jusqu'à 5 photos, toujours optionnel)
// Ce fichier est IDENTIQUE partout où tu l'utilises. Ne jamais le modifier
// différemment d'une page à l'autre.
// Installation : ajoute juste avant </body> de n'importe quelle page :
// <script src="/lokali-photos-widget.js"></script>
//
// Utilisation dans un formulaire de publication :
//   var photos = LokaliPhotos.creerUploader("monId", 5);
//   document.getElementById("monConteneur").appendChild(photos.element);
//   ... au moment d'enregistrer :
//   var tableauPhotos = photos.getPhotos(); // tableau d'URLs, peut être vide
//   if (photos.estEnCours()) { /* attendre encore un peu avant de publier */ }
//
// Utilisation pour afficher une galerie sur une carte d'annonce :
//   var htmlGalerie = LokaliPhotos.creerGalerieHTML(item.photos);
//   // à insérer dans le innerHTML de la carte
//
// ── Stockage réel (pas de base64 en base de données) ──────────────
// Chaque photo est redimensionnée (1280px max) et convertie en WebP côté
// navigateur, PUIS envoyée vers le bucket Supabase Storage "lokali-photos".
// Seul un lien léger (URL publique) est renvoyé par getPhotos() — jamais le
// contenu de l'image elle-même. Ça évite de surcharger la base de données
// à mesure que le nombre d'utilisateurs et de publications augmente.
// Nécessite que window._supabase (le client Supabase déjà initialisé sur
// la page) existe et que l'utilisateur soit connecté au moment de l'upload.
// Si l'upload échoue pour une raison quelconque (réseau, pas connecté...),
// on retombe silencieusement sur une data URL compressée en local, plutôt
// que de bloquer l'utilisateur — la photo fonctionne quand même, juste un
// peu plus lourde le temps que le souci se résolve.
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
  var BUCKET = "lokali-photos";

  // Filigrane discret "LOKALI", répété en diagonale sur toute l'image — fait
  // partie de l'image elle-même (pas un simple habillage CSS), donc reste
  // visible même si la photo est enregistrée ou partagée ailleurs.
  function dessinerFiligrane(ctx, w, h) {
    ctx.save();
    var taillePolice = Math.max(13, Math.round(Math.min(w, h) * 0.04));
    ctx.font = "bold " + taillePolice + "px Arial, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.32)";
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = Math.max(1, taillePolice * 0.04);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.rotate(-28 * Math.PI / 180);

    var texte = "LOKALI";
    var espacementX = taillePolice * 6.5;
    var espacementY = taillePolice * 4.5;
    var diag = Math.sqrt(w * w + h * h);

    for (var y = -diag; y < diag; y += espacementY) {
      for (var x = -diag; x < diag; x += espacementX) {
        ctx.strokeText(texte, x, y);
        ctx.fillText(texte, x, y);
      }
    }
    ctx.restore();
  }

  // Détection du support WebP par le navigateur, une seule fois, mise en cache.
  var _webpSupporte = null;
  function webpSupporte(callback) {
    if (_webpSupporte !== null) { callback(_webpSupporte); return; }
    var img = new Image();
    img.onload = function(){ _webpSupporte = (img.width === 1 && img.height === 1); callback(_webpSupporte); };
    img.onerror = function(){ _webpSupporte = false; callback(false); };
    img.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
  }

  function lireEnDataUrl(file, callback) {
    var reader = new FileReader();
    reader.onload = function(ev){ callback(ev.target.result); };
    reader.onerror = function(){ callback(null); };
    reader.readAsDataURL(file);
  }

  // Redimensionne + compresse une image (File), l'envoie vers Supabase Storage,
  // et renvoie l'URL publique via callback. Retombe sur une data URL locale
  // (non hébergée) si l'upload échoue pour une raison quelconque.
  // cadrageProduit (optionnel) : si activé, place l'image dans un cadre carré
  // propre avec un léger espace autour, façon catalogue Alibaba/Jumia — pas
  // un vrai détourage de fond (ça demande une IA externe), juste une mise
  // en page cohérente et soignée, automatique, sans rien envoyer ailleurs.
  function comprimerEtEnvoyer(file, callback, cadrageProduit) {
    var lireOriginal = function() { lireEnDataUrl(file, callback); };

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
          var canvas, ctx;
          if (cadrageProduit) {
            // Cadre carré propre : l'image est centrée avec une marge de
            // respiration, sur un fond clair uniforme — donne immédiatement
            // un rendu "catalogue", homogène quelle que soit la photo de départ.
            var cote = Math.max(w, h);
            var marge = Math.round(cote * 0.10);
            var coteFinal = cote + marge * 2;
            canvas = document.createElement("canvas");
            canvas.width = coteFinal; canvas.height = coteFinal;
            ctx = canvas.getContext("2d");
            ctx.fillStyle = "#FAFAFA";
            ctx.fillRect(0, 0, coteFinal, coteFinal);
            var decalageX = marge + Math.round((cote - w) / 2);
            var decalageY = marge + Math.round((cote - h) / 2);
            ctx.drawImage(img, decalageX, decalageY, w, h);
            w = coteFinal; h = coteFinal;
          } else {
            canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, w, h);
          }
          dessinerFiligrane(ctx, w, h);
          URL.revokeObjectURL(url);

          webpSupporte(function(supporte) {
            var type = supporte ? "image/webp" : "image/jpeg";
            var extension = supporte ? "webp" : "jpg";
            canvas.toBlob(function(blob) {
              if (!blob) { lireOriginal(); return; }
              envoyerVersStorage(blob, extension, type, function(urlPublique) {
                if (urlPublique) { callback(urlPublique); }
                else { lireOriginal(); }
              });
            }, type, QUALITE);
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

  // Envoie le blob compressé vers le bucket Supabase Storage, dans un dossier
  // nommé avec l'ID de l'utilisateur connecté (nécessaire pour les politiques
  // d'accès en suppression). Renvoie l'URL publique, ou null si ça échoue.
  function envoyerVersStorage(blob, extension, type, callback) {
    var supa = window._supabase;
    if (!supa || !supa.storage) { callback(null); return; }

    supa.auth.getSession().then(function(res) {
      var session = res && res.data && res.data.session;
      if (!session) { callback(null); return; }
      var userId = session.user.id;
      var nomFichier = userId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + extension;

      supa.storage.from(BUCKET).upload(nomFichier, blob, { contentType: type, upsert: false })
        .then(function(res2) {
          if (res2.error) { callback(null); return; }
          var pub = supa.storage.from(BUCKET).getPublicUrl(nomFichier);
          callback(pub && pub.data ? pub.data.publicUrl : null);
        })
        .catch(function(){ callback(null); });
    }).catch(function(){ callback(null); });
  }

  function creerUploader(id, maxPhotos, options) {
    maxPhotos = maxPhotos || 5;
    var cadrageProduit = options && options.cadrageProduit;
    var valeurs = new Array(maxPhotos).fill(null);
    var enCours = 0;

    var wrap = document.createElement("div");
    wrap.className = "lokali-photos-wrap";
    var lbl = document.createElement("div");
    lbl.className = "lokali-photos-lbl";
    lbl.textContent = cadrageProduit
      ? "📷 Photos produit (optionnel, jusqu'à " + maxPhotos + " — cadrage automatique façon catalogue)"
      : "📷 Photos (optionnel, jusqu'à " + maxPhotos + ")";
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
            enCours++;
            comprimerEtEnvoyer(file, function(urlOuDataUrl){
              enCours--;
              valeurs[idx] = urlOuDataUrl;
              afficherSlot(idx);
            }, cadrageProduit);
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
      },
      // Renvoie true si au moins une photo est encore en cours de compression/upload.
      // Les formulaires peuvent l'utiliser pour patienter avant de publier, mais ce
      // n'est pas obligatoire : la publication reste possible même sans l'utiliser.
      estEnCours: function() { return enCours > 0; },
      // Vide toutes les photos sélectionnées et remet chaque case à "+" —
      // utile après une publication réussie, pour repartir d'un formulaire propre.
      reset: function() {
        for (var i = 0; i < maxPhotos; i++) {
          valeurs[i] = null;
          var s = document.getElementById(id + "_photo_" + i);
          if (s) s.innerHTML = "+";
        }
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
