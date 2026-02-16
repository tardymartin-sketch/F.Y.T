// ============================================================
// F.Y.T - DEMO TOUR OVERLAY
// src/components/common/DemoTourOverlay.tsx
// Les highlights (principal et secondaire) sont appliqués via CSS
// directement sur les éléments pour une synchronisation parfaite au scroll.
// ============================================================

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';
import { useDemoTour, TOUR_STEPS, ClickableElement } from '../../contexts/DemoTourContext';

// ============================================================
// CONSTANTS
// ============================================================

// Étapes où le bloc exercice complet doit être visible
// avec un cadre de focus secondaire sur les sous-éléments
// Note: Avec step 0 ajouté, les indices sont décalés de 1
const EXERCISE_BLOCK_STEPS = [7, 8, 9, 10, 11, 12, 13, 14]; // indices (étapes 6-13 en 1-based, mais index 7-14 avec step 0)
// On utilise 'tour-exercise-tile' (le wrapper externe de la Card) car il a un fond et des styles
const EXERCISE_BLOCK_PARENT_ID = 'tour-exercise-tile';

// Marge en haut de l'espace utilisable
const TOP_MARGIN = 16;

// Éléments qui doivent être positionnés en bas (juste au-dessus du tooltip)
const BOTTOM_POSITIONED_TARGETS = ['tour-finish-session-button', 'tour-remaining-exercises'];

// Éléments avec display: contents dont on doit calculer le bounding box depuis les enfants
const CONTENTS_ELEMENTS = ['tour-remaining-exercises'];

// ============================================================
// MAPPING: data-tour-id → ClickableElement
// ============================================================

const TOUR_ID_TO_CLICKABLE: Record<string, ClickableElement> = {
  'tour-session-selector': 'session-selector',
  'tour-start-session-button': 'start-button',
  'tour-exercise-badges': 'exercise-badges',
  'tour-set-header': 'set-header',
  'tour-reps-input': 'reps-input',
  'tour-weight-input': 'weight-input',
  'tour-load-type-button': 'load-type-button',
  'tour-validate-set-button': 'validate-set-button',
  'tour-message-section': 'message-section',
  'tour-exercise-rpe': 'exercise-rpe',
  'tour-finish-session-button': 'finish-button'
};

// Mapping inverse pour trouver les data-tour-id depuis ClickableElement
const CLICKABLE_TO_TOUR_IDS: Record<ClickableElement, string[]> = {
  'session-selector': ['tour-session-selector'],
  'start-button': ['tour-start-session-button'],
  'exercise-badges': ['tour-exercise-badges'],
  'set-header': ['tour-set-header'],
  'reps-input': ['tour-reps-input'],
  'weight-input': ['tour-weight-input'],
  'load-type-button': ['tour-load-type-button'],
  'validate-set-button': ['tour-validate-set-button'],
  'message-section': ['tour-message-section'],
  'exercise-rpe': ['tour-exercise-rpe'],
  'finish-button': ['tour-finish-session-button']
};

// ============================================================
// COMPONENT
// ============================================================

