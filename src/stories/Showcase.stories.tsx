// ===========================================
// SHOWCASE - Comparaison visuelle des thèmes
// Change le thème dans la toolbar pour voir les différences
// ===========================================

import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import {
  ThemedButton,
  ThemedCard,
  ThemedBadge,
  ThemedInput,
  ThemedBottomNav,
  ThemedStatCard,
  ThemedSessionCard,
  ThemedExerciseTile,
  ThemedProgressBar,
  ThemedEncouragementKPI,
  ThemedCoachMessage,
  ThemedSessionBadge,
  ThemedActiveSessionBanner,
  ThemedWeekHeader,
  type ThemeName
} from './themes/ThemedComponents';
import { Dumbbell, TrendingUp, Clock, Flame, Trophy, Target, Play, Check, Plus, Trash2, Calendar, MessageCircle } from 'lucide-react';

// ===========================================
// HELPERS
// ===========================================

// Background colors for each theme
const bgColors: Record<ThemeName, string> = {
  current: 'bg-slate-950',
  premium: 'bg-black',
  energetic: 'bg-stone-950',
  minimal: 'bg-slate-50',
  neon: 'bg-gray-950',
  'minimal-blue': 'bg-slate-50',
  'minimal-warm': 'bg-slate-50',
  'minimal-coffee': 'bg-stone-50',
  'minimal-lavender': 'bg-slate-50',
  'minimal-slate': 'bg-slate-50',
};

// Check if theme is a minimal variant
const isMinimalVariant = (theme: ThemeName): boolean => {
  return theme === 'minimal' || theme.startsWith('minimal-');
};

// Get text colors based on theme
const getTextColors = (theme: ThemeName) => {
  if (isMinimalVariant(theme)) {
    return { title: 'text-slate-900', subtitle: 'text-slate-500', muted: 'text-slate-600' };
  }
  return { title: 'text-white', subtitle: 'text-slate-400', muted: 'text-slate-400' };
};

// Decorator pour récupérer le thème global
const withTheme = (Story: any, context: any) => {
  const theme = (context.globals.theme || 'current') as ThemeName;

  return (
    <div className={`min-h-screen p-8 ${bgColors[theme]}`}>
      <Story theme={theme} />
    </div>
  );
};

// ===========================================
// META
// ===========================================

const meta: Meta = {
  title: 'Showcase',
  decorators: [withTheme],
};

export default meta;

// ===========================================
// STORIES
// ===========================================

/**
 * Vue complète d'un écran Home avec tous les composants
 */
