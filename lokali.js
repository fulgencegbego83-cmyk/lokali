// ══════════════════════════════════════════════
// SUPABASE
// ══════════════════════════════════════════════
var SUPA_URL = "https://qmwdneqxyyvrcrseudwt.supabase.co";
var SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2RuZXF4eXl2cmNyc2V1ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDIwMDEsImV4cCI6MjA5ODIxODAwMX0.pQIxHsk080-SY-eeG268zS-uhJHuFQv6QE6pcH5vBB8";

var _supabase = null;
var _currentUser = null;
var _userLat = null, _userLng = null;
var _urgenceMode = false;
var _favoris = [];
var _lang = "fr";

// Init Supabase
function initSupabase() {
  if (typeof supabase !== "undefined") {
    _supabase = supabase.createClient(SUPA_URL, SUPA_KEY);
    checkSession();
    loadPrestas();
    loadRealStats();
    requestNotifPermission();
  } else {
    setTimeout(initSupabase, 500);
  }
}

// ── SESSION ──────────────────────────────────
async function checkSession() {
  if (!_supabase) return;
  var res = await _supabase.auth.getSession();
  if (res.data && res.data.session) {
    _currentUser = res.data.session.user;
    updateNavForUser();
    loadFavoris();
  }
}


async function logout() {
  if (_supabase) await _supabase.auth.signOut();
  _currentUser = null;
  _favoris = [];
  location.reload();
}

// ── PRESTATAIRES ─────────────────────────────
var _allPrestas = [];
var _currentCat = "";

async function loadPrestas(cat) {
  _currentCat = cat || "";
  var grid = document.getElementById("prestaGrid");
  var info = document.getElementById("prestaInfo");
  if (grid) grid.innerHTML = '<div class="loading"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
  if (!_supabase) return;
  try {
    var q = _supabase.from("prestataires").select("*").order("created_at", {ascending:false});
    if (cat && cat !== "") q = q.ilike("categorie", "%" + cat + "%");
    if (_urgenceMode) q = q.eq("disponibilite", "disponible");
    var res = await q;
    _allPrestas = res.data || [];
    renderPrestas(_allPrestas);
    if (info) info.textContent = _allPrestas.length + " prestataire" + (_allPrestas.length > 1 ? "s" : "") + " trouvé" + (_allPrestas.length > 1 ? "s" : "");
  } catch(e) {
    if (grid) grid.innerHTML = '<div class="no-presta">Impossible de charger les prestataires. Vérifiez votre connexion.</div>';
  }
}

async function loadRealStats() {
  if (!_supabase) return;
  try {
    var rPresta = await _supabase.from("prestataires").select("id", {count:"exact", head:true});
    var rUsers  = await _supabase.from("profiles").select("id", {count:"exact", head:true});
    var rAnnonces = await _supabase.from("annonces").select("id", {count:"exact", head:true});
    var elP = document.getElementById("statPrestaCount");
    var elU = document.getElementById("statUserCount");
    var elA = document.getElementById("statAnnonceCount");
    var elPays = document.getElementById("statPaysCount");
    if (elP) elP.innerHTML = (rPresta.count || 0) + '<span>+</span>';
    if (elU) elU.innerHTML = (rUsers.count  || 0) + '<span>+</span>';
    if (elA) elA.innerHTML = (rAnnonces.count || 0) + '<span>+</span>';
    // Pays disponibles = taille de notre base PAYS_LIST (toujours active, indépendamment des inscriptions)
    if (elPays) elPays.innerHTML = PAYS_LIST.length + '<span>+</span>';
  } catch(e) { console.warn("Stats:", e); }
}

function calcDist(lat1, lng1, lat2, lng2) {
  var R = 6371;
  var dLat = (lat2 - lat1) * Math.PI / 180;
  var dLng = (lng2 - lng1) * Math.PI / 180;
  var a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 10) / 10;
}

function renderPrestas(list) {
  var grid = document.getElementById("prestaGrid");
  if (!grid) return;
  if (!list || list.length === 0) {
    grid.innerHTML = '<div class="no-presta">🔍 Aucun prestataire trouvé pour cette recherche.<br>Sois le premier à t\'inscrire dans cette catégorie !</div>';
    return;
  }
  grid.innerHTML = list.map(function(p) {
    var dist = (_userLat && p.latitude && p.longitude) ? calcDist(_userLat, _userLng, p.latitude, p.longitude) + " km" : "";
    var dispBadge = p.disponibilite === "disponible" ? '<span class="badge badge-d">🟢 Disponible</span>'
      : p.disponibilite === "bientot" ? '<span class="badge badge-s">🟡 Répond bientôt</span>'
      : '<span class="badge badge-b">🔴 Occupé</span>';
    var stars = p.note_moyenne > 0 ? "⭐".repeat(Math.round(p.note_moyenne)) + " " + p.note_moyenne.toFixed(1) + " (" + p.nb_avis + " avis)" : "Pas encore d'avis";
    var isFav = _favoris.includes(p.id);
    return '<div class="presta-card" onclick="openProfil(\'' + p.id + '\')">'
      + (p.photo_url ? '<img src="' + p.photo_url + '" class="presta-photo" alt="' + p.nom + '" onerror="this.style.display=\'none\'">' : '<div class="presta-photo">' + (p.categorie || "👤").charAt(0) + '</div>')
      + '<div class="presta-body">'
        + '<div class="presta-name">' + p.nom + (p.verifie ? ' <span class="badge badge-v">✅ Vérifié</span>' : '') + '</div>'
        + '<div class="presta-meta">' + (p.quartier ? p.quartier + ', ' : '') + (p.ville || '') + '</div>'
        + '<div class="presta-badges">' + dispBadge + '<span class="badge badge-p">' + (p.categorie || '') + '</span></div>'
        + '<div class="presta-rating">' + stars + '</div>'
        + (dist ? '<div class="presta-dist">📍 ' + dist + ' de vous · ~' + Math.ceil(parseFloat(dist)*3) + ' min</div>' : '')
        + '<div class="presta-btns" onclick="event.stopPropagation()">'
          + '<button class="pbtn pbtn-wa" onclick="window.open(\'https://wa.me/\' + cleanTel(\'' + (p.whatsapp||p.telephone||'') + '\'),\'_blank\')">💬 WhatsApp</button>'
          + '<button class="pbtn pbtn-call" onclick="window.open(\'tel:' + (p.telephone||'') + '\')">📞</button>'
          + '<button class="pbtn pbtn-fav ' + (isFav?'on':'') + '" onclick="toggleFav(\'' + p.id + '\',this)">❤️</button>'
        + '</div>'
      + '</div>'
    + '</div>';
  }).join("");
}

function cleanTel(t) { return t.replace(/[^0-9+]/g, ""); }

// ── FAVORIS ──────────────────────────────────
async function loadFavoris() {
  if (!_supabase || !_currentUser) return;
  var res = await _supabase.from("favoris").select("prestataire_id").eq("user_id", _currentUser.id);
  _favoris = (res.data || []).map(function(f){ return f.prestataire_id; });
}

async function toggleFav(id, btn) {
  if (!_currentUser) { showToast("Connecte-toi pour sauvegarder un favori"); openModal("login"); return; }
  if (_favoris.includes(id)) {
    await _supabase.from("favoris").delete().eq("user_id", _currentUser.id).eq("prestataire_id", id);
    _favoris = _favoris.filter(function(f){ return f !== id; });
    btn.classList.remove("on");
    showToast("Retiré des favoris");
  } else {
    await _supabase.from("favoris").insert({user_id:_currentUser.id, prestataire_id:id});
    _favoris.push(id);
    btn.classList.add("on");
    showToast("❤️ Ajouté aux favoris !");
  }
}

// ── PROFIL PRESTATAIRE ────────────────────────
async function openProfil(id) {
  var p = _allPrestas.find(function(x){ return x.id === id; });
  if (!p) return;
  // Enregistrer dans l'historique
  if (_supabase && _currentUser) {
    _supabase.from("contacts_historique").insert({user_id:_currentUser.id, prestataire_id:id, type_contact:"vue"}).then(function(){}).catch(function(){});
  }
  // Charger les avis
  var avisHtml = '<div class="loading"><div class="loading-dot"></div></div>';
  var questionsHtml = '';
  if (_supabase) {
    var avisRes = await _supabase.from("avis").select("*").eq("prestataire_id", id).order("created_at", {ascending:false}).limit(5);
    var avisList = avisRes.data || [];
    avisHtml = avisList.length > 0
      ? '<div class="avis-list">' + avisList.map(function(a){
          return '<div class="avis-item"><div class="avis-header"><span class="avis-nom">' + (a.client_nom||"Anonyme") + '</span><span class="avis-stars">' + "⭐".repeat(a.note||0) + '</span></div><div class="avis-txt">' + (a.commentaire||"") + '</div></div>';
        }).join("") + '</div>'
      : '<div style="color:var(--gray);font-size:13px;margin-bottom:12px">Pas encore d\'avis — sois le premier !</div>';

    try {
      var qRes = await _supabase.from("questions_prestataire").select("*").eq("prestataire_id", id).order("created_at", {ascending:false}).limit(5);
      var qList = qRes.data || [];
      questionsHtml = qList.length > 0
        ? qList.map(function(q){
            return '<div class="qr-item"><div class="qr-question">❓ ' + q.question + '</div>'
              + (q.reponse ? '<div class="qr-reponse">💬 ' + q.reponse + '</div>' : '<div class="qr-pending">En attente de réponse</div>')
              + '</div>';
          }).join("")
        : '<div style="color:var(--gray);font-size:13px">Aucune question pour le moment.</div>';
    } catch(e) { questionsHtml = ''; }
  }

  var dist = (_userLat && p.latitude && p.longitude) ? calcDist(_userLat, _userLng, p.latitude, p.longitude) + " km de vous" : "";
  var dispBadge = p.disponibilite === "disponible" ? "🟢 Disponible" : p.disponibilite === "bientot" ? "🟡 Répond bientôt" : "🔴 Occupé";

  // Galerie photos
  var photos = [p.photo1, p.photo2, p.photo3, p.photo4, p.photo5, p.photo6].filter(Boolean);
  var galerieHtml = photos.length > 0
    ? '<div style="display:flex;gap:8px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px">'
      + photos.map(function(ph){ return '<img src="'+ph+'" style="width:140px;height:100px;object-fit:cover;border-radius:10px;flex-shrink:0">'; }).join('')
      + '</div>'
    : '';

  // Infos complémentaires (expérience, langues, certifs, paiement)
  var extraInfoHtml = '';
  if (p.experience) extraInfoHtml += '<div class="prof-info-row"><span class="prof-info-ic">🎓</span><div><div class="prof-info-lbl">Expérience</div><div class="prof-info-val">' + p.experience + '</div></div></div>';
  if (p.langues) extraInfoHtml += '<div class="prof-info-row"><span class="prof-info-ic">🗣️</span><div><div class="prof-info-lbl">Langues parlées</div><div class="prof-info-val">' + p.langues + '</div></div></div>';
  if (p.certifications) extraInfoHtml += '<div class="prof-info-row"><span class="prof-info-ic">📜</span><div><div class="prof-info-lbl">Certifications</div><div class="prof-info-val">' + p.certifications + '</div></div></div>';
  if (p.moyens_paiement) extraInfoHtml += '<div class="prof-info-row"><span class="prof-info-ic">💳</span><div><div class="prof-info-lbl">Paiement accepté</div><div class="prof-info-val">' + p.moyens_paiement + '</div></div></div>';
  if (p.horaires) extraInfoHtml += '<div class="prof-info-row"><span class="prof-info-ic">🕐</span><div><div class="prof-info-lbl">Horaires</div><div class="prof-info-val">' + p.horaires + '</div></div></div>';
  if (p.zone) extraInfoHtml += '<div class="prof-info-row"><span class="prof-info-ic">📌</span><div><div class="prof-info-lbl">Zone d\'intervention</div><div class="prof-info-val">' + p.zone + '</div></div></div>';

  // Réseaux sociaux
  var socialHtml = '';
  if (p.facebook || p.instagram || p.tiktok) {
    socialHtml = '<div style="display:flex;gap:10px;margin-bottom:16px">';
    if (p.facebook) socialHtml += '<a href="' + p.facebook + '" target="_blank" style="background:rgba(24,119,242,.15);color:#1877F2;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;text-decoration:none">📘 Facebook</a>';
    if (p.instagram) socialHtml += '<a href="' + p.instagram + '" target="_blank" style="background:rgba(225,48,108,.15);color:#E1306C;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;text-decoration:none">📷 Instagram</a>';
    if (p.tiktok) socialHtml += '<a href="' + p.tiktok + '" target="_blank" style="background:rgba(255,255,255,.08);color:#fff;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;text-decoration:none">🎵 TikTok</a>';
    socialHtml += '</div>';
  }

  document.getElementById("mTitle").textContent = p.nom;
  document.getElementById("mSub").textContent = p.categorie || "";
  document.getElementById("mBody").innerHTML =
    (p.photo_url ? '<img src="' + p.photo_url + '" style="width:100%;height:180px;object-fit:cover;border-radius:12px;margin-bottom:16px">' : '')
    + (p.verifie ? '<div style="margin-bottom:12px"><span class="badge badge-v">✅ Prestataire Vérifié</span></div>' : '')
    + '<div style="background:var(--dark3);border-radius:12px;padding:16px;margin-bottom:16px">'
      + (dist ? '<div class="prof-info-row"><span class="prof-info-ic">📍</span><div><div class="prof-info-lbl">Distance</div><div class="prof-info-val">' + dist + '</div></div></div>' : '')
      + '<div class="prof-info-row"><span class="prof-info-ic">🔆</span><div><div class="prof-info-lbl">Disponibilité</div><div class="prof-info-val">' + dispBadge + '</div></div></div>'
      + (p.ville ? '<div class="prof-info-row"><span class="prof-info-ic">🏙️</span><div><div class="prof-info-lbl">Localisation</div><div class="prof-info-val">' + (p.quartier?p.quartier+', ':'') + p.ville + ', ' + (p.pays||'') + '</div></div></div>' : '')
      + (p.tarif ? '<div class="prof-info-row"><span class="prof-info-ic">💰</span><div><div class="prof-info-lbl">Tarif</div><div class="prof-info-val">' + p.tarif + '</div></div></div>' : '')
      + (p.note_moyenne > 0 ? '<div class="prof-info-row"><span class="prof-info-ic">⭐</span><div><div class="prof-info-lbl">Note</div><div class="prof-info-val">' + p.note_moyenne.toFixed(1) + '/5 (' + p.nb_avis + ' avis)</div></div></div>' : '')
      + extraInfoHtml
    + '</div>'
    + socialHtml
    + (p.description ? '<p style="font-size:14px;color:var(--gray);line-height:1.6;margin-bottom:16px">' + p.description + '</p>' : '')
    + galerieHtml
    + '<div class="prof-btns">'
      + '<button class="prof-btn prof-btn-wa" onclick="window.open(\'https://wa.me/\'+cleanTel(\'' + (p.whatsapp||p.telephone||'') + '\'),\'_blank\');enregContact(\'' + id + '\',\'whatsapp\')">💬 WhatsApp</button>'
      + '<button class="prof-btn prof-btn-call" onclick="window.open(\'tel:' + (p.telephone||'') + '\');enregContact(\'' + id + '\',\'appel\')">📞 Appeler</button>'
      + (p.latitude && p.longitude ? '<button class="prof-btn prof-btn-itin" onclick="window.open(\'https://www.google.com/maps/dir/?api=1&destination=' + p.latitude + ',' + p.longitude + '\',\'_blank\')">🗺️ Itinéraire</button>' : '')
      + '<button class="prof-btn prof-btn-share" onclick="partagerPresta(\'' + p.nom + '\',\'' + p.telephone + '\')">📤 Partager</button>'
    + '</div>'
    + '<h3 style="font-size:16px;font-weight:700;margin:20px 0 10px">Questions & Réponses</h3>'
    + questionsHtml
    + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<input class="ri" placeholder="Pose une question au prestataire..." id="qInput" style="flex:1;margin-bottom:0">'
      + '<button class="rsub" style="width:auto;padding:0 16px" onclick="submitQuestion(\'' + id + '\')">Envoyer</button>'
    + '</div>'
    + '<h3 style="font-size:16px;font-weight:700;margin:20px 0 10px">Avis clients</h3>'
    + avisHtml
    + '<div class="avis-form">'
      + '<input class="ri" placeholder="Votre nom" id="avisNom">'
      + '<select class="ri" id="avisNote"><option value="5">⭐⭐⭐⭐⭐ Excellent</option><option value="4">⭐⭐⭐⭐ Bien</option><option value="3">⭐⭐⭐ Moyen</option><option value="2">⭐⭐ Décevant</option><option value="1">⭐ Mauvais</option></select>'
      + '<textarea class="ri" placeholder="Votre commentaire..." id="avisTxt" rows="3" style="resize:none"></textarea>'
      + '<button class="rsub" onclick="submitAvis(\'' + id + '\')">Envoyer mon avis</button>'
    + '</div>';
  document.getElementById("overlay").classList.add("on");
}

// ── Système de questions/réponses ────────────────────────────
async function submitQuestion(prestaId) {
  var inp = document.getElementById("qInput");
  var question = inp.value.trim();
  if (!question) { showToast("Écris ta question"); return; }
  if (!_supabase) return;
  try {
    await _supabase.from("questions_prestataire").insert({
      prestataire_id: prestaId,
      question: question,
      client_id: _currentUser ? _currentUser.id : null
    });
    showToast("✅ Question envoyée ! Le prestataire pourra y répondre.");
    inp.value = "";
    openProfil(prestaId);
  } catch(e) { showToast("Erreur : " + e.message); }
}

async function submitAvis(prestaId) {
  var nom = document.getElementById("avisNom").value.trim();
  var note = parseInt(document.getElementById("avisNote").value);
  var txt = document.getElementById("avisTxt").value.trim();
  if (!nom) { showToast("Entre ton nom"); return; }
  if (!_supabase) return;
  await _supabase.from("avis").insert({prestataire_id:prestaId, client_nom:nom, note:note, commentaire:txt});
  showToast("✅ Avis envoyé ! Merci");
  openProfil(prestaId);
}

async function enregContact(id, type) {
  if (_supabase && _currentUser) {
    await _supabase.from("contacts_historique").insert({user_id:_currentUser.id, prestataire_id:id, type_contact:type});
  }
}

// ── INSCRIPTION ──────────────────────────────
function switchReg(type, btn) {
  document.querySelectorAll(".rtab").forEach(function(t){ t.classList.remove("on"); });
  btn.classList.add("on");
  var fields = ["rCat","rDispo","rDesc","rTarif","rWa","rQuartier"];
  fields.forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.style.display = type === "client" ? "none" : "block";
  });
}

// doRegister() supprimée — remplacée par openInscription() (modal complète)

function populateCatSel() {
  var s = document.getElementById("rCat");
  if (!s) return;
  CATS.forEach(function(c){
    var o = document.createElement("option");
    o.value = c.n; o.textContent = c.e + " " + c.n;
    s.appendChild(o);
  });
}

// ── CATÉGORIES ────────────────────────────────
var CATS = [
  {e:"💇",n:"Coiffeur homme",c:"Beauté"},
  {e:"💇‍♀️",n:"Coiffeur femme",c:"Beauté"},
  {e:"🪮",n:"Tresseuse",c:"Beauté"},{e:"💄",n:"Maquilleuse",c:"Beauté"},{e:"💅",n:"Manucure / Pédicure",c:"Beauté"},
  {e:"💆",n:"Masseur / Masseuse",c:"Beauté"},{e:"💈",n:"Barbier",c:"Beauté"},{e:"✨",n:"Esthéticienne",c:"Beauté"},
  {e:"🧵",n:"Couturière",c:"Mode"},{e:"🪡",n:"Tailleur",c:"Mode"},{e:"✂️",n:"Retouche vêtements",c:"Mode"},
  {e:"🫧",n:"Pressing / Blanchisserie",c:"Mode"},{e:"♨️",n:"Repassage",c:"Mode"},
  {e:"🔧",n:"Mécanicien auto",c:"Auto"},
  {e:"🏍️",n:"Mécanicien moto",c:"Auto"},{e:"🔄",n:"Vulcanisateur",c:"Auto"},{e:"🚿",n:"Laveur auto",c:"Auto"},
  {e:"🏗️",n:"Maçon",c:"Maison"},
  {e:"🚿",n:"Plombier",c:"Maison"},
  {e:"⚡",n:"Électricien",c:"Maison"},
  {e:"🎨",n:"Peintre bâtiment",c:"Maison"},{e:"🪟",n:"Carreleur",c:"Maison"},{e:"🪚",n:"Menuisier",c:"Maison"},
  {e:"🔩",n:"Ferronnier",c:"Maison"},{e:"❄️",n:"Climatiseur",c:"Maison"},{e:"🔐",n:"Serrurier",c:"Maison"},
  {e:"🌿",n:"Jardinage",c:"Maison"},{e:"📦",n:"Déménagement",c:"Maison"},{e:"🧹",n:"Nettoyage",c:"Maison"},
  {e:"🍽️",n:"Restaurateur",c:"Alimentation"},
  {e:"🍱",n:"Traiteur",c:"Alimentation"},{e:"🐟",n:"Vendeuse de poisson",c:"Alimentation"},
  {e:"🥖",n:"Boulanger",c:"Alimentation"},
  {e:"🎂",n:"Pâtissier",c:"Alimentation"},{e:"🥩",n:"Boucher",c:"Alimentation"},{e:"🛵",n:"Livreur de repas",c:"Alimentation"},
  {e:"💊",n:"Pharmacie",c:"Santé"},{e:"🩺",n:"Médecin généraliste",c:"Santé"},{e:"🩺",n:"Infirmier à domicile",c:"Santé"},
  {e:"🦷",n:"Dentiste",c:"Santé"},{e:"👓",n:"Opticien",c:"Santé"},{e:"🏃",n:"Kinésithérapeute",c:"Santé"},
  {e:"📸",n:"Photographe",c:"Événements"},
  {e:"🎥",n:"Vidéaste",c:"Événements"},{e:"🎧",n:"DJ",c:"Événements"},{e:"🎤",n:"Animateur",c:"Événements"},
  {e:"📚",n:"Professeur particulier",c:"Éducation"},{e:"🇬🇧",n:"Cours d'anglais",c:"Éducation"},
  {e:"💻",n:"Formation informatique",c:"Éducation"},{e:"🚗",n:"Auto-école",c:"Éducation"},
  {e:"🏠",n:"Agent immobilier",c:"Immobilier"},{e:"📐",n:"Architecte",c:"Immobilier"},{e:"🛋️",n:"Décorateur intérieur",c:"Immobilier"},
  {e:"📱",n:"Réparateur téléphone",c:"Tech"},{e:"💻",n:"Réparateur ordinateur",c:"Tech"},{e:"🌐",n:"Développeur web",c:"Tech"},
  {e:"☀️",n:"Panneau solaire",c:"Énergie"},{e:"🔐",n:"Agent de sécurité",c:"Sécurité"},
  {e:"🚚",n:"Transport / Livraison",c:"Transport"},{e:"🏍️",n:"Moto-taxi",c:"Transport"},
  {e:"📊",n:"Comptable",c:"Finance"},{e:"⚖️",n:"Avocat",c:"Finance"},
  {e:"🏋️",n:"Coach sportif",c:"Sport"},{e:"👶",n:"Nounou / Baby-sitter",c:"Famille"},
  {e:"🏨",n:"Hôtel / Auberge",c:"Hôtellerie"},{e:"🪑",n:"Location chaises/tables",c:"Hôtellerie"},
  {e:"🔨",n:"Réparateur électroménager",c:"Divers"},{e:"⌚",n:"Réparateur montres",c:"Divers"},
];

function renderCats(list) {
  var g = document.getElementById("catsGrid");
  if (!g) return;
  g.innerHTML = list.map(function(cat) {
    var iconHtml = cat.img
      ? '<img src="' + cat.img + '" class="cat-img" alt="' + cat.n + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
        + '<div class="cat-emoji" style="display:none">' + cat.e + '</div>'
      : '<div class="cat-emoji">' + cat.e + '</div>';
    return '<div class="cat-card" onclick="qs(\'' + cat.n.replace(/'/g, "\\'") + '\')">'
      + iconHtml + '<span class="cat-name">' + cat.n + '</span><span class="cat-type">' + cat.c + '</span>'
      + '</div>';
  }).join("");
}

function filterGrid(v) {
  var val = v.toLowerCase();
  renderCats(val ? CATS.filter(function(c){ return c.n.toLowerCase().includes(val) || c.c.toLowerCase().includes(val); }) : CATS);
}

// ── RECHERCHE INTELLIGENTE ────────────────────
var SMART = {
  "panne":"Mécanicien auto","voiture":"Mécanicien auto","moteur":"Mécanicien auto",
  "demenage":"Déménagement","déménage":"Déménagement",
  "mariage":"Photographe","je me marie":"Traiteur",
  "fuite":"Plombier","eau":"Plombier","robinet":"Plombier",
  "lumière":"Électricien","courant":"Électricien",
  "mal":"Médecin généraliste","fièvre":"Médecin généraliste",
  "coiffer":"Coiffeur femme","cheveux":"Coiffeur femme","tresse":"Tresseuse",
  "manger":"Restaurateur","repas":"Traiteur",
  "maison":"Maçon","construire":"Maçon",
  "peindre":"Peintre bâtiment",
  "coudre":"Couturière","vêtement":"Tailleur",
  "photo":"Photographe","fête":"DJ","anniversaire":"Traiteur",
  "louer":"Agent immobilier","appartement":"Agent immobilier",
  "ordinateur":"Réparateur ordinateur","téléphone":"Réparateur téléphone",
  "enfant":"Nounou / Baby-sitter","sécurité":"Agent de sécurité"
};

var SUGGEST = {
  "Mécanicien auto":["Vulcanisateur","Électricien auto","Tôlier"],
  "Photographe":["Vidéaste","DJ","Traiteur","Animateur"],
  "Traiteur":["Photographe","DJ","Location chaises/tables"],
  "Maçon":["Plombier","Électricien","Peintre bâtiment","Carreleur"],
  "Coiffeur femme":["Maquilleuse","Manucure / Pédicure","Esthéticienne"],
};

function onHeroInput(v) {
  var smart = null;
  var vl = v.toLowerCase();
  for (var k in SMART) { if (vl.includes(k)) { smart = SMART[k]; break; } }
  if (smart) {
    var box = document.getElementById("suggestBox");
    var tags = document.getElementById("suggestTags");
    var suggs = SUGGEST[smart] || [];
    if (suggs.length > 0 && box && tags) {
      tags.innerHTML = suggs.map(function(s){ return '<span class="stag" onclick="qs(\'' + s + '\')">' + s + '</span>'; }).join("");
      box.classList.add("on");
    }
  }
}

function qs(term) {
  trackSearch(term, "prestataire");
  var vl = term.toLowerCase();
  var smart = null;
  for (var k in SMART) { if (vl.includes(k)) { smart = SMART[k]; break; } }
  var finalTerm = smart || term;
  var heroInp = document.getElementById("heroInput");
  if (heroInp) heroInp.value = finalTerm;
  // Si appelé depuis la modal "Tous les services", la fermer d'abord
  var overlay = document.getElementById("overlay");
  if (overlay && overlay.classList.contains("on")) closeModal();
  setTimeout(function() {
    var prestaSec = document.querySelector(".presta-sec");
    if (prestaSec) prestaSec.scrollIntoView({behavior:"smooth"});
  }, 250);
  loadPrestas(finalTerm);
  if (SUGGEST[finalTerm]) {
    var box = document.getElementById("suggestBox");
    var tags = document.getElementById("suggestTags");
    if (box && tags) {
      tags.innerHTML = SUGGEST[finalTerm].map(function(s){ return '<span class="stag" onclick="qs(\'' + s + '\')">' + s + '</span>'; }).join("");
      box.classList.add("on");
    }
  }
}

function doSearch() {
  var v = document.getElementById("heroInput").value.trim();
  if (!v) { showToast("💬 Tape ce que tu cherches"); return; }
  qs(v);
}

// ── MODE URGENCE ─────────────────────────────
function toggleUrgence() {
  _urgenceMode = !_urgenceMode;
  var bar = document.getElementById("urgencyBar");
  var txt = document.getElementById("urgencyTxt");
  var btn = document.getElementById("urgencyBtn");
  if (_urgenceMode) {
    bar.classList.add("on");
    txt.textContent = "🚨 Mode Urgence ACTIVÉ";
    btn.textContent = "Désactiver ✕";
    showToast("🚨 Mode Urgence — prestataires disponibles uniquement");
  } else {
    bar.classList.remove("on");
    txt.textContent = "🚨 Intervention urgente";
    btn.textContent = "Activer →";
    showToast("Mode Urgence désactivé");
  }
  loadPrestas(_currentCat);
}

// ── GÉOLOCALISATION + MÉTÉO ──────────────────
function initGeo() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(function(pos) {
    _userLat = pos.coords.latitude;
    _userLng = pos.coords.longitude;
    fetch("https://nominatim.openstreetmap.org/reverse?format=json&lat=" + _userLat + "&lon=" + _userLng + "&accept-language=fr")
      .then(function(r){ return r.json(); })
      .then(function(d) {
        var city = d.address.city || d.address.town || d.address.village || "Ta ville";
        var q = d.address.suburb || d.address.neighbourhood || "";
        document.getElementById("geoLoc").textContent = "📍 " + (q ? q + ", " : "") + city;
        document.getElementById("geoSub").textContent = (d.address.country||"") + " · Position précise détectée";
        loadWeather();
        renderPrestas(_allPrestas); // Recalculer distances
      }).catch(function(){});
  }, function(){
    document.getElementById("geoLoc").textContent = "📍 GPS non activé";
    document.getElementById("geoSub").textContent = "Tape ta ville dans la recherche";
  }, {enableHighAccuracy:true, timeout:8000});
}

function refreshGeo() { document.getElementById("geoLoc").textContent = "🔄 Actualisation..."; initGeo(); }

function loadWeather() {
  if (!_userLat) return;
  fetch("https://api.open-meteo.com/v1/forecast?latitude=" + _userLat + "&longitude=" + _userLng + "&current_weather=true")
    .then(function(r){ return r.json(); })
    .then(function(d) {
      if (!d.current_weather) return;
      var t = Math.round(d.current_weather.temperature);
      var icons = {0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",51:"🌦️",61:"🌧️",80:"🌦️",95:"⛈️"};
      var code = d.current_weather.weathercode;
      var icon = icons[code] || (code < 50 ? "🌤️" : "🌧️");
      document.getElementById("geoWeather").innerHTML = icon + " <strong>" + t + "°C</strong>";
    }).catch(function(){});
}

// ── PARTAGE ───────────────────────────────────
function openGoogleMaps() {
  if (_userLat) {
    window.open("https://www.google.com/maps/search/prestataire/@" + _userLat + "," + _userLng + ",14z", "_blank");
  } else {
    window.open("https://www.google.com/maps", "_blank");
  }
}

function shareApp() {
  var text = "🌍 LOKALI — Trouve ton prestataire en 30 secondes partout en Afrique ! 100% gratuit.";
  if (navigator.share) {
    navigator.share({title:"LOKALI",text:text,url:window.location.href}).catch(function(){});
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(text + " " + window.location.href), "_blank");
  }
}

function partagerPresta(nom, tel) {
  var text = "🔧 " + nom + " est disponible sur LOKALI ! Contacte-le : " + tel + " — Trouve d'autres prestataires sur lokali.site";
  if (navigator.share) {
    navigator.share({title:"LOKALI — " + nom, text:text}).catch(function(){});
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  }
}

// ── NOTIFICATIONS ─────────────────────────────
function requestNotifPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    setTimeout(function(){
      Notification.requestPermission();
    }, 5000);
  }
}

function showNotif(msg) {
  // Notification navigateur
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("LOKALI", {body:msg, icon:"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='40' r='30' fill='%23FF6B2C'/></svg>"});
  }
  // Bulle dans la page
  var b = document.getElementById("notifBubble");
  if (b) {
    b.innerHTML = "🔔 " + msg;
    b.classList.add("on");
    setTimeout(function(){ b.classList.remove("on"); }, 4000);
  }
}

// ── MODAL ─────────────────────────────────────
function openModal(type) {
  var title = document.getElementById("mTitle");
  var sub = document.getElementById("mSub");
  var body = document.getElementById("mBody");
  document.getElementById("overlay").classList.add("on");

  var st = {B:8000,A:15000,O:25000,P:80000};
  var pt = {B:4000,A:8000,O:15000};
  function f(n){ return Number(n).toLocaleString("fr-FR") + " FCFA"; }

  if (type === "login") {
    title.textContent = "Connexion"; sub.textContent = "Bon retour sur LOKALI";
    body.innerHTML = '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<input class="ri" placeholder="Email *" type="email" id="lEmail" style="width:100%">'
      + '<div class="pwd-wrap"><input class="ri" placeholder="Mot de passe *" type="password" id="lPwd" style="width:100%"><button type="button" class="pwd-eye" onclick="togglePwdVisibility(\'lPwd\', this)">&#128065;</button></div>'
      + '<button class="rsub" onclick="doLogin()">Se connecter</button>'
      + '<p style="text-align:center;font-size:13px;color:var(--gray)">Pas encore inscrit ? <a href="#" style="color:var(--orange)" onclick="closeModal();document.querySelector(\'.reg-sec\').scrollIntoView({behavior:\'smooth\'})">S\'inscrire gratuitement</a></p>'
      + '</div>';

  // Sponsor et Partenaire gérés par buildSponsorModal()
  }
}

