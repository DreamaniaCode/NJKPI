# Nidal Junior — Pilotage éditorial 🌟

Application web monopage (SPA) sans framework, conçue pour la gestion et le pilotage de la production éditoriale du magazine jeunesse **Nidal Junior**.

---

## 🚀 Fonctionnalités principales

### 1. 📊 4 Vues complètes
- **Tableau de bord** : 4 indicateurs KPIs essentiels (*Contenus totaux*, *En cours*, *Publiés*, *Taux d'achèvement*) et 3 graphiques SVG vectoriels (*répartition par type*, *par statut*, et *évolution sur les 6 derniers mois*).
- **Planning** : Calendrier mensuel interactif permettant de naviguer de mois en mois, de visualiser les publications planifiées sous forme de pastilles thématiques colorées, et de consulter le détail au clic avec ajout rapide.
- **Contenus** : Tableau de bord de gestion avec recherche textuelle en temps réel, filtres combinés par type et statut, création/édition via fenêtres modales accessibles, suppression sécurisée et exports directs.
- **Paramètres** : Outils complets de sauvegarde JSON, restauration de fichier, injection de jeux d'essai de démonstration et réinitialisation intégrale.

### 2. 📰 7 Types de contenus éditoriaux
1. **Article** (📰)
2. **Interview** (🎤)
3. **Dossier** (📁)
4. **Brève** (📋)
5. **Chronique** (✍️)
6. **Infographie** (📊)
7. **Quiz** (❓)

### 3. 💾 Persistance et Sauvegardes
- Stockage 100% côté client via **`localStorage`** (clé `nidal-junior-data`).
- Données persistées automatiquement à chaque ajout, modification ou suppression.
- Export et import de fichiers de sauvegarde **JSON** complets.

### 4. 📥 Exports professionnels
- **CSV** : Encodé en UTF-8 avec BOM et séparateur point-virgule (`;`) pour une compatibilité parfaite avec Microsoft Excel en français.
- **Excel (.xlsx)** : Généré directement via la bibliothèque SheetJS avec dimensionnement automatique des largeurs de colonnes.

### 5. ♿ Accessibilité (WCAG 2.1 AA)
- Navigation au clavier complète.
- Piège à focus actif dans les boîtes de dialogue modales (`trapFocus`).
- Annonce vocale dynamique pour les technologies d'assistance (`aria-live="polite"`).
- Contrastes de couleurs rigoureusement validés et prise en charge du thème sombre (Dark mode).

---

## 📂 Structure du projet

```
e:\Projects\Nidal Junior KPI\
│
├── index.html            # Structure SPA principale
├── README.md             # Documentation du projet
│
├── css/
│   └── style.css         # Design system, thème clair/sombre, responsive
│
└── js/
    ├── app.js            # Initialisation et routeur des 4 vues
    ├── utils.js          # Constantes (types, statuts), dates, modales, toasts
    ├── store.js          # Couche localStorage, KPIs et données de démo
    ├── charts.js         # Moteur de graphiques SVG accessibles (barres, donut, courbe)
    ├── export.js         # Moteur d'export CSV et Excel XLSX
    ├── dashboard.js      # Contrôleur de la vue Tableau de bord
    ├── planning.js       # Contrôleur de la vue Planning (calendrier)
    ├── contents.js       # Contrôleur de la vue Contenus (CRUD, filtres)
    └── settings.js       # Contrôleur de la vue Paramètres (backup/restore)
```

---

## 🌐 Déploiement sur GitHub Pages

L'application ne nécessite aucun serveur ni étape de compilation (Vanilla HTML5 / CSS3 / ES6) :

1. Initialisez un dépôt Git dans ce dossier :
   ```bash
   git init
   git add .
   git commit -m "feat: Nidal Junior pilotage éditorial complet"
   ```
2. Créez un dépôt sur GitHub et liez-le :
   ```bash
   git remote add origin https://github.com/votre-nom/nidal-junior-kpi.git
   git branch -M main
   git push -u origin main
   ```
3. Rendez-vous dans les options du dépôt sur GitHub :
   - Allez dans **Settings** > **Pages**.
   - Sous **Build and deployment**, sélectionnez la branche `main` et le dossier `/ (root)`.
   - Cliquez sur **Save**.
4. Votre application est immédiatement accessible en ligne gratuitement sur GitHub Pages !
