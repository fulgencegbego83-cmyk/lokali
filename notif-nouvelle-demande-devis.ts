// ============================================================
// Supabase Edge Function : notif-nouvelle-demande-devis
// Déclenchée par un Database Webhook sur INSERT dans lokt_demandes_devis.
// Prévient le prestataire par email dès qu'il reçoit une demande.
//
// Secret nécessaire (déjà utilisé) : RESEND_API_KEY
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const demande = payload.record;
    if (!demande) return new Response("Pas de demande", { status: 200 });

    const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    const { data: presta } = await supabase
      .from("prestataires")
      .select("nom, user_id")
      .eq("id", demande.prestataire_id)
      .maybeSingle();
    if (!presta) return new Response("Prestataire introuvable", { status: 200 });

    const { data: profil } = await supabase
      .from("profiles")
      .select("email, prenom")
      .eq("id", presta.user_id)
      .maybeSingle();
    if (!profil || !profil.email) return new Response("Pas d'email prestataire", { status: 200 });

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "LOKALI <notifications@mylokali.com>",
        to: profil.email,
        subject: "📝 Nouvelle demande de devis reçue sur LOKALI",
        html: "<p>Bonjour " + (profil.prenom || "") + ",</p>" +
              "<p>Tu as reçu une nouvelle demande de devis :</p>" +
              "<p style='background:#F1F5F9;padding:14px;border-radius:10px'><strong>" + demande.objectif + "</strong><br>" + demande.description + "</p>" +
              "<p>Connecte-toi sur LOKALI, ouvre ton espace prestataire, tu y trouveras les coordonnées du client pour lui répondre directement.</p>" +
              "<p style='color:#94a3b8;font-size:12px;margin-top:20px'>Tu reçois cet email car quelqu'un a demandé un devis sur ton profil LOKALI.</p>"
      })
    });

    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response("Erreur : " + e.message, { status: 500 });
  }
});
