# ============================================
# F.Y.T V3 — PROMPTS IA D'EXÉCUTION (OPTIMISÉ)
# 12 étapes au lieu de 32 — Ratio tokens/résultat maximisé
# ============================================

## 📋 DOCUMENTS DE RÉFÉRENCE

Chaque conversation IA doit avoir accès aux documents suivants :

| Document | Fichier | Usage |
|----------|---------|-------|
| User Stories | `fyt-v3-user-stories-v2.yaml` | Spécifications fonctionnelles détaillées |
| Wireframes | `fyt-v3-wireframes-v2.md` | Structure des écrans et comportements |
| Badges | `fyt-v3-badges.json` + `fyt-v3-badges-insert.sql` | Définitions et assets des 25 badges |
| Style CSS | `[gemini-visual-guide.md]` | Instructions CSS et design system |
| Variables Env | `variables.env` | Configuration Supabase et Strava |

---

## 🗺️ PLAN D'EXÉCUTION — VUE D'ENSEMBLE

| Étape | Nom | Modèle | US concernées | Dépendances |
|-------|-----|--------|---------------|-------------|
| **1** | Base de données complète | Sonnet | DB-001 → DB-006 | - |
| **2** | Infrastructure Shared | **Opus** | SHR-001 → SHR-004, ATH-011 | Étape 1 |
| **3** | Navigation & Layout | Sonnet | ATH-002, COA-001 | Étape 2 |
| **4** | Accueil Athlète complet | Sonnet | ATH-001, ATH-NEW-001, ATH-NEW-002 | Étape 3 |
| **5** | Historique Athlète | Sonnet | ATH-003 | Étape 3 |
| **6A** | Coach Tab — Messages & Liste | Sonnet | ATH-004, ATH-005 | Étape 2 |
| **6B** | Coach Tab — Thread & Intégration | Sonnet | ATH-006, ATH-007 | Étape 6A |
| **7A** | Profil — Infos & Settings | Sonnet | ATH-008, ATH-012 | Étape 3 |
| **7B** | Profil — Badges complet | **Opus** | ATH-009, ATH-010 | Étape 2 |
| **8** | Dashboard Coach complet | Sonnet | COA-002, COA-003, COA-004 | Étape 3 |
| **9A** | Programmes — Vue & Filtres | Sonnet | COA-005, COA-006 | Étape 3 |
| **9B** | Programmes — Editor complet | **Opus** | COA-010 | Étape 9A |
| **10** | Import Wizard complet | Sonnet | COA-007, COA-008, COA-009 | Étape 3 |
| **11** | Messages & Settings Coach | Sonnet | COA-011, COA-012, COA-013, COA-014 | Étape 6B |

**Total : 14 étapes | 3 Opus | 11 Sonnet**

---

## 📊 TABLEAU DE SUIVI

```markdown
| Étape | Nom | Modèle | Statut | Date | Notes |
|-------|-----|--------|--------|------|-------|
| 1 | Base de données complète | Sonnet | ⬜ | | |
| 2 | Infrastructure Shared | Opus | ⬜ | | |
| 3 | Navigation & Layout | Sonnet | ⬜ | | |
| 4 | Accueil Athlète complet | Sonnet | ⬜ | | |
| 5 | Historique Athlète | Sonnet | ⬜ | | |
| 6A | Coach Tab — Messages & Liste | Sonnet | ⬜ | | |
| 6B | Coach Tab — Thread & Intégration | Sonnet | ⬜ | | |
| 7A | Profil — Infos & Settings | Sonnet | ⬜ | | |
| 7B | Profil — Badges complet | Opus | ⬜ | | |
| 8 | Dashboard Coach complet | Sonnet | ⬜ | | |
| 9A | Programmes — Vue & Filtres | Sonnet | ⬜ | | |
| 9B | Programmes — Editor complet | Opus | ⬜ | | |
| 10 | Import Wizard complet | Sonnet | ⬜ | | |
| 11 | Messages & Settings Coach | Sonnet | ⬜ | | |

Légende : ⬜ À faire | 🔄 En cours | ✅ Terminé | ❌ Bloqué
```

---

# 📝 PROMPTS DÉTAILLÉS

---

## [Étape 1 — Base de données complète]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 1/14                                                   ║
║  US     : DB-001, DB-002, DB-003, DB-004, DB-005, DB-006         ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
Cette étape crée toutes les tables et politiques nécessaires au nouveau système.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, section `db_migration`
- Badges SQL : `fyt-v3-badges-insert.sql` (données des 25 badges)

## Objectif
Générer tous les scripts SQL de migration pour Supabase en un seul livrable.

## Sous-tâches

### 1.1 — Tables conversations et messages (DB-001, DB-002)
- Table `conversations` avec colonnes : id, athlete_id, coach_id, session_id (nullable), exercise_name (nullable), last_message_at, created_at
- Contrainte UNIQUE sur (athlete_id, coach_id, session_id, exercise_name)
- Index sur athlete_id et coach_id
- Table `messages` avec colonnes : id, conversation_id, sender_id, content, is_read, created_at
- Index sur conversation_id + created_at
- Index partiel sur is_read = false

