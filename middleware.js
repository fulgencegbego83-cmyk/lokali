// ============================================================
// LOKALI — Aperçus enrichis pour le partage (WhatsApp, Facebook, etc.)
//
// CE FICHIER NE MODIFIE RIEN AU SITE EXISTANT.
// Il s'active UNIQUEMENT quand un robot de réseau social (WhatsApp,
// Facebook, Twitter/X, LinkedIn, Telegram...) demande une page précise
// avec un identifiant d'annonce/boutique/etc. Pour absolument tous
// les vrais visiteurs humains, le site se comporte exactement comme
// avant : ce fichier ne fait rien et laisse passer la requête normale.
//
// Installation : déposer ce fichier à la RACINE du dépôt GitHub,
// nommé exactement "middleware.js". Aucune autre modification requise.
// ============================================================

export const config = {
  matcher: [
    "/lokali-annonces.html",
    "/lokali-marches.html",
    "/lokali-boutique.html",
    "/lokali-appels-offres.html",
    "/lokali-invest.html",
    "/lokali-partenaires.html",
    "/lokali-projets.html",
    "/lokali-talents.html",
    "/lokali-prestataires.html"
  ]
};

// Détection des robots de partage connus (liste large, sans risque de faux positif sur un humain)
const REGEX_BOTS = /facebookexternalhit|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot|SkypeUriPreview|Pinterest|Googlebot/i;

// Carte : pour chaque page, quel paramètre d'URL identifie l'élément,
// dans quelle table Supabase le trouver, et quels champs afficher.
const SOURCES = {
  "/lokali-annonces.html":      { param: "annonce",    table: "lokt_annonces",                    titreCol: "titre",      descCol: "description", photosCol: "photos" },
  "/lokali-marches.html":       { param: "marche",     table: "lokt_marches",                     titreCol: "titre",      descCol: "description", photosCol: "photos" },
  "/lokali-boutique.html":      { param: "id",         table: "lokt_boutiques",                   titreCol: "nom",        descCol: "description", photosCol: null, photoUniqueCol: "logo_url" },
  "/lokali-appels-offres.html": { param: "id",         table: "lokt_appels_offres",               titreCol: "titre",      descCol: "description", photosCol: "photos" },
  "/lokali-partenaires.html":   { param: "id",         table: "lokt_partenariats",                titreCol: "titre",      descCol: "description", photosCol: "photos" },
  "/lokali-projets.html":       { param: "id",         table: "lokt_projets",                     titreCol: "titre",      descCol: "description", photosCol: "photos" },
  "/lokali-talents.html":       { param: "mission",    table: "lokt_missions",                    titreCol: "titre",      descCol: "description", photosCol: "photos" },
  "/lokali-prestataires.html":  { param: "presta",     table: "prestataires",                     titreCol: "nom",        descCol: "description", photosCol: null, photoUniqueCol: "photo_profil" }
};
// Cas particulier : /lokali-invest.html a deux types de contenus possibles
const SOURCE_INVEST = { param: "id", table: "lokt_opportunites_investissement", titreCol: "titre", descCol: "description", photosCol: "photos" };
const SOURCE_STARTUP = { param: "startup", table: "lokt_startups", titreCol: "nom_projet", descCol: "description", photosCol: "photos" };

const SUPA_URL = "https://qmwdneqxyyvrcrseudwt.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtd2RuZXF4eXl2cmNyc2V1ZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDIwMDEsImV4cCI6MjA5ODIxODAwMX0.pQIxHsk080-SY-eeG268zS-uhJHuFQv6QE6pcH5vBB8";

export default async function middleware(request) {
  const userAgent = request.headers.get("user-agent") || "";

  // Pas un robot connu → on ne touche à RIEN, le site se comporte normalement.
  if (!REGEX_BOTS.test(userAgent)) {
    return;
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  var source = SOURCES[pathname];
  if (pathname === "/lokali-invest.html") {
    source = url.searchParams.get("startup") ? SOURCE_STARTUP : SOURCE_INVEST;
  }
  if (!source) return; // sécurité : si jamais la page n'est pas reconnue, comportement normal

  const id = url.searchParams.get(source.param);
  if (!id) return; // pas d'identifiant précis dans le lien → comportement normal (page générale)

  try {
    const apiUrl = SUPA_URL + "/rest/v1/" + source.table + "?id=eq." + encodeURIComponent(id) + "&select=*";
    const res = await fetch(apiUrl, {
      headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY }
    });
    const data = await res.json();
    const item = Array.isArray(data) && data[0] ? data[0] : null;

    // Si l'élément n'existe pas ou plus, on laisse le site répondre normalement (page générique).
    if (!item) return;

    const titre = (item[source.titreCol] || "LOKALI").toString();
    const descriptionBrute = (item[source.descCol] || "À découvrir sur LOKALI, la plateforme 100% gratuite d'Afrique francophone.").toString();
    const description = descriptionBrute.length > 200 ? descriptionBrute.slice(0, 197) + "…" : descriptionBrute;

    var photo = null;
    if (source.photosCol && Array.isArray(item[source.photosCol]) && item[source.photosCol].length) {
      photo = item[source.photosCol][0];
    } else if (source.photoUniqueCol && item[source.photoUniqueCol]) {
      photo = item[source.photoUniqueCol];
    }
    if (!photo) photo = "https://mylokali.com/lokali-logo-v2.svg";

    const echapper = (t) => t.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const html =
      "<!DOCTYPE html><html lang='fr'><head>" +
      "<meta charset='UTF-8'>" +
      "<title>" + echapper(titre) + " — LOKALI</title>" +
      "<meta property='og:title' content='" + echapper(titre) + "'>" +
      "<meta property='og:description' content='" + echapper(description) + "'>" +
      "<meta property='og:image' content='" + photo + "'>" +
      "<meta property='og:url' content='" + url.toString() + "'>" +
      "<meta property='og:type' content='website'>" +
      "<meta name='twitter:card' content='summary_large_image'>" +
      "<meta http-equiv='refresh' content='0; url=" + url.toString() + "'>" +
      "</head><body></body></html>";

    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" }
    });
  } catch (e) {
    // En cas d'erreur quelconque (API indisponible, etc.), on ne bloque jamais :
    // le site répond simplement comme avant, sans aperçu enrichi.
    return;
  }
}
