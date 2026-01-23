// ============================================================
// F.Y.T - CHART TOOLTIP OVERLAY
// src/components/athlete/stats/ChartTooltipOverlay.tsx
// Composant overlay réutilisable pour les graphiques
// ============================================================

import React, { useRef, useLayoutEffect, useState } from 'react';
import { Eye } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

export interface TooltipData {
  date: string; // Format ISO: "2026-01-20"
  label: string; // Nom exercice, séance(s), ou autre texte principal
  primaryValue?: string; // Valeur principale formatée (ex: "85.5 kg", "2.5 T", "RPE 7")
  primaryColor?: string; // Couleur Tailwind (ex: "text-green-400")
  secondaryLabel?: string; // Label secondaire (ex: "RPE:")
  secondaryValue?: string; // Valeur secondaire formatée
  secondaryColor?: string; // Couleur Tailwind pour valeur secondaire
}

export interface TooltipPosition {
  x: number;
  y: number;
  containerWidth?: number;
  containerHeight?: number;
}

interface Props {
  data: TooltipData;
  position?: TooltipPosition;
  onViewDate?: (date: string) => void;
}

// ===========================================
// HELPERS
// ===========================================

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

// ===========================================
// COMPONENT
// ===========================================

export const ChartTooltipOverlay: React.FC<Props> = ({
  data,
  position,
  onViewDate,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedStyle, setAdjustedStyle] = useState<React.CSSProperties>({});

  // Effet pour calculer le positionnement
  useLayoutEffect(() => {
    if (!position) {
      setAdjustedStyle({});
      return;
    }

    // Style par défaut : au-dessus du point, centré
    let left = position.x;
    let top = position.y - 10;
    let transformX = '-50%';
    let transformY = '-100%';

    // Ajustements si on a accès aux dimensions du tooltip
    if (tooltipRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const tooltipWidth = tooltipRect.width;
      const tooltipHeight = tooltipRect.height;
      const containerWidth = position.containerWidth || window.innerWidth;
      const containerHeight = position.containerHeight || window.innerHeight;
      const padding = 8;

      // Ajustement horizontal - calcul précis pour ne jamais déborder
      const halfWidth = tooltipWidth / 2;

      if (position.x - halfWidth < padding) {
        // Déborde à gauche -> coller à gauche
        left = padding;
        transformX = '0%';
      } else if (position.x + halfWidth > containerWidth - padding) {
        // Déborde à droite -> coller à droite
        left = containerWidth - padding;
        transformX = '-100%';
      }

      // Ajustement vertical - si déborde en haut, afficher en dessous
      if (top - tooltipHeight < padding) {
        top = position.y + 10;
        transformY = '0%';
      }

      // Vérifier aussi si déborde en bas quand affiché en dessous
      if (transformY === '0%' && top + tooltipHeight > containerHeight - padding) {
        // Si déborde en bas aussi, forcer en haut
        top = padding;
        transformY = '0%';
      }
    }

    setAdjustedStyle({
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      transform: `translate(${transformX}, ${transformY})`,
      zIndex: 50,
    });
  }, [position, position?.x, position?.y, position?.containerWidth, position?.containerHeight]);

  const content = (
    <div className="min-w-[140px] max-w-[200px]">
      {/* Ligne 1: Date + Eye button */}
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="text-xs text-slate-400 whitespace-nowrap">
          {formatDate(data.date)}
        </span>
        {onViewDate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDate(data.date);
            }}
            className="p-1 bg-purple-500/20 hover:bg-purple-500/40 rounded transition-colors flex-shrink-0"
            title="Voir dans l'historique"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
          </button>
        )}
      </div>

      {/* Ligne 2: Valeur principale */}
      {data.primaryValue && (
        <div className={`font-bold text-base ${data.primaryColor || 'text-white'}`}>
          {data.primaryValue}
        </div>
      )}

      {/* Ligne 3: Label (exercice/séance) - permet retour à la ligne */}
      <div className="text-slate-300 text-xs break-words leading-tight">
        {data.label}
      </div>

      {/* Ligne 4: Valeur secondaire (optionnelle) */}
      {data.secondaryLabel && (
        <div className="text-xs mt-0.5 whitespace-nowrap">
          <span className="text-slate-400">{data.secondaryLabel}</span>{' '}
          <span className={`font-medium ${data.secondaryColor || 'text-white'}`}>
            {data.secondaryValue}
          </span>
        </div>
      )}
    </div>
  );

  const baseClasses = "bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 shadow-xl";

  // Si position est fournie, on gère le positionnement intelligent
  if (position) {
    return (
      <div
        ref={tooltipRef}
        className={baseClasses}
        style={adjustedStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    );
  }

  // Mode standard sans positionnement
  return (
    <div
      ref={tooltipRef}
      className={baseClasses}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </div>
  );
};

// ===========================================
// HELPER FUNCTIONS FOR CALLERS
// ===========================================

export function formatVolume(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} Mt`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} T`;
  }
  return `${Math.round(value)} kg`;
}

export function getRpeColor(rpe: number | null): string {
  if (rpe === null) return 'text-blue-400';
  if (rpe <= 4) return 'text-green-400';
  if (rpe <= 6) return 'text-yellow-400';
  if (rpe <= 8) return 'text-orange-400';
  return 'text-red-400';
}

export function formatRpeValue(rpe: number | null): string {
  if (rpe === null) return 'non renseigné';
  return String(rpe);
}

export default ChartTooltipOverlay;