### 1.2 — Tables badges et user_badges (DB-003, DB-004)
- Table `badges` avec : id, code (UNIQUE), name, description, category, icon_svg, condition_type, condition_value, order_index
- Table `user_badges` avec : id, user_id, badge_id, unlocked_at, progress_value
- Contrainte UNIQUE sur (user_id, badge_id)

### 1.3 — Insertion des 25 badges (DB-003)
- Copier le contenu de `fyt-v3-badges-insert.sql`

### 1.4 — Migration athlete_comments (DB-005)
- Script de migration des commentaires existants vers conversations/messages
- Préserver timestamps et is_read
- Script idempotent

### 1.5 — RLS Policies (DB-006)
- Activer RLS sur conversations et messages
- Policies SELECT/INSERT/UPDATE selon rôle (athlete ou coach)
- Messages : seul le receiver peut modifier is_read

## Fichiers à générer
- [ ] `supabase/migrations/001_create_conversations_messages.sql`
- [ ] `supabase/migrations/002_create_badges_tables.sql`
- [ ] `supabase/migrations/003_insert_badges_data.sql`
- [ ] `supabase/migrations/004_migrate_comments.sql`
- [ ] `supabase/migrations/005_rls_policies.sql`

## Critères d'acceptation
1. Toutes les foreign keys avec ON DELETE CASCADE
2. Tous les index créés
3. Les 25 badges sont insérés avec leurs SVG complets
4. Script de migration idempotent
5. RLS activé et policies fonctionnelles

## Livrable
ZIP contenant les 5 fichiers SQL.
Message : "✅ Étape 1 complétée — Base de données" + liste des fichiers.
```

---

## [Étape 2 — Infrastructure Shared]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : OPUS 4.5                                               ║
║  ÉTAPE  : 2/14                                                   ║
║  US     : SHR-001, SHR-002, SHR-003, SHR-004, ATH-011            ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
Les tables DB sont créées (étape 1). Cette étape crée toute l'infrastructure partagée.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, sections `shared` et `athlete_badges` (ATH-011)
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Détection Device & Responsive"
- Badges : `fyt-v3-badges.json` pour les condition_types

## Objectif
Créer les types, services et hooks partagés entre athlète et coach.

## Sous-tâches

### 2.1 — Types TypeScript (SHR-002)
Ajouter dans `src/types.ts` :
- Interface `Conversation` (id, visibleId, coachId, sessionId?, exerciseName?, lastMessageAt, createdAt, unreadCount?, lastMessage?)
- Interface `Message` (id, conversationId, senderId, content, isRead, createdAt)
- Interface `Badge` (id, code, name, description, category, iconSvg, conditionType, conditionValue, orderIndex)
- Interface `UserBadge` (id, oderId, visibleId, unlockedAt?, progressValue)
- Type `BadgeCategory` = 'regularity' | 'endurance' | 'perseverance' | 'community' | 'exploration'
- Types Row pour mapping Supabase

### 2.2 — Service Messages (SHR-001)
Créer `src/services/messagesService.ts` avec :
- `fetchConversations(userId, role)` — avec unread_count et last_message
- `fetchMessages(conversationId)`
- `sendMessage(conversationId, senderId, content)` — met à jour last_message_at
- `markAsRead(messageIds)`
- `getUnreadCount(userId)`
- `createConversation(athleteId, coachId, sessionId?, exerciseName?)` — UPSERT

### 2.3 — Service Badges (ATH-011)
Créer `src/services/badgeService.ts` avec :
- `calculateStreakTolerant(userId)` — jours actifs avec tolérance 2j repos
- `calculateCumulativeHours(userId)`
- `calculateRPECount(userId, minRPE)`
- `checkComeback(userId, minDays)`
- `checkConsistency(userId, months)`
- `calculateMessageCount(userId)`
- `calculateUniqueExercises(userId)`
- `calculateSessionTypes(userId)`
- `checkStravaConnected(userId)`
- `calculateStravaImports(userId)`
- `getUserBadgesProgress(userId)` — calcule et retourne tous les badges avec progression
- `checkAndUnlockBadges(userId)` — débloque automatiquement si condition atteinte

### 2.4 — Hook useUnreadCount (SHR-003)
Créer `src/hooks/useUnreadCount.ts` :
- Fetch initial au mount
- Expose `{ count, refresh, loading }`
- Utilise userId depuis contexte auth

### 2.5 — Hook useDeviceDetect (SHR-004)
Créer `src/hooks/useDeviceDetect.ts` :
- Détection via navigator.userAgent
- Détection via media queries (pointer: coarse/fine)
- Expose `{ isMobile, isDesktop, hasTouch }`
- Re-calcul si resize (debounce 200ms)
- SSR-safe

## Fichiers à créer/modifier
- [ ] `src/types.ts` (extension)
- [ ] `src/services/messagesService.ts` (nouveau)
- [ ] `src/services/badgeService.ts` (nouveau)
- [ ] `src/hooks/useUnreadCount.ts` (nouveau)
- [ ] `src/hooks/useDeviceDetect.ts` (nouveau)

## Critères d'acceptation
1. Types stricts et complets
2. Services utilisent le client Supabase existant
3. Logique streak tolérante correcte (≤2 jours repos = série continue)
4. getUserBadgesProgress met à jour user_badges en DB
5. Hooks fonctionnels et typés
6. Gestion des erreurs avec try/catch

## Livrable
ZIP contenant les 5 fichiers.
Message : "✅ Étape 2 complétée — Infrastructure Shared" + liste des fichiers.
```

