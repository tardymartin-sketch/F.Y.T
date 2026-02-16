// ===========================================
// Button Stories - Storybook
// Test des différentes directions visuelles sur le Button
// ===========================================

import type { Meta, StoryObj } from '@storybook/react';
import { Button, IconButton } from '../../components/shared/Button';
import { ThemeProvider } from '../themes/ThemeProvider';
import { Play, Plus, Trash2, Check, Settings, ArrowRight } from 'lucide-react';

// ===========================================
// META
// ===========================================

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story, context) => (
      <ThemeProvider theme={context.globals.theme}>
        <div className="flex flex-col items-center gap-8">
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// ===========================================
// STORIES
// ===========================================

/**
 * Bouton primaire par défaut
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Démarrer la séance',
  },
};

/**
 * Toutes les variantes de boutons
 */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <h3 className="text-slate-400 text-sm font-medium mb-2">Variantes</h3>

      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="success">Success</Button>
    </div>
  ),
};

/**
 * Toutes les tailles
 */
export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-6 items-center">
      <h3 className="text-slate-400 text-sm font-medium">Tailles</h3>

      <div className="flex items-end gap-4">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="xl">Extra Large</Button>
      </div>
    </div>
  ),
};

/**
 * Boutons avec icônes
 */
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <h3 className="text-slate-400 text-sm font-medium mb-2">Avec icônes</h3>

      <Button icon={<Play className="w-4 h-4" />}>
        Démarrer
      </Button>

      <Button variant="success" icon={<Check className="w-4 h-4" />}>
        Valider série
      </Button>

      <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
        Ajouter exercice
      </Button>

      <Button variant="outline" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
        Continuer
      </Button>

      <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
        Supprimer
      </Button>
    </div>
  ),
};

/**
 * États: Loading et Disabled
 */
export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-md">
      <h3 className="text-slate-400 text-sm font-medium mb-2">États</h3>

      <div className="flex gap-4">
        <Button>Normal</Button>
        <Button loading>Chargement...</Button>
        <Button disabled>Désactivé</Button>
      </div>
    </div>
  ),
};

/**
 * Bouton pleine largeur
 */
export const FullWidth: Story = {
  render: () => (
    <div className="w-full max-w-md space-y-4">
      <h3 className="text-slate-400 text-sm font-medium mb-2">Pleine largeur</h3>

      <Button fullWidth>
        Terminer la séance
      </Button>

      <Button fullWidth variant="secondary">
        Annuler
      </Button>
    </div>
  ),
};

/**
 * Icon Buttons
 */
export const IconButtons: Story = {
  render: () => (
    <div className="flex flex-col gap-6 items-center">
      <h3 className="text-slate-400 text-sm font-medium mb-2">Boutons icônes</h3>

      <div className="flex gap-4">
        <IconButton
          icon={<Settings className="w-5 h-5" />}
          aria-label="Paramètres"
          variant="ghost"
        />
        <IconButton
          icon={<Plus className="w-5 h-5" />}
          aria-label="Ajouter"
          variant="secondary"
        />
        <IconButton
          icon={<Trash2 className="w-5 h-5" />}
          aria-label="Supprimer"
          variant="danger"
        />
        <IconButton
          icon={<Play className="w-5 h-5" />}
          aria-label="Jouer"
          variant="primary"
        />
      </div>
    </div>
  ),
};

/**
 * Showcase complet - Vue d'ensemble
 */
export const Showcase: Story = {
  render: () => (
    <div className="w-full max-w-2xl space-y-8">
      <div>
        <h2 className="text-white text-xl font-bold mb-4">Showcase Buttons</h2>
        <p className="text-slate-400 text-sm mb-6">
          Change le thème dans la toolbar pour voir les différentes directions visuelles.
        </p>
      </div>

      {/* CTA Principal */}
      <section className="space-y-3">
        <h3 className="text-slate-300 text-sm font-medium">Call to Action</h3>
        <div className="flex gap-4">
          <Button size="lg" icon={<Play className="w-5 h-5" />}>
            Démarrer ma séance
          </Button>
          <Button size="lg" variant="secondary">
            Voir le programme
          </Button>
        </div>
      </section>

      {/* Actions secondaires */}
      <section className="space-y-3">
        <h3 className="text-slate-300 text-sm font-medium">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="success" icon={<Check className="w-4 h-4" />}>
            Valider
          </Button>
          <Button variant="outline">
            Modifier
          </Button>
          <Button variant="ghost">
            Annuler
          </Button>
          <Button variant="danger" icon={<Trash2 className="w-4 h-4" />}>
            Supprimer
          </Button>
        </div>
      </section>

      {/* Full width */}
      <section className="space-y-3">
        <h3 className="text-slate-300 text-sm font-medium">Mobile CTA</h3>
        <Button fullWidth size="lg">
          Terminer la séance
        </Button>
      </section>
    </div>
  ),
};
