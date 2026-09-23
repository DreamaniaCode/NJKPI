# Nidal Content Hub - MVP

Centre de pilotage hebdomadaire pour les contenus **Nidal** et **Nidal Junior**.

Le MVP regroupe :

- deux plannings hebdomadaires distincts ;
- Stories, Posts, Carrousels et Videos/Reels ;
- objectifs, statuts, resultats et controles de conformite ;
- ajout du lien final Facebook ou Instagram ;
- synchronisation manuelle des insights Meta ;
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
      -> OpenAI Responses API
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
- `OPENAI_API_KEY` et `OPENAI_MODEL` : agent IA.
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