---

## [Étape 3 — Navigation & Layout]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 3/14                                                   ║
║  US     : ATH-002, COA-001                                       ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
L'infrastructure shared existe (étape 2).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `ATH-002` et `COA-001`
- Wireframes : `fyt-v3-wireframes-v2.md`, sections "Navigation Bottom Bar" et "Layout Principal Coach + Sidebar"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer les deux systèmes de navigation (mobile athlète + desktop coach) et les intégrer dans App.tsx.

## Sous-tâches

### 3.1 — Bottom Navigation Athlète (ATH-002)
Créer `src/components/BottomNavigation.tsx` :
- 4 onglets égaux (25%) : Accueil, Historique, Coach, Profil
- Icônes Lucide : Home, History, MessageSquare, User
- PAS de FAB
- Badge non-lus sur Coach (utilise useUnreadCount)
- Hauteur : 64px + env(safe-area-inset-bottom)
- Position fixed bottom
- Highlight onglet actif

### 3.2 — Sidebar Coach Auto-hide (COA-001)
Créer `src/components/CoachSidebar.tsx` :
- Fermée par défaut (width 0)
- Hamburger ☰ toujours visible (position fixed top-left)
- Ouverture : hover zone gauche (150ms) OU clic hamburger
- Fermeture : souris quitte (300ms), clic ✕, clic item, clic overlay
- Menu : Accueil, Importer, Mes Athlètes, Messages (avec badge), Paramètres
- Footer : infos coach + déconnexion
- Width : clamp(256px, 20vw, 320px)
- Transition : transform 300ms ease-out

### 3.3 — Intégration App.tsx
Modifier `src/App.tsx` :
- Utiliser useDeviceDetect pour choisir la navigation
- Mobile + role athlete → BottomNavigation
- Desktop + role coach → CoachSidebar
- Gestion du currentView pour navigation

## Fichiers à créer/modifier
- [ ] `src/components/BottomNavigation.tsx` (nouveau)
- [ ] `src/components/CoachSidebar.tsx` (nouveau)
- [ ] `src/App.tsx` (modification)

## Critères d'acceptation
1. Navigation conditionnelle selon device et rôle
2. Badge non-lus fonctionnel sur les deux navigations
3. Animations fluides (300ms)
4. Responsive (unités relatives)
5. Accessibilité : aria-labels sur les boutons

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 3 complétée — Navigation & Layout" + liste des fichiers.
```

---

## [Étape 4 — Accueil Athlète complet]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 4/14                                                   ║
║  US     : ATH-001, ATH-NEW-001, ATH-NEW-002                      ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
La navigation existe (étape 3). La page Home.tsx existe déjà avec SessionSelector.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, section `athlete_home`
- Wireframes : `fyt-v3-wireframes-v2.md`, sections "Écran ACCUEIL Athlète", "Modal Preview Séance Complète", "Vue Choisir ma séance", "Logique KPI"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Enrichir la page d'accueil athlète avec le KPI encouragement, la modal preview et la vue filtres avancés.

## Sous-tâches

### 4.1 — KPI Encouragement (ATH-001)
Créer `src/components/EncouragementKPI.tsx` :
- Logique prioritaire (7 conditions dans l'ordre) :
  1. Séance aujourd'hui → "Bravo pour cette séance ! 💪"
  2. X séances cette semaine (1, 2, 3+)
  3. Proche palier mensuel (8-9 → 10)
  4. Proche record mensuel (record - 2)
  5. Record égalé
  6. Nouveau record
  7. Fallback : "Prêt pour ta prochaine séance ?"
- Barre de progression visuelle
- Fetch stats depuis session_logs

### 4.2 — Modal Preview Séance (ATH-NEW-001)
Créer `src/components/SessionPreviewModal.tsx` :
- Trigger : clic sur SessionPreview existant
- Header : nom séance + bouton ✕
- Subtitle : nombre exercices + durée estimée
- Liste scrollable : tous les exercices avec détails (séries×reps, repos, tempo, notes)
- Footer : bouton "Démarrer cette séance"
- Fermeture : ✕, overlay, Escape
- Animation scale 0.95→1 + opacity
- max-height: 85dvh

### 4.3 — Vue Filtres Avancés (ATH-NEW-002)
Modifier `src/pages/Home.tsx` :
- Bouton "📂 Choisir ma séance" sous SessionPreview
- State `showAdvancedFilters` pour toggle
- Vue filtres : 4 dropdowns cascade (Année → Mois → Semaine → Séance)
- Preview se met à jour selon filtres
- Bouton "← Retour séance suggérée"

## Fichiers à créer/modifier
- [ ] `src/components/EncouragementKPI.tsx` (nouveau)
- [ ] `src/components/SessionPreviewModal.tsx` (nouveau)
- [ ] `src/pages/Home.tsx` (modification)

## Critères d'acceptation
1. KPI affiche le bon message selon priorité
2. Modal affiche tous les exercices de la séance
3. Filtres en cascade fonctionnels
4. Démarrage séance fonctionne depuis modal et vue filtres
5. Animations fluides
6. Responsive (unités relatives)

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 4 complétée — Accueil Athlète" + liste des fichiers.
```

