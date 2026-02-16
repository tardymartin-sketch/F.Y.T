// ============================================================
// F.Y.T - POPOVER COMPONENT
// src/components/common/Popover.tsx
// Composant réutilisable pour afficher des pop-ups positionnés
// relativement à un élément ancre (bouton déclencheur)
// ============================================================

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

type PopoverPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

interface PopoverProps {
  /** Ref vers l'élément déclencheur (bouton) */
  anchorRef: React.RefObject<HTMLElement>;
  /** État d'ouverture */
  isOpen: boolean;
  /** Callback de fermeture */
  onClose: () => void;
  /** Contenu du popover */
  children: React.ReactNode;
  /** Position préférée (défaut: top-right = en haut à droite du bouton) */
  position?: PopoverPosition;
  /** Largeur max du popover (défaut: 400px) */
  maxWidth?: number;
  /** Afficher le bouton X de fermeture (défaut: true) */
  showCloseButton?: boolean;
  /** Titre optionnel du popover */
  title?: string;
  /** Mode mobile: utiliser le modal plein écran classique */
  mobileFullscreen?: boolean;
  /** Désactiver le mode popover (forcer modal classique) */
  forceModal?: boolean;
}

// ===========================================
// HOOK: Detect if desktop
// ===========================================

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  return isDesktop;
}

// ===========================================
// COMPONENT
// ===========================================

export const Popover: React.FC<PopoverProps> = ({
  anchorRef,
  isOpen,
  onClose,
  children,
  position = 'top-right',
  maxWidth = 400,
  showCloseButton = true,
  title,
  mobileFullscreen = true,
  forceModal = false,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const isDesktop = useIsDesktop();

  // Calculer la position du popover
  useLayoutEffect(() => {
    if (!isOpen || !anchorRef.current || forceModal || (mobileFullscreen && !isDesktop)) {
      setCoords(null);
      return;
    }

    const updatePosition = () => {
      const anchorRect = anchorRef.current!.getBoundingClientRect();
      const popoverEl = popoverRef.current;
      const popoverWidth = popoverEl?.offsetWidth || maxWidth;
      const popoverHeight = popoverEl?.offsetHeight || 300;

      const padding = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top: number;
      let left: number;

      // Calculer la position initiale selon la préférence
      switch (position) {
        case 'top-right':
          top = anchorRect.top - popoverHeight - padding;
          left = anchorRect.right - popoverWidth;
          break;
        case 'top-left':
          top = anchorRect.top - popoverHeight - padding;
          left = anchorRect.left;
          break;
        case 'bottom-right':
          top = anchorRect.bottom + padding;
          left = anchorRect.right - popoverWidth;
          break;
        case 'bottom-left':
          top = anchorRect.bottom + padding;
          left = anchorRect.left;
          break;
        default:
          top = anchorRect.top - popoverHeight - padding;
          left = anchorRect.right - popoverWidth;
      }

      // Ajustements pour rester dans le viewport
      // Horizontal
      if (left < padding) {
        left = padding;
      } else if (left + popoverWidth > viewportWidth - padding) {
        left = viewportWidth - popoverWidth - padding;
      }

      // Vertical - si déborde en haut, afficher en bas
      if (top < padding) {
        top = anchorRect.bottom + padding;
      }
      // Si déborde en bas aussi, coller en haut du viewport
      if (top + popoverHeight > viewportHeight - padding) {
        top = Math.max(padding, viewportHeight - popoverHeight - padding);
      }

      setCoords({ top, left });
    };

    // Calculer immédiatement puis après un petit délai (pour avoir les dimensions réelles)
    updatePosition();
    const timer = setTimeout(updatePosition, 10);

    // Recalculer sur scroll/resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, anchorRef, position, maxWidth, isDesktop, mobileFullscreen, forceModal]);

  // Fermer sur Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Fermer sur clic extérieur
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        anchorRef.current &&
        !anchorRef.current.contains(target)
      ) {
        onClose();
      }
    };

    // Délai pour éviter de fermer immédiatement sur le clic d'ouverture
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, anchorRef]);

  if (!isOpen) return null;

  // Mode mobile ou forceModal: afficher un modal classique centré
  const useModalMode = forceModal || (mobileFullscreen && !isDesktop);

  if (useModalMode) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal content */}
        <div
          ref={popoverRef}
          className="relative bg-theme-secondary border border-theme rounded-2xl shadow-2xl w-full overflow-hidden animate-fade-in"
          style={{ maxWidth: `${maxWidth}px` }}
        >
          {/* Header avec titre et close button */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
              {title && (
                <h3 className="text-lg font-semibold text-theme">{title}</h3>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors ml-auto"
                  aria-label="Fermer"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // Mode desktop: popover positionné
  return createPortal(
    <>
      {/* Overlay léger (optionnel, sans blur) */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Popover */}
      <div
        ref={popoverRef}
        className="fixed z-50 bg-theme-secondary border border-theme rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        style={{
          top: coords?.top ?? -9999,
          left: coords?.left ?? -9999,
          maxWidth: `${maxWidth}px`,
          maxHeight: '80vh',
          visibility: coords ? 'visible' : 'hidden',
        }}
      >
        {/* Header avec titre et close button */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-theme bg-theme-secondary/95 sticky top-0">
            {title && (
              <h3 className="text-base font-semibold text-theme">{title}</h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-1 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors ml-auto"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(80vh - 52px)' }}>
          {children}
        </div>
      </div>
    </>,
    document.body
  );
};

export default Popover;
