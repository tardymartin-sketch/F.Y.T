// ===========================================
// Composants Thémés - Versions stylées par direction artistique
// Ces composants montrent les VRAIES différences visuelles entre thèmes
// ===========================================

import React from 'react';
import { Play, Plus, Check, Trash2, Dumbbell, Clock, TrendingUp, ChevronRight, Bell, User, Home, History, BarChart3, Settings, Calendar, Flame, Trophy, Timer, X } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

type ThemeName = 'current' | 'premium' | 'energetic' | 'minimal' | 'neon' | 'minimal-blue' | 'minimal-warm' | 'minimal-coffee' | 'minimal-lavender' | 'minimal-slate';

interface ThemedProps {
  theme: ThemeName;
}

// Helper pour détecter les variantes minimal
const isMinimalVariant = (theme: ThemeName): boolean => {
  return theme === 'minimal' || theme.startsWith('minimal-');
};

// ===========================================
// THEMED BUTTON
// ===========================================

const buttonStyles: Record<ThemeName, {
  primary: string;
  secondary: string;
  ghost: string;
}> = {
  current: {
    primary: 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-semibold shadow-lg shadow-blue-600/25 rounded-xl',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 rounded-xl',
    ghost: 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl',
  },
  premium: {
    primary: 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-black font-bold shadow-lg shadow-amber-500/30 rounded-sm tracking-wide uppercase',
    secondary: 'bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-600/50 rounded-sm uppercase tracking-wider',
    ghost: 'bg-transparent hover:bg-neutral-900 text-neutral-400 hover:text-amber-400 rounded-sm',
  },
  energetic: {
    primary: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-400 hover:via-pink-400 hover:to-purple-400 text-white font-black shadow-xl shadow-orange-500/40 rounded-2xl skew-x-[-2deg]',
    secondary: 'bg-stone-800 hover:bg-stone-700 text-orange-400 border-2 border-orange-500/50 rounded-2xl font-bold',
    ghost: 'bg-transparent hover:bg-stone-800/50 text-stone-400 hover:text-orange-400 rounded-2xl',
  },
  minimal: {
    primary: 'bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-sm rounded-full px-8',
    secondary: 'bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-full',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-full',
  },
  neon: {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_30px_rgba(0,255,255,0.5)] hover:shadow-[0_0_40px_rgba(0,255,255,0.7)] rounded-lg border-2 border-cyan-300',
    secondary: 'bg-transparent hover:bg-fuchsia-500/20 text-fuchsia-400 border-2 border-fuchsia-500 hover:border-fuchsia-400 rounded-lg shadow-[0_0_15px_rgba(255,0,255,0.3)]',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-400 hover:text-cyan-400 rounded-lg hover:shadow-[0_0_10px_rgba(0,255,255,0.3)]',
  },
  // === MINIMAL VARIANTS ===
  'minimal-blue': {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm shadow-blue-200 rounded-full px-8',
    secondary: 'bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-full',
    ghost: 'bg-transparent hover:bg-blue-50 text-blue-600 hover:text-blue-700 rounded-full',
  },
  'minimal-warm': {
    primary: 'bg-orange-700 hover:bg-orange-600 text-white font-medium shadow-sm rounded-full px-8',
    secondary: 'bg-white hover:bg-orange-50 text-orange-700 border border-orange-200 rounded-full',
    ghost: 'bg-transparent hover:bg-orange-50 text-orange-700 hover:text-orange-800 rounded-full',
  },
  'minimal-coffee': {
    primary: 'bg-stone-600 hover:bg-stone-500 text-white font-medium shadow-sm rounded-full px-8',
    secondary: 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-full',
    ghost: 'bg-transparent hover:bg-stone-100 text-stone-600 hover:text-stone-700 rounded-full',
  },
  'minimal-lavender': {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm shadow-indigo-200 rounded-full px-8',
    secondary: 'bg-white hover:bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full',
    ghost: 'bg-transparent hover:bg-indigo-50 text-indigo-600 hover:text-indigo-700 rounded-full',
  },
  'minimal-slate': {
    primary: 'bg-slate-700 hover:bg-slate-600 text-white font-medium shadow-sm shadow-slate-200 rounded-full px-8',
    secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-full',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded-full',
  },
};

export const ThemedButton: React.FC<ThemedProps & {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}> = ({ theme, variant = 'primary', children, icon, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-9 px-4 text-sm gap-1.5',
    md: 'h-11 px-5 text-sm gap-2',
    lg: 'h-14 px-8 text-base gap-3',
  };

  return (
    <button className={`
      inline-flex items-center justify-center
      transition-all duration-200
      active:scale-95
      ${buttonStyles[theme][variant]}
      ${sizeClasses[size]}
    `}>
      {icon}
      {children}
    </button>
  );
};

// ===========================================
// THEMED CARD - Toujours fond blanc pour minimal
// ===========================================

