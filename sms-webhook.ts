// ═══════════════════════════════════════════════════════════════
// KORASSO — Sentinelle SMS
// Fonction serveur (Supabase Edge Function) qui reçoit les SMS de
// confirmation de paiement (Wave/Orange Money) transmis automatiquement
// par l'application Android "SMS to URL Forwarder" installée sur le
// téléphone-caisse de l'organisateur, et génère le billet SANS AUCUNE
// intervention humaine.
//
// URL d'appel (unique par organisateur) :
//   https://qmwdneqxyyvrcrseudwt.supabase.co/functions/v1/sms-webhook?organizer=<ID_ORGANISATEUR>
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Clé "service_role" : jamais exposée côté client, uniquement ici côté serveur.
const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Modèles de reconnaissance des SMS, par opérateur ──────────────
// À ajuster/enrichir dès qu'on aura de vrais SMS reçus pour calibrer précisément
// (le texte exact varie parfois légèrement selon l'opérateur et le pays).
const PATTERNS = [
  // Wave : "Vous avez reçu 2 000 FCFA de la part de +225 07 12 34 56 78."
  { operateur: "Wave", regex: /re[çc]u\s+([\d\s.,]+)\s*(?:FCFA|XOF).*?(\+?\d{8,15})/i },
  // Orange Money : "Vous avez recu un paiement de 2000 F CFA de la part du 0712345678"
  { operateur: "Orange Money", regex: /(?:re[çc]u|paiement)\D{0,20}([\d\s.,]+)\s*(?:F\s?CFA|FCFA|XOF).*?(?:du|de)\D{0,10}(\+?\d{8,15})/i },
];

function extractMontantEtNumero(texteSms: string) {
  for (const p of PATTERNS) {
    const m = texteSms.match(p.regex);
    if (m) {
      const montant = parseInt(m[1].replace(/[\s.,]/g, ""), 10);
      const numero = m[2].replace(/\s/g, "");
      return { montant, numero, operateur: p.operateur };
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const organizerId = url.searchParams.get("organizer");
    if (!organizerId) return new Response("organizer manquant", { status: 400 });

    const body = await req.json(); // attendu : { from: "...", text: "...", sentStamp: 169... }
    const texteSms: string = body.text || "";

    const extrait = extractMontantEtNumero(texteSms);
    if (!extrait) {
      return new Response(JSON.stringify({ status: "ignoré", raison: "SMS non reconnu comme un paiement" }), { status: 200 });
    }

    const sb = createClient(SUPA_URL, SERVICE_KEY);

    // 1. Vérifie que ce SMS provient bien du téléphone-caisse de CET organisateur.
    const { data: mesEvenements } = await sb.from("korasso_evenements").select("id").eq("organisateur_id", organizerId);
    const idsEvenements = (mesEvenements || []).map((e: any) => e.id);
    if (!idsEvenements.length) return new Response(JSON.stringify({ status: "ignoré", raison: "aucun événement pour cet organisateur" }), { status: 200 });

    // 2. Cherche une commande en attente, du bon montant, sur un des événements de cet organisateur,
    //    la plus ancienne d'abord (réduit le risque de collision en cas de montants identiques).
    const { data: commandes } = await sb
      .from("korasso_commandes")
      .select("*")
      .in("evenement_id", idsEvenements)
      .eq("statut", "en_attente_validation")
      .eq("montant", extrait.montant)
      .order("created_at", { ascending: true });

    if (!commandes || !commandes.length) {
      return new Response(JSON.stringify({ status: "sans_correspondance", montant: extrait.montant }), { status: 200 });
    }

    // Si plusieurs commandes ont exactement le même montant en attente,
    // on essaie d'abord de départager par les derniers chiffres du numéro.
    let commande = commandes[0];
    if (commandes.length > 1) {
      const parNumero = commandes.find((c: any) => c.acheteur_phone?.replace(/\D/g, "").endsWith(extrait.numero.slice(-4)));
      if (parNumero) commande = parNumero;
    }

    // 3. Valide la commande, met à jour les compteurs, génère le billet — automatiquement.
    await sb.from("korasso_commandes").update({ statut: "valide", operateur: extrait.operateur }).eq("id", commande.id);

    const { data: cat } = await sb.from("korasso_categories_billets").select("*").eq("id", commande.categorie_id).single();
    await sb.from("korasso_categories_billets").update({ vendus: (cat?.vendus || 0) + (commande.quantite || 1) }).eq("id", commande.categorie_id);

    const { data: ev } = await sb.from("korasso_evenements").select("tickets_sold").eq("id", commande.evenement_id).single();
    await sb.from("korasso_evenements").update({ tickets_sold: (ev?.tickets_sold || 0) + (commande.quantite || 1) }).eq("id", commande.evenement_id);

    const secret = crypto.randomUUID() + crypto.randomUUID();
    const { data: billet, error: erreurBillet } = await sb.from("korasso_billets").insert({
      commande_id: commande.id, evenement_id: commande.evenement_id, categorie_nom: cat?.nom,
      vip: cat?.vip, acheteur_nom: commande.acheteur_nom, acheteur_phone: commande.acheteur_phone,
      montant: commande.montant, quantite: commande.quantite || 1, statut: "valide", secret, buyer_id: commande.buyer_id,
    }).select().single();

    if (erreurBillet) throw erreurBillet;

    // Crédite automatiquement le portefeuille (organisateur / KORASSO / affilié)
    // — sans intervention humaine, comme pour toutes les commandes validées.
    try {
      await sb.rpc("crediter_vente_wallet", { p_commande_id: commande.id });
    } catch (e2) {
      console.error("[KORASSO] crédit portefeuille (sms-webhook):", e2);
    }

    return new Response(JSON.stringify({ status: "billet_genere", billetId: billet.id, commandeId: commande.id }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ status: "erreur", message: String(e) }), { status: 500 });
  }
});