---

## [Étape 5 — Historique Athlète]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 5/14                                                   ║
║  US     : ATH-003                                                ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
La page History.tsx existe déjà avec la liste des séances.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `ATH-003`
- Wireframes : `fyt-v3-wireframes-v2.md`, sections "Écran HISTORIQUE Athlète" et "État DÉPLIÉ du KPI"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Ajouter l'encart de stats agrandissable en haut de l'historique.

## Sous-tâches

### 5.1 — Composant HistoryKPICard
Créer `src/components/HistoryKPICard.tsx` :
- État replié : "📊 Ce mois: X séances • Yh • RPE Z" + chevron ▼
- État déplié :
  - Séances : X (+diff vs mois précédent)
  - Temps total : Yh (+diff)
  - RPE moyen : Z (tendance ▲▼●)
  - Exercices uniques : N
  - Record : "X séances en 1 semaine (SX)"
- Animation : height transition 300ms ease-out
- Tap toggle l'état

### 5.2 — Intégration History.tsx
- Placer HistoryKPICard en haut de la page
- Fetch données depuis session_logs pour le mois courant
- Calcul comparaison avec mois M-1

## Fichiers à créer/modifier
- [ ] `src/components/HistoryKPICard.tsx` (nouveau)
- [ ] `src/pages/History.tsx` (modification)

## Critères d'acceptation
1. Affichage condensé par défaut
2. Expand/collapse fluide
3. Données correctes et comparaison M-1
4. Tendances affichées (▲▼●)

## Livrable
ZIP contenant les 2 fichiers.
Message : "✅ Étape 5 complétée — Historique Athlète" + liste des fichiers.
```

---

## [Étape 6A — Coach Tab : Messages & Liste]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 6A/14                                                  ║
║  US     : ATH-004, ATH-005                                       ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
Le service messages existe (étape 2).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `ATH-004` et `ATH-005`
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Écran COACH (Onglet athlète)"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer l'onglet Coach avec le carrousel de messages et la liste des conversations.

## Sous-tâches

### 6A.1 — Carrousel Messages Coach (ATH-004)
Créer `src/components/CoachMessagesCarousel.tsx` :
- Swipe horizontal natif (CSS scroll-snap)
- Indicateurs dots
- Animation incitation swipe au premier affichage (keyframes translateX oscillant)
- Flag localStorage pour ne jouer l'animation qu'une fois
- Fetch depuis table week_organizer

### 6A.2 — Liste Conversations (ATH-005)
Créer `src/components/ConversationsList.tsx` :
- Liste triée par last_message_at DESC
- Chaque item : icône exercice, nom exercice, preview message tronqué, horodatage relatif
- Badge compteur non-lus par conversation
- Indicateurs : ✓ (envoyé), ✓✓ (lu), 🔴 (non lu reçu)
- Composant réutilisable (athlète ET coach)

### 6A.3 — Page CoachTab
Créer `src/pages/CoachTab.tsx` :
- Intégrer CoachMessagesCarousel en haut
- Intégrer ConversationsList en dessous
- Utiliser messagesService.fetchConversations

## Fichiers à créer
- [ ] `src/components/CoachMessagesCarousel.tsx` (nouveau)
- [ ] `src/components/ConversationsList.tsx` (nouveau)
- [ ] `src/pages/CoachTab.tsx` (nouveau)

## Critères d'acceptation
1. Carrousel swipable fluide
2. Animation hint jouée une seule fois
3. Liste conversations avec badges et statuts
4. Horodatage relatif (• 2h, • hier, • 3j)
5. Composant ConversationsList réutilisable

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 6A complétée — Coach Tab Messages & Liste" + liste des fichiers.
```

---

## [Étape 6B — Coach Tab : Thread & Intégration]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 6B/14                                                  ║
║  US     : ATH-006, ATH-007                                       ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
ConversationsList existe (étape 6A).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `ATH-006` et `ATH-007`
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Écran THREAD Conversation"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer la vue thread de conversation et l'intégrer dans ActiveSession.

