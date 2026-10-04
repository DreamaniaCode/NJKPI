# Nidal Content Hub - MVP

Centre de pilotage hebdomadaire pour les contenus **Nidal** et **Nidal Junior**.

Le MVP regroupe :

- deux plannings hebdomadaires distincts ;
- Stories, Posts, Carrousels et Videos/Reels ;
- objectifs, statuts, resultats et controles de conformite ;
- ajout du lien final Facebook ou Instagram ;
- synchronisation automatique des insights Meta et des KPI toutes les 15 minutes ;
- page Leads Ads : coordonnées, campagnes, formulaires et réponses ;
- suivi des campagnes Meta Ads sur les 30 derniers jours ;
- agent IA pour les plans de semaine, legendes et prompts photo/video ;
- mode demo lorsqu'une integration n'est pas encore configuree ;
- PostgreSQL comme source centrale sur Coolify ;
- localStorage comme secours lorsque le backend est hors ligne.

WhatsApp ne fait pas partie de cette premiere version.

## Architecture

```text
Navigateur
  -> API Node.js / Express sur Coolify
      -> PostgreSQL
      -> Meta Graph API
      -> Meta Marketing API
      -> Google Gemini API (principal)
      -> OpenRouter (fallback)
```

Les jetons Meta et OpenAI ne sont jamais exposes dans le navigateur. Ils sont stockes dans les variables d'environnement Coolify.

## Lancer en mode demo avec Docker

1. Copier `.env.example` vers `.env`.
2. Renseigner au minimum `DATABASE_URL`, `APP_ACCESS_TOKEN` et `DEMO_MODE=true`.
3. Construire et lancer :

```bash
docker build -t nidal-content-hub .
docker run --env-file .env -p 3000:3000 nidal-content-hub
```

Ouvrir `http://localhost:3000`.

Sans `DATABASE_URL`, le serveur fonctionne temporairement en memoire. Les donnees seront perdues au redemarrage.

## Deploiement Coolify

1. Creer une nouvelle ressource depuis le depot GitHub.
2. Choisir le deploiement par `Dockerfile`.
3. Relier le service au PostgreSQL existant avec `DATABASE_URL`.
4. Ajouter les variables de `.env.example` dans Coolify.
5. Exposer le port `3000`.
6. Configurer un domaine HTTPS.

`APP_ACCESS_TOKEN` doit etre long et aleatoire en production. S'il est absent, les endpoints de modification ne sont pas proteges.

## Mode demo

Avec `DEMO_MODE=true` :

- l'agent renvoie des propositions de test sans appeler OpenAI ;
- un lien final produit des insights simules et marques `Demo` ;
- deux campagnes Ads de demonstration sont disponibles ;
- les donnees peuvent etre enregistrees dans PostgreSQL.

Passer `DEMO_MODE=false` pour utiliser les integrations reelles.

## Variables principales

- `DATABASE_URL` : connexion PostgreSQL Coolify.
- `APP_ACCESS_TOKEN` : protection des endpoints de l'application.
- `CORS_ORIGIN` : domaine autorise si le frontend est separe.
- `GEMINI_API_KEY` et `GEMINI_MODEL` : fournisseur IA principal.
- `OPENROUTER_API_KEY` et `OPENROUTER_MODEL` : fallback IA.
- `NIDAL_WEBHOOK_SECRET` : protège le webhook d'automatisation KPI.
- `META_ACCESS_TOKEN` : jeton Meta cote serveur.
- `META_PAGE_ID_*` : Pages Facebook Nidal et Nidal Junior.
- `META_IG_USER_ID_*` : comptes Instagram professionnels.
- `META_AD_ACCOUNT_ID_*` : comptes publicitaires.

## Synchroniser une publication

1. Publier le Post, Reel ou contenu final.
2. Ouvrir `Insights Meta`.
3. Choisir le contenu correspondant.
4. Coller son lien final.
5. Cliquer sur `Recuperer les insights`.

Le backend recherche le media dans les publications recentes du compte configure, enregistre son identifiant Meta puis cree un nouvel instantane de metriques.

## Agent IA

L'agent prepare uniquement des brouillons. Il ne publie rien automatiquement. Chaque sortie doit etre verifiee avant utilisation, notamment les faits, dates, autorisations concernant les mineurs et elements de charte.

## Actualisation Meta et leads formulaires

