// ============================================================
// F.Y.T - Card Component
// src/components/shared/Card.tsx
// Composant carte réutilisable avec plusieurs variantes
// ============================================================

import React from 'react';

// ===========================================
// TYPES
// ===========================================

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  interactive?: boolean;
}

// ===========================================
// VARIANTS
// ===========================================

const variantStyles: Record<NonNullable<CardProps['variant']>, string> = {
  default: 'bg-slate-800/50 border border-slate-700/50',
  elevated: 'bg-slate-800 border border-slate-700 shadow-lg shadow-black/20',
  outlined: 'bg-transparent border border-slate-700',
  gradient: 'bg-gradient-to-br from-slate-800 to-slate-800/50 border border-slate-700/50',
  glass: 'bg-slate-800/30 backdrop-blur-lg border border-slate-700/30',
};

const paddingStyles: Record<NonNullable<CardProps['padding']>, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// ===========================================
// COMPONENT
// ===========================================

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  onClick,
  interactive = false,
}) => {
  const isClickable = onClick !== undefined || interactive;
  
  const baseStyles = `
    rounded-xl
    transition-all duration-200
    ${variantStyles[variant]}
    ${paddingStyles[padding]}
    ${isClickable ? 'cursor-pointer hover:bg-slate-700/50 active:scale-[0.98]' : ''}
    ${className}
  `;

  if (onClick) {
    return (
      <button 
        onClick={onClick}
        className={`${baseStyles} w-full text-left`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={baseStyles}>
      {children}
    </div>
  );
};

// ===========================================
// CARD HEADER
// ===========================================

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  action,
}) => {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      <div>{children}</div>
      {action && <div>{action}</div>}
    </div>
  );
};

// ===========================================
// CARD TITLE
// ===========================================

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const titleSizes: Record<NonNullable<CardTitleProps['size']>, string> = {
  sm: 'text-sm font-medium',
  md: 'text-base font-semibold',
  lg: 'text-lg font-bold',
};

export const CardTitle: React.FC<CardTitleProps> = ({
  children,
  className = '',
  size = 'md',
}) => {
  return (
    <h3 className={`text-white ${titleSizes[size]} ${className}`}>
      {children}
    </h3>
  );
};

// ===========================================
// CARD DESCRIPTION
// ===========================================

interface CardDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export const CardDescription: React.FC<CardDescriptionProps> = ({
  children,
  className = '',
}) => {
  return (
    <p className={`text-sm text-slate-400 ${className}`}>
      {children}
    </p>
  );
};

// ===========================================
// CARD CONTENT
// ===========================================

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={className}>
      {children}
    </div>
  );
};

// ===========================================
// CARD FOOTER
// ===========================================

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
}) => {
  return (
    <div className={`mt-4 pt-4 border-t border-slate-700/50 ${className}`}>
      {children}
    </div>
  );
};

// ===========================================
// CARD STAT (for displaying statistics)
// ===========================================

export interface CardStatProps {
  value: string | number;
  label: string;
  className?: string;
  valueColor?: string;
}

export const CardStat: React.FC<CardStatProps> = ({
  value,
  label,
  className = '',
  valueColor = 'text-white',
}) => {
  return (
    <div className={`text-center ${className}`}>
      <div className={`text-2xl font-bold ${valueColor}`}>
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-1">
        {label}
      </div>
    </div>
  );
};

// ===========================================
// EXPORT TYPES
// ===========================================

export type { 
  CardProps, 
  CardHeaderProps, 
  CardTitleProps, 
  CardContentProps, 
  CardFooterProps,
  CardDescriptionProps,
};

export default Card;