export const DemoTourOverlay: React.FC = () => {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    previousStep,
    skipTour
  } = useDemoTour();

  // Référence aux éléments précédemment modifiés
  const previousParentRef = useRef<Element | null>(null);
  const previousTargetRef = useRef<Element | null>(null);
  const previousSubTargetRef = useRef<Element | null>(null); // Pour le sous-focus (étapes 7-13)

  // Référence au tooltip pour mesurer sa hauteur
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Index de l'étape (step 0 = init, step 1 = home-intro, etc.)
  const isExerciseBlockStep = EXERCISE_BLOCK_STEPS.includes(currentStepIndex);

  // ============================================================
  // CLICKABLE ELEMENTS LOGIC
  // ============================================================

  // Calcule les éléments cliquables pour l'étape courante (avec accumulation si nécessaire)
  const clickableElements = useMemo((): ClickableElement[] => {
    if (!currentStep?.interaction) return [];

    const { clickable, accumulate } = currentStep.interaction;

    // Si pas d'accumulation, retourner uniquement les éléments de l'étape courante
    if (!accumulate) return clickable;

    // Accumuler depuis les étapes précédentes
    const accumulated = new Set<ClickableElement>();

    for (let i = 0; i <= currentStepIndex; i++) {
      const step = TOUR_STEPS[i];
      if (!step.interaction) continue;

      // Si cette étape n'accumule pas et ce n'est pas l'étape courante, reset
      if (!step.interaction.accumulate && i < currentStepIndex) {
        accumulated.clear();
      }

      // Ajouter les éléments cliquables de cette étape
      step.interaction.clickable?.forEach(el => accumulated.add(el));
    }

    return Array.from(accumulated);
  }, [currentStep, currentStepIndex]);

  // Vérifie si un data-tour-id est cliquable
  const isElementClickable = useCallback((tourId: string): boolean => {
    const clickableType = TOUR_ID_TO_CLICKABLE[tourId];
    if (!clickableType) return false;
    return clickableElements.includes(clickableType);
  }, [clickableElements]);

  // Gère les clics sur l'overlay - autorise ou bloque selon les règles
  const handleOverlayClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Si la page est verrouillée, bloquer tout
    if (currentStep?.interaction?.lockPage) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const target = e.target as HTMLElement;

    // Chercher l'élément avec data-tour-id le plus proche
    const tourElement = target.closest('[data-tour-id]');
    const tourId = tourElement?.getAttribute('data-tour-id');

    // Si pas d'élément avec tour-id, bloquer le clic
    if (!tourId) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Vérifier si cet élément est cliquable à cette étape
    if (!isElementClickable(tourId)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // Clic autorisé - vérifier si ça déclenche l'étape suivante
    if (currentStep?.interaction?.triggerNextOnClick === tourId) {
      // Laisser l'événement se propager pour l'action, puis passer à l'étape suivante
      setTimeout(() => {
        nextStep();
      }, 100);
    }

    // Laisser l'événement se propager normalement
  }, [currentStep, isElementClickable, nextStep]);

  // Applique/retire les classes pointer-events sur les éléments cliquables
  useEffect(() => {
    if (!isActive) return;

    // Récupérer tous les tour-ids des éléments cliquables
    const clickableTourIds = new Set<string>();
    clickableElements.forEach(el => {
      const tourIds = CLICKABLE_TO_TOUR_IDS[el];
      tourIds?.forEach(id => clickableTourIds.add(id));
    });

    // Appliquer pointer-events: auto aux éléments cliquables
    clickableTourIds.forEach(tourId => {
      const element = document.querySelector(`[data-tour-id="${tourId}"]`);
      if (element) {
        (element as HTMLElement).style.pointerEvents = 'auto';
        element.classList.add('demo-tour-clickable');
      }
    });

    // Cleanup: retirer les styles au changement d'étape
    return () => {
      clickableTourIds.forEach(tourId => {
        const element = document.querySelector(`[data-tour-id="${tourId}"]`);
        if (element) {
          (element as HTMLElement).style.pointerEvents = '';
          element.classList.remove('demo-tour-clickable');
        }
      });
    };
  }, [isActive, clickableElements, currentStepIndex]);

  // ============================================================
  // SCROLL LOGIC
  // ============================================================

  // Fonction pour scroller vers un élément
  // Note: Le spacer pour le bouton Terminer est géré dans ActiveSessionMobile (fixe 200px)
  const scrollToFocus = useCallback((element: Element, targetId?: string) => {
    const scrollContainer = document.querySelector('main');
    if (!scrollContainer) return;

    // Attendre que le tooltip soit rendu pour mesurer sa hauteur
    requestAnimationFrame(() => {
      const tooltipHeight = tooltipRef.current?.getBoundingClientRect().height || 200;
      const screenHeight = window.innerHeight;
      const usableHeight = screenHeight - tooltipHeight;

      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      // Position absolue de l'élément dans le document scrollable
      const elementTopInContainer = elementRect.top - containerRect.top + scrollContainer.scrollTop;
      const elementBottomInContainer = elementTopInContainer + elementRect.height;

      // Vérifier si c'est un élément qui doit être positionné en bas (au-dessus du tooltip)
      const isBottomPositioned = targetId && BOTTOM_POSITIONED_TARGETS.includes(targetId);

      let targetScrollTop: number;

      if (isBottomPositioned) {
        // Pour les éléments en bas : positionner l'élément juste au-dessus du tooltip
        const marginAboveTooltip = 20;
        targetScrollTop = elementBottomInContainer - usableHeight + marginAboveTooltip;
      } else {
        // Comportement par défaut : aligner le haut du focus avec le haut + marge
        targetScrollTop = elementTopInContainer - TOP_MARGIN;
      }

      // Scroll direct (le spacer fixe dans ActiveSessionMobile gère l'espace)
      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      });
    });
  }, []);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  // Fonction helper pour nettoyer un élément (et ses enfants si display: contents)
  const cleanupElement = useCallback((element: Element | null, className: string = 'demo-tour-highlight-zindex') => {
    if (!element) return;
    element.classList.remove(className);
    // Si c'est un élément contents, nettoyer aussi ses enfants
    if (element.classList.contains('contents')) {
      Array.from(element.children).forEach(child => {
        child.classList.remove(className);
      });
    }
  }, []);

  // Fonction helper pour nettoyer le sous-focus (avec option d'animation de sortie)
  const cleanupSubFocus = useCallback((animate: boolean = false) => {
    if (previousSubTargetRef.current) {
      const element = previousSubTargetRef.current;
      if (animate) {
        // Appliquer l'animation de sortie
        element.classList.add('demo-tour-sub-highlight-out');
        element.classList.remove('demo-tour-sub-highlight');
        // Nettoyer après l'animation
        setTimeout(() => {
          element.classList.remove('demo-tour-sub-highlight-out');
        }, 250);
      } else {
        element.classList.remove('demo-tour-sub-highlight');
        element.classList.remove('demo-tour-sub-highlight-out');
      }
      previousSubTargetRef.current = null;
    }
  }, []);

  // Fonction pour appliquer le sous-focus CSS directement sur l'élément
  const applySubFocus = useCallback((targetId: string) => {
    // Ne pas appliquer si le target est le parent lui-même
    if (targetId === EXERCISE_BLOCK_PARENT_ID) {
      cleanupSubFocus();
      return;
    }

    const targetElement = document.querySelector(`[data-tour-id="${targetId}"]`);

    // Si c'est le même élément, ne rien faire
    if (previousSubTargetRef.current === targetElement) {
      return;
    }

    // Animer la sortie de l'ancien sous-focus si présent
    if (previousSubTargetRef.current) {
      cleanupSubFocus(true); // Animation de sortie
    }

    if (targetElement) {
      // Petit délai pour laisser l'animation de sortie commencer
      setTimeout(() => {
        targetElement.classList.add('demo-tour-sub-highlight');
        previousSubTargetRef.current = targetElement;
      }, 100);
    }
  }, [cleanupSubFocus]);

  // ============================================================
  // MAIN EFFECT: Apply CSS classes for focus highlighting
  // ============================================================

  useEffect(() => {
    // Si le tour n'est pas actif, nettoyer
    if (!isActive) {
      cleanupElement(previousParentRef.current);
      previousParentRef.current = null;
      cleanupElement(previousTargetRef.current);
      previousTargetRef.current = null;
      cleanupSubFocus();
      return;
    }

    // Gérer le cas où on est dans les étapes du bloc exercice (6-13)
    if (isExerciseBlockStep && currentStep?.targetId) {
      // Nettoyer l'ancien target si on entre dans le bloc exercice
      cleanupElement(previousTargetRef.current);
      previousTargetRef.current = null;

      // Appliquer le highlight CSS au bloc parent
      const parentElement = document.querySelector(`[data-tour-id="${EXERCISE_BLOCK_PARENT_ID}"]`);

      // Nettoyer l'ancien parent si différent
      if (previousParentRef.current && previousParentRef.current !== parentElement) {
        cleanupElement(previousParentRef.current);
      }

      if (parentElement) {
        parentElement.classList.add('demo-tour-highlight-zindex');
        previousParentRef.current = parentElement;

        // Scroll vers le bloc parent
        setTimeout(() => {
          scrollToFocus(parentElement, EXERCISE_BLOCK_PARENT_ID);
        }, 100);
      }

      // Appliquer le sous-focus CSS directement sur le sous-élément (étapes 7-13)
      if (currentStep.targetId !== EXERCISE_BLOCK_PARENT_ID) {
        setTimeout(() => {
          applySubFocus(currentStep.targetId!);
        }, 600);
      } else {
        cleanupSubFocus();
      }
    } else if (currentStep?.targetId) {
      // Nettoyer l'ancien parent et sous-focus si on sort du bloc exercice
      cleanupElement(previousParentRef.current);
      previousParentRef.current = null;
      cleanupSubFocus();

      // Cas normal : focus directement sur l'élément
      const element = document.querySelector(`[data-tour-id="${currentStep.targetId}"]`);

      // Nettoyer l'ancien target si différent
      if (previousTargetRef.current && previousTargetRef.current !== element) {
        cleanupElement(previousTargetRef.current);
      }

      if (element) {
        // Vérifier si c'est un élément avec display: contents
        const isContentsElement = CONTENTS_ELEMENTS.includes(currentStep.targetId);

        if (isContentsElement) {
          // Appliquer le highlight aux enfants directs
          Array.from(element.children).forEach(child => {
            child.classList.add('demo-tour-highlight-zindex');
          });
        } else {
          // Appliquer le highlight à l'élément lui-même
          element.classList.add('demo-tour-highlight-zindex');
        }
        previousTargetRef.current = element;

        // Scroll vers l'élément (ou le premier enfant pour les contents)
        setTimeout(() => {
          const scrollTarget = isContentsElement && element.children.length > 0
            ? element.children[0]
            : element;
          scrollToFocus(scrollTarget, currentStep.targetId ?? undefined);
        }, 100);
      } else {
        console.warn(`[DemoTour] Element with data-tour-id="${currentStep.targetId}" not found`);
      }

    } else {
      // Pas de target : pas de focus (étapes intro/fin)
      cleanupElement(previousParentRef.current);
      previousParentRef.current = null;
      cleanupElement(previousTargetRef.current);
      previousTargetRef.current = null;
      cleanupSubFocus();
    }

    // Cleanup lors du changement d'étape
    return () => {
      // Ne pas nettoyer immédiatement pour permettre l'animation
    };
  }, [isActive, currentStep, currentStepIndex, isExerciseBlockStep, scrollToFocus, applySubFocus, cleanupSubFocus, cleanupElement]);

  // ============================================================
  // RENDER
  // ============================================================

  // Ne pas afficher si le tour n'est pas actif ou si c'est l'étape init (autoNext)
  if (!isActive || !currentStep) return null;
  if (currentStep.interaction?.autoNext) return null; // Étape automatique, pas de rendu

  // Détermine si l'étape actuelle a un focus
  const hasFocus = currentStep.targetId !== null && currentStep.targetId !== undefined;
  const isLastStep = currentStepIndex === totalSteps - 1;
  const isFirstStep = currentStepIndex === 0 || currentStepIndex === 1; // Step 0 est auto, step 1 est le premier visible
  const isLocked = currentStep.interaction?.lockPage;
  const isTooltipCentered = currentStep.interaction?.tooltipCentered;

  return (
    <>
      {/* Backdrop sombre - uniquement si on a un focus ou tooltip centré */}
      {(hasFocus || isTooltipCentered) && <div className="demo-tour-backdrop" />}

      {/* Overlay pour gérer les clics sélectivement */}
      <div
        className={`fixed inset-0 z-[9997] ${isLocked ? 'overflow-hidden' : ''}`}
        style={{ touchAction: isLocked ? 'none' : 'pan-y pan-x' }}
        onClick={handleOverlayClick}
        onTouchStart={handleOverlayClick}
      />

      {/* Note: Les highlights (principal et secondaire) sont appliqués directement via CSS
          sur les éléments ciblés pour une synchronisation parfaite au scroll:
          - .demo-tour-highlight-zindex : focus principal
          - .demo-tour-sub-highlight : sous-focus pour étapes 7-13
          - .demo-tour-clickable : éléments autorisés au clic */}

      {/* Tooltip - en bas normalement, centré si tooltipCentered */}
      <div
        ref={tooltipRef}
        className={isTooltipCentered ? 'demo-tour-tooltip-centered' : 'demo-tour-tooltip'}
        key={currentStepIndex}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-emerald-400 font-semibold text-sm">
              Visite guidée
            </span>
          </div>
          <button
            onClick={skipTour}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message */}
        <div className="px-4 py-3">
          <p className="text-slate-100 text-sm leading-relaxed">
            {currentStep.message}
          </p>
        </div>

        {/* Footer avec navigation - points de progression + boutons sur une ligne */}
        <div className="px-4 pb-4 pt-2 border-t border-slate-600 flex items-center">
          {/* Indicateurs de progression à gauche - taille réduite pour ne pas décaler les boutons */}
          {/* Note: On ne compte pas l'étape 0 (init automatique) dans les points */}
          <div className="flex items-center gap-0.5 flex-shrink-0 mr-3">
            {Array.from({ length: totalSteps - 1 }).map((_, idx) => {
              // idx 0 = step 1 (home-intro), idx 1 = step 2, etc.
              const stepIndex = idx + 1; // Décaler de 1 pour ignorer step 0
              return (
                <div
                  key={idx}
                  className={`w-1 h-1 rounded-full transition-colors ${
                    stepIndex === currentStepIndex
                      ? 'bg-emerald-400'
                      : stepIndex < currentStepIndex
                      ? 'bg-emerald-600'
                      : 'bg-slate-600'
                  }`}
                />
              );
            })}
          </div>

          {/* Espace flexible pour pousser les boutons à droite */}
          <div className="flex-1" />

          {/* Boutons de navigation à droite - tailles inchangées */}
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <button
                onClick={previousStep}
                className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Retour
              </button>
            )}
            <button
              onClick={nextStep}
              className="flex items-center gap-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isLastStep ? 'Terminer' : 'Suivant'}
              {!isLastStep && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DemoTourOverlay;
