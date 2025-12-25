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
  X
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
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

export const Sidebar: React.FC<Props> = ({ 
  currentView, 
  setCurrentView, 
  isAdmin,
  isCoach, 
  onLogout, 
  user,
  isOpen,
  onClose
}) => {
  const getMenuItems = (): MenuItem[] => {
    const items: MenuItem[] = [
      { id: 'home', label: 'Accueil', icon: Home },
      { id: 'history', label: 'Historique', icon: History },
    ];

    if (isCoach || isAdmin) {
      items.push({ id: 'team', label: 'Mon Équipe', icon: Users });
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
                <h1 className="font-bold text-white text-lg">UltiPrepa</h1>
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
                {user.firstName?.[0]}{user.lastName?.[0] || user.username?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">
                  {user.firstName} {user.lastName}
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
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-xl transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Se déconnecter</span>
          </button>
          <p className="text-center text-slate-600 text-xs mt-4">
            Version 2.0.0
          </p>
        </div>
      </aside>
    </>
  );
};
