// ============================================================
// F.Y.T - DEMO TOUR CONTEXT
// src/contexts/DemoTourContext.tsx
// Contexte pour gérer la visite guidée du mode démo
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================
// TYPES
// ============================================================

export type TourScreen = 'home' | 'active-session' | 'end' | 'init';

// Actions possibles avant d'afficher une étape
export type TourAction =
  | 'flip-card'
  | 'unfold-card'
  | 'select-session'
  | 'start-session'
  | 'kill-session'
  | 'deselect-sessions'   // Désélectionner toutes les séances
  | 'select-lower-1'      // Sélectionner uniquement Lower 1
  | 'navigate-home';      // Naviguer vers l'écran d'accueil

// Types d'éléments cliquables pendant le tour
export type ClickableElement =
  | 'session-selector'     // Sélecteur de séances
  | 'start-button'         // Bouton démarrer
  | 'exercise-badges'      // Badges de l'exercice
  | 'set-header'           // Header série (+ / -)
  | 'reps-input'           // Input répétitions
  | 'weight-input'         // Input charge
  | 'load-type-button'     // Bouton type charge
  | 'validate-set-button'  // Bouton valider série
  | 'message-section'      // Barre message + envoi
  | 'exercise-rpe'         // Sélecteur RPE
  | 'finish-button';       // Bouton terminer

// Règle d'interaction par étape
export interface InteractionRule {
  clickable: ClickableElement[];    // Éléments cliquables à cette étape
  accumulate?: boolean;             // Accumuler les permissions précédentes
  triggerNextOnClick?: string;      // data-tour-id qui déclenche l'étape suivante
  fakeAnimation?: 'message-sent';   // Animation fake à jouer
  lockPage?: boolean;               // Bloquer scroll et clics
  autoNext?: boolean;               // Passer automatiquement à l'étape suivante
  tooltipCentered?: boolean;        // Afficher le tooltip au centre de l'écran
}

export interface TourStep {
  id: string;
  screen: TourScreen;
  targetId: string | null;  // data-tour-id de l'élément à cibler, null = pas de focus
  message: string;
  action?: TourAction;  // Action à effectuer avant d'afficher
  position?: 'top' | 'bottom' | 'center';
  interaction?: InteractionRule;  // Règles d'interaction pour cette étape
}

interface DemoTourContextType {
  // État du tour
  isActive: boolean;
  currentStepIndex: number;
  currentStep: TourStep | null;
  totalSteps: number;

  // Actions
  startTour: () => void;
  nextStep: () => void;
  previousStep: () => void;
  skipTour: () => void;
  endTour: () => void;

  // Callbacks d'actions (seront définis par DemoTourManager)
  setActionCallbacks: (callbacks: ActionCallbacks) => void;

  // Pour savoir si on doit effectuer une action sur un composant
  shouldFlipCard: boolean;
  setShouldFlipCard: (value: boolean) => void;
}

export interface ActionCallbacks {
  onSelectSession: () => void;
  onStartSession: () => void;
  onNavigateHome: () => void;
  onKillSession: () => void;
  onResetSession: () => void;  // Réinitialiser complètement l'état de la session
  onCollapseExercise: () => void;  // Replier le bloc exercice en simulant un clic
  onDeselectSessions: () => void;  // Désélectionner toutes les séances
  onSelectLower1Only: () => void;  // Sélectionner uniquement Lower 1
}

// ============================================================
// DÉFINITION DES ÉTAPES DU TOUR
// ============================================================

