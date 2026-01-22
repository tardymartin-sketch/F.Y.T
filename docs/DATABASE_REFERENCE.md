# F.Y.T - Référence Base de Données Supabase

*Dernière mise à jour : Janvier 2026*

---

## Tables (24)

### Tables Principales

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `profiles` | 10 | ✅ | Utilisateurs (id, email, username, first_name, last_name, role, coach_id, **weight**, created_at, updated_at) |
| `exercises` | 12 | ✅ | Catalogue exercices (+ limb_type, primary_muscle_group_id, movement_pattern_id) |
| `training_plans` | 19 | ✅ | Programmes d'entraînement |
| `session_logs` | 11 | ✅ | Séances (exercises JSONB écrit mais jamais lu, **deleted_at** pour soft delete) |
| `exercise_logs` | 28 | ✅ | Analytics dénormalisés (backup_temp supprimé, **deleted_at** ajouté, **estimated_1rm** ajouté) |

### Tables Référentielles (sans RLS - publiques)

| Table | Colonnes | Description |
|-------|----------|-------------|
| `muscle_groups` | 4 | 17 groupes musculaires (id, code, name_fr, name_en) |
| `muscles` | 5 | 66 muscles individuels |
| `movement_patterns` | 4 | 26 patterns de mouvement |
| `equipment` | 4 | 24 types d'équipement |
| `exercise_muscles` | 3 | Jonction exercises↔muscles (role: primary/secondary) |
| `exercise_equipment` | 2 | Jonction exercises↔equipment |

### Tables Organisation

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `athlete_groups` | 7 | ✅ | Groupes d'athlètes (coach_id, name, description, color) |
| `athlete_group_members` | 4 | ✅ | Membres des groupes |
| `athlete_comments` | 7 | ✅ | Notes/commentaires sur athlètes |
| `week_organizer` | 10 | ✅ | Planning hebdomadaire coach |

### Tables Agrégées (gérées par triggers)

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `athlete_stats` | 5 | ✅ | Stats agrégées (message_count, cumulative_minutes, unique_exercise_count) |
| `athlete_exercises` | 5 | ✅ | Exercices par athlète (performed_session_count, last_performed_at) |

### Tables Gamification

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `badges` | 10 | ✅ | Définition des badges |
| `user_badges` | 6 | ✅ | Progression et badges débloqués |

### Tables Communication

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `conversations` | 7 | ✅ | Conversations coach↔athlète |
| `messages` | 6 | ✅ | Messages dans conversations |

### Tables Intégration Strava

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `strava_connections` | 14 | ✅ | Connexions OAuth |
| `strava_activities` | 37 | ✅ | Activités importées |
| `strava_webhook_events` | 14 | ❌ | Événements webhook (interne) |

### Tables Système

| Table | Colonnes | RLS | Description |
|-------|----------|-----|-------------|
| `exercise_versions` | 12 | ✅ | Historique versions exercices (NEW) |
| `audit_logs` | 7 | ✅ | Logs d'audit (admin only) (NEW) |

---

## Enums

```sql
-- load_type
'numeric' | 'additive' | 'bodyweight' | 'assisted'
```

---

## Fonctions SQL Personnalisées

| Fonction | Signature | Usage |
|----------|-----------|-------|
| `parse_reps` | `(text) → int` | "2x8" → 16 |
| `parse_weight` | `(text) → decimal` | "20+10" → 30 |
| `parse_time_to_seconds` | `(text) → int` | "1:30" → 90 |
| `detect_load_type` | `(text) → load_type` | Classifier poids |
| `detect_exercise_type` | `(text) → text` | 'reps' ou 'time' |
| `get_analytics_category` | `(text) → text` | movement_pattern → catégorie |
| `get_majority_load_type` | `(jsonb) → load_type` | Type majoritaire sets |
| `get_majority_exercise_type` | `(jsonb) → text` | Type majoritaire sets |
| `check_and_unlock_badge` | `(uuid, text, int) → bool` | Vérifier/débloquer badge |
| `is_admin` | `() → bool` | Helper RLS |
| `is_coach` | `(uuid) → bool` | Helper RLS |
| `is_athlete` | `(uuid) → bool` | Helper RLS |
| `get_my_coach_id` | `() → uuid` | Coach de l'utilisateur courant |
| `get_my_role` | `() → text` | Rôle utilisateur courant |
| `rebuild_athlete_aggregates` | `(uuid) → void` | Recalculer stats |
| `ensure_athlete_stats` | `(uuid) → void` | Créer stats si absent |
| `check_message_visibility` | `(uuid, uuid) → bool` | Visibilité week_organizer |
| `exercise_is_performed` | `(jsonb) → bool` | Exercice effectué? |
| `session_performed_exercise_names` | `(jsonb) → text` | Noms exercices effectués |
| `calculate_estimated_1rm` | `(decimal, int) → decimal` | Formule Epley: weight × (1 + reps/30) |
| `get_best_1rm_from_sets` | `(jsonb) → decimal` | Meilleur 1RM estimé depuis sets_detail |
| `migrate_weight_to_load` | `(text) → jsonb` | Migration weight texte vers load JSONB |

