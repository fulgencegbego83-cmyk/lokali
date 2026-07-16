// ============================================================
// LOKALI TALENTS & OPPORTUNITÉS — Référentiel partagé
// Pays / villes / indicatifs : repris à l'identique du site LOKALI principal
// Secteurs & métiers : liste élargie pour tous les modules (Talents, Emplois, Marchés, etc.)
// À inclure via : <script src="/lokali-referentiel.js"></script>
// ============================================================

// ── PAYS + INDICATIFS (identique à LOKALI) ──
var PAYS_LIST = [
  {n:"Côte d'Ivoire",t:"+225",f:"🇨🇮"},{n:"Sénégal",t:"+221",f:"🇸🇳"},{n:"Mali",t:"+223",f:"🇲🇱"},
  {n:"Burkina Faso",t:"+226",f:"🇧🇫"},{n:"Niger",t:"+227",f:"🇳🇪"},{n:"Bénin",t:"+229",f:"🇧🇯"},
  {n:"Togo",t:"+228",f:"🇹🇬"},{n:"Guinée",t:"+224",f:"🇬🇳"},{n:"Guinée-Bissau",t:"+245",f:"🇬🇼"},
  {n:"Mauritanie",t:"+222",f:"🇲🇷"},
  {n:"Sierra Leone",t:"+232",f:"🇸🇱"},{n:"Liberia",t:"+231",f:"🇱🇷"},{n:"Gambie",t:"+220",f:"🇬🇲"},
  {n:"Ghana",t:"+233",f:"🇬🇭"},{n:"Nigeria",t:"+234",f:"🇳🇬"},{n:"Cap-Vert",t:"+238",f:"🇨🇻"},
  {n:"Cameroun",t:"+237",f:"🇨🇲"},{n:"Gabon",t:"+241",f:"🇬🇦"},{n:"Congo",t:"+242",f:"🇨🇬"},
  {n:"RD Congo",t:"+243",f:"🇨🇩"},{n:"Tchad",t:"+235",f:"🇹🇩"},{n:"Rép. centrafricaine",t:"+236",f:"🇨🇫"},
  {n:"Guinée équatoriale",t:"+240",f:"🇬🇶"},
  {n:"Djibouti",t:"+253",f:"🇩🇯"},{n:"Comores",t:"+269",f:"🇰🇲"},{n:"Madagascar",t:"+261",f:"🇲🇬"},
  {n:"Maurice",t:"+230",f:"🇲🇺"},{n:"Seychelles",t:"+248",f:"🇸🇨"},{n:"Rwanda",t:"+250",f:"🇷🇼"},
  {n:"Burundi",t:"+257",f:"🇧🇮"},{n:"Mozambique",t:"+258",f:"🇲🇿"},{n:"Réunion",t:"+262",f:"🇷🇪"},
  {n:"Mayotte",t:"+262",f:"🇾🇹"},
  {n:"Afrique du Sud",t:"+27",f:"🇿🇦"},
  {n:"Maroc",t:"+212",f:"🇲🇦"},{n:"Algérie",t:"+213",f:"🇩🇿"},{n:"Tunisie",t:"+216",f:"🇹🇳"},
  {n:"Libye",t:"+218",f:"🇱🇾"},{n:"Égypte",t:"+20",f:"🇪🇬"},
  {n:"France",t:"+33",f:"🇫🇷"},{n:"Belgique",t:"+32",f:"🇧🇪"},{n:"Suisse",t:"+41",f:"🇨🇭"},
  {n:"Luxembourg",t:"+352",f:"🇱🇺"},{n:"Monaco",t:"+377",f:"🇲🇨"},{n:"Andorre",t:"+376",f:"🇦🇩"},
  {n:"Canada",t:"+1",f:"🇨🇦"},{n:"États-Unis",t:"+1",f:"🇺🇸"},
  {n:"Haïti",t:"+509",f:"🇭🇹"},{n:"Guadeloupe",t:"+590",f:"🇬🇵"},{n:"Martinique",t:"+596",f:"🇲🇶"},
  {n:"Saint-Martin",t:"+590",f:"🇲🇫"},{n:"Sainte-Lucie",t:"+758",f:"🇱🇨"},{n:"Dominique",t:"+767",f:"🇩🇲"},
  {n:"Guyane française",t:"+594",f:"🇬🇫"},
  {n:"Nouvelle-Calédonie",t:"+687",f:"🇳🇨"},{n:"Polynésie française",t:"+689",f:"🇵🇫"},
  {n:"Vanuatu",t:"+678",f:"🇻🇺"},{n:"Wallis-et-Futuna",t:"+681",f:"🇼🇫"},
  {n:"Liban",t:"+961",f:"🇱🇧"},{n:"Cambodge",t:"+855",f:"🇰🇭"},{n:"Vietnam",t:"+84",f:"🇻🇳"},{n:"Laos",t:"+856",f:"🇱🇦"},
  {n:"Espagne",t:"+34",f:"🇪🇸"},{n:"Portugal",t:"+351",f:"🇵🇹"},{n:"Royaume-Uni",t:"+44",f:"🇬🇧"},
  {n:"Allemagne",t:"+49",f:"🇩🇪"},{n:"Italie",t:"+39",f:"🇮🇹"},{n:"Pays-Bas",t:"+31",f:"🇳🇱"}
];

