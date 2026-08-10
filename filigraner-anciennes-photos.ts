// ============================================================
// LOKALI — Edge Function : filigrane sur les photos déjà publiées
// Usage unique. Une fois déployée, visite son URL une seule fois
// dans ton navigateur pour lancer l'opération, puis supprime-la.
//
// Ne touche QUE les photos déjà stockées dans le bucket lokali-photos
// (donc déjà migrées hors base de données). Les images sont ré-encodées
// avec le filigrane "LOKALI" en diagonale, au même emplacement (même nom
// de fichier) — les liens déjà utilisés dans tes annonces continuent de
// fonctionner sans aucune modification en base de données.
// ============================================================
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, Font } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const BUCKET = "lokali-photos";
// Police bitmap libre de droits, format compatible ImageScript
const FONT_URL = "https://raw.githubusercontent.com/matmen/ImageScript/master/fonts/arial.ttf";

Deno.serve(async (_req) => {
  const supa = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const lignesLog: string[] = [];
  function log(msg: string) { lignesLog.push(msg); }

  try {
    log("🔤 Chargement de la police...");
    const fontBuf = await (await fetch(FONT_URL)).arrayBuffer();
    const font = await Font.decode(new Uint8Array(fontBuf));
    log("✅ Police chargée.");

    let totalTraitees = 0;
    let totalErreurs = 0;
    let curseur: string | undefined = undefined;

    // Parcourt le bucket dossier par dossier (une table = un dossier)
    const { data: dossiers, error: errDossiers } = await supa.storage.from(BUCKET).list("", { limit: 1000 });
    if (errDossiers) {
      log("❌ Impossible de lister le bucket : " + errDossiers.message);
      return new Response(lignesLog.join("\n"), { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }

    for (const dossier of dossiers ?? []) {
      if (!dossier.name || dossier.id === null) continue; // ignorer les fichiers isolés, ne garder que les dossiers
      log(`📂 Dossier : ${dossier.name}`);

      const { data: sousDossiers } = await supa.storage.from(BUCKET).list(dossier.name, { limit: 1000 });
      for (const sd of sousDossiers ?? []) {
        const cheminDossier = `${dossier.name}/${sd.name}`;
        const { data: fichiers } = await supa.storage.from(BUCKET).list(cheminDossier, { limit: 1000 });
        for (const f of fichiers ?? []) {
          const chemin = `${cheminDossier}/${f.name}`;
          try {
            const dl = await supa.storage.from(BUCKET).download(chemin);
            if (dl.error || !dl.data) { totalErreurs++; log(`  ❌ Téléchargement ${chemin} : ${dl.error?.message}`); continue; }

            const buf = new Uint8Array(await dl.data.arrayBuffer());
            const img = await Image.decode(buf);

            dessinerFiligrane(img, font);

            const encodee = img.encode(1); // ré-encode en PNG (format universel, compatible ImageScript)
            const up = await supa.storage.from(BUCKET).update(chemin, encodee, { contentType: "image/png", upsert: true });
            if (up.error) { totalErreurs++; log(`  ❌ Ré-envoi ${chemin} : ${up.error.message}`); continue; }

            totalTraitees++;
            log(`  ✅ ${chemin}`);
          } catch (e) {
            totalErreurs++;
            log(`  ❌ ${chemin} : ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }

    log("");
    log(`🎉 Terminé — ${totalTraitees} photo(s) filigranée(s), ${totalErreurs} erreur(s).`);

    return new Response(lignesLog.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    log(`❌ ERREUR INATTENDUE : ${e instanceof Error ? e.message : String(e)}`);
    return new Response(lignesLog.join("\n"), {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
});

// Dessine "LOKALI" en diagonale, répété, semi-transparent — même logique
// que le widget navigateur, adaptée à la bibliothèque ImageScript.
function dessinerFiligrane(img: Image, font: Font) {
  const w = img.width, h = img.height;
  const tailleTexte = Math.max(16, Math.round(Math.min(w, h) * 0.05));
  const espacementX = tailleTexte * 6;
  const espacementY = tailleTexte * 4;
  const diag = Math.sqrt(w * w + h * h);

  for (let y = -diag; y < diag; y += espacementY) {
    for (let x = -diag; x < diag; x += espacementX) {
      try {
        const rendu = Image.renderText(font, tailleTexte, "LOKALI", 0xffffff55);
        img.composite(rendu, Math.round(x), Math.round(y));
      } catch (_e) { /* ignore une tuile isolée en erreur, ne bloque pas le reste */ }
    }
  }
}