function contactSponsor(pack) { showToast("📞 Pack " + pack + " — Appelez le +225 05 96 697 054"); closeModal(); }
// ══ MODAL BIENVENUE ═══════════════════════════════════════
function showWelcomeModal(name, role) {
  var isPresta = role === "prestataire";
  var overlay = document.getElementById("overlay");
  var mTitle  = document.getElementById("mTitle");
  var mSub    = document.getElementById("mSub");
  var mBody   = document.getElementById("mBody");
  mTitle.textContent = "";
  mSub.textContent   = "";
  mBody.innerHTML = "";

  // Card bienvenue
  var card = document.createElement("div");
  card.style.cssText = "text-align:center;padding:10px 0 4px";

  // Logo LOKALI SVG
  card.innerHTML =
    "<div style='display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:20px'>"
    + "<svg width='48' height='48' viewBox='0 0 28 28' fill='none'>"
    +   "<circle cx='14' cy='11' r='8' fill='#FF6B2C'/>"
    +   "<circle cx='14' cy='11' r='3.5' fill='#0D0D0D'/>"
    +   "<circle cx='14' cy='11' r='1.5' fill='#00E676'/>"
    +   "<path d='M 8 17 Q 14 27 14 28 Q 14 27 20 17 Z' fill='#FF6B2C'/>"
    + "</svg>"
    + "<div style='font-size:20px;font-weight:900;letter-spacing:1px'><span style='color:#FF6B2C'>L</span>OKALI</div>"
    + "<div style='font-size:10px;color:rgba(255,255,255,.4);font-style:italic'>Sans visibilité, le talent ne sert à rien.</div>"
    + "</div>"

    + "<div style='font-size:28px;margin-bottom:10px'>🎉</div>"
    + "<h2 style='font-size:22px;font-weight:900;margin-bottom:8px'>Bienvenue, " + name + " !</h2>"
    + "<p style='font-size:14px;color:rgba(255,255,255,.65);line-height:1.7;margin-bottom:20px'>"
    +   "Votre compte est maintenant <strong style='color:#00E676'>actif</strong>.<br>"
    +   (isPresta
    ?   "Votre profil est visible sur LOKALI.<br>Les clients peuvent maintenant vous trouver et vous contacter."
    :   "Vous pouvez dès maintenant découvrir des prestataires,<br>entrer en contact et développer vos projets.")
    + "</p>"

    + "<div style='background:rgba(255,107,44,.08);border:1px solid rgba(255,107,44,.2);border-radius:12px;padding:16px;margin-bottom:20px;text-align:left'>"
    +   "<div style='font-size:12px;font-weight:700;color:#FF6B2C;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px'>Ce que vous pouvez faire maintenant</div>"
    +   (isPresta
    ?   "<div style='font-size:13px;color:rgba(255,255,255,.7);line-height:1.9'>✅ &nbsp;Votre profil est en ligne<br>📍 &nbsp;Vous apparaissez sur la carte<br>💬 &nbsp;Les clients peuvent vous contacter via WhatsApp<br>⭐ &nbsp;Recevez des avis et développez votre réputation</div>"
    :   "<div style='font-size:13px;color:rgba(255,255,255,.7);line-height:1.9'>🔍 &nbsp;Trouvez des prestataires près de chez vous<br>💬 &nbsp;Contactez-les directement via WhatsApp<br>⭐ &nbsp;Laissez des avis pour aider la communauté<br>❤️ &nbsp;Sauvegardez vos prestataires favoris</div>")
    + "</div>"

    + "<div style='font-size:12px;color:rgba(255,255,255,.35);margin-bottom:20px;font-style:italic'>Merci de votre confiance. L'équipe LOKALI.</div>";

  var closeBtn = document.createElement("button");
  closeBtn.className = "rsub";
  closeBtn.style.cssText = "width:100%;padding:14px;font-size:15px;font-weight:700;background:#FF6B2C;color:#fff;border:none;border-radius:12px;cursor:pointer";
  closeBtn.textContent = isPresta ? "🚀 Voir mon profil sur LOKALI" : "🔍 Explorer les prestataires";
  closeBtn.addEventListener("click", closeModal);

  card.appendChild(closeBtn);
  mBody.appendChild(card);
  overlay.classList.add("on");
}


async function updateDispo(pid, val) {
  if (!_supabase || !pid) return;
  try {
    await _supabase.from("prestataires").update({disponibilite: val}).eq("id", pid);
    showToast("Statut mis à jour : " + val);
    closeModal();
    loadPrestas(_currentCat);
  } catch(e) {
    showToast("Erreur mise à jour : " + e.message);
  }
}

function closeModal() { document.getElementById("overlay").classList.remove("on"); }

async function doLogin() {
  var email = document.getElementById("lEmail").value.trim();
  var pwd = document.getElementById("lPwd").value.trim();
  if (!email || !pwd) { showToast("❌ Remplis email et mot de passe"); return; }
  if (!_supabase) return;
  var res = await _supabase.auth.signInWithPassword({email:email, password:pwd});
  if (res.error) { showToast("❌ " + res.error.message); return; }
  _currentUser = res.data.user;
  closeModal();
  showToast("✅ Connexion réussie !");
  updateNavForUser();
  loadFavoris();
  syncAnnFavsToSupabase().then(loadAnnFavsFromSupabase);
}

// ── LANGUE ────────────────────────────────────
var I18N = {
  fr:{search:"Que cherches-tu ?",find:"Chercher",available:"Disponible",busy:"Occupé"},
  en:{search:"What are you looking for?",find:"Search",available:"Available",busy:"Busy"}
};
function setLang(l) {
  _lang = l;
  showToast(l === "fr" ? "🇫🇷 Langue : Français" : "🇬🇧 Language: English");
}

// ── TOAST ─────────────────────────────────────
var _tt;
function showToast(msg) {
  var t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(_tt);
  _tt = setTimeout(function(){ t.classList.remove("on"); }, 3000);
}

// ── INIT ──────────────────────────────────────

// ══ NOUVEAUTÉS PRÈS DE VOUS ══════════════════
async function loadNewPrestas() {
  if (!_supabase) return;
  var strip = document.getElementById("newsStrip");
  try {
    var res = await _supabase.from("prestataires").select("*").order("created_at",{ascending:false}).limit(10);
    var list = res.data || [];
    if (_userLat) {
      var near = list.filter(function(p){ return p.latitude&&p.longitude&&calcDist(_userLat,_userLng,p.latitude,p.longitude)<50; });
      if (near.length > 0) list = near;
    }
    if (!strip) return;
    if (!list.length) { strip.innerHTML='<div style="color:var(--gray);font-size:14px;padding:20px">Aucun nouveau prestataire pour le moment.</div>'; return; }
    var html = list.map(function(p){
      var isNew = (Date.now()-new Date(p.created_at).getTime()) < 7*24*60*60*1000;
      var dist = (_userLat&&p.latitude&&p.longitude) ? calcDist(_userLat,_userLng,p.latitude,p.longitude)+" km" : "";
      return '<div class="news-card" data-pid="'+p.id+'">'
        +'<div class="news-card-badge">'+(isNew?"🆕 Nouveau":"✨ Récent")+'</div>'
        +'<div class="news-card-name">'+p.nom+(p.verifie?' ✅':'')+'</div>'
        +'<div class="news-card-meta">'+(p.categorie||'')+(dist?' · 📍 '+dist:'')+'</div>'
        +'<div class="news-card-meta" style="margin-top:4px">'+(p.disponibilite==="disponible"?"🟢 Disponible":p.disponibilite==="bientot"?"🟡 Bientôt":"🔴 Occupé")+'</div>'
        +'</div>';
    }).join("");
    strip.innerHTML = html;
    strip.querySelectorAll(".news-card").forEach(function(el){
      var pid = el.getAttribute("data-pid");
      el.onclick = function(){ openProfil(pid); };
    });
    var sub = document.getElementById("newsSubtitle");
    if (sub) sub.textContent = list.length+" nouveau"+(list.length>1?"x":"")+" prestataire"+(list.length>1?"s":"")+" rejoints.";
  } catch(e) { console.log("[LOKALI] loadNewPrestas error:", e); }
}

// ══ OPPORTUNITÉS DU JOUR ══════════════════════
async function loadOpportunites() {
  if (!_supabase) return;
  var grid = document.getElementById("opportunGrid");
  if (!grid) return;
  try {
    var res = await _supabase.from("prestataires").select("*").eq("disponibilite","disponible").limit(20);
    var list = res.data || [];
    var seed = new Date().getDate();
    list = list.sort(function(a,b){ return ((a.nom.charCodeAt(0)+seed)%100) - ((b.nom.charCodeAt(0)+seed)%100); }).slice(0,4);
    if (!list.length) { grid.innerHTML='<div class="no-presta">Revenez demain pour les opportunités du jour !</div>'; return; }
    var html = list.map(function(p){
      var react = p.nb_vues>10 ? '<span class="react-badge">⚡ Très réactif</span>' : p.nb_vues>5 ? '<span class="react-badge">✅ Réponse rapide</span>' : '';
      var waNum = cleanTel(p.whatsapp||p.telephone||"");
      return '<div class="opport-card" data-pid="'+p.id+'">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
          +'<span style="font-size:11px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px">⭐ Opportunité du jour</span>'
          +(p.verifie?'<span class="badge badge-v">✅ Vérifié</span>':'')
        +'</div>'
        +'<div style="font-size:17px;font-weight:800;margin-bottom:4px">'+p.nom+'</div>'
        +'<div style="font-size:13px;color:var(--gray);margin-bottom:10px">'+(p.categorie||'')+' · '+(p.ville||'')+'</div>'
        +(react?'<div style="margin-bottom:10px">'+react+'</div>':'')
        +'<div style="display:flex;gap:8px">'
          +'<a href="https://wa.me/'+waNum+'" target="_blank" class="contact-wa" style="padding:10px 16px;font-size:13px">💬 WhatsApp</a>'
          +'<a href="tel:'+(p.telephone||'')+'" class="contact-call" style="padding:10px 16px;font-size:13px">📞 Appeler</a>'
        +'</div>'
      +'</div>';
    }).join("");
    grid.innerHTML = html;
    grid.querySelectorAll(".opport-card").forEach(function(el){
      var pid = el.getAttribute("data-pid");
      el.addEventListener("click", function(e){ if(e.target.tagName!=="A") openProfil(pid); });
    });
  } catch(e) {}
}

// ══ BADGE RÉACTIVITÉ ══════════════════════════
function getBadgeReactivite(p) {
  if ((p.nb_vues||0) > 50) return '<div style="margin:10px 0"><span class="react-badge">⚡ Répond généralement en moins de 10 min</span></div>';
  if ((p.nb_vues||0) > 20) return '<div style="margin:10px 0"><span class="react-badge">🚀 Très réactif</span></div>';
  if ((p.nb_vues||0) > 5)  return '<div style="margin:10px 0"><span class="react-badge">✅ Réponse rapide</span></div>';
  return '';
}

// ══ SUGGESTIONS COMPLÉMENTAIRES ══════════════
var COMPLEM = {
  "Photographe":["DJ","Traiteur","Animateur","Location chaises/tables"],
  "Traiteur":["Photographe","DJ","Location chaises/tables","Animateur"],
  "Maçon":["Plombier","Électricien","Peintre bâtiment","Carreleur"],
  "Menuisier":["Maçon","Peintre bâtiment","Électricien"],
  "Mécanicien auto":["Vulcanisateur","Tôlier"],
  "Coiffeur femme":["Maquilleuse","Manucure / Pédicure"],
  "Agent immobilier":["Maçon","Décorateur intérieur"],
  "Médecin généraliste":["Pharmacie","Kinésithérapeute"],
};

function getComplemHtml(cat) {
  var suggs = COMPLEM[cat];
  if (!suggs || !suggs.length) return "";
  var html = '<div style="margin:12px 0"><div style="font-size:11px;color:var(--gray);margin-bottom:8px;text-transform:uppercase;letter-spacing:1px">Vous pourriez aussi avoir besoin de</div><div style="display:flex;gap:6px;flex-wrap:wrap">';
  suggs.forEach(function(s) {
    html += '<span class="stag" data-qs="'+s+'" style="cursor:pointer">'+s+'</span>';
  });
  html += '</div></div>';
  return html;
}

// ══ DEVIS ══════════════════════════════════════
function initDevisForm() {
  var catSel = document.getElementById("devisCat");
  if (catSel && catSel.options.length <= 1) {
    CATS.forEach(function(cat) {
      var o = document.createElement("option");
      o.value = cat.n; o.textContent = cat.e+" "+cat.n;
      catSel.appendChild(o);
    });
  }
  var btn = document.getElementById("devisBtn");
  if (btn && !btn._bound) {
    btn._bound = true;
    btn.addEventListener("click", submitDevis);
  }
}


// ══ NOTIFICATION NOUVEAU PRESTATAIRE ══════════
function notifNouveauPresta(p) {
  var msg = "Un nouveau prestataire vient de rejoindre LOKALI"+(p.ville?" a "+p.ville:"")+" : "+p.nom+" ("+( p.categorie||"prestataire")+")";
  showNotif(msg);
  showToast("🆕 "+p.nom+" vient de rejoindre LOKALI !");
  setTimeout(loadNewPrestas, 500);
  loadRealStats();
}

function initRealtimePrestas() {
  if (!_supabase) return;
  _supabase.channel("new_prestas_ch")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"prestataires"},
      function(payload){ if(payload.new) notifNouveauPresta(payload.new); }
    ).subscribe();
}


// ══ PAYS + INDICATIFS ══
var PAYS_LIST = [
  // Afrique de l'Ouest francophone
  {n:"Côte d'Ivoire",t:"+225",f:"🇨🇮"},{n:"Sénégal",t:"+221",f:"🇸🇳"},{n:"Mali",t:"+223",f:"🇲🇱"},
  {n:"Burkina Faso",t:"+226",f:"🇧🇫"},{n:"Niger",t:"+227",f:"🇳🇪"},{n:"Bénin",t:"+229",f:"🇧🇯"},
  {n:"Togo",t:"+228",f:"🇹🇬"},{n:"Guinée",t:"+224",f:"🇬🇳"},{n:"Guinée-Bissau",t:"+245",f:"🇬🇼"},
  {n:"Mauritanie",t:"+222",f:"🇲🇷"},
  // Afrique anglophone/lusophone proche (utile au commerce régional)
  {n:"Sierra Leone",t:"+232",f:"🇸🇱"},{n:"Liberia",t:"+231",f:"🇱🇷"},{n:"Gambie",t:"+220",f:"🇬🇲"},
  {n:"Ghana",t:"+233",f:"🇬🇭"},{n:"Nigeria",t:"+234",f:"🇳🇬"},{n:"Cap-Vert",t:"+238",f:"🇨🇻"},
  // Afrique Centrale francophone
  {n:"Cameroun",t:"+237",f:"🇨🇲"},{n:"Gabon",t:"+241",f:"🇬🇦"},{n:"Congo",t:"+242",f:"🇨🇬"},
  {n:"RD Congo",t:"+243",f:"🇨🇩"},{n:"Tchad",t:"+235",f:"🇹🇩"},{n:"Rép. centrafricaine",t:"+236",f:"🇨🇫"},
  {n:"Guinée équatoriale",t:"+240",f:"🇬🇶"},
  // Afrique de l'Est / Océan Indien francophone
  {n:"Djibouti",t:"+253",f:"🇩🇯"},{n:"Comores",t:"+269",f:"🇰🇲"},{n:"Madagascar",t:"+261",f:"🇲🇬"},
  {n:"Maurice",t:"+230",f:"🇲🇺"},{n:"Seychelles",t:"+248",f:"🇸🇨"},{n:"Rwanda",t:"+250",f:"🇷🇼"},
  {n:"Burundi",t:"+257",f:"🇧🇮"},{n:"Mozambique",t:"+258",f:"🇲🇿"},{n:"Réunion",t:"+262",f:"🇷🇪"},
  {n:"Mayotte",t:"+262",f:"🇾🇹"},
  // Afrique Australe
  {n:"Afrique du Sud",t:"+27",f:"🇿🇦"},
  // Afrique du Nord (Maghreb francophone)
  {n:"Maroc",t:"+212",f:"🇲🇦"},{n:"Algérie",t:"+213",f:"🇩🇿"},{n:"Tunisie",t:"+216",f:"🇹🇳"},
  {n:"Libye",t:"+218",f:"🇱🇾"},{n:"Égypte",t:"+20",f:"🇪🇬"},
  // Europe francophone
  {n:"France",t:"+33",f:"🇫🇷"},{n:"Belgique",t:"+32",f:"🇧🇪"},{n:"Suisse",t:"+41",f:"🇨🇭"},
  {n:"Luxembourg",t:"+352",f:"🇱🇺"},{n:"Monaco",t:"+377",f:"🇲🇨"},{n:"Andorre",t:"+376",f:"🇦🇩"},
  // Amérique du Nord
  {n:"Canada",t:"+1",f:"🇨🇦"},{n:"États-Unis",t:"+1",f:"🇺🇸"},
  // Caraïbes francophones
  {n:"Haïti",t:"+509",f:"🇭🇹"},{n:"Guadeloupe",t:"+590",f:"🇬🇵"},{n:"Martinique",t:"+596",f:"🇲🇶"},
  {n:"Saint-Martin",t:"+590",f:"🇲🇫"},{n:"Sainte-Lucie",t:"+758",f:"🇱🇨"},{n:"Dominique",t:"+767",f:"🇩🇲"},
  // Amérique du Sud francophone
  {n:"Guyane française",t:"+594",f:"🇬🇫"},
  // Océanie francophone
  {n:"Nouvelle-Calédonie",t:"+687",f:"🇳🇨"},{n:"Polynésie française",t:"+689",f:"🇵🇫"},
  {n:"Vanuatu",t:"+678",f:"🇻🇺"},{n:"Wallis-et-Futuna",t:"+681",f:"🇼🇫"},
  // Asie francophone
  {n:"Liban",t:"+961",f:"🇱🇧"},{n:"Cambodge",t:"+855",f:"🇰🇭"},{n:"Vietnam",t:"+84",f:"🇻🇳"},{n:"Laos",t:"+856",f:"🇱🇦"},
  // Europe (commerce / diaspora)
  {n:"Espagne",t:"+34",f:"🇪🇸"},{n:"Portugal",t:"+351",f:"🇵🇹"},{n:"Royaume-Uni",t:"+44",f:"🇬🇧"},
  {n:"Allemagne",t:"+49",f:"🇩🇪"},{n:"Italie",t:"+39",f:"🇮🇹"},{n:"Pays-Bas",t:"+31",f:"🇳🇱"}
]

function fillPaysSelect(sel, withIndicatif) {
  if (!sel) return;
  if (sel.options.length > 1) return; // déjà rempli
  PAYS_LIST.forEach(function(p) {
    var o = document.createElement("option");
    o.value = p.n;
    o.dataset.t = p.t;
    o.textContent = (p.f ? p.f + " " : "") + p.n + (withIndicatif ? " (" + p.t + ")" : "");
    sel.appendChild(o);
  });
}

function onPaysChange(paysSelId, indicId, telId) {
  var sel = document.getElementById(paysSelId);
  if (!sel) return;
  sel.addEventListener("change", function() {
    var opt = sel.options[sel.selectedIndex];
    var t = opt ? (opt.dataset.t || "") : "";
    var ind = document.getElementById(indicId);
    var tel = document.getElementById(telId);
    if (ind && t) ind.value = t;
    if (tel && t) tel.placeholder = t + " XX XX XX XX";
  });
}

// ══ CATÉGORIES SUPPLÉMENTAIRES ══
var CATS_EXTRA = [
  {e:"🎓",n:"Formateur",c:"Éducation"},{e:"🌺",n:"Fleuriste",c:"Événements"},
  {e:"🚗",n:"Chauffeur VTC",c:"Transport"},{e:"✈️",n:"Agent de voyage",c:"Tourisme"},
  {e:"🧑‍💻",n:"Community manager",c:"Tech"},{e:"📢",n:"Influenceur",c:"Médias"},
  {e:"🥗",n:"Diététicien",c:"Santé"},{e:"🧠",n:"Psychologue",c:"Santé"},
  {e:"🐕",n:"Éducateur canin",c:"Animaux"},{e:"🐱",n:"Toiletteur animaux",c:"Animaux"},
  {e:"🏊",n:"Maître-nageur",c:"Sport"},{e:"🥊",n:"Entraîneur boxe",c:"Sport"},
  {e:"☀️",n:"Technicien solaire",c:"Énergie"},{e:"🌾",n:"Agronome",c:"Agriculture"},
  {e:"💆",n:"Sophrologue",c:"Bien-être"},{e:"🧘",n:"Coach bien-être",c:"Bien-être"},
  {e:"🎺",n:"Musicien",c:"Événements"},{e:"🎭",n:"Acteur",c:"Événements"},
  {e:"🍕",n:"Chef cuisinier",c:"Alimentation"},{e:"🏍️",n:"Coursier",c:"Transport"},
  {e:"🗺️",n:"Guide de voyage",c:"Tourisme"},{e:"🔋",n:"Technicien batteries",c:"Énergie"},
];

// ══ INSCRIPTION MODALE ══
function openInscription() {
  document.getElementById("mTitle").textContent = "Rejoindre LOKALI";
  document.getElementById("mSub").textContent = "Gratuit · En 2 minutes";
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  function mkCard(icon, title, desc, fn) {
    var div = document.createElement("div");
    div.className = "ri";
    div.style.cssText = "cursor:pointer;padding:18px;margin-bottom:12px;border-radius:14px;border:1.5px solid var(--border)";
    div.innerHTML = "<div style='font-size:22px;margin-bottom:6px'>"+icon+"</div><div style='font-size:16px;font-weight:800;margin-bottom:4px'>"+title+"</div><div style='font-size:13px;color:var(--gray)'>"+desc+"</div>";
    div.addEventListener("click", fn);
    div.addEventListener("mouseover", function(){ div.style.borderColor="var(--orange)"; });
    div.addEventListener("mouseout", function(){ div.style.borderColor="var(--border)"; });
    return div;
  }

  body.appendChild(mkCard("👤","Je suis un utilisateur","Trouver des prestataires, avis, favoris.", showFormUser));
  body.appendChild(mkCard("🔧","Je suis un prestataire","Être visible, recevoir des clients.", showFormPresta));

  var loginLink = document.createElement("p");
  loginLink.style.cssText = "text-align:center;font-size:13px;color:var(--gray);margin-top:8px";
  loginLink.innerHTML = "Déjà inscrit ? ";
  var a = document.createElement("a");
  a.href = "#"; a.style.color = "var(--orange)"; a.textContent = "Se connecter";
  a.onclick = function() { openModal("login"); return false; };
  loginLink.appendChild(a);
  body.appendChild(loginLink);
  document.getElementById("overlay").classList.add("on");
}

function mkInput(id, placeholder, type) {
  var inp = document.createElement("input");
  inp.className = "ri"; inp.id = id; inp.placeholder = placeholder;
  if (type) inp.type = type;
  if (type === "password") {
    var wrap = document.createElement("div");
    wrap.className = "pwd-wrap";
    wrap.appendChild(inp);
    var eyeBtn = document.createElement("button");
    eyeBtn.type = "button";
    eyeBtn.className = "pwd-eye";
    eyeBtn.innerHTML = "&#128065;";
    eyeBtn.setAttribute("aria-label", "Afficher le mot de passe");
    eyeBtn.addEventListener("click", function() {
      if (inp.type === "password") {
        inp.type = "text";
        eyeBtn.style.opacity = "1";
        eyeBtn.style.color = "var(--orange)";
      } else {
        inp.type = "password";
        eyeBtn.style.opacity = "";
        eyeBtn.style.color = "";
      }
    });
    wrap.appendChild(eyeBtn);
    return wrap;
  }
  return inp;
}
function mkSelect(id, label) {
  var sel = document.createElement("select");
  sel.className = "ri"; sel.id = id;
  var def = document.createElement("option"); def.value = ""; def.textContent = label;
  sel.appendChild(def);
  return sel;
}
function mkTextarea(id, placeholder, rows) {
  var ta = document.createElement("textarea");
  ta.className = "ri"; ta.id = id; ta.placeholder = placeholder;
  ta.rows = rows || 3; ta.style.resize = "none";
  return ta;
}
function mkLabel(htmlFor, text) {
  var lbl = document.createElement("label");
  lbl.style.cssText = "display:flex;align-items:flex-start;gap:10px;font-size:13px;color:var(--gray);cursor:pointer";
  var chk = document.createElement("input");
  chk.type = "checkbox"; chk.id = htmlFor + "_cgu"; chk.style.cssText = "margin-top:2px;accent-color:var(--orange)";
  lbl.appendChild(chk);
  var span = document.createElement("span");
  span.textContent = text;
  lbl.appendChild(span);
  return lbl;
}
function mkBtn(id, text) {
  var btn = document.createElement("button");
  btn.className = "rsub"; btn.id = id; btn.textContent = text;
  return btn;
}
function mkBack() {
  var btn = document.createElement("button");
  btn.style.cssText = "background:none;border:none;color:var(--gray);font-size:13px;cursor:pointer;text-decoration:underline;width:100%;margin-top:4px";
  btn.textContent = "← Retour";
  btn.onclick = openInscription;
  return btn;
}
function mkSection(text) {
  var d = document.createElement("div");
  d.style.cssText = "font-size:11px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px;padding:8px 0 2px";
  d.textContent = text;
  return d;
}
function appendAll(parent, items) {
  items.forEach(function(item){ if(item) parent.appendChild(item); });
}

function showFormUser() {
  document.getElementById("mTitle").textContent = "Créer mon compte";
  document.getElementById("mSub").textContent = "Utilisateur — Gratuit";
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  var sexeSel = mkSelect("uSexe", "-- Sexe --");
  ["Homme","Femme","Autre"].forEach(function(s){ var o=document.createElement("option");o.value=s;o.textContent=s;sexeSel.appendChild(o); });

  var paysSel = mkSelect("uPays", "-- Pays *");
  fillPaysSelect(paysSel, false);

  var grid1 = document.createElement("div");
  grid1.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px";
  var prenomInp = mkInput("uPrenom","Prénom *");
  var nomInp = mkInput("uNom","Nom *");
  grid1.appendChild(prenomInp); grid1.appendChild(nomInp);

  var telGrid = document.createElement("div");
  telGrid.style.cssText = "display:flex;gap:8px";
  var indicInp = mkInput("uIndic","+225");
  indicInp.style.cssText = "width:90px;flex-shrink:0";
  var telInp = mkInput("uTel","Téléphone *","tel");
  telInp.style.flex = "1";
  telGrid.appendChild(indicInp); telGrid.appendChild(telInp);

  var btn = mkBtn("btnRegUser","Créer mon compte →");

  appendAll(body, [
    grid1, sexeSel, paysSel,
    mkInput("uVille","Ville *"),
    telGrid,
    mkInput("uEmail","Email *","email"),
    mkInput("uPwd","Mot de passe * (min. 8 caractères)","password"),
    mkInput("uPwd2","Confirmer le mot de passe *","password"),
    mkLabel("uCgu","J accepte les conditions d utilisation"),
    btn, mkBack()
  ]);

  paysSel.addEventListener("change", function() {
    var opt = paysSel.options[paysSel.selectedIndex];
    var t = opt ? (opt.dataset.t||"") : "";
    if (t) { indicInp.value=t; telInp.placeholder=t+" XX XX XX XX"; }
  });

  btn.addEventListener("click", doRegisterUser);
}

function showFormPresta(existingProfile) {
  var isAlreadyLoggedIn = !!_currentUser;
  var isEditMode = !!existingProfile;
  document.getElementById("mTitle").textContent = isEditMode ? "⚙️ Modifier mon profil" : (isAlreadyLoggedIn ? "Devenir prestataire" : "Mon profil prestataire");
  document.getElementById("mSub").textContent = isEditMode
    ? "Mets à jour tes informations"
    : (isAlreadyLoggedIn ? "Ajoute ton activité à ton compte LOKALI existant" : "100% gratuit · Visible immédiatement");
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  var paysSel2 = mkSelect("pPays","-- Pays *");
  fillPaysSelect(paysSel2, false);

  var villeSel2 = mkSelect("pVille","-- Ville *");
  paysSel2.addEventListener("change", function() {
    fillVillesByPays(paysSel2.value, villeSel2);
  });
  var villeAutreInp2 = mkInput("pVilleAutre","Préciser la ville (si non listée)");
  villeAutreInp2.style.display = "none";
  villeSel2.addEventListener("change", function() {
    villeAutreInp2.style.display = villeSel2.value === "__autre__" ? "block" : "none";
  });

  var catSel2 = mkSelect("pCat","-- Secteur d'activité *");
  Object.keys(ANN_CATS).forEach(function(cat){
    var o=document.createElement("option"); o.value=cat;
    o.textContent=cat; catSel2.appendChild(o);
  });

  var sousCatSel2 = mkSelect("pSousCat","-- Métier précis *");
  catSel2.addEventListener("change", function() {
    sousCatSel2.innerHTML = "<option value=''>-- Métier précis *</option>";
    (ANN_CATS[catSel2.value]||[]).forEach(function(s) {
      var o = document.createElement("option"); o.value = s; o.textContent = s; sousCatSel2.appendChild(o);
    });
  });

  // Recherche rapide de métier (autocomplete sur 319 métiers)
  var metierSearchPresta = mkMetierSearch(function(cat, sub) {
    catSel2.value = cat;
    catSel2.dispatchEvent(new Event("change"));
    setTimeout(function() { sousCatSel2.value = sub; }, 50);
  });

  var catAutreInp = mkInput("pCatAutre","Précisez si votre métier n'apparaît pas dans la liste");

  var dispoSel = mkSelect("pDispo","Disponibilité");
  [{v:"disponible",l:"🟢 Disponible maintenant"},{v:"bientot",l:"🟡 Disponible bientôt"},{v:"occupe",l:"🔴 Occupé"}].forEach(function(d){
    var o=document.createElement("option"); o.value=d.v; o.textContent=d.l; dispoSel.appendChild(o);
  });

  var indicInp2 = mkInput("pIndic","+225");
  indicInp2.style.cssText = "width:90px;flex-shrink:0";
  var telInp2 = mkInput("pTel","Téléphone *","tel");
  telInp2.style.flex = "1";
  var telGrid2 = document.createElement("div");
  telGrid2.style.cssText = "display:flex;gap:8px";
  telGrid2.appendChild(indicInp2); telGrid2.appendChild(telInp2);

  paysSel2.addEventListener("change",function(){
    var opt=paysSel2.options[paysSel2.selectedIndex];
    var t=opt?(opt.dataset.t||""):"";
    if(t){indicInp2.value=t;telInp2.placeholder=t+" XX XX XX XX";}
  });

  var btn2 = mkBtn("btnRegPresta", isEditMode ? "💾 Enregistrer les modifications" : "Publier mon profil →");
  var photoProfil = mkPhotoUploadSingle("pPhotoProfil","Photo de profil");
  var photoGalerie = mkPhotoGallery("pGalerie","Photos de votre activité (max 6)", 6);

  appendAll(body, [
    mkSection("Vos informations"),
    photoProfil,
    mkInput("pNom","Nom du responsable *"),
    mkInput("pEntreprise","Nom de l entreprise ou du commerce"),
    mkSection("Localisation"),
    paysSel2, villeSel2, villeAutreInp2,
    mkInput("pQuartier","Quartier"), mkInput("pAdresse","Adresse complète"),
    mkSection("Contact"),
    telGrid2, mkInput("pWa","WhatsApp (si différent)"),
    mkInput("pWeb","Site web (optionnel)"),
    mkSection("Votre activité"),
    metierSearchPresta, catSel2, sousCatSel2, catAutreInp,
    mkTextarea("pDesc","Décrivez votre activité, services, expérience..."),
    photoGalerie,
    mkInput("pTarif","Tarif indicatif (ex: 2000 FCFA/h)"),
    mkInput("pZone","Zone d intervention (ex: Abidjan et environs)"),
    mkInput("pHoraires","Horaires (ex: Lun-Sam 8h-18h)"),
    dispoSel,
    mkSection("Profil détaillé (optionnel mais recommandé)"),
    mkInput("pExperience","Années d expérience (ex: 5 ans)"),
    mkInput("pLangues","Langues parlées (ex: Français, Anglais, Dioula)"),
    mkInput("pCertifs","Certifications / Diplômes"),
    mkInput("pPaiement","Moyens de paiement acceptés (ex: Espèces, Wave, OM)"),
    mkSection("Réseaux sociaux (optionnel)"),
    mkInput("pFacebook","Page Facebook (lien complet)"),
    mkInput("pInstagram","Instagram (lien complet)"),
    mkInput("pTiktok","TikTok (lien complet)"),
    mkLabel("pCgu","J accepte les conditions d utilisation"),
    btn2, mkBack()
  ]);

  if (isEditMode) {
    // Mode édition : pré-remplir tous les champs avec les données existantes
    document.getElementById("pNom").value = existingProfile.nom || "";
    document.getElementById("pEntreprise").value = existingProfile.entreprise || "";
    document.getElementById("pQuartier").value = existingProfile.quartier || "";
    document.getElementById("pAdresse").value = existingProfile.adresse || "";
    document.getElementById("pTel").value = (existingProfile.telephone||"").replace(/^\+?\d{1,4}/,"");
    document.getElementById("pWa").value = existingProfile.whatsapp || "";
    document.getElementById("pWeb").value = existingProfile.site_web || "";
    document.getElementById("pDesc").value = existingProfile.description || "";
    document.getElementById("pTarif").value = existingProfile.tarif || "";
    document.getElementById("pZone").value = existingProfile.zone || "";
    document.getElementById("pHoraires").value = existingProfile.horaires || "";
    if (document.getElementById("pExperience")) document.getElementById("pExperience").value = existingProfile.experience || "";
    if (document.getElementById("pLangues")) document.getElementById("pLangues").value = existingProfile.langues || "";
    if (document.getElementById("pCertifs")) document.getElementById("pCertifs").value = existingProfile.certifications || "";
    if (document.getElementById("pPaiement")) document.getElementById("pPaiement").value = existingProfile.moyens_paiement || "";
    if (document.getElementById("pFacebook")) document.getElementById("pFacebook").value = existingProfile.facebook || "";
    if (document.getElementById("pInstagram")) document.getElementById("pInstagram").value = existingProfile.instagram || "";
    if (document.getElementById("pTiktok")) document.getElementById("pTiktok").value = existingProfile.tiktok || "";
    if (existingProfile.pays) {
      paysSel2.value = existingProfile.pays;
      fillVillesByPays(existingProfile.pays, villeSel2);
      setTimeout(function(){ villeSel2.value = existingProfile.ville || ""; }, 50);
    }
    if (existingProfile.categorie) {
      // Chercher la catégorie parente du métier précis enregistré
      var foundCat = null;
      Object.keys(ANN_CATS).forEach(function(c) {
        if (ANN_CATS[c].indexOf(existingProfile.categorie) !== -1) foundCat = c;
      });
      if (foundCat) {
        catSel2.value = foundCat;
        catSel2.dispatchEvent(new Event("change"));
        setTimeout(function(){ sousCatSel2.value = existingProfile.categorie; }, 50);
      } else {
        catAutreInp.value = existingProfile.categorie;
      }
    }
    if (existingProfile.disponibilite) dispoSel.value = existingProfile.disponibilite;
    if (existingProfile.photo_profil) {
      var slot = document.getElementById("pPhotoProfil_slot");
      if (slot) { slot.innerHTML = "<img src='"+existingProfile.photo_profil+"' style='width:100%;height:100%;object-fit:cover'>"; slot.dataset.value = existingProfile.photo_profil; }
    }
    var cguChk = document.getElementById("pCgu_cgu");
    if (cguChk) cguChk.checked = true;
  }

  // Si non connecté ET pas en mode édition : ajouter les champs email + mot de passe (création de compte)
  if (!isAlreadyLoggedIn && !isEditMode) {
    var emailInp = mkInput("pEmail","Email *","email");
    var pwdInp = mkInput("pPwd","Mot de passe * (min. 8 caractères)","password");
    var pwd2Inp = mkInput("pPwd2","Confirmer le mot de passe *","password");
    var compteSection = mkSection("Votre compte");
    btn2.parentNode.insertBefore(compteSection, btn2);
    btn2.parentNode.insertBefore(emailInp, btn2);
    btn2.parentNode.insertBefore(pwdInp, btn2);
    btn2.parentNode.insertBefore(pwd2Inp, btn2);
  } else if (isAlreadyLoggedIn && !isEditMode) {
    var infoBox = document.createElement("div");
    infoBox.style.cssText = "background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:12px 14px;font-size:13px;color:#10B981;margin-bottom:14px";
    infoBox.textContent = "✅ Connecté en tant que " + (_currentUser.email||"") + " — ton profil prestataire sera lié à ce compte.";
    btn2.parentNode.insertBefore(infoBox, btn2);
  }

  btn2.addEventListener("click", function() {
    if (isEditMode) updateMyPrestaProfile(existingProfile.id);
    else doRegisterPresta();
  });
}

