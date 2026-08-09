// ============================================================
// Supabase Edge Function : notif-nouvelle-candidature
// Déclenchée par un Database Webhook sur INSERT dans lokt_candidatures_emploi.
// Prévient le recruteur par email dès qu'il reçoit une candidature.
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
    const candidature = payload.record;
    if (!candidature) return new Response("Pas de candidature", { status: 200 });

    const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    const { data: offre } = await supabase
      .from("lokt_emplois")
      .select("titre_poste, auteur_id")
      .eq("id", candidature.emploi_id)
      .maybeSingle();
    if (!offre) return new Response("Offre introuvable", { status: 200 });

    const { data: recruteur } = await supabase
      .from("profiles")
      .select("email, prenom")
      .eq("id", offre.auteur_id)
      .maybeSingle();
    if (!recruteur || !recruteur.email) return new Response("Pas d'email recruteur", { status: 200 });

    const lienCandidatures = "https://mylokali.com/lokali-emplois.html#mesOffres";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "LOKALI <notifications@mylokali.com>",
        to: recruteur.email,
        subject: "📥 Nouvelle candidature pour : " + offre.titre_poste,
        html: "<p>Bonjour " + (recruteur.prenom || "") + ",</p>" +
              "<p>Tu as reçu une nouvelle candidature pour ton offre <strong>" + offre.titre_poste + "</strong>.</p>" +
              "<p><a href='" + lienCandidatures + "' style='background:#F97316;color:#fff;padding:10px 20px;border-radius:30px;text-decoration:none;font-weight:700'>Voir la candidature</a></p>" +
              "<p style='color:#94a3b8;font-size:12px;margin-top:20px'>Connecte-toi sur LOKALI, va dans Emplois → Offres d'emploi → Candidatures pour voir le profil complet.</p>"
      })
    });

    return new Response("OK", { status: 200 });
  } catch (e) {
    return new Response("Erreur : " + e.message, { status: 500 });
  }
});
