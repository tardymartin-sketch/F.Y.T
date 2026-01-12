// ============================================================
// F.Y.T - Button Component
// src/components/shared/Button.tsx
// Composant bouton réutilisable avec plusieurs variantes
// ============================================================

import React from 'react';

// ===========================================
// TYPES
// ===========================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

// ===========================================
// VARIANTS
// ===========================================

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: `
    bg-gradient-to-r from-blue-600 to-emerald-600
    hover:from-blue-500 hover:to-emerald-500
    text-white font-semibold
    shadow-lg shadow-blue-600/20
    active:shadow-md
  `,
  secondary: `
    bg-slate-700 hover:bg-slate-600
    text-white font-medium
    border border-slate-600
  `,
  outline: `
    bg-transparent hover:bg-slate-800
    text-slate-300 hover:text-white
    border border-slate-600 hover:border-slate-500
    font-medium
  `,
  ghost: `
    bg-transparent hover:bg-slate-800
    text-slate-400 hover:text-white
    font-medium
  `,
  danger: `
    bg-red-600 hover:bg-red-500
    text-white font-semibold
    shadow-lg shadow-red-600/20
  `,
  success: `
    bg-emerald-600 hover:bg-emerald-500
    text-white font-semibold
    shadow-lg shadow-emerald-600/20
  `,
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2',
  xl: 'h-14 px-8 text-lg rounded-xl gap-3',
};

// ===========================================
// COMPONENT
// ===========================================

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  disabled,
  className = '',
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`
        inline-flex items-center justify-center
        transition-all duration-200 ease-out
        active:scale-[0.98]
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
        disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={isDisabled}
      {...props}
    >
      {/* Loading spinner */}
      {loading && (
        <svg 
          className="animate-spin w-4 h-4" 
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {/* Icon left */}
      {!loading && icon && iconPosition === 'left' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
      
      {/* Label */}
      {children && <span>{children}</span>}
      
      {/* Icon right */}
      {!loading && icon && iconPosition === 'right' && (
        <span className="flex-shrink-0">{icon}</span>
      )}
    </button>
  );
};

// ===========================================
// ICON BUTTON VARIANT
// ===========================================

interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconPosition' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = 'ghost',
  size = 'md',
  className = '',
  ...props
}) => {
  const iconSizes: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-lg
        transition-all duration-200 ease-out
        active:scale-95
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${iconSizes[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
    </button>
  );
};

export default Button;
