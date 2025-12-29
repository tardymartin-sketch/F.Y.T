// ============================================================
// F.Y.T - SIDEBAR (avec Session en cours)
// src/components/Sidebar.tsx
// Navigation avec menu "Session en cours" pour persistence
// ============================================================

import React from 'react';
import { 
  Home, 
  Play, 
  History, 
  Users, 
  Settings, 
  LogOut, 
  Shield,
  Dumbbell,
  ChevronRight,
  X,
  Download,
  Timer
} from 'lucide-react';
import { User } from '../../types';

interface Props {
  currentView: string;
  setCurrentView: (view: string) => void;
  isAdmin: boolean;
  isCoach: boolean;
  onLogout: () => void;
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  hasActiveSession?: boolean; // NOUVEAU: indique si une session est en cours
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  highlight?: boolean;
}

export const Sidebar: React.FC<Props> = ({ 
  currentView, 
  setCurrentView, 
  isAdmin,
  isCoach, 
  onLogout, 
  user,
  isOpen,
  onClose,
  hasActiveSession = false
}) => {
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { id: 'home', label: 'Accueil', icon: Home },
    ];

    // NOUVEAU: Ajouter "Session en cours" si une session est active
    if (hasActiveSession) {
      items.push({ 
        id: 'active', 
        label: 'Session en cours', 
        icon: Timer,
        highlight: true 
      });
    }

    items.push({ id: 'history', label: 'Historique', icon: History });
    items.push({ id: 'import', label: 'Importer', icon: Download });

    if (isCoach || isAdmin) {
      items.push({ id: 'team', label: 'Mes Athlètes', icon: Users });
    }

    if (isAdmin) {
      items.push({ id: 'admin', label: 'Administration', icon: Shield });
    }

    items.push({ id: 'settings', label: 'Paramètres', icon: Settings });

    return items;
  };

  const menuItems = getMenuItems();

  const getRoleBadge = () => {
    if (!user) return null;
    const colors = {
      admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      coach: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      athlete: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return colors[user.role] || colors.athlete;
  };

  const handleNavigation = (viewId: string) => {
    setCurrentView(viewId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // MODIFIÉ: Afficher toujours le prénom
  const getDisplayName = () => {
    if (!user) return '';
    // Priorité au prénom, sinon utiliser le username
    return user.firstName || user.username?.split('.')[0] || user.username;
  };

  const getInitials = () => {
    if (!user) return '';
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`;
    }
    if (user.firstName) {
      return user.firstName[0];
    }
    return user.username?.[0] || '?';
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-slate-900 border-r border-slate-800 z-50 
        transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static
        flex flex-col
      `}>
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                <Dumbbell className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg">F.Y.T</h1>
                <div className={`text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 mt-0.5 ${getRoleBadge()}`}>
                  {user?.role === 'admin' && <Shield className="w-3 h-3" />}
                  {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
                </div>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-4 border-b border-slate-800/50">
            <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                {getInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {getDisplayName()} {user.lastName || ''}
                </p>
                <p className="text-slate-500 text-sm truncate">@{user.username}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isHighlighted = item.highlight;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                    : isHighlighted
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : isHighlighted ? 'text-orange-400' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {isHighlighted && !isActive && (
                  <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
                )}
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'translate-x-1' : ''}`} />
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
};