// ── VILLES PAR PAYS (identique à LOKALI) ──
var VILLES_PAR_PAYS = {
  "Côte d'Ivoire": ["Abidjan","Bouaké","Yamoussoukro","Daloa","San-Pédro","Korhogo","Man","Divo","Gagnoa","Anyama","Abengourou","Agboville","Grand-Bassam","Dabou","Bondoukou","Séguéla","Soubré","Issia","Bingerville","Odienné"],
  "Sénégal": ["Dakar","Thiès","Kaolack","Saint-Louis","Ziguinchor","Mbour","Rufisque","Touba","Diourbel","Louga","Tambacounda","Kolda","Fatick","Kaffrine","Matam","Podor","Richard-Toll","Bambey","Joal-Fadiout","Tivaouane"],
  "Mali": ["Bamako","Sikasso","Mopti","Koutiala","Ségou","Kayes","Gao","San","Kati","Tombouctou","Markala","Bougouni","Koulikoro","Niono","Kita","Banamba","Bandiagara","Bafoulabé","Dioïla","Yorosso"],
  "Burkina Faso": ["Ouagadougou","Bobo-Dioulasso","Koudougou","Banfora","Ouahigouya","Pouytenga","Kaya","Tenkodogo","Fada N'Gourma","Dédougou","Houndé","Garango","Réo","Manga","Gourcy","Diapaga","Dori","Boulsa","Sebba","Diébougou"],
  "Niger": ["Niamey","Zinder","Maradi","Agadez","Tahoua","Dosso","Birni N'Konni","Tillabéri","Diffa","Gaya","Madaoua","Tessaoua","Mirriah","Magaria","Matamey","Dogondoutchi","Filingué","Loga","Abalak","Ayorou"],
  "Bénin": ["Cotonou","Porto-Novo","Parakou","Djougou","Bohicon","Kandi","Abomey","Natitingou","Lokossa","Ouidah","Abomey-Calavi","Sakété","Pobè","Savalou","Aplahoué","Dassa-Zoumè","Kérou","Tanguiéta","Comè","Nikki"],
  "Togo": ["Lomé","Sokodé","Kara","Kpalimé","Atakpamé","Bassar","Tsévié","Aného","Mango","Dapaong","Notsé","Vogan","Sotouboua","Badou","Niamtougou","Bafilo","Tabligbo","Tchamba","Cinkassé","Anié"],
  "Guinée": ["Conakry","Nzérékoré","Kankan","Kindia","Labé","Mamou","Boké","Faranah","Kissidougou","Siguiri","Guéckédou","Macenta","Dabola","Dinguiraye","Coyah","Forécariah","Pita","Télimélé","Kérouané","Mandiana"],
  "Cameroun": ["Douala","Yaoundé","Garoua","Bamenda","Maroua","Bafoussam","Ngaoundéré","Bertoua","Loum","Kumba","Nkongsamba","Edéa","Kribi","Limbé","Buea","Dschang","Foumban","Mbouda","Ebolowa","Sangmélima"],
  "Gabon": ["Libreville","Port-Gentil","Franceville","Oyem","Moanda","Mouila","Lambaréné","Tchibanga","Koulamoutou","Makokou","Bitam","Gamba","Mitzic","Ndjolé","Lastoursville","Mayumba","Okondja","Booué","Mbigou","Fougamou"],
  "Mauritanie": ["Nouakchott","Nouadhibou","Kiffa","Rosso","Kaédi","Zouérat","Atar","Néma","Sélibaby","Boutilimit","Aleg","Akjoujt","Tidjikja","Aïoun","Bogué","Chinguetti","Boghé","Tékane","Magta-Lahjar","Timbedra"],
  "RD Congo": ["Kinshasa","Lubumbashi","Mbuji-Mayi","Kisangani","Kananga","Bukavu","Kolwezi","Likasi","Goma","Tshikapa","Uvira","Mbandaka","Matadi","Kikwit","Bandundu","Butembo","Beni","Kalemie","Kindu","Mwene-Ditu"],
  "Congo": ["Brazzaville","Pointe-Noire","Dolisie","Nkayi","Ouesso","Madingou","Owando","Sibiti","Mossendjo","Kinkala","Impfondo","Gamboma","Loubomo","Djambala","Ewo","Mossaka","Makoua","Kayes","Kakamoeka","Loutété"],
  "Tchad": ["N'Djaména","Moundou","Sarh","Abéché","Kelo","Koumra","Pala","Am Timan","Bongor","Mongo","Doba","Ati","Oum Hadjer","Bol","Faya-Largeau","Massakory","Laï","Goz Beïda","Biltine","Mao"],
  "Madagascar": ["Antananarivo","Toamasina","Antsirabe","Fianarantsoa","Mahajanga","Toliara","Antsiranana","Ambovombe","Morondava","Manakara","Ambositra","Sambava","Ihosy","Antalaha","Maevatanana","Marovoay","Moramanga","Tôlanaro","Farafangana","Vohémar"],
  "Maroc": ["Casablanca","Rabat","Fès","Marrakech","Tanger","Agadir","Meknès","Oujda","Kénitra","Tétouan","Salé","Nador","El Jadida","Béni Mellal","Khouribga","Settat","Larache","Khémisset","Guelmim","Berrechid"],
  "Algérie": ["Alger","Oran","Constantine","Annaba","Blida","Batna","Djelfa","Sétif","Sidi Bel Abbès","Biskra","Tébessa","El Oued","Skikda","Tiaret","Béjaïa","Tlemcen","Ouargla","Béchar","Mostaganem","Bordj Bou Arréridj"],
  "Tunisie": ["Tunis","Sfax","Sousse","Kairouan","Bizerte","Gabès","Ariana","Gafsa","Monastir","Nabeul","Médenine","Béja","Jendouba","Kasserine","Tataouine","Tozeur","Kébili","Siliana","Zaghouan","Manouba"],
  "France": ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Strasbourg","Montpellier","Bordeaux","Lille","Rennes","Reims","Toulon","Saint-Étienne","Le Havre","Grenoble","Dijon","Angers","Nîmes","Villeurbanne"],
  "Belgique": ["Bruxelles","Anvers","Gand","Charleroi","Liège","Bruges","Namur","Louvain","Mons","Aalst","Malines","La Louvière","Courtrai","Hasselt","Saint-Nicolas","Tournai","Genk","Seraing","Roulers","Verviers"],
  "Canada": ["Montréal","Québec","Gatineau","Sherbrooke","Trois-Rivières","Saguenay","Lévis","Terrebonne","Saint-Jean-sur-Richelieu","Repentigny","Toronto","Ottawa","Vancouver","Calgary","Edmonton"],
  "Suisse": ["Genève","Lausanne","Fribourg","Sion","Neuchâtel","Bienne","La Chaux-de-Fonds","Yverdon-les-Bains","Montreux","Vevey","Zurich","Bâle","Berne","Lugano","Winterthour"],
  "Haïti": ["Port-au-Prince","Cap-Haïtien","Gonaïves","Les Cayes","Jacmel","Jérémie","Saint-Marc","Port-de-Paix","Hinche","Léogâne","Petit-Goâve","Croix-des-Bouquets","Mirebalais","Fort-Liberté","Ouanaminthe","Miragoâne","Anse-à-Veau","Aquin","Pétion-Ville","Delmas"],
  "Rwanda": ["Kigali","Butare","Gitarama","Ruhengeri","Gisenyi","Byumba","Cyangugu","Kibungo","Kibuye","Gikongoro","Rwamagana","Nyanza","Muhanga","Huye","Musanze","Rubavu","Karongi","Nyagatare","Kayonza","Rusizi"],
  "Égypte": ["Le Caire","Alexandrie","Gizeh","Shubra El Kheima","Port-Saïd","Suez","Louxor","Assiout","Mansourah","Tanta","Assouan","Faiyoum","Zagazig","Ismaïlia","Damiette","Damanhour","Minya","Beni Suef","Hurghada","Qena"]
};

