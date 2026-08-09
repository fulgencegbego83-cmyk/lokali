// ===================================================================
// LOKALI — Widget partagé : Avis, Signalement, Modération, Réponses
// Chargé sur tous les modules pour une expérience cohérente partout.
// ===================================================================

// ── AVIS ─────────────────────────────────────────────────────────
(function(){
  window.LokaliAvis = {};

  window.LokaliAvis.etoilesHTML = function(note, taille) {
    taille = taille || 14;
    var html = "";
    var noteArrondie = Math.round(note);
    for (var i = 1; i <= 5; i++) {
      html += '<span style="font-size:' + taille + 'px;color:' + (i <= noteArrondie ? "#F59E0B" : "#D1D5DB") + '">★</span>';
    }
    return html;
  };

  window.LokaliAvis.chargerResume = async function(supabase, cibleType, cibleId) {
    var r = await supabase.from("lokt_avis").select("note").eq("cible_type", cibleType).eq("cible_id", cibleId);
    if (!r.data || !r.data.length) return { moyenne: 0, total: 0 };
    var total = r.data.length;
    var somme = r.data.reduce(function(s, a){ return s + a.note; }, 0);
    return { moyenne: Math.round((somme / total) * 10) / 10, total: total };
  };

  window.LokaliAvis.afficherResumeHTML = function(resume) {
    if (!resume.total) return '<span style="font-size:13px;color:#94A3B8">Aucun avis pour le moment</span>';
    return '<span>' + window.LokaliAvis.etoilesHTML(resume.moyenne, 15) + '</span> <span style="font-size:13px;font-weight:700;margin-left:4px">' + resume.moyenne + '</span> <span style="font-size:12px;color:#94A3B8">(' + resume.total + ' avis)</span>';
  };

  window.LokaliAvis.chargerAvis = async function(supabase, cibleType, cibleId) {
    var r = await supabase.from("lokt_avis").select("*, profiles(prenom, nom)").eq("cible_type", cibleType).eq("cible_id", cibleId).order("created_at", { ascending: false });
    return r.data || [];
  };

  window.LokaliAvis.rendreAvisListeHTML = function(avisListe) {
    if (!avisListe.length) return '<div style="text-align:center;color:#94A3B8;font-size:13px;padding:16px 0">Sois le premier à laisser un avis !</div>';
    return avisListe.map(function(a){
      var nom = (a.profiles && (a.profiles.prenom || a.profiles.nom)) ? ((a.profiles.prenom||"") + " " + (a.profiles.nom||"")).trim() : "Utilisateur LOKALI";
      var dateTxt = new Date(a.created_at).toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"numeric" });
      return '<div style="padding:12px 0;border-bottom:1px solid rgba(15,23,42,.08)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
          '<span style="font-weight:700;font-size:13px">' + nom + '</span>' +
          '<span style="font-size:11px;color:#94A3B8">' + dateTxt + '</span>' +
        '</div>' +
        '<div style="margin-bottom:4px">' + window.LokaliAvis.etoilesHTML(a.note, 13) + '</div>' +
        (a.commentaire ? '<p style="font-size:13px;color:#1E293B;line-height:1.5">' + a.commentaire + '</p>' : '') +
      '</div>';
    }).join("");
  };

  window.LokaliAvis.construireFormulaireHTML = function(idPrefix) {
    return '<div style="font-weight:700;font-size:13px;margin-bottom:8px;color:#1E293B">Laisser un avis</div>' +
      '<div id="' + idPrefix + 'Etoiles" style="font-size:26px;cursor:pointer;margin-bottom:10px;letter-spacing:4px"></div>' +
      '<textarea id="' + idPrefix + 'Commentaire" placeholder="Ton commentaire (optionnel)..." style="width:100%;min-height:60px;padding:10px;border-radius:10px;border:1px solid rgba(15,23,42,.1);font-family:inherit;font-size:13px"></textarea>' +
      '<div id="' + idPrefix + 'Msg"></div>' +
      '<button id="' + idPrefix + 'Btn" style="margin-top:10px;background:#F97316;color:#fff;border:none;border-radius:30px;padding:9px 20px;font-size:13px;font-weight:700;cursor:pointer">Publier mon avis</button>';
  };

  window.LokaliAvis.activerFormulaire = async function(idPrefix, supabase, cibleType, cibleId, userId, onSuccess) {
    var noteChoisie = 5;
    var zoneEtoiles = document.getElementById(idPrefix + "Etoiles");
    if (!zoneEtoiles) return;

    // Précharger un avis déjà laissé par cet utilisateur, pour qu'il le modifie
    // en connaissance de cause plutôt que de l'écraser sans le voir.
    if (userId) {
      try {
        var existant = await supabase.from("lokt_avis").select("note, commentaire").eq("cible_type", cibleType).eq("cible_id", cibleId).eq("auteur_id", userId).maybeSingle();
        if (existant.data) {
          noteChoisie = existant.data.note;
          var champCommentaire = document.getElementById(idPrefix + "Commentaire");
          if (champCommentaire) champCommentaire.value = existant.data.commentaire || "";
          var titreForm = zoneEtoiles.parentElement ? zoneEtoiles.parentElement.querySelector("div") : null;
          if (titreForm) titreForm.textContent = "Modifier mon avis";
          var boutonForm = document.getElementById(idPrefix + "Btn");
          if (boutonForm) boutonForm.textContent = "Mettre à jour mon avis";
        }
      } catch(e) {}
    }

    function dessinerEtoiles() {
      zoneEtoiles.innerHTML = "";
      for (var i = 1; i <= 5; i++) {
        var s = document.createElement("span");
        s.textContent = i <= noteChoisie ? "★" : "☆";
        s.style.color = i <= noteChoisie ? "#F59E0B" : "#D1D5DB";
        s.onclick = function(val){ return function(){ noteChoisie = val; dessinerEtoiles(); }; }(i);
        zoneEtoiles.appendChild(s);
      }
    }
    dessinerEtoiles();
    document.getElementById(idPrefix + "Btn").onclick = async function() {
      if (!userId) { document.getElementById(idPrefix + "Msg").innerHTML = '<p style="color:#DC2626;font-size:12px">Connecte-toi pour laisser un avis.</p>'; return; }
      var commentaire = document.getElementById(idPrefix + "Commentaire").value.trim();
      if (commentaire && window.LokaliModeration) {
        var moderation = window.LokaliModeration.verifierTexte(commentaire);
        if (!moderation.ok) { document.getElementById(idPrefix + "Msg").innerHTML = '<p style="color:#DC2626;font-size:12px">' + moderation.motif + '</p>'; return; }
      }
      var r = await supabase.from("lokt_avis").upsert({
        cible_type: cibleType, cible_id: cibleId, auteur_id: userId, note: noteChoisie, commentaire: commentaire || null
      }, { onConflict: "cible_type,cible_id,auteur_id" });
      if (r.error) { document.getElementById(idPrefix + "Msg").innerHTML = '<p style="color:#DC2626;font-size:12px">Erreur : ' + r.error.message + '</p>'; return; }
      document.getElementById(idPrefix + "Msg").innerHTML = '<p style="color:#059669;font-size:12px">✅ Merci pour ton avis !</p>';
      if (onSuccess) onSuccess();
    };
  };
})();