const cardStyles: Record<ThemeName, {
  container: string;
  title: string;
  subtitle: string;
  divider: string;
}> = {
  current: {
    container: 'bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 backdrop-blur-sm',
    title: 'text-white font-semibold',
    subtitle: 'text-slate-400',
    divider: 'border-slate-700/50',
  },
  premium: {
    container: 'bg-gradient-to-br from-neutral-900 to-black border border-amber-600/30 rounded-sm p-6 shadow-2xl',
    title: 'text-amber-100 font-serif font-bold tracking-wide',
    subtitle: 'text-neutral-500 font-light tracking-wide',
    divider: 'border-amber-600/20',
  },
  energetic: {
    container: 'bg-gradient-to-br from-stone-800 to-stone-900 border-2 border-orange-500/30 rounded-3xl p-5 shadow-xl shadow-orange-500/10',
    title: 'text-white font-black',
    subtitle: 'text-stone-400',
    divider: 'border-orange-500/20',
  },
  minimal: {
    container: 'bg-white border border-slate-200 rounded-2xl p-6 shadow-sm',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-slate-500',
    divider: 'border-slate-100',
  },
  neon: {
    container: 'bg-gray-900/80 border border-cyan-500/50 rounded-lg p-5 shadow-[0_0_20px_rgba(0,255,255,0.15)] backdrop-blur-md',
    title: 'text-cyan-100 font-bold',
    subtitle: 'text-gray-500',
    divider: 'border-cyan-500/20',
  },
  // === MINIMAL VARIANTS - Tous avec fond blanc ===
  'minimal-blue': {
    container: 'bg-white border border-blue-200 rounded-2xl p-6 shadow-sm',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-blue-600',
    divider: 'border-blue-100',
  },
  'minimal-warm': {
    container: 'bg-white border border-orange-200 rounded-2xl p-6 shadow-sm',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-orange-600',
    divider: 'border-orange-100',
  },
  'minimal-coffee': {
    container: 'bg-white border border-stone-300 rounded-2xl p-6 shadow-sm',
    title: 'text-stone-900 font-medium',
    subtitle: 'text-stone-500',
    divider: 'border-stone-200',
  },
  'minimal-lavender': {
    container: 'bg-white border border-indigo-200 rounded-2xl p-6 shadow-sm',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-indigo-600',
    divider: 'border-indigo-100',
  },
  'minimal-slate': {
    container: 'bg-white border border-slate-200 rounded-2xl p-6 shadow-sm',
    title: 'text-slate-900 font-semibold',
    subtitle: 'text-slate-500',
    divider: 'border-slate-200',
  },
};

export const ThemedCard: React.FC<ThemedProps & {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ theme, title, subtitle, children, footer }) => {
  const styles = cardStyles[theme];

  return (
    <div className={styles.container}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && <h3 className={`text-lg ${styles.title}`}>{title}</h3>}
          {subtitle && <p className={`text-sm mt-1 ${styles.subtitle}`}>{subtitle}</p>}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className={`mt-4 pt-4 border-t ${styles.divider}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

// ===========================================
// THEMED BADGE
// ===========================================

const badgeStyles: Record<ThemeName, {
  default: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}> = {
  current: {
    default: 'bg-slate-700 text-slate-300 rounded-full',
    success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full',
    danger: 'bg-red-500/20 text-red-400 border border-red-500/30 rounded-full',
    info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full',
  },
  premium: {
    default: 'bg-neutral-800 text-neutral-400 rounded-none border-l-2 border-neutral-600',
    success: 'bg-emerald-900/50 text-emerald-300 rounded-none border-l-2 border-emerald-500',
    warning: 'bg-amber-900/50 text-amber-300 rounded-none border-l-2 border-amber-500',
    danger: 'bg-red-900/50 text-red-300 rounded-none border-l-2 border-red-500',
    info: 'bg-amber-900/30 text-amber-400 rounded-none border-l-2 border-amber-500',
  },
  energetic: {
    default: 'bg-stone-700 text-stone-300 rounded-xl',
    success: 'bg-green-500/30 text-green-300 rounded-xl font-bold',
    warning: 'bg-orange-500/30 text-orange-300 rounded-xl font-bold',
    danger: 'bg-pink-500/30 text-pink-300 rounded-xl font-bold',
    info: 'bg-purple-500/30 text-purple-300 rounded-xl font-bold',
  },
  minimal: {
    default: 'bg-slate-100 text-slate-600 rounded-md',
    success: 'bg-green-50 text-green-700 rounded-md',
    warning: 'bg-amber-50 text-amber-700 rounded-md',
    danger: 'bg-red-50 text-red-700 rounded-md',
    info: 'bg-blue-50 text-blue-700 rounded-md',
  },
  neon: {
    default: 'bg-gray-800 text-gray-400 rounded-sm border border-gray-700',
    success: 'bg-transparent text-green-400 rounded-sm border border-green-500 shadow-[0_0_10px_rgba(0,255,100,0.3)]',
    warning: 'bg-transparent text-yellow-400 rounded-sm border border-yellow-500 shadow-[0_0_10px_rgba(255,255,0,0.3)]',
    danger: 'bg-transparent text-red-400 rounded-sm border border-red-500 shadow-[0_0_10px_rgba(255,0,50,0.3)]',
    info: 'bg-transparent text-cyan-400 rounded-sm border border-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.3)]',
  },
  // === MINIMAL VARIANTS ===
  'minimal-blue': {
    default: 'bg-slate-100 text-slate-600 rounded-md',
    success: 'bg-green-50 text-green-700 rounded-md',
    warning: 'bg-amber-50 text-amber-700 rounded-md',
    danger: 'bg-red-50 text-red-700 rounded-md',
    info: 'bg-blue-100 text-blue-700 rounded-md',
  },
  'minimal-warm': {
    default: 'bg-orange-50 text-orange-700 rounded-md',
    success: 'bg-green-50 text-green-700 rounded-md',
    warning: 'bg-orange-100 text-orange-800 rounded-md',
    danger: 'bg-red-100 text-red-800 rounded-md',
    info: 'bg-orange-100 text-orange-700 rounded-md',
  },
  'minimal-coffee': {
    default: 'bg-stone-100 text-stone-600 rounded-md',
    success: 'bg-green-50 text-green-700 rounded-md',
    warning: 'bg-amber-50 text-amber-700 rounded-md',
    danger: 'bg-red-50 text-red-700 rounded-md',
    info: 'bg-stone-200 text-stone-700 rounded-md',
  },
  'minimal-lavender': {
    default: 'bg-slate-100 text-slate-600 rounded-md',
    success: 'bg-green-50 text-green-700 rounded-md',
    warning: 'bg-amber-50 text-amber-700 rounded-md',
    danger: 'bg-red-50 text-red-700 rounded-md',
    info: 'bg-indigo-100 text-indigo-700 rounded-md',
  },
  'minimal-slate': {
    default: 'bg-slate-200 text-slate-700 rounded-md',
    success: 'bg-green-50 text-green-700 rounded-md',
    warning: 'bg-amber-50 text-amber-700 rounded-md',
    danger: 'bg-red-50 text-red-700 rounded-md',
    info: 'bg-slate-300 text-slate-800 rounded-md',
  },
};

export const ThemedBadge: React.FC<ThemedProps & {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}> = ({ theme, variant = 'default', children }) => {
  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 text-xs font-medium
      ${badgeStyles[theme][variant]}
    `}>
      {children}
    </span>
  );
};

