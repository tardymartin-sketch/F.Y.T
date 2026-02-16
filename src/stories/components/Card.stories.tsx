// ===========================================
// Card Stories - Storybook
// Test des différentes directions visuelles sur le Card
// ===========================================

import type { Meta, StoryObj } from '@storybook/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardStat
} from '../../components/shared/Card';
import { Button } from '../../components/shared/Button';
import { ThemeProvider } from '../themes/ThemeProvider';
import { Dumbbell, Clock, TrendingUp, Calendar, Play } from 'lucide-react';

// ===========================================
// META
// ===========================================

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider theme={context.globals.theme}>
        <div className="w-full max-w-md">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'gradient', 'glass'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    interactive: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

// ===========================================
// STORIES
// ===========================================

/**
 * Carte par défaut
 */
export const Default: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Titre de la carte</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>
          Ceci est une description qui explique le contenu de la carte.
        </CardDescription>
      </CardContent>
    </Card>
  ),
};

/**
 * Toutes les variantes
 */
export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-slate-400 text-sm font-medium mb-4">Variantes</h3>

      {(['default', 'elevated', 'outlined', 'gradient', 'glass'] as const).map((variant) => (
        <Card key={variant} variant={variant}>
          <CardHeader>
            <CardTitle size="sm">{variant.charAt(0).toUpperCase() + variant.slice(1)}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>Variante {variant} de la carte.</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  ),
};

/**
 * Carte de séance (comme sur Home)
 */
export const SessionCard: Story = {
  render: () => (
    <Card variant="gradient" className="overflow-hidden">
      <CardHeader action={
        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full">
          Aujourd'hui
        </span>
      }>
        <CardTitle size="lg">Upper Body - Push</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-slate-400 text-sm mb-4">
          <div className="flex items-center gap-1">
            <Dumbbell className="w-4 h-4" />
            <span>6 exercices</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>~45 min</span>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-300">
          <div>• Développé couché</div>
          <div>• Développé incliné haltères</div>
          <div>• Dips</div>
          <div className="text-slate-500">+3 exercices</div>
        </div>
      </CardContent>

      <CardFooter>
        <Button fullWidth icon={<Play className="w-4 h-4" />}>
          Démarrer la séance
        </Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Carte de statistiques
 */
export const StatsCard: Story = {
  render: () => (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Progression
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <CardStat value="12" label="Séances" valueColor="text-blue-400" />
          <CardStat value="847" label="Séries" valueColor="text-emerald-400" />
          <CardStat value="+15%" label="Volume" valueColor="text-amber-400" />
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Carte d'exercice
 */
export const ExerciseCard: Story = {
  render: () => (
    <Card variant="glass" interactive className="cursor-pointer">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
          <Dumbbell className="w-6 h-6 text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <CardTitle size="sm">Développé couché</CardTitle>
          <CardDescription className="mt-1">
            4 séries × 8-10 reps
          </CardDescription>

          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-300">
              Pectoraux
            </span>
            <span className="text-xs text-slate-500">
              PR: 100kg
            </span>
          </div>
        </div>
      </div>
    </Card>
  ),
};

/**
 * Carte calendrier
 */
export const CalendarCard: Story = {
  render: () => (
    <Card variant="outlined">
      <CardHeader action={
        <Button variant="ghost" size="sm">Voir tout</Button>
      }>
        <CardTitle>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            Cette semaine
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map((day, i) => (
            <div key={day} className="flex items-center justify-between">
              <span className="text-sm text-slate-400 w-12">{day}</span>
              <div className={`flex-1 h-2 mx-3 rounded-full ${
                i < 3 ? 'bg-emerald-500/50' : 'bg-slate-700'
              }`} />
              <span className="text-xs text-slate-500">
                {i < 3 ? '✓' : '-'}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ),
};

/**
 * Showcase complet
 */
export const Showcase: Story = {
  render: () => (
    <div className="space-y-8 w-full max-w-lg">
      <div>
        <h2 className="text-white text-xl font-bold mb-4">Showcase Cards</h2>
        <p className="text-slate-400 text-sm mb-6">
          Change le thème pour voir les différentes directions visuelles.
        </p>
      </div>

      {/* Carte principale */}
      <Card variant="gradient">
        <CardHeader>
          <CardTitle size="lg">Séance du jour</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-slate-400 text-sm mb-4">
            <span className="flex items-center gap-1">
              <Dumbbell className="w-4 h-4" />
              6 exercices
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              45 min
            </span>
          </div>
        </CardContent>
        <CardFooter>
          <Button fullWidth>Démarrer</Button>
        </CardFooter>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card variant="elevated" padding="sm">
          <CardStat value="12" label="Séances" valueColor="text-blue-400" />
        </Card>
        <Card variant="elevated" padding="sm">
          <CardStat value="+15%" label="Volume" valueColor="text-emerald-400" />
        </Card>
      </div>

      {/* Liste */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle size="sm">Exercices récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Squat', 'Bench Press', 'Deadlift'].map((ex) => (
              <div key={ex} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <span className="text-sm text-slate-300">{ex}</span>
                <span className="text-xs text-slate-500">2 jours</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};
