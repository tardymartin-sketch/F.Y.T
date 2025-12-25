# UltiPrepa v2.0

Application de suivi d'entraînement sportif avec interface moderne et backend Supabase.

## 🚀 Fonctionnalités

- **Authentification** - Inscription/Connexion via Supabase Auth
- **Dashboard** - Vue d'ensemble avec statistiques personnelles
- **Sélecteur de séance** - Choisissez et combinez vos sessions d'entraînement
- **Suivi en direct** - Enregistrez vos performances en temps réel
- **Historique** - Consultez et modifiez vos séances passées
- **Gestion d'équipe** (Coach/Admin) - Suivez vos athlètes
- **Administration** (Admin) - Gérez les utilisateurs et permissions
- **Week Organizer** (Coach) - Envoyez des messages hebdomadaires à vos athlètes
- **Feedbacks** (Athlète) - Envoyez des commentaires par exercice à votre coach
- **Rich Text Editor** - Éditeur de texte riche (Tiptap) pour les messages coach

## 📦 Installation

1. **Clonez le projet** et installez les dépendances :
```bash
npm install
```

2. **Configurez Supabase** - Modifiez le fichier `.env` :
```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

3. **Lancez le serveur de développement** :
```bash
npm run dev
```

---

## 🧪 Utilisateurs de test

### Coachs

| Email | Mot de passe | Prénom | Nom | Athlètes |
|-------|--------------|--------|-----|----------|
| coach.music@test.com | Music2025! | David | Musicien | 4 |
| coach.manga@test.com | Manga2025! | Sakura | Tanaka | 3 |
| coach.gaming@test.com | Gaming2025! | Alex | Streamer | 3 |

### Athlètes

| Email | Mot de passe | Prénom | Nom | Coach |
|-------|--------------|--------|-----|-------|
| athlete.rock@test.com | Rock2025! | Freddie | Mercury | David Musicien |
| athlete.jazz@test.com | Jazz2025! | Miles | Davis | David Musicien |
| athlete.electro@test.com | Electro2025! | Daft | Punk | David Musicien |
| athlete.hiphop@test.com | HipHop2025! | Kendrick | Lamar | David Musicien |
| athlete.naruto@test.com | Naruto2025! | Naruto | Uzumaki | Sakura Tanaka |
| athlete.onepiece@test.com | OnePiece2025! | Monkey D. | Luffy | Sakura Tanaka |
| athlete.dbz@test.com | DragonBall2025! | Son | Goku | Sakura Tanaka |
| athlete.zelda@test.com | Zelda2025! | Link | Hyrule | Alex Streamer |
| athlete.mario@test.com | Mario2025! | Mario | Bros | Alex Streamer |
| athlete.pokemon@test.com | Pokemon2025! | Sacha | Ketchum | Alex Streamer |

### Répartition visuelle

```
🎸 Coach David Musicien
   ├── Freddie Mercury (Rock)
   ├── Miles Davis (Jazz)
   ├── Daft Punk (Electro)
   └── Kendrick Lamar (HipHop)

🌸 Coach Sakura Tanaka
   ├── Naruto Uzumaki
   ├── Monkey D. Luffy
   └── Son Goku

🎮 Coach Alex Streamer
   ├── Link Hyrule
   ├── Mario Bros
   └── Sacha Ketchum
```

> ⚠️ Ces utilisateurs doivent être créés via le script SQL fourni dans `UTILISATEURS-TEST.md`

---

## 🗄️ Structure de la base de données Supabase

### Table `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'athlete',
  coach_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `training_plans`
```sql
CREATE TABLE training_plans (
  id SERIAL PRIMARY KEY,
  year INT,
  week INT,
  seance_type TEXT,
  exercise_name TEXT,
  order_index INT,
  target_sets TEXT,
  target_reps TEXT,
  rest_time_sec INT,
  video_url TEXT,
  "Month" TEXT,
  "Month_num" INT,
  "Tempo" TEXT,
  "Notes/Consignes" TEXT
);
```

### Table `session_logs`
```sql
CREATE TABLE session_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  date TIMESTAMPTZ,
  duration_minutes INT,
  session_key_year INT,
  session_key_week INT,
  session_key_name TEXT,
  exercises JSONB,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table `week_organizer` (Messages coach)
```sql
CREATE TABLE week_organizer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,  -- HTML généré par Tiptap
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table `athlete_comments` (Feedbacks)
```sql
CREATE TABLE athlete_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES session_logs(id) ON DELETE SET NULL,
  exercise_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Trigger pour création automatique de profil
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'athlete'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## 🔒 Row Level Security (RLS)

N'oubliez pas d'activer le RLS et de créer les politiques appropriées pour chaque table. Consultez `SUPABASE-INSTRUCTIONS.md` pour les scripts complets.

## 🛠️ Technologies

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS 4** - Styling
- **Supabase** - Backend (Auth + Database)
- **Lucide React** - Icons
- **Tiptap** - Rich Text Editor

## 📁 Structure du projet

```
ultiprepa/
├── src/
│   ├── components/        # Composants React
│   │   ├── ActiveSession.tsx
│   │   ├── Auth.tsx
│   │   ├── Home.tsx
│   │   ├── History.tsx
│   │   ├── RichTextEditor.tsx  # Éditeur Tiptap
│   │   ├── TeamView.tsx        # Équipe + Feedbacks + Week Organizer
│   │   ├── Sidebar.tsx
│   │   └── ...
│   ├── services/          # Appels API Supabase
│   │   └── supabaseService.ts
│   ├── supabaseClient.ts
│   ├── index.css
│   └── main.tsx
├── types.ts               # Types TypeScript
├── App.tsx                # Composant principal
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

## 📄 Licence

MIT