// ── SIGNALEMENT ──────────────────────────────────────────────────
(function(){
  window.LokaliSignaler = {};

  var MOTIFS = [
    "Contenu frauduleux ou arnaque", "Contenu inapproprié ou choquant",
    "Faux profil ou usurpation", "Produit/service illégal ou interdit",
    "Spam ou publicité abusive", "Autre"
  ];

  window.LokaliSignaler.ouvrirModal = function(supabase, cibleType, cibleId, userId) {
    if (!userId) {
      if (confirm("Connecte-toi pour signaler ce contenu. Aller à la connexion maintenant ?")) window.location.href = "/?action=inscription";
      return;
    }
    var overlay = document.createElement("div");
    overlay.id = "signalerOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.6);z-index:30000;display:flex;align-items:center;justify-content:center;padding:20px";
    overlay.innerHTML =
      '<div style="background:#fff;border-radius:16px;padding:20px;max-width:380px;width:100%;color:#1E293B;max-height:80vh;overflow-y:auto">' +
        '<div style="font-weight:900;font-size:16px;margin-bottom:14px">🚩 Signaler ce contenu</div>' +
        '<div id="signalerMotifs">' +
          MOTIFS.map(function(m, i){
            return '<label style="display:flex;align-items:center;gap:8px;padding:8px 0;font-size:13px;cursor:pointer">' +
              '<input type="radio" name="signalMotif" value="' + m + '" ' + (i === 0 ? "checked" : "") + ' style="width:auto"> ' + m +
            '</label>';
          }).join("") +
        '</div>' +
        '<textarea id="signalerDescription" placeholder="Précise si besoin (optionnel)..." style="width:100%;min-height:60px;padding:10px;border-radius:10px;border:1px solid rgba(15,23,42,.1);font-family:inherit;font-size:13px;margin-top:8px"></textarea>' +
        '<div id="signalerMsg" style="margin:8px 0"></div>' +
        '<div style="display:flex;gap:8px;margin-top:10px">' +
          '<button onclick="document.getElementById(\'signalerOverlay\').remove()" style="flex:1;background:rgba(15,23,42,.08);border:none;border-radius:30px;padding:11px;font-weight:700;font-size:13px;cursor:pointer">Annuler</button>' +
          '<button id="signalerEnvoyerBtn" style="flex:1;background:#DC2626;color:#fff;border:none;border-radius:30px;padding:11px;font-weight:700;font-size:13px;cursor:pointer">Signaler</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    document.getElementById("signalerEnvoyerBtn").onclick = async function() {
      var motif = document.querySelector('input[name="signalMotif"]:checked').value;
      var description = document.getElementById("signalerDescription").value.trim();
      var r = await supabase.from("lokt_signalements").insert({
        cible_type: cibleType, cible_id: cibleId, auteur_id: userId, motif: motif, description: description || null
      });
      if (r.error) { document.getElementById("signalerMsg").innerHTML = '<p style="color:#DC2626;font-size:12px">Erreur : ' + r.error.message + '</p>'; return; }
      overlay.innerHTML = '<div style="background:#fff;border-radius:16px;padding:30px 20px;text-align:center;max-width:320px"><div style="font-size:32px;margin-bottom:10px">✅</div><div style="font-weight:800;color:#1E293B">Signalement envoyé. Merci de contribuer à la sécurité de LOKALI.</div></div>';
      setTimeout(function(){ var o = document.getElementById("signalerOverlay"); if (o) o.remove(); }, 2500);
    };
  };
})();

