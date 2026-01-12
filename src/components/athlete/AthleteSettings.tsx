// ============================================================
// F.Y.T - ATHLETE SETTINGS (ATH-012)
// src/components/athlete/AthleteSettings.tsx
// Préférences d'entraînement avec persistance localStorage
// ============================================================

import React from 'react';
import { Settings, Clock, FileText, Timer } from 'lucide-react';
import { useTempData } from '../../hooks/useUIState';

// ===========================================
// TYPES
// ===========================================

export interface AthletePreferences {
  showTempo: boolean;
  showCoachNotes: boolean;
  autoRestTimer: boolean;
}

const DEFAULT_PREFERENCES: AthletePreferences = {
  showTempo: true,
  showCoachNotes: true,
  autoRestTimer: false
};

interface Props {
  className?: string;
}

// ===========================================
// TOGGLE COMPONENT
// ===========================================

interface ToggleProps {
  label: string;
  description: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  description,
  icon,
  checked,
  onChange
}) => {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-slate-800 last:border-b-0">
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="text-white font-medium">{label}</h4>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>

      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`
          relative w-12 h-7 rounded-full transition-colors flex-shrink-0
          ${checked ? 'bg-blue-600' : 'bg-slate-700'}
        `}
      >
        <span
          className={`
            absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform
            ${checked ? 'left-6' : 'left-1'}
          `}
        />
      </button>
    </div>
  );
};

// ===========================================
// COMPONENT
// ===========================================

export const AthleteSettings: React.FC<Props> = ({ className = '' }) => {
  // Persistance via le store UI singleton
  const [preferences, setPreferences] = useTempData<AthletePreferences>('athlete-preferences');

  // Utiliser les préférences ou les défauts
  const prefs = preferences || DEFAULT_PREFERENCES;

  const updatePreference = <K extends keyof AthletePreferences>(
    key: K,
    value: AthletePreferences[K]
  ) => {
    setPreferences({
      ...prefs,
      [key]: value
    });
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-purple-400" />
        </div>
        <h3 className="text-lg font-semibold text-white">Préférences d'entraînement</h3>
      </div>

      {/* Toggles */}
      <div className="px-4">
        <Toggle
          label="Afficher le tempo"
          description="Affiche les indications de tempo sur les exercices"
          icon={<Clock className="w-5 h-5 text-slate-400" />}
          checked={prefs.showTempo}
          onChange={(checked) => updatePreference('showTempo', checked)}
        />

        <Toggle
          label="Notes du coach"
          description="Affiche les notes et conseils de votre coach"
          icon={<FileText className="w-5 h-5 text-slate-400" />}
          checked={prefs.showCoachNotes}
          onChange={(checked) => updatePreference('showCoachNotes', checked)}
        />

        <Toggle
          label="Timer repos automatique"
          description="Lance automatiquement le timer de repos après chaque série"
          icon={<Timer className="w-5 h-5 text-slate-400" />}
          checked={prefs.autoRestTimer}
          onChange={(checked) => updatePreference('autoRestTimer', checked)}
        />
      </div>
    </div>
  );
};

// ===========================================
// HOOK pour accéder aux préférences ailleurs
// ===========================================

export function useAthletePreferences(): AthletePreferences {
  const [preferences] = useTempData<AthletePreferences>('athlete-preferences');
  return preferences || DEFAULT_PREFERENCES;
}

export default AthleteSettings;
