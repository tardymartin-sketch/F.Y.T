// ============================================================
// F.Y.T - Badge Component
// src/components/shared/Badge.tsx
// Composant badge pour les indicateurs et labels
// ============================================================

import React from 'react';
import { getRpeColorClasses } from '../../styles/tokens';

// ===========================================
// TYPES
// ===========================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'rpe';
  size?: 'sm' | 'md' | 'lg';
  rpeValue?: number;
  dot?: boolean;
  className?: string;
}

// ===========================================
// VARIANTS
// ===========================================

const variantStyles: Record<Exclude<BadgeProps['variant'], 'rpe' | undefined>, string> = {
  default: 'bg-slate-700 text-slate-300',
  primary: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  info: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
};

const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
  lg: 'text-sm px-2.5 py-1',
};

// ===========================================
// COMPONENT
// ===========================================

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  rpeValue,
  dot = false,
  className = '',
}) => {
  // Pour les badges RPE, utiliser les couleurs dynamiques
  const getRpeStyles = (rpe: number) => {
    const colors = getRpeColorClasses(rpe);
    return `${colors.bg} ${colors.text} border ${colors.border}`;
  };

  const badgeStyles = variant === 'rpe' && rpeValue !== undefined
    ? getRpeStyles(rpeValue)
    : variantStyles[variant as keyof typeof variantStyles];

  return (
    <span
      className={`
        inline-flex items-center gap-1
        font-medium rounded-full
        ${badgeStyles}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {dot && (
        <span 
          className={`
            w-1.5 h-1.5 rounded-full
            ${variant === 'success' ? 'bg-emerald-400' : ''}
            ${variant === 'warning' ? 'bg-amber-400' : ''}
            ${variant === 'danger' ? 'bg-red-400' : ''}
            ${variant === 'primary' ? 'bg-blue-400' : ''}
            ${variant === 'default' ? 'bg-slate-400' : ''}
          `}
        />
      )}
      {children}
    </span>
  );
};

// ===========================================
// RPE BADGE SPECIFIC
// ===========================================

interface RpeBadgeProps {
  value: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const RpeBadge: React.FC<RpeBadgeProps> = ({
  value,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  if (value === null || value === undefined) {
    return (
      <Badge variant="default" size={size} className={className}>
        —
      </Badge>
    );
  }

  const rpeLabels: Record<number, string> = {
    1: 'Très facile',
    2: 'Facile',
    3: 'Léger',
    4: 'Modéré',
    5: 'Un peu dur',
    6: 'Dur',
    7: 'Très dur',
    8: 'Extrêmement dur',
    9: 'Maximum',
    10: 'Échec',
  };

  return (
    <Badge variant="rpe" rpeValue={value} size={size} className={className}>
      {value}
      {showLabel && (
        <span className="ml-1 opacity-80">
          {rpeLabels[Math.round(value)] || ''}
        </span>
      )}
    </Badge>
  );
};

// ===========================================
// NOTIFICATION BADGE
// ===========================================

interface NotificationBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  max = 9,
  className = '',
}) => {
  if (count <= 0) return null;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-[18px] h-[18px] px-1
        text-[10px] font-bold
        text-white bg-red-500
        rounded-full
        ${className}
      `}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
};

// ===========================================
// STATUS BADGE
// ===========================================

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const statusColors: Record<StatusBadgeProps['status'], string> = {
    online: 'bg-emerald-500',
    offline: 'bg-slate-500',
    busy: 'bg-red-500',
    away: 'bg-amber-500',
  };

  const sizes: Record<NonNullable<StatusBadgeProps['size']>, string> = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
  };

  return (
    <span
      className={`
        inline-block rounded-full
        ${statusColors[status]}
        ${sizes[size]}
        ${status === 'online' ? 'animate-pulse' : ''}
        ${className}
      `}
    />
  );
};

export default Badge;