export const TOUR_STEPS: TourStep[] = [
  // Étape 0: Initialisation - Naviguer vers home (déclenché par "lancer la démo")
  {
    id: 'tour-init',
    screen: 'init',
    targetId: null,
    message: '', // Pas de message, étape automatique
    action: 'navigate-home',
    interaction: { clickable: [], autoNext: true }
  },
  // Étape 1: Page d'accueil - Introduction
  {
    id: 'home-intro',
    screen: 'home',
    targetId: null,
    message: "Bienvenue dans F.Y.T ! Vous êtes sur la page d'accueil de l'application. Nous allons faire un petit tour pour vous montrer les bases de l'app, laissez-vous guider.",
    action: 'deselect-sessions',
    position: 'center',
    interaction: { clickable: [] }
  },
  // Étape 2: Page d'accueil - Encart préselection de séance
  {
    id: 'home-session-selector',
    screen: 'home',
    targetId: 'tour-session-selector',
    message: "Ici, vous trouverez les séances proposées par votre coach. Vous pouvez en sélectionner une ou plusieurs ; elles s'accumuleront automatiquement.",
    action: 'select-lower-1',  // Sélectionner Lower 1 au début de cette étape
    position: 'bottom',
    interaction: { clickable: ['session-selector'] }
  },
  // Étape 3: Page d'accueil - Bouton démarrer séance
  {
    id: 'home-start-button',
    screen: 'home',
    targetId: 'tour-start-session-button',
    message: "Une fois votre sélection de séances effectuée, vous pouvez vous lancer.",
    position: 'top',
    interaction: {
      clickable: ['start-button'],
      triggerNextOnClick: 'tour-start-session-button'
    }
  },
  // Étape 4: Écran de saisie - Introduction
  {
    id: 'session-intro',
    screen: 'active-session',
    targetId: null,
    message: "Vous voilà maintenant sur l'écran de saisie de séance. C'est ici que vous allez enregistrer vos performances !",
    action: 'start-session',
    position: 'center',
    interaction: { clickable: [] }
  },
  // Étape 5: Tuile exercice (recto/face avant)
  {
    id: 'session-exercise-front',
    screen: 'active-session',
    targetId: 'tour-exercise-tile',
    message: "Chaque tuile d'exercice présente les consignes fournies par le coach pour bien effectuer la série. Vous pouvez obtenir plus d'informations en cliquant sur les badges.",
    position: 'bottom',
    interaction: { clickable: ['exercise-badges'] }
  },
  // Étape 6: Tuile exercice (verso) - utilise le même élément que step 5 mais après expansion
  {
    id: 'session-exercise-back-intro',
    screen: 'active-session',
    targetId: 'tour-exercise-tile',
    message: "Un bloc d'exercice est composé de plusieurs parties.",
    action: 'flip-card',
    position: 'bottom',
    interaction: { clickable: ['exercise-badges'], accumulate: true }
  },
  // Étape 7: Numéro de série + libellé
  {
    id: 'session-set-number',
    screen: 'active-session',
    targetId: 'tour-set-header',
    message: "Ici, vous savez où vous en êtes dans vos séries et vous pouvez en ajouter ou en supprimer si besoin.",
    position: 'bottom',
    interaction: { clickable: ['set-header'], accumulate: true }
  },
  // Étape 8: Input répétition
  {
    id: 'session-reps-input',
    screen: 'active-session',
    targetId: 'tour-reps-input',
    message: "Ici, vous renseignez le nombre de répétitions effectuées pour votre série.",
    position: 'bottom',
    interaction: { clickable: ['reps-input'], accumulate: true }
  },
  // Étape 9: Input charge
  {
    id: 'session-weight-input',
    screen: 'active-session',
    targetId: 'tour-weight-input',
    message: "Et ici, la charge que vous avez utilisée pour cette série.",
    position: 'top',
    interaction: { clickable: ['weight-input'], accumulate: true }
  },
  // Étape 10: Bouton modifier type de charge
  {
    id: 'session-load-type',
    screen: 'active-session',
    targetId: 'tour-load-type-button',
    message: "Important ! Ici, vous pouvez changer le type de charge utilisée (haltères, barre, machine…). Cela permet de calculer correctement vos efforts.",
    position: 'top',
    interaction: { clickable: ['load-type-button'], accumulate: true }
  },
  // Étape 11: Bouton valider série
  {
    id: 'session-validate-set',
    screen: 'active-session',
    targetId: 'tour-validate-set-button',
    message: "Une fois votre série terminée, validez-la ici pour passer à la suivante.",
    position: 'top',
    interaction: { clickable: ['validate-set-button'], accumulate: true }
  },
  // Étape 12: Barre de message + bouton envoyer
  {
    id: 'session-message-bar',
    screen: 'active-session',
    targetId: 'tour-message-section',
    message: "Une question pendant l'exercice ? Posez-la ici et votre coach vous répondra.",
    position: 'top',
    interaction: {
      clickable: ['message-section'],
      accumulate: true,
      fakeAnimation: 'message-sent'
    }
  },
  // Étape 13: Saisie RPE exercice
  {
    id: 'session-exercise-rpe',
    screen: 'active-session',
    targetId: 'tour-exercise-rpe',
    message: "Lorsque vous avez terminé un exercice, vous pouvez indiquer votre RPE (niveau d'effort ressenti). C'est très utile pour votre coach !",
    position: 'top',
    interaction: {
      clickable: ['exercise-rpe'],
      accumulate: true,
      triggerNextOnClick: 'tour-exercise-rpe'
    }
  },
  // Étape 14: Exercices restants de la séance
  {
    id: 'session-remaining-exercises',
    screen: 'active-session',
    targetId: 'tour-remaining-exercises',
    message: "Continuez votre séance en faisant les prochains exercices.",
    action: 'unfold-card',
    position: 'bottom',
    interaction: { clickable: [] } // Reset: rien de cliquable
  },
  // Étape 15: Bouton terminer la séance
  {
    id: 'session-finish-button',
    screen: 'active-session',
    targetId: 'tour-finish-session-button',
    message: "Lorsque la séance est terminée, cliquez ici pour la clôturer.",
    position: 'top',
    interaction: {
      clickable: ['finish-button'],
      triggerNextOnClick: 'tour-finish-session-button'
    }
  },
  // Étape 16: Fin du tour - tooltip centré sur l'écran de session (pas de kill avant clic)
  {
    id: 'tour-end',
    screen: 'active-session',  // Rester sur l'écran de session pour voir le bouton terminer
    targetId: null,
    message: "Et voilà, vous savez maintenant comment renseigner une séance ! Vous retrouverez votre historique dans l'écran dédié ainsi que des statistiques sur votre pratique. Explorez l'app pour la découvrir 🙂",
    // Pas d'action ici - le kill-session sera fait quand l'utilisateur clique "Terminer" dans le tooltip
    position: 'center',
    interaction: {
      clickable: [],
      lockPage: true,
      tooltipCentered: true  // Tooltip au milieu de l'écran
    }
  }
];

