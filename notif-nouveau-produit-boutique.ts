// ============================================================
// Supabase Edge Function : notif-nouveau-produit-boutique
// Déclenchée par un Database Webhook sur INSERT dans lokt_produits.
// Prévient tous les abonnés de la boutique par email dès qu'un
// nouveau produit est publié.
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
    const produit = payload.record;
    if (!produit) return new Response("Pas de produit", { status: 200 });

    const supabase = createClient(SUPA_URL, SUPA_SERVICE_KEY);

    const { data: boutique } = await supabase
      .from("lokt_boutiques")
      .select("nom")
      .eq("id", produit.boutique_id)
      .maybeSingle();
    if (!boutique) return new Response("Boutique introuvable", { status: 200 });

    const { data: abonnes } = await supabase
      .from("lokt_boutique_abonnes")
      .select("utilisateur_id")
      .eq("boutique_id", produit.boutique_id);
    if (!abonnes || !abonnes.length) return new Response("Aucun abonné", { status: 200 });

    const idsUtilisateurs = abonnes.map((a: any) => a.utilisateur_id);
    const { data: profils } = await supabase
      .from("profiles")
      .select("id, email, prenom")
      .in("id", idsUtilisateurs);

    const lienProduit = "https://mylokali.com/lokali-boutique.html?id=" + produit.boutique_id;
    const prixTxt = produit.prix ? produit.prix.toLocaleString("fr-FR") + " FCFA" : "Prix à discuter";

    for (const profil of profils || []) {
      if (!profil.email) continue;
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "LOKALI <alertes@mylokali.com>",
          to: profil.email,
          subject: "🆕 Nouveauté chez " + boutique.nom + " : " + produit.nom,
          html: "<p>Bonjour " + (profil.prenom || "") + ",</p>" +
                "<p>La boutique <strong>" + boutique.nom + "</strong> que tu suis vient de publier un nouveau produit :</p>" +
                "<h3>" + produit.nom + "</h3>" +
                "<p>💰 " + prixTxt + "</p>" +
                "<p><a href='" + lienProduit + "' style='background:#F97316;color:#fff;padding:10px 20px;border-radius:30px;text-decoration:none;font-weight:700'>Voir la boutique</a></p>" +
                "<p style='color:#94a3b8;font-size:12px;margin-top:20px'>Tu reçois cet email car tu suis cette boutique sur LOKALI.</p>"
        })
      });
    }

    return new Response("OK, " + (profils?.length || 0) + " email(s) envoyé(s)", { status: 200 });
  } catch (e) {
    return new Response("Erreur : " + e.message, { status: 500 });
  }
});
