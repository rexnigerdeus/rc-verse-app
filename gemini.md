# Context : Mon Quotidien - Bible & Calme (Revival Culture)

## 1. Description et Objectif du Projet
* **Nom de l'application :** Mon Quotidien : Bible & Calme (Développé par *Revival Culture* / *RC Studio*).
* **Objectif :** Un sanctuaire numérique de méditation chrétienne. L'application aide les utilisateurs à construire une routine spirituelle quotidienne constante et paisible dans un monde bruyant, en proposant des versets, des prières et des méditations.
* **Cible :** Chrétiens (protestants, catholiques) cherchant le calme, la paix intérieure, un meilleur sommeil et une connexion spirituelle quotidienne.
* **Langue par défaut :** Français (Interface, contenu, et soumissions App Store).

## 2. Fonctionnalités Principales
* **Le Verset du Jour & IA :** Un verset quotidien accompagné d'une explication théologique et d'un guide de prière générés par Intelligence Artificielle (garantissant un ton encourageant et biblique).
* **Méditation Immersive :** Mode de lecture apaisant (silence ou sons d'ambiance).
* **Notifications Locales (Rythme de prière) :** Rappels fixes déclenchés localement à `00:00` (Transition), `05:30` (Aube), `11:30` (Pleine journée), et `18:00` (Crépuscule).
* **Espace Profil :** Gestion du compte, boîte à suggestions et fonctionnalité critique de **Suppression de compte** (obligatoire pour l'App Store - Guideline 5.1.1v).
* **RC Studio (Dashboard Admin) :** Interface cachée réservée aux administrateurs (vérifiés via la table `app_admins`). Permet de voir les statistiques (inscrits, actifs 24h, taux d'engagement), la liste des utilisateurs, et de répondre aux requêtes/suggestions par email.

## 3. Design System : "Dark Atoms"
L'esthétique globale est minimaliste, sombre, organique et sans distraction.
* **Thème :** Dark Mode exclusif.
* **Typographie :** * Titres : `Brand_Heading`
  * Corps de texte : `Brand_Body`
  * Texte en gras : `Brand_Body_Bold`
* **Palette de Couleurs (Variables `Colors`) :**
  * `Colors.primary` : Couleur de fond principale (sombre/noir).
  * `Colors.accent` : Couleur d'accentuation (boutons principaux, icônes actives, textes mis en valeur).
  * `Colors.text` : Texte principal (clair/blanc).
  * *Couleurs sémantiques :* Rouge doux pour la suppression/erreurs (`#EF5350`, `#ff6b6b`, `#EF9A9A`), Vert doux pour les statuts actifs/succès (`#4cd964`, `#A5D6A7`).
* **UI/UX Patterns :** * Angles arrondis (`borderRadius: 12` à `24`).
  * Bordures subtiles et fonds translucides (`rgba(255,255,255,0.05)`).
  * Utilisation systématique du composant personnalisé `<ScreenWrapper>` pour gérer les encoches (Notch/Dynamic Island) via `useSafeAreaInsets` sans casser la couleur de fond globale.

## 4. Stack Technique
* **Frontend :** React Native avec Expo (SDK 52), Expo Router.
* **Backend & Base de données :** Supabase (PostgreSQL).
* **Authentification :** Supabase Auth (Email/Mot de passe).
* **Notifications :** `expo-notifications` (Triggers locaux de type `DAILY`).
* **Déploiement iOS :** EAS Build (`eas build --platform ios --auto-submit`) + TestFlight + App Store Connect. App configurée pour **iPhone uniquement** (`supportsTablet: false` dans `app.json` pour éviter les requis de captures d'écran iPad).

## 5. Base de Données (Supabase)
### Tables connues :
* `auth.users` : Gérée par Supabase (ID, Email, métadonnées, last_sign_in_at).
* `app_admins` : Contient les `user_id` des administrateurs.
* `verse_history` : Historique des méditations (Doit avoir `ON DELETE CASCADE` sur `user_id`).
* `suggestions` : Boîte à idées (user_id, email, content, created_at).
* `prayer_requests` : Requêtes de prière des utilisateurs.

### Fonctions SQL (RPC) importantes :
* `delete_user()` : Supprime le compte de l'utilisateur actif (`auth.uid()`) pour se conformer aux règles Apple.
* `get_admin_stats()` : Fonction `SECURITY DEFINER` qui compile les données pour le dashboard admin (total utilisateurs, actifs 24h, listes récentes).

## 6. Règles de développement (Instructions pour l'IA)
* **Composants :** Toujours privilégier l'utilisation de `<ScreenWrapper>` comme conteneur parent au lieu de `<SafeAreaView>` standard.
* **Style :** Respecter l'esthétique "Dark Atoms". Éviter les couleurs vives agressives en dehors de `Colors.accent`.
* **Plateforme :** Assurer la compatibilité Web et iOS lors de l'écriture de fonctions natives (ex: utiliser `Platform.OS === 'web'` pour fallback les alertes natives en `window.confirm`).
* **App Store :** Garder à l'esprit les directives strictes d'Apple (Confidentialité, suppression de compte, métadonnées complètes) pour éviter tout rejet lors des prochaines mises à jour.