// ── Sauvegarder les modifications d'un profil prestataire existant ──
async function updateMyPrestaProfile(prestaId) {
  var cat = (document.getElementById("pSousCat")||{}).value || (document.getElementById("pCatAutre")||{}).value || (document.getElementById("pCat")||{}).value;
  var photoProfilSlot = document.getElementById("pPhotoProfil_slot");
  var photoProfilVal = photoProfilSlot ? (photoProfilSlot.dataset.value || "") : "";
  var galeriePhotos = getGalleryValues("pGalerie", 6);

  var updated = {
    nom: document.getElementById("pNom").value,
    entreprise: document.getElementById("pEntreprise").value,
    pays: document.getElementById("pPays").value,
    ville: document.getElementById("pVille").value,
    quartier: document.getElementById("pQuartier").value,
    adresse: document.getElementById("pAdresse").value,
    telephone: ((document.getElementById("pIndic")||{}).value||"") + ((document.getElementById("pTel")||{}).value||""),
    whatsapp: document.getElementById("pWa").value,
    site_web: document.getElementById("pWeb").value,
    categorie: cat,
    description: document.getElementById("pDesc").value,
    tarif: document.getElementById("pTarif").value,
    zone: document.getElementById("pZone").value,
    horaires: document.getElementById("pHoraires").value,
    disponibilite: document.getElementById("pDispo").value,
    experience: (document.getElementById("pExperience")||{}).value||"",
    langues: (document.getElementById("pLangues")||{}).value||"",
    certifications: (document.getElementById("pCertifs")||{}).value||"",
    moyens_paiement: (document.getElementById("pPaiement")||{}).value||"",
    facebook: (document.getElementById("pFacebook")||{}).value||"",
    instagram: (document.getElementById("pInstagram")||{}).value||"",
    tiktok: (document.getElementById("pTiktok")||{}).value||"",
    photo_profil: photoProfilVal,
    photo1: galeriePhotos[0]||null, photo2: galeriePhotos[1]||null,
    photo3: galeriePhotos[2]||null, photo4: galeriePhotos[3]||null,
    photo5: galeriePhotos[4]||null, photo6: galeriePhotos[5]||null
  };

  try {
    await _supabase.from("prestataires").update(updated).eq("id", prestaId);
    showToast("✅ Profil mis à jour !");
    closeModal();
    setTimeout(openDashboard, 200);
  } catch(e) { showToast("Erreur : " + e.message); }
}

async function doRegisterUser() {
  var prenom = (document.getElementById("uPrenom")||{}).value||"";
  var nom = (document.getElementById("uNom")||{}).value||"";
  var email = (document.getElementById("uEmail")||{}).value||"";
  var pwd = (document.getElementById("uPwd")||{}).value||"";
  var pwd2 = (document.getElementById("uPwd2")||{}).value||"";
  var pays = (document.getElementById("uPays")||{}).value||"";
  var ville = (document.getElementById("uVille")||{}).value||"";
  var tel = ((document.getElementById("uIndic")||{}).value||"") + ((document.getElementById("uTel")||{}).value||"");
  var cgu = document.getElementById("uCgu_cgu");
  if (!prenom||!nom) { showToast("Prénom et nom obligatoires"); return; }
  if (!email) { showToast("Email obligatoire"); return; }
  if (!pwd||pwd.length<8) { showToast("Mot de passe : min 8 caractères"); return; }
  if (pwd!==pwd2) { showToast("Mots de passe différents"); return; }
  if (!pays||!ville) { showToast("Pays et ville obligatoires"); return; }
  if (!cgu||!cgu.checked) { showToast("Accepte les conditions"); return; }
  if (!_supabase) { showToast("Connexion indisponible"); return; }
  showToast("Création du compte...");
  try {
    var res = await _supabase.auth.signUp({email:email,password:pwd,options:{data:{prenom:prenom,nom:nom,pays:pays,ville:ville,telephone:tel.trim(),role:"user"},emailRedirectTo:window.location.origin}});
    if (res.error) { showToast("Erreur : "+res.error.message); return; }
    _currentUser = res.data.user;
    closeModal();
    updateNavForUser(prenom+" "+nom);
    loadFavoris();
    loadRealStats();
    showWelcomeModal(prenom+" "+nom, "user");
  } catch(e) { showToast("Erreur : "+e.message); }
}

async function doRegisterPresta() {
  var nom = (document.getElementById("pNom")||{}).value||"";
  var pays = (document.getElementById("pPays")||{}).value||"";
  var villeVal2 = (document.getElementById("pVille")||{}).value||"";
  var ville = villeVal2 === "__autre__" ? ((document.getElementById("pVilleAutre")||{}).value||"") : villeVal2;
  var tel = ((document.getElementById("pIndic")||{}).value||"") + ((document.getElementById("pTel")||{}).value||"");
  var catVal = (document.getElementById("pCat")||{}).value||"";
  var sousCatVal = (document.getElementById("pSousCat")||{}).value||"";
  var catAutreVal = (document.getElementById("pCatAutre")||{}).value||"";
  var cat = sousCatVal || catAutreVal || catVal;
  var cgu = document.getElementById("pCgu_cgu");

  // ── Cas A : déjà connecté (utilisateur qui devient aussi prestataire) ──
  var isAlreadyLoggedIn = !!_currentUser;
  var email, pwd, pwd2;
  if (!isAlreadyLoggedIn) {
    email = (document.getElementById("pEmail")||{}).value||"";
    pwd = (document.getElementById("pPwd")||{}).value||"";
    pwd2 = (document.getElementById("pPwd2")||{}).value||"";
  }

  if (!nom) { showToast("Nom obligatoire"); return; }
  if (!isAlreadyLoggedIn) {
    if (!email) { showToast("Email obligatoire"); return; }
    if (!pwd||pwd.length<8) { showToast("Mot de passe : min 8 caractères"); return; }
    if (pwd!==pwd2) { showToast("Mots de passe différents"); return; }
  }
  if (!pays||!ville) { showToast("Pays et ville obligatoires"); return; }
  if (!cat) { showToast("Catégorie obligatoire"); return; }
  if (!cgu||!cgu.checked) { showToast("Accepte les conditions"); return; }
  if (!_supabase) { showToast("Connexion indisponible"); return; }
  showToast("Publication du profil...");
  try {
    var uid;
    if (isAlreadyLoggedIn) {
      // Compte déjà existant — pas de nouvelle inscription, on réutilise le compte
      uid = _currentUser.id;
      email = _currentUser.email;
    } else {
      var res = await _supabase.auth.signUp({email:email,password:pwd,options:{data:{nom:nom,role:"prestataire"},emailRedirectTo:window.location.origin}});
      if (res.error) { showToast("Erreur : "+res.error.message); return; }
      uid = res.data.user.id;
      _currentUser = res.data.user;
    }

    var photoProfilSlot = document.getElementById("pPhotoProfil_slot");
    var photoProfilVal = photoProfilSlot ? (photoProfilSlot.dataset.value || "") : "";
    var galeriePhotos = getGalleryValues("pGalerie", 6);

    var data = {
      user_id:uid, nom:nom, email:email,
      telephone:tel.trim(),
      whatsapp:(document.getElementById("pWa")||{}).value||tel.trim(),
      pays:pays, ville:ville,
      quartier:(document.getElementById("pQuartier")||{}).value||"",
      categorie:cat,
      description:(document.getElementById("pDesc")||{}).value||"",
      tarif:(document.getElementById("pTarif")||{}).value||"",
      disponibilite:(document.getElementById("pDispo")||{}).value||"disponible",
      site_web:(document.getElementById("pWeb")||{}).value||"",
      horaires:(document.getElementById("pHoraires")||{}).value||"",
      zone:(document.getElementById("pZone")||{}).value||"",
      experience:(document.getElementById("pExperience")||{}).value||"",
      langues:(document.getElementById("pLangues")||{}).value||"",
      certifications:(document.getElementById("pCertifs")||{}).value||"",
      moyens_paiement:(document.getElementById("pPaiement")||{}).value||"",
      facebook:(document.getElementById("pFacebook")||{}).value||"",
      instagram:(document.getElementById("pInstagram")||{}).value||"",
      tiktok:(document.getElementById("pTiktok")||{}).value||"",
      latitude:_userLat, longitude:_userLng,
      photo_profil: photoProfilVal,
      photo1: galeriePhotos[0]||null, photo2: galeriePhotos[1]||null,
      photo3: galeriePhotos[2]||null, photo4: galeriePhotos[3]||null,
      photo5: galeriePhotos[4]||null, photo6: galeriePhotos[5]||null,
      verifie:false, nb_vues:0
    };
    // upsert : si un profil prestataire existe déjà pour ce user_id, on le met à jour
    await _supabase.from("prestataires").upsert(data, {onConflict: "user_id"});
    closeModal();
    updateNavForUser(nom);
    loadPrestas(_currentCat);
    loadRealStats();
    loadNewPrestas();
    showWelcomeModal(nom, "prestataire");
  } catch(e) { showToast("Erreur : "+e.message); }
}

function updateNavForUser(displayName) {
  var btns = document.querySelector(".nav-btns");
  if (btns) {
    btns.innerHTML = "";
    var bExp = document.createElement("button");
    bExp.className = "btn-express"; bExp.title = "LOKALI Express"; bExp.textContent = "⚡";
    bExp.onclick = openExpressSearch;
    var bAnn = document.createElement("button");
    bAnn.className = "btn-annonces"; bAnn.title = "Annonces"; bAnn.innerHTML = "📢<span class='ndot'></span>";
    bAnn.onclick = showAnnoncesPage;
    var b1 = document.createElement("button");
    b1.className = "btn-pri"; b1.textContent = "📊 Mon compte";
    b1.onclick = openDashboard;
    btns.appendChild(bExp); btns.appendChild(bAnn); btns.appendChild(b1);
  }
}

// ══ SPONSORS + PARTENAIRES MODALS COMPLETS ══
// ══ SPONSORS + PARTENAIRES — FLOW PAIEMENT COMPLET ══════════
function buildSponsorModal(type) {
  var isSponsor = type === "sponsor";
  var tiers = isSponsor
    ? [{icon:"🥉",name:"Bronze",price:8000,desc:"Logo + lien · Bannière · 1 mois",max:6},
       {icon:"🥈",name:"Argent",price:15000,desc:"Bronze + Pub rotation · 1 mois",max:4},
       {icon:"🥇",name:"Or",price:25000,desc:"Argent + Position prioritaire",featured:true,max:2},
       {icon:"💎",name:"Platine",price:80000,desc:"Visibilité maximale · Exclusif",featured:true,max:1}]
    : [{icon:"🌱",name:"Bronze",price:4000,desc:"Logo dans le footer",max:10},
       {icon:"🌿",name:"Argent",price:8000,desc:"Logo + page accueil",max:6},
       {icon:"🌳",name:"Or",price:15000,desc:"Partenaire officiel LOKALI",featured:true,max:3}];

  document.getElementById("mTitle").textContent = isSponsor ? "🏆 Devenir Sponsor" : "🤝 Devenir Partenaire";
  document.getElementById("mSub").textContent = isSponsor ? "Gagnez en visibilité sur LOKALI" : "Associez votre marque à LOKALI";
  var body = document.getElementById("mBody");
  body.innerHTML = "<div style='text-align:center;padding:20px;color:var(--gray)'>Vérification des places disponibles...</div>";
  document.getElementById("overlay").classList.add("on");

  // ── Vérifier le nombre de places restantes par pack (places prises) ──
  checkPackAvailability(type, tiers).then(function(tiersWithAvail) {
    renderSponsorForm(type, isSponsor, tiersWithAvail, body);
  });
}

async function checkPackAvailability(type, tiers) {
  if (!_supabase) return tiers;
  try {
    var res = await _supabase.from("sponsors_partenaires")
      .select("pack")
      .eq("type", type)
      .eq("statut", "valide")
      .gte("date_fin", new Date().toISOString());
    var counts = {};
    (res.data||[]).forEach(function(r){ counts[r.pack] = (counts[r.pack]||0) + 1; });
    tiers.forEach(function(t){ t.taken = counts[t.name] || 0; t.remaining = Math.max(0, t.max - t.taken); });
  } catch(e) {
    console.warn("checkPackAvailability:", e);
    tiers.forEach(function(t){ t.remaining = t.max; });
  }
  return tiers;
}

function renderSponsorForm(type, isSponsor, tiers, body) {
  body.innerHTML = "";
  var _selTier = null;
  var _logoData = null;

  // ── Grille packs avec places restantes ──────────────
  var grid = document.createElement("div");
  grid.className = "pack-grid";
  grid.style.marginBottom = "16px";

  tiers.forEach(function(tier) {
    var isFull = tier.remaining <= 0;
    var card = document.createElement("div");
    card.className = "pack" + (tier.featured ? " featured" : "") + (isFull ? " full" : "");
    if (isFull) card.style.cssText = "opacity:.45;cursor:not-allowed;pointer-events:none";
    card.innerHTML = "<div class='pack-icon'>"+tier.icon+"</div>"
      + "<div class='pack-name'>"+tier.name+"</div>"
      + "<div class='pack-price'>"+Number(tier.price).toLocaleString("fr-FR")+" FCFA</div>"
      + "<div class='pack-desc'>"+tier.desc+"</div>"
      + "<div style='margin-top:8px;font-size:11px;font-weight:700;color:"+(isFull?"#EF4444":"#10B981")+"'>"
      + (isFull ? "✕ Complet" : tier.remaining + " place" + (tier.remaining>1?"s":"") + " restante" + (tier.remaining>1?"s":""))
      + "</div>";
    if (!isFull) {
      card.addEventListener("click", function() {
        grid.querySelectorAll(".pack").forEach(function(p){ p.classList.remove("sel"); });
        card.classList.add("sel");
        _selTier = tier;
        var lbl = document.getElementById("fPackLabel");
        if (lbl) {
          lbl.textContent = "Pack "+tier.name+" sélectionné — "+Number(tier.price).toLocaleString("fr-FR")+" FCFA";
          lbl.style.display = "block";
        }
        var sel = document.getElementById("fPack");
        if (sel) sel.value = tier.name;
      });
    }
    grid.appendChild(card);
  });
  body.appendChild(grid);

  var allFull = tiers.every(function(t){ return t.remaining <= 0; });
  if (allFull) {
    var fullMsg = document.createElement("div");
    fullMsg.style.cssText = "background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:14px;text-align:center;font-size:13px;color:#EF4444;margin-bottom:14px";
    fullMsg.textContent = "Tous nos packs " + (isSponsor?"sponsor":"partenaire") + " sont actuellement complets. Contactez-nous pour être notifié dès qu'une place se libère.";
    body.appendChild(fullMsg);
    var contactBtn = document.createElement("button");
    contactBtn.className = "rsub";
    contactBtn.style.background = "var(--orange)";
    contactBtn.textContent = "📱 Nous contacter sur WhatsApp";
    contactBtn.addEventListener("click", function() {
      window.open("https://wa.me/2250707869178?text=" + encodeURIComponent("Bonjour, je souhaite être notifié quand une place "+(isSponsor?"sponsor":"partenaire")+" se libère sur LOKALI."), "_blank");
    });
    body.appendChild(contactBtn);
    return;
  }

  // Pack label
  var packLabel = document.createElement("div");
  packLabel.id = "fPackLabel";
  packLabel.style.cssText = "display:none;background:rgba(249,115,22,.12);border:1px solid rgba(249,115,22,.3);border-radius:8px;padding:8px 14px;font-size:13px;font-weight:700;color:var(--orange);text-align:center;margin-bottom:8px";
  body.appendChild(packLabel);

  // ── Zone upload logo/bannière ───────────────────────
  var logoSection = document.createElement("div");
  logoSection.style.cssText = "background:var(--dark3);border-radius:12px;padding:16px;margin-bottom:14px";
  logoSection.innerHTML = "<div style='font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px'>Votre logo / bannière *</div>"
    + "<div style='font-size:11px;color:var(--gray);margin-bottom:12px'>Format recommandé : PNG/JPG, fond transparent si possible. Sera automatiquement redimensionné pour s'intégrer harmonieusement au design LOKALI.</div>";
  var logoSlot = document.createElement("div");
  logoSlot.style.cssText = "width:100%;height:100px;background:var(--dark2);border:1.5px dashed rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--gray);cursor:pointer;overflow:hidden;position:relative";
  logoSlot.innerHTML = "📷 Cliquer pour choisir une image";
  logoSlot.addEventListener("click", function() {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.addEventListener("change", function() {
      var file = inp.files[0]; if (!file) return;
      compressAndLoadImage(file, 600, function(dataUrl) {
        logoSlot.innerHTML = "<img src='"+dataUrl+"' style='max-width:100%;max-height:100%;object-fit:contain'>";
        _logoData = dataUrl;
      });
    });
    inp.click();
  });
  logoSection.appendChild(logoSlot);
  body.appendChild(logoSection);

  // ── Formulaire ───────────────────────────────────
  var form = document.createElement("div");
  form.style.cssText = "display:flex;flex-direction:column;gap:10px";

  var packSel = mkSelect("fPack","-- Choisir un pack *");
  tiers.forEach(function(t){
    if (t.remaining <= 0) return;
    var o=document.createElement("option"); o.value=t.name;
    o.textContent=t.icon+" "+t.name+" — "+Number(t.price).toLocaleString("fr-FR")+" FCFA ("+t.remaining+" place"+(t.remaining>1?"s":"")+")";
    packSel.appendChild(o);
  });
  packSel.addEventListener("change", function() {
    var t = tiers.find(function(x){ return x.name===packSel.value; });
    _selTier = t || null;
    var lbl = document.getElementById("fPackLabel");
    if (lbl && t) { lbl.textContent="Pack "+t.name+" sélectionné — "+Number(t.price).toLocaleString("fr-FR")+" FCFA"; lbl.style.display="block"; }
  });

  var dureeSel = mkSelect("fDuree","Durée souhaitée");
  ["1 mois","3 mois","6 mois","1 an"].forEach(function(d){
    var o=document.createElement("option"); o.value=d; o.textContent=d; dureeSel.appendChild(o);
  });

  var paysSel3 = mkSelect("fPays","-- Pays *");
  fillPaysSelect(paysSel3, false);

  var submitBtn = mkBtn("fSubmit", "💳 Valider et procéder au paiement →");
  submitBtn.style.background = "var(--orange)";

  appendAll(form, [
    mkInput("fEntreprise","Nom de l entreprise *"),
    mkInput("fResponsable","Responsable *"),
    mkInput("fEmail","Email *","email"),
    mkInput("fTel","Téléphone *","tel"),
    paysSel3, mkInput("fVille","Ville *"),
    mkInput("fLien","Lien (site web, page Facebook, WhatsApp...)"),
    packSel, dureeSel,
    mkTextarea("fMsg","Message ou question (optionnel)",2),
    submitBtn
  ]);
  body.appendChild(form);

  submitBtn.addEventListener("click", function() {
    var ent = (document.getElementById("fEntreprise")||{}).value||"";
    var resp = (document.getElementById("fResponsable")||{}).value||"";
    var em = (document.getElementById("fEmail")||{}).value||"";
    var tel = (document.getElementById("fTel")||{}).value||"";
    var pack = (document.getElementById("fPack")||{}).value||"";
    var duree = (document.getElementById("fDuree")||{}).value||"1 mois";
    var msg = (document.getElementById("fMsg")||{}).value||"";
    var lien = (document.getElementById("fLien")||{}).value||"";
    var pays3 = (document.getElementById("fPays")||{}).value||"";
    var ville3 = (document.getElementById("fVille")||{}).value||"";
    if (!ent||!resp||!em||!tel||!pack) { showToast("Remplis tous les champs obligatoires"); return; }
    if (!_logoData) { showToast("Ajoute ton logo ou ta bannière"); return; }
    var tierObj = tiers.find(function(t){ return t.name===pack; }) || _selTier;
    if (!tierObj) { showToast("Sélectionne un pack"); return; }
    showPayChoiceModal(isSponsor, tierObj, {
      ent:ent, resp:resp, em:em, tel:tel, duree:duree, msg:msg,
      lien:lien, pays:pays3, ville:ville3, logo:_logoData
    });
  });
}

// ── Compression image générique (toute la plateforme) ─────────
function compressAndLoadImage(file, maxWidth, callback) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement("canvas");
      var ratio = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ── Étape 2 : Choix du mode de paiement ─────────────────────
function showPayChoiceModal(isSponsor, tier, info) {
  document.getElementById("mTitle").textContent = "LOKALI";
  document.getElementById("mSub").textContent = "Choisissez votre mode de paiement";
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  var infoBand = document.createElement("div");
  infoBand.style.cssText = "text-align:center;font-weight:700;font-size:14px;margin-bottom:18px;color:var(--white)";
  infoBand.textContent = info.ent+" · Pack "+tier.name+" · "+Number(tier.price).toLocaleString("fr-FR")+" FCFA";
  body.appendChild(infoBand);

  // Bouton paiement direct mobile money
  var btnDirect = document.createElement("button");
  btnDirect.className = "rsub";
  btnDirect.style.cssText = "width:100%;padding:16px;font-size:15px;font-weight:700;border:none;border-radius:12px;cursor:pointer;background:none;border:2px solid var(--orange);color:var(--orange);margin-bottom:10px";
  btnDirect.innerHTML = "📱 Wave / Orange Money / MTN<br><span style='font-size:12px;font-weight:400;opacity:.8'>Paiement direct (validation sous 24h)</span>";
  btnDirect.addEventListener("click", function() {
    showPayDirectModal(isSponsor, tier, info);
  });
  body.appendChild(btnDirect);

  var btnCancel = document.createElement("button");
  btnCancel.style.cssText = "width:100%;background:rgba(255,255,255,.06);border:none;border-radius:12px;padding:14px;color:var(--gray);font-size:14px;cursor:pointer;margin-top:4px";
  btnCancel.textContent = "Annuler";
  btnCancel.addEventListener("click", closeModal);
  body.appendChild(btnCancel);
}