## Sous-tâches

### 6B.1 — Vue Thread Conversation (ATH-006)
Créer `src/components/ConversationThread.tsx` :
- Header : nom exercice + bouton retour ←
- Contexte : "📅 Séance [nom] - [date]"
- Bulles messages : droite (moi) = bleu, gauche (autre) = gris
- Horodatage sous chaque message
- Statut sous messages envoyés (✓ ou ✓✓)
- Input message en bas + bouton envoyer ➤
- Auto-scroll au dernier message
- Marquer comme lu à l'ouverture (markAsRead)
- Composant réutilisable (athlète ET coach)

### 6B.2 — Intégration ActiveSession (ATH-007)
Modifier `src/components/ActiveSession.tsx` :
- Ajouter icône 💬 sur chaque exercice
- Clic → recherche conversation existante
- Si existe → ouvrir ConversationThread
- Sinon → créer via createConversation puis ouvrir
- State pour gérer l'affichage du thread

### 6B.3 — Navigation CoachTab → Thread
Modifier `src/pages/CoachTab.tsx` :
- Clic sur item ConversationsList → ouvre ConversationThread
- Gestion retour vers liste

## Fichiers à créer/modifier
- [ ] `src/components/ConversationThread.tsx` (nouveau)
- [ ] `src/components/ActiveSession.tsx` (modification)
- [ ] `src/pages/CoachTab.tsx` (modification)

## Critères d'acceptation
1. Thread affiche messages correctement (bulles alignées)
2. Envoi de message fonctionne
3. Messages marqués comme lus à l'ouverture
4. Création thread depuis ActiveSession fonctionne
5. Navigation fluide entre liste et thread

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 6B complétée — Coach Tab Thread & Intégration" + liste des fichiers.
```

---

## [Étape 7A — Profil : Infos & Settings]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 7A/14                                                  ║
║  US     : ATH-008, ATH-012                                       ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `ATH-008` et `ATH-012`
- Wireframes : `fyt-v3-wireframes-v2.md`, sections "Écran PROFIL Athlète" et "Modal Édition Profil"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer la section infos du profil avec modal d'édition et les préférences.

## Sous-tâches

### 7A.1 — Section Infos Profil (ATH-008)
Créer `src/components/ProfileInfoSection.tsx` :
- Affichage : avatar initiales, nom complet, username, email
- Bouton ✏️ ouvre modal

Créer `src/components/ProfileEditModal.tsx` :
- firstName et lastName : inputs modifiables
- username et email : readonly (grisés + 🔒)
- Textes d'aide sous champs readonly
- Bouton Sauvegarder → update profiles
- Validation : prénom et nom requis

### 7A.2 — Préférences Entraînement (ATH-012)
Créer `src/components/AthleteSettings.tsx` :
- 3 toggles : Afficher le tempo, Notes du coach, Timer repos auto
- PAS d'option son
- Stockage localStorage (clé: 'fyt_athlete_preferences')

### 7A.3 — Page ProfileTab
Créer `src/pages/ProfileTab.tsx` :
- Intégrer ProfileInfoSection
- Intégrer AthleteSettings
- Section Strava (existant)
- Bouton déconnexion

## Fichiers à créer
- [ ] `src/components/ProfileInfoSection.tsx` (nouveau)
- [ ] `src/components/ProfileEditModal.tsx` (nouveau)
- [ ] `src/components/AthleteSettings.tsx` (nouveau)
- [ ] `src/pages/ProfileTab.tsx` (nouveau)

## Critères d'acceptation
1. Distinction visuelle modifiable/readonly
2. Sauvegarde profil fonctionne
3. Préférences persistent en localStorage
4. Validation formulaire

## Livrable
ZIP contenant les 4 fichiers.
Message : "✅ Étape 7A complétée — Profil Infos & Settings" + liste des fichiers.
```

---

## [Étape 7B — Profil : Badges complet]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : OPUS 4.5                                               ║
║  ÉTAPE  : 7B/14                                                  ║
║  US     : ATH-009, ATH-010                                       ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
Le badgeService existe (étape 2). ProfileTab existe (étape 7A).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `ATH-009` et `ATH-010`
- Wireframes : `fyt-v3-wireframes-v2.md`, sections "🏆 Mes Badges" et "Modal Détail Badge"
- Badges : `fyt-v3-badges.json` pour les catégories et métadonnées
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer l'affichage complet des badges avec grille et modal détail.

## Sous-tâches

### 7B.1 — Grille Badges (ATH-009)
Créer `src/components/BadgesGrid.tsx` :
- 5 lignes par catégorie (Régularité, Endurance, Persévérance, Communauté, Exploration)
- Compteur par catégorie "●●●○○ 3/5"
- Badge débloqué : couleur + icône visible (SVG depuis icon_svg)
- Badge verrouillé : filter grayscale + opacity 0.3
- Compteur global "X/25 débloqués"
- Bouton "Voir tous les badges"
- Tap badge → ouvre BadgeModal
- Utilise badgeService.getUserBadgesProgress

