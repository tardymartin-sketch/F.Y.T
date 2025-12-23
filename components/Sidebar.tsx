
import React from 'react';
import { Home, PlayCircle, History, Settings, X, Dumbbell, LogOut, Users, HelpCircle, RefreshCw } from 'lucide-react';
import { User, UserRole } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  hasActiveSession: boolean;
  onLogout: () => void;
  user: User | null;
  version: string;
  onRefresh?: () => void; // New optional prop for hard refresh
}

export const Sidebar: React.FC<Props> = ({ isOpen, onClose, currentView, onNavigate, hasActiveSession, onLogout, user, version, onRefresh }) => {
  
  const getMenuItems = () => {
      const base = [{ id: 'home', label: 'Home', icon: Home }];
      
      if (!user) return base;

      // Athlete Menu
      if (user.role === 'athlete') {
          base.push(
            { id: 'active', label: 'Current Session', icon: PlayCircle },
            { id: 'history', label: 'History', icon: History },
            { id: 'settings', label: 'Help', icon: HelpCircle }
          );
      }
      
      // Coach Menu (Same as Athlete + Team)
      else if (user.role === 'coach') {
          base.push(
            { id: 'active', label: 'Current Session', icon: PlayCircle },
            { id: 'history', label: 'History', icon: History },
            { id: 'team', label: 'My Team', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings }
          );
      }
      
      // Admin Menu (Same as Coach + Users + Admin Settings)
      else if (user.role === 'admin') {
          base.push(
             { id: 'active', label: 'Current Session', icon: PlayCircle },
             { id: 'history', label: 'History', icon: History },
             { id: 'team', label: 'My Team', icon: Users },
             { id: 'users', label: 'Users', icon: Users },
             { id: 'settings', label: 'Admin Settings', icon: Settings }
          );
      }

      return base;
  };

  const menuItems = getMenuItems();

  const handleRefresh = () => {
      if (onRefresh) {
          onRefresh();
      } else {
          window.location.reload();
      }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-800 h-16">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
                <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">ProTrack</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-2 flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                if (window.innerWidth < 1024) onClose();
              }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                currentView === item.id 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-white' : ''}`} />
                <span className="font-medium">{item.label}</span>
              </div>
              {item.id === 'active' && hasActiveSession && (
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
            <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
            >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
            </button>
            <div className="text-xs text-slate-600 text-center flex items-center justify-center gap-2">
                <span>{version} • {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest'}</span>
                <button 
                  onClick={handleRefresh} 
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-500 hover:text-emerald-400 transition-colors"
                  title="Force Reset & Update"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
            </div>
        </div>
      </aside>
    </>
  );
};