// ── Étape 3 : Paiement direct — preuve de transaction ───────
function showPayDirectModal(isSponsor, tier, info) {
  document.getElementById("mTitle").textContent = "PAIEMENT DIRECT";
  document.getElementById("mSub").textContent = info.ent+" · Pack "+tier.name;
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  // Bloc montant + logos
  var amtBlock = document.createElement("div");
  amtBlock.style.cssText = "background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 16px;margin-bottom:16px";
  amtBlock.innerHTML = "<div style='font-size:13px;font-weight:700;margin-bottom:12px'>Étape 1 — Envoyez exactement <span style='color:var(--orange);font-size:15px'>"+Number(tier.price).toLocaleString("fr-FR")+" FCFA</span> vers :</div>"

    // Wave
    + "<div style='display:flex;align-items:center;justify-content:space-between;background:rgba(30,174,219,.12);border:1px solid rgba(30,174,219,.3);border-radius:8px;padding:10px 12px;margin-bottom:8px'>"
    +   "<div style='display:flex;align-items:center;gap:10px'>"
    +     "<img src='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABQAFADASIAAhEBAxEB/8QAGwAAAgMBAQEAAAAAAAAAAAAABgcABAUCAwH/xAAzEAABAwMBBQcDAwUBAAAAAAABAgMEAAURBhIhMUFRBxMiYYGhwRRxkRUyQhZysdHwM//EABkBAAMBAQEAAAAAAAAAAAAAAAQFBgIDB//EAC4RAAEDAwQABQMDBQAAAAAAAAEDBBEAAiEFEjFRE0FhgZEUIjJx0fChscHh8f/aAAwDAQACEQMRAD8Af9SpQBqrVS3nHLfb3ClpPhddSd6zzAPTz513QQvXv220I8eJtU99/sO62rzrKFbVKZjD6qQNxCThCT5n4FBs3Vd4nKOZRZQf4MDZH54+9YtfFKCUlSv2gZP2p+ixRSHEns1HudVcuD+UDoV5z7oxER31wmpbST+55zj9s8a8rdfIc1Z/Tri24tO8hpzCh6caVv0l01lKu9ybcZ2YEdUpaXXQjZaB3JQDxPl8kVWRZ7lCsEbU7TzTcdUsxmlIdHepcSM52em7/s0Bdqn3wLftpvZoEpzded/9P3p/wtV3iCoYlF5A/g+Nofnj70ZWbWUK4qSxJH0sg7gFHKFHyPwaUtmnm52aJNIAU82FKA4BXA+4NXqOUZoL27gInzFKkdSdNLzYTMYIOaeNSgDSuqlsuN2+4OFTKvC06o70HkCennyo/pC4b3oX7bqrmbxN0nvs9x1Q1rK8qtttEZlWJEnKQRxSnmfilnW1qucZ2opJzlDJ7lH2HH3zWLT9iiEkR2c1Haq6Lhzd0MCsnUd6FhtKpfdhx1Sg20gnAKj18gAawomtI9ysE8P7Mee3GWdjPhc3EZT+eFbuo7KL7aVxNsNupUHGlngFDr5HOKT0uI/BlORZTRbebOFJP/cPOhXy66Kkj8SKYaU0auUYu/MGfb9qu2ORaY0rN3guSmcDHduY2T5jdtD1q3qCdp6UEiz2x2OvOVOKXspx0CMn80S9lvZt/XUyRJmvOsWmIQlxTW5bqyM7CSeGBvJ8x13bnah2QRtLWf8AXLE7IXDaITKYfVtqbBOAtKscM4BB65qdKIN++T8mPirELEWbIHwJ+ar6Cf73SrSM72nXEe+fmiagfs2fzAnxyf2OpWB904+KOKrmV25vafT+1ed6nZseKD1n5zUpmaNvKrjbTGfVmRGwkk8VI5H4pZ1taVnGDqGMc4Q6e5X9lcPfFZfIhVE9jNb0p0W7m3o4NZDzhdeccVxWoqPqc1xXbrZaecbUMFCik+hxXFFiIxS+6ZM1KB+0iOx9FCk7IEjvS2FcynGcH1x+aOKDO0eOty0RJCQShp8hfltDA9x70K+Et7qYaSYeWZj/AJTf7D4zbHZfBW2BtPvPuL81d4U/4SKLNXRmpmjb1HeALa4LwOf7DvpW9gGqYzlok6ZkOpRKYdU/GSo47xtW9QHUhWT9lUV9r+q4+ndDzYoeSJ9xbVGjtg+LCty1Y6BJO/qQKmKvKQnZq/i6S2Sf/WOF+oI/3TKpZdnUZa76/IAIbZYKSfNRGB7GmbVFps/TiezUTrgH1hjoVK7acLTyHBxQoKHoc1xXbSC68htO8rUEj1OKPMRmlNsyIrX1XCMHUMkYwh496j7Hj75rFpmaysxuNtEllOZEbKgAN6kcx80s6EYrBVEdjFMNValu5u6ORUrzkRY82M5GlNpcYcGFoVwIooh2KJOYs77W2EPrWiX4uBSMkjpuB/Ner9ghMO3R7xritNNqi+PG0pz9u/nvrDhZNWy5KSCRGOeY+a6NWqyKljjaLgCDmYON2fT/ADilpetJW5y3LdtcZMS4Mp22HIxKFFQ4DcefXjVTTumfqWV3DUrb0uetRSEzHC4UIHDiTnNNpVpsMW6MWaSJa5atkOPoVhIUd+MdP91UnWaGiHdTFS59RAk7JBXnLR3Dd1z/AIpJZpKHh+F4l8GDOOOOY4qlU1x2L/F8JORIIE8gScTyBQrDtsG2NrRAjtsIcVtqSjgTVii9nS0VyamMQ8tUaKl2UlCvEtxXBCc7hwPtVe96fbjWn9QZiSIakOBDjDzgXkHgoEGm7JRJBO1uLjd6mJzxSDUW7hype6usFvmQJjHP+88zFDFbWlYRnahjJxlDR75f2Tw98Vi0y9GWY262mS8nZkScKweKUch813fLBJE9nFC6U1Lhzb0MmiagDVWlVsOOXC3tlTKvE60kb0HmQOnlyo/qUgbuL0L91tWLxmm6T2X+x6pTWzUDlttUuEloLD+ShZVjuyU4JHXdUl6gdlWKLbO62O42dp0K3rCc7I9PijS86NhXFSnox+lkHeSkZQo+Y+RQbN0peIKjmIp5A/mz4h+OPtTlFZqqd3F0znupdy2ft7dmTbEY65/X+c1bTqphTzMyRaWXri0APqNsgHHPHWqsXUJjXyXcDGDjUra7xgq3EHeN+OWOlY62nGlYcbWg9FJIqIacdVsttrWeiUk0SGyIBxg45oEvXJIzkGeBz64z71qsagfausuY40l5uXkPMqO5STwGeWOtcXK6xpMVMaHb0RWgraUpSy4tR/uPKvWDpW8TlDERTKD/ADe8I/HH2oxs2jIVuUl6UfqpA3jaGEJPkOfrQ6yzZI7uSPIfyKObNXzkGw4tPmR3zHnn0xWLpXSq33G7hcGyllPiaaUN6zyJHTy50wKlSkrhxevfuuqoZs02ieyz3Pdf/9k=' style='width:36px;height:36px;border-radius:50%;object-fit:cover' alt='Wave'>"
    +     "<span style='font-size:14px;font-weight:700;color:#fff'>Wave</span>"
    +   "</div>"
    +   "<span style='font-size:14px;font-weight:800;color:#fff'>+225 07 07 86 91 78</span>"
    + "</div>"

    // Orange Money
    + "<div style='display:flex;align-items:center;justify-content:space-between;background:rgba(255,102,0,.1);border:1px solid rgba(255,102,0,.3);border-radius:8px;padding:10px 12px;margin-bottom:8px'>"
    +   "<div style='display:flex;align-items:center;gap:10px'>"
    +     "<img src='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABQAFADASIAAhEBAxEB/8QAHAABAAEFAQEAAAAAAAAAAAAAAAcBAgMFBgQI/8QAMhAAAQQCAQEGBAMJAAAAAAAAAQACAwQFEQYSBxMUITFRIjJBYRUjcRYzQlJikaKx0f/EABYBAQEBAAAAAAAAAAAAAAAAAAAFAf/EAB4RAQACAQUBAQAAAAAAAAAAAAABAgMFERIxgWGh/9oADAMBAAIRAxEAPwCAEREBERAREQEREBERAREQETRRARVa1zjpoJPsAqICIiAiIgKUezbPcBpYo4/kPGJ8nlprP5T464nLwdBrWguGjvfkB57UXKf+DYjjfZjwmvzrOTR28ndhD6UUZBLQ4bDGf1a+Z38PmPfYSVJ2a8LtYxxdxWlXMkRJb3QbIzY9NtPkR9ivnQcbq2uzapZqUe8ycso6Xt31uJkLdfpr/qkDs97W693N8nyfLMpHUM8EfhITvoYxvXtjB7/EPuVz3DeSYarxWlWs5GCGaIOa9kjukj4if9FTNUyZceOl8UTMxaOvfxR02mLJe1MkxETE9+PLVq43s6w3jLfRYy87dNaD/i32aPqfr/YLmeIipev5eeaDHzZQ1zJQr3XNZA+UyN6h8RDSQwvLQTrfv5Lecmq8UyMV3Ivz75r3dkxNEwcNj5WhoHp9FquAO4+WZmtn3VWNtVmVoJZ2gmFz5A3vW7+rN9R+wKabHKtstt5vPe8beR8huoTxmuOu3GOtp39n63t/jXDrWRi7izG2xP3rp4Kt9jYInxwxueyPbXFwdI94b56006JV/wCwvC35j8NhzU8h/eNmZaicHjxBjEYAb8xb0u6tnXrrSzZat2fZZrJ4p6lZkdNsThFMInRhjZOmQMA/Nkc5rNj10R77GOniezzx8ssWQdWfXsSxQhmQ11sbIwNmDzrTulziB9deh1o0015crwbjWOw1my/IWIbgptsNrOsxPMLnRB7QTod41ziWgt9Nb81Ga7PnePxlKPG2a0l2S5kohcf4yQukiiLWta12/MkubI7f8pauMQFcXucxrS4lrflBPkP0VqICIiAiIgIiIKucXHbiSfclUREBERAREQEREBERAREQf//Z' style='width:36px;height:36px;border-radius:50%;object-fit:cover' alt='Orange Money'>"
    +     "<span style='font-size:14px;font-weight:700;color:#fff'>Orange Money</span>"
    +   "</div>"
    +   "<span style='font-size:14px;font-weight:800;color:#fff'>+225 07 07 86 91 78</span>"
    + "</div>"

    // MTN Mobile Money
    + "<div style='display:flex;align-items:center;justify-content:space-between;background:rgba(255,204,0,.1);border:1px solid rgba(255,204,0,.3);border-radius:8px;padding:10px 12px'>"
    +   "<div style='display:flex;align-items:center;gap:10px'>"
    +     "<img src='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABQAFADASIAAhEBAxEB/8QAGwABAAIDAQEAAAAAAAAAAAAAAAQGAwUHAQL/xAA2EAACAQMCBAIGCgIDAAAAAAABAgMABBEFEgYTITFBURQVIlRhkQcyNEJVcYGSobFic1KCov/EABsBAAEFAQEAAAAAAAAAAAAAAAABAwQFBgIH/8QAMREAAQQBAgIHBgcAAAAAAAAAAQACAxEEIUESMQUTUWGRwdEGFCJxseEjMzRCgcLw/9oADAMBAAIRAxEAPwDo9KUrylaNKUpQhKUpQhKUAJIAGSew86eXbBGQQcgjzB8aXhdXFWiSxdJSlKRKlACSABknoAKVsBt0yMMcNduuR4iMHx/On4IesJLjTRzP+3Oybe/h0HMr5NhHEAtxdxxSYyU2kkfnivPRLT8Rj/YapMnGaw8R6zYXkISGxgMyT7iTKVRWdceY3ioA4w1yTQbPU49LsEE10LOWKW4cNHKZTGOy9R2yasxjE1wwijVW47ixuNUxx9rj4fZdF9EtPxCP9hqPfGxsLCe8lvleOFN7KiEFvAAfEnAHxNU9eLbm24jbRtSs4Yn5ClZoZGaMzFSwj6gdwpwfgazvby8Z8JaXcC6Ng0ypdMix8xGbGVBOQcDr86dxoIOuZ7yxrWGtbdvy33pNzPkEZ6oku7NFJFpeWelvq2rahcuL7JNjEdyrEehwu5cKAQMg56g5Gah2qXPCM8thMC+nMjSQJM5Bt3C7ypIVjtZQxHQ9Vx3yTvilwHsZryNLiKyRPbhBZk2k/UBIILA7WyCCB+gptzxVFr/H9n7PLs5ZFtiCO2SAp/QgfM+FblscOXCWABzCNuWnLl2LPOeYHtcbDr/nvWyt+PNImt47tprb0J7pLRriGd35UjqWXcrRodp2nqM48qtRBVipGCDg1waz0six4a0MjDahrs0rr/hGyQj+pK707b5Hf/kxP81iensLHxuAwiib8losOV774ja+T2qbqv20/wCtP6qF4VN1T7af9af1VRH+lf8ANv8AZSXfmN+R8lzvUOHtLvNSnkudVjWRtXSZ0C4ODGq8g9fvBAc/Cps3D8cdgmnSagitNrBv4zyz3EnNMffvgHrUW7sdKfWbiWTUnW49NVCgiOBKzBl/gEZ+NH4csuQwOs2mFcqS6qVztZfaG7q/tZJ8wKsesNNuQ6V+37KX7nANSSL7ipOoaHY6xqOtRyXwEt7FFsCoQ1u8JIEgJ74Zh/PnW90XTzpOiWWnmUSm2hWIuF27sDvjwrQTcOWztLF64UPnG1iCerKwDdev1e1WWwhS30+3hjkEiJGqq4OQwx3zUPKk/CDA+xppXYK+ibdDEz4mHVRtZgmvLZLOCOSSV0nlVI+7GOFgAP8AtIlc4iN29/b2utQTW9+si+j3c8ZR94I2rIT9ZSem49Vz3I6VcOMLu7gt5DZrq/MjhjXm6SA00W+RmLY8RiFQR8a9l4o1i31LhvQINY0vUJpraBru31iEx3EhkbII+6GCkeznOR41s+iI3RYkZaaNX46qsfkxFskE0YcHb7gjSwq1bWIH0zadp+3ppFnJM48pG3yn9d0y/KumdhiuecETet/pI401sHchlMMTf4mU4/8AMQrodZ32kk4slrOwfVd4LaYSh7VsNShle83JG7Dlp1Ck+Fa+s6310ihVuJAAMAbqqIJYhG6OW6NHTuv1Ul7XcQc1aCbg6Ce9ku2W65ryFzhegO4N5fDH5E1hHA8AQo3pTDaUXMY6LsZQO3UgMTnvnFWf1hee8y/up6wvPeZfnUoZUQFcb/AeqdGRlAVYVUueCN0VwLcTb52XLyIcxjILFSBnPTsfOrJHZyQxJFHbyKiKFVQh6AdAKz+sLz3mX509YXnvMvzriSbHlAD3ONdw9Vy+XIeKdSreucKW2tTO2paZqNxGGWSCfT5+XPAwQIRtOAw6ZyMnqennE1V47bii54kn4gs2s7KB5l0zU7IRXMLLCQgiZxuzuwcjvk96t/rC895l+dYpp5blAlw/OQHIWRQwB88EVeQe0MMUYjLSaFbDzVc/Ce5xNhc++iPTZ7PhKe6uYnje9uuYu9SCyKoAbr4Fi1X2vSxY5Ykk+JNeVnc7KOVO6aqtToY+rYGpSlKiJ1KUpQhKUpQhKUpQhKUpQhf/2Q==' style='width:36px;height:36px;border-radius:50%;object-fit:cover' alt='MTN'>"
    +     "<span style='font-size:14px;font-weight:700;color:#fff'>MTN Mobile Money</span>"
    +   "</div>"
    +   "<span style='font-size:14px;font-weight:800;color:#fff'>+225 05 74 12 55 36</span>"
    + "</div>";
  body.appendChild(amtBlock);

  // Étape 2 : référence
  var step2 = document.createElement("div");
  step2.style.cssText = "margin-bottom:14px";
  step2.innerHTML = "<div style='font-size:13px;font-weight:700;margin-bottom:10px'>Étape 2 — Indiquez le moyen utilisé et la référence reçue après paiement :</div>";
  body.appendChild(step2);

  var moyenSel = mkSelect("fMoyen","-- Moyen utilisé *");
  ["Wave","Orange Money","MTN Mobile Money"].forEach(function(m){
    var o=document.createElement("option"); o.value=m; o.textContent=m; moyenSel.appendChild(o);
  });
  body.appendChild(moyenSel);

  var refInp = mkInput("fRef","Référence / ID de la transaction");
  body.appendChild(refInp);

  var hint = document.createElement("div");
  hint.style.cssText = "font-size:11px;color:rgba(255,255,255,.45);margin:6px 0 14px;line-height:1.5";
  hint.textContent = "📱 Après votre paiement, Wave / Orange Money / MTN affiche un écran de confirmation avec un code unique (ex : TX7829KLM903). Copiez ce code et collez-le ici — il nous permet de vérifier votre paiement avant activation.";
  body.appendChild(hint);

  var sendBtn = mkBtn("fSendProof","Envoyer ma preuve de paiement");
  sendBtn.style.background = "var(--orange)";
  body.appendChild(sendBtn);

  var backBtn = document.createElement("button");
  backBtn.style.cssText = "width:100%;background:rgba(255,255,255,.06);border:none;border-radius:12px;padding:13px;color:var(--gray);font-size:13px;cursor:pointer;margin-top:8px";
  backBtn.textContent = "Annuler";
  backBtn.addEventListener("click", closeModal);
  body.appendChild(backBtn);

  sendBtn.addEventListener("click", async function() {
    var moyen = (document.getElementById("fMoyen")||{}).value||"";
    var ref = (document.getElementById("fRef")||{}).value||"";
    if (!moyen) { showToast("Sélectionne le moyen de paiement"); return; }
    if (!ref.trim()) { showToast("Saisis la référence de ta transaction"); return; }
    sendBtn.disabled = true; sendBtn.textContent = "Envoi en cours...";

    // ── Enregistrer la demande en base (statut: en_attente) ──
    if (_supabase) {
      try {
        var dureeJours = {"1 mois":30,"3 mois":90,"6 mois":180,"1 an":365}[info.duree] || 30;
        var dateFin = new Date(Date.now() + dureeJours*86400000).toISOString();
        await _supabase.from("sponsors_partenaires").insert({
          type: isSponsor ? "sponsor" : "partner",
          pack: tier.name,
          prix: tier.price,
          entreprise: info.ent,
          responsable: info.resp,
          email: info.em,
          telephone: info.tel,
          pays: info.pays || "",
          ville: info.ville || "",
          lien: info.lien || "",
          logo: info.logo || "",
          duree: info.duree,
          date_fin: dateFin,
          moyen_paiement: moyen,
          reference_paiement: ref,
          message: info.msg || "",
          statut: "en_attente"
        });
      } catch(e) { console.warn("Enregistrement sponsor:", e); }
    }

    var waMsg = "Bonjour LOKALI. Preuve de paiement "+(isSponsor?"sponsor":"partenaire")+"."
      + " Entreprise : "+info.ent
      + " | Responsable : "+info.resp
      + " | Email : "+info.em
      + " | Tel : "+info.tel
      + " | Pack : "+tier.name+" ("+Number(tier.price).toLocaleString("fr-FR")+" FCFA)"
      + " | Durée : "+info.duree
      + " | Moyen : "+moyen
      + " | Référence : "+ref
      + (info.lien ? " | Lien : "+info.lien : "")
      + (info.msg ? " | Message : "+info.msg : "")
      + " | ⚠️ Logo joint dans le formulaire — à valider dans l'espace admin LOKALI.";
    window.open("https://wa.me/2250596697054?text="+encodeURIComponent(waMsg),"_blank");
    showToast("✅ Preuve envoyée ! Ton emplacement s'affichera automatiquement dès validation (sous 24h).");
    closeModal();
  });
}




// ══ CARTE INTERACTIVE LEAFLET ══════════════════
var _map = null, _mapMarkers = [], _mapFilter = "";

function initMap() {
  if (typeof L === "undefined") { setTimeout(initMap, 500); return; }
  var ld = document.getElementById("mapLoading");
  if (ld) ld.style.display = "none";
  var lat = _userLat || 5.354, lng = _userLng || -4.005;
  _map = L.map("lokaliMap", {zoomControl:true, attributionControl:false}).setView([lat, lng], 13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {maxZoom:19}).addTo(_map);
  if (_userLat) {
    var ui = L.divIcon({html:'<div style="background:#F97316;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 3px rgba(249,115,22,.4)"></div>',className:"",iconSize:[16,16],iconAnchor:[8,8]});
    L.marker([_userLat,_userLng],{icon:ui}).addTo(_map).bindPopup("Vous êtes ici");
  }
  if (_allPrestas.length > 0) placeMapMarkers(_allPrestas);
}

function placeMapMarkers(prestas) {
  if (!_map) return;
  _mapMarkers.forEach(function(m){ _map.removeLayer(m); });
  _mapMarkers = [];
  var list = _mapFilter ? prestas.filter(function(p){ return p.categorie&&p.categorie.toLowerCase().includes(_mapFilter.toLowerCase()); }) : prestas;
  list.forEach(function(p) {
    if (!p.latitude || !p.longitude) return;
    var dc = p.disponibilite==="disponible"?"#10B981":p.disponibilite==="bientot"?"#FBBF24":"#EF4444";
    var icon = L.divIcon({html:'<div style="background:'+dc+';width:14px;height:14px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',className:"",iconSize:[14,14],iconAnchor:[7,7]});
    var mk = L.marker([p.latitude,p.longitude],{icon:icon});
    var pid = p.id;
    mk.bindPopup('<div style="min-width:160px;font-family:sans-serif"><b style="font-size:14px">'+p.nom+'</b><br><span style="color:#888;font-size:12px">'+(p.categorie||'')+'</span><br><div style="display:flex;gap:6px;margin-top:8px"><a href="https://wa.me/'+cleanTel(p.whatsapp||p.telephone||'')+'" target="_blank" style="background:#25D366;color:#fff;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:12px">WhatsApp</a><a href="tel:'+(p.telephone||'')+'" style="background:#F97316;color:#fff;padding:5px 10px;border-radius:6px;text-decoration:none;font-size:12px">Appel</a></div></div>');
    mk.addTo(_map);
    _mapMarkers.push(mk);
  });
}

function filterMap(cat, btn) {
  _mapFilter = cat;
  document.querySelectorAll(".map-ctrl-btn").forEach(function(b){ b.classList.remove("on"); });
  if (btn) btn.classList.add("on");
  placeMapMarkers(_allPrestas);
}

// ══ SIGNALEMENT ════════════════════════════════
function signalerPresta(id) {
  document.getElementById("mTitle").textContent = "Signaler ce prestataire";
  document.getElementById("mSub").textContent = "Aidez la communauté";
  var body = document.getElementById("mBody");
  body.innerHTML = "";
  var motifs = ["Faux numéro","Comportement inapproprié","Arnaque","Informations incorrectes","Prestataire inexistant","Autre"];
  motifs.forEach(function(m) {
    var lbl = document.createElement("label");
    lbl.style.cssText = "display:flex;align-items:center;gap:10px;background:var(--dark3);border:1px solid var(--border);border-radius:10px;padding:12px 16px;cursor:pointer;margin-bottom:8px";
    var inp = document.createElement("input");
    inp.type = "radio"; inp.name = "motif"; inp.value = m; inp.style.accentColor = "var(--orange)";
    var span = document.createElement("span"); span.textContent = m; span.style.fontSize = "14px";
    lbl.appendChild(inp); lbl.appendChild(span);
    body.appendChild(lbl);
  });
  var ta = mkTextarea("signalDesc","Détails supplémentaires...",2);
  body.appendChild(ta);
  var btn = mkBtn("sendSignalBtn","Envoyer le signalement");
  body.appendChild(btn);
  btn.addEventListener("click", function() { submitSignal(id); });
  document.getElementById("overlay").classList.add("on");
}

async function submitSignal(id) {
  var motif = document.querySelector("input[name=motif]:checked");
  if (!motif) { showToast("Sélectionne un motif"); return; }
  if (_supabase) {
    try {
      await _supabase.from("signalements").insert({prestataire_id:id, motif:motif.value, description:(document.getElementById("signalDesc")||{}).value||""});
    } catch(e) {}
  }
  showToast("Signalement envoyé. Merci !");
  closeModal();
}


// ══ CLASSEMENTS ══════════════════════════════
async function loadRanking(type, btn) {
  document.querySelectorAll(".rank-tab").forEach(function(b){ b.classList.remove("on"); });
  if (btn) btn.classList.add("on");
  if (!_supabase) return;
  var grid = document.getElementById("rankingGrid");
  if (grid) grid.innerHTML = '<div class="loading"><div class="loading-dot"></div><div class="loading-dot"></div><div class="loading-dot"></div></div>';
  try {
    var q = _supabase.from("prestataires").select("*");
    if (type === "note") q = q.order("note_moyenne", {ascending:false}).limit(8);
    else if (type === "vues") q = q.order("nb_vues", {ascending:false}).limit(8);
    else if (type === "new") q = q.order("created_at", {ascending:false}).limit(8);
    else if (type === "verifie") q = q.eq("verifie", true).limit(8);
    else q = q.order("nb_avis", {ascending:false}).limit(8);
    var res = await q;
    var list = res.data || [];
    if (type === "distance" && _userLat) {
      list = list.filter(function(p){ return p.latitude && p.longitude; })
        .sort(function(a,b){ return calcDist(_userLat,_userLng,a.latitude,a.longitude)-calcDist(_userLat,_userLng,b.latitude,b.longitude); })
        .slice(0,8);
    }
    if (!grid) return;
    if (!list.length) { grid.innerHTML = '<div class="no-presta">Aucun prestataire pour ce classement.</div>'; return; }
    // Utiliser renderPrestas dans un conteneur temporaire
    var savedGrid = document.getElementById("prestaGrid");
    var savedHTML = savedGrid ? savedGrid.innerHTML : "";
    var fake = document.createElement("div");
    fake.className = "presta-grid";
    fake.id = "prestaGrid";
    document.body.appendChild(fake);
    if (savedGrid) savedGrid.id = "__saved__";
    renderPrestas(list);
    grid.innerHTML = fake.innerHTML;
    fake.remove();
    if (savedGrid) { savedGrid.id = "prestaGrid"; savedGrid.innerHTML = savedHTML; }
  } catch(e) {
    console.log("[LOKALI] loadRanking error:", e);
    if (grid) grid.innerHTML = '<div class="no-presta">Erreur de chargement.</div>';
  }
}


// ══ DASHBOARD PRESTATAIRE ENRICHI ════════════════
async function openDashboard() {
  if (!_currentUser || !_supabase) { showToast("Connecte-toi d'abord"); openModal("login"); return; }

  // Vérifier si admin
  if (_currentUser.email === "fulgencegbego83@gmail.com") {
    openAdmin();
    return;
  }

  var pr = await _supabase.from("prestataires").select("*").eq("user_id", _currentUser.id).single();
  _myPrestaProfile = pr.data || null;

  // Si pas encore prestataire — vrai tableau de bord utilisateur
  if (!pr.data) {
    var uName = (_currentUser.user_metadata && (_currentUser.user_metadata.prenom||_currentUser.user_metadata.nom)) || _currentUser.email;
    document.getElementById("mTitle").textContent = "👤 " + uName;
    document.getElementById("mSub").textContent = _currentUser.email || "";
    var body = document.getElementById("mBody");
    body.innerHTML = "";

    // Carte profil résumé
    var profileCard = document.createElement("div");
    profileCard.style.cssText = "background:linear-gradient(135deg,rgba(255,107,44,.12),rgba(255,149,0,.05));border:1px solid rgba(255,107,44,.2);border-radius:16px;padding:18px;margin-bottom:18px;text-align:center";
    profileCard.innerHTML = "<div style='width:64px;height:64px;border-radius:50%;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 10px'>👤</div>"
      + "<div style='font-size:16px;font-weight:800'>" + uName + "</div>"
      + "<div style='font-size:12px;color:var(--gray);margin-top:2px'>Compte Utilisateur LOKALI</div>";
    body.appendChild(profileCard);

    // Onglets Mon Profil
    var tabsTitle = document.createElement("div");
    tabsTitle.style.cssText = "font-size:11px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px";
    tabsTitle.textContent = "Mon espace";
    body.appendChild(tabsTitle);

    var menuGrid = document.createElement("div");
    menuGrid.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px";

    function mkMenuTile(icon, label, fn) {
      var t = document.createElement("button");
      t.style.cssText = "background:var(--dark3);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:16px 10px;cursor:pointer;text-align:center;transition:all .2s";
      t.innerHTML = "<div style='font-size:22px;margin-bottom:6px'>"+icon+"</div><div style='font-size:12px;font-weight:700;color:var(--white)'>"+label+"</div>";
      t.addEventListener("click", fn);
      return t;
    }

    menuGrid.appendChild(mkMenuTile("❤️", "Favoris", showMesFavoris));
    menuGrid.appendChild(mkMenuTile("📢", "Annonces favorites", function() { closeModal(); setTimeout(showMesAnnoncesFavorites, 200); }));
    menuGrid.appendChild(mkMenuTile("🕐", "Historique", function() { closeModal(); setTimeout(showHistoriqueRecherches, 200); }));
    menuGrid.appendChild(mkMenuTile("⚙️", "Modifier mon profil", showEditUserProfile));
    body.appendChild(menuGrid);

    // CTA Devenir prestataire
    var ctaCard = document.createElement("div");
    ctaCard.style.cssText = "background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.25);border-radius:14px;padding:16px;margin-bottom:14px";
    ctaCard.innerHTML = "<div style='font-size:13px;font-weight:700;color:#10B981;margin-bottom:4px'>🔧 Tu as un savoir-faire ?</div>"
      + "<div style='font-size:12px;color:var(--gray);margin-bottom:12px'>Crée ton profil prestataire en 2 minutes et reçois des clients dès aujourd'hui.</div>";
    var btnPresta = document.createElement("button");
    btnPresta.style.cssText = "width:100%;background:#10B981;color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer";
    btnPresta.textContent = "Devenir prestataire →";
    btnPresta.addEventListener("click", function() { closeModal(); showFormPresta(); });
    ctaCard.appendChild(btnPresta);
    body.appendChild(ctaCard);

    // CTA Publier annonce
    var ctaAnn = document.createElement("div");
    ctaAnn.style.cssText = "background:rgba(255,107,44,.08);border:1px solid rgba(255,107,44,.25);border-radius:14px;padding:16px;margin-bottom:14px";
    ctaAnn.innerHTML = "<div style='font-size:13px;font-weight:700;color:var(--orange);margin-bottom:4px'>📢 Une offre à proposer ?</div>"
      + "<div style='font-size:12px;color:var(--gray);margin-bottom:12px'>Publie une annonce gratuite visible immédiatement.</div>";
    var btnAnn = document.createElement("button");
    btnAnn.style.cssText = "width:100%;background:var(--orange);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer";
    btnAnn.textContent = "Publier une annonce →";
    btnAnn.addEventListener("click", function() { closeModal(); setTimeout(openPublierAnnonce, 200); });
    ctaAnn.appendChild(btnAnn);
    body.appendChild(ctaAnn);

    var logoutBtn1 = document.createElement("button");
    logoutBtn1.style.cssText = "width:100%;background:none;border:1px solid rgba(255,255,255,.12);color:var(--gray);border-radius:10px;padding:11px;font-size:12px;cursor:pointer";
    logoutBtn1.textContent = "Se déconnecter";
    logoutBtn1.addEventListener("click", logout);
    body.appendChild(logoutBtn1);

    document.getElementById("overlay").classList.add("on");
    return;
  }

  var p = pr.data;
  var avisRes = await _supabase.from("avis").select("*").eq("prestataire_id", p.id).order("created_at",{ascending:false});
  var histRes = await _supabase.from("contacts_historique").select("*,created_at").eq("prestataire_id", p.id);
  var favRes = await _supabase.from("favoris").select("*").eq("prestataire_id", p.id);
  var avis = avisRes.data||[], hist = histRes.data||[], favs = favRes.data||[];

  var now = new Date();
  var today = now.toDateString();
  var weekAgo = new Date(now - 7*86400000);
  var monthAgo = new Date(now - 30*86400000);

  function countPeriod(arr, since) { return arr.filter(function(h){ return new Date(h.created_at) > since; }).length; }

  var appels = hist.filter(function(h){ return h.type_contact==="appel"; });
  var waCl = hist.filter(function(h){ return h.type_contact==="whatsapp"; });

  document.getElementById("mTitle").textContent = "📊 Mon espace";
  document.getElementById("mSub").textContent = p.nom + " · " + (p.categorie||"");

  var body = document.getElementById("mBody");
  body.innerHTML = "";

  // Stats globales
  var statGrid = document.createElement("div");
  statGrid.className = "dash-grid";
  [
    {v: p.nb_vues||0, l: "Vues totales", ic: "👁️"},
    {v: appels.length, l: "Appels reçus", ic: "📞"},
    {v: waCl.length, l: "WhatsApp", ic: "💬"},
    {v: favs.length, l: "Favoris", ic: "❤️"},
    {v: avis.length, l: "Avis clients", ic: "⭐"},
    {v: (p.note_moyenne||0).toFixed(1)+"/5", l: "Note moyenne", ic: "🏆"},
  ].forEach(function(s){
    var d = document.createElement("div");
    d.className = "dash-stat";
    d.innerHTML = "<div style='font-size:18px;margin-bottom:2px'>"+s.ic+"</div>"
      +"<div class='dash-stat-val'>"+s.v+"</div><div class='dash-stat-lbl'>"+s.l+"</div>";
    statGrid.appendChild(d);
  });
  body.appendChild(statGrid);

  // ── Sélecteur de période avec graphique d'évolution ──────
  var periods = document.createElement("div");
  periods.className = "stat-period";
  var periodLabels = ["Aujourd'hui","7 jours","30 jours","Cette année"];
  periodLabels.forEach(function(lbl, i){
    var btn = document.createElement("button");
    btn.className = "period-btn" + (i===1?" on":"");
    btn.textContent = lbl;
    btn.addEventListener("click", function(){
      periods.querySelectorAll(".period-btn").forEach(function(b){ b.classList.remove("on"); });
      btn.classList.add("on");
      var since;
      if (i===0) { since = new Date(); since.setHours(0,0,0,0); }
      else if (i===1) since = weekAgo;
      else if (i===2) since = monthAgo;
      else { since = new Date(); since.setFullYear(since.getFullYear()-1); }
      updatePeriodStats(hist, since, i);
    });
    periods.appendChild(btn);
  });
  body.appendChild(periods);

  // Stats période enrichies
  var periodStats = document.createElement("div");
  periodStats.id = "periodStats";
  periodStats.className = "dash-grid";
  body.appendChild(periodStats);

  // Mini graphique d'évolution (sparkline 7 jours)
  var chartWrap = document.createElement("div");
  chartWrap.id = "dashChartWrap";
  chartWrap.style.cssText = "background:var(--dark3);border-radius:14px;padding:16px;margin-bottom:14px;display:none";
  chartWrap.innerHTML = "<div style='font-size:12px;color:var(--gray);margin-bottom:12px;font-weight:700'>ÉVOLUTION DES VUES (7 DERNIERS JOURS)</div>"
    + "<div id='dashSparkline' style='display:flex;align-items:flex-end;gap:4px;height:60px'></div>"
    + "<div id='dashSparklineLbls' style='display:flex;gap:4px;margin-top:6px'></div>";
  body.appendChild(chartWrap);

  function updatePeriodStats(hist, since, periodIdx) {
    var ps = document.getElementById("periodStats");
    if (!ps) return;
    var calls = hist.filter(function(h){ return h.type_contact==="appel" && new Date(h.created_at)>since; }).length;
    var wa2 = hist.filter(function(h){ return h.type_contact==="whatsapp" && new Date(h.created_at)>since; }).length;
    var vues = hist.filter(function(h){ return h.type_contact==="vue" && new Date(h.created_at)>since; }).length;
    var total = calls + wa2;
    var taux = total > 0 && vues > 0 ? Math.round((total/vues)*100) : 0;
    ps.innerHTML = "";
    [{v:vues,l:"Vues",ic:"👁️"},{v:calls,l:"Appels",ic:"📞"},{v:wa2,l:"WhatsApp",ic:"💬"},{v:taux+"%",l:"Taux contact",ic:"📊"}].forEach(function(s){
      var d = document.createElement("div");
      d.className = "dash-stat";
      d.innerHTML = "<div style='font-size:15px;margin-bottom:2px'>"+s.ic+"</div>"
        +"<div class='dash-stat-val' style='color:#10B981'>"+s.v+"</div><div class='dash-stat-lbl'>"+s.l+"</div>";
      ps.appendChild(d);
    });

    // Afficher le sparkline si période 7 jours
    var chartEl = document.getElementById("dashChartWrap");
    if (periodIdx === 1 && chartEl) {
      chartEl.style.display = "block";
      var spark = document.getElementById("dashSparkline");
      var lbls = document.getElementById("dashSparklineLbls");
      spark.innerHTML = ""; lbls.innerHTML = "";
      var days = [];
      for (var i=6; i>=0; i--) {
        var d = new Date(); d.setDate(d.getDate()-i); d.setHours(0,0,0,0);
        var dEnd = new Date(d); dEnd.setHours(23,59,59,999);
        days.push({d:d,end:dEnd,lbl:d.toLocaleDateString("fr-FR",{weekday:"short"}).slice(0,3)});
      }
      var maxV = 1;
      var counts = days.map(function(day){
        var c = hist.filter(function(h){ var t=new Date(h.created_at); return t>=day.d && t<=day.end; }).length;
        if (c>maxV) maxV=c; return c;
      });
      counts.forEach(function(c, i){
        var bar = document.createElement("div");
        var h = Math.max(4, Math.round((c/maxV)*54));
        bar.style.cssText = "flex:1;background:var(--orange);border-radius:4px 4px 0 0;height:"+h+"px;opacity:"+(0.5+0.5*(c/maxV));
        spark.appendChild(bar);
        var lbl = document.createElement("div");
        lbl.style.cssText = "flex:1;text-align:center;font-size:9px;color:var(--gray)";
        lbl.textContent = days[i].lbl;
        lbls.appendChild(lbl);
      });
    } else if (chartEl) { chartEl.style.display = "none"; }
  }
  updatePeriodStats(hist, weekAgo, 1);


  // Statut rapide
  var statusTitle = document.createElement("h3");
  statusTitle.style.cssText = "font-size:15px;font-weight:700;margin:16px 0 10px";
  statusTitle.textContent = "Mon statut";
  body.appendChild(statusTitle);

  var statusBtns = document.createElement("div");
  statusBtns.style.cssText = "display:flex;gap:8px;flex-wrap:wrap";
  var pid = p.id;
  [{v:"disponible",l:"🟢 Disponible",bg:"#10B981"},{v:"bientot",l:"🟡 Bientôt",bg:"#FBBF24",fg:"#1C1917"},{v:"occupe",l:"🔴 Occupé",bg:"#EF4444"}].forEach(function(s){
    var btn = document.createElement("button");
    btn.className = "rsub";
    btn.style.cssText = "flex:1;font-size:13px;background:"+s.bg+";"+(s.fg?"color:"+s.fg:"");
    btn.textContent = s.l;
    btn.addEventListener("click", function(){ updateDispo(pid, s.v); });
    statusBtns.appendChild(btn);
  });
  body.appendChild(statusBtns);

  // Mes annonces / historique / favoris
  var quickLinksTitle = document.createElement("h3");
  quickLinksTitle.style.cssText = "font-size:15px;font-weight:700;margin:18px 0 10px";
  quickLinksTitle.textContent = "Gestion";
  body.appendChild(quickLinksTitle);

  // ── Toggle LOKALI Express ──────────────────────────────
  var exprWrap = document.createElement("div");
  exprWrap.className = "express-toggle-wrap";
  exprWrap.innerHTML = "<div><div style='font-size:13px;font-weight:700'>⚡ LOKALI Express</div><div style='font-size:11px;color:var(--gray)'>Recevoir des demandes instantanées</div></div>";
  var exprToggle = document.createElement("div");
  exprToggle.className = "express-toggle" + (_expressState.isProviderOnline ? " on" : "");
  exprToggle.id = "expressProviderToggle";
  exprToggle.innerHTML = "<div class='express-toggle-dot'></div>";
  exprToggle.addEventListener("click", toggleExpressAvailability);
  exprWrap.appendChild(exprToggle);
  body.appendChild(exprWrap);

  var quickLinks = document.createElement("div");
  quickLinks.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px";

  var mesAnnBtn = document.createElement("button");
  mesAnnBtn.textContent = "📢 Mes annonces";
  mesAnnBtn.style.cssText = "background:rgba(255,107,44,.12);color:var(--orange);border:1px solid rgba(255,107,44,.3);border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer";
  mesAnnBtn.addEventListener("click", function() { closeModal(); setTimeout(showMesAnnonces, 200); });

  var histBtn = document.createElement("button");
  histBtn.textContent = "🕐 Historique";
  histBtn.style.cssText = "background:rgba(255,255,255,.08);color:var(--white);border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer";
  histBtn.addEventListener("click", function() { closeModal(); setTimeout(showHistoriqueRecherches, 200); });

  var editProfBtn = document.createElement("button");
  editProfBtn.textContent = "⚙️ Modifier mon profil";
  editProfBtn.style.cssText = "background:rgba(255,255,255,.08);color:var(--white);border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer;grid-column:1/-1";
  editProfBtn.addEventListener("click", function() { closeModal(); setTimeout(function(){ showFormPresta(p); }, 200); });

  var qrBtn = document.createElement("button");
  qrBtn.textContent = "❓ Mes questions";
  qrBtn.style.cssText = "background:rgba(255,255,255,.08);color:var(--white);border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:700;cursor:pointer";
  qrBtn.addEventListener("click", function() { closeModal(); setTimeout(function(){ showMesQuestions(p.id); }, 200); });

  quickLinks.appendChild(mesAnnBtn);
  quickLinks.appendChild(histBtn);
  quickLinks.appendChild(editProfBtn);
  quickLinks.appendChild(qrBtn);
  body.appendChild(quickLinks);

  // Derniers avis
  if (avis.length > 0) {
    var avisTitle = document.createElement("h3");
    avisTitle.style.cssText = "font-size:15px;font-weight:700;margin:16px 0 10px";
    avisTitle.textContent = "Derniers avis";
    body.appendChild(avisTitle);
    var avisList = document.createElement("div");
    avisList.className = "avis-list";
    avis.slice(0,3).forEach(function(a){
      var item = document.createElement("div");
      item.className = "avis-item";
      item.innerHTML = "<div class='avis-header'><span class='avis-nom'>"+(a.client_nom||"Anonyme")+"</span>"
        +"<span class='avis-stars'>"+"⭐".repeat(a.note||0)+"</span></div>"
        +"<div class='avis-txt'>"+(a.commentaire||"")+"</div>";
      avisList.appendChild(item);
    });
    body.appendChild(avisList);
  }

  var logoutBtn2 = document.createElement("button");
  logoutBtn2.style.cssText = "width:100%;background:none;border:1px solid rgba(255,255,255,.12);color:var(--gray);border-radius:10px;padding:11px;font-size:12px;cursor:pointer;margin-top:18px";
  logoutBtn2.textContent = "Se déconnecter";
  logoutBtn2.addEventListener("click", logout);
  body.appendChild(logoutBtn2);

  document.getElementById("overlay").classList.add("on");
}

