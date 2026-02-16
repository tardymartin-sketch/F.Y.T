# Plan - Mode Démo Application F.Y.T

## Objectif
Créer un mode démo permettant de présenter l'application avec un guide interactif, accessible via un lien dédié, utilisant des données de démonstration.

---

## 1. Architecture proposée

### 1.1 Accès à la démo

**Lien dédié avec session unique**
```
https://app.fyt.com/demo
→ Redirige vers: https://app.fyt.com?demo_session=<uuid>
```

- Pas besoin de créer de compte
- Chaque visiteur obtient son propre "sandbox" isolé
- Données personnelles, modifiables sans impacter les autres
- **Auto-expiration après 24h**

### 1.2 Base de données démo - Sessions isolées

**Approche: Une session démo = un jeu de données temporaire**

```
Clic "Démo"
    ↓
Génère demo_session_id (UUID)
    ↓
Crée profil athlète temporaire (demo_athlete_<uuid>)
    ↓
Copie les données de seed vers ce profil
    ↓
Stocke dans table demo_sessions (id, created_at)
    ↓
Login automatique sur ce profil
```

**Nettoyage automatique (Supabase Edge Function - cron)**
```sql
-- Exécuté toutes les heures
DELETE FROM demo_sessions WHERE created_at < NOW() - INTERVAL '24 hours';
-- Cascade delete sur les données liées
```

**Table `demo_sessions`**
```sql
CREATE TABLE demo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);
```

**Avantages:**
- Isolation totale entre visiteurs
- Chaque démo = expérience "propre"
- Pas de pollution de données
- Nettoyage automatique

---

## 2. Système de guide interactif (Onboarding Tour)

### 2.1 Composant `DemoTour`

Un overlay guidé qui met en surbrillance les éléments clés avec explications.

```typescript
interface TourStep {
  id: string;
  target: string;           // Sélecteur CSS ou ref
  title: string;
  description: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'scroll' | 'wait';
  nextTrigger?: 'click' | 'auto' | 'manual';
}
```

### 2.2 Parcours Athlète (7-10 étapes)

1. **Accueil** - "Bienvenue! Voici votre tableau de bord avec les séances de la semaine"
2. **Carousel messages** - "Les messages de votre coach apparaissent ici"
3. **Sélection séance** - "Cliquez sur une séance pour voir le détail"
4. **Preview séance** - "Visualisez les exercices avant de commencer"
5. **Séance active** - "Pendant l'entraînement, entrez vos performances"
6. **Input exercice** - "Renseignez poids, répétitions et RPE"
7. **Historique** - "Retrouvez toutes vos séances passées"
8. **Statistiques** - "Suivez vos records personnels et progressions"
9. **Messages coach** - "Communiquez avec votre coach"
10. **Profil** - "Gérez vos informations personnelles"

> **Note**: Le parcours Coach pourra être ajouté ultérieurement.

### 2.3 UI du guide

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐    │
│  │ [Élément mis en surbrillance]       │    │
│  └─────────────────────────────────────┘    │
│                    │                        │
│                    ▼                        │
│  ┌─────────────────────────────────────┐    │
│  │ 📍 Étape 3/10                       │    │
│  │                                     │    │
│  │ **Sélection de séance**             │    │
│  │                                     │    │
│  │ Cliquez sur une séance pour voir    │    │
│  │ les exercices prévus et commencer   │    │
│  │ votre entraînement.                 │    │
│  │                                     │    │
│  │ [← Précédent]  [Suivant →]  [Passer]│    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 3. Données de démonstration (Athlète uniquement)

### 3.1 Profils

```typescript
// Coach fictif (existe en BDD, pas de login)
const DEMO_COACH_ID = 'demo-coach-permanent-uuid';

// Athlète démo (créé à chaque session)
{
  id: `demo-athlete-${sessionId}`,
  username: 'Athlete Demo',
  firstName: 'Thomas',
  lastName: 'Martin',
  role: 'athlete',
  coachId: DEMO_COACH_ID,
  weight: 75,
  is_demo: true  // Flag pour identifier les comptes démo
}
```

### 3.2 Historique de séances (6 semaines)

- **Semaine -6 à -1**: 3-4 séances/semaine avec progression
- Variété: Upper, Lower, Full Body, Cardio
- RPE réalistes (6-9)
- PRs progressifs sur exercices clés

### 3.3 Exercices et templates

- 20-30 exercices de base (squat, bench, deadlift, etc.)
- 4-5 templates de séances types
- Vidéos de démonstration liées

### 3.4 Messages et interactions

- 2-3 messages "Organisateur semaine" du coach
- Quelques commentaires athlète sur exercices
- Réponses du coach

### 3.5 Badges débloqués

- 3-4 badges débloqués pour montrer le système
- Progression visible sur d'autres badges

---

## 4. Implémentation technique

### 4.1 Nouveaux fichiers à créer

```
src/
├── demo/
│   ├── DemoProvider.tsx        # Context pour le mode démo
│   ├── DemoTour.tsx            # Composant du guide
│   ├── DemoTooltip.tsx         # Bulle d'explication
│   ├── DemoHighlight.tsx       # Surbrillance d'élément
│   ├── demoSteps.ts            # Définition des étapes
│   ├── demoData.ts             # Données de seed
│   └── useDemoMode.ts          # Hook pour gérer le mode démo
```

### 4.2 Modifications existantes