// ============================================================
// CONTEXTE
// ============================================================

const DemoTourContext = createContext<DemoTourContextType | null>(null);

// ============================================================
// PROVIDER
// ============================================================

interface DemoTourProviderProps {
  children: React.ReactNode;
}

export const DemoTourProvider: React.FC<DemoTourProviderProps> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [actionCallbacks, setActionCallbacksState] = useState<ActionCallbacks | null>(null);
  const [shouldFlipCard, setShouldFlipCard] = useState(false);

  const currentStep = isActive ? TOUR_STEPS[currentStepIndex] : null;
  const totalSteps = TOUR_STEPS.length;

  // Wrapper pour setActionCallbacks
  const setActionCallbacks = useCallback((callbacks: ActionCallbacks) => {
    setActionCallbacksState(callbacks);
  }, []);

  // Exécuter l'action quand l'étape change
  useEffect(() => {
    if (!isActive || !currentStep || !actionCallbacks) return;

    // Petit délai pour laisser le state se mettre à jour
    const timer = setTimeout(() => {
      switch (currentStep.action) {
        case 'navigate-home':
          actionCallbacks.onNavigateHome();
          break;
        case 'deselect-sessions':
          actionCallbacks.onDeselectSessions();
          break;
        case 'select-lower-1':
          actionCallbacks.onSelectLower1Only();
          break;
        case 'select-session':
          actionCallbacks.onSelectSession();
          break;
        case 'start-session':
          actionCallbacks.onStartSession();
          break;
        case 'flip-card':
          setShouldFlipCard(true);
          break;
        case 'unfold-card':
          setShouldFlipCard(false);
          actionCallbacks.onCollapseExercise();  // Simuler un clic pour replier
          break;
        case 'kill-session':
          actionCallbacks.onKillSession();
          break;
      }

      // Naviguer vers home si écran 'end'
      if (currentStep.screen === 'end') {
        actionCallbacks.onNavigateHome();
      }

      // Si autoNext est activé, passer automatiquement à l'étape suivante
      if (currentStep.interaction?.autoNext) {
        setTimeout(() => {
          setCurrentStepIndex(prev => prev + 1);
        }, 50);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isActive, currentStepIndex, currentStep, actionCallbacks]);

  const startTour = useCallback(() => {
    // Réinitialiser l'état avant de démarrer le tour
    if (actionCallbacks) {
      actionCallbacks.onResetSession();
      actionCallbacks.onNavigateHome();
    }
    setCurrentStepIndex(0);
    setIsActive(true);
    setShouldFlipCard(false);
  }, [actionCallbacks]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setShouldFlipCard(false);
      setCurrentStepIndex(prev => prev + 1);
    } else {
      // Tour terminé - tuer la session et retourner à l'accueil
      setIsActive(false);
      setCurrentStepIndex(0);
      setShouldFlipCard(false);
      if (actionCallbacks) {
        actionCallbacks.onKillSession();
        actionCallbacks.onNavigateHome();
      }
    }
  }, [currentStepIndex, actionCallbacks]);

  const previousStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setShouldFlipCard(false);
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const skipTour = useCallback(() => {
    // Si on est sur l'écran de session, tuer la session avant de quitter
    const currentScreen = TOUR_STEPS[currentStepIndex]?.screen;
    setIsActive(false);
    setCurrentStepIndex(0);
    setShouldFlipCard(false);
    if (actionCallbacks) {
      if (currentScreen === 'active-session') {
        actionCallbacks.onKillSession();
      }
      actionCallbacks.onNavigateHome();
    }
  }, [actionCallbacks, currentStepIndex]);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStepIndex(0);
    setShouldFlipCard(false);
  }, []);

  const value: DemoTourContextType = {
    isActive,
    currentStepIndex,
    currentStep,
    totalSteps,
    startTour,
    nextStep,
    previousStep,
    skipTour,
    endTour,
    setActionCallbacks,
    shouldFlipCard,
    setShouldFlipCard
  };

  return (
    <DemoTourContext.Provider value={value}>
      {children}
    </DemoTourContext.Provider>
  );
};

// ============================================================
// HOOK
// ============================================================

export const useDemoTour = (): DemoTourContextType => {
  const context = useContext(DemoTourContext);
  if (!context) {
    throw new Error('useDemoTour must be used within a DemoTourProvider');
  }
  return context;
};

export default DemoTourContext;