// ===========================================
// THEMED INPUT
// ===========================================

const inputStyles: Record<ThemeName, string> = {
  current: 'bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
  premium: 'bg-black border border-neutral-700 rounded-none text-amber-100 placeholder:text-neutral-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 font-light tracking-wide',
  energetic: 'bg-stone-800 border-2 border-stone-600 rounded-2xl text-white placeholder:text-stone-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/30',
  minimal: 'bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 shadow-sm',
  neon: 'bg-gray-900 border border-gray-700 rounded-lg text-cyan-100 placeholder:text-gray-600 focus:border-cyan-500 focus:ring-0 focus:shadow-[0_0_15px_rgba(0,255,255,0.3)]',
  // === MINIMAL VARIANTS ===
  'minimal-blue': 'bg-white border border-blue-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 shadow-sm',
  'minimal-warm': 'bg-white border border-orange-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 shadow-sm',
  'minimal-coffee': 'bg-white border border-stone-300 rounded-xl text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-100 shadow-sm',
  'minimal-lavender': 'bg-white border border-indigo-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 shadow-sm',
  'minimal-slate': 'bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 shadow-sm',
};

const labelStyles: Record<ThemeName, string> = {
  current: 'text-slate-300 text-sm font-medium',
  premium: 'text-neutral-400 text-xs uppercase tracking-widest font-light',
  energetic: 'text-stone-300 text-sm font-bold',
  minimal: 'text-slate-700 text-sm font-medium',
  neon: 'text-gray-400 text-xs uppercase tracking-wider',
  'minimal-blue': 'text-blue-700 text-sm font-medium',
  'minimal-warm': 'text-orange-700 text-sm font-medium',
  'minimal-coffee': 'text-stone-700 text-sm font-medium',
  'minimal-lavender': 'text-indigo-700 text-sm font-medium',
  'minimal-slate': 'text-slate-700 text-sm font-medium',
};