---

## Triggers

| Trigger | Table | Event | Action |
|---------|-------|-------|--------|
| `trg_session_logs_after_insert` | session_logs | INSERT | MAJ athlete_stats + athlete_exercises |
| `trg_session_logs_after_update` | session_logs | UPDATE | MAJ athlete_stats + athlete_exercises |
| `trg_session_logs_after_delete` | session_logs | DELETE | MAJ athlete_stats + athlete_exercises |
| `trg_athlete_comments_after_*` | athlete_comments | ALL | MAJ message_count |
| `exercises_updated_at` | exercises | UPDATE | MAJ updated_at |
| `exercises_version_on_update` | exercises | UPDATE | Auto-version dans exercise_versions (NEW) |
| `update_athlete_groups_updated_at` | athlete_groups | UPDATE | MAJ updated_at |
| `trigger_update_last_message` | messages | INSERT | MAJ last_message_at |
| `trigger_update_strava_sync_timestamp` | strava_activities | INSERT | MAJ last_sync_at |

---

## Index Principaux

### exercise_logs (12 index)
- `idx_exercise_logs_user_date` (user_id, date DESC)
- `idx_exercise_logs_user_exercise` (user_id, exercise_name)
- `idx_exercise_logs_user_year_week` (user_id, year, week)
- `idx_exercise_logs_analytics_category` (user_id, analytics_category, date)
- `idx_exercise_logs_session` (session_log_id)
- `idx_exercise_logs_order` (session_log_id, exercise_order)
- `idx_exercise_logs_muscle_group` (user_id, muscle_group_id)
- `idx_exercise_logs_movement_pattern` (user_id, movement_pattern_id)
- `idx_exercise_logs_load_type` (user_id, load_type)
- `idx_exercise_logs_exercise_id` (exercise_id) WHERE NOT NULL
- `idx_exercise_logs_1rm` (user_id, exercise_name, estimated_1rm DESC) — Requêtes PR

### training_plans (4 index)
- `idx_training_plans_coach_id`
- `idx_training_plans_athlete_target` (GIN)
- `idx_training_plans_exercise_id`
- `idx_training_plans_week_dates`

### Contraintes UNIQUE notables
- `exercises`: (name, coach_id)
- `badges`: (code)
- `user_badges`: (user_id, badge_id)
- `conversations`: (athlete_id, coach_id, session_id, exercise_name)

---

## Contraintes CHECK

| Table | Contrainte | Règle |
|-------|------------|-------|
| `exercise_logs` | rpe_check | rpe BETWEEN 1 AND 10 |
| `session_logs` | session_rpe_check | session_rpe BETWEEN 1 AND 10 |
| `badges` | category_check | IN ('regularity', 'endurance', 'perseverance', 'community', 'exploration') |
| `badges` | condition_type_check | IN ('streak_tolerant', 'cumulative_hours', ...) |
| `exercises` | limb_type_check | IN ('unilateral', 'bilateral', 'both') |
| `profiles` | role_check | IN ('admin', 'coach', 'athlete') |
| `week_organizer` | visibility_type_check | IN ('all', 'groups', 'athletes') |

---

## Foreign Keys avec CASCADE

| De | Vers | ON DELETE |
|----|------|-----------|
| exercise_logs.session_log_id | session_logs.id | CASCADE |
| exercise_logs.user_id | profiles.id | CASCADE |
| athlete_comments.user_id | profiles.id | CASCADE |
| athlete_group_members.* | athlete_groups/profiles | CASCADE |
| user_badges.* | badges/profiles | CASCADE |
| messages.conversation_id | conversations.id | CASCADE |

---

## Changelog Structure

### Janvier 2026
- ✅ Ajout `profiles.weight` (DECIMAL 5,2)
- ✅ Suppression `exercise_logs.backup_temp`
- ✅ Ajout table `exercise_versions` + trigger auto-version
- ✅ Ajout `session_logs.deleted_at` (soft delete)
- ✅ Ajout `exercises.deleted_at` (soft delete)
- ✅ Ajout table `audit_logs`
- ✅ Migration `sets_detail.weight` → `sets_detail.load` JSONB (types: single, double, barbell, machine, assisted, distance)
- ✅ Ajout `exercise_logs.estimated_1rm` (DECIMAL 8,2) — 1RM estimé via formule Epley
- ✅ Ajout fonction `calculate_estimated_1rm(weight, reps)`
- ✅ Ajout fonction `get_best_1rm_from_sets(sets_detail)`
- ✅ Ajout fonction `migrate_weight_to_load(weight)`
- ✅ Ajout index `idx_exercise_logs_1rm` pour requêtes PR