// ══ MES FAVORIS ══════════════════════════════════
async function showMesFavoris() {
  if (!_supabase || !_currentUser) return;
  var res = await _supabase.from("favoris").select("prestataire_id, prestataires(*)").eq("user_id", _currentUser.id);
  document.getElementById("mTitle").textContent = "❤️ Mes favoris";
  document.getElementById("mSub").textContent = (res.data||[]).length + " prestataire(s)";
  var body = document.getElementById("mBody");
  body.innerHTML = "";
  if (!res.data || !res.data.length) {
    body.innerHTML = "<p style='color:var(--gray);font-size:14px;text-align:center;padding:20px 0'>Aucun favori enregistré.</p>";
    return;
  }
  res.data.forEach(function(f) {
    var p = f.prestataires;
    if (!p) return;
    var card = document.createElement("div");
    card.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;cursor:pointer";
    card.innerHTML = "<div style='font-size:28px'>" + (p.categorie||"🔧").charAt(0) + "</div>"
      + "<div><div style='font-size:15px;font-weight:700'>" + p.nom + "</div>"
      + "<div style='font-size:12px;color:var(--gray)'>" + (p.categorie||"") + " · " + (p.ville||"") + "</div></div>"
      + "<a href='https://wa.me/" + cleanTel(p.whatsapp||p.telephone||"") + "' target='_blank' class='contact-wa' style='margin-left:auto;padding:8px 14px;font-size:12px'>💬</a>";
    body.appendChild(card);
  });
  document.getElementById("overlay").classList.add("on");
}

// ══ TABLEAU DE BORD ADMINISTRATEUR ══════════════
async function openAdmin() {
  if (!_supabase) return;
  document.getElementById("mTitle").textContent = "⚙️ Administration LOKALI";
  document.getElementById("mSub").textContent = "Espace réservé à l'administrateur";
  var body = document.getElementById("mBody");
  body.innerHTML = "<div style='text-align:center;padding:20px'><div class='loading'><div class='loading-dot'></div><div class='loading-dot'></div><div class='loading-dot'></div></div></div>";
  document.getElementById("overlay").classList.add("on");

  // Charger les stats
  var [presRes, signRes, sponsRes] = await Promise.all([
    _supabase.from("prestataires").select("id,nom,categorie,ville,verifie,disponibilite,created_at,nb_vues", {count:"exact"}),
    _supabase.from("signalements").select("id,motif,created_at,prestataire_id", {count:"exact"}),
    _supabase.from("sponsors_partenaires").select("*").order("created_at", {ascending:false}),
  ]);

  var prestas = presRes.data || [];
  var signals = signRes.data || [];
  var sponsorsList = sponsRes.data || [];
  var totalPrestas = presRes.count || prestas.length;
  var verifiesCount = prestas.filter(function(p){ return p.verifie; }).length;
  var disponibles = prestas.filter(function(p){ return p.disponibilite === "disponible"; }).length;

  body.innerHTML = "";

  // Onglets admin
  var tabs = document.createElement("div");
  tabs.className = "admin-tabs";
  var tabNames = ["📊 Statistiques","👥 Prestataires","⚠️ Signalements","✅ Validation","💰 Sponsors"];
  var contents = [];
  tabNames.forEach(function(name, i) {
    var btn = document.createElement("button");
    btn.className = "admin-tab" + (i===0?" on":"");
    btn.textContent = name;
    var cont = document.createElement("div");
    cont.style.display = i===0 ? "block" : "none";
    contents.push(cont);
    btn.addEventListener("click", function(){
      tabs.querySelectorAll(".admin-tab").forEach(function(b){ b.classList.remove("on"); });
      btn.classList.add("on");
      contents.forEach(function(c){ c.style.display="none"; });
      cont.style.display = "block";
    });
    tabs.appendChild(btn);
  });
  body.appendChild(tabs);

  // ── Contenu 0 : Statistiques ──
  var statHtml = '<div class="admin-grid">'
    + '<div class="admin-stat"><div class="admin-stat-val">'+totalPrestas+'</div><div class="admin-stat-lbl">Prestataires</div></div>'
    + '<div class="admin-stat"><div class="admin-stat-val">'+verifiesCount+'</div><div class="admin-stat-lbl">Vérifiés</div></div>'
    + '<div class="admin-stat"><div class="admin-stat-val">'+disponibles+'</div><div class="admin-stat-lbl">Disponibles</div></div>'
    + '<div class="admin-stat"><div class="admin-stat-val">'+signals.length+'</div><div class="admin-stat-lbl">Signalements</div></div>'
    + '</div>';
  // Top catégories
  var catCount = {};
  prestas.forEach(function(p){ if(p.categorie) catCount[p.categorie] = (catCount[p.categorie]||0)+1; });
  var topCats = Object.entries(catCount).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5);
  statHtml += '<h3 style="font-size:14px;font-weight:700;margin-bottom:10px">Top catégories</h3>';
  statHtml += '<table class="admin-table"><tr><th>Catégorie</th><th>Nb</th></tr>';
  topCats.forEach(function(e){ statHtml += '<tr><td>'+e[0]+'</td><td><b>'+e[1]+'</b></td></tr>'; });
  statHtml += '</table>';
  contents[0].innerHTML = statHtml;

  // ── Contenu 1 : Prestataires ──
  var prestaHtml = '<input class="ri" id="adminSearch" placeholder="Rechercher un prestataire..." style="margin-bottom:12px;width:100%">'
    + '<div id="adminPrestaList"></div>';
  contents[1].innerHTML = prestaHtml;

  function renderAdminPrestas(list) {
    var el = document.getElementById("adminPrestaList");
    if (!el) return;
    el.innerHTML = '<table class="admin-table"><tr><th>Nom</th><th>Catégorie</th><th>Ville</th><th>Statut</th><th>Action</th></tr>'
      + list.slice(0,20).map(function(p){
        var badge = p.verifie ? '<span class="badge-status badge-ok">✅ Vérifié</span>' : '<span class="badge-status badge-warn">En attente</span>';
        return '<tr><td><b>'+p.nom+'</b></td><td>'+( p.categorie||"")+' </td><td>'+(p.ville||"")+'</td><td>'+badge+'</td>'
          +'<td><button data-pid="'+p.id+'" data-v="'+(!p.verifie)+'" class="adminVerifyBtn" style="background:var(--orange);border:none;color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer">'+(p.verifie?'Retirer':'Valider')+'</button></td></tr>';
      }).join("")
      + '</table>';
  }
  renderAdminPrestas(prestas);
  setTimeout(function(){
    var srch = document.getElementById("adminSearch");
    if (srch) srch.addEventListener("input", function(){
      var v = srch.value.toLowerCase();
      renderAdminPrestas(prestas.filter(function(p){ return p.nom.toLowerCase().includes(v) || (p.categorie||"").toLowerCase().includes(v); }));
    });
  }, 100);

  // ── Contenu 2 : Signalements ──
  if (signals.length > 0) {
    contents[2].innerHTML = '<table class="admin-table"><tr><th>Motif</th><th>Date</th><th>Action</th></tr>'
      + signals.map(function(s){
        return '<tr><td>'+s.motif+'</td><td>'+(new Date(s.created_at).toLocaleDateString("fr-FR"))+'</td>'
          +'<td><button data-sid="'+s.id+'" class="adminSignalBtn" style="background:#EF4444;border:none;color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer">Traité</button></td></tr>';
      }).join("") + '</table>';
  } else {
    contents[2].innerHTML = '<p style="color:var(--gray);font-size:14px;text-align:center;padding:20px 0">Aucun signalement en cours.</p>';
  }

  // ── Contenu 3 : Validation ──
  var nonVerifies = prestas.filter(function(p){ return !p.verifie; });
  contents[3].innerHTML = nonVerifies.length > 0
    ? '<p style="font-size:13px;color:var(--gray);margin-bottom:12px">'+nonVerifies.length+' prestataire(s) en attente de validation</p>'
      + '<table class="admin-table"><tr><th>Nom</th><th>Catégorie</th><th>Ville</th><th>Action</th></tr>'
      + nonVerifies.slice(0,10).map(function(p){
        return '<tr><td><b>'+p.nom+'</b></td><td>'+(p.categorie||"")+'</td><td>'+(p.ville||"")+'</td>'
          +'<td><button data-pid="'+p.id+'" data-v="true" class="adminVerifyBtn" style="background:#10B981;border:none;color:#fff;border-radius:6px;padding:5px 12px;font-size:12px;cursor:pointer;font-weight:700">✅ Valider</button></td></tr>';
      }).join("")
      + '</table>'
    : '<p style="color:#10B981;font-size:14px;text-align:center;padding:20px 0">Tous les prestataires sont vérifiés ✅</p>';

  // ── Contenu 4 : Sponsors & Partenaires ──
  var enAttente = sponsorsList.filter(function(s){ return s.statut === "en_attente"; });
  var valides = sponsorsList.filter(function(s){ return s.statut === "valide"; });

  var sponsorHtml = "";
  if (enAttente.length > 0) {
    sponsorHtml += "<h3 style='font-size:14px;font-weight:700;margin-bottom:12px;color:var(--orange)'>⏳ " + enAttente.length + " demande(s) en attente</h3>";
    enAttente.forEach(function(s) {
      sponsorHtml += "<div style='background:var(--dark3);border:1px solid rgba(255,107,44,.2);border-radius:12px;padding:14px;margin-bottom:12px'>"
        + "<div style='display:flex;gap:12px;align-items:flex-start;margin-bottom:10px'>"
        + (s.logo ? "<img src='"+s.logo+"' style='width:60px;height:60px;object-fit:contain;background:#fff;border-radius:8px;padding:4px;flex-shrink:0'>" : "")
        + "<div style='flex:1'>"
        + "<div style='font-size:14px;font-weight:800'>" + (s.entreprise||"") + "</div>"
        + "<div style='font-size:11px;color:var(--gray)'>" + (s.type==='sponsor'?'🏆 Sponsor':'🤝 Partenaire') + " · Pack " + (s.pack||"") + " · " + Number(s.prix||0).toLocaleString('fr-FR') + " FCFA</div>"
        + "<div style='font-size:11px;color:var(--gray)'>" + (s.responsable||"") + " · " + (s.telephone||"") + " · " + (s.email||"") + "</div>"
        + (s.lien ? "<div style='font-size:11px;color:var(--orange)'>🔗 " + s.lien + "</div>" : "")
        + "<div style='font-size:11px;color:var(--gray)'>Moyen: " + (s.moyen_paiement||"") + " · Réf: " + (s.reference_paiement||"") + " · Durée: " + (s.duree||"") + "</div>"
        + "</div></div>"
        + "<div style='display:grid;grid-template-columns:1fr 1fr;gap:8px'>"
        + "<button data-spid='" + s.id + "' class='adminSponsorValidBtn' style='background:#10B981;border:none;color:#fff;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer'>✅ Valider</button>"
        + "<button data-spid='" + s.id + "' class='adminSponsorRejectBtn' style='background:#EF4444;border:none;color:#fff;border-radius:8px;padding:10px;font-size:12px;font-weight:700;cursor:pointer'>✕ Rejeter</button>"
        + "</div></div>";
    });
  } else {
    sponsorHtml += "<p style='color:var(--gray);font-size:13px;text-align:center;padding:16px 0'>Aucune demande en attente.</p>";
  }

  if (valides.length > 0) {
    sponsorHtml += "<h3 style='font-size:14px;font-weight:700;margin:20px 0 12px;color:#10B981'>✅ " + valides.length + " actif(s)</h3>";
    sponsorHtml += "<table class='admin-table'><tr><th>Entreprise</th><th>Pack</th><th>Expire le</th><th>Action</th></tr>";
    valides.forEach(function(s) {
      var expire = s.date_fin ? new Date(s.date_fin).toLocaleDateString('fr-FR') : '';
      sponsorHtml += "<tr><td><b>"+(s.entreprise||"")+"</b></td><td>"+(s.pack||"")+"</td><td>"+expire+"</td>"
        + "<td><button data-spid='"+s.id+"' class='adminSponsorRemoveBtn' style='background:#EF4444;border:none;color:#fff;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer'>Retirer</button></td></tr>";
    });
    sponsorHtml += "</table>";
  }

  contents[4].innerHTML = sponsorHtml;

  contents.forEach(function(cont){ body.appendChild(cont); });
  // Event delegation pour les boutons admin
  body.addEventListener('click', function(e) {
    var vb = e.target.closest('.adminVerifyBtn');
    if (vb) { adminVerify(vb.dataset.pid, vb.dataset.v === 'true'); return; }
    var sb = e.target.closest('.adminSignalBtn');
    if (sb) { adminDeleteSignal(sb.dataset.sid); return; }
    var spv = e.target.closest('.adminSponsorValidBtn');
    if (spv) { adminValidateSponsor(spv.dataset.spid); return; }
    var spr = e.target.closest('.adminSponsorRejectBtn');
    if (spr) { adminRejectSponsor(spr.dataset.spid); return; }
    var spx = e.target.closest('.adminSponsorRemoveBtn');
    if (spx) { adminRemoveSponsor(spx.dataset.spid); return; }
  });
}

// ── Actions admin sponsors ────────────────────────────────────
async function adminValidateSponsor(id) {
  if (!_supabase) return;
  try {
    await _supabase.from("sponsors_partenaires").update({statut: "valide"}).eq("id", id);
    showToast("✅ Sponsor validé ! Son emplacement est maintenant actif sur le site.");
    loadSponsorsPartenaires();
    openAdmin();
  } catch(e) { showToast("Erreur : " + e.message); }
}

async function adminRejectSponsor(id) {
  if (!_supabase) return;
  try {
    await _supabase.from("sponsors_partenaires").update({statut: "rejete"}).eq("id", id);
    showToast("Demande rejetée.");
    openAdmin();
  } catch(e) { showToast("Erreur : " + e.message); }
}

async function adminRemoveSponsor(id) {
  if (!_supabase) return;
  try {
    await _supabase.from("sponsors_partenaires").update({statut: "expire"}).eq("id", id);
    showToast("Sponsor retiré du site.");
    loadSponsorsPartenaires();
    openAdmin();
  } catch(e) { showToast("Erreur : " + e.message); }
}


async function adminVerify(id, verifie) {
  if (!_supabase) return;
  await _supabase.from("prestataires").update({verifie:verifie}).eq("id",id);
  showToast(verifie ? "✅ Prestataire vérifié !" : "Vérification retirée");
  openAdmin();
}

async function adminDeleteSignal(id) {
  if (!_supabase) return;
  await _supabase.from("signalements").delete().eq("id",id);
  showToast("✅ Signalement traité");
  openAdmin();
}


// ══ PWA ══════════════════════════════════════
function initPWA() {
  // Créer le manifest dynamiquement
  var manifest = {
    name: "LOKALI — Localise ton prestataire",
    short_name: "LOKALI",
    description: "Trouve le meilleur prestataire près de toi en Afrique",
    start_url: "/",
    display: "standalone",
    background_color: "#1A1A2E",
    theme_color: "#F97316",
    orientation: "portrait",
    icons: [
      {src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' fill='%23F97316' rx='32'/%3E%3Ccircle cx='96' cy='72' r='36' fill='%23fff'/%3E%3Ccircle cx='96' cy='72' r='14' fill='%23F97316'/%3E%3Ccircle cx='96' cy='72' r='6' fill='%2310B981'/%3E%3Cpath d='M67 96 Q96 144 96 150 Q96 144 125 96Z' fill='%23fff'/%3E%3C/svg%3E", sizes:"192x192", type:"image/svg+xml"},
      {src:"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' fill='%23F97316' rx='80'/%3E%3Ccircle cx='256' cy='192' r='96' fill='%23fff'/%3E%3Ccircle cx='256' cy='192' r='38' fill='%23F97316'/%3E%3Ccircle cx='256' cy='192' r='16' fill='%2310B981'/%3E%3Cpath d='M178 256 Q256 384 256 400 Q256 384 334 256Z' fill='%23fff'/%3E%3C/svg%3E", sizes:"512x512", type:"image/svg+xml"}
    ]
  };
  var blob = new Blob([JSON.stringify(manifest)], {type:"application/json"});
  var url = URL.createObjectURL(blob);
  var link = document.getElementById("pwaManifest");
  if (link) link.href = url;

  // Service Worker
  if ("serviceWorker" in navigator) {
    var swLines = [
      "const CN='lokali-v2';",
      "self.addEventListener('install',function(e){e.waitUntil(caches.open(CN).then(function(c){return c.addAll(['./']);}));self.skipWaiting();});",
      "self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.filter(function(k){return k!==CN;}).map(function(k){return caches.delete(k);}));}));self.clients.claim();});",
      "self.addEventListener('fetch',function(e){e.respondWith(fetch(e.request).then(function(r){var rc=r.clone();caches.open(CN).then(function(c){c.put(e.request,rc);});return r;}).catch(function(){return caches.match(e.request);}));});",
      "self.addEventListener('push',function(e){var d=e.data?e.data.json():{};e.waitUntil(self.registration.showNotification(d.title||'LOKALI',{body:d.body||'Nouvelle annonce',icon:'/favicon.ico',data:{url:d.url||'/'}})   );});",
      "self.addEventListener('notificationclick',function(e){e.notification.close();var url=(e.notification.data&&e.notification.data.url)||'/';e.waitUntil(clients.matchAll({type:'window'}).then(function(c){for(var i=0;i<c.length;i++){if(c[i].url===url&&'focus' in c[i])return c[i].focus();}if(clients.openWindow)return clients.openWindow(url);}));});"
    ];
    var swBlob = new Blob([swLines.join("\n")], {type: "text/javascript"});
    var swUrl = URL.createObjectURL(swBlob);
    navigator.serviceWorker.register(swUrl).then(function(reg) {
      window._swReg = reg;
      setTimeout(requestPushPermission, 3000);
    }).catch(function(e) { console.warn("[SW]", e); });
  }

  // requestPushPermission et sendLocalPush sont définies en scope global ci-dessous
  // Bannière d'installation
  var deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", function(e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  function showInstallBanner() {
    var banner = document.getElementById("installBanner");
    if (banner) banner.style.display = "flex";
  }

  var installBtn = document.getElementById("installBtn");
  if (installBtn) {
    installBtn.addEventListener("click", function() {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function() {
          deferredPrompt = null;
          var banner = document.getElementById("installBanner");
          if (banner) banner.style.display = "none";
        });
      }
    });
  }
}

function requestPushPermission() {
  if (!("Notification" in window) || Notification.permission !== "default") return;
  Notification.requestPermission().then(function(p) { window._pushEnabled = (p === "granted"); });
}

function sendLocalPush(title, body, url) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  var opts = {body: body, icon: "/favicon.ico", data: {url: url||"/"}};
  if (window._swReg) { window._swReg.showNotification(title, opts); }
  else { new Notification(title, opts); }
}



// ══ DEMANDE MULTI-PRESTATAIRES AVEC POSITION GPS ══
async function submitDevis() {
  var nom = (document.getElementById("devisNom")||{}).value||"";
  var tel = (document.getElementById("devisTel")||{}).value||"";
  var ville = (document.getElementById("devisVille")||{}).value||"";
  var cat = (document.getElementById("devisCat")||{}).value||"";
  var desc = (document.getElementById("devisDesc")||{}).value||"";
  var dispo = (document.getElementById("devisDispo")||{}).value||"flexible";
  if (!nom.trim()||!tel.trim()||!ville.trim()||!cat) { showToast("Remplis tous les champs obligatoires"); return; }
  if (!_supabase) { showToast("Connexion indisponible"); return; }
  showToast("Recherche des prestataires...");
  try {
    var q = _supabase.from("prestataires").select("id,nom,telephone,whatsapp,ville,quartier,latitude,longitude,tarif")
      .ilike("categorie", "%" + cat + "%")
      .eq("disponibilite", "disponible")
      .limit(5);
    if (!_userLat) q = q.ilike("ville", "%" + ville + "%");
    var res = await q;
    var prestas = res.data || [];
    if (_userLat && prestas.length > 0) {
      prestas = prestas.filter(function(p){ return p.latitude && p.longitude; })
        .sort(function(a,b){ return calcDist(_userLat,_userLng,a.latitude,a.longitude)-calcDist(_userLat,_userLng,b.latitude,b.longitude); });
    }
    if (!prestas.length) { showToast("Aucun prestataire disponible pour " + cat); return; }
    var positionTxt = _userLat ? " Ma position : https://www.google.com/maps?q=" + _userLat + "," + _userLng : "";
    var msg = "Bonjour, je m'appelle " + nom + ". J'ai trouve votre profil sur LOKALI. J'ai besoin de vos services : " + cat + ". Disponibilite : " + dispo + (desc ? ". Details : " + desc : "") + ". Mon numero : " + tel + positionTxt + ". Merci de me repondre avec votre disponibilite et votre tarif.";
    document.getElementById("mTitle").textContent = "Prestataires trouves";
    document.getElementById("mSub").textContent = prestas.length + " prestataire(s) disponible(s) pour " + cat;
    var body = document.getElementById("mBody");
    body.innerHTML = "";
    prestas.forEach(function(p) {
      var dist = (_userLat && p.latitude && p.longitude) ? " · " + calcDist(_userLat,_userLng,p.latitude,p.longitude) + " km" : "";
      var waNum = cleanTel(p.whatsapp || p.telephone || "");
      var waUrl = "https://wa.me/" + waNum + "?text=" + encodeURIComponent(msg);
      var card = document.createElement("div");
      card.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid var(--border)";
      card.innerHTML = "<div style='margin-bottom:10px'><div style='font-size:15px;font-weight:800'>" + p.nom + "</div>"
        + "<div style='font-size:12px;color:var(--gray);margin-top:2px'>" + (p.quartier?p.quartier+", ":"") + (p.ville||"") + dist + "</div>"
        + (p.tarif?"<div style='font-size:13px;color:var(--orange);font-weight:700;margin-top:4px'>"+p.tarif+"</div>":"")
        + "</div><div style='display:flex;gap:8px'>"
        + "<a href='" + waUrl + "' target='_blank' class='contact-wa' style='flex:1;padding:10px;font-size:13px'>Envoyer ma demande</a>"
        + "<a href='tel:" + (p.telephone||"") + "' class='contact-call' style='padding:10px 14px;font-size:13px'>Appel</a>"
        + "</div>";
      if (p.latitude && p.longitude) {
        var mapBtn = document.createElement("button");
        mapBtn.style.cssText = "background:none;border:1px solid var(--border);color:var(--gray);border-radius:8px;padding:6px 12px;font-size:12px;cursor:pointer;width:100%;margin-top:8px";
        mapBtn.textContent = "Voir itineraire sur Google Maps";
        var lat2 = p.latitude, lng2 = p.longitude;
        mapBtn.addEventListener("click", function() {
          window.open(_userLat ? "https://www.google.com/maps/dir/"+_userLat+","+_userLng+"/"+lat2+","+lng2 : "https://www.google.com/maps?q="+lat2+","+lng2, "_blank");
        });
        card.appendChild(mapBtn);
      }
      body.appendChild(card);
    });
    document.getElementById("overlay").classList.add("on");
    ["devisNom","devisTel","devisVille","devisDesc"].forEach(function(id){ var el=document.getElementById(id);if(el)el.value=""; });
    var cs=document.getElementById("devisCat"); if(cs) cs.selectedIndex=0;
  } catch(e) { showToast("Erreur : " + e.message); }
}

function buildWaUrlWithPosition(waNum, prestaNom, cat) {
  var positionTxt = _userLat ? " Ma position : https://www.google.com/maps?q=" + _userLat + "," + _userLng : "";
  var msg = "Bonjour " + prestaNom + ", j'ai trouve votre profil sur LOKALI (" + cat + "). Je souhaite faire appel a vos services." + positionTxt;
  return "https://wa.me/" + cleanTel(waNum) + "?text=" + encodeURIComponent(msg);
}


// ══ HERO CAROUSEL ═══════════════════════════════
(function() {
  var IMGS = [
    "images/hero2.jpg",
    "images/hero3.jpg",
    "images/hero4.jpg",
    "images/hero5.jpg",
    "images/hero6.jpg"
  ];
  var _cur = 0;
  function applySlides() {
    for (var i = 0; i < IMGS.length; i++) {
      var el = document.getElementById("hslide" + i);
      if (el) el.style.backgroundImage = "url(" + IMGS[i] + ")";
    }
  }
  function goSlide(n) {
    var slides = document.querySelectorAll(".hero-slide");
    var dots = document.querySelectorAll(".hero-carousel-dots span");
    slides.forEach(function(s) { s.classList.remove("active"); });
    dots.forEach(function(d) { d.classList.remove("on"); });
    _cur = (n + IMGS.length) % IMGS.length;
    if (slides[_cur]) slides[_cur].classList.add("active");
    if (dots[_cur]) dots[_cur].classList.add("on");
  }
  window.goSlide = goSlide;
  window.applySlides = applySlides;
  var _timer = null;
  function startAuto() {
    _timer = setInterval(function() { goSlide(_cur + 1); }, 4500);
  }
  window.startAuto = startAuto;
  
})();

// ══ CATÉGORIES ANNONCES — base complète ══════════════════════
var ANN_CATS = {
  "Bâtiment & Construction": ["Maçonnerie","Plomberie","Électricité","Menuiserie bois","Menuiserie aluminium","Carrelage","Peinture","Toiture","Climatisation","Soudure","Ferronnerie","Décoration intérieure","Architecture","Génie civil","Isolation","Vitrerie","Étanchéité","Charpente","Plâtrerie","Terrassement","Forage de puits"],
  "Mécanique & Auto": ["Mécanique automobile","Mécanique moto","Carrosserie","Peinture auto","Électronique auto","Pneumatiques","Vidange & entretien","Remorquage","Lavage auto","Vente pièces auto","GPS & alarme auto","Climatisation auto","Vitrage auto","Dépannage moto"],
  "Informatique & Tech": ["Réparation PC","Réparation téléphone","Développement web","Développement mobile","Réseaux & câblage","Cybersécurité","Infographie & Design","Impression numérique","Vente matériel informatique","Formation informatique","Intelligence artificielle","E-commerce","SEO & Marketing digital","Community management","Maintenance serveur","Récupération de données"],
  "Beauté & Bien-être": ["Coiffure femme","Coiffure homme","Coiffure enfant","Manucure & Pédicure","Maquillage","Soins du visage","Massage & Spa","Épilation","Tatouage","Barbier","Perruques & Extensions","Soins naturels","Onglerie","Cosmétique bio"],
  "Santé & Médical": ["Médecin généraliste","Infirmier à domicile","Pharmacie","Dentiste","Kinésithérapie","Sage-femme","Nutrition & Diététique","Psychologue","Opticien","Vétérinaire","Médecine traditionnelle","Ambulance","Laboratoire d'analyses","Radiologie","Gynécologie","Pédiatrie"],
  "Enseignement & Formation": ["Cours particuliers","Répétiteur scolaire","Formation professionnelle","Formation en langues","Formation informatique","Coaching & Mentoring","Crèche & Garderie","Musique & Chant","Danse","Arts plastiques","Sport & Fitness","Formation entrepreneuriat","Soutien universitaire","Alphabétisation"],
  "Transport & Livraison": ["Taxi","VTC","Transport scolaire","Location de véhicule","Déménagement","Livraison de colis","Livraison alimentaire","Transport de marchandises","Moto-taxi","Location de camion","Chauffeur personnel","Transport interurbain","Transport de fonds"],
  "Événementiel": ["Organisation de mariages","Traiteur","DJ & Sonorisation","Décoration événement","Location de salle","Photographe événement","Vidéaste","Location de matériel","Animation","Fleuriste","Location de tente","Protocole & Hôtesse","Organisation de conférences","Wedding planner"],
  "Photographie & Vidéo": ["Photographe studio","Photographe mariage","Reportage photo","Vidéaste professionnel","Montage vidéo","Motion design","Drone","Tirage photo","Production musicale","Podcast","Réalisation de clips"],
  "Restauration & Alimentation": ["Restaurant","Traiteur","Pâtisserie","Boulangerie","Livraison de repas","Bar & Brasserie","Vente de produits locaux","Cuisine à domicile","Vente de boissons","Fast-food","Glacier","Salon de thé"],
  "Commerce & Vente": ["Vente en ligne","Commerce de détail","Grossiste","Import & Export","Vente de produits cosmétiques","Vente de vêtements","Vente de matériaux","Boutique en ligne","Agent commercial","Courtier","Vente d'électroménager","Quincaillerie"],
  "Immobilier": ["Location d'appartement","Location de maison","Vente immobilière","Agence immobilière","Gestion locative","Estimation immobilière","Promoteur immobilier","Location de bureau","Location de terrain","Construction immobilière","Syndic de copropriété"],
  "Agriculture & Élevage": ["Maraîchage","Agriculture vivrière","Élevage de volailles","Élevage bovin","Pisciculture","Apiculture","Vente de produits agricoles","Pépinière","Jardinage","Irrigation","Formation agricole","Élevage caprin","Aviculture","Transformation agroalimentaire"],
  "Couture & Textile": ["Couture sur mesure","Broderie","Teinture","Vente de tissu","Retouche vêtement","Confection africaine","Mode & Stylisme","Tapisserie","Vente de vêtements 2nd main","Création de uniformes"],
  "Nettoyage & Entretien": ["Nettoyage de bureau","Nettoyage résidentiel","Laverie","Nettoyage à sec","Désinfection","Jardinage","Paysagisme","Entretien de piscine","Pest Control","Nettoyage industriel","Nettoyage de tapis"],
  "Sécurité & Surveillance": ["Agent de sécurité","Gardiennage","Vidéosurveillance","Installation alarme","Sécurité événementielle","Convoyage de fonds","Garde du corps","Sécurité incendie"],
  "Tourisme & Hôtellerie": ["Hôtel","Maison d'hôtes","Agence de voyage","Guide touristique","Location saisonnière","Excursions","Visa & Billets","Croisière","Camping","Réceptif touristique"],
  "Services à la personne": ["Baby-sitting","Aide aux personnes âgées","Aide ménagère","Garde malade","Courses à domicile","Assistance administrative","Traduction","Interprète","Aide aux devoirs","Accompagnement handicap"],
  "Juridique & Finance": ["Avocat","Notaire","Huissier","Comptable","Expert-comptable","Conseiller fiscal","Assurance","Microfinance","Courtier en crédit","Conseil juridique","Médiateur","Recouvrement de créances"],
  "Justice & Administratif": ["Avocat pénaliste","Avocat civiliste","Conseil en droit du travail","Médiation familiale","Conseil en immigration","Assistance visa","Légalisation de documents","Traduction assermentée"],
  "Énergie & Environnement": ["Panneau solaire","Groupe électrogène","Eau & Forage","Gestion des déchets","Biomasse","Climatisation solaire","Audit énergétique","Installation électrique solaire","Recyclage"],
  "Art & Culture": ["Musicien","Chanteur","Artiste peintre","Sculpteur","Écrivain","Troupe théâtrale","Danseur traditionnel","Artisanat local","Calligraphie","Restauration d'œuvres d'art"],
  "Industrie & Production": ["Usine de transformation","Fabrication métallique","Menuiserie industrielle","Production plastique","Emballage & Conditionnement","Maintenance industrielle","Soudure industrielle","Fonderie"],
  "Audiovisuel & Communication": ["Production audiovisuelle","Animateur radio/TV","Rédaction web","Relations publiques","Agence de communication","Création de contenu","Speaker événementiel","Régie publicitaire"],
  "Artisanat": ["Poterie","Sculpture sur bois","Vannerie","Bijouterie artisanale","Cordonnerie","Maroquinerie","Forge artisanale","Tissage traditionnel"]
}


