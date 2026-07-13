// ═══════════════════════════════════════════════════════════════
// KORASSO — Réception de la confirmation Wave + crédit automatique du
// portefeuille (organisateur / KORASSO / affilié), sans intervention
// humaine — même principe que sms-webhook.ts.
//
// À enregistrer dans Wave Business (section "Webhooks") avec l'URL :
//   https://qmwdneqxyyvrcrseudwt.supabase.co/functions/v1/wave-webhook
//
// IMPORTANT : ajoutez le secret de vérification donné par Wave lors de
// la création du webhook, dans les variables d'environnement de cette
// fonction (Supabase → Edge Functions → wave-webhook → Settings) sous
// le nom WAVE_WEBHOOK_SECRET. Sans lui, n'importe qui pourrait forger de
// fausses confirmations de paiement.
// ═══════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WAVE_WEBHOOK_SECRET = Deno.env.get("WAVE_WEBHOOK_SECRET") || "";

// Vérifie la signature Wave (HMAC-SHA256), pour être sûr que la requête
// vient bien de Wave et pas d'un tiers malveillant qui forgerait un faux
// paiement pour obtenir un billet gratuit.
async function verifierSignatureWave(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!WAVE_WEBHOOK_SECRET) return true; // secret pas encore configuré : à faire dès que possible
  if (!signatureHeader) return false;

  const parts = Object.fromEntries(signatureHeader.split(",").map((p) => p.split("=")));
  const timestamp = parts["t"];
  const signatureRecue = parts["v1"];
  if (!timestamp || !signatureRecue) return false;

  // Wave demande une tolérance de 5 minutes pour éviter les attaques par rejeu.
  const maintenant = Math.floor(Date.now() / 1000);
  if (Math.abs(maintenant - parseInt(timestamp, 10)) > 300) return false;

  const payload = timestamp + "." + rawBody;
  const cle = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(WAVE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signatureCalculeeBuf = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(payload));
  const signatureCalculee = Array.from(new Uint8Array(signatureCalculeeBuf))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  return signatureCalculee === signatureRecue;
}

Deno.serve(async (req) => {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get("Wave-Signature") || req.headers.get("wave-signature");

    if (!(await verifierSignatureWave(rawBody, signatureHeader))) {
      return new Response(JSON.stringify({ status: "signature_invalide" }), { status: 401 });
    }

    const event = JSON.parse(rawBody);
    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ status: "ignoré", raison: "type d'événement non traité" }), { status: 200 });
    }

    const session = event.data;
    if (session.payment_status !== "succeeded" || session.checkout_status !== "complete") {
      return new Response(JSON.stringify({ status: "ignoré", raison: "paiement non abouti" }), { status: 200 });
    }

    const commandeId = session.client_reference;
    if (!commandeId) return new Response(JSON.stringify({ status: "ignoré", raison: "client_reference manquant" }), { status: 200 });

    const sb = createClient(SUPA_URL, SERVICE_KEY);

    // Mise à jour CONDITIONNELLE : Wave peut renvoyer le même webhook plusieurs
    // fois (retries) — on ne génère jamais deux fois le même billet.
    const { data: commandesMaj } = await sb
      .from("korasso_commandes")
      .update({ statut: "valide", operateur: "Wave" })
      .eq("id", commandeId)
      .neq("statut", "valide")
      .select();

    if (!commandesMaj || !commandesMaj.length) {
      return new Response(JSON.stringify({ status: "deja_traite", commandeId }), { status: 200 });
    }
    const commande = commandesMaj[0];

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

    // Crédite automatiquement le portefeuille (organisateur / KORASSO / affilié) —
    // exactement le même mécanisme que pour les commandes validées manuellement
    // ou détectées par SMS. C'est ici que le split 2%/1% (ou 3% sans affilié) se
    // met en place, sans aucune intervention humaine.
    try {
      await sb.rpc("crediter_vente_wallet", { p_commande_id: commande.id });
    } catch (e2) {
      console.error("[KORASSO] crédit portefeuille (wave-webhook):", e2);
    }

    return new Response(JSON.stringify({ status: "billet_genere", billetId: billet.id, commandeId: commande.id }), { status: 200 });
  } catch (e) {
    console.error(e);
    // On renvoie 500 volontairement : Wave réessaiera automatiquement cet envoi
    // plus tard si notre serveur a eu un problème passager.
    return new Response(JSON.stringify({ status: "erreur", message: String(e) }), { status: 500 });
  }
});