### 7B.2 — Modal Détail Badge (ATH-010)
Créer `src/components/BadgeModal.tsx` :
- SVG badge 64×64 (scale up via viewBox)
- Nom du badge
- Description de la condition
- Si débloqué : "✅ Débloqué le [date]" + message félicitation
- Si verrouillé : barre progression "X/Y (Z%)" + "🎯 Plus que X !"
- Bouton Fermer
- Animation d'apparition

### 7B.3 — Intégration ProfileTab
Modifier `src/pages/ProfileTab.tsx` :
- Ajouter BadgesGrid entre ProfileInfoSection et AthleteSettings
- State pour BadgeModal (selectedBadge)

## Fichiers à créer/modifier
- [ ] `src/components/BadgesGrid.tsx` (nouveau)
- [ ] `src/components/BadgeModal.tsx` (nouveau)
- [ ] `src/pages/ProfileTab.tsx` (modification)

## Critères d'acceptation
1. Affichage correct des 25 badges par catégorie
2. Distinction visuelle débloqué/verrouillé
3. Progression calculée correctement
4. SVG upscalés proprement (pas de pixelisation)
5. Modal avec toutes les infos

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 7B complétée — Profil Badges" + liste des fichiers.
```

---

## [Étape 8 — Dashboard Coach complet]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 8/14                                                   ║
║  US     : COA-002, COA-003, COA-004                              ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
La sidebar coach existe (étape 3).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `COA-002`, `COA-003`, `COA-004`
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Écran ACCUEIL Coach"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer le dashboard coach complet avec KPIs, RPE par groupe et navigation.

## Sous-tâches

### 8.1 — Cards KPIs (COA-002)
Créer `src/components/DashboardKPIs.tsx` :
- 4 cards en grid : Athlètes, Non lus, RPE moyen (7j), Adhésion
- Icônes Lucide : Users, MessageSquare, Gauge, TrendingUp
- Grid responsive : repeat(4, 1fr)
- Fetch données Supabase

### 8.2 — RPE par Groupe (COA-003)
Créer `src/components/GroupRPECard.tsx` :
- Liste groupes : pastille couleur, nom, barre RPE, valeur, tendance
- Clic → expand/collapse (accordion)
- Vue expandée : tableau athlètes (nom, dernière séance, RPE, tendance)
- Un seul groupe ouvert à la fois
- Fetch depuis athlete_groups + session_logs

### 8.3 — Page CoachHome (COA-004)
Créer `src/pages/CoachHome.tsx` :
- Intégrer DashboardKPIs en haut
- Intégrer GroupRPECard au milieu
- Card "📋 Voir mes programmes" avec navigation
- Gestion currentView pour navigation

## Fichiers à créer
- [ ] `src/components/DashboardKPIs.tsx` (nouveau)
- [ ] `src/components/GroupRPECard.tsx` (nouveau)
- [ ] `src/pages/CoachHome.tsx` (nouveau)

## Critères d'acceptation
1. 4 KPIs affichés correctement
2. Accordion RPE fonctionnel
3. Tendances calculées (▲▼●)
4. Navigation vers programmes fonctionne
5. Responsive

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 8 complétée — Dashboard Coach" + liste des fichiers.
```

---

## [Étape 9A — Programmes : Vue & Filtres]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 9A/14                                                  ║
║  US     : COA-005, COA-006                                       ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `COA-005` et `COA-006`
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Écran PROGRAMMES Coach"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer la vue programmes avec filtres combinables et graphique d'évolution.

## Sous-tâches

### 9A.1 — Filtres Combinables (COA-005)
Créer `src/components/ProgramFilters.tsx` :
- 5 filtres : Année, Mois, Semaine (multi), Séance (multi), Exercice (autocomplete)
- Cascade : année → mois → semaine
- Logique AND (cumulatifs)
- Chips actifs avec ✕
- Bouton "Réinitialiser"
- Fetch dynamique options

### 9A.2 — Graphique Volume (COA-006)
Créer `src/components/VolumeChart.tsx` :
- LineChart Recharts
- X-axis : semaines
- Y-axis : volume (séries × reps)
- Données groupées selon filtres
- Responsive

Créer `src/services/programsService.ts` :
- `fetchPrograms(filters)` — requête avec filtres
- `calculateVolumeByWeek(programs)` — agrégation

### 9A.3 — Page ProgramsView
Créer `src/pages/ProgramsView.tsx` :
- ProgramFilters en haut
- VolumeChart au milieu
- Tableau données en bas (lecture seule pour cette étape)

## Fichiers à créer
- [ ] `src/components/ProgramFilters.tsx` (nouveau)
- [ ] `src/components/VolumeChart.tsx` (nouveau)
- [ ] `src/services/programsService.ts` (nouveau)
- [ ] `src/pages/ProgramsView.tsx` (nouveau)