export const HomeScreen: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-2xl font-bold ${colors.title}`}>
            Bonjour, Jean
          </h1>
          <p className={`mt-1 ${colors.subtitle}`}>
            Prêt pour ta séance ?
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <ThemedStatCard
            theme={theme}
            value="12"
            label="Séances ce mois"
            icon={<Dumbbell className="w-5 h-5" />}
            trend="+3 vs mois dernier"
          />
          <ThemedStatCard
            theme={theme}
            value="847"
            label="Séries totales"
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>

        {/* Session Card */}
        <ThemedSessionCard
          theme={theme}
          title="Upper Body - Push"
          exercises={6}
          duration="~45 min"
          isToday
        />

        {/* Progress */}
        <ThemedCard theme={theme} title="Objectif hebdo">
          <div className="space-y-4">
            <ThemedProgressBar theme={theme} value={75} label="3/4 séances" />
            <div className="flex gap-2">
              <ThemedBadge theme={theme} variant="success">En bonne voie</ThemedBadge>
            </div>
          </div>
        </ThemedCard>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0">
          <ThemedBottomNav theme={theme} activeIndex={0} />
        </div>
      </div>
    );
  },
};

/**
 * Tous les boutons
 */
export const Buttons: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-lg mx-auto space-y-8">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Boutons - Thème: {theme.toUpperCase()}
        </h2>

        <section className="space-y-4">
          <h3 className={`text-sm font-medium ${colors.muted}`}>Variantes</h3>
          <div className="flex flex-wrap gap-3">
            <ThemedButton theme={theme} variant="primary" icon={<Play className="w-4 h-4" />}>
              Primary
            </ThemedButton>
            <ThemedButton theme={theme} variant="secondary">
              Secondary
            </ThemedButton>
            <ThemedButton theme={theme} variant="ghost">
              Ghost
            </ThemedButton>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={`text-sm font-medium ${colors.muted}`}>Avec icônes</h3>
          <div className="flex flex-wrap gap-3">
            <ThemedButton theme={theme} icon={<Check className="w-4 h-4" />}>
              Valider
            </ThemedButton>
            <ThemedButton theme={theme} variant="secondary" icon={<Plus className="w-4 h-4" />}>
              Ajouter
            </ThemedButton>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={`text-sm font-medium ${colors.muted}`}>Tailles</h3>
          <div className="flex flex-wrap items-center gap-3">
            <ThemedButton theme={theme} size="sm">Small</ThemedButton>
            <ThemedButton theme={theme} size="md">Medium</ThemedButton>
            <ThemedButton theme={theme} size="lg">Large</ThemedButton>
          </div>
        </section>
      </div>
    );
  },
};

/**
 * Tous les badges
 */
export const Badges: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-lg mx-auto space-y-8">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Badges - Thème: {theme.toUpperCase()}
        </h2>

        <section className="space-y-4">
          <h3 className={`text-sm font-medium ${colors.muted}`}>
            Variantes
          </h3>
          <div className="flex flex-wrap gap-3">
            <ThemedBadge theme={theme} variant="default">Default</ThemedBadge>
            <ThemedBadge theme={theme} variant="info">Info</ThemedBadge>
            <ThemedBadge theme={theme} variant="success">Success</ThemedBadge>
            <ThemedBadge theme={theme} variant="warning">Warning</ThemedBadge>
            <ThemedBadge theme={theme} variant="danger">Danger</ThemedBadge>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className={`text-sm font-medium ${colors.muted}`}>
            Usage contextuel
          </h3>
          <ThemedCard theme={theme}>
            <div className="flex items-center justify-between">
              <span className={colors.title}>
                Développé couché
              </span>
              <div className="flex gap-2">
                <ThemedBadge theme={theme} variant="info">Pectoraux</ThemedBadge>
                <ThemedBadge theme={theme} variant="success">PR</ThemedBadge>
              </div>
            </div>
          </ThemedCard>
        </section>
      </div>
    );
  },
};

/**
 * Cards et conteneurs
 */
export const Cards: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-lg mx-auto space-y-6">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Cards - Thème: {theme.toUpperCase()}
        </h2>

        <ThemedCard theme={theme} title="Carte simple" subtitle="Avec titre et sous-titre">
          <p className={`text-sm ${colors.muted}`}>
            Contenu de la carte avec du texte descriptif.
          </p>
        </ThemedCard>

        <ThemedSessionCard
          theme={theme}
          title="Upper Body - Push"
          exercises={6}
          duration="~45 min"
          isToday
        />

        <ThemedCard
          theme={theme}
          title="Statistiques"
          footer={
            <ThemedButton theme={theme} variant="ghost" size="sm">
              Voir tout
            </ThemedButton>
          }
        >
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${colors.title}`}>12</div>
              <div className={`text-xs ${colors.subtitle}`}>Séances</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${colors.title}`}>847</div>
              <div className={`text-xs ${colors.subtitle}`}>Séries</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${colors.title}`}>+15%</div>
              <div className={`text-xs ${colors.subtitle}`}>Volume</div>
            </div>
          </div>
        </ThemedCard>
      </div>
    );
  },
};

/**
 * Inputs et formulaires
 */
export const Forms: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-md mx-auto space-y-8">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Formulaires - Thème: {theme.toUpperCase()}
        </h2>

        <ThemedCard theme={theme}>
          <div className="space-y-5">
            <ThemedInput
              theme={theme}
              label="Nom de l'exercice"
              placeholder="Ex: Développé couché"
            />
            <ThemedInput
              theme={theme}
              label="Poids (kg)"
              placeholder="100"
              type="number"
            />
            <ThemedInput
              theme={theme}
              label="Répétitions"
              placeholder="8-10"
            />
            <ThemedButton theme={theme} variant="primary">
              Enregistrer
            </ThemedButton>
          </div>
        </ThemedCard>
      </div>
    );
  },
};