1. **App.tsx**
   - Détecter `?mode=demo` ou route `/demo`
   - Wrapper avec `DemoProvider`
   - Auto-login si mode démo

2. **Auth.tsx**
   - Bouton "Essayer la démo" sur l'écran de connexion
   - Bypass d'authentification en mode démo

3. **supabaseService.ts**
   - Fonction `initDemoData()` pour créer/réinitialiser les données
   - Flag `isDemo` pour filtrer les opérations

### 4.3 Script de seed

```sql
-- migrations/demo_seed.sql
-- Créer les profils démo
-- Insérer l'historique de séances
-- Créer les templates
-- Ajouter les messages
-- Initialiser les badges
```

---

## 5. Fonctionnalités du mode démo

### 5.1 Indicateur visuel permanent

Bannière discrète en haut de l'écran:
```
┌─────────────────────────────────────────────┐
│ 🎯 Mode Démo - [Relancer le guide] [Créer un compte] │
└─────────────────────────────────────────────┘
```

### 5.2 Restrictions en mode démo

- Pas de modification des credentials
- Pas de connexion Strava réelle
- Données réinitialisées régulièrement
- Pas d'envoi d'emails

### 5.3 Boutons d'action

- **"Créer mon compte"** - Redirige vers inscription
- **"Relancer le guide"** - Recommence le tour
- **"Passer en mode coach"** - Switch de rôle pour voir les deux vues

---

## 6. Phases d'implémentation

### Phase 1 - Infrastructure démo ✅ TERMINÉE
- [x] Table `demo_sessions` + migration → `migrations/demo_sessions_migration.sql`
- [x] Edge Function de nettoyage (cron 24h) → Code inclus dans la migration
- [x] Service `demoService.ts` (création session, copie données) → `src/services/demoService.ts`
- [x] Données de seed athlète réalistes (6 semaines d'historique)
- [x] Génération session UUID au clic

### Phase 2 - Intégration UI ✅ TERMINÉE
- [x] Bouton "Essayer la démo" sur écran login → `src/components/common/Auth.tsx`
- [x] Auto-login sur profil démo créé
- [x] Bannière mode démo permanente → `src/components/common/DemoBanner.tsx`
- [x] Bouton "Créer un vrai compte" dans la bannière
- [x] Intégration dans App.tsx

### Phase 3 - Guide interactif ⏳ EN ATTENTE
- [ ] Installer React Joyride (`npm install react-joyride`)
- [ ] Composant `DemoTour` avec React Joyride
- [ ] Définition des 10 étapes athlète
- [ ] Tooltips et highlights
- [ ] Bouton "Relancer le guide" (déjà prévu dans DemoBanner)

### Phase 4 - (Futur) Mode Coach ⏳ EN ATTENTE
- [ ] Parcours coach
- [ ] Switch athlète/coach

---

## 6.1 Fichiers créés/modifiés

### Nouveaux fichiers
| Fichier | Description |
|---------|-------------|
| `migrations/demo_sessions_migration.sql` | Migration SQL + fonction cleanup |
| `src/services/demoService.ts` | Service complet avec seed de données |
| `src/components/common/DemoBanner.tsx` | Bannière mode démo |

### Fichiers modifiés
| Fichier | Modifications |
|---------|---------------|
| `src/components/common/Auth.tsx` | Bouton "Essayer la démo" + logique |
| `App.tsx` | Import DemoBanner + affichage conditionnel |

---

## 7. Librairies suggérées pour le tour

### Option 1 - React Joyride (Recommandé)
```bash
npm install react-joyride
```
- Populaire, bien maintenu
- Bon support mobile
- Personnalisable

### Option 2 - Shepherd.js
```bash
npm install shepherd.js
```
- Plus flexible
- Meilleur contrôle sur les animations

### Option 3 - Custom (maison)
- Contrôle total
- Plus de travail initial
- Adapté exactement à nos besoins

---

## 8. Décisions prises

| Question | Décision |
|----------|----------|
| Durée de vie des données | **24h** après création, puis suppression auto |
| Isolation des données | **Session unique** par visiteur (UUID) |
| Mode affiché | **Athlète uniquement** (coach en v2) |
| Hébergement | Même instance, flag `is_demo` sur les profils |

## 9. Questions ouvertes restantes

1. **Tracking analytics?**
   - Mesurer l'engagement avec la démo?
   - Funnel vers inscription?

2. **Limitation des actions?**
   - Bloquer certaines actions (ex: suppression de compte)?
   - Nombre max de séances créées?

---

## 10. Prochaines étapes

### Terminé ✅
1. ✅ Valider l'approche (sessions isolées 24h, athlète only)
2. ✅ Créer la migration `demo_sessions` + Edge Function cron
3. ✅ Implémenter `demoService.ts` avec données de seed
4. ✅ Intégrer dans l'UI (bouton login, bannière, auto-login)

### À faire - Déploiement
5. ⏳ **Exécuter la migration SQL** dans Supabase Dashboard
6. ⏳ **Créer l'Edge Function** cron pour le nettoyage auto (code dans migration)
7. ⏳ **Tester le flux complet** (clic démo → données → navigation)

### À faire - Phase 3
8. ⏳ Installer React Joyride (`npm install react-joyride`)
9. ⏳ Créer le composant DemoTour avec les 10 étapes
10. ⏳ Intégrer le tour au premier lancement de la démo