function fillPaysSelect(sel, withIndicatif) {
  if (!sel) return;
  sel.innerHTML = "<option value=''>-- Choisir un pays --</option>";
  PAYS_LIST.forEach(function(p) {
    var o = document.createElement("option");
    o.value = p.n;
    o.textContent = p.f + " " + p.n + (withIndicatif ? " (" + p.t + ")" : "");
    o.setAttribute("data-indicatif", p.t);
    sel.appendChild(o);
  });
}

function fillVillesByPays(paysName, villeSel) {
  if (!villeSel) return;
  villeSel.innerHTML = "<option value=''>-- Choisir la ville --</option>";
  var villes = VILLES_PAR_PAYS[paysName];
  if (villes && villes.length) {
    villes.forEach(function(v) {
      var o = document.createElement("option");
      o.value = v; o.textContent = v;
      villeSel.appendChild(o);
    });
    var oAutre = document.createElement("option");
    oAutre.value = "__autre__"; oAutre.textContent = "Autre ville (préciser)";
    villeSel.appendChild(oAutre);
  } else {
    villeSel.innerHTML = "<option value='__autre__'>Saisir manuellement ci-dessous</option>";
  }
}

// Relie un select pays + un select ville + (optionnel) un champ indicatif, en cascade automatique
function connecterPaysVilleIndicatif(paysSelId, villeSelId, indicatifInputId) {
  var paysSel = document.getElementById(paysSelId);
  var villeSel = document.getElementById(villeSelId);
  var indicInput = indicatifInputId ? document.getElementById(indicatifInputId) : null;
  if (!paysSel) return;
  fillPaysSelect(paysSel, true);
  paysSel.addEventListener("change", function() {
    fillVillesByPays(paysSel.value, villeSel);
    if (indicInput) {
      var opt = paysSel.selectedOptions[0];
      indicInput.value = opt ? (opt.getAttribute("data-indicatif") || "") : "";
    }
  });
}

