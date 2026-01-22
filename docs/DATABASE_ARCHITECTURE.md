# Architecture Base de Données F.Y.T

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARCHITECTURE DES DONNÉES                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   profiles   │     │muscle_groups │     │movement_patterns │
│  (users)     │     │              │     │                  │
└──────┬───────┘     └──────┬───────┘     └────────┬─────────┘
       │                    │                      │
       │              ┌─────┴──────────────────────┴─────┐
       │              │                                  │
       │              ▼                                  │
       │     ┌──────────────┐                           │
       │     │  exercises   │◄──────────────────────────┘
       │     │ (catalogue)  │
       │     └──────┬───────┘
       │            │
       │            │ exercise_id
       │            ▼
       │     ┌──────────────┐
       │     │exercise_logs │ ◄── Dénormalisée pour analytics
       │     │(1 par exo/   │     (copie muscle_group_name, etc.)
       │     │ séance)      │
       │     └──────┬───────┘
       │            │
       │            │ session_log_id
       │            ▼
       └────►┌──────────────┐
             │ session_logs │ ◄── Contient aussi exercises[] en JSONB
             │ (1 par       │     (source de vérité pour les sets)
             │  séance)     │
             └──────────────┘
```

---

## Tables et Relations

### 1. `profiles` (utilisateurs)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | ID utilisateur (= auth.uid()) |
| first_name | TEXT | Prénom |
| last_name | TEXT | Nom |
| role | TEXT | 'athlete' ou 'coach' |
| coach_id | UUID FK | Coach assigné (si athlète) |
| weight | DECIMAL | Poids utilisateur (pour volume bodyweight) |

---

### 2. `muscle_groups` (groupes musculaires)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name_fr | TEXT UNIQUE | "Pectoraux", "Dos", "Quadriceps" |
| name_en | TEXT | "Chest", "Back", "Quadriceps" |

**Valeurs prédéfinies:** Pectoraux, Dos, Épaules, Biceps, Triceps, Quadriceps, Ischio-jambiers, Fessiers, Mollets, Abdominaux, etc.

---

### 3. `movement_patterns` (patterns de mouvement)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| code | TEXT UNIQUE | `horizontal_push`, `squat`, `hinge` |
| name_fr | TEXT | "Poussée horizontale", "Squat" |

**Mapping vers analytics_category:**
| Code | Catégorie |
|------|-----------|
| horizontal_push, vertical_push, elbow_extension | `push` |
| horizontal_pull, vertical_pull, elbow_flexion | `pull` |
| squat, lunge, step_up, leg_extension | `legs_squat` |
| hinge, hip_thrust, leg_curl | `legs_hinge` |
| anti_extension, anti_rotation, flexion, rotation | `core` |
| autres | `other` |

---

### 4. `exercises` (catalogue d'exercices)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| name | TEXT | Nom de l'exercice |
| coach_id | UUID FK | Coach propriétaire |
| **primary_muscle_group_id** | UUID FK → muscle_groups | Groupe musculaire principal |
| **movement_pattern_id** | UUID FK → movement_patterns | Pattern de mouvement |
| **limb_type** | TEXT | `bilateral`, `unilateral`, `asymmetrical` |
| video_url | TEXT | URL vidéo démo |
| coach_instructions | TEXT | Instructions du coach |
| tempo | TEXT | Tempo d'exécution |

**IMPORTANT:** Ces 3 colonnes doivent être renseignées pour que la catégorisation fonctionne dans `exercise_logs`.

---

### 5. `session_logs` (séances enregistrées)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| user_id | UUID FK → profiles | Athlète |
| date | DATE | Date de la séance |
| session_key_year | INT | Année |
| session_key_week | INT | Semaine |
| session_key_name | TEXT | Nom de la séance |
| **exercises** | JSONB | Array des exercices avec sets (source de vérité) |
| status | TEXT | 'completed', 'in_progress' |

**Structure du JSONB `exercises`:**
```json
[
  {
    "exerciseId": "uuid-xxx",
    "exerciseName": "Développé couché",
    "sets": [
      {"setNumber": 1, "reps": "8", "weight": "80", "completed": true},
      {"setNumber": 2, "reps": "8", "weight": "85", "completed": true}
    ],
    "rpe": 8,
    "notes": "Bonne sensation"
  }
]
```

---

### 6. `exercise_logs` (logs dénormalisés pour analytics)
| Colonne | Type | Description |
|---------|------|-------------|
| id | UUID PK | |
| session_log_id | UUID FK → session_logs | **CASCADE DELETE** |
| user_id | UUID FK → profiles | |
| exercise_id | UUID FK → exercises | Peut être NULL |
| **exercise_order** | INT | Ordre dans la séance (1, 2, 3...) |
| **exercise_type** | TEXT | `reps` ou `time` |
| exercise_name | TEXT | Dénormalisé |
| date | DATE | Dénormalisé |
| year, week | INT | Dénormalisé |
| load_type | ENUM | `numeric`, `additive`, `bodyweight`, `assisted` |
| limb_type | TEXT | Copié depuis exercises |
| **muscle_group_id** | UUID FK | Copié depuis exercises |
| **muscle_group_name** | TEXT | Dénormalisé pour perf |
| **movement_pattern_id** | UUID FK | Copié depuis exercises |
| **movement_pattern_name** | TEXT | Dénormalisé pour perf |
| **analytics_category** | TEXT | Calculé depuis movement_pattern.code |
| sets_count | INT | Nombre de sets |
| total_reps | INT | Reps totales (ou secondes si time) |
| max_weight | DECIMAL | Charge max |
| total_volume | DECIMAL | Tonnage (reps × poids) |
| sets_detail | JSONB | Copie enrichie des sets |

---

## Flux de données

### Sauvegarde d'une séance

```
1. L'athlète termine sa séance
   │
   ▼