/**
 * Grille d'exercices
 */
export const ExerciseGrid: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    const exercises = [
      { name: 'Développé couché', sets: '4×8-10', muscle: 'Pectoraux', pr: '100kg' },
      { name: 'Développé incliné', sets: '3×10-12', muscle: 'Pectoraux' },
      { name: 'Dips', sets: '3×max', muscle: 'Triceps', pr: '+20kg' },
      { name: 'Écarté poulie', sets: '3×12-15', muscle: 'Pectoraux' },
      { name: 'Extension triceps', sets: '3×12', muscle: 'Triceps' },
      { name: 'Push-ups', sets: '2×max', muscle: 'Pectoraux' },
    ];

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Exercices - Thème: {theme.toUpperCase()}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {exercises.map((ex) => (
            <ThemedExerciseTile
              key={ex.name}
              theme={theme}
              name={ex.name}
              sets={ex.sets}
              muscle={ex.muscle}
              pr={ex.pr}
            />
          ))}
        </div>
      </div>
    );
  },
};

/**
 * Navigation
 */
export const Navigation: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-md mx-auto space-y-8">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Navigation - Thème: {theme.toUpperCase()}
        </h2>

        <div className="space-y-4">
          <p className={`text-sm ${colors.muted}`}>
            Bottom Navigation (onglet Accueil actif)
          </p>
          <div className="rounded-xl overflow-hidden">
            <ThemedBottomNav theme={theme} activeIndex={0} />
          </div>
        </div>

        <div className="space-y-4">
          <p className={`text-sm ${colors.muted}`}>
            Bottom Navigation (onglet Stats actif)
          </p>
          <div className="rounded-xl overflow-hidden">
            <ThemedBottomNav theme={theme} activeIndex={2} />
          </div>
        </div>
      </div>
    );
  },
};

/**
 * Progress bars et indicateurs
 */
export const Progress: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-md mx-auto space-y-8">
        <h2 className={`text-xl font-bold ${colors.title}`}>
          Progression - Thème: {theme.toUpperCase()}
        </h2>

        <ThemedCard theme={theme} title="Objectifs">
          <div className="space-y-6">
            <ThemedProgressBar theme={theme} value={75} label="Séances hebdo: 3/4" />
            <ThemedProgressBar theme={theme} value={45} label="Volume mensuel: 45%" />
            <ThemedProgressBar theme={theme} value={90} label="Streak: 9 jours" />
          </div>
        </ThemedCard>
      </div>
    );
  },
};

/**
 * Comparaison côte à côte de tous les thèmes principaux
 */
export const AllThemesSideBySide: StoryObj = {
  decorators: [],
  render: () => {
    const themes: ThemeName[] = ['current', 'premium', 'energetic', 'minimal', 'neon'];

    const themeLabels: Record<string, string> = {
      current: '🔵 Actuel',
      premium: '🟡 Premium',
      energetic: '🟠 Energetic',
      minimal: '⚪ Minimal',
      neon: '🟣 Neon',
    };

    return (
      <div className="grid grid-cols-5 min-h-screen">
        {themes.map((theme) => {
          const colors = getTextColors(theme);
          return (
            <div key={theme} className={`p-4 ${bgColors[theme]}`}>
              <div className={`text-center text-sm font-bold mb-4 ${colors.title}`}>
                {themeLabels[theme]}
              </div>

              <div className="space-y-4">
                <ThemedButton theme={theme} variant="primary" size="sm">
                  Button
                </ThemedButton>

                <div className="flex flex-wrap gap-1">
                  <ThemedBadge theme={theme} variant="success">OK</ThemedBadge>
                  <ThemedBadge theme={theme} variant="warning">!</ThemedBadge>
                </div>

                <ThemedCard theme={theme}>
                  <div className={`text-sm ${colors.title}`}>
                    Card
                  </div>
                </ThemedCard>

                <ThemedProgressBar theme={theme} value={60} />
              </div>
            </div>
          );
        })}
      </div>
    );
  },
};

/**
 * COMPARAISON DES VARIANTES MINIMAL
 * Affiche les 6 variantes du thème Minimal côte à côte
 */