En production, configurez `DEMO_MODE=false`, `META_ACCESS_TOKEN`, les Pages,
les comptes Instagram et les comptes publicitaires pour chaque marque dans Coolify.
Le jeton doit avoir accès aux actifs concernés et les autorisations nécessaires,
dont `leads_retrieval` pour les contacts, `ads_read` pour les campagnes et les
autorisations de lecture des Pages / insights Instagram selon votre configuration Meta.
Vérifiez également l'accès aux leads dans Meta Business et l'approbation de votre application.

`META_AUTO_SYNC=true` active une récupération au démarrage puis toutes les
`META_SYNC_INTERVAL_MINUTES` minutes (15 par défaut), même sans navigateur ouvert.
La page `Leads Ads` permet une synchronisation immédiate et affiche les erreurs
de connexion. Les formulaires et leurs leads sont paginés, enregistrés par identifiant
sans doublon et conservés dans PostgreSQL. Sans PostgreSQL, ils restent en mémoire
jusqu'au redémarrage. Aucun contact fictif n'est créé en mode démonstration.
Les contacts organiques explicitement signalés par Meta sont exclus.

Les publications doivent avoir leur lien final enregistré pour actualiser leurs métriques.
Les objectifs KPI restent inchangés ; seules leurs valeurs courantes sont actualisées.
Les vues et interactions couvrent les publications reliées ; la portée est cumulée
par publication et ne déduplique pas les personnes. Les conversions correspondent
aux actions `lead` des campagnes sur les 30 derniers jours. Les abonnés sont cumulés
sur Facebook et Instagram. Le navigateur relit les données chaque minute.
Une erreur Meta conserve les dernières valeurs et ne les remplace pas par une démo.
Les leads utilisent la protection API existante (`APP_ACCESS_TOKEN` et/ou JWT) :
configurez-la avant d'exposer les contacts en production.

## Navigation et exploitation des données

- **Contenus & publication** réunit la bibliothèque, le calendrier et la publication programmée.
- **Rapports & Meta** réunit performance, audience, connexion Meta et données exportables.
- **Contacts & leads** permet de rechercher, filtrer par campagne/formulaire, trier chaque colonne
  et sélectionner les contacts. La sélection est limitée aux résultats visibles par les filtres.
- **Données & exports** propose les KPI, campagnes Ads et contenus dans le même tableau.

Les exports portent sur les résultats filtrés, la sélection ou l'ensemble des données chargées.
Formats : Excel `.xlsx` (filtres, en-tête figé, valeurs numériques et téléphones conservés en texte),
CSV UTF-8, TSV, JSON, HTML et Markdown. L'option PDF ouvre l'impression du navigateur :
choisir « Enregistrer au format PDF ». « Copier » transfère un tableau TSV vers le presse-papiers.
Les réponses personnalisées des formulaires et les identifiants Meta sont incluses dans les exports.
L'export Excel nécessite le backend connecté et accepte au maximum 10 000 lignes / 100 colonnes,
dans la limite de taille JSON de l'API. Les exports des contacts ne sont pas stockés dans localStorage.

`npm run test:data` vérifie les exports, la sélection, la récupération Meta et le rendu client.

## KPI

- Interactions = reactions + commentaires + partages + enregistrements.
- Engagement = interactions / portee reelle.
- Les donnees absentes restent affichees avec un tiret.
- Un contenu est `Conforme` uniquement s'il est publie, approuve et que tous les controles sont valides.

## Fichiers principaux

```text
server/index.js
server/db.js
server/repository.js
server/schema.sql
server/services/meta.js
server/services/agent.js
js/api.js
js/store.js
js/agent.js
js/insights.js
```


## Automatisation KPI -> IA

Le backend construit maintenant un contexte KPI à partir des objectifs et des métriques réellement synchronisées dans NJKPI.

- Les métriques marquées `demo` sont exclues des agrégats réels.
- Les générations éditoriales manuelles reçoivent automatiquement le contexte KPI disponible.
- `GET /api/kpi/ai-context?brand=nidal-junior` permet d'inspecter le contexte transmis à l'IA.
- `POST /webhooks/kpi-ai` déclenche une analyse KPI automatisée par le `Nidal KPI & Growth Manager`.
- Le webhook exige l'en-tête `X-Nidal-Webhook-Secret`.
- Gemini est utilisé en priorité côté serveur ; OpenRouter peut prendre le relais si Gemini échoue et qu'une clé OpenRouter est configurée.
- L'analyse automatique ne publie aucun contenu : elle produit uniquement des recommandations internes et conserve la validation humaine.

Exemple :

