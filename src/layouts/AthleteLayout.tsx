// ===========================================
// F.Y.T - Athlete Layout
// src/layouts/AthleteLayout.tsx
// Layout mobile-first pour l'interface athlète
// ===========================================

import React from 'react';
import { BottomNav, AthleteView } from '../components/athlete/BottomNav';
import { FloatingActionButton, SessionState } from '../components/athlete/FloatingActionButton';

// ===========================================
// TYPES
// ===========================================

interface AthleteLayoutProps {
  children: React.ReactNode;
  currentView: AthleteView;
  onViewChange: (view: AthleteView) => void;
  unreadMessages?: number;
  sessionState: SessionState;
  onFabClick: () => void;
  hideNavigation?: boolean;
}

// ===========================================
// COMPOSANT PRINCIPAL
// ===========================================

export const AthleteLayout: React.FC<AthleteLayoutProps> = ({
  children,
  currentView,
  onViewChange,
  unreadMessages = 0,
  sessionState,
  onFabClick,
  hideNavigation = false,
}) => {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header mobile (optionnel - juste le logo) */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-center">
          <h1 className="font-bold text-lg text-white tracking-wide">
            F.Y.T
          </h1>
        </div>
      </header>

      {/* Contenu principal */}
      <main 
        className="pb-24" // Padding bottom pour la bottom nav
        style={{ 
          paddingBottom: hideNavigation 
            ? '0' 
            : 'calc(64px + 56px + 32px + env(safe-area-inset-bottom, 0px))' 
        }}
      >
        {children}
      </main>

      {/* Navigation fixe en bas (masquée pendant une session active) */}
      {!hideNavigation && (
        <>
          <FloatingActionButton
            sessionState={sessionState}
            onClick={onFabClick}
          />
          
          <BottomNav
            currentView={currentView}
            onViewChange={onViewChange}
            unreadMessages={unreadMessages}
            sessionState={sessionState}
          />
        </>
      )}
    </div>
  );
};

// ===========================================
// VARIANTE SANS NAVIGATION (pour session active)
// ===========================================

interface AthleteLayoutMinimalProps {
  children: React.ReactNode;
  title?: string;
  onBack?: () => void;
  rightContent?: React.ReactNode;
}

export const AthleteLayoutMinimal: React.FC<AthleteLayoutMinimalProps> = ({
  children,
  title,
  onBack,
  rightContent,
}) => {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header avec back button */}
      {(title || onBack) && (
        <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Bouton retour */}
            <div className="w-20">
              {onBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  <svg 
                    className="w-5 h-5" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 19l-7-7 7-7" 
                    />
                  </svg>
                  <span className="text-sm font-medium">Pause</span>
                </button>
              )}
            </div>

            {/* Titre centré */}
            {title && (
              <h1 className="font-bold text-white">{title}</h1>
            )}

            {/* Contenu à droite (timer, etc.) */}
            <div className="w-20 flex justify-end">
              {rightContent}
            </div>
          </div>
        </header>
      )}

      {/* Contenu principal */}
      <main>
        {children}
      </main>
    </div>
  );
};

export default AthleteLayout;
