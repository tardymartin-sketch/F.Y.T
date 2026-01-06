// ===========================================
// F.Y.T - Coach Layout (Placeholder)
// src/layouts/CoachLayout.tsx
// Layout desktop-first pour l'interface coach
// Sera implémenté à l'étape 2.1
// ===========================================

import React from 'react';

interface CoachLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout pour l'interface coach (desktop-first)
 * TODO: Implémenter à l'étape 2.1 avec:
 * - Sidebar permanente 240px
 * - Header avec infos utilisateur
 * - Zone de contenu principale
 */
export const CoachLayout: React.FC<CoachLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950">
      {children}
    </div>
  );
};

export default CoachLayout;