## Critères d'acceptation
1. Filtres en cascade fonctionnels
2. Filtrage AND correct
3. Graphique se met à jour selon filtres
4. Chips actifs cliquables
5. Données correctes

## Livrable
ZIP contenant les 4 fichiers.
Message : "✅ Étape 9A complétée — Programmes Vue & Filtres" + liste des fichiers.
```

---

## [Étape 9B — Programmes : Editor complet]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : OPUS 4.5                                               ║
║  ÉTAPE  : 9B/14                                                  ║
║  US     : COA-010                                                ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
ProgramsView avec filtres existe (étape 9A).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `COA-010`
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Mode édition inline détaillé (COA-010)"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer l'éditeur complet de programmes avec toutes les fonctionnalités CRUD.

## Fonctionnalités à implémenter

### 9B.1 — Modes Lecture/Édition
- Toggle : [👁️ Lecture] / [✏️ Édition]
- Mode lecture : tableau readonly
- Mode édition : cellules éditables inline

### 9B.2 — Colonnes éditables
- Semaine : select 1-52
- Séance : select dynamique + saisie libre
- Exercice : autocomplete sur existants, requis
- Séries : number, min 1
- Reps : text libre (permet "8-12", "30s")
- Repos : number en secondes
- Actions : ↑↓✓✕🗑️

### 9B.3 — Actions par ligne
- ↑ : swap avec ligne précédente (order_index)
- ↓ : swap avec ligne suivante
- ✓ : valider modifications ligne
- ✕ : annuler modifications ligne
- 🗑️ : supprimer avec confirmation

### 9B.4 — Actions globales
- "+ Ajouter un exercice" : nouvelle ligne, hérite sem/séance
- "🗑️ Supprimer tout" : double confirmation (modal + texte "SUPPRIMER")
- "Annuler tout" : reset modifications
- "Sauvegarder tout (X modif)" : batch update

### 9B.5 — Validation & Feedback
- Séries > 0, reps non vide, repos >= 0, exercice requis
- Lignes modifiées : background jaune
- Lignes erreur : background rouge + message
- Toast succès après save
- Refresh données après save

## Fichiers à créer/modifier
- [ ] `src/components/ProgramEditor.tsx` (nouveau)
- [ ] `src/pages/ProgramsView.tsx` (intégration)

## Critères d'acceptation
1. Toggle modes fonctionne
2. Édition inline fluide
3. Réordonnancement ↑↓ fonctionne
4. Validation temps réel
5. Batch save vers Supabase
6. Double confirmation pour suppression programme
7. Feedback visuel clair

## Livrable
ZIP contenant les 2 fichiers.
Message : "✅ Étape 9B complétée — ProgramEditor" + liste des fichiers.
```

---

## [Étape 10 — Import Wizard complet]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 10/14                                                  ║
║  US     : COA-007, COA-008, COA-009                              ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `COA-007`, `COA-008`, `COA-009`
- Wireframes : `fyt-v3-wireframes-v2.md`, section "Écran IMPORT Coach"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer l'assistant complet d'import CSV en 3 étapes.

## Sous-tâches

### 10.1 — Structure Wizard (COA-007)
Créer `src/components/ImportWizard.tsx` :
- Barre progression 3 étapes (done/active/pending)
- Navigation Suivant/Retour
- État persistant entre étapes

### 10.2 — Étape 1 : Templates (COA-008)
- 2 cards téléchargement :
  - Template vide : headers uniquement
  - Template exemple : 15-20 lignes variées
- Colonnes : year, week, seance_type, exercise_name, order_index, target_sets, target_reps, rest_time_sec, Tempo, Notes/Consignes
- Génération côté client (Blob + download)
- Fichiers : fyt_template_vide.csv, fyt_template_exemple.csv

### 10.3 — Étape 2 : Instructions
- Texte explicatif concis
- Liste des colonnes attendues
- Tips de formatage

### 10.4 — Étape 3 : Upload & Preview (COA-009)
Créer `src/components/CSVPreview.tsx` :
- Zone drag & drop + bouton Parcourir
- Parsing CSV (Papaparse)
- Tableau preview 5 premières lignes
- Compteurs : ✅ lignes valides, ⚠️ warnings, ❌ erreurs
- Règles validation :
  - year, week : requis, entiers
  - seance_type, exercise_name : requis
  - rest_time_sec : optionnel, défaut 60
- Bouton "Importer X lignes" (disabled si erreurs)
- Import effectif vers training_plans

## Fichiers à créer
- [ ] `src/components/ImportWizard.tsx` (nouveau)
- [ ] `src/components/CSVPreview.tsx` (nouveau)
- [ ] `src/pages/ImportView.tsx` (nouveau ou refactoring)

## Critères d'acceptation
1. Wizard 3 étapes navigable
2. Templates générés correctement
3. Parsing CSV fonctionne
4. Validation avec feedback clair
5. Import effectif en DB