// ══════════════════════════════════════════════════════════
// MODULE ANNONCES LOKALI — Géolocalisation intelligente
// ══════════════════════════════════════════════════════════

var _annonces = [];         // cache local
var _annFavs  = JSON.parse(localStorage.getItem("lokali_ann_favs") || "[]");
var _annHistory = JSON.parse(localStorage.getItem("lokali_ann_hist") || "[]"); // IDs consultés
var _annCatHist  = JSON.parse(localStorage.getItem("lokali_ann_cats") || "[]"); // cats consultées

// ── Navigation ──────────────────────────────────────────
function showAnnoncesPage() {
  // Cacher toute la page d'accueil en un seul bloc
  var home = document.getElementById("homePage");
  if (home) home.style.display = "none";
  document.getElementById("annPage").classList.add("active");
  document.getElementById("annPage").style.display = "block";
  window.scrollTo(0, 0);
  // Montrer FAB si prestataire connecté
  if (_currentUser) {
    var fab = document.getElementById("annPubFab");
    if (fab) fab.classList.add("show");
  }
  populateAnnFilters();
  loadAnnonces();
}

function showHomeFromAnn() {
  document.getElementById("annPage").classList.remove("active");
  document.getElementById("annPage").style.display = "none";
  var home = document.getElementById("homePage");
  if (home) home.style.display = "";
  window.scrollTo(0, 0);
  var fab = document.getElementById("annPubFab");
  if (fab) fab.classList.remove("show");
}

// ── Peupler les filtres ──────────────────────────────────
function populateAnnFilters() {
  var catSel = document.getElementById("annFCat");
  if (!catSel) return;

  // Remplir les options une seule fois
  if (catSel.options.length <= 1) {
    Object.keys(ANN_CATS).forEach(function(cat) {
      var o = document.createElement("option");
      o.value = cat; o.textContent = cat;
      catSel.appendChild(o);
    });
  }

  // Le listener de changement est toujours (ré)attaché, indépendamment du remplissage
  if (!catSel._listenerAttached) {
    catSel.addEventListener("change", function() {
      var sousSel = document.getElementById("annFSousCat");
      sousSel.innerHTML = "<option value=''>Sous-catégorie</option>";
      var subs = ANN_CATS[catSel.value] || [];
      subs.forEach(function(s) {
        var o = document.createElement("option"); o.value = s; o.textContent = s; sousSel.appendChild(o);
      });
      filterAnnonces();
    });
    catSel._listenerAttached = true;
  }

  // Barre de recherche métier avec autocomplete (319 métiers)
  var searchSlot = document.getElementById("annMetierSearchSlot");
  if (searchSlot && !searchSlot._initialized) {
    var metierSearch = mkMetierSearch(function(cat, sub) {
      catSel.value = cat;
      var sousSel = document.getElementById("annFSousCat");
      sousSel.innerHTML = "<option value=''>Sous-catégorie</option>";
      (ANN_CATS[cat]||[]).forEach(function(s) {
        var o = document.createElement("option"); o.value = s; o.textContent = s;
        if (s === sub) o.selected = true;
        sousSel.appendChild(o);
      });
      filterAnnonces();
    });
    metierSearch.style.marginBottom = "0";
    searchSlot.appendChild(metierSearch);
    searchSlot._initialized = true;
  }
}

// ── Charger annonces depuis Supabase ────────────────────
async function loadAnnonces() {
  if (!_supabase) { renderAnnonces([]); return; }
  // Essayer Edge Function (moteur reco serveur)
  try {
    var rec = await callRecommendEngine();
    if (rec) {
      _annonces = rec;
      populateGeoFilters();
      filterAnnonces();
      showSmartReco();
      return;
    }
  } catch(ex) { console.warn("[LOKALI] Edge Function fallback"); }
  // Fallback direct Supabase
  try {
    var res = await _supabase.from("annonces")
      .select("*")
      .order("created_at", {ascending: false})
      .limit(200);
    _annonces = res.data || [];
    if (_userLat && _userLng) {
      _annonces.forEach(function(a) {
        a._dist = (a.latitude && a.longitude)
          ? calcDist(_userLat, _userLng, a.latitude, a.longitude) : 9999;
      });
      _annonces.sort(function(a,b){ return scoreAnnonce(b) - scoreAnnonce(a); });
    }
    populateGeoFilters();
    filterAnnonces();
    showSmartReco();
  } catch(e) { console.warn("loadAnnonces:", e); renderAnnonces([]); }
}

async function callRecommendEngine() {
  var url = SUPA_URL + "/functions/v1/recommend-annonces";
  var payload = {
    lat: _userLat||null, lng: _userLng||null,
    cats_hist: JSON.parse(localStorage.getItem("lokali_ann_cats")||"[]"),
    ann_hist:  JSON.parse(localStorage.getItem("lokali_ann_hist")||"[]"),
    limit: 200
  };
  var resp = await fetch(url, {
    method: "POST",
    headers: {"Content-Type":"application/json","Authorization":"Bearer "+SUPA_KEY,"apikey":SUPA_KEY},
    body: JSON.stringify(payload)
  });
  if (!resp.ok) return null;
  var data = await resp.json();
  return data.annonces || null;
}

function populateGeoFilters() {
  var paysSel = document.getElementById("annFPays");
  var villeSel = document.getElementById("annFVille");

  // Pays : toujours la liste complète des 68 pays, peu importe s'il y a des annonces
  if (paysSel && paysSel.options.length <= 1) {
    PAYS_LIST.forEach(function(p) {
      var o = document.createElement("option");
      o.value = p.n;
      o.textContent = (p.f ? p.f + " " : "") + p.n;
      paysSel.appendChild(o);
    });
  }

  // Ville par défaut : toutes les villes des annonces existantes
  if (villeSel && !villeSel._initialized) {
    villeSel.innerHTML = "<option value=''>Toutes villes</option>";
    var villes = {};
    _annonces.forEach(function(a) { if (a.ville) villes[a.ville] = 1; });
    Object.keys(villes).sort().forEach(function(v) {
      var o = document.createElement("option"); o.value = v; o.textContent = v; villeSel.appendChild(o);
    });
    villeSel._initialized = true;
  }

  // Intelligence : quand on choisit un pays, proposer ses grandes villes
  if (paysSel && !paysSel._villeListenerAttached) {
    paysSel.addEventListener("change", function() {
      if (!paysSel.value) {
        // Pays désélectionné : revenir aux villes des annonces
        villeSel.innerHTML = "<option value=''>Toutes villes</option>";
        var villes = {};
        _annonces.forEach(function(a) { if (a.ville) villes[a.ville] = 1; });
        Object.keys(villes).sort().forEach(function(v) {
          var o = document.createElement("option"); o.value = v; o.textContent = v; villeSel.appendChild(o);
        });
      } else {
        fillVillesByPays(paysSel.value, villeSel);
      }
      filterAnnonces();
    });
    paysSel._villeListenerAttached = true;
  }
}

// ── Moteur de tri intelligent ────────────────────────────
function scoreAnnonce(a) {
  var score = 0;
  // Proximité géographique (poids max)
  if (a._dist !== undefined) {
    if (a._dist < 5)  score += 100;
    else if (a._dist < 10) score += 80;
    else if (a._dist < 25) score += 60;
    else if (a._dist < 50) score += 40;
    else score += 10;
  }
  // Catégorie déjà consultée (historique)
  if (_annCatHist.indexOf(a.categorie) !== -1) score += 30;
  // Annonce jamais vue
  if (_annHistory.indexOf(a.id) === -1) score += 20;
  // Fraîcheur (moins de 7 jours)
  if (a.created_at) {
    var age = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
    if (age < 1) score += 25;
    else if (age < 7) score += 15;
    else if (age < 30) score += 5;
  }
  return score;
}

// ── Filtrer et afficher ──────────────────────────────────
function filterAnnonces() {
  var q    = (document.getElementById("annSearch")||{}).value.toLowerCase() || "";
  if (q.length > 2) {
    clearTimeout(window._searchTrackTimer);
    window._searchTrackTimer = setTimeout(function() { trackSearch(q, "annonce"); }, 1200);
  }
  var cat  = (document.getElementById("annFCat")||{}).value || "";
  var sous = (document.getElementById("annFSousCat")||{}).value || "";
  var pays = (document.getElementById("annFPays")||{}).value || "";
  var ville = (document.getElementById("annFVille")||{}).value || "";
  var quartier = (document.getElementById("annFQuartier")||{}).value || "";
  var dist = parseFloat((document.getElementById("annFDist")||{}).value) || 0;
  var sort = (document.getElementById("annSort")||{}).value || "distance";

  // Peupler le filtre Quartier selon la ville choisie
  updateQuartierFilter(ville);

  var filtered = _annonces.filter(function(a) {
    if (q && !(a.titre||"").toLowerCase().includes(q) && !(a.description||"").toLowerCase().includes(q) && !(a.categorie||"").toLowerCase().includes(q)) return false;
    if (cat && a.categorie !== cat) return false;
    if (sous && a.sous_categorie !== sous) return false;
    if (pays && a.pays !== pays) return false;
    if (ville && a.ville !== ville) return false;
    if (quartier && a.quartier !== quartier) return false;
    if (dist && a._dist > dist) return false;
    return true;
  });

  // Tri
  if (sort === "distance") {
    filtered.sort(function(a,b) { return scoreAnnonce(b) - scoreAnnonce(a); });
  } else if (sort === "recent") {
    filtered.sort(function(a,b) { return new Date(b.created_at) - new Date(a.created_at); });
  } else if (sort === "prix_asc") {
    filtered.sort(function(a,b) { return (parseFloat(a.prix)||0) - (parseFloat(b.prix)||0); });
  } else if (sort === "prix_desc") {
    filtered.sort(function(a,b) { return (parseFloat(b.prix)||0) - (parseFloat(a.prix)||0); });
  }

  var cnt = document.getElementById("annCount");
  if (cnt) cnt.textContent = filtered.length + " annonce" + (filtered.length > 1 ? "s" : "") + " trouvée" + (filtered.length > 1 ? "s" : "");

  renderAnnonces(filtered);
}

function clearAnnFilters() {
  ["annSearch","annFCat","annFSousCat","annFPays","annFVille","annFQuartier","annFDist"].forEach(function(id){
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  filterAnnonces();
}

// ── Rendu des cartes annonces ────────────────────────────
function renderAnnonces(list) {
  var grid = document.getElementById("annGrid");
  if (!grid) return;
  if (!list.length) {
    grid.innerHTML = "<div class='ann-empty'><div class='ann-empty-icon'>&#128203;</div><p>Aucune annonce pour le moment.<br>Soyez le premier &#224; publier !</p></div>";
    return;
  }
  grid.innerHTML = "";
  list.forEach(function(a) {
    var isFav = _annFavs.indexOf(String(a.id)) !== -1;
    var distTxt = (a._dist && a._dist < 9999) ? a._dist.toFixed(1) + " km" : "";
    var ageTxt = getAnnonceAge(a.created_at);
    var isTop = !!a.is_top;

    var card = document.createElement("div");
    card.className = "ann-card" + (isTop ? " ann-card-top" : "");

    var imgWrap = document.createElement("div");
    imgWrap.className = "ann-card-img";
    imgWrap.style.cssText = "width:100%;height:180px;background:var(--dark3);display:flex;align-items:center;justify-content:center;font-size:48px;position:relative;overflow:hidden";
    if (a.photo1) {
      var im = document.createElement("img");
      im.src = a.photo1;
      im.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
      imgWrap.appendChild(im);
    } else {
      imgWrap.textContent = getCatEmoji(a.categorie);
    }

    // Badge TOP (annonces sponsorisées/premium) — prioritaire sur le badge catégorie
    if (isTop) {
      var topBdg = document.createElement("div");
      topBdg.className = "ann-card-top-badge";
      topBdg.innerHTML = "&#11088; TOP";
      imgWrap.appendChild(topBdg);
    } else {
      var bdg = document.createElement("div");
      bdg.className = "ann-card-badge";
      bdg.textContent = a.categorie || "Service";
      imgWrap.appendChild(bdg);
    }

    var favBtn = document.createElement("button");
    favBtn.className = "ann-card-fav" + (isFav ? " on" : "");
    favBtn.innerHTML = isFav ? "&#10084;&#65039;" : "&#129293;";
    favBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var sid = String(a.id);
      var willBeFav = _annFavs.indexOf(sid) === -1;
      favBtn.innerHTML = willBeFav ? "&#10084;&#65039;" : "&#129293;";
      favBtn.classList.toggle("on", willBeFav);
      toggleAnnFavSupabase(a.id);
    });
    imgWrap.appendChild(favBtn);

    // Âge de l'annonce (style CoinAfrique : "5 jours", "1 mois"...)
    if (ageTxt) {
      var ageEl = document.createElement("div");
      ageEl.className = "ann-card-age";
      ageEl.textContent = ageTxt;
      imgWrap.appendChild(ageEl);
    }

    if (distTxt) {
      var distEl = document.createElement("div");
      distEl.className = "ann-card-dist";
      distEl.textContent = "&#128205; " + distTxt;
      imgWrap.appendChild(distEl);
    }
    card.appendChild(imgWrap);

    var cardBody = document.createElement("div");
    cardBody.className = "ann-card-body";
    var catTxt = (a.categorie||"") + (a.sous_categorie ? " · "+a.sous_categorie : "");
    var priceTxt = a.prix ? Number(a.prix).toLocaleString("fr-FR") + " FCFA" : "Prix sur demande";
    // Localisation précise : quartier + ville (comme CoinAfrique "Adjamé, Abidjan")
    var locTxt = [a.quartier, a.ville].filter(Boolean).join(", ") || a.pays || "";
    cardBody.innerHTML =
      "<div class='ann-card-cat'>" + catTxt + "</div>"
      + "<div class='ann-card-title'>" + (a.titre||"Sans titre") + "</div>"
      + "<div class='ann-card-desc'>" + (a.description||"") + "</div>"
      + "<div class='ann-card-meta'>"
      + "<div class='ann-card-price'>" + priceTxt + "</div>"
      + "<div class='ann-card-loc'>&#128205; " + locTxt + "</div>"
      + "</div>";
    card.appendChild(cardBody);

    var btns = document.createElement("div");
    btns.className = "ann-card-btns";
    btns.style.padding = "0 14px 14px";

    var waBtn = document.createElement("button");
    waBtn.className = "ann-btn ann-btn-wa";
    waBtn.textContent = "WhatsApp";
    waBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      var num = (a.whatsapp||a.telephone||"").replace(/[^0-9+]/g,"");
      if (!num) { showToast("Numero non disponible"); return; }
      var msg = "Bonjour, j'ai vu votre annonce sur LOKALI et je suis interesse(e).";
      window.open("https://wa.me/"+num+"?text="+encodeURIComponent(msg), "_blank");
    });

    var callBtn = document.createElement("button");
    callBtn.className = "ann-btn ann-btn-call";
    callBtn.textContent = "Appeler";
    callBtn.addEventListener("click", function(ev) {
      ev.stopPropagation();
      if (!a.telephone) { showToast("Numero non disponible"); return; }
      window.location.href = "tel:" + a.telephone;
    });

    var viewBtn = document.createElement("button");
    viewBtn.className = "ann-btn ann-btn-view";
    viewBtn.textContent = "Voir l'annonce complete";
    viewBtn.addEventListener("click", function(ev) { ev.stopPropagation(); openAnnDetail(a.id); });

    btns.appendChild(waBtn); btns.appendChild(callBtn); btns.appendChild(viewBtn);
    card.appendChild(btns);
    card.addEventListener("click", function() { openAnnDetail(a.id); });
    grid.appendChild(card);
  });
}

// ── Calcul de l'âge d'une annonce (style CoinAfrique) ──────────
function getAnnonceAge(createdAt) {
  if (!createdAt) return "";
  var diffMs = Date.now() - new Date(createdAt).getTime();
  var diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return "Aujourd'hui";
  if (diffDays === 1) return "1 jour";
  if (diffDays < 30) return diffDays + " jours";
  var diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 mois";
  if (diffMonths < 12) return diffMonths + " mois";
  var diffYears = Math.floor(diffMonths / 12);
  return diffYears + " an" + (diffYears>1?"s":"");
}


function getCatEmoji(cat) {
  var m = {"Bâtiment & Construction":"🏗️","Mécanique & Auto":"🚗","Informatique & Tech":"💻","Beauté & Bien-être":"💄","Santé & Médical":"🏥","Enseignement & Formation":"🎓","Transport & Livraison":"🚚","Événementiel":"🎉","Photographie & Vidéo":"📸","Restauration & Alimentation":"🍽️","Commerce & Vente":"🛍️","Immobilier":"🏠","Agriculture & Élevage":"🌾","Couture & Textile":"🧵","Nettoyage & Entretien":"🧹","Sécurité & Surveillance":"🔒","Tourisme & Hôtellerie":"✈️","Services à la personne":"🤝","Juridique & Finance":"⚖️","Énergie & Environnement":"☀️","Art & Culture":"🎨"};
  return m[cat] || "📋";
}

// ── Favoris annonces ─────────────────────────────────────
function toggleAnnFav(e, id) {
  e.stopPropagation();
  var btn = e.currentTarget;
  var idx = _annFavs.indexOf(id);
  if (idx === -1) { _annFavs.push(id); btn.textContent="❤️"; btn.classList.add("on"); }
  else { _annFavs.splice(idx,1); btn.textContent="🤍"; btn.classList.remove("on"); }
  localStorage.setItem("lokali_ann_favs", JSON.stringify(_annFavs));
}

function contactAnnWA(e, wa, titre) {
  if (e && e.stopPropagation) e.stopPropagation();
  if (!wa) { showToast("Numero non disponible"); return; }
  var num = wa.replace(/[^0-9+]/g,"");
  var msg = "Bonjour, j'ai vu votre annonce sur LOKALI et je suis interesse(e).";
  window.open("https://wa.me/" + num + "?text=" + encodeURIComponent(msg), "_blank");
}

function callAnn(e, tel) {
  e.stopPropagation();
  if (!tel) { showToast("Numéro non disponible"); return; }
  window.location.href = "tel:" + tel;
}

// ── Détail annonce ───────────────────────────────────────
function openAnnDetail(id) {
  var a = _annonces.find(function(x){ return x.id == id; });
  if (!a) return;
  // Enregistrer dans historique
  if (_annHistory.indexOf(id) === -1) { _annHistory.push(id); localStorage.setItem("lokali_ann_hist", JSON.stringify(_annHistory)); }
  if (a.categorie && _annCatHist.indexOf(a.categorie) === -1) { _annCatHist.push(a.categorie); localStorage.setItem("lokali_ann_cats", JSON.stringify(_annCatHist)); }

  document.getElementById("mTitle").textContent = a.titre || "Annonce";
  document.getElementById("mSub").textContent = (a.categorie||"") + (a.sous_categorie ? " · "+a.sous_categorie : "");
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  // Photos
  var photos = [a.photo1,a.photo2,a.photo3,a.photo4,a.photo5].filter(Boolean);
  if (photos.length) {
    var pDiv = document.createElement("div");
    pDiv.style.cssText = "display:flex;gap:8px;overflow-x:auto;margin-bottom:16px";
    photos.forEach(function(src){
      var img = document.createElement("img");
      img.src = src; img.style.cssText = "width:200px;height:140px;object-fit:cover;border-radius:10px;flex-shrink:0";
      pDiv.appendChild(img);
    });
    body.appendChild(pDiv);
  } else {
    var emoDiv = document.createElement("div");
    emoDiv.style.cssText = "text-align:center;font-size:64px;padding:20px 0";
    emoDiv.textContent = getCatEmoji(a.categorie);
    body.appendChild(emoDiv);
  }

  function detRow(label, val) {
    if (!val) return;
    var d = document.createElement("div");
    d.style.cssText = "margin-bottom:10px";
    d.innerHTML = "<div style='font-size:10px;color:var(--orange);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px'>"+label+"</div>"
      + "<div style='font-size:14px;color:rgba(255,255,255,.85);line-height:1.6'>"+val+"</div>";
    body.appendChild(d);
  }

  detRow("Description", a.description);
  detRow("Prix", a.prix ? Number(a.prix).toLocaleString("fr-FR")+" FCFA" : "Prix sur demande");
  detRow("Localisation precise", [a.quartier, a.ville, a.pays].filter(Boolean).join(", "));
  detRow("Telephone", a.telephone || "");
  detRow("WhatsApp", a.whatsapp || a.telephone || "");
  detRow("Horaires", a.horaires);
  detRow("Validité", a.validite);
  if (a._dist && a._dist < 9999) detRow("Distance", a._dist.toFixed(1)+" km de vous");
  var ageDetail = getAnnonceAge(a.created_at);
  if (ageDetail) detRow("Publiee il y a", ageDetail);

  // Boutons contact
  var btns = document.createElement("div");
  btns.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px";

  var waBtn = document.createElement("button");
  waBtn.style.cssText = "background:#25D366;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;grid-column:1/-1";
  waBtn.textContent = "💬 Contacter via WhatsApp";
  waBtn.addEventListener("click", function(){ contactAnnWA({stopPropagation:function(){}}, a.whatsapp||a.telephone, a.titre); });

  var callBtn = document.createElement("button");
  callBtn.style.cssText = "background:var(--orange);color:#fff;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:700;cursor:pointer";
  callBtn.textContent = "📞 Appeler";
  callBtn.addEventListener("click", function(){ callAnn({stopPropagation:function(){}}, a.telephone); });

  var itinBtn = document.createElement("button");
  itinBtn.style.cssText = "background:#4285F4;color:#fff;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:700;cursor:pointer";
  itinBtn.textContent = "🗺️ Itinéraire";
  itinBtn.addEventListener("click", function(){
    if (a.latitude && a.longitude) window.open("https://maps.google.com?q="+a.latitude+","+a.longitude,"_blank");
    else showToast("Position non disponible");
  });

  appendAll(btns, [waBtn, callBtn, itinBtn]);
  body.appendChild(btns);
  document.getElementById("overlay").classList.add("on");
}