```bash
curl -X POST https://votre-domaine/webhooks/kpi-ai \
  -H "Content-Type: application/json" \
  -H "X-Nidal-Webhook-Secret: VOTRE_SECRET" \
  -d '{"event":"kpi.daily.updated","brand":"nidal-junior"}'
```


## Meta Live KPI

Le dashboard peut maintenant lire les indicateurs Meta directement depuis Graph API en gardant Facebook et Instagram clairement séparés.

- `GET /api/social/live?brand=nidal` synchronise le profil Meta côté serveur et utilise un cache court.
- Le navigateur rafraîchit la vue Meta Live toutes les 60 secondes quand l'application est ouverte.
- `?refresh=1` force une nouvelle lecture Meta (bouton « Actualiser » du dashboard).
- Les abonnés Instagram provenant de `followers_count` alimentent le KPI **Followers Instagram** sans être additionnés aux abonnés Facebook.
- Le dashboard affiche un bloc Instagram et un bloc Facebook distincts afin d'éviter tout mélange entre les plateformes.
- Les insights de compte lus actuellement sont `profile_views`, `reach` et `accounts_engaged`, avec `period=day` et `metric_type=total_value`.
- Le token Meta reste exclusivement côté serveur dans Coolify.

Ce fonctionnement est du **quasi temps réel** : NJKPI peut interroger Meta chaque minute, mais la fraîcheur effective dépend du délai de mise à jour des Insights chez Meta. Les webhooks serviront plus tard aux événements pris en charge par Meta, pas à transformer toutes les métriques Insights en flux instantané.


## Audience & conversions

Une vue dédiée **Audience & conversions** sépare les données organiques et publicitaires :

- Meta Ads sur les 90 derniers jours : dépenses, reach, impressions, clics et actions/conversions ;
- audience publicitaire par âge/genre et par région lorsque le compte Ads et les permissions nécessaires sont disponibles ;
- anciens contenus Instagram classés par performance réelle (reach, vues, interactions, partages, enregistrements) ;
- anciens contenus Facebook classés séparément ;
- cache de 15 minutes par défaut pour éviter de multiplier les appels Meta, avec actualisation manuelle possible.

Pour activer la partie Ads, renseigner `META_AD_ACCOUNT_ID_NIDAL` / `META_AD_ACCOUNT_ID_NIDAL_JUNIOR` et utiliser un token Meta autorisé à lire les Insights publicitaires. Pour des conversions site précises (formulaire, RDV, inscription), relier ensuite le Pixel Meta et/ou la Conversions API avec des événements clairement définis.


## Publication directe et programmée

NJKPI dispose d'une vue **Publier & programmer** :

- publication Facebook et Instagram séparée ou simultanée ;
- publication immédiate ou planifiée ;
- file serveur vérifiée toutes les 60 secondes ;
- statut `scheduled`, `publishing`, `published`, `partial` ou `failed` ;
- conservation du résultat Meta et des erreurs par plateforme ;
- Instagram requiert une URL média publiquement accessible pour les images/Reels ;
- Facebook accepte texte/lien et image publique.

La collecte Audience/Ads est aussi persistée dans PostgreSQL chaque heure. La page **Audience & conversions** utilise cet historique pour afficher des courbes horaires et conserver les résultats après redémarrage.

Pour la publication Instagram, le token Meta doit disposer de l'autorisation de publication de contenu Instagram. Pour Facebook, la Page doit être administrable avec `pages_manage_posts` et un Page Access Token valide.


## Upload des photos et vidéos

NJKPI permet maintenant de sélectionner directement une photo ou une vidéo depuis **Nouveau contenu** et **Publier & programmer**. Le navigateur envoie le fichier au backend, qui crée une URL publique sous `/uploads/...` afin que Meta puisse récupérer le média.

Variables recommandées sur Coolify :

```env
PUBLIC_BASE_URL=https://nidal.myskillscloud.com
MEDIA_UPLOAD_DIR=/data/nidal-uploads
MEDIA_UPLOAD_LIMIT=50mb
```

Pour conserver les fichiers après un redéploiement, créer un **volume persistant Coolify** monté sur `/data/nidal-uploads`. Sans volume persistant, les médias stockés dans le conteneur peuvent disparaître au prochain déploiement.

La page **Contenus** propose désormais trois actions visibles lors de la création :
- **Enregistrer** ;
- **Programmer** ;
- **Publier maintenant**.

Elle propose aussi **Planifier 7 jours**, avec une ligne par jour de la semaine, upload de média par publication et programmation en masse.