// ── SECTEURS D'ACTIVITÉ (élargi) ──
var SECTEURS_ACTIVITE = [
  "Informatique & Développement web/mobile","Intelligence artificielle & Data",
  "Design & Graphisme","Marketing & Communication","Photographie & Vidéo",
  "Bâtiment & Travaux publics (BTP)","Électricité & Énergie","Plomberie & Sanitaire",
  "Climatisation & Froid","Mécanique automobile","Transport & Logistique",
  "Livraison & Coursiers","Agriculture & Agroalimentaire","Élevage & Pêche",
  "Restauration & Métiers de bouche","Événementiel & Réception","Hôtellerie & Tourisme",
  "Beauté & Cosmétique","Coiffure & Esthétique","Mode & Couture","Artisanat & Décoration",
  "Immobilier","Architecture & Urbanisme","Juridique & Droit","Comptabilité & Finance",
  "Banque & Assurance","Ressources humaines & Recrutement","Éducation & Formation",
  "Santé non médicale (bien-être)","Sport & Fitness","Sécurité & Gardiennage",
  "Nettoyage & Entretien","Maintenance & Dépannage général","Menuiserie & Bois",
  "Métallurgie & Soudure","Textile & Confection","Import-Export & Commerce international",
  "Grande distribution & Commerce de détail","E-commerce","Télécommunications",
  "Environnement & Énergies renouvelables","Industrie & Production","Traduction & Langues",
  "Édition & Rédaction","Musique & Arts du spectacle","Audiovisuel & Cinéma",
  "ONG & Solidarité","Administration publique","Consulting & Conseil en stratégie",
  "Startups & Innovation","Autre secteur (à préciser)"
];