// ── Formulaire publier annonce ────────────────────────────
function openPublierAnnonce() {
  if (!_currentUser) { showToast("Connectez-vous pour publier"); openModal("login"); return; }
  document.getElementById("mTitle").textContent = "📢 Publier une annonce";
  document.getElementById("mSub").textContent = "Visible par les utilisateurs près de chez vous";
  var body = document.getElementById("mBody");
  body.innerHTML = "";
  var _annPhotos = [];

  // Catégorie
  var catSel = mkSelect("aCat","-- Catégorie *");
  Object.keys(ANN_CATS).forEach(function(c){ var o=document.createElement("option"); o.value=c; o.textContent=c; catSel.appendChild(o); });

  var sousSel = mkSelect("aSous","-- Sous-catégorie");
  catSel.addEventListener("change", function() {
    sousSel.innerHTML = "<option value=''>-- Sous-catégorie</option>";
    (ANN_CATS[catSel.value]||[]).forEach(function(s){ var o=document.createElement("option"); o.value=s; o.textContent=s; sousSel.appendChild(o); });
  });

  // Recherche rapide de métier (autocomplete sur 300+ métiers)
  var metierSearchWrap = mkMetierSearch(function(cat, sub) {
    catSel.value = cat;
    catSel.dispatchEvent(new Event("change"));
    setTimeout(function() { sousSel.value = sub; }, 50);
  });

  var dureeSel = mkSelect("aValidite","Durée de validité");
  ["7 jours","15 jours","1 mois","3 mois","6 mois"].forEach(function(d){ var o=document.createElement("option"); o.value=d; o.textContent=d; dureeSel.appendChild(o); });

  var paysSel4 = mkSelect("aPays","-- Pays *");
  fillPaysSelect(paysSel4, false);

  var villeSel4 = mkSelect("aVille","-- Ville *");
  paysSel4.addEventListener("change", function() {
    fillVillesByPays(paysSel4.value, villeSel4);
  });
  var villeAutreInp = mkInput("aVilleAutre","Préciser la ville (si non listée)");
  villeAutreInp.style.display = "none";
  villeSel4.addEventListener("change", function() {
    villeAutreInp.style.display = villeSel4.value === "__autre__" ? "block" : "none";
  });

  // Zone photos
  var photosSection = document.createElement("div");
  photosSection.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:4px";
  photosSection.innerHTML = "<div style='font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px'>Photos (max 5)</div>";
  var photosGrid = document.createElement("div");
  photosGrid.className = "ann-photos-grid";
  for (var i=0; i<5; i++) {
    (function(idx){
      var slot = document.createElement("div");
      slot.className = "ann-photo-slot";
      slot.innerHTML = "+";
      slot.addEventListener("click", function() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*";
        inp.addEventListener("change", function() {
          var file = inp.files[0]; if (!file) return;
          var reader = new FileReader();
          reader.onload = function(ev) {
            slot.innerHTML = "<img src='"+ev.target.result+"'><span>×</span>";
            _annPhotos[idx] = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
        inp.click();
      });
      photosGrid.appendChild(slot);
    })(i);
  }
  photosSection.appendChild(photosGrid);

  var submitBtn = mkBtn("aSubmit","📢 Publier l'annonce");
  submitBtn.style.background = "var(--orange)";

  appendAll(body, [
    mkInput("aTitre","Titre de l'annonce *"),
    metierSearchWrap, catSel, sousSel,
    mkTextarea("aDesc","Description détaillée *", 3),
    mkInput("aPrix","Prix (optionnel, en FCFA)","number"),
    paysSel4, villeSel4, villeAutreInp,
    mkInput("aQuartier","Quartier / Zone"),
    mkInput("aHoraires","Horaires de disponibilité"),
    mkInput("aTel","Téléphone *","tel"),
    mkInput("aWa","WhatsApp (si différent)","tel"),
    mkInput("aVideo","Lien vidéo (YouTube/TikTok, optionnel)"),
    dureeSel,
    photosSection,
    submitBtn
  ]);

  submitBtn.addEventListener("click", async function() {
    var titre = (document.getElementById("aTitre")||{}).value||"";
    var cat   = (document.getElementById("aCat")||{}).value||"";
    var desc  = (document.getElementById("aDesc")||{}).value||"";
    var villeVal = (document.getElementById("aVille")||{}).value||"";
    var ville = villeVal === "__autre__" ? ((document.getElementById("aVilleAutre")||{}).value||"") : villeVal;
    var tel   = (document.getElementById("aTel")||{}).value||"";
    var pays  = (document.getElementById("aPays")||{}).value||"";
    if (!titre||!cat||!desc||!ville||!tel) { showToast("Remplis les champs obligatoires (*)"); return; }
    submitBtn.disabled = true; submitBtn.textContent = "Publication...";
    try {
      var annData = {
        user_id: _currentUser.id,
        titre: titre,
        categorie: cat,
        sous_categorie: (document.getElementById("aSous")||{}).value||"",
        description: desc,
        prix: (document.getElementById("aPrix")||{}).value||null,
        pays: pays, ville: ville,
        quartier: (document.getElementById("aQuartier")||{}).value||"",
        horaires: (document.getElementById("aHoraires")||{}).value||"",
        telephone: tel,
        whatsapp: (document.getElementById("aWa")||{}).value||tel,
        video_url: (document.getElementById("aVideo")||{}).value||"",
        validite: (document.getElementById("aValidite")||{}).value||"1 mois",
        latitude: _userLat, longitude: _userLng,
        photo1: _annPhotos[0]||null, photo2: _annPhotos[1]||null,
        photo3: _annPhotos[2]||null, photo4: _annPhotos[3]||null,
        photo5: _annPhotos[4]||null
      };
      var res = await _supabase.from("annonces").insert(annData).select().single();
      if (res.error) throw res.error;
      showToast("✅ Annonce publiée ! Elle est maintenant visible sur LOKALI.");
      closeModal();
      _annonces.unshift(res.data);
      filterAnnonces();
      scheduleSmartNotif(cat, ville);
      trackUserInterest(cat, ville);
    } catch(e) {
      showToast("Erreur : " + e.message);
      submitBtn.disabled = false; submitBtn.textContent = "📢 Publier l'annonce";
    }
  });

  document.getElementById("overlay").classList.add("on");
}

// ── Notifications intelligentes ──────────────────────────
function showSmartReco() {
  var bar = document.getElementById("annRecoBar");
  var txt = document.getElementById("annRecoTxt");
  if (!bar||!txt) return;
  var parts = [];
  if (_userLat && _userLng) parts.push("votre <strong>position GPS en temps reel</strong>");
  var cats = JSON.parse(localStorage.getItem("lokali_ann_cats")||"[]");
  if (cats.length) parts.push("vos <strong>categories preferees</strong> (" + cats.slice(-2).join(", ") + ")");
  var villes = JSON.parse(localStorage.getItem("lokali_villes_hist")||"[]");
  if (villes.length) parts.push("vos recherches a <strong>" + villes[villes.length-1] + "</strong>");
  if (parts.length) {
    txt.innerHTML = "Recommandations personnalisees selon " + parts.join(", ");
    bar.style.display = "flex";
  } else if (_annonces.length) {
    txt.innerHTML = "Annonces triees par <strong>proximite geographique</strong> — activez la geolocalisation pour des resultats plus precis";
    bar.style.display = "flex";
  }
}

function trackUserInterest(cat, ville) {
  if (cat) {
    var cats = JSON.parse(localStorage.getItem("lokali_ann_cats")||"[]");
    if (cats.indexOf(cat) === -1) { cats.push(cat); if (cats.length>10) cats=cats.slice(-10); localStorage.setItem("lokali_ann_cats", JSON.stringify(cats)); }
  }
  if (ville) {
    var villes = JSON.parse(localStorage.getItem("lokali_villes_hist")||"[]");
    if (villes.indexOf(ville) === -1) { villes.push(ville); if (villes.length>5) villes=villes.slice(-5); localStorage.setItem("lokali_villes_hist", JSON.stringify(villes)); }
  }
}

function scheduleSmartNotif(cat, ville) {
  trackUserInterest(cat, ville);
  setTimeout(function() {
    var msgs = [
      "Un(e) " + cat + " vient de publier une annonce a " + ville + ".",
      "Nouvelle offre : " + cat + " disponible a " + ville + ".",
      "Prestataire disponible maintenant a " + ville + " — " + cat + "."
    ];
    var msg = msgs[Math.floor(Math.random()*msgs.length)];
    showSmartNotifMsg(msg);
    sendLocalPush("Nouvelle annonce LOKALI", msg, "/");
  }, 2000);
}

async function checkNewAnnoncesForUser() {
  if (!_supabase) return;
  var cats = JSON.parse(localStorage.getItem("lokali_ann_cats")||"[]");
  if (!cats.length) return;
  try {
    var since = localStorage.getItem("lokali_last_check") || new Date(Date.now()-3600000).toISOString();
    var res = await _supabase.from("annonces").select("id,titre,categorie,ville").in("categorie",cats).gt("created_at",since).limit(3);
    localStorage.setItem("lokali_last_check", new Date().toISOString());
    if (!res.data||!res.data.length) return;
    res.data.forEach(function(a) {
      var msg = "Nouvelle annonce : " + a.titre + " (" + (a.categorie||"") + " a " + (a.ville||"") + ")";
      setTimeout(function() { sendLocalPush("LOKALI — " + (a.categorie||"Annonce"), msg, "/"); showSmartNotifMsg(msg); }, 1500);
    });
  } catch(e) { console.warn("checkNewAnnonces:", e); }
}

function showSmartNotifMsg(msg) {
  var n = document.getElementById("smartNotif");
  var m = document.getElementById("smartNotifMsg");
  if (!n||!m) return;
  m.textContent = msg;
  n.classList.add("show");
  setTimeout(function() { n.classList.remove("show"); }, 8000);
}

document.addEventListener("DOMContentLoaded", function() {
    applySlides();
    startAuto();
  });


// ══ RECHERCHE MÉTIER — autocomplete sur 300+ métiers ══════════
function buildMetierIndex() {
  var idx = [];
  Object.keys(ANN_CATS).forEach(function(cat) {
    ANN_CATS[cat].forEach(function(sub) {
      idx.push({cat: cat, sub: sub, label: sub});
    });
  });
  return idx;
}
var _metierIndex = null;

function mkMetierSearch(onSelect) {
  if (!_metierIndex) _metierIndex = buildMetierIndex();
  var wrap = document.createElement("div");
  wrap.className = "metier-search-wrap";
  var input = document.createElement("input");
  input.className = "metier-search-input";
  input.placeholder = "🔍 Rechercher un métier (ex: plombier, coiffeur...)";
  input.autocomplete = "off";
  var results = document.createElement("div");
  results.className = "metier-search-results";
  wrap.appendChild(input);
  wrap.appendChild(results);

  input.addEventListener("input", function() {
    var q = input.value.trim().toLowerCase();
    results.innerHTML = "";
    if (q.length < 2) { results.classList.remove("show"); return; }
    var matches = _metierIndex.filter(function(m) {
      return m.label.toLowerCase().indexOf(q) !== -1 || m.cat.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 15);
    if (!matches.length) {
      results.innerHTML = "<div class='metier-search-item' style='color:var(--gray);cursor:default'>Aucun métier trouvé</div>";
      results.classList.add("show");
      return;
    }
    matches.forEach(function(m) {
      var item = document.createElement("div");
      item.className = "metier-search-item";
      item.innerHTML = m.label + "<small>" + m.cat + "</small>";
      item.addEventListener("click", function() {
        input.value = m.label;
        results.classList.remove("show");
        onSelect(m.cat, m.sub);
      });
      results.appendChild(item);
    });
    results.classList.add("show");
  });

  document.addEventListener("click", function(e) {
    if (!wrap.contains(e.target)) results.classList.remove("show");
  });

  wrap._input = input;
  return wrap;
}


// ══════════════════════════════════════════════════════════════
// LOT 2 — GESTION ANNONCES (édition/suppression/renouvellement)
//          + FAVORIS SYNCHRONISÉS SUPABASE + HISTORIQUE RECHERCHES
// ══════════════════════════════════════════════════════════════

// ── Mes annonces (espace prestataire) ────────────────────────
async function showMesAnnonces() {
  if (!_supabase || !_currentUser) { showToast("Connecte-toi d'abord"); return; }
  document.getElementById("mTitle").textContent = "📢 Mes annonces";
  document.getElementById("mSub").textContent = "Gérez vos publications";
  var body = document.getElementById("mBody");
  body.innerHTML = "<div style='text-align:center;padding:20px'><div class='loading'><div class='loading-dot'></div><div class='loading-dot'></div><div class='loading-dot'></div></div></div>";
  document.getElementById("overlay").classList.add("on");

  try {
    var res = await _supabase.from("annonces")
      .select("*")
      .eq("user_id", _currentUser.id)
      .order("created_at", {ascending: false});
    var mine = res.data || [];
    body.innerHTML = "";

    var addBtn = document.createElement("button");
    addBtn.className = "rsub";
    addBtn.style.cssText = "width:100%;background:var(--orange);margin-bottom:16px";
    addBtn.textContent = "＋ Publier une nouvelle annonce";
    addBtn.addEventListener("click", function() { closeModal(); setTimeout(openPublierAnnonce, 200); });
    body.appendChild(addBtn);

    if (!mine.length) {
      var empty = document.createElement("div");
      empty.style.cssText = "text-align:center;padding:40px 20px;color:var(--gray)";
      empty.innerHTML = "<div style='font-size:40px;margin-bottom:12px'>📋</div><p>Vous n'avez pas encore publié d'annonce.</p>";
      body.appendChild(empty);
      return;
    }

    mine.forEach(function(a) {
      var isExpired = checkAnnonceExpired(a);
      var card = document.createElement("div");
      card.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:10px;border:1px solid " + (isExpired ? "rgba(239,68,68,.3)" : "rgba(255,255,255,.07)");

      var statusBadge = isExpired
        ? "<span style='background:rgba(239,68,68,.15);color:#EF4444;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700'>EXPIRÉE</span>"
        : "<span style='background:rgba(16,185,129,.15);color:#10B981;border-radius:6px;padding:2px 8px;font-size:10px;font-weight:700'>ACTIVE</span>";

      card.innerHTML =
        "<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px'>"
        + "<div style='font-size:14px;font-weight:700'>" + (a.titre||"Sans titre") + "</div>"
        + statusBadge
        + "</div>"
        + "<div style='font-size:12px;color:var(--gray);margin-bottom:10px'>" + (a.categorie||"") + " · " + (a.ville||"") + " · publiée le " + new Date(a.created_at).toLocaleDateString("fr-FR") + "</div>";

      var btnRow = document.createElement("div");
      btnRow.style.cssText = "display:grid;grid-template-columns:repeat(4,1fr);gap:6px";

      var editBtn = document.createElement("button");
      editBtn.textContent = "✏️ Modifier";
      editBtn.style.cssText = "background:rgba(255,255,255,.08);color:var(--white);border:none;border-radius:8px;padding:8px 4px;font-size:11px;font-weight:600;cursor:pointer";
      editBtn.addEventListener("click", function() { editAnnonce(a.id); });

      var renewBtn = document.createElement("button");
      renewBtn.textContent = "🔄 Renouveler";
      renewBtn.style.cssText = "background:rgba(255,107,44,.15);color:var(--orange);border:none;border-radius:8px;padding:8px 4px;font-size:11px;font-weight:600;cursor:pointer";
      renewBtn.addEventListener("click", function() { renouvelerAnnonce(a.id); });

      var shareBtn = document.createElement("button");
      shareBtn.textContent = "📤 Partager";
      shareBtn.style.cssText = "background:rgba(37,211,102,.15);color:#25D366;border:none;border-radius:8px;padding:8px 4px;font-size:11px;font-weight:600;cursor:pointer";
      shareBtn.addEventListener("click", function() { partagerAnnonce(a.id); });

      var delBtn = document.createElement("button");
      delBtn.textContent = "🗑️ Suppr.";
      delBtn.style.cssText = "background:rgba(239,68,68,.15);color:#EF4444;border:none;border-radius:8px;padding:8px 4px;font-size:11px;font-weight:600;cursor:pointer";
      delBtn.addEventListener("click", function() { confirmDeleteAnnonce(a.id); });

      btnRow.appendChild(editBtn);
      btnRow.appendChild(renewBtn);
      btnRow.appendChild(shareBtn);
      btnRow.appendChild(delBtn);
      card.appendChild(btnRow);
      body.appendChild(card);
    });
  } catch(e) {
    body.innerHTML = "<p style='color:var(--gray);text-align:center;padding:20px'>Erreur de chargement.</p>";
    console.warn("showMesAnnonces:", e);
  }
}

// ── Vérifier si une annonce a expiré selon sa durée de validité ──
function checkAnnonceExpired(a) {
  if (!a.created_at || !a.validite) return false;
  var created = new Date(a.created_at);
  var days = {"7 jours":7,"15 jours":15,"1 mois":30,"3 mois":90,"6 mois":180}[a.validite] || 30;
  var expiry = new Date(created.getTime() + days*86400000);
  return new Date() > expiry;
}

// ── Modifier une annonce existante ───────────────────────────
async function editAnnonce(id) {
  if (!_supabase) return;
  var res = await _supabase.from("annonces").select("*").eq("id", id).single();
  var a = res.data;
  if (!a) { showToast("Annonce introuvable"); return; }

  document.getElementById("mTitle").textContent = "✏️ Modifier l'annonce";
  document.getElementById("mSub").textContent = a.titre || "";
  var body = document.getElementById("mBody");
  body.innerHTML = "";
  var _editPhotos = [a.photo1, a.photo2, a.photo3, a.photo4, a.photo5];

  var catSel = mkSelect("eCat","-- Catégorie *");
  Object.keys(ANN_CATS).forEach(function(c){ var o=document.createElement("option"); o.value=c; o.textContent=c; if(c===a.categorie) o.selected=true; catSel.appendChild(o); });

  var sousSel = mkSelect("eSous","-- Sous-catégorie");
  (ANN_CATS[a.categorie]||[]).forEach(function(s){ var o=document.createElement("option"); o.value=s; o.textContent=s; if(s===a.sous_categorie) o.selected=true; sousSel.appendChild(o); });
  catSel.addEventListener("change", function() {
    sousSel.innerHTML = "<option value=''>-- Sous-catégorie</option>";
    (ANN_CATS[catSel.value]||[]).forEach(function(s){ var o=document.createElement("option"); o.value=s; o.textContent=s; sousSel.appendChild(o); });
  });

  var titreInp = mkInput("eTitre","Titre de l'annonce *");
  titreInp.querySelector("input").value = a.titre || "";

  var descInp = mkTextarea("eDesc","Description détaillée *", 3);
  descInp.querySelector("textarea").value = a.description || "";

  var prixInp = mkInput("ePrix","Prix (optionnel)","number");
  prixInp.querySelector("input").value = a.prix || "";

  var villeInp = mkInput("eVille","Ville *");
  villeInp.querySelector("input").value = a.ville || "";

  var horInp = mkInput("eHoraires","Horaires de disponibilité");
  horInp.querySelector("input").value = a.horaires || "";

  var telInp = mkInput("eTel","Téléphone *","tel");
  telInp.querySelector("input").value = a.telephone || "";

  var saveBtn = mkBtn("eSave","💾 Enregistrer les modifications");
  saveBtn.style.background = "var(--orange)";

  appendAll(body, [titreInp, catSel, sousSel, descInp, prixInp, villeInp, horInp, telInp, saveBtn]);

  saveBtn.addEventListener("click", async function() {
    var updated = {
      titre: document.getElementById("eTitre").value,
      categorie: document.getElementById("eCat").value,
      sous_categorie: document.getElementById("eSous").value,
      description: document.getElementById("eDesc").value,
      prix: document.getElementById("ePrix").value || null,
      ville: document.getElementById("eVille").value,
      horaires: document.getElementById("eHoraires").value,
      telephone: document.getElementById("eTel").value
    };
    try {
      await _supabase.from("annonces").update(updated).eq("id", id);
      showToast("✅ Annonce mise à jour !");
      closeModal();
      setTimeout(showMesAnnonces, 200);
    } catch(e) { showToast("Erreur : " + e.message); }
  });

  document.getElementById("overlay").classList.add("on");
}

// ── Renouveler une annonce (réinitialise la date de création) ──
async function renouvelerAnnonce(id) {
  if (!_supabase) return;
  try {
    await _supabase.from("annonces").update({created_at: new Date().toISOString()}).eq("id", id);
    showToast("🔄 Annonce renouvelée ! Elle est de nouveau visible en priorité.");
    setTimeout(showMesAnnonces, 200);
  } catch(e) { showToast("Erreur : " + e.message); }
}

// ── Partager une annonce ─────────────────────────────────────
function partagerAnnonce(id) {
  var a = _annonces.find(function(x){ return x.id == id; });
  var titre = a ? a.titre : "une offre";
  var url = window.location.origin + window.location.pathname + "?annonce=" + id;
  var text = "Découvrez \"" + titre + "\" sur LOKALI : " + url;
  if (navigator.share) {
    navigator.share({title: "LOKALI", text: text, url: url}).catch(function(){});
  } else {
    window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
  }
}

// ── Supprimer une annonce (avec confirmation) ────────────────
function confirmDeleteAnnonce(id) {
  document.getElementById("mTitle").textContent = "⚠️ Confirmer la suppression";
  document.getElementById("mSub").textContent = "Cette action est irréversible";
  var body = document.getElementById("mBody");
  body.innerHTML = "<p style='font-size:14px;color:var(--gray);margin-bottom:20px;text-align:center'>Voulez-vous vraiment supprimer cette annonce ? Cette action ne peut pas être annulée.</p>";

  var btns = document.createElement("div");
  btns.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:10px";

  var cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Annuler";
  cancelBtn.style.cssText = "background:rgba(255,255,255,.08);color:var(--white);border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer";
  cancelBtn.addEventListener("click", function() { closeModal(); setTimeout(showMesAnnonces, 200); });

  var delBtn = document.createElement("button");
  delBtn.textContent = "🗑️ Supprimer";
  delBtn.style.cssText = "background:#EF4444;color:#fff;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer";
  delBtn.addEventListener("click", async function() {
    try {
      await _supabase.from("annonces").delete().eq("id", id);
      showToast("✅ Annonce supprimée");
      closeModal();
      _annonces = _annonces.filter(function(a){ return a.id != id; });
    } catch(e) { showToast("Erreur : " + e.message); }
  });

  btns.appendChild(cancelBtn);
  btns.appendChild(delBtn);
  body.appendChild(btns);
  document.getElementById("overlay").classList.add("on");
}

// ── FAVORIS ANNONCES SYNCHRONISÉS SUPABASE ───────────────────
// Migre les favoris locaux vers Supabase au login, puis utilise Supabase comme source de vérité

async function syncAnnFavsToSupabase() {
  if (!_supabase || !_currentUser) return;
  var localFavs = JSON.parse(localStorage.getItem("lokali_ann_favs") || "[]");
  if (!localFavs.length) return;
  try {
    for (var i = 0; i < localFavs.length; i++) {
      await _supabase.from("annonces_favoris").upsert({
        user_id: _currentUser.id,
        annonce_id: localFavs[i]
      }, {onConflict: "user_id,annonce_id"});
    }
    console.log("[LOKALI] Favoris annonces synchronisés:", localFavs.length);
  } catch(e) { console.warn("syncAnnFavsToSupabase:", e); }
}

async function loadAnnFavsFromSupabase() {
  if (!_supabase || !_currentUser) return;
  try {
    var res = await _supabase.from("annonces_favoris").select("annonce_id").eq("user_id", _currentUser.id);
    if (res.data) {
      var ids = res.data.map(function(r){ return String(r.annonce_id); });
      _annFavs = ids;
      localStorage.setItem("lokali_ann_favs", JSON.stringify(ids));
    }
  } catch(e) { console.warn("loadAnnFavsFromSupabase:", e); }
}

async function toggleAnnFavSupabase(annId) {
  var sid = String(annId);
  var idx = _annFavs.indexOf(sid);
  if (idx === -1) {
    _annFavs.push(sid);
    if (_supabase && _currentUser) {
      try { await _supabase.from("annonces_favoris").insert({user_id: _currentUser.id, annonce_id: annId}); }
      catch(e) { console.warn(e); }
    }
  } else {
    _annFavs.splice(idx, 1);
    if (_supabase && _currentUser) {
      try { await _supabase.from("annonces_favoris").delete().eq("user_id", _currentUser.id).eq("annonce_id", annId); }
      catch(e) { console.warn(e); }
    }
  }
  localStorage.setItem("lokali_ann_favs", JSON.stringify(_annFavs));
}

// ── Afficher mes annonces favorites ──────────────────────────
async function showMesAnnoncesFavorites() {
  document.getElementById("mTitle").textContent = "❤️ Annonces favorites";
  document.getElementById("mSub").textContent = _annFavs.length + " annonce(s) sauvegardée(s)";
  var body = document.getElementById("mBody");
  body.innerHTML = "";
  if (!_annFavs.length) {
    body.innerHTML = "<p style='color:var(--gray);text-align:center;padding:30px 0'>Aucune annonce favorite pour le moment.</p>";
    document.getElementById("overlay").classList.add("on");
    return;
  }
  var favAnnonces = _annonces.filter(function(a){ return _annFavs.indexOf(String(a.id)) !== -1; });
  if (!favAnnonces.length && _supabase) {
    try {
      var res = await _supabase.from("annonces").select("*").in("id", _annFavs);
      favAnnonces = res.data || [];
    } catch(e) { console.warn(e); }
  }
  favAnnonces.forEach(function(a) {
    var card = document.createElement("div");
    card.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:10px;cursor:pointer";
    card.innerHTML = "<div style='font-weight:700;font-size:14px;margin-bottom:4px'>" + (a.titre||"") + "</div>"
      + "<div style='font-size:12px;color:var(--gray)'>" + (a.categorie||"") + " · " + (a.ville||"") + "</div>";
    card.addEventListener("click", function() { closeModal(); setTimeout(function(){ openAnnDetail(a.id); }, 200); });
    body.appendChild(card);
  });
  document.getElementById("overlay").classList.add("on");
}

// ── HISTORIQUE DE RECHERCHES (synchronisé + affiché) ─────────
function trackSearch(query, type) {
  if (!query || query.trim().length < 2) return;
  var hist = JSON.parse(localStorage.getItem("lokali_search_hist") || "[]");
  var entry = {q: query.trim(), type: type || "general", t: Date.now()};
  hist = hist.filter(function(h){ return h.q.toLowerCase() !== entry.q.toLowerCase(); });
  hist.unshift(entry);
  if (hist.length > 20) hist = hist.slice(0, 20);
  localStorage.setItem("lokali_search_hist", JSON.stringify(hist));

  if (_supabase && _currentUser) {
    _supabase.from("recherches_historique").insert({
      user_id: _currentUser.id, query: entry.q, type: entry.type
    }).then(function(){}).catch(function(){});
  }
}

function showHistoriqueRecherches() {
  var hist = JSON.parse(localStorage.getItem("lokali_search_hist") || "[]");
  document.getElementById("mTitle").textContent = "🕐 Historique de recherches";
  document.getElementById("mSub").textContent = hist.length + " recherche(s) récente(s)";
  var body = document.getElementById("mBody");
  body.innerHTML = "";
  if (!hist.length) {
    body.innerHTML = "<p style='color:var(--gray);text-align:center;padding:30px 0'>Aucune recherche enregistrée.</p>";
  } else {
    var clearBtn = document.createElement("button");
    clearBtn.textContent = "🗑️ Effacer tout l'historique";
    clearBtn.style.cssText = "width:100%;background:rgba(239,68,68,.1);color:#EF4444;border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:10px;font-size:13px;cursor:pointer;margin-bottom:14px";
    clearBtn.addEventListener("click", function() {
      localStorage.setItem("lokali_search_hist", "[]");
      showHistoriqueRecherches();
    });
    body.appendChild(clearBtn);

    hist.forEach(function(h) {
      var item = document.createElement("div");
      item.style.cssText = "display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--dark3);border-radius:10px;margin-bottom:8px;cursor:pointer";
      var d = new Date(h.t);
      item.innerHTML = "<div><div style='font-size:13px;font-weight:600'>🔍 " + h.q + "</div>"
        + "<div style='font-size:11px;color:var(--gray)'>" + d.toLocaleDateString("fr-FR") + "</div></div>";
      item.addEventListener("click", function() {
        closeModal();
        if (h.type === "annonce") {
          setTimeout(function() {
            showAnnoncesPage();
            setTimeout(function() {
              var inp = document.getElementById("annSearch");
              if (inp) { inp.value = h.q; filterAnnonces(); }
            }, 300);
          }, 200);
        } else {
          setTimeout(function() { qs(h.q); }, 200);
        }
      });
      body.appendChild(item);
    });
  }
  document.getElementById("overlay").classList.add("on");
}


// ── HELPERS PHOTOS — profil + galerie prestataire ────────────
function mkPhotoUploadSingle(id, label) {
  var wrap = document.createElement("div");
  wrap.style.cssText = "margin-bottom:14px";
  var lbl = document.createElement("div");
  lbl.style.cssText = "font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px";
  lbl.textContent = label;
  var slot = document.createElement("div");
  slot.id = id + "_slot";
  slot.style.cssText = "width:90px;height:90px;border-radius:50%;background:var(--dark3);border:2px dashed rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;overflow:hidden;position:relative;margin:0 auto";
  slot.innerHTML = "📷";
  slot.dataset.value = "";
  slot.addEventListener("click", function() {
    var inp = document.createElement("input");
    inp.type = "file"; inp.accept = "image/*";
    inp.addEventListener("change", function() {
      var file = inp.files[0]; if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        slot.innerHTML = "<img src='" + ev.target.result + "' style='width:100%;height:100%;object-fit:cover'>";
        slot.dataset.value = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
    inp.click();
  });
  wrap.appendChild(lbl);
  wrap.appendChild(slot);
  wrap._slot = slot;
  return wrap;
}

function mkPhotoGallery(id, label, maxPhotos) {
  maxPhotos = maxPhotos || 6;
  var wrap = document.createElement("div");
  wrap.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:14px";
  var lbl = document.createElement("div");
  lbl.style.cssText = "font-size:12px;font-weight:700;color:var(--orange);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px";
  lbl.textContent = label;
  wrap.appendChild(lbl);
  var grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(3,1fr);gap:8px";
  for (var i = 0; i < maxPhotos; i++) {
    (function(idx) {
      var slot = document.createElement("div");
      slot.id = id + "_slot" + idx;
      slot.dataset.value = "";
      slot.style.cssText = "aspect-ratio:1;background:var(--dark2);border:1.5px dashed rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;position:relative;overflow:hidden";
      slot.innerHTML = "+";
      slot.addEventListener("click", function() {
        var inp = document.createElement("input");
        inp.type = "file"; inp.accept = "image/*";
        inp.addEventListener("change", function() {
          var file = inp.files[0]; if (!file) return;
          var reader = new FileReader();
          reader.onload = function(ev) {
            slot.innerHTML = "<img src='" + ev.target.result + "' style='position:absolute;inset:0;width:100%;height:100%;object-fit:cover'>";
            slot.dataset.value = ev.target.result;
          };
          reader.readAsDataURL(file);
        });
        inp.click();
      });
      grid.appendChild(slot);
    })(i);
  }
  wrap.appendChild(grid);
  wrap.dataset.galleryId = id;
  wrap.dataset.maxPhotos = maxPhotos;
  return wrap;
}

function getGalleryValues(id, maxPhotos) {
  var vals = [];
  for (var i = 0; i < (maxPhotos||6); i++) {
    var slot = document.getElementById(id + "_slot" + i);
    if (slot && slot.dataset.value) vals.push(slot.dataset.value);
  }
  return vals;
}


// ── Aperçu annonces sur la page d'accueil ────────────────────
async function loadHomeAnnoncesPreview() {
  var container = document.getElementById("homeAnnoncesPreview");
  if (!container || !_supabase) return;
  try {
    var res = await _supabase.from("annonces")
      .select("*")
      .order("created_at", {ascending: false})
      .limit(3);
    var list = res.data || [];
    if (!list.length) {
      container.innerHTML = "<div style='text-align:center;padding:30px;color:var(--gray);grid-column:1/-1'>Aucune annonce pour le moment. Soyez le premier à publier !</div>";
      return;
    }
    container.innerHTML = "";
    list.forEach(function(a) {
      var card = document.createElement("div");
      card.style.cssText = "background:var(--dark2);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px;cursor:pointer;transition:all .2s";
      card.addEventListener("mouseenter", function(){ card.style.borderColor="rgba(255,107,44,.4)"; });
      card.addEventListener("mouseleave", function(){ card.style.borderColor="rgba(255,255,255,.07)"; });
      card.innerHTML =
        "<div style='font-size:10px;color:var(--orange);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px'>" + (a.categorie||"Service") + "</div>"
        + "<div style='font-size:15px;font-weight:800;margin-bottom:6px'>" + (a.titre||"Sans titre") + "</div>"
        + "<div style='font-size:12px;color:var(--gray);margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden'>" + (a.description||"") + "</div>"
        + "<div style='display:flex;justify-content:space-between;align-items:center'>"
        + "<span style='font-size:13px;font-weight:700;color:var(--orange)'>" + (a.prix ? Number(a.prix).toLocaleString("fr-FR")+" FCFA" : "Prix sur demande") + "</span>"
        + "<span style='font-size:11px;color:var(--gray)'>📍 " + (a.ville||"") + "</span>"
        + "</div>";
      card.addEventListener("click", function() { showAnnoncesPage(); setTimeout(function(){ openAnnDetail(a.id); }, 300); });
      container.appendChild(card);
    });
  } catch(e) { console.warn("loadHomeAnnoncesPreview:", e); }
}


// ══ VILLES PRINCIPALES PAR PAYS — sélection intelligente ══════
var VILLES_PAR_PAYS = {
  "Côte d'Ivoire": ["Abidjan","Bouaké","Yamoussoukro","Daloa","San-Pédro","Korhogo","Man","Divo","Gagnoa","Anyama","Abengourou","Agboville","Grand-Bassam","Dabou","Bondoukou","Séguéla","Soubré","Issia","Bingerville","Odienné"],
  "Sénégal": ["Dakar","Thiès","Kaolack","Saint-Louis","Ziguinchor","Mbour","Rufisque","Touba","Diourbel","Louga","Tambacounda","Kolda","Fatick","Kaffrine","Matam","Podor","Richard-Toll","Bambey","Joal-Fadiout","Tivaouane"],
  "Mali": ["Bamako","Sikasso","Mopti","Koutiala","Ségou","Kayes","Gao","San","Kati","Tombouctou","Markala","Bougouni","Koulikoro","Niono","Kita","Banamba","Bandiagara","Bafoulabé","Dioïla","Yorosso"],
  "Burkina Faso": ["Ouagadougou","Bobo-Dioulasso","Koudougou","Banfora","Ouahigouya","Pouytenga","Kaya","Tenkodogo","Fada N'Gourma","Dédougou","Houndé","Garango","Réo","Manga","Gourcy","Diapaga","Dori","Boulsa","Sebba","Diébougou"],
  "Niger": ["Niamey","Zinder","Maradi","Agadez","Tahoua","Dosso","Birni N'Konni","Tillabéri","Diffa","Gaya","Madaoua","Tessaoua","Mirriah","Magaria","Matamey","Dogondoutchi","Filingué","Loga","Abalak","Ayorou"],
  "Bénin": ["Cotonou","Porto-Novo","Parakou","Djougou","Bohicon","Kandi","Abomey","Natitingou","Lokossa","Ouidah","Abomey-Calavi","Sakété","Pobè","Savalou","Aplahoué","Dassa-Zoumè","Kérou","Tanguiéta","Comè","Nikki"],
  "Togo": ["Lomé","Sokodé","Kara","Kpalimé","Atakpamé","Bassar","Tsévié","Aného","Mango","Dapaong","Notsé","Vogan","Sotouboua","Badou","Niamtougou","Bafilo","Tabligbo","Tchamba","Cinkassé","Anié"],
  "Guinée": ["Conakry","Nzérékoré","Kankan","Kindia","Labé","Mamou","Boké","Faranah","Kissidougou","Siguiri","Guéckédou","Macenta","Dabola","Dinguiraye","Coyah","Forécariah","Pita","Télimélé","Kérouané","Mandiana"],
  "Cameroun": ["Douala","Yaoundé","Garoua","Bamenda","Maroua","Bafoussam","Ngaoundéré","Bertoua","Loum","Kumba","Nkongsamba","Edéa","Kribi","Limbé","Buea","Dschang","Foumban","Mbouda","Ebolowa","Sangmélima"],
  "Gabon": ["Libreville","Port-Gentil","Franceville","Oyem","Moanda","Mouila","Lambaréné","Tchibanga","Koulamoutou","Makokou","Bitam","Gamba","Mitzic","Ndjolé","Lastoursville","Mayumba","Okondja","Booué","Mbigou","Fougamou"],
  "Mauritanie": ["Nouakchott","Nouadhibou","Kiffa","Rosso","Kaédi","Zouérat","Atar","Néma","Sélibaby","Boutilimit","Aleg","Akjoujt","Tidjikja","Aïoun","Bogué","Chinguetti","Boghé","Tékane","Magta-Lahjar","Timbedra"],
  "RD Congo": ["Kinshasa","Lubumbashi","Mbuji-Mayi","Kisangani","Kananga","Bukavu","Kolwezi","Likasi","Goma","Tshikapa","Uvira","Mbandaka","Matadi","Kikwit","Bandundu","Butembo","Beni","Kalemie","Kindu","Mwene-Ditu"],
  "Congo": ["Brazzaville","Pointe-Noire","Dolisie","Nkayi","Ouesso","Madingou","Owando","Sibiti","Mossendjo","Kinkala","Impfondo","Gamboma","Loubomo","Djambala","Ewo","Mossaka","Makoua","Kayes","Kakamoeka","Loutété"],
  "Tchad": ["N'Djaména","Moundou","Sarh","Abéché","Kelo","Koumra","Pala","Am Timan","Bongor","Mongo","Doba","Ati","Oum Hadjer","Bol","Faya-Largeau","Massakory","Laï","Goz Beïda","Biltine","Mao"],
  "Madagascar": ["Antananarivo","Toamasina","Antsirabe","Fianarantsoa","Mahajanga","Toliara","Antsiranana","Ambovombe","Morondava","Manakara","Ambositra","Sambava","Ihosy","Antalaha","Maevatanana","Marovoay","Moramanga","Tôlanaro","Farafangana","Vohémar"],
  "Maroc": ["Casablanca","Rabat","Fès","Marrakech","Tanger","Agadir","Meknès","Oujda","Kénitra","Tétouan","Salé","Nador","El Jadida","Béni Mellal","Khouribga","Settat","Larache","Khémisset","Guelmim","Berrechid"],
  "Algérie": ["Alger","Oran","Constantine","Annaba","Blida","Batna","Djelfa","Sétif","Sidi Bel Abbès","Biskra","Tébessa","El Oued","Skikda","Tiaret","Béjaïa","Tlemcen","Ouargla","Béchar","Mostaganem","Bordj Bou Arréridj"],
  "Tunisie": ["Tunis","Sfax","Sousse","Kairouan","Bizerte","Gabès","Ariana","Gafsa","Monastir","Nabeul","Médenine","Béja","Jendouba","Kasserine","Tataouine","Tozeur","Kébili","Siliana","Zaghouan","Manouba"],
  "France": ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Montpellier","Bordeaux","Lille","Rennes","Reims","Toulon","Saint-Étienne","Le Havre","Grenoble","Dijon","Angers","Nîmes","Villeurbanne"],
  "Belgique": ["Bruxelles","Anvers","Gand","Charleroi","Liège","Bruges","Namur","Louvain","Mons","Aalst","Malines","La Louvière","Courtrai","Hasselt","Saint-Nicolas","Tournai","Genk","Seraing","Roulers","Verviers"],
  "Canada": ["Montréal","Québec","Gatineau","Sherbrooke","Trois-Rivières","Saguenay","Lévis","Terrebonne","Saint-Jean-sur-Richelieu","Repentigny","Toronto","Ottawa","Vancouver","Calgary","Edmonton"],
  "Suisse": ["Genève","Lausanne","Fribourg","Sion","Neuchâtel","Bienne","La Chaux-de-Fonds","Yverdon-les-Bains","Montreux","Vevey","Zurich","Bâle","Berne","Lugano","Winterthour"],
  "Haïti": ["Port-au-Prince","Cap-Haïtien","Gonaïves","Les Cayes","Jacmel","Jérémie","Saint-Marc","Port-de-Paix","Hinche","Léogâne","Petit-Goâve","Croix-des-Bouquets","Mirebalais","Fort-Liberté","Ouanaminthe","Miragoâne","Anse-à-Veau","Aquin","Pétion-Ville","Delmas"],
  "Rwanda": ["Kigali","Butare","Gitarama","Ruhengeri","Gisenyi","Byumba","Cyangugu","Kibungo","Kibuye","Gikongoro","Rwamagana","Nyanza","Muhanga","Huye","Musanze","Rubavu","Karongi","Nyagatare","Kayonza","Rusizi"],
  "Égypte": ["Le Caire","Alexandrie","Gizeh","Shubra El Kheima","Port-Saïd","Suez","Louxor","Assiout","Mansourah","Tanta","Assouan","Faiyoum","Zagazig","Ismaïlia","Damiette","Damanhour","Minya","Beni Suef","Hurghada","Qena"]
};

function fillVillesByPays(paysName, villeSel) {
  if (!villeSel) return;
  villeSel.innerHTML = "<option value=''>-- Choisir la ville --</option>";
  var villes = VILLES_PAR_PAYS[paysName];
  if (villes && villes.length) {
    villes.forEach(function(v) {
      var o = document.createElement("option");
      o.value = v; o.textContent = v;
      villeSel.appendChild(o);
    });
    // Option pour ville non listée
    var oAutre = document.createElement("option");
    oAutre.value = "__autre__"; oAutre.textContent = "Autre ville (préciser)";
    villeSel.appendChild(oAutre);
  } else {
    // Pays sans liste prédéfinie : champ libre
    villeSel.innerHTML = "<option value=''>Saisir manuellement ci-dessous</option>";
  }
}


// ── Afficher/masquer mot de passe ─────────────────────────────
function togglePwdVisibility(id, btn) {
  var inp = document.getElementById(id);
  if (!inp) return;
  if (inp.type === "password") {
    inp.type = "text";
    btn.style.color = "var(--orange)";
  } else {
    inp.type = "password";
    btn.style.color = "";
  }
}


// ══════════════════════════════════════════════════════════════
// AFFICHAGE AUTOMATIQUE DES SPONSORS/PARTENAIRES VALIDÉS
// Se charge dès que l\'admin passe le statut à "valide" en base.
// Aucune action manuelle nécessaire après validation.
// ══════════════════════════════════════════════════════════════

async function loadSponsorsPartenaires() {
  if (!_supabase) return;
  try {
    var now = new Date().toISOString();
    var res = await _supabase.from("sponsors_partenaires")
      .select("*")
      .eq("statut", "valide")
      .gte("date_fin", now)
      .order("created_at", {ascending: false});
    var all = res.data || [];

    var sponsors = all.filter(function(s){ return s.type === "sponsor"; });
    var partners = all.filter(function(s){ return s.type === "partner"; });

    renderSponsorBanners(sponsors);
    renderSponsorStrip(sponsors);
    renderPartnerStrip(partners);
  } catch(e) { console.warn("loadSponsorsPartenaires:", e); }
}

// ── Bannières premium (Platine/Or) — grand format, rotation ──
function renderSponsorBanners(sponsors) {
  var zone = document.getElementById("sponsorBannerZone");
  if (!zone) return;
  var premium = sponsors.filter(function(s){ return s.pack === "Platine" || s.pack === "Or"; });
  if (!premium.length) { zone.innerHTML = ""; return; }
  zone.innerHTML = "";
  premium.forEach(function(s) {
    var banner = document.createElement("div");
    banner.className = "sponsor-banner";
    banner.innerHTML = "<div class='sponsor-banner-badge'>" + (s.pack === "Platine" ? "Sponsor Officiel" : "Sponsor") + "</div>"
      + "<img src='" + s.logo + "' alt='" + (s.entreprise||"Sponsor") + "'>";
    banner.addEventListener("click", function() {
      if (s.lien) {
        var url = s.lien.indexOf("http") === 0 ? s.lien : "https://" + s.lien;
        window.open(url, "_blank");
      }
    });
    zone.appendChild(banner);
  });
}

// ── Bande défilante logos (tous packs sponsors) ──────────────
function renderSponsorStrip(sponsors) {
  var stripZone = document.getElementById("sponsorStripZone");
  var track = document.getElementById("sponsorTrack");
  if (!stripZone || !track) return;
  if (!sponsors.length) { stripZone.style.display = "none"; return; }

  track.innerHTML = "";
  // Doubler la liste pour un défilement infini fluide
  var doubled = sponsors.concat(sponsors);
  doubled.forEach(function(s) {
    var item = document.createElement("div");
    item.className = "sponsor-item " + (s.pack||"").toLowerCase();
    var img = document.createElement("img");
    img.src = s.logo;
    img.alt = s.entreprise || "Sponsor";
    item.appendChild(img);
    item.addEventListener("click", function() {
      if (s.lien) {
        var url = s.lien.indexOf("http") === 0 ? s.lien : "https://" + s.lien;
        window.open(url, "_blank");
      }
    });
    track.appendChild(item);
  });
  stripZone.style.display = "block";
}

// ── Logos partenaires dans le footer ──────────────────────────
function renderPartnerStrip(partners) {
  var zone = document.getElementById("partnerStripZone");
  if (!zone) return;
  if (!partners.length) { zone.style.display = "none"; return; }
  zone.innerHTML = "";
  partners.forEach(function(p) {
    var img = document.createElement("img");
    img.src = p.logo;
    img.alt = p.entreprise || "Partenaire";
    img.addEventListener("click", function() {
      if (p.lien) {
        var url = p.lien.indexOf("http") === 0 ? p.lien : "https://" + p.lien;
        window.open(url, "_blank");
      }
    });
    zone.appendChild(img);
  });
  zone.style.display = "flex";
}

// ── Sponsor latéral pour la page Annonces (rotation aléatoire) ──
async function loadSponsorSidebar() {
  if (!_supabase) return null;
  try {
    var now = new Date().toISOString();
    var res = await _supabase.from("sponsors_partenaires")
      .select("*")
      .eq("type", "sponsor")
      .eq("statut", "valide")
      .gte("date_fin", now);
    var list = res.data || [];
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  } catch(e) { return null; }
}


// ── Filtre Quartier en cascade depuis Ville (style CoinAfrique) ──
function updateQuartierFilter(ville) {
  var sel = document.getElementById("annFQuartier");
  if (!sel) return;
  var currentVal = sel.value;
  var quartiers = {};
  _annonces.forEach(function(a) {
    if (a.quartier && (!ville || a.ville === ville)) quartiers[a.quartier] = 1;
  });
  var newOptions = Object.keys(quartiers).sort();
  // Ne reconstruire que si la liste a changé (évite de perdre le focus utilisateur)
  var existing = Array.from(sel.options).slice(1).map(function(o){ return o.value; });
  if (JSON.stringify(existing) === JSON.stringify(newOptions)) return;
  sel.innerHTML = "<option value=''>Tous quartiers</option>";
  newOptions.forEach(function(q) {
    var o = document.createElement("option"); o.value = q; o.textContent = q;
    sel.appendChild(o);
  });
  if (newOptions.indexOf(currentVal) !== -1) sel.value = currentVal;
}


// ══════════════════════════════════════════════════════════════
// LOKALI EXPRESS — Demande instantanée temps réel
// Diffusion aux prestataires proches → acceptation → suivi GPS
// ══════════════════════════════════════════════════════════════

var _myPrestaProfile = null;
var _expressState = {
  currentRequest: null,    // demande active (côté client)
  candidates: [],          // prestataires ayant accepté
  trackingChannel: null,   // canal Supabase Realtime pour le suivi position
  isProviderOnline: false, // statut "disponible pour Express" côté prestataire
  incomingRequest: null,   // demande reçue (côté prestataire)
  positionWatchId: null,   // pour navigator.geolocation.watchPosition
  myActiveCourse: null     // course en cours (côté prestataire qui a accepté)
};

// ── Ouvrir la recherche Express (côté client) ─────────────────
function openExpressSearch() {
  if (!_currentUser) { showToast("Connecte-toi pour utiliser LOKALI Express"); openModal("login"); return; }
  if (!_userLat || !_userLng) { showToast("Active ta position GPS pour utiliser Express"); return; }

  document.getElementById("mTitle").textContent = "⚡ LOKALI Express";
  document.getElementById("mSub").textContent = "Trouve un prestataire disponible maintenant";
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  var catSel = mkSelect("expCat", "-- Quel service recherches-tu ? *");
  Object.keys(ANN_CATS).forEach(function(c){ var o=document.createElement("option"); o.value=c; o.textContent=c; catSel.appendChild(o); });

  var descInp = mkTextarea("expDesc", "Décris brièvement ton besoin (ex: fuite robinet cuisine)", 2);

  var launchBtn = mkBtn("expLaunch", "🔍 Lancer la recherche (rayon 50 km)");
  launchBtn.style.background = "var(--orange)";

  appendAll(body, [catSel, descInp, launchBtn]);
  document.getElementById("overlay").classList.add("on");

  launchBtn.addEventListener("click", function() {
    var cat = document.getElementById("expCat").value;
    var desc = document.getElementById("expDesc").value;
    if (!cat) { showToast("Choisis un service"); return; }
    launchExpressRequest(cat, desc);
  });
}

// ── Lancer la demande : créer en base + diffuser via Realtime ──
async function launchExpressRequest(categorie, description) {
  if (!_supabase) { showToast("Connexion indisponible"); return; }
  showExpressSearchingScreen(categorie);

  try {
    var res = await _supabase.from("express_requests").insert({
      client_id: _currentUser.id,
      client_nom: (_currentUser.user_metadata && _currentUser.user_metadata.nom) || _currentUser.email,
      client_tel: _currentUser.phone || "",
      categorie: categorie,
      description: description || "",
      latitude: _userLat,
      longitude: _userLng,
      statut: "recherche",
      rayon_km: 50
    }).select().single();

    if (res.error) { showToast("Erreur : " + res.error.message); return; }
    _expressState.currentRequest = res.data;

    // Écouter en temps réel les réponses des prestataires (table express_responses)
    listenForExpressResponses(res.data.id);

    // Timeout de sécurité : arrêter la recherche après 90s si personne ne répond
    setTimeout(function() {
      if (_expressState.currentRequest && _expressState.currentRequest.id === res.data.id && !_expressState.candidates.length) {
        showExpressNoResultsScreen();
      }
    }, 90000);

  } catch(e) { showToast("Erreur : " + e.message); }
}

// ── Écran "recherche en cours" avec radar animé ────────────────
function showExpressSearchingScreen(categorie) {
  document.getElementById("mTitle").textContent = "⚡ Recherche en cours...";
  document.getElementById("mSub").textContent = categorie;
  var body = document.getElementById("mBody");
  body.innerHTML =
    "<div class='express-modal-body'>"
    + "<div class='express-radar'>"
    + "<div class='express-radar-circle'></div><div class='express-radar-circle'></div><div class='express-radar-circle'></div>"
    + "<div class='express-radar-center'>" + getCatEmoji(categorie) + "</div>"
    + "</div>"
    + "<div class='express-status-txt'>Recherche de prestataires disponibles...</div>"
    + "<div class='express-sub-txt'>Dans un rayon de 50 km autour de toi</div>"
    + "<div id='expressCandidatesList'></div>"
    + "</div>";

  var cancelBtn = document.createElement("button");
  cancelBtn.style.cssText = "width:100%;background:rgba(239,68,68,.1);color:#EF4444;border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;margin-top:14px";
  cancelBtn.textContent = "Annuler la recherche";
  cancelBtn.addEventListener("click", cancelExpressRequest);
  body.appendChild(cancelBtn);
}

// ── Écouter les réponses des prestataires en temps réel ────────
function listenForExpressResponses(requestId) {
  if (!_supabase) return;
  _expressState.candidates = [];

  var channel = _supabase.channel("express_request_" + requestId)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "express_responses",
      filter: "request_id=eq." + requestId
    }, function(payload) {
      handleNewExpressCandidate(payload.new);
    })
    .subscribe();

  _expressState.responseChannel = channel;
}

// ── Un prestataire a accepté : l'ajouter à la liste de candidats ──
async function handleNewExpressCandidate(response) {
  if (response.statut !== "accepte") return;

  try {
    var presRes = await _supabase.from("prestataires").select("*").eq("user_id", response.prestataire_id).single();
    var presta = presRes.data;
    if (!presta) return;

    var dist = calcDist(_userLat, _userLng, response.latitude, response.longitude);
    var candidate = {
      response_id: response.id,
      prestataire_id: response.prestataire_id,
      nom: presta.nom,
      photo: presta.photo_profil,
      telephone: presta.telephone,
      whatsapp: presta.whatsapp,
      dist: dist,
      latitude: response.latitude,
      longitude: response.longitude
    };

    _expressState.candidates.push(candidate);
    _expressState.candidates.sort(function(a,b){ return a.dist - b.dist; });
    renderExpressCandidates();
  } catch(e) { console.warn("handleNewExpressCandidate:", e); }
}

// ── Afficher la liste des prestataires qui ont accepté ─────────
function renderExpressCandidates() {
  var list = document.getElementById("expressCandidatesList");
  if (!list) return;
  if (!_expressState.candidates.length) { list.innerHTML = ""; return; }

  var statusTxt = document.querySelector(".express-status-txt");
  if (statusTxt) statusTxt.textContent = _expressState.candidates.length + " prestataire(s) ont répondu !";

  list.innerHTML = "<div style='margin-top:14px'></div>";
  var wrap = list.querySelector("div");
  _expressState.candidates.forEach(function(c) {
    var item = document.createElement("div");
    item.className = "express-candidate";
    item.innerHTML =
      "<div class='express-candidate-avatar'>" + (c.photo ? "<img src='"+c.photo+"'>" : "👤") + "</div>"
      + "<div class='express-candidate-info'>"
      + "<div class='express-candidate-name'>" + c.nom + "</div>"
      + "<div class='express-candidate-meta'>" + c.dist.toFixed(1) + " km de toi</div>"
      + "</div>"
      + "<div class='express-candidate-dist'>" + c.dist.toFixed(1) + " km</div>";
    var chooseBtn = document.createElement("button");
    chooseBtn.className = "express-choose-btn";
    chooseBtn.textContent = "Choisir";
    chooseBtn.addEventListener("click", function() { chooseExpressProvider(c); });
    item.appendChild(chooseBtn);
    wrap.appendChild(item);
  });
}

// ── Le client choisit un prestataire parmi les candidats ───────
async function chooseExpressProvider(candidate) {
  if (!_supabase || !_expressState.currentRequest) return;
  try {
    await _supabase.from("express_requests").update({
      statut: "en_cours",
      prestataire_id: candidate.prestataire_id
    }).eq("id", _expressState.currentRequest.id);

    if (_expressState.responseChannel) _supabase.removeChannel(_expressState.responseChannel);

    startExpressTracking(candidate);
  } catch(e) { showToast("Erreur : " + e.message); }
}

// ── Aucun résultat après le délai ───────────────────────────────
function showExpressNoResultsScreen() {
  if (!_expressState.candidates.length) {
    var body = document.getElementById("mBody");
    if (!body) return;
    body.innerHTML = "<div style='text-align:center;padding:30px 0'>"
      + "<div style='font-size:48px;margin-bottom:12px'>😕</div>"
      + "<div style='font-size:15px;font-weight:700;margin-bottom:8px'>Aucun prestataire disponible</div>"
      + "<div style='font-size:13px;color:var(--gray);margin-bottom:20px'>Aucun prestataire n'est connecté dans ta zone pour le moment. Réessaie plus tard ou consulte l'annuaire complet.</div>"
      + "</div>";
    var retryBtn = document.createElement("button");
    retryBtn.className = "rsub";
    retryBtn.style.background = "var(--orange)";
    retryBtn.textContent = "Réessayer";
    retryBtn.addEventListener("click", function() { closeModal(); setTimeout(openExpressSearch, 200); });
    body.appendChild(retryBtn);
    cancelExpressRequest(true);
  }
}

// ── Annuler la recherche en cours ────────────────────────────────
async function cancelExpressRequest(silent) {
  if (_expressState.currentRequest && _supabase) {
    try { await _supabase.from("express_requests").update({statut: "annule"}).eq("id", _expressState.currentRequest.id); }
    catch(e) {}
  }
  if (_expressState.responseChannel) _supabase.removeChannel(_expressState.responseChannel);
  _expressState.currentRequest = null;
  _expressState.candidates = [];
  if (!silent) closeModal();
}


// ══════════════════════════════════════════════════════════════
// LOKALI EXPRESS — Côté prestataire : écoute, accepte, suit GPS
// ══════════════════════════════════════════════════════════════

// ── Activer/désactiver la disponibilité Express ─────────────────
async function toggleExpressAvailability() {
  if (!_currentUser) { showToast("Connecte-toi en tant que prestataire"); return; }
  _expressState.isProviderOnline = !_expressState.isProviderOnline;

  if (_expressState.isProviderOnline) {
    startListeningForExpressRequests();
    showToast("⚡ Tu es maintenant disponible pour LOKALI Express");
  } else {
    stopListeningForExpressRequests();
    showToast("Tu es hors-ligne pour LOKALI Express");
  }
  updateExpressToggleUI();
}

function updateExpressToggleUI() {
  var toggle = document.getElementById("expressProviderToggle");
  if (!toggle) return;
  toggle.classList.toggle("on", _expressState.isProviderOnline);
}

// ── Écouter les nouvelles demandes Express dans le rayon ────────
function startListeningForExpressRequests() {
  if (!_supabase || !_userLat || !_userLng) { showToast("Active ta position GPS"); return; }

  var channel = _supabase.channel("express_requests_listener")
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "express_requests"
    }, function(payload) {
      handleIncomingExpressRequest(payload.new);
    })
    .subscribe();

  _expressState.listenChannel = channel;
}

function stopListeningForExpressRequests() {
  if (_expressState.listenChannel && _supabase) {
    _supabase.removeChannel(_expressState.listenChannel);
    _expressState.listenChannel = null;
  }
}

// ── Une nouvelle demande arrive : vérifier pertinence (rayon + catégorie) ──
async function handleIncomingExpressRequest(request) {
  if (request.statut !== "recherche") return;
  if (!_userLat || !_userLng) return;

  // Vérifier le rayon
  var dist = calcDist(_userLat, _userLng, request.latitude, request.longitude);
  if (dist > (request.rayon_km || 50)) return;

  // Vérifier que ça correspond à mon métier (si profil prestataire chargé)
  if (_myPrestaProfile && _myPrestaProfile.categorie && _myPrestaProfile.categorie !== request.categorie) return;

  _expressState.incomingRequest = request;
  _expressState.incomingRequest._dist = dist;
  showIncomingExpressBanner(request, dist);

  // Auto-masquer après 30s si pas de réponse
  setTimeout(function() {
    if (_expressState.incomingRequest && _expressState.incomingRequest.id === request.id) {
      hideIncomingExpressBanner();
    }
  }, 30000);
}

function showIncomingExpressBanner(request, dist) {
  var banner = document.getElementById("expressIncomingBanner");
  var meta = document.getElementById("expressIncomingMeta");
  if (!banner || !meta) return;
  meta.innerHTML = "<b>" + (request.categorie||"") + "</b> · " + dist.toFixed(1) + " km de toi"
    + (request.description ? "<br>" + request.description : "");
  banner.classList.add("show");
  sendLocalPush("⚡ Nouvelle demande LOKALI Express", (request.categorie||"") + " à " + dist.toFixed(1) + " km", "/");
}

function hideIncomingExpressBanner() {
  var banner = document.getElementById("expressIncomingBanner");
  if (banner) banner.classList.remove("show");
  _expressState.incomingRequest = null;
}

// ── Accepter la demande ──────────────────────────────────────────
async function acceptExpressRequest() {
  var req = _expressState.incomingRequest;
  if (!req || !_supabase) return;
  hideIncomingExpressBanner();

  try {
    await _supabase.from("express_responses").insert({
      request_id: req.id,
      prestataire_id: _currentUser.id,
      statut: "accepte",
      latitude: _userLat,
      longitude: _userLng
    });
    showToast("✅ Réponse envoyée ! Le client va te choisir.");
    // Démarrer l'écoute pour savoir si on a été choisi
    listenForExpressSelection(req.id);
  } catch(e) { showToast("Erreur : " + e.message); }
}

function refuseExpressRequest() {
  hideIncomingExpressBanner();
}

// ── Écouter si on a été choisi par le client ─────────────────────
function listenForExpressSelection(requestId) {
  if (!_supabase) return;
  var channel = _supabase.channel("express_selection_" + requestId)
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "express_requests",
      filter: "id=eq." + requestId
    }, function(payload) {
      if (payload.new.statut === "en_cours" && payload.new.prestataire_id === _currentUser.id) {
        _supabase.removeChannel(channel);
        startBeingTrackedByClient(payload.new);
      } else if (payload.new.statut === "en_cours") {
        // Un autre prestataire a été choisi
        _supabase.removeChannel(channel);
      }
    })
    .subscribe();
}

