// ===========================================
// F.Y.T - Floating Action Button (FAB)
// src/components/athlete/FloatingActionButton.tsx
// Bouton central pour démarrer/reprendre une séance
// ===========================================

import React from 'react';
import { Play, Timer, Pause } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

export type SessionState = 'none' | 'active' | 'paused';

interface FloatingActionButtonProps {
  sessionState: SessionState;
  onClick: () => void;
  className?: string;
}

// ===========================================
// STYLES PAR ÉTAT
// ===========================================

const stateStyles: Record<SessionState, {
  gradient: string;
  shadow: string;
  icon: React.FC<{ className?: string }>;
  pulse: boolean;
  label: string;
}> = {
  none: {
    gradient: 'bg-gradient-to-r from-blue-600 to-emerald-600',
    shadow: 'shadow-lg shadow-blue-600/30',
    icon: Play,
    pulse: false,
    label: 'Démarrer une séance',
  },
  active: {
    gradient: 'bg-gradient-to-r from-orange-500 to-amber-500',
    shadow: 'shadow-lg shadow-orange-500/40',
    icon: Timer,
    pulse: true,
    label: 'Reprendre la séance',
  },
  paused: {
    gradient: 'bg-gradient-to-r from-orange-500 to-amber-500',
    shadow: 'shadow-lg shadow-orange-500/40',
    icon: Play,
    pulse: false,
    label: 'Reprendre la séance',
  },
};

// ===========================================
// COMPOSANT PRINCIPAL
// ===========================================

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  sessionState,
  onClick,
  className = '',
}) => {
  const style = stateStyles[sessionState];
  const Icon = style.icon;

  return (
    <div 
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 ${className}`}
      style={{ 
        bottom: 'calc(64px + 16px + env(safe-area-inset-bottom, 0px))'
      }}
    >
      <button
        onClick={onClick}
        className={`
          relative flex items-center justify-center
          w-14 h-14 rounded-full
          ${style.gradient}
          ${style.shadow}
          transition-all duration-200 ease-out
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
          ${style.pulse ? 'animate-pulse-session' : ''}
        `}
        aria-label={style.label}
      >
        {/* Icône principale */}
        <Icon 
          className={`
            w-6 h-6 text-white
            ${sessionState === 'none' ? 'ml-0.5' : ''} 
          `}
          strokeWidth={2.5}
        />

        {/* Indicateur de session active (ring pulsant) */}
        {style.pulse && (
          <>
            <span className="absolute inset-0 rounded-full bg-orange-500 animate-ping opacity-30" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-slate-900" />
          </>
        )}
      </button>

      {/* Label contextuel (visible seulement si session en cours) */}
      {sessionState !== 'none' && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="px-2 py-1 text-xs font-medium text-orange-400 bg-slate-800 rounded-full border border-orange-500/30">
            Session en cours
          </span>
        </div>
      )}
    </div>
  );
};

// ===========================================
// STYLES CSS ADDITIONNELS
// Ajouter dans index.css ou utiliser styled-components
// ===========================================

/*
CSS à ajouter dans src/index.css :

@keyframes pulse-session {
  0%, 100% { 
    transform: scale(1); 
    box-shadow: 0 10px 15px -3px rgba(249, 115, 22, 0.3);
  }
  50% { 
    transform: scale(1.05); 
    box-shadow: 0 20px 25px -5px rgba(249, 115, 22, 0.4);
  }
}

.animate-pulse-session {
  animation: pulse-session 2s ease-in-out infinite;
}
*/

export default FloatingActionButton;