// ── MÉTIERS / COMPÉTENCES PAR SECTEUR (liste élargie, avec fallback "Autre") ──
var METIERS_PAR_SECTEUR = {
  "Informatique & Développement web/mobile": ["Développeur web front-end","Développeur web back-end","Développeur full-stack","Développeur mobile Android","Développeur mobile iOS","Développeur React Native","Administrateur système","Ingénieur DevOps","Développeur logiciel","Testeur QA","Développeur WordPress","Intégrateur web"],
  "Intelligence artificielle & Data": ["Data analyst","Data scientist","Ingénieur machine learning","Ingénieur data engineer","Spécialiste automatisation IA"],
  "Design & Graphisme": ["Graphiste","Designer UI/UX","Illustrateur","Directeur artistique","Motion designer","Designer de logos"],
  "Marketing & Communication": ["Community manager","Spécialiste marketing digital","Chargé de communication","Spécialiste SEO/SEA","Growth hacker","Chef de projet marketing"],
  "Photographie & Vidéo": ["Photographe événementiel","Photographe portrait","Vidéaste","Monteur vidéo","Cadreur","Opérateur drone"],
  "Bâtiment & Travaux publics (BTP)": ["Maçon","Chef de chantier","Ingénieur BTP","Carreleur","Peintre en bâtiment","Coffreur","Ferrailleur","Conducteur d'engins"],
  "Électricité & Énergie": ["Électricien bâtiment","Électricien industriel","Technicien solaire","Installateur panneaux solaires"],
  "Plomberie & Sanitaire": ["Plombier","Technicien sanitaire","Installateur chauffe-eau"],
  "Climatisation & Froid": ["Technicien climatisation","Frigoriste"],
  "Mécanique automobile": ["Mécanicien auto","Mécanicien moto","Électricien auto","Carrossier","Peintre automobile","Vulcanisateur"],
  "Transport & Logistique": ["Chauffeur particulier","Chauffeur poids lourd","Logisticien","Gestionnaire de stock","Transitaire"],
  "Livraison & Coursiers": ["Livreur moto","Livreur vélo","Coursier"],
  "Agriculture & Agroalimentaire": ["Agriculteur","Technicien agricole","Agronome","Transformateur agroalimentaire"],
  "Élevage & Pêche": ["Éleveur","Vétérinaire","Pêcheur","Aquaculteur"],
  "Restauration & Métiers de bouche": ["Cuisinier","Chef cuisinier","Pâtissier","Boulanger","Traiteur","Barman","Serveur"],
  "Événementiel & Réception": ["Organisateur d'événements","Décorateur événementiel","DJ","Animateur","Wedding planner","Traiteur événementiel"],
  "Hôtellerie & Tourisme": ["Réceptionniste hôtel","Guide touristique","Agent de voyage","Gouvernante"],
  "Beauté & Cosmétique": ["Maquilleuse professionnelle","Prothésiste ongulaire","Spécialiste soins de la peau"],
  "Coiffure & Esthétique": ["Coiffeur","Coiffeuse tresses/perruques","Barbier","Esthéticienne"],
  "Mode & Couture": ["Couturier","Styliste","Modéliste","Brodeur"],
  "Artisanat & Décoration": ["Artisan bijoutier","Sculpteur","Décorateur d'intérieur","Tapissier"],
  "Immobilier": ["Agent immobilier","Gestionnaire de biens","Promoteur immobilier"],
  "Architecture & Urbanisme": ["Architecte","Urbaniste","Dessinateur en bâtiment"],
  "Juridique & Droit": ["Avocat","Juriste d'entreprise","Notaire","Huissier"],
  "Comptabilité & Finance": ["Comptable","Expert-comptable","Analyste financier","Auditeur"],
  "Banque & Assurance": ["Conseiller bancaire","Agent d'assurance","Courtier"],
  "Ressources humaines & Recrutement": ["Chargé de recrutement","Responsable RH","Formateur en entreprise"],
  "Éducation & Formation": ["Professeur particulier","Formateur professionnel","Coach scolaire"],
  "Santé non médicale (bien-être)": ["Masseur bien-être","Coach en nutrition","Praticien de médecine douce"],
  "Sport & Fitness": ["Coach sportif","Professeur de yoga","Entraîneur personnel"],
  "Sécurité & Gardiennage": ["Agent de sécurité","Vigile","Garde du corps"],
  "Nettoyage & Entretien": ["Agent d'entretien","Femme/homme de ménage","Agent de nettoyage industriel"],
  "Maintenance & Dépannage général": ["Technicien polyvalent","Agent de maintenance","Dépanneur multi-services"],
  "Menuiserie & Bois": ["Menuisier","Ébéniste","Charpentier"],
  "Métallurgie & Soudure": ["Soudeur","Chaudronnier","Serrurier métallique"],
  "Textile & Confection": ["Opérateur de confection","Tisserand"],
  "Import-Export & Commerce international": ["Agent import-export","Transitaire international","Négociant"],
  "Grande distribution & Commerce de détail": ["Vendeur","Gérant de boutique","Caissier","Merchandiser"],
  "E-commerce": ["Gestionnaire boutique en ligne","Spécialiste dropshipping","Responsable logistique e-commerce"],
  "Télécommunications": ["Technicien télécom","Installateur réseau","Agent call center"],
  "Environnement & Énergies renouvelables": ["Technicien environnement","Ingénieur énergies renouvelables","Agent de recyclage"],
  "Industrie & Production": ["Opérateur de production","Technicien de maintenance industrielle","Contrôleur qualité"],
  "Traduction & Langues": ["Traducteur","Interprète","Professeur de langues"],
  "Édition & Rédaction": ["Rédacteur web","Correcteur","Journaliste","Copywriter"],
  "Musique & Arts du spectacle": ["Musicien","Chanteur","Danseur","Comédien"],
  "Audiovisuel & Cinéma": ["Réalisateur","Producteur audiovisuel","Ingénieur du son"],
  "ONG & Solidarité": ["Chargé de projet ONG","Bénévole coordinateur","Travailleur social"],
  "Administration publique": ["Agent administratif","Fonctionnaire","Assistant de direction"],
  "Consulting & Conseil en stratégie": ["Consultant en stratégie","Consultant en organisation","Analyste business"],
  "Startups & Innovation": ["Cofondateur de startup","Product manager","Business developer"]
};

