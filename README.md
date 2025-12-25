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

N'oubliez pas d'activer le RLS et de créer les politiques appropriées pour chaque table.

## 🛠️ Technologies

- **React 19** + TypeScript
- **Vite** - Build tool
- **Tailwind CSS 4** - Styling
- **Supabase** - Backend (Auth + Database)
- **Lucide React** - Icons

## 📁 Structure du projet

```
ultiprepa/
├── src/
│   ├── components/     # Composants React
│   ├── services/       # Appels API Supabase
│   ├── supabaseClient.ts
│   ├── index.css
│   └── main.tsx
├── types.ts            # Types TypeScript
├── App.tsx             # Composant principal
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## 📄 Licence

MIT