export const ThemedInput: React.FC<ThemedProps & {
  placeholder?: string;
  type?: string;
  label?: string;
}> = ({ theme, placeholder, type = 'text', label }) => {
  return (
    <div className="space-y-2">
      {label && <label className={labelStyles[theme]}>{label}</label>}
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full h-11 px-4 outline-none transition-all ${inputStyles[theme]}`}
      />
    </div>
  );
};

// ===========================================
// THEMED NAVIGATION
// ===========================================

const navStyles: Record<ThemeName, {
  container: string;
  item: string;
  itemActive: string;
  indicator: string;
}> = {
  current: {
    container: 'bg-slate-900/95 backdrop-blur-lg border-t border-slate-800',
    item: 'text-slate-500 hover:text-slate-300',
    itemActive: 'text-blue-400',
    indicator: 'bg-blue-500',
  },
  premium: {
    container: 'bg-black border-t border-amber-600/30',
    item: 'text-neutral-600 hover:text-neutral-400',
    itemActive: 'text-amber-400',
    indicator: 'bg-amber-500',
  },
  energetic: {
    container: 'bg-gradient-to-t from-stone-900 to-stone-900/95 border-t-2 border-orange-500/30',
    item: 'text-stone-500 hover:text-stone-300',
    itemActive: 'text-orange-400',
    indicator: 'bg-gradient-to-r from-orange-500 to-pink-500',
  },
  minimal: {
    container: 'bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]',
    item: 'text-slate-400 hover:text-slate-600',
    itemActive: 'text-slate-900',
    indicator: 'bg-slate-900',
  },
  neon: {
    container: 'bg-gray-950/95 backdrop-blur-lg border-t border-cyan-500/30',
    item: 'text-gray-600 hover:text-gray-400',
    itemActive: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]',
    indicator: 'bg-cyan-500 shadow-[0_0_15px_rgba(0,255,255,0.7)]',
  },
  // === MINIMAL VARIANTS ===
  'minimal-blue': {
    container: 'bg-white border-t border-blue-100 shadow-[0_-4px_20px_rgba(59,130,246,0.05)]',
    item: 'text-slate-400 hover:text-blue-500',
    itemActive: 'text-blue-600',
    indicator: 'bg-blue-600',
  },
  'minimal-warm': {
    container: 'bg-white border-t border-orange-200 shadow-[0_-4px_20px_rgba(249,115,22,0.05)]',
    item: 'text-slate-400 hover:text-orange-600',
    itemActive: 'text-orange-700',
    indicator: 'bg-orange-600',
  },
  'minimal-coffee': {
    container: 'bg-white border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]',
    item: 'text-stone-400 hover:text-stone-600',
    itemActive: 'text-stone-700',
    indicator: 'bg-stone-600',
  },
  'minimal-lavender': {
    container: 'bg-white border-t border-indigo-100 shadow-[0_-4px_20px_rgba(99,102,241,0.05)]',
    item: 'text-slate-400 hover:text-indigo-500',
    itemActive: 'text-indigo-600',
    indicator: 'bg-indigo-600',
  },
  'minimal-slate': {
    container: 'bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]',
    item: 'text-slate-400 hover:text-slate-600',
    itemActive: 'text-slate-800',
    indicator: 'bg-slate-700',
  },
};

export const ThemedBottomNav: React.FC<ThemedProps & { activeIndex?: number }> = ({ theme, activeIndex = 0 }) => {
  const styles = navStyles[theme];
  const items = [
    { icon: Home, label: 'Accueil' },
    { icon: History, label: 'Historique' },
    { icon: BarChart3, label: 'Stats' },
    { icon: User, label: 'Profil' },
  ];

  return (
    <div className={`${styles.container} px-6 py-3`}>
      <div className="flex items-center justify-around">
        {items.map((item, i) => {
          const Icon = item.icon;
          const isActive = i === activeIndex;
          return (
            <button
              key={item.label}
              className={`flex flex-col items-center gap-1 p-2 transition-all ${isActive ? styles.itemActive : styles.item}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" />
                {isActive && (
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${styles.indicator}`} />
                )}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ===========================================
// THEMED STAT CARD
// ===========================================

const statStyles: Record<ThemeName, {
  value: string;
  label: string;
  icon: string;
}> = {
  current: {
    value: 'text-white font-bold',
    label: 'text-slate-400',
    icon: 'text-blue-400 bg-blue-500/20',
  },
  premium: {
    value: 'text-amber-100 font-serif font-bold',
    label: 'text-neutral-500 uppercase tracking-widest text-[10px]',
    icon: 'text-amber-400 bg-amber-500/10',
  },
  energetic: {
    value: 'text-white font-black',
    label: 'text-stone-400',
    icon: 'text-orange-400 bg-orange-500/20',
  },
  minimal: {
    value: 'text-slate-900 font-semibold',
    label: 'text-slate-500',
    icon: 'text-slate-600 bg-slate-100',
  },
  neon: {
    value: 'text-cyan-300 font-bold drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]',
    label: 'text-gray-500',
    icon: 'text-cyan-400 bg-cyan-500/10 shadow-[0_0_10px_rgba(0,255,255,0.2)]',
  },
  // === MINIMAL VARIANTS ===
  'minimal-blue': {
    value: 'text-slate-900 font-semibold',
    label: 'text-blue-600',
    icon: 'text-blue-600 bg-blue-100',
  },
  'minimal-warm': {
    value: 'text-slate-900 font-semibold',
    label: 'text-orange-600',
    icon: 'text-orange-600 bg-orange-100',
  },
  'minimal-coffee': {
    value: 'text-stone-900 font-semibold',
    label: 'text-stone-500',
    icon: 'text-stone-600 bg-stone-200',
  },
  'minimal-lavender': {
    value: 'text-slate-900 font-semibold',
    label: 'text-indigo-600',
    icon: 'text-indigo-600 bg-indigo-100',
  },
  'minimal-slate': {
    value: 'text-slate-900 font-bold',
    label: 'text-slate-500',
    icon: 'text-slate-600 bg-slate-200',
  },
};

export const ThemedStatCard: React.FC<ThemedProps & {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  trend?: string;
}> = ({ theme, value, label, icon, trend }) => {
  const styles = statStyles[theme];
  const trendColor = isMinimalVariant(theme) ? 'text-emerald-600' : 'text-emerald-400';

  return (
    <ThemedCard theme={theme}>
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${styles.icon}`}>
          {icon}
        </div>
        <div>
          <div className={`text-2xl ${styles.value}`}>{value}</div>
          <div className={`text-sm mt-0.5 ${styles.label}`}>{label}</div>
          {trend && (
            <div className={`text-xs mt-1 ${trendColor}`}>
              {trend}
            </div>
          )}
        </div>
      </div>
    </ThemedCard>
  );
};

// ===========================================
// THEMED SESSION CARD
// ===========================================

const accentColors: Record<ThemeName, string> = {
  current: 'text-emerald-400 bg-emerald-500/20',
  premium: 'text-amber-400 bg-amber-500/10',
  energetic: 'text-pink-400 bg-pink-500/20',
  minimal: 'text-slate-600 bg-slate-100',
  neon: 'text-fuchsia-400 bg-fuchsia-500/10',
  'minimal-blue': 'text-blue-600 bg-blue-100',
  'minimal-warm': 'text-orange-600 bg-orange-100',
  'minimal-coffee': 'text-stone-600 bg-stone-200',
  'minimal-lavender': 'text-indigo-600 bg-indigo-100',
  'minimal-slate': 'text-slate-700 bg-slate-200',
};

const iconColors: Record<ThemeName, string> = {
  current: 'text-blue-400',
  premium: 'text-amber-400',
  energetic: 'text-orange-400',
  minimal: 'text-slate-500',
  neon: 'text-cyan-400',
  'minimal-blue': 'text-blue-500',
  'minimal-warm': 'text-orange-500',
  'minimal-coffee': 'text-stone-500',
  'minimal-lavender': 'text-indigo-500',
  'minimal-slate': 'text-slate-600',
};

export const ThemedSessionCard: React.FC<ThemedProps & {
  title: string;
  exercises: number;
  duration: string;
  isToday?: boolean;
}> = ({ theme, title, exercises, duration, isToday }) => {
  const isMinimal = isMinimalVariant(theme);
  const textMuted = isMinimal ? 'text-slate-500' : 'text-slate-400';
  const textLight = isMinimal ? 'text-slate-600' : 'text-slate-300';
  const textLighter = isMinimal ? 'text-slate-400' : 'text-slate-500';

  return (
    <ThemedCard
      theme={theme}
      title={title}
      footer={
        <ThemedButton theme={theme} variant="primary" icon={<Play className="w-4 h-4" />}>
          Démarrer
        </ThemedButton>
      }
    >
      <div className="space-y-4">
        {isToday && (
          <span className={`inline-block text-xs px-2 py-1 rounded-full ${accentColors[theme]}`}>
            Aujourd'hui
          </span>
        )}

        <div className={`flex items-center gap-4 text-sm ${textMuted}`}>
          <span className="flex items-center gap-1.5">
            <Dumbbell className={`w-4 h-4 ${iconColors[theme]}`} />
            {exercises} exercices
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className={`w-4 h-4 ${iconColors[theme]}`} />
            {duration}
          </span>
        </div>

        <div className={`space-y-1.5 text-sm ${textLight}`}>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 opacity-50" />
            Développé couché
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3 h-3 opacity-50" />
            Développé incliné
          </div>
          <div className={`flex items-center gap-2 ${textLighter}`}>
            <ChevronRight className="w-3 h-3 opacity-50" />
            +{exercises - 2} exercices
          </div>
        </div>
      </div>
    </ThemedCard>
  );
};

// ===========================================
// THEMED EXERCISE TILE
// ===========================================

const tileStyles: Record<ThemeName, string> = {
  current: 'bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl',
  premium: 'bg-gradient-to-br from-neutral-900 to-black hover:from-neutral-800 border border-amber-600/20 rounded-sm',
  energetic: 'bg-stone-800 hover:bg-stone-700 border-2 border-stone-600 hover:border-orange-500/50 rounded-2xl',
  minimal: 'bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md',
  neon: 'bg-gray-900/80 hover:bg-gray-800/80 border border-gray-700 hover:border-cyan-500/50 rounded-lg hover:shadow-[0_0_15px_rgba(0,255,255,0.2)]',
  'minimal-blue': 'bg-white hover:bg-blue-50/50 border border-blue-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-300',
  'minimal-warm': 'bg-white hover:bg-orange-50/50 border border-orange-200 rounded-2xl shadow-sm hover:shadow-md hover:border-orange-300',
  'minimal-coffee': 'bg-white hover:bg-stone-50 border border-stone-300 rounded-2xl shadow-sm hover:shadow-md hover:border-stone-400',
  'minimal-lavender': 'bg-white hover:bg-indigo-50/50 border border-indigo-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-300',
  'minimal-slate': 'bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300',
};

const titleStyles: Record<ThemeName, string> = {
  current: 'text-white font-medium',
  premium: 'text-amber-100 font-serif',
  energetic: 'text-white font-bold',
  minimal: 'text-slate-900 font-medium',
  neon: 'text-cyan-100 font-medium',
  'minimal-blue': 'text-slate-900 font-medium',
  'minimal-warm': 'text-slate-900 font-medium',
  'minimal-coffee': 'text-stone-900 font-medium',
  'minimal-lavender': 'text-slate-900 font-medium',
  'minimal-slate': 'text-slate-900 font-semibold',
};

export const ThemedExerciseTile: React.FC<ThemedProps & {
  name: string;
  sets: string;
  muscle: string;
  pr?: string;
}> = ({ theme, name, sets, muscle, pr }) => {
  const isMinimal = isMinimalVariant(theme);
  const subtitleColor = isMinimal ? 'text-slate-500' : 'text-slate-400';
  const prColor = isMinimal ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`p-4 transition-all cursor-pointer ${tileStyles[theme]}`}>
      <h4 className={`${titleStyles[theme]} truncate`}>{name}</h4>
      <p className={`text-sm mt-1 ${subtitleColor}`}>{sets}</p>
      <div className="flex items-center gap-2 mt-3">
        <ThemedBadge theme={theme} variant="info">{muscle}</ThemedBadge>
        {pr && <span className={`text-xs ${prColor}`}>PR: {pr}</span>}
      </div>
    </div>
  );
};