2. saveSessionLog() est appelé
   │
   ├── INSERT/UPDATE dans session_logs (avec JSONB exercises)
   │
   └── Appelle saveExerciseLogs()
       │
       ├── DELETE ancien exercise_logs pour cette session
       │
       ├── FETCH exercises avec JOINs:
       │   exercises → muscle_groups (primary_muscle_group_id)
       │   exercises → movement_patterns (movement_pattern_id)
       │
       └── INSERT dans exercise_logs avec:
           - Données dénormalisées (muscle_group_name, etc.)
           - Métriques calculées (total_reps, total_volume, etc.)
           - exercise_order basé sur l'index dans le tableau
```

### Requêtes analytics

```
-- Évolution du 1RM par exercice
SELECT date, max_weight
FROM exercise_logs
WHERE user_id = ? AND exercise_name = ?
ORDER BY date;

-- Volume par catégorie (pour radar chart)
SELECT analytics_category, SUM(total_volume)
FROM exercise_logs
WHERE user_id = ? AND year = ? AND week = ?
GROUP BY analytics_category;

-- PR par exercice
SELECT exercise_name, MAX(max_weight) as pr
FROM exercise_logs
WHERE user_id = ? AND load_type IN ('numeric', 'additive')
GROUP BY exercise_name;
```

---

## Checklist de configuration

### Étape 1: Tables référentielles
- [ ] Exécuter `reference_data_init.sql` Section 1-4
- [ ] Vérifier que `muscle_groups` contient ~16 entrées
- [ ] Vérifier que `movement_patterns` contient ~26 entrées

### Étape 2: Mapping des exercices
- [ ] Pour chaque exercice dans `exercises`:
  - [ ] Assigner `primary_muscle_group_id`
  - [ ] Assigner `movement_pattern_id`
  - [ ] Définir `limb_type` (bilateral/unilateral)

### Étape 3: Migration exercise_logs
- [ ] Exécuter `exercise_logs_fix.sql` pour re-migrer
- [ ] Vérifier avec `exercise_logs_mapping_fix.sql` Section 4

### Étape 4: Vérification
```sql
-- Doit retourner des valeurs pour toutes les colonnes
SELECT
  COUNT(*) as total,
  COUNT(muscle_group_name) as with_muscle,
  COUNT(analytics_category) as with_category
FROM exercise_logs;
```

---

## Dénormalisation intentionnelle

**Pourquoi `exercise_logs` copie les données ?**

1. **Performance:** Les requêtes analytics n'ont pas besoin de JOINs
2. **Historique:** Si un exercice est modifié, les anciennes données restent cohérentes
3. **Simplicité:** Requêtes plus lisibles

**Synchronisation:**
- Les données sont copiées lors de `saveExerciseLogs()`
- Si `exercises` est modifié, les anciens `exercise_logs` gardent les anciennes valeurs
- Pour mettre à jour les anciens logs: exécuter `exercise_logs_mapping_fix.sql` Section 4

---

## Types TypeScript correspondants

```typescript
// types.ts
interface ExerciseLogEntry {
  id: string;
  sessionLogId: string;
  exerciseId?: string;
  exerciseName: string;
  exerciseOrder: number;      // Ordre dans la séance
  exerciseType: ExerciseType; // 'reps' | 'time'
  loadType: LoadType;         // 'numeric' | 'additive' | 'bodyweight' | 'assisted'
  limbType: LimbType;         // 'bilateral' | 'unilateral'
  muscleGroupId?: string;
  muscleGroupName?: string;
  movementPatternId?: string;
  movementPatternName?: string;
  analyticsCategory?: AnalyticsCategory; // 'push' | 'pull' | 'legs_squat' | ...
  setsCount: number;
  totalReps: number;
  maxWeight?: number;
  totalVolume?: number;
  // ...
}
```
