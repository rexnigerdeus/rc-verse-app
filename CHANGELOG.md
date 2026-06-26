# CHANGELOG — Revival : Mon Quotidien

## [2.1.0] — 2026-01-XX

### 📴 Offline-first

L'app fonctionne désormais **sans connexion internet** pour les fonctionnalités essentielles. Tu peux prier, méditer, lire la Bible et noter tes pensées même en avion ou dans une zone sans réseau.

#### Nouveautés
- **Bible offline** : les versions LSG1910 et Darby FR sont embarquées dans l'app (16 MB). Lecture immédiate, sans réseau.
- **Carnet offline** : écris tes notes en hors-ligne, elles se synchronisent automatiquement à la reconnexion.
- **Prières offline** : soumets et marque tes sujets comme exaucés sans réseau.
- **Streak offline** : ta flamme est mise à jour localement puis synchronisée au retour de la connexion.
- **Bannière offline** discrète (ambre) en haut de l'écran quand le réseau est coupé.
- **Indicateur de sync** dans le Carnet et les Prières : badge avec compteur d'éléments en attente.

#### Technique
- Nouvelle base SQLite locale (`offline_data.db`) avec queue de synchronisation
- Hook `useSyncQueue` : sync automatique à la reconnexion + polling de sécurité 60s
- Hook `useNetworkStatus` : détection online/offline multi-plateforme (expo-network + navigator.onLine)
- `OfflineBanner` : slide-down animé, fond ambre rassurant
- `SyncIndicator` : pill discrète avec compteur pending + icône cloud

### 🐛 Corrections
- Schéma SQLite aligné sur le nom de colonne existant côté Supabase (`request_text`)
- Optimisation de la sync queue (idempotente, transactions atomiques)

---

## [2.0.0] — 2026-01-XX

### 🎉 Nouveautés majeures

#### 🔥 Système de flamme (Streak)
- Nouvelle **flamme du jour** 🔥 qui s'allume après **2 minutes d'utilisation active**
- Mesure fiable multi-plateforme (AppState sur mobile, `visibilitychange` sur le web)
- Les flammes forment une **série** qui se compte chaque jour successivement
- **24h sans visite** → le compteur revient à zéro
- Compatible **web et mobile**, sync entre devices via Supabase
- **Pill animée** dans le header + **carte dédiée** dans le profil
- **Modale de détails** avec calendrier 7 jours, record et total cumulé

#### 🏅 Système de badges
- **7 paliers** : 3j (✨), 7j (🔥), 14j (⚡), 30j (🌟), 50j (🛡️), 100j (👑), 365j (🌈)
- **Modale cinématique** au déblocage avec confettis et animation de zoom
- **Grille de progression** dans le profil avec le palier actuel en pulsation

#### 📤 Partage social
- Bouton **Partager** intégré à la modale de déblocage
- Message pré-rempli localisé (FR/EN) avec nom d'utilisateur
- Cross-platform : Share API mobile, clipboard web

#### 🔔 Notifications push
- Rappel du soir (22h) si la flamme n'est pas encore allumée
- Annulation automatique quand la flamme brûle
- Idempotent (pas de doublons)

#### 📖 Approfondir & Prier (refonte)
- Format **mini-méditation style YouVersion** avec 4 sections :
  - **Contexte** biblique/historique
  - **Réflexion** personnelle et chaleureuse
  - **À méditer** (question ouverte)
  - **Prière** intime
- Régénération forcée des anciens versets via bump de version du cache

### 🐛 Corrections
- **Streak web** : fix du bug où la qualification n'était jamais déclenchée
- **Visitations** : suppression des couleurs vertes hardcodées (hors palette)
- **DailyQuiz** : fallback Supabase → en dur robuste (plus de loading infini)
- **Bug score quiz** : calcul corrigé (closure stale)
- **React 19 warning** sur `react-native-modal` : remplacement par `SafeModal` maison
- **Notification handler** : ajout de `shouldShowBanner` / `shouldShowList` (API SDK 56)

### 🛠 Refactoring
- Nouveau `SafeModal` custom (basé sur Modal natif RN, animations natives)
- Système de **purge automatique** des caches obsolètes
- Bump de la clé de cache vers `v4`

### ⚙️ Technique
- Ajout de `react-native-svg` pour les icônes de flamme animées
- Nouvelle table Supabase `user_streaks` (avec RLS)
- Nouvelles colonnes sur `verses` : `reflection`, `meditation_question`
- Edge Function `generate-verse-content` mise à jour (nouveau prompt)
- iOS build 2, Android versionCode 2
- Package version 2.0.0

---

## [1.1.0] — Versions antérieures

- Verset du jour + Méditation + Carnet + Prières
- Quiz biblique quotidien
- Planification des visitations
- Mode sombre
- Multi-langue (FR/EN)
- Authentification Supabase
