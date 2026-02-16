// ===========================================
// Badge Stories - Storybook
// Test des différentes directions visuelles sur les Badges
// ===========================================

import type { Meta, StoryObj } from '@storybook/react';
import { Badge, RpeBadge, NotificationBadge, StatusBadge } from '../../components/shared/Badge';
import { ThemeProvider } from '../themes/ThemeProvider';

// ===========================================
// META
// ===========================================

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider theme={context.globals.theme}>
        <Story />
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'success', 'warning', 'danger', 'info', 'rpe'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    dot: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

// ===========================================
// STORIES
// ===========================================

/**
 * Badge par défaut
 */
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Badge',
  },
};

/**
 * Toutes les variantes
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 max-w-md">
      <Badge variant="default">Default</Badge>
      <Badge variant="primary">Primary</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="danger">Danger</Badge>
      <Badge variant="info">Info</Badge>
    </div>
  ),
};

/**
 * Toutes les tailles
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Badge size="sm" variant="primary">Small</Badge>
      <Badge size="md" variant="primary">Medium</Badge>
      <Badge size="lg" variant="primary">Large</Badge>
    </div>
  ),
};

/**
 * Badges avec dots
 */
export const WithDots: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Badge variant="default" dot>Repos</Badge>
      <Badge variant="primary" dot>En cours</Badge>
      <Badge variant="success" dot>Terminé</Badge>
      <Badge variant="warning" dot>En attente</Badge>
      <Badge variant="danger" dot>Échec</Badge>
    </div>
  ),
};

/**
 * Badges RPE (1-10)
 */
export const RpeBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-slate-400 text-sm font-medium">Échelle RPE (Effort perçu)</h3>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rpe) => (
          <RpeBadge key={rpe} value={rpe} size="md" />
        ))}
      </div>

      <div className="mt-6">
        <h4 className="text-slate-400 text-xs mb-2">Avec labels</h4>
        <div className="space-y-2">
          <RpeBadge value={3} showLabel />
          <RpeBadge value={6} showLabel />
          <RpeBadge value={8} showLabel />
          <RpeBadge value={10} showLabel />
        </div>
      </div>
    </div>
  ),
};

/**
 * Badges de notification
 */
export const NotificationBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-slate-400 text-sm font-medium">Notifications</h3>

      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <span className="text-slate-400">📬</span>
          </div>
          <NotificationBadge count={3} className="absolute -top-1 -right-1" />
        </div>

        <div className="relative">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <span className="text-slate-400">💬</span>
          </div>
          <NotificationBadge count={12} max={9} className="absolute -top-1 -right-1" />
        </div>

        <div className="relative">
          <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
            <span className="text-slate-400">🔔</span>
          </div>
          <NotificationBadge count={99} max={99} className="absolute -top-1 -right-1" />
        </div>
      </div>
    </div>
  ),
};

/**
 * Status badges
 */
export const StatusBadges: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-slate-400 text-sm font-medium">Statuts</h3>

      <div className="space-y-3">
        {(['online', 'offline', 'busy', 'away'] as const).map((status) => (
          <div key={status} className="flex items-center gap-3">
            <StatusBadge status={status} />
            <span className="text-sm text-slate-300 capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

/**
 * Exemples d'usage contextuel
 */
export const ContextualUsage: Story = {
  render: () => (
    <div className="space-y-6 w-full max-w-md">
      <h3 className="text-slate-400 text-sm font-medium">Usage en contexte</h3>

      {/* Tags d'exercice */}
      <div className="p-4 bg-slate-800/50 rounded-xl">
        <div className="text-white font-medium mb-2">Développé couché</div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="primary" size="sm">Pectoraux</Badge>
          <Badge variant="default" size="sm">Push</Badge>
          <Badge variant="info" size="sm">Composé</Badge>
        </div>
      </div>

      {/* Statut de séance */}
      <div className="p-4 bg-slate-800/50 rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">Upper Body Push</span>
          <Badge variant="success" dot>Terminé</Badge>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
          <span>6 exercices</span>
          <span>45 min</span>
          <span className="flex items-center gap-1">
            RPE moyen: <RpeBadge value={7} size="sm" />
          </span>
        </div>
      </div>

      {/* Athlete avec status */}
      <div className="p-4 bg-slate-800/50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full" />
            <StatusBadge status="online" className="absolute -bottom-0.5 -right-0.5 ring-2 ring-slate-800" />
          </div>
          <div>
            <div className="text-white font-medium">Jean Dupont</div>
            <div className="text-xs text-slate-400">En séance active</div>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * Showcase complet
 */
export const Showcase: Story = {
  render: () => (
    <div className="space-y-8 w-full max-w-lg">
      <div>
        <h2 className="text-white text-xl font-bold mb-2">Showcase Badges</h2>
        <p className="text-slate-400 text-sm mb-6">
          Change le thème pour voir les différentes directions visuelles.
        </p>
      </div>

      {/* Variantes */}
      <section>
        <h3 className="text-slate-300 text-sm font-medium mb-3">Variantes</h3>
        <div className="flex flex-wrap gap-2">
          <Badge variant="default">Default</Badge>
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      {/* RPE */}
      <section>
        <h3 className="text-slate-300 text-sm font-medium mb-3">Échelle RPE</h3>
        <div className="flex flex-wrap gap-2">
          {[1, 3, 5, 7, 9, 10].map((rpe) => (
            <RpeBadge key={rpe} value={rpe} />
          ))}
        </div>
      </section>

      {/* Status */}
      <section>
        <h3 className="text-slate-300 text-sm font-medium mb-3">Statuts</h3>
        <div className="flex gap-6">
          {(['online', 'away', 'busy', 'offline'] as const).map((status) => (
            <div key={status} className="flex items-center gap-2">
              <StatusBadge status={status} />
              <span className="text-xs text-slate-400 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};
