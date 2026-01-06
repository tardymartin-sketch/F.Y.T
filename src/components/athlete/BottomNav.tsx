// ===========================================
// F.Y.T - Bottom Navigation
// src/components/athlete/BottomNav.tsx
// Navigation par onglets pour l'interface athlète mobile-first
// ===========================================

import React from 'react';
import { 
  Home, 
  BarChart3, 
  MessageSquare, 
  User,
  LucideIcon
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

export type AthleteView = 'home' | 'history' | 'coach' | 'profile';

interface NavItem {
  id: AthleteView;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

interface BottomNavProps {
  currentView: AthleteView;
  onViewChange: (view: AthleteView) => void;
  unreadMessages?: number;
}

// ===========================================
// CONFIGURATION DES ONGLETS
// ===========================================

const NAV_ITEMS: NavItem[] = [
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'history', icon: BarChart3, label: 'Historique' },
  // Le FAB est géré séparément (espace vide ici)
  { id: 'coach', icon: MessageSquare, label: 'Coach' },
  { id: 'profile', icon: User, label: 'Profil' },
];

// ===========================================
// COMPOSANT PRINCIPAL
// ===========================================

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onViewChange,
  unreadMessages = 0,
}) => {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {/* Onglets gauche (Home, History) */}
        {NAV_ITEMS.slice(0, 2).map((item) => (
          <NavTab
            key={item.id}
            item={item}
            isActive={currentView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}

        {/* Espace pour le FAB */}
        <div className="w-16" />

        {/* Onglets droite (Coach, Profile) */}
        {NAV_ITEMS.slice(2).map((item) => (
          <NavTab
            key={item.id}
            item={{
              ...item,
              badge: item.id === 'coach' ? unreadMessages : undefined,
            }}
            isActive={currentView === item.id}
            onClick={() => onViewChange(item.id)}
          />
        ))}
      </div>
    </nav>
  );
};

// ===========================================
// COMPOSANT ONGLET
// ===========================================

interface NavTabProps {
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
}

const NavTab: React.FC<NavTabProps> = ({ item, isActive, onClick }) => {
  const Icon = item.icon;
  
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        min-w-[64px] h-12 px-3 rounded-xl
        transition-all duration-200 ease-out
        active:scale-95
        ${isActive 
          ? 'text-blue-500' 
          : 'text-slate-500 hover:text-slate-400'
        }
      `}
      aria-label={item.label}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icône */}
      <div className="relative">
        <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
        
        {/* Badge de notification */}
        {item.badge !== undefined && item.badge > 0 && (
          <span className="absolute -top-1 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
            {item.badge > 9 ? '9+' : item.badge}
          </span>
        )}
      </div>
      
      {/* Label */}
      <span className={`
        mt-1 text-[10px] font-medium
        transition-colors duration-200
        ${isActive ? 'text-blue-500' : 'text-slate-500'}
      `}>
        {item.label}
      </span>

      {/* Indicateur actif (dot) */}
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-blue-500" />
      )}
    </button>
  );
};

export default BottomNav;
