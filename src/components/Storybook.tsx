// ============================================================
// F.Y.T - STORYBOOK
// src/components/Storybook.tsx
// Page de comparaison visuelle des composants par thème
// ============================================================

import React, { useState } from 'react';
import {
  Play, Timer, Check, X, AlertCircle, Info,
  ChevronRight, Settings, User, Calendar, Clock,
  Dumbbell, TrendingUp, MessageSquare, Star,
  Home, History, BarChart3, ChevronDown
} from 'lucide-react';

// Shared Components
import { Button, IconButton } from './shared/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardStat } from './shared/Card';
import { Badge, RpeBadge, NotificationBadge, StatusBadge } from './shared/Badge';
import { Stepper, RepsStepper, WeightStepper, RpeStepper } from './shared/Stepper';

// Theme list
const THEMES = [
  { id: 'minimal-lavender', label: 'Lavande' },
  { id: 'minimal-slate', label: 'Ardoise' },
  { id: 'minimal-warm', label: 'Chaleureux' },
  { id: 'dark-lavender', label: 'Nuit Lavande' },
  { id: 'dark-warm', label: 'Nuit Chaude' },
] as const;

// ============================================================
// THEME PANEL - Wrapper pour afficher un composant dans un thème
// ============================================================

interface ThemePanelProps {
  themeId: string;
  themeLabel: string;
  children: React.ReactNode;
}

const ThemePanel: React.FC<ThemePanelProps> = ({ themeId, themeLabel, children }) => (
  <div
    data-theme={themeId}
    className="flex-1 min-w-0 rounded-xl border border-gray-300 overflow-hidden"
  >
    {/* Header avec label */}
    <div className="bg-theme-tertiary px-2 py-1.5 border-b border-theme">
      <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">
        {themeLabel}
      </span>
    </div>
    {/* Content avec le bon fond du thème */}
    <div className="bg-theme p-3">
      {children}
    </div>
  </div>
);

// ============================================================
// SECTION - Groupe de composants
// ============================================================

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="mb-10">
    <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
      {title}
    </h2>
    <div className="flex gap-2">
      {THEMES.map(theme => (
        <ThemePanel key={theme.id} themeId={theme.id} themeLabel={theme.label}>
          {children}
        </ThemePanel>
      ))}
    </div>
  </div>
);

// ============================================================
// MOCK COMPONENTS - Reproductions fidèles des composants réels
// ============================================================