// Remplit un select "secteur" avec la liste complète
function fillSecteursSelect(sel) {
  if (!sel) return;
  sel.innerHTML = "<option value=''>-- Choisir un secteur --</option>";
  SECTEURS_ACTIVITE.forEach(function(s) {
    var o = document.createElement("option");
    o.value = s; o.textContent = s;
    sel.appendChild(o);
  });
}

// Remplit un select "métier/compétence" selon le secteur choisi, avec "Autre (préciser)" en fallback
function fillMetiersBySecteur(secteurName, metierSel) {
  if (!metierSel) return;
  metierSel.innerHTML = "<option value=''>-- Choisir --</option>";
  var metiers = METIERS_PAR_SECTEUR[secteurName];
  if (metiers && metiers.length) {
    metiers.forEach(function(m) {
      var o = document.createElement("option");
      o.value = m; o.textContent = m;
      metierSel.appendChild(o);
    });
  }
  var oAutre = document.createElement("option");
  oAutre.value = "__autre__"; oAutre.textContent = "Autre (préciser)";
  metierSel.appendChild(oAutre);
}

// Relie un select secteur + un select métier en cascade automatique
function connecterSecteurMetier(secteurSelId, metierSelId) {
  var secteurSel = document.getElementById(secteurSelId);
  var metierSel = document.getElementById(metierSelId);
  if (!secteurSel) return;
  fillSecteursSelect(secteurSel);
  secteurSel.addEventListener("change", function() {
    fillMetiersBySecteur(secteurSel.value, metierSel);
  });
}
