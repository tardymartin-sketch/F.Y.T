// ===========================================
// F.Y.T - Stepper Component
// src/components/shared/Stepper.tsx
// Input numérique avec boutons +/- optimisé tactile
// ===========================================

import React, { useRef, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  longPressStep?: number;
  unit?: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

// ===========================================
// CONFIGURATION
// ===========================================

const LONG_PRESS_DELAY = 500; // ms avant activation long-press
const LONG_PRESS_INTERVAL = 100; // ms entre chaque incrément en long-press

const sizeClasses = {
  sm: {
    button: 'w-10 h-10',
    value: 'text-xl',
    unit: 'text-xs',
    label: 'text-xs',
  },
  md: {
    button: 'w-12 h-12',
    value: 'text-2xl',
    unit: 'text-sm',
    label: 'text-sm',
  },
  lg: {
    button: 'w-14 h-14',
    value: 'text-3xl',
    unit: 'text-base',
    label: 'text-base',
  },
};

// ===========================================
// COMPOSANT PRINCIPAL
// ===========================================

export const Stepper: React.FC<StepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  longPressStep,
  unit,
  label,
  size = 'md',
  disabled = false,
  className = '',
}) => {
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);
  
  const effectiveLongPressStep = longPressStep ?? step * 5;
  const classes = sizeClasses[size];

  // Incrémenter la valeur
  const increment = useCallback((stepValue: number) => {
    onChange(Math.min(max, value + stepValue));
  }, [onChange, max, value]);

  // Décrémenter la valeur
  const decrement = useCallback((stepValue: number) => {
    onChange(Math.max(min, value - stepValue));
  }, [onChange, min, value]);

  // Démarrer le press
  const handlePressStart = useCallback((direction: 'inc' | 'dec') => {
    if (disabled) return;
    
    isLongPressing.current = false;

    // Action immédiate
    if (direction === 'inc') {
      increment(step);
    } else {
      decrement(step);
    }

    // Timer pour détecter le long-press
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      
      // Démarrer l'intervalle pour les incréments rapides
      intervalRef.current = setInterval(() => {
        if (direction === 'inc') {
          increment(effectiveLongPressStep);
        } else {
          decrement(effectiveLongPressStep);
        }
      }, LONG_PRESS_INTERVAL);
    }, LONG_PRESS_DELAY);
  }, [disabled, increment, decrement, step, effectiveLongPressStep]);

  // Arrêter le press
  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    isLongPressing.current = false;
  }, []);

  // Formatage de la valeur
  const formatValue = (val: number): string => {
    // Si c'est un nombre décimal, afficher 1 décimale
    if (val % 1 !== 0) {
      return val.toFixed(1);
    }
    return val.toString();
  };

  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* Label optionnel */}
      {label && (
        <span className={`text-slate-400 font-medium ${classes.label}`}>
          {label}
        </span>
      )}

      {/* Contrôles */}
      <div className="flex items-center gap-3">
        {/* Bouton - */}
        <button
          type="button"
          onMouseDown={() => handlePressStart('dec')}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={() => handlePressStart('dec')}
          onTouchEnd={handlePressEnd}
          disabled={disabled || value <= min}
          className={`
            ${classes.button}
            flex items-center justify-center
            bg-slate-700 hover:bg-slate-600
            rounded-xl
            transition-all duration-150 ease-out
            active:scale-90 active:bg-slate-600
            disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
            touch-manipulation
            select-none
          `}
          aria-label="Diminuer"
        >
          <Minus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>

        {/* Valeur */}
        <div className="flex flex-col items-center min-w-[60px]">
          <span className={`font-bold text-white tabular-nums ${classes.value}`}>
            {formatValue(value)}
          </span>
          {unit && (
            <span className={`text-slate-400 ${classes.unit}`}>
              {unit}
            </span>
          )}
        </div>

        {/* Bouton + */}
        <button
          type="button"
          onMouseDown={() => handlePressStart('inc')}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={() => handlePressStart('inc')}
          onTouchEnd={handlePressEnd}
          disabled={disabled || value >= max}
          className={`
            ${classes.button}
            flex items-center justify-center
            bg-slate-700 hover:bg-slate-600
            rounded-xl
            transition-all duration-150 ease-out
            active:scale-90 active:bg-slate-600
            disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
            touch-manipulation
            select-none
          `}
          aria-label="Augmenter"
        >
          <Plus className="w-5 h-5 text-white" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default Stepper;

// ===========================================
// VARIANTES PRÉ-CONFIGURÉES
// ===========================================

/**
 * Stepper pré-configuré pour les répétitions
 */
export const RepsStepper: React.FC<Omit<StepperProps, 'step' | 'longPressStep' | 'unit' | 'min' | 'max'> & { label?: string }> = (props) => (
  <Stepper
    {...props}
    step={1}
    longPressStep={5}
    unit="reps"
    min={1}
    max={100}
  />
);

/**
 * Stepper pré-configuré pour le poids (kg)
 */
export const WeightStepper: React.FC<Omit<StepperProps, 'step' | 'longPressStep' | 'unit' | 'min' | 'max'> & { label?: string }> = (props) => (
  <Stepper
    {...props}
    step={2.5}
    longPressStep={10}
    unit="kg"
    min={0}
    max={500}
  />
);

/**
 * Stepper pré-configuré pour le RPE (1-10)
 */
export const RpeStepper: React.FC<Omit<StepperProps, 'step' | 'longPressStep' | 'unit' | 'min' | 'max'> & { label?: string }> = (props) => (
  <Stepper
    {...props}
    step={1}
    longPressStep={1}
    unit="RPE"
    min={1}
    max={10}
  />
);