## Livrable
ZIP contenant les 3 fichiers.
Message : "✅ Étape 10 complétée — Import Wizard" + liste des fichiers.
```

---

## [Étape 11 — Messages & Settings Coach]

```
╔══════════════════════════════════════════════════════════════════╗
║  MODÈLE : SONNET 4.5                                             ║
║  ÉTAPE  : 11/14                                                  ║
║  US     : COA-011, COA-012, COA-013, COA-014                     ║
╚══════════════════════════════════════════════════════════════════╝

## Contexte
Tu travailles sur F.Y.T, une application fitness React/TypeScript/Vite/Tailwind/Supabase.
ConversationsList et ConversationThread existent (étape 6).

## Documents de référence
- User Stories : `fyt-v3-user-stories-v2.yaml`, US `COA-011` à `COA-014`
- Wireframes : `fyt-v3-wireframes-v2.md`, sections "Écran MESSAGES Coach" et "Écran PARAMÈTRES Coach"
- Style CSS : `[gemini-visual-guide.md]`

## Objectif
Créer l'écran Messages dédié et les paramètres coach.

## Sous-tâches

### 11.1 — Écran Messages Coach (COA-011)
Créer `src/pages/CoachMessagesView.tsx` :
- Header "Messages"
- Barre recherche + filtre dropdown par athlète
- Compteur non-lus total
- Réutilise ConversationsList
- Clic → ConversationThread

### 11.2 — Réponse Coach dans Thread (COA-012)
- Vérifier que ConversationThread fonctionne pour le coach
- Messages du coach (moi) à droite
- Messages de l'athlète à gauche
- Navigation retour vers CoachMessagesView

### 11.3 — Préférences Coach (COA-013)
Créer `src/components/CoachSettings.tsx` :
- 3 toggles : Afficher le tempo, Notes, Timer repos auto
- PAS d'option son
- Stockage localStorage (clé: 'fyt_coach_preferences')

### 11.4 — Page Settings (COA-014)
Créer `src/pages/SettingsView.tsx` :
- Section Profil (réutilise ProfileInfoSection adapté)
- Section Préférences (CoachSettings)
- Section Intégrations (Strava existant)
- Section Données (export CSV)
- Section Session (déconnexion)

## Fichiers à créer/modifier
- [ ] `src/pages/CoachMessagesView.tsx` (nouveau)
- [ ] `src/components/CoachSettings.tsx` (nouveau)
- [ ] `src/pages/SettingsView.tsx` (nouveau)
- [ ] `src/components/ConversationThread.tsx` (vérification/ajustement)

## Critères d'acceptation
1. Messages coach accessible depuis sidebar
2. Filtre par athlète fonctionne
3. Thread fonctionne pour le coach
4. Préférences persistent
5. Tous les éléments Settings présents

## Livrable
ZIP contenant les 4 fichiers.
Message : "✅ Étape 11 complétée — Messages & Settings Coach" + liste des fichiers.
```

---

## 📝 NOTES D'UTILISATION

### Workflow recommandé

1. **Avant chaque étape** :
   - Vérifier les dépendances dans le tableau
   - Préparer les documents de référence
   - Noter le modèle requis (Opus ou Sonnet)

2. **Pour chaque conversation IA** :
   - Copier le prompt complet de l'étape
   - Fournir les documents référencés
   - Attendre le ZIP

3. **Après réception du ZIP** :
   - Intégrer les fichiers dans le projet
   - Tester rapidement
   - Valider avant de passer à l'étape suivante

4. **En cas de bug** :
   - Créer une conversation dédiée pour le fix
   - Référencer l'étape et le fichier concerné

### Conseils d'optimisation

| Conseil | Raison |
|---------|--------|
| Ne pas splitter les prompts | Chaque nouveau message = overhead contexte |
| Fournir tous les docs en une fois | Évite les allers-retours |
| Valider avant de continuer | Évite les effets cascade de bugs |
| Étapes Opus en priorité | Plus complexes, mieux de les faire reposé |

### Ordre d'exécution recommandé

```
Jour 1 : Étapes 1, 2 (fondations)
Jour 2 : Étapes 3, 4, 5 (athlète base)
Jour 3 : Étapes 6A, 6B (messaging)
Jour 4 : Étapes 7A, 7B (profil complet)
Jour 5 : Étapes 8, 9A (coach base)
Jour 6 : Étapes 9B, 10 (programmes)
Jour 7 : Étape 11 + tests finaux
```

---

## 📊 COMPARAISON AVANT/APRÈS

| Métrique | Avant | Après | Réduction |
|----------|-------|-------|-----------|
| Nombre d'étapes | 32 | 14 | -56% |
| Nombre de ZIPs | 32 | 14 | -56% |
| Étapes Opus | ~10 | 3 | -70% |
| Conversations IA | 32 | 14 | -56% |

**Estimation tokens économisés** : ~40% (moins de contexte répété, moins d'overhead ZIP)
