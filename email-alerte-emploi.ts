// ============================================================
// Supabase Edge Function : email-alerte-emploi
// Déclenchée par un Database Webhook sur INSERT dans lokt_emplois.
// Compare la nouvelle offre aux alertes actives et envoie un email
// via Resend à chaque utilisateur concerné.
//
// Secret nécessaire (déjà utilisé pour les emails sponsors) :
// RESEND_API_KEY
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPABASE_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const offre = payload.record;

    if (!offre) return new Response("Pas d'offre", { status: 200 });

    const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    const { data: alertes } = await supabase
      .from("lokt_alertes_emploi")
      .select("id, auteur_id, secteur, ville, mots_cles")
      .eq("actif", true);

    if (!alertes || !alertes.length) return new Response("Aucune alerte", { status: 200 });

    const texteOffre = ((offre.titre_poste || "") + " " + (offre.description || "")).toLowerCase();

    const correspondances = alertes.filter((a: any) => {
      if (a.secteur && a.secteur !== offre.secteur) return false;
      if (a.ville && offre.ville && a.ville.toLowerCase() !== offre.ville.toLowerCase()) return false;
      if (a.mots_cles) {
        const mots = a.mots_cles.toLowerCase().split(",").map((m: string) => m.trim()).filter(Boolean);
        const trouve = mots.some((m: string) => texteOffre.indexOf(m) > -1);
        if (mots.length && !trouve) return false;
      }
      return true;
    });

    if (!correspondances.length) return new Response("Aucune correspondance", { status: 200 });

    const idsUtilisateurs = correspondances.map((a: any) => a.auteur_id);
    const { data: profils } = await supabase
      .from("profiles")
      .select("id, email, prenom")
      .in("id", idsUtilisateurs);

    const lienOffre = "https://mylokali.com/lokali-emplois.html?offre=" + offre.id;

    for (const profil of profils || []) {
      if (!profil.email) continue;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + RESEND_API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "LOKALI <alertes@mylokali.com>",
          to: profil.email,
          subject: "🔔 Nouvelle offre correspondant à ton alerte : " + offre.titre_poste,
          html: "<p>Bonjour " + (profil.prenom || "") + ",</p>" +
                "<p>Une nouvelle offre correspond à ton alerte sur LOKALI :</p>" +
                "<h3>" + offre.titre_poste + (offre.entreprise_nom ? " — " + offre.entreprise_nom : "") + "</h3>" +
                "<p>📍 " + (offre.ville || "Non précisé") + "</p>" +
                "<p><a href='" + lienOffre + "' style='background:#F97316;color:#fff;padding:10px 20px;border-radius:30px;text-decoration:none;font-weight:700'>Voir l'offre</a></p>" +
                "<p style='color:#94a3b8;font-size:12px;margin-top:20px'>Tu reçois cet email car tu as créé une alerte emploi sur LOKALI.</p>"
        })
      });
    }

    return new Response("OK, " + (profils?.length || 0) + " email(s) envoyé(s)", { status: 200 });
  } catch (e) {
    return new Response("Erreur : " + e.message, { status: 500 });
  }
});