// ===========================================
// THEMED PROGRESS BAR
// ===========================================

const barStyles: Record<ThemeName, { bg: string; fill: string }> = {
  current: {
    bg: 'bg-slate-700',
    fill: 'bg-gradient-to-r from-blue-500 to-emerald-500'
  },
  premium: {
    bg: 'bg-neutral-800',
    fill: 'bg-gradient-to-r from-amber-600 to-yellow-500'
  },
  energetic: {
    bg: 'bg-stone-700',
    fill: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500'
  },
  minimal: {
    bg: 'bg-slate-200',
    fill: 'bg-slate-900'
  },
  neon: {
    bg: 'bg-gray-800',
    fill: 'bg-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.5)]'
  },
  'minimal-blue': {
    bg: 'bg-blue-100',
    fill: 'bg-blue-600'
  },
  'minimal-warm': {
    bg: 'bg-orange-100',
    fill: 'bg-orange-600'
  },
  'minimal-coffee': {
    bg: 'bg-stone-200',
    fill: 'bg-stone-600'
  },
  'minimal-lavender': {
    bg: 'bg-indigo-100',
    fill: 'bg-indigo-600'
  },
  'minimal-slate': {
    bg: 'bg-slate-200',
    fill: 'bg-slate-700'
  },
};

export const ThemedProgressBar: React.FC<ThemedProps & {
  value: number;
  label?: string;
}> = ({ theme, value, label }) => {
  const styles = barStyles[theme];
  const isMinimal = isMinimalVariant(theme);
  const labelColor = isMinimal ? 'text-slate-600' : 'text-slate-400';

  return (
    <div>
      {label && (
        <div className={`text-sm mb-2 ${labelColor}`}>
          {label}
        </div>
      )}
      <div className={`h-2 rounded-full overflow-hidden ${styles.bg}`}>
        <div
          className={`h-full rounded-full transition-all ${styles.fill}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

// ===========================================
// THEMED ENCOURAGEMENT KPI
// ===========================================

const encouragementStyles: Record<ThemeName, {
  container: string;
  icon: string;
  title: string;
  subtitle: string;
  closeBtn: string;
}> = {
  current: {
    container: 'bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/30 rounded-2xl',
    icon: 'text-emerald-400',
    title: 'text-white font-semibold',
    subtitle: 'text-slate-300',
    closeBtn: 'text-slate-400 hover:text-white',
  },
  premium: {
    container: 'bg-gradient-to-r from-amber-900/30 to-yellow-900/30 border border-amber-500/30 rounded-sm',
    icon: 'text-amber-400',
    title: 'text-amber-100 font-serif font-bold',
    subtitle: 'text-neutral-400',
    closeBtn: 'text-neutral-500 hover:text-amber-400',
  },
  energetic: {
    container: 'bg-gradient-to-r from-orange-600/20 to-pink-600/20 border-2 border-orange-500/30 rounded-2xl',
    icon: 'text-orange-400',
    title: 'text-white font-black',
    subtitle: 'text-stone-300',
    closeBtn: 'text-stone-400 hover:text-orange-400',
  },
  minimal: {
    container: 'bg-slate-100 border border-slate-200 rounded-2xl',
    icon: 'text-slate-600',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-slate-500',
    closeBtn: 'text-slate-400 hover:text-slate-600',
  },
  neon: {
    container: 'bg-gray-900/80 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(0,255,255,0.1)]',
    icon: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,255,255,0.5)]',
    title: 'text-cyan-100 font-bold',
    subtitle: 'text-gray-400',
    closeBtn: 'text-gray-500 hover:text-cyan-400',
  },
  'minimal-blue': {
    container: 'bg-blue-50 border border-blue-200 rounded-2xl',
    icon: 'text-blue-600',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-blue-600',
    closeBtn: 'text-slate-400 hover:text-blue-600',
  },
  'minimal-warm': {
    container: 'bg-orange-50 border border-orange-200 rounded-2xl',
    icon: 'text-orange-600',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-orange-600',
    closeBtn: 'text-slate-400 hover:text-orange-600',
  },
  'minimal-coffee': {
    container: 'bg-stone-100 border border-stone-300 rounded-2xl',
    icon: 'text-stone-600',
    title: 'text-stone-900 font-medium',
    subtitle: 'text-stone-500',
    closeBtn: 'text-stone-400 hover:text-stone-600',
  },
  'minimal-lavender': {
    container: 'bg-indigo-50 border border-indigo-200 rounded-2xl',
    icon: 'text-indigo-600',
    title: 'text-slate-900 font-medium',
    subtitle: 'text-indigo-600',
    closeBtn: 'text-slate-400 hover:text-indigo-600',
  },
  'minimal-slate': {
    container: 'bg-slate-100 border border-slate-300 rounded-2xl',
    icon: 'text-slate-700',
    title: 'text-slate-900 font-semibold',
    subtitle: 'text-slate-500',
    closeBtn: 'text-slate-400 hover:text-slate-700',
  },
};

export const ThemedEncouragementKPI: React.FC<ThemedProps & {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  showClose?: boolean;
}> = ({ theme, title, subtitle, icon, showClose = true }) => {
  const styles = encouragementStyles[theme];

  return (
    <div className={`p-4 ${styles.container}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${styles.icon}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm ${styles.title}`}>{title}</h3>
          <p className={`text-xs mt-0.5 ${styles.subtitle}`}>{subtitle}</p>
        </div>
        {showClose && (
          <button className={`flex-shrink-0 p-1 ${styles.closeBtn}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// ===========================================
// THEMED COACH MESSAGE
// ===========================================

const coachMessageStyles: Record<ThemeName, {
  container: string;
  avatar: string;
  name: string;
  message: string;
  time: string;
}> = {
  current: {
    container: 'bg-slate-800/50 border border-slate-700/50 rounded-xl',
    avatar: 'bg-gradient-to-br from-blue-500 to-emerald-500',
    name: 'text-white font-medium',
    message: 'text-slate-300',
    time: 'text-slate-500',
  },
  premium: {
    container: 'bg-neutral-900 border border-amber-600/20 rounded-sm',
    avatar: 'bg-gradient-to-br from-amber-500 to-yellow-400',
    name: 'text-amber-100 font-serif',
    message: 'text-neutral-400',
    time: 'text-neutral-600',
  },
  energetic: {
    container: 'bg-stone-800 border-2 border-orange-500/20 rounded-2xl',
    avatar: 'bg-gradient-to-br from-orange-500 to-pink-500',
    name: 'text-white font-bold',
    message: 'text-stone-300',
    time: 'text-stone-500',
  },
  minimal: {
    container: 'bg-white border border-slate-200 rounded-xl shadow-sm',
    avatar: 'bg-slate-900',
    name: 'text-slate-900 font-medium',
    message: 'text-slate-600',
    time: 'text-slate-400',
  },
  neon: {
    container: 'bg-gray-900/80 border border-fuchsia-500/30 rounded-lg',
    avatar: 'bg-gradient-to-br from-cyan-500 to-fuchsia-500',
    name: 'text-fuchsia-100 font-bold',
    message: 'text-gray-400',
    time: 'text-gray-600',
  },
  'minimal-blue': {
    container: 'bg-white border border-blue-200 rounded-xl shadow-sm',
    avatar: 'bg-blue-600',
    name: 'text-slate-900 font-medium',
    message: 'text-slate-600',
    time: 'text-blue-400',
  },
  'minimal-warm': {
    container: 'bg-white border border-orange-200 rounded-xl shadow-sm',
    avatar: 'bg-orange-600',
    name: 'text-slate-900 font-medium',
    message: 'text-slate-600',
    time: 'text-orange-400',
  },
  'minimal-coffee': {
    container: 'bg-white border border-stone-300 rounded-xl shadow-sm',
    avatar: 'bg-stone-600',
    name: 'text-stone-900 font-medium',
    message: 'text-stone-600',
    time: 'text-stone-400',
  },
  'minimal-lavender': {
    container: 'bg-white border border-indigo-200 rounded-xl shadow-sm',
    avatar: 'bg-indigo-600',
    name: 'text-slate-900 font-medium',
    message: 'text-slate-600',
    time: 'text-indigo-400',
  },
  'minimal-slate': {
    container: 'bg-white border border-slate-200 rounded-xl shadow-sm',
    avatar: 'bg-slate-700',
    name: 'text-slate-900 font-semibold',
    message: 'text-slate-600',
    time: 'text-slate-400',
  },
};

export const ThemedCoachMessage: React.FC<ThemedProps & {
  coachName: string;
  message: string;
  time: string;
}> = ({ theme, coachName, message, time }) => {
  const styles = coachMessageStyles[theme];

  return (
    <div className={`p-3 ${styles.container}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${styles.avatar}`}>
          {coachName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm ${styles.name}`}>{coachName}</span>
            <span className={`text-xs ${styles.time}`}>{time}</span>
          </div>
          <p className={`text-sm mt-1 line-clamp-2 ${styles.message}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

// ===========================================
// THEMED SESSION BADGE
// ===========================================

const sessionBadgeStyles: Record<ThemeName, {
  default: string;
  selected: string;
  completed: string;
  text: string;
  textSelected: string;
  check: string;
}> = {
  current: {
    default: 'bg-slate-800 border border-slate-700 hover:border-blue-500/50',
    selected: 'bg-blue-600/20 border-2 border-blue-500',
    completed: 'bg-emerald-600/20 border border-emerald-500/50',
    text: 'text-slate-300',
    textSelected: 'text-blue-400',
    check: 'text-emerald-400',
  },
  premium: {
    default: 'bg-neutral-900 border border-neutral-700 hover:border-amber-500/50',
    selected: 'bg-amber-600/20 border-2 border-amber-500',
    completed: 'bg-emerald-900/30 border border-emerald-500/50',
    text: 'text-neutral-300',
    textSelected: 'text-amber-400',
    check: 'text-emerald-400',
  },
  energetic: {
    default: 'bg-stone-800 border-2 border-stone-600 hover:border-orange-500/50',
    selected: 'bg-orange-600/20 border-2 border-orange-500',
    completed: 'bg-green-600/20 border-2 border-green-500/50',
    text: 'text-stone-300',
    textSelected: 'text-orange-400',
    check: 'text-green-400',
  },
  minimal: {
    default: 'bg-white border border-slate-200 hover:border-slate-400 shadow-sm',
    selected: 'bg-slate-100 border-2 border-slate-900',
    completed: 'bg-green-50 border border-green-300',
    text: 'text-slate-700',
    textSelected: 'text-slate-900',
    check: 'text-green-600',
  },
  neon: {
    default: 'bg-gray-900 border border-gray-700 hover:border-cyan-500/50',
    selected: 'bg-cyan-500/10 border-2 border-cyan-500 shadow-[0_0_10px_rgba(0,255,255,0.2)]',
    completed: 'bg-green-500/10 border border-green-500/50',
    text: 'text-gray-300',
    textSelected: 'text-cyan-400',
    check: 'text-green-400',
  },
  'minimal-blue': {
    default: 'bg-white border border-blue-200 hover:border-blue-400 shadow-sm',
    selected: 'bg-blue-50 border-2 border-blue-600',
    completed: 'bg-green-50 border border-green-300',
    text: 'text-slate-700',
    textSelected: 'text-blue-700',
    check: 'text-green-600',
  },
  'minimal-warm': {
    default: 'bg-white border border-orange-200 hover:border-orange-400 shadow-sm',
    selected: 'bg-orange-50 border-2 border-orange-600',
    completed: 'bg-green-50 border border-green-300',
    text: 'text-slate-700',
    textSelected: 'text-orange-700',
    check: 'text-green-600',
  },
  'minimal-coffee': {
    default: 'bg-white border border-stone-300 hover:border-stone-400 shadow-sm',
    selected: 'bg-stone-100 border-2 border-stone-600',
    completed: 'bg-green-50 border border-green-300',
    text: 'text-stone-700',
    textSelected: 'text-stone-800',
    check: 'text-green-600',
  },
  'minimal-lavender': {
    default: 'bg-white border border-indigo-200 hover:border-indigo-400 shadow-sm',
    selected: 'bg-indigo-50 border-2 border-indigo-600',
    completed: 'bg-green-50 border border-green-300',
    text: 'text-slate-700',
    textSelected: 'text-indigo-700',
    check: 'text-green-600',
  },
  'minimal-slate': {
    default: 'bg-white border border-slate-200 hover:border-slate-400 shadow-sm',
    selected: 'bg-slate-100 border-2 border-slate-700',
    completed: 'bg-green-50 border border-green-300',
    text: 'text-slate-700',
    textSelected: 'text-slate-900',
    check: 'text-green-600',
  },
};

export const ThemedSessionBadge: React.FC<ThemedProps & {
  name: string;
  isSelected?: boolean;
  isCompleted?: boolean;
  orderNumber?: number;
  onClick?: () => void;
}> = ({ theme, name, isSelected, isCompleted, orderNumber, onClick }) => {
  const styles = sessionBadgeStyles[theme];
  const containerStyle = isSelected ? styles.selected : isCompleted ? styles.completed : styles.default;
  const textStyle = isSelected ? styles.textSelected : styles.text;

  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl
        transition-all cursor-pointer text-left w-full
        ${containerStyle}
      `}
    >
      <span className={`text-sm font-medium truncate ${textStyle}`}>{name}</span>
      {isCompleted && !isSelected && (
        <Check className={`w-4 h-4 flex-shrink-0 ${styles.check}`} />
      )}
      {isSelected && orderNumber && (
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
          isMinimalVariant(theme) ? 'bg-slate-900 text-white' : 'bg-blue-500 text-white'
        }`}>
          {orderNumber}
        </span>
      )}
    </button>
  );
};

// ===========================================
// THEMED ACTIVE SESSION BANNER
// ===========================================

const activeSessionBannerStyles: Record<ThemeName, {
  container: string;
  icon: string;
  title: string;
  subtitle: string;
  arrow: string;
}> = {
  current: {
    container: 'bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-lg shadow-orange-500/25',
    icon: 'bg-white/20',
    title: 'text-white font-semibold',
    subtitle: 'text-white/80',
    arrow: 'text-white',
  },
  premium: {
    container: 'bg-gradient-to-r from-amber-600 to-yellow-500 rounded-sm shadow-lg',
    icon: 'bg-black/20',
    title: 'text-black font-bold uppercase tracking-wide',
    subtitle: 'text-black/70',
    arrow: 'text-black',
  },
  energetic: {
    container: 'bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-2xl shadow-xl',
    icon: 'bg-white/20',
    title: 'text-white font-black',
    subtitle: 'text-white/80',
    arrow: 'text-white',
  },
  minimal: {
    container: 'bg-slate-900 rounded-2xl shadow-lg',
    icon: 'bg-white/10',
    title: 'text-white font-medium',
    subtitle: 'text-slate-300',
    arrow: 'text-white',
  },
  neon: {
    container: 'bg-gradient-to-r from-orange-600 to-amber-500 rounded-lg shadow-[0_0_20px_rgba(255,165,0,0.4)]',
    icon: 'bg-white/20',
    title: 'text-white font-bold',
    subtitle: 'text-white/80',
    arrow: 'text-white',
  },
  'minimal-blue': {
    container: 'bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/25',
    icon: 'bg-white/20',
    title: 'text-white font-medium',
    subtitle: 'text-blue-100',
    arrow: 'text-white',
  },
  'minimal-warm': {
    container: 'bg-orange-600 rounded-2xl shadow-lg shadow-orange-500/25',
    icon: 'bg-white/20',
    title: 'text-white font-medium',
    subtitle: 'text-orange-100',
    arrow: 'text-white',
  },
  'minimal-coffee': {
    container: 'bg-stone-700 rounded-2xl shadow-lg shadow-stone-500/25',
    icon: 'bg-white/20',
    title: 'text-white font-medium',
    subtitle: 'text-stone-200',
    arrow: 'text-white',
  },
  'minimal-lavender': {
    container: 'bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-500/25',
    icon: 'bg-white/20',
    title: 'text-white font-medium',
    subtitle: 'text-indigo-100',
    arrow: 'text-white',
  },
  'minimal-slate': {
    container: 'bg-slate-800 rounded-2xl shadow-lg shadow-slate-500/25',
    icon: 'bg-white/20',
    title: 'text-white font-semibold',
    subtitle: 'text-slate-200',
    arrow: 'text-white',
  },
};

export const ThemedActiveSessionBanner: React.FC<ThemedProps & {
  title: string;
  subtitle: string;
}> = ({ theme, title, subtitle }) => {
  const styles = activeSessionBannerStyles[theme];

  return (
    <div className={`p-4 ${styles.container}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${styles.icon}`}>
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className={styles.title}>{title}</p>
            <p className={`text-sm ${styles.subtitle}`}>{subtitle}</p>
          </div>
        </div>
        <ChevronRight className={`w-6 h-6 ${styles.arrow}`} />
      </div>
    </div>
  );
};

// ===========================================
// THEMED WEEK HEADER
// ===========================================

const weekHeaderStyles: Record<ThemeName, {
  container: string;
  icon: string;
  text: string;
}> = {
  current: {
    container: 'bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border-b border-slate-700/50',
    icon: 'text-blue-400',
    text: 'text-slate-300',
  },
  premium: {
    container: 'bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border-b border-amber-600/20',
    icon: 'text-amber-400',
    text: 'text-neutral-300',
  },
  energetic: {
    container: 'bg-gradient-to-r from-orange-600/20 to-pink-600/20 border-b border-orange-500/20',
    icon: 'text-orange-400',
    text: 'text-stone-300',
  },
  minimal: {
    container: 'bg-slate-100 border-b border-slate-200',
    icon: 'text-slate-600',
    text: 'text-slate-700',
  },
  neon: {
    container: 'bg-gradient-to-r from-cyan-900/30 to-fuchsia-900/20 border-b border-cyan-500/20',
    icon: 'text-cyan-400',
    text: 'text-gray-300',
  },
  'minimal-blue': {
    container: 'bg-blue-50 border-b border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-700',
  },
  'minimal-warm': {
    container: 'bg-orange-50 border-b border-orange-200',
    icon: 'text-orange-600',
    text: 'text-orange-700',
  },
  'minimal-coffee': {
    container: 'bg-stone-100 border-b border-stone-300',
    icon: 'text-stone-600',
    text: 'text-stone-700',
  },
  'minimal-lavender': {
    container: 'bg-indigo-50 border-b border-indigo-200',
    icon: 'text-indigo-600',
    text: 'text-indigo-700',
  },
  'minimal-slate': {
    container: 'bg-slate-100 border-b border-slate-200',
    icon: 'text-slate-600',
    text: 'text-slate-700',
  },
};

export const ThemedWeekHeader: React.FC<ThemedProps & {
  weekNumber: number;
  dateRange: string;
}> = ({ theme, weekNumber, dateRange }) => {
  const styles = weekHeaderStyles[theme];

  return (
    <div className={`px-4 py-3 ${styles.container}`}>
      <div className="flex items-center gap-2">
        <Calendar className={`w-4 h-4 ${styles.icon}`} />
        <span className={`text-sm font-medium ${styles.text}`}>
          Semaine {weekNumber}
        </span>
        <span className={`text-sm ${styles.text}`}>
          • {dateRange}
        </span>
      </div>
    </div>
  );
};

export type { ThemedProps, ThemeName };