// Mock BottomNav (fidèle à src/components/mobile/BottomNav.tsx)
const MockBottomNav: React.FC<{ activeTab?: string }> = ({ activeTab = 'home' }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Accueil' },
    { id: 'history', icon: History, label: 'Historique' },
    { id: 'stats', icon: BarChart3, label: 'Stats' },
    { id: 'coach', icon: MessageSquare, label: 'Coach', badge: 3 },
    { id: 'profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="bg-theme-secondary border-t border-theme rounded-lg overflow-hidden">
      <div className="grid grid-cols-5 h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <div
              key={tab.id}
              className={`
                flex flex-col items-center justify-center gap-0.5 text-[10px]
                ${isActive ? 'text-theme-primary' : 'text-theme-muted'}
              `}
            >
              <div className="relative flex flex-col items-center gap-0.5">
                {isActive && (
                  <div className="absolute -top-2 w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                )}
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.badge && (
                    <div className="absolute -top-1 -right-1.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-[var(--color-danger)] text-white text-[9px] font-semibold">
                      {tab.badge}
                    </div>
                  )}
                </div>
                <span>{tab.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Mock FAB (fidèle à src/components/mobile/FloatingActionButton.tsx)
const MockFAB: React.FC<{ state?: 'none' | 'active' | 'paused' }> = ({ state = 'none' }) => {
  const isActive = state === 'active';
  const Icon = state === 'active' ? Timer : Play;

  return (
    <div className="relative flex flex-col items-center">
      {state !== 'none' && (
        <span className="mb-2 px-2 py-0.5 text-[9px] font-medium text-[var(--color-warning)] bg-theme-secondary rounded-full border border-[var(--color-warning)]/30">
          Session en cours
        </span>
      )}
      <button
        className={`
          relative flex items-center justify-center
          w-12 h-12 rounded-full
          ${isActive
            ? 'bg-gradient-to-r from-[var(--color-warning)] to-amber-500 shadow-lg shadow-[var(--color-warning)]/40'
            : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg shadow-[var(--shadow-color)]'
          }
        `}
      >
        <Icon className={`w-5 h-5 text-white ${state === 'none' ? 'ml-0.5' : ''}`} strokeWidth={2.5} />
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[var(--color-danger)] rounded-full border-2 border-theme" />
        )}
      </button>
    </div>
  );
};

// Mock KPI Card (fidèle à src/components/mobile/HistoryKPICard.tsx)
const MockKPICard: React.FC = () => (
  <div className="bg-gradient-to-br from-theme-secondary to-theme-tertiary border border-theme rounded-xl overflow-hidden">
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-4 h-4 text-[var(--color-primary)]" />
          <span className="text-theme font-semibold text-sm">Ce mois-ci</span>
        </div>
        <ChevronDown className="w-4 h-4 text-theme-muted" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-theme-tertiary rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-[var(--color-primary)]">12</p>
          <p className="text-[9px] text-theme-muted">séances</p>
        </div>
        <div className="bg-theme-tertiary rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-[var(--color-success)]">8h30</p>
          <p className="text-[9px] text-theme-muted">temps total</p>
        </div>
        <div className="bg-theme-tertiary rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-500">7.2</p>
          <p className="text-[9px] text-theme-muted">RPE moy.</p>
        </div>
      </div>
    </div>
  </div>
);

// Mock Exercise Tile (fidèle au style des listes d'exercices)
const MockExerciseTile: React.FC<{ name: string; order: number; rpe?: number }> = ({ name, order, rpe }) => (
  <div className="flex items-center gap-2 p-2 bg-theme-tertiary rounded-lg border border-theme">
    <div className="w-6 h-6 bg-[var(--color-primary)]/20 rounded flex items-center justify-center">
      <span className="text-xs font-bold text-[var(--color-primary)]">{order}</span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-theme truncate">{name}</p>
      <p className="text-[10px] text-theme-muted">4 séries • 8-10 reps</p>
    </div>
    {rpe && <RpeBadge value={rpe} size="sm" />}
  </div>
);

// ============================================================
// STORYBOOK MAIN COMPONENT
// ============================================================

export const Storybook: React.FC = () => {
  const [stepperValue, setStepperValue] = useState(10);
  const [repsValue, setRepsValue] = useState(12);
  const [weightValue, setWeightValue] = useState(80);
  const [rpeValue, setRpeValue] = useState(7);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">F.Y.T Storybook</h1>
          <p className="text-gray-600 text-sm">Comparaison des composants visuels par thème</p>
        </div>

        {/* ========================================
            COMPOSANTS MOBILE RÉELS
            ======================================== */}
        <Section title="Bottom Navigation (Mobile)">
          <MockBottomNav activeTab="home" />
        </Section>

        <Section title="Floating Action Button (FAB)">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] text-theme-muted mb-2">État: Aucune session</p>
              <MockFAB state="none" />
            </div>
            <div>
              <p className="text-[10px] text-theme-muted mb-2">État: Session active</p>
              <MockFAB state="active" />
            </div>
          </div>
        </Section>

        <Section title="KPI Card (Historique)">
          <MockKPICard />
        </Section>

        <Section title="Exercise Tiles">
          <div className="space-y-1.5">
            <MockExerciseTile name="Développé couché" order={1} rpe={7} />
            <MockExerciseTile name="Rowing barre" order={2} rpe={8} />
            <MockExerciseTile name="Squat" order={3} rpe={9} />
          </div>
        </Section>

        {/* ========================================
            BOUTONS (Composants partagés réels)
            ======================================== */}
        <Section title="Boutons - Variantes">
          <div className="space-y-2">
            <Button variant="primary" size="sm" fullWidth>Primary</Button>
            <Button variant="secondary" size="sm" fullWidth>Secondary</Button>
            <Button variant="outline" size="sm" fullWidth>Outline</Button>
            <Button variant="ghost" size="sm" fullWidth>Ghost</Button>
            <Button variant="danger" size="sm" fullWidth>Danger</Button>
            <Button variant="success" size="sm" fullWidth>Success</Button>
          </div>
        </Section>

        <Section title="Boutons - États">
          <div className="space-y-2">
            <Button size="sm" loading fullWidth>Chargement</Button>
            <Button size="sm" disabled fullWidth>Désactivé</Button>
            <Button size="sm" icon={<Play className="w-3 h-3" />} fullWidth>Avec icône</Button>
          </div>
        </Section>

        <Section title="Icon Buttons">
          <div className="flex gap-1.5 flex-wrap">
            <IconButton icon={<Play className="w-4 h-4" />} aria-label="Play" size="sm" />
            <IconButton icon={<Settings className="w-4 h-4" />} aria-label="Settings" size="sm" variant="secondary" />
            <IconButton icon={<X className="w-4 h-4" />} aria-label="Close" size="sm" variant="danger" />
          </div>
        </Section>

        {/* ========================================
            CARTES (Composants partagés réels)
            ======================================== */}
        <Section title="Cards - Variantes">
          <div className="space-y-2">
            <Card variant="default" padding="sm">
              <CardTitle size="sm">Default</CardTitle>
              <CardDescription>Description</CardDescription>
            </Card>
            <Card variant="elevated" padding="sm">
              <CardTitle size="sm">Elevated</CardTitle>
              <CardDescription>Avec ombre</CardDescription>
            </Card>
            <Card variant="outlined" padding="sm">
              <CardTitle size="sm">Outlined</CardTitle>
              <CardDescription>Transparent</CardDescription>
            </Card>
          </div>
        </Section>

        <Section title="Cards - Interactive">
          <Card interactive padding="sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <CardTitle size="sm">Upper Body</CardTitle>
                <CardDescription>Semaine 12</CardDescription>
              </div>
              <ChevronRight className="w-4 h-4 text-theme-muted" />
            </div>
          </Card>
        </Section>

        {/* ========================================
            BADGES (Composants partagés réels)
            ======================================== */}
        <Section title="Badges - Variantes">
          <div className="flex flex-wrap gap-1">
            <Badge variant="default" size="sm">Default</Badge>
            <Badge variant="primary" size="sm">Primary</Badge>
            <Badge variant="success" size="sm">Success</Badge>
            <Badge variant="warning" size="sm">Warning</Badge>
            <Badge variant="danger" size="sm">Danger</Badge>
          </div>
        </Section>

        <Section title="RPE Badges">
          <div className="flex flex-wrap gap-1">
            {[5, 6, 7, 8, 9, 10].map(rpe => (
              <RpeBadge key={rpe} value={rpe} size="sm" />
            ))}
          </div>
        </Section>

        <Section title="Notification & Status">
          <div className="flex items-center gap-3">
            <div className="relative">
              <IconButton icon={<MessageSquare className="w-4 h-4" />} aria-label="Messages" size="sm" />
              <div className="absolute -top-1 -right-1">
                <NotificationBadge count={5} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status="online" size="sm" />
              <span className="text-xs text-theme">En ligne</span>
            </div>
          </div>
        </Section>

        {/* ========================================
            STEPPERS (Composants partagés réels)
            ======================================== */}
        <Section title="Steppers">
          <div className="space-y-3">
            <RepsStepper value={repsValue} onChange={setRepsValue} size="sm" label="Reps" />
            <WeightStepper value={weightValue} onChange={setWeightValue} size="sm" label="Poids" />
            <RpeStepper value={rpeValue} onChange={setRpeValue} size="sm" label="RPE" />
          </div>
        </Section>

        {/* ========================================
            TYPOGRAPHIE & COULEURS
            ======================================== */}
        <Section title="Typographie">
          <div className="space-y-1">
            <h1 className="text-lg font-bold text-theme">Titre Principal</h1>
            <h2 className="text-base font-semibold text-theme">Titre Secondaire</h2>
            <p className="text-sm text-theme">Texte normal</p>
            <p className="text-sm text-theme-secondary">Texte secondaire</p>
            <p className="text-xs text-theme-muted">Texte muted</p>
          </div>
        </Section>

        <Section title="Couleurs du thème">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--color-primary)]" />
              <span className="text-xs text-theme">Primary</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--color-accent)]" />
              <span className="text-xs text-theme">Accent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-theme-tertiary border border-theme" />
              <span className="text-xs text-theme">Tertiary BG</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--color-success)]" />
              <span className="text-xs text-theme">Success</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--color-warning)]" />
              <span className="text-xs text-theme">Warning</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[var(--color-danger)]" />
              <span className="text-xs text-theme">Danger</span>
            </div>
          </div>
        </Section>

        {/* ========================================
            INPUTS
            ======================================== */}
        <Section title="Form Inputs">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Text input..."
              className="w-full px-2 py-1.5 text-sm bg-theme-tertiary border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            <select className="w-full px-2 py-1.5 text-sm bg-theme-tertiary border border-theme rounded-lg text-theme focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]">
              <option>Option 1</option>
              <option>Option 2</option>
            </select>
          </div>
        </Section>

        {/* ========================================
            ALERTES
            ======================================== */}
        <Section title="Alertes">
          <div className="space-y-2">
            <div className="flex items-start gap-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-400">Info</p>
                <p className="text-[10px] text-theme-secondary">Message</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-emerald-400">Succès</p>
                <p className="text-[10px] text-theme-secondary">Opération réussie</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400">Attention</p>
                <p className="text-[10px] text-theme-secondary">Vérifiez les données</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ========================================
            STATS CARDS
            ======================================== */}
        <Section title="Stats Cards">
          <div className="grid grid-cols-2 gap-1.5">
            <Card padding="sm">
              <div className="text-center">
                <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-theme">+12%</p>
                <p className="text-[9px] text-theme-muted">Volume</p>
              </div>
            </Card>
            <Card padding="sm">
              <div className="text-center">
                <Star className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-theme">3</p>
                <p className="text-[9px] text-theme-muted">PRs</p>
              </div>
            </Card>
          </div>
        </Section>

        {/* ========================================
            EMPTY STATE
            ======================================== */}
        <Section title="Empty State">
          <div className="text-center py-4">
            <div className="w-10 h-10 bg-theme-tertiary rounded-full flex items-center justify-center mx-auto mb-2">
              <Dumbbell className="w-5 h-5 text-theme-muted" />
            </div>
            <h3 className="text-sm font-semibold text-theme mb-1">Aucune séance</h3>
            <p className="text-[10px] text-theme-muted mb-2">Créez votre première séance</p>
            <Button size="sm">Créer</Button>
          </div>
        </Section>

        {/* ========================================
            TABS
            ======================================== */}
        <Section title="Navigation Tabs">
          <div className="flex gap-0.5 p-0.5 bg-theme-tertiary rounded-lg">
            {['Semaine', 'Mois', 'Année'].map((tab, i) => (
              <button
                key={tab}
                className={`flex-1 py-1.5 px-2 rounded text-[10px] font-medium transition-all ${
                  i === 0
                    ? 'bg-theme-secondary text-theme shadow-sm'
                    : 'text-theme-muted hover:text-theme'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </Section>

        {/* ========================================
            AVATARS
            ======================================== */}
        <Section title="Avatars">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-white text-xs font-bold">
              JD
            </div>
            <div className="w-8 h-8 bg-theme-tertiary rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-theme-muted" />
            </div>
            <div className="relative">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                ML
              </div>
              <div className="absolute -bottom-0.5 -right-0.5">
                <StatusBadge status="online" size="sm" />
              </div>
            </div>
          </div>
        </Section>

      </div>
    </div>
  );
};

export default Storybook;