// ── J'ai été choisi : commencer à envoyer ma position en continu ──
function startBeingTrackedByClient(request) {
  _expressState.myActiveCourse = request;
  showToast("🎉 Le client t'a choisi ! Partage ta position activé.");

  if (navigator.geolocation) {
    _expressState.positionWatchId = navigator.geolocation.watchPosition(function(pos) {
      updateMyExpressPosition(pos.coords.latitude, pos.coords.longitude, request.id);
    }, function(err) { console.warn("Geoloc watch:", err); }, {
      enableHighAccuracy: true, maximumAge: 5000, timeout: 10000
    });
  }

  showActiveCourseScreen(request, "provider");
}

async function updateMyExpressPosition(lat, lng, requestId) {
  if (!_supabase) return;
  try {
    await _supabase.from("express_requests").update({
      prestataire_lat: lat, prestataire_lng: lng,
      updated_at: new Date().toISOString()
    }).eq("id", requestId);
  } catch(e) { console.warn("updateMyExpressPosition:", e); }
}

// ── Terminer la course (côté prestataire) ────────────────────────
async function endExpressCourse() {
  if (_expressState.positionWatchId) {
    navigator.geolocation.clearWatch(_expressState.positionWatchId);
    _expressState.positionWatchId = null;
  }
  if (_expressState.myActiveCourse && _supabase) {
    try { await _supabase.from("express_requests").update({statut: "terminee"}).eq("id", _expressState.myActiveCourse.id); }
    catch(e) {}
  }
  _expressState.myActiveCourse = null;
  closeModal();
  showToast("Course terminée. Merci !");
}


// ══════════════════════════════════════════════════════════════
// LOKALI EXPRESS — Suivi GPS temps réel (carte Leaflet)
// ══════════════════════════════════════════════════════════════

var _expressMap = null;
var _expressClientMarker = null;
var _expressProviderMarker = null;
var _expressPollInterval = null;

// ── Démarrer le suivi côté client (après avoir choisi un prestataire) ──
function startExpressTracking(candidate) {
  showActiveCourseScreen(_expressState.currentRequest, "client", candidate);
}

// ── Écran de course active avec carte temps réel ─────────────────
function showActiveCourseScreen(request, role, candidate) {
  document.getElementById("mTitle").textContent = "⚡ Course en cours";
  document.getElementById("mSub").textContent = role === "client" ? "Suivi en temps réel" : "Vous êtes en route";
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  var trackWrap = document.createElement("div");
  trackWrap.className = "express-tracking";

  var mapDiv = document.createElement("div");
  mapDiv.className = "express-tracking-map";
  mapDiv.id = "expressTrackMap";
  trackWrap.appendChild(mapDiv);

  var infoDiv = document.createElement("div");
  infoDiv.className = "express-tracking-info";
  var nom = role === "client" ? (candidate ? candidate.nom : "Prestataire") : (request.client_nom || "Client");
  var photo = role === "client" && candidate ? candidate.photo : null;
  infoDiv.innerHTML =
    "<div class='express-tracking-avatar'>" + (photo ? "<img src='"+photo+"'>" : "👤") + "</div>"
    + "<div style='flex:1'>"
    + "<div style='font-size:15px;font-weight:700'>" + nom + "</div>"
    + "<div style='font-size:12px;color:var(--gray)'>" + (request.categorie||"") + "</div>"
    + "</div>";
  trackWrap.appendChild(infoDiv);
  body.appendChild(trackWrap);

  var eta = document.createElement("div");
  eta.className = "express-tracking-eta";
  eta.id = "expressEtaTxt";
  eta.textContent = "Calcul du trajet...";
  body.appendChild(eta);

  // Boutons contact
  var contactBtns = document.createElement("div");
  contactBtns.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px";
  var tel = role === "client" ? (candidate ? candidate.telephone : "") : (request.client_tel || "");
  var wa = role === "client" ? (candidate ? candidate.whatsapp : "") : (request.client_tel || "");

  var callBtn = document.createElement("button");
  callBtn.style.cssText = "background:var(--orange);color:#fff;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer";
  callBtn.textContent = "📞 Appeler";
  callBtn.addEventListener("click", function() { if (tel) window.location.href = "tel:"+tel; });

  var waBtn = document.createElement("button");
  waBtn.style.cssText = "background:#25D366;color:#fff;border:none;border-radius:12px;padding:12px;font-size:13px;font-weight:700;cursor:pointer";
  waBtn.textContent = "💬 WhatsApp";
  waBtn.addEventListener("click", function() {
    if (wa) window.open("https://wa.me/"+wa.replace(/[^0-9+]/g,"")+"?text="+encodeURIComponent("Bonjour, je vous contacte via LOKALI Express."), "_blank");
  });
  contactBtns.appendChild(callBtn); contactBtns.appendChild(waBtn);
  body.appendChild(contactBtns);

  var endBtn = document.createElement("button");
  endBtn.style.cssText = "width:100%;background:rgba(239,68,68,.1);color:#EF4444;border:1px solid rgba(239,68,68,.3);border-radius:12px;padding:11px;font-size:12px;font-weight:700;cursor:pointer;margin-top:12px";
  endBtn.textContent = role === "client" ? "Terminer la demande" : "Terminer la course";
  endBtn.addEventListener("click", role === "client" ? endExpressTrackingClient : endExpressCourse);
  body.appendChild(endBtn);

  document.getElementById("overlay").classList.add("on");

  setTimeout(function() { initExpressTrackingMap(request, role, candidate); }, 200);
}

// ── Initialiser la carte de suivi temps réel ─────────────────────
function initExpressTrackingMap(request, role, candidate) {
  if (typeof L === "undefined") { setTimeout(function(){ initExpressTrackingMap(request, role, candidate); }, 300); return; }
  var mapEl = document.getElementById("expressTrackMap");
  if (!mapEl) return;

  var clientLat = request.latitude, clientLng = request.longitude;
  var provLat = role === "client" ? (candidate ? candidate.latitude : clientLat) : _userLat;
  var provLng = role === "client" ? (candidate ? candidate.longitude : clientLng) : _userLng;

  _expressMap = L.map("expressTrackMap", {zoomControl:false, attributionControl:false}).setView([clientLat, clientLng], 13);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {maxZoom:19}).addTo(_expressMap);

  var clientIcon = L.divIcon({html:"<div style='background:#3B82F6;width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(59,130,246,.4)'></div>", className:"", iconSize:[18,18]});
  var provIcon = L.divIcon({html:"<div style='background:#FF6B2C;width:22px;height:22px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 4px rgba(255,107,44,.4);display:flex;align-items:center;justify-content:center;font-size:11px'>🚗</div>", className:"", iconSize:[22,22]});

  _expressClientMarker = L.marker([clientLat, clientLng], {icon: clientIcon}).addTo(_expressMap).bindPopup("Client");
  _expressProviderMarker = L.marker([provLat, provLng], {icon: provIcon}).addTo(_expressMap).bindPopup("Prestataire");

  var bounds = L.latLngBounds([[clientLat,clientLng],[provLat,provLng]]);
  _expressMap.fitBounds(bounds, {padding:[30,30]});

  updateExpressEta(clientLat, clientLng, provLat, provLng);

  // Démarrer le polling pour suivre la position en temps réel
  if (_expressPollInterval) clearInterval(_expressPollInterval);
  _expressPollInterval = setInterval(function() { pollExpressPosition(request.id, clientLat, clientLng); }, 4000);
}

// ── Vérifier périodiquement la position mise à jour du prestataire ──
async function pollExpressPosition(requestId, clientLat, clientLng) {
  if (!_supabase || !_expressProviderMarker) return;
  try {
    var res = await _supabase.from("express_requests").select("prestataire_lat,prestataire_lng,statut").eq("id", requestId).single();
    var data = res.data;
    if (!data) return;
    if (data.statut === "terminee" || data.statut === "annule") {
      clearInterval(_expressPollInterval);
      showToast("La course est terminée.");
      return;
    }
    if (data.prestataire_lat && data.prestataire_lng) {
      _expressProviderMarker.setLatLng([data.prestataire_lat, data.prestataire_lng]);
      updateExpressEta(clientLat, clientLng, data.prestataire_lat, data.prestataire_lng);
    }
  } catch(e) { console.warn("pollExpressPosition:", e); }
}

// ── Calculer et afficher la distance/ETA estimée ──────────────────
function updateExpressEta(clientLat, clientLng, provLat, provLng) {
  var dist = calcDist(clientLat, clientLng, provLat, provLng);
  var etaMin = Math.max(1, Math.round((dist / 30) * 60)); // estimation 30km/h moyenne urbaine
  var etaEl = document.getElementById("expressEtaTxt");
  if (etaEl) {
    if (dist < 0.1) etaEl.textContent = "🎉 Le prestataire est arrivé !";
    else etaEl.textContent = "📍 " + dist.toFixed(1) + " km · Environ " + etaMin + " min";
  }
}

// ── Terminer le suivi côté client ──────────────────────────────────
async function endExpressTrackingClient() {
  if (_expressPollInterval) clearInterval(_expressPollInterval);
  if (_expressState.currentRequest && _supabase) {
    try { await _supabase.from("express_requests").update({statut: "terminee"}).eq("id", _expressState.currentRequest.id); }
    catch(e) {}
  }
  _expressState.currentRequest = null;
  closeModal();
  showToast("Demande terminée. Merci d'avoir utilisé LOKALI Express !");
}


// ── Point d'entrée unique "Mon compte" ────────────────────────
function openMonCompte() {
  if (_currentUser) {
    openDashboard();
  } else {
    openInscription();
  }
}


// ── Modifier mon profil utilisateur ──────────────────────────
function showEditUserProfile() {
  if (!_currentUser) return;
  closeModal();
  setTimeout(function() {
    document.getElementById("mTitle").textContent = "⚙️ Modifier mon profil";
    document.getElementById("mSub").textContent = _currentUser.email || "";
    var body = document.getElementById("mBody");
    body.innerHTML = "";

    var meta = _currentUser.user_metadata || {};
    var prenomInp = mkInput("epPrenom","Prénom");
    prenomInp.value = meta.prenom || "";
    var nomInp = mkInput("epNom","Nom");
    nomInp.value = meta.nom || "";
    var telInp = mkInput("epTel","Téléphone","tel");
    telInp.value = meta.telephone || "";
    var villeInp = mkInput("epVille","Ville");
    villeInp.value = meta.ville || "";

    var saveBtn = mkBtn("epSave","💾 Enregistrer les modifications");
    saveBtn.style.background = "var(--orange)";

    var pwdSection = mkSection("Changer le mot de passe (optionnel)");
    var newPwdInp = mkInput("epNewPwd","Nouveau mot de passe","password");

    appendAll(body, [prenomInp, nomInp, telInp, villeInp, saveBtn, pwdSection, newPwdInp]);

    var changePwdBtn = mkBtn("epChangePwd","🔒 Mettre à jour le mot de passe");
    changePwdBtn.style.cssText = "background:rgba(255,255,255,.08);color:var(--white);width:100%;margin-top:8px";
    body.appendChild(changePwdBtn);

    document.getElementById("overlay").classList.add("on");

    saveBtn.addEventListener("click", async function() {
      try {
        var res = await _supabase.auth.updateUser({
          data: {
            prenom: document.getElementById("epPrenom").value,
            nom: document.getElementById("epNom").value,
            telephone: document.getElementById("epTel").value,
            ville: document.getElementById("epVille").value
          }
        });
        if (res.error) { showToast("Erreur : " + res.error.message); return; }
        showToast("✅ Profil mis à jour !");
        closeModal();
        setTimeout(openDashboard, 200);
      } catch(e) { showToast("Erreur : " + e.message); }
    });

    changePwdBtn.addEventListener("click", async function() {
      var newPwd = document.getElementById("epNewPwd").value;
      if (!newPwd || newPwd.length < 8) { showToast("Le mot de passe doit faire au moins 8 caractères"); return; }
      try {
        var res = await _supabase.auth.updateUser({password: newPwd});
        if (res.error) { showToast("Erreur : " + res.error.message); return; }
        showToast("✅ Mot de passe mis à jour !");
        document.getElementById("epNewPwd").value = "";
      } catch(e) { showToast("Erreur : " + e.message); }
    });
  }, 200);
}


// ── Modal "Tous les services" (200+ métiers) ──────────────────
function openAllServicesModal() {
  document.getElementById("mTitle").textContent = "🔍 Tous les services";
  document.getElementById("mSub").textContent = "Plus de 200 métiers disponibles sur LOKALI";
  var body = document.getElementById("mBody");
  body.innerHTML = "";

  var searchInp = document.createElement("input");
  searchInp.className = "cats-search";
  searchInp.placeholder = "🔍 Rechercher une catégorie...";
  searchInp.style.cssText = "width:100%;margin-bottom:16px";
  searchInp.addEventListener("input", function() { filterGrid(searchInp.value); });
  body.appendChild(searchInp);

  var grid = document.createElement("div");
  grid.className = "cats-grid";
  grid.id = "catsGrid";
  body.appendChild(grid);

  document.getElementById("overlay").classList.add("on");
  renderCats(CATS);
}


// ── Mes questions (côté prestataire) ──────────────────────────
async function showMesQuestions(prestaId) {
  document.getElementById("mTitle").textContent = "❓ Mes questions";
  document.getElementById("mSub").textContent = "Réponds aux questions de tes clients";
  var body = document.getElementById("mBody");
  body.innerHTML = "<div class='loading'><div class='loading-dot'></div></div>";
  document.getElementById("overlay").classList.add("on");

  if (!_supabase) return;
  try {
    var res = await _supabase.from("questions_prestataire").select("*").eq("prestataire_id", prestaId).order("created_at", {ascending:false});
    var list = res.data || [];
    body.innerHTML = "";

    if (!list.length) {
      body.innerHTML = "<div style='text-align:center;padding:30px 0;color:var(--gray);font-size:13px'>Aucune question pour le moment.</div>";
      return;
    }

    list.forEach(function(q) {
      var card = document.createElement("div");
      card.style.cssText = "background:var(--dark3);border-radius:12px;padding:14px;margin-bottom:12px";
      card.innerHTML = "<div style='font-size:13px;font-weight:700;margin-bottom:8px'>❓ " + q.question + "</div>"
        + (q.reponse
          ? "<div style='font-size:13px;color:var(--orange);padding-left:10px;border-left:2px solid var(--orange)'>💬 " + q.reponse + "</div>"
          : "");
      if (!q.reponse) {
        var inp = document.createElement("textarea");
        inp.className = "ri";
        inp.placeholder = "Écris ta réponse...";
        inp.rows = 2;
        inp.style.cssText = "resize:none;margin-top:8px";
        var btn = document.createElement("button");
        btn.className = "rsub";
        btn.style.cssText = "margin-top:6px";
        btn.textContent = "Répondre";
        btn.addEventListener("click", function() { answerQuestion(q.id, inp.value, prestaId); });
        card.appendChild(inp);
        card.appendChild(btn);
      }
      body.appendChild(card);
    });
  } catch(e) { body.innerHTML = "<div style='color:var(--gray);font-size:13px'>Erreur de chargement.</div>"; }
}

async function answerQuestion(questionId, reponse, prestaId) {
  if (!reponse || !reponse.trim()) { showToast("Écris une réponse"); return; }
  if (!_supabase) return;
  try {
    await _supabase.from("questions_prestataire").update({reponse: reponse.trim()}).eq("id", questionId);
    showToast("✅ Réponse envoyée !");
    showMesQuestions(prestaId);
  } catch(e) { showToast("Erreur : " + e.message); }
}

document.addEventListener("DOMContentLoaded", function() {
  CATS = CATS.concat(CATS_EXTRA);
  setTimeout(checkNewAnnoncesForUser, 5000);
  loadHomeAnnoncesPreview();
  loadSponsorsPartenaires();
  renderCats(CATS);
  populateCatSel();
  initGeo();
  initSupabase();
  setTimeout(initDevisForm, 400);
  initPWA();
  setTimeout(initDevisForm, 300);
});
