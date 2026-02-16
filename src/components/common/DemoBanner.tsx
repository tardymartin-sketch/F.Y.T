// ============================================================
// F.Y.T - DEMO BANNER COMPONENT
// src/components/common/DemoBanner.tsx
// Bannière affichée en mode démo
// ============================================================

import React from 'react';
import { Play, LogOut } from 'lucide-react';
import { exitDemoMode } from '../../services/demoService';
import { supabase } from '../../supabaseClient';
import { useDemoTour } from '../../contexts/DemoTourContext';

export const DemoBanner: React.FC = () => {
  const { startTour } = useDemoTour();

  const handleExitDemo = async () => {
    exitDemoMode();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleStartTour = () => {
    startTour();
  };

  return (
    <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2">
        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium">
          DÉMO
        </span>
        <span className="hidden sm:inline">
          Tu explores F.Y.T en mode démonstration
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleStartTour}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-xs font-medium"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Voir la démo</span>
        </button>

        <button
          onClick={handleExitDemo}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors text-xs font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};
