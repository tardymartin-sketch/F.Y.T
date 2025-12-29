// ============================================================
// F.Y.T - LOADING SCREEN
// src/components/LoadingScreen.tsx
// Écran de chargement
// ============================================================

import React from 'react';
import { Dumbbell } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/25 animate-pulse">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl blur-xl opacity-50 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-white mt-6">F.Y.T</h1>
        <div className="flex items-center gap-2 mt-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-slate-500 text-sm mt-4">Chargement en cours...</p>
      </div>
    </div>
  );
};
