// ============================================================
// F.Y.T - DEMO TOUR MANAGER
// src/components/common/DemoTourManager.tsx
// Composant pour gérer la logique du tour guidé
// NOTE: Le tour est uniquement disponible sur mobile car les
// composants desktop n'ont pas les data-tour-id
// ============================================================

import React, { useEffect, useRef } from 'react';
import { useDemoTour } from '../../contexts/DemoTourContext';
import { isDemoMode } from '../../services/demoService';

// ============================================================
// TYPES
// ============================================================

interface Props {
  onNavigate: (view: string) => void;
  onSelectSession: () => void;      // Sélectionner une séance dans le sélecteur
  onStartSession: () => void;       // Démarrer la séance
  onKillSession: () => void;        // Terminer/annuler la séance en cours
  onResetSession: () => void;       // Réinitialiser complètement l'état de la session
  onCollapseExercise: () => void;   // Replier le bloc exercice (simuler un clic)
  onDeselectSessions: () => void;   // Désélectionner toutes les séances
  onSelectLower1Only: () => void;   // Sélectionner uniquement Lower 1
  currentView: string;
  trainingDataLoaded: boolean;
  isMobile: boolean;
}

// ============================================================
// COMPONENT
// ============================================================

export const DemoTourManager: React.FC<Props> = ({
  onNavigate,
  onSelectSession,
  onStartSession,
  onKillSession,
  onResetSession,
  onCollapseExercise,
  onDeselectSessions,
  onSelectLower1Only,
  currentView,
  trainingDataLoaded,
  isMobile
}) => {
  const {
    setActionCallbacks,
    startTour
  } = useDemoTour();

  const hasStartedTour = useRef(false);

  // Enregistrer les callbacks d'action
  useEffect(() => {
    setActionCallbacks({
      onSelectSession,
      onStartSession,
      onNavigateHome: () => onNavigate('home'),
      onKillSession,
      onResetSession,
      onCollapseExercise,
      onDeselectSessions,
      onSelectLower1Only
    });
  }, [setActionCallbacks, onSelectSession, onStartSession, onNavigate, onKillSession, onResetSession, onCollapseExercise, onDeselectSessions, onSelectLower1Only]);

  // Démarrer le tour automatiquement en mode démo (UNIQUEMENT SUR MOBILE)
  useEffect(() => {
    // Vérifier que toutes les conditions sont réunies
    const shouldStartTour = isDemoMode() &&
      isMobile &&
      trainingDataLoaded &&
      !hasStartedTour.current &&
      currentView === 'home';

    if (!shouldStartTour) return;

    // Délai plus long pour laisser l'app se charger complètement
    const timer = setTimeout(() => {
      // Double vérification avant démarrage
      if (!hasStartedTour.current && currentView === 'home') {
        console.log('[DemoTour] Starting tour...');
        hasStartedTour.current = true;
        startTour();
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [trainingDataLoaded, startTour, currentView, isMobile]);

  // Ce composant ne rend rien visuellement
  return null;
};

export default DemoTourManager;