export const MinimalVariantsSideBySide: StoryObj = {
  decorators: [],
  render: () => {
    const minimalThemes: ThemeName[] = [
      'minimal',
      'minimal-blue',
      'minimal-warm',
      'minimal-coffee',
      'minimal-lavender',
      'minimal-slate',
    ];

    const themeLabels: Record<string, string> = {
      'minimal': '⚪ Neutre',
      'minimal-blue': '💙 Blue',
      'minimal-warm': '🧡 Warm',
      'minimal-coffee': '☕ Coffee',
      'minimal-lavender': '💜 Lavender',
      'minimal-slate': '🩶 Slate',
    };

    return (
      <div className="grid grid-cols-6 min-h-screen">
        {minimalThemes.map((theme) => (
          <div key={theme} className={`p-3 ${bgColors[theme]}`}>
            <div className="text-center text-xs font-bold mb-4 text-slate-900">
              {themeLabels[theme]}
            </div>

            <div className="space-y-3">
              <ThemedButton theme={theme} variant="primary" size="sm">
                Primary
              </ThemedButton>

              <ThemedButton theme={theme} variant="secondary" size="sm">
                Secondary
              </ThemedButton>

              <div className="flex flex-wrap gap-1">
                <ThemedBadge theme={theme} variant="info">Info</ThemedBadge>
                <ThemedBadge theme={theme} variant="success">OK</ThemedBadge>
              </div>

              <ThemedCard theme={theme}>
                <div className="text-sm text-slate-900 font-medium">Card</div>
                <div className="text-xs text-slate-500 mt-1">Description</div>
              </ThemedCard>

              <ThemedProgressBar theme={theme} value={70} />

              <div className="rounded-lg overflow-hidden">
                <ThemedBottomNav theme={theme} activeIndex={0} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/**
 * MINIMAL VARIANTS - Écran complet
 * Montre un écran Home complet dans chaque variante Minimal
 */
export const MinimalVariantsHomeScreen: StoryObj = {
  decorators: [],
  render: () => {
    const themes: ThemeName[] = ['minimal-blue', 'minimal-warm', 'minimal-coffee', 'minimal-lavender', 'minimal-slate'];

    const themeLabels: Record<string, string> = {
      'minimal-blue': '💙 Blue',
      'minimal-warm': '🧡 Warm',
      'minimal-coffee': '☕ Coffee',
      'minimal-lavender': '💜 Lavender',
      'minimal-slate': '🩶 Slate',
    };

    return (
      <div className="grid grid-cols-3 gap-4 p-4 bg-slate-200 min-h-screen">
        {themes.map((theme) => (
          <div key={theme} className={`${bgColors[theme]} rounded-2xl p-4 shadow-lg`}>
            <div className="text-center text-sm font-bold mb-4 text-slate-900">
              {themeLabels[theme]}
            </div>

            <div className="space-y-4">
              {/* Header */}
              <div>
                <h2 className="text-lg font-bold text-slate-900">Bonjour, Jean</h2>
                <p className="text-sm text-slate-500">Prêt pour ta séance ?</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2">
                <ThemedStatCard
                  theme={theme}
                  value="12"
                  label="Séances"
                  icon={<Dumbbell className="w-4 h-4" />}
                />
                <ThemedStatCard
                  theme={theme}
                  value="+15%"
                  label="Volume"
                  icon={<TrendingUp className="w-4 h-4" />}
                />
              </div>

              {/* Session */}
              <ThemedCard theme={theme} title="Upper Body">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <ThemedBadge theme={theme} variant="info">6 exos</ThemedBadge>
                    <ThemedBadge theme={theme} variant="success">45 min</ThemedBadge>
                  </div>
                  <ThemedButton theme={theme} variant="primary" size="sm" icon={<Play className="w-3 h-3" />}>
                    Démarrer
                  </ThemedButton>
                </div>
              </ThemedCard>

              {/* Progress */}
              <ThemedProgressBar theme={theme} value={75} label="Objectif: 3/4" />

              {/* Nav */}
              <div className="rounded-xl overflow-hidden">
                <ThemedBottomNav theme={theme} activeIndex={0} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  },
};

/**
 * PAGE D'ACCUEIL COMPLÈTE - Version Mobile
 * Reproduit l'écran d'accueil de l'application avec tous les éléments
 */
export const HomePageComplete: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    const sessions = [
      { name: 'Upper Body - Push', isCompleted: true },
      { name: 'Lower Body', isCompleted: false },
      { name: 'Upper Body - Pull', isCompleted: false },
      { name: 'Cardio HIIT', isCompleted: false },
    ];

    return (
      <div className="max-w-md mx-auto pb-20">
        {/* Header - Salutation */}
        <div className="mb-4">
          <h1 className={`text-2xl font-bold ${colors.title}`}>
            Bonjour, Jean <span className="ml-1">🌅</span>
          </h1>
          <p className={`text-sm mt-1 ${colors.subtitle}`}>
            Prêt à repousser tes limites ?
          </p>
        </div>

        {/* KPI Encouragement */}
        <div className="mb-4">
          <ThemedEncouragementKPI
            theme={theme}
            title="Tu es sur une série de 7 jours !"
            subtitle="Continue comme ça, tu progresses super bien 💪"
            icon={<Flame className="w-6 h-6" />}
          />
        </div>

        {/* Message Coach */}
        <div className="mb-4">
          <ThemedCoachMessage
            theme={theme}
            coachName="Coach Alex"
            message="Cette semaine on monte l'intensité ! N'hésite pas si tu as des questions."
            time="Il y a 2h"
          />
        </div>

        {/* Titre Section Séances */}
        <h2 className={`text-xl font-bold mb-3 ${colors.title}`}>
          Compose ta séance :
        </h2>

        {/* Card Sélection Séances */}
        <ThemedCard theme={theme}>
          {/* Week Header */}
          <ThemedWeekHeader
            theme={theme}
            weekNumber={5}
            dateRange="27 jan - 2 fév"
          />

          {/* Badges Grid */}
          <div className="p-4">
            <p className={`text-sm mb-3 ${colors.subtitle}`}>
              Sélectionne une ou plusieurs séances :
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {sessions.map((session, i) => (
                <ThemedSessionBadge
                  key={session.name}
                  theme={theme}
                  name={session.name}
                  isCompleted={session.isCompleted}
                  isSelected={i === 1}
                  orderNumber={i === 1 ? 1 : undefined}
                />
              ))}
            </div>

            {/* Stats séance sélectionnée */}
            <div className={`flex items-center gap-4 text-sm mb-4 pb-4 border-b ${
              isMinimalVariant(theme) ? 'border-slate-200 text-slate-500' : 'border-slate-700/50 text-slate-400'
            }`}>
              <span className="flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4" />
                5 exercices
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                ~40 min
              </span>
            </div>

            {/* Bouton Démarrer */}
            <ThemedButton theme={theme} variant="primary" size="lg" icon={<Play className="w-5 h-5 fill-current" />}>
              Lower Body
            </ThemedButton>

            {/* Lien Choisir ma séance */}
            <button className={`w-full mt-3 flex items-center justify-center gap-2 text-sm py-3 rounded-xl border transition-colors ${
              isMinimalVariant(theme)
                ? 'text-slate-500 hover:text-slate-700 border-slate-200 hover:border-slate-300'
                : 'text-slate-400 hover:text-white border-slate-700/50 hover:border-slate-600/50'
            }`}>
              <Calendar className="w-4 h-4" />
              Choisir ma séance
            </button>
          </div>
        </ThemedCard>

        {/* Bottom Nav - Fixed */}
        <div className="fixed bottom-0 left-0 right-0">
          <ThemedBottomNav theme={theme} activeIndex={0} />
        </div>
      </div>
    );
  },
};

/**
 * PAGE D'ACCUEIL AVEC SESSION ACTIVE
 * Montre l'état quand une séance est en cours
 */
export const HomePageWithActiveSession: StoryObj = {
  render: (args: any, context: any) => {
    const theme = (context.globals?.theme || 'current') as ThemeName;
    const colors = getTextColors(theme);

    return (
      <div className="max-w-md mx-auto pb-20">
        {/* Header */}
        <div className="mb-4">
          <h1 className={`text-2xl font-bold ${colors.title}`}>
            Salut, Jean <span className="ml-1">👋</span>
          </h1>
          <p className={`text-sm mt-1 ${colors.subtitle}`}>
            Prêt à repousser tes limites ?
          </p>
        </div>

        {/* Active Session Banner */}
        <div className="mb-4">
          <ThemedActiveSessionBanner
            theme={theme}
            title="Séance en cours"
            subtitle="Reprendre là où tu en étais"
          />
        </div>

        {/* KPI Encouragement */}
        <div className="mb-4">
          <ThemedEncouragementKPI
            theme={theme}
            title="Plus que 2 exercices !"
            subtitle="Tu y es presque, continue 🔥"
            icon={<Trophy className="w-6 h-6" />}
          />
        </div>

        {/* Progress card */}
        <ThemedCard theme={theme} title="Progression séance">
          <div className="space-y-3">
            <ThemedProgressBar theme={theme} value={60} label="4/6 exercices complétés" />
            <div className="flex gap-2">
              <ThemedBadge theme={theme} variant="success">847 kg soulevés</ThemedBadge>
              <ThemedBadge theme={theme} variant="info">32 min</ThemedBadge>
            </div>
          </div>
        </ThemedCard>

        {/* Bottom Nav */}
        <div className="fixed bottom-0 left-0 right-0">
          <ThemedBottomNav theme={theme} activeIndex={0} />
        </div>
      </div>
    );
  },
};

/**
 * COMPARAISON PAGE D'ACCUEIL - 5 Thèmes Minimal
 * Affiche la page d'accueil complète dans les 5 thèmes validés
 */
export const HomePageAllMinimalThemes: StoryObj = {
  decorators: [],
  render: () => {
    const themes: ThemeName[] = ['minimal-slate', 'minimal-blue', 'minimal-lavender', 'minimal-warm', 'minimal-coffee'];

    const themeLabels: Record<string, string> = {
      'minimal-slate': '🩶 Slate',
      'minimal-blue': '💙 Blue',
      'minimal-lavender': '💜 Lavender',
      'minimal-warm': '🧡 Warm',
      'minimal-coffee': '☕ Coffee',
    };

    const sessions = [
      { name: 'Upper Body - Push', isCompleted: true },
      { name: 'Lower Body', isCompleted: false },
      { name: 'Upper Body - Pull', isCompleted: false },
    ];

    return (
      <div className="grid grid-cols-5 gap-2 p-2 bg-slate-300 min-h-screen">
        {themes.map((theme) => (
          <div key={theme} className={`${bgColors[theme]} rounded-xl overflow-hidden shadow-lg flex flex-col`}>
            {/* Theme Label */}
            <div className="text-center text-xs font-bold py-2 bg-white/50 text-slate-800">
              {themeLabels[theme]}
            </div>

            <div className="p-3 space-y-3 flex-1">
              {/* Header */}
              <div>
                <h2 className="text-sm font-bold text-slate-900">Bonjour 🌅</h2>
                <p className="text-xs text-slate-500">Prêt ?</p>
              </div>

              {/* KPI */}
              <ThemedEncouragementKPI
                theme={theme}
                title="7 jours de suite !"
                subtitle="Continue 💪"
                icon={<Flame className="w-4 h-4" />}
                showClose={false}
              />

              {/* Coach Message */}
              <ThemedCoachMessage
                theme={theme}
                coachName="Coach"
                message="On monte l'intensité !"
                time="2h"
              />

              {/* Session Card */}
              <ThemedCard theme={theme}>
                <div className="space-y-2">
                  {sessions.map((s, i) => (
                    <ThemedSessionBadge
                      key={s.name}
                      theme={theme}
                      name={s.name}
                      isCompleted={s.isCompleted}
                      isSelected={i === 1}
                      orderNumber={i === 1 ? 1 : undefined}
                    />
                  ))}

                  <ThemedButton theme={theme} variant="primary" size="sm" icon={<Play className="w-3 h-3" />}>
                    Démarrer
                  </ThemedButton>
                </div>
              </ThemedCard>

              {/* Progress */}
              <ThemedProgressBar theme={theme} value={75} label="3/4" />
            </div>

            {/* Nav */}
            <ThemedBottomNav theme={theme} activeIndex={0} />
          </div>
        ))}
      </div>
    );
  },
};
