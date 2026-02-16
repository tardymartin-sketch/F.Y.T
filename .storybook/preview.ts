import type { Preview } from '@storybook/react-vite';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#020617' },      // slate-950
        { name: 'dark-light', value: '#0f172a' }, // slate-900
        { name: 'light', value: '#f8fafc' },     // slate-50
      ],
    },
    a11y: {
      test: 'todo'
    }
  },
  globalTypes: {
    theme: {
      name: 'Theme',
      description: 'Direction visuelle à tester',
      defaultValue: 'current',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'current', title: '🔵 Actuel (Bleu/Emerald)' },
          { value: 'premium', title: '🟡 Premium Fitness (Noir/Or)' },
          { value: 'energetic', title: '🟠 Energetic Sport (Orange/Rose)' },
          { value: 'minimal', title: '⚪ Clean Minimal (Neutre)' },
          { value: 'neon', title: '🟣 Neon Gym (Néon)' },
          // --- Variantes Minimal ---
          { value: 'minimal-blue', title: '💙 Minimal Blue' },
          { value: 'minimal-warm', title: '🧡 Minimal Warm' },
          { value: 'minimal-coffee', title: '☕ Minimal Coffee' },
          { value: 'minimal-lavender', title: '💜 Minimal Lavender' },
          { value: 'minimal-slate', title: '🩶 Minimal Slate' },
        ],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;