// ── MODÉRATION AUTOMATIQUE (léger, pas de file d'attente manuelle) ──
(function(){
  window.LokaliModeration = {};

  var MOTS_INTERDITS = [
    "arnaque garantie", "argent facile", "gagner rapidement", "pyramide",
    "crypto miracle", "double ton argent",
    "arme à feu", "pistolet", "kalachnikov", "fusil d'assaut", "munitions",
    "drogue", "cocaïne", "héroïne", "cannabis à vendre",
    "faux papiers", "faux diplôme", "faux billet",
    "organe à vendre", "vente d'organe",
    "escort", "prostitution"
  ];

  window.LokaliModeration.verifierTexte = function(texte) {
    var t = (texte || "").toLowerCase();
    for (var i = 0; i < MOTS_INTERDITS.length; i++) {
      if (t.indexOf(MOTS_INTERDITS[i]) > -1) {
        return { ok: false, motif: "Ce contenu contient des termes non autorisés sur LOKALI (\"" + MOTS_INTERDITS[i] + "\"). Merci de reformuler." };
      }
    }
    return { ok: true };
  };
})();

// ── VOIR LES RÉPONSES (candidatures, intérêts, soutiens, propositions) ──
(function(){
  window.voirReponses = async function(itemId, table, colItem, colCandidat, titre) {
    var overlay = document.createElement("div");
    overlay.id = "reponsesOverlay";
    overlay.style.cssText = "position:fixed;inset:0;background:var(--dark,#F1F5F9);z-index:20000;overflow-y:auto";
    overlay.innerHTML =
      '<div style="position:sticky;top:0;z-index:2;background:rgba(255,255,255,.95);backdrop-filter:blur(10px);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(15,23,42,.08)">' +
        '<button onclick="document.getElementById(\'reponsesOverlay\').remove()" style="background:rgba(15,23,42,.08);border:none;border-radius:20px;padding:8px 16px;font-weight:700;cursor:pointer">‹ Retour</button>' +
        '<span style="font-weight:800;font-size:14px">Réponses reçues</span><span style="width:70px"></span>' +
      '</div>' +
      '<div style="max-width:640px;margin:0 auto;padding:20px 16px 40px">' +
        '<h2 style="font-size:17px;margin-bottom:16px">' + titre + '</h2>' +
        '<div id="reponsesListe"><div style="text-align:center;color:#64748B;padding:20px">Chargement...</div></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var q = {}; q[colItem] = itemId;
    var r = await _supabase.from(table).select("*").match(q).order("created_at", { ascending: false });
    var zone = document.getElementById("reponsesListe");
    if (r.error || !r.data || !r.data.length) { zone.innerHTML = '<div style="text-align:center;color:#64748B;padding:20px">Aucune réponse reçue pour le moment.</div>'; return; }

    var ids = r.data.map(function(x){ return x[colCandidat]; }).filter(Boolean);
    var profils = {};
    if (ids.length) {
      var pr = await _supabase.from("profiles").select("id, prenom, nom, telephone").in("id", ids);
      (pr.data || []).forEach(function(p){ profils[p.id] = p; });
    }

    zone.innerHTML = r.data.map(function(item){
      var profil = profils[item[colCandidat]] || {};
      var nom = (profil.prenom || profil.nom) ? ((profil.prenom||"") + " " + (profil.nom||"")).trim() : "Utilisateur LOKALI";
      var dateTxt = new Date(item.created_at).toLocaleDateString("fr-FR", { day:"numeric", month:"short", year:"numeric" });
      var messageTxt = item.message || item.description_offre || "";
      var detailsTxt = [];
      if (item.prix_propose) detailsTxt.push("💰 " + item.prix_propose.toLocaleString("fr-FR") + " FCFA proposés");
      if (item.delai_execution_jours) detailsTxt.push("⏱️ " + item.delai_execution_jours + " jours");
      return '<div style="background:#fff;border:1px solid rgba(15,23,42,.08);border-radius:12px;padding:14px;margin-bottom:10px">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:6px">' +
          '<span style="font-weight:800;font-size:14px">' + nom + '</span>' +
          '<span style="font-size:11px;color:#94A3B8">' + dateTxt + '</span>' +
        '</div>' +
        (item.score_compatibilite != null ? '<div style="font-size:12px;color:#059669;font-weight:700;margin-bottom:4px">' + item.score_compatibilite + '% de compatibilité</div>' : '') +
        (detailsTxt.length ? '<div style="font-size:12px;color:#C2410C;font-weight:700;margin-bottom:4px">' + detailsTxt.join(" · ") + '</div>' : '') +
        (messageTxt ? '<p style="font-size:13px;color:#1E293B;line-height:1.5;margin-bottom:8px">' + messageTxt + '</p>' : '') +
        (profil.telephone ? '<a href="tel:' + profil.telephone + '" style="display:inline-block;background:rgba(15,23,42,.08);color:#1E293B;padding:7px 14px;border-radius:20px;font-size:12px;font-weight:700;text-decoration:none">📞 Appeler</a>' : '') +
      '</div>';
    }).join("");
  };
})();
