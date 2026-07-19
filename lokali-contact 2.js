// ===================================================================
// LOKALI — Ouverture/création de conversation depuis une annonce
// Corrige le bouton "💬 Contacter" sur Talents/Missions, Emplois, Marchés
// Fichier IDENTIQUE partout où il est utilisé.
//
// Installation : une ligne avant le script principal de la page :
// <script src="/lokali-contact.js"></script>
// ===================================================================
async function ouvrirConversationDepuisModule(supabaseClient, userId, module, itemId, autreUserId, titre) {
  if (!userId) {
    alert("Connecte-toi d'abord pour contacter cette personne.");
    window.location.href = "/";
    return;
  }
  if (!autreUserId) {
    alert("Impossible d'identifier l'auteur de cette annonce.");
    return;
  }
  if (autreUserId === userId) {
    alert("C'est ta propre annonce — tu ne peux pas te contacter toi-même.");
    return;
  }

  try {
    var existante = await supabaseClient
      .from("lokt_conversations")
      .select("id")
      .or("and(participant_1.eq." + userId + ",participant_2.eq." + autreUserId + "),and(participant_1.eq." + autreUserId + ",participant_2.eq." + userId + ")")
      .eq("contexte_module", module)
      .eq("contexte_item_id", String(itemId))
      .maybeSingle();

    if (existante.data) {
      window.location.href = "/lokali-messagerie.html?conversation=" + existante.data.id;
      return;
    }

    var creation = await supabaseClient.from("lokt_conversations").insert({
      participant_1: userId,
      participant_2: autreUserId,
      contexte_module: module,
      contexte_item_id: String(itemId),
      contexte_titre: titre || "Discussion"
    }).select().single();

    if (creation.error) {
      alert("Erreur lors de l'ouverture de la conversation : " + creation.error.message);
      return;
    }

    window.location.href = "/lokali-messagerie.html?conversation=" + creation.data.id;
  } catch (e) {
    alert("Erreur lors de l'ouverture de la conversation.");
  }
}
