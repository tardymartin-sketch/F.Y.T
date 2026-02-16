// ============================================================
// F.Y.T - THEME SELECTOR
// src/components/mobile/ThemeSelector.tsx
// Composant pour sélectionner le thème visuel
// ============================================================

import { Check, Palette } from 'lucide-react';
import { useTheme, AVAILABLE_THEMES, ThemeName } from '../../contexts/ThemeContext';

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 text-theme-secondary">
        <Palette className="w-5 h-5" />
        <span className="font-medium">Apparence</span>
      </div>

      {/* Theme Grid */}
      <div className="grid grid-cols-5 gap-2">
        {AVAILABLE_THEMES.map((t) => {
          const isSelected = theme === t.id;

          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id as ThemeName)}
              className={`
                relative flex flex-col items-center gap-1.5 p-2 rounded-xl border-2 transition-all
                ${isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-theme hover:border-[var(--color-border-hover)]'}
              `}
              aria-label={`Thème ${t.label}`}
              aria-pressed={isSelected}
            >
              {/* Color Circle */}
              <div
                className="w-8 h-8 rounded-full shadow-sm"
                style={{ backgroundColor: t.color }}
              />

              {/* Label */}
              <span className="text-xs text-theme-secondary truncate w-full text-center">
                {t.label}
              </span>

              {/* Check Icon for Selected */}
              {isSelected && (
                <div
                  className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: t.color }}
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
