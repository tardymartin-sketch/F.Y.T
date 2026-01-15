import React, { useEffect, useState } from 'react';
import { Home, History, MessageSquare, User } from 'lucide-react';
import { useUnreadCount } from '../../hooks/useUnreadCount';
import type { SessionState } from './FloatingActionButton';

export type AthleteView = 'home' | 'history' | 'coach' | 'profile';

interface Tab {
  id: AthleteView;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  showBadge?: boolean;
}

interface BottomNavProps {
  currentView?: AthleteView;
  onViewChange?: (tabId: AthleteView) => void;
  activeTab?: AthleteView;
  onTabChange?: (tabId: AthleteView) => void;
  unreadMessages?: number;
  sessionState?: SessionState;
  userId?: string;
  isOnSessionScreen?: boolean; // Indique si l'utilisateur est sur l'écran de session active
}

const tabs: Tab[] = [
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'history', icon: History, label: 'Historique' },
  { id: 'coach', icon: MessageSquare, label: 'Coach', showBadge: true },
  { id: 'profile', icon: User, label: 'Profil' },
];

export function BottomNav({ currentView, onViewChange, activeTab, onTabChange, unreadMessages, sessionState, userId, isOnSessionScreen }: BottomNavProps) {
  const { count: unreadCount } = useUnreadCount(userId);
  const activeId: AthleteView = (currentView ?? activeTab ?? 'home');
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [hasAddSession, setHasAddSession] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      // Lecture initiale
      const savedActiveSession = localStorage.getItem('F.Y.T_active_session');
      setHasActiveSession(!!savedActiveSession);

      const savedAddSession = localStorage.getItem('F.Y.T_add_session');
      setHasAddSession(!!savedAddSession);

      // Écouter les changements depuis d'autres onglets (StorageEvent)
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'F.Y.T_active_session') {
          setHasActiveSession(!!e.newValue);
        }
        if (e.key === 'F.Y.T_add_session') {
          setHasAddSession(!!e.newValue);
        }
      };

      // Écouter les changements locaux (même onglet) via CustomEvent
      const onLocalStorageChange = (e: Event) => {
        const customEvent = e as CustomEvent<{ key: string; value: string | null }>;
        if (customEvent.detail.key === 'F.Y.T_active_session') {
          setHasActiveSession(!!customEvent.detail.value);
        }
        if (customEvent.detail.key === 'F.Y.T_add_session') {
          setHasAddSession(!!customEvent.detail.value);
        }
      };

      window.addEventListener('storage', onStorage);
      window.addEventListener('local-storage-change', onLocalStorageChange);

      return () => {
        window.removeEventListener('storage', onStorage);
        window.removeEventListener('local-storage-change', onLocalStorageChange);
      };
    } catch {
      // ignore
    }
  }, []);

  const handleTabClick = (tabId: AthleteView) => {
    if (onViewChange) onViewChange(tabId);
    else if (onTabChange) onTabChange(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: AthleteView) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick(tabId);
    }
    
    // Arrow navigation
    const currentIndex = tabs.findIndex(t => t.id === tabId);
    if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
      if (onViewChange) onViewChange(tabs[currentIndex + 1].id);
      else if (onTabChange) onTabChange(tabs[currentIndex + 1].id);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      if (onViewChange) onViewChange(tabs[currentIndex - 1].id);
      else if (onTabChange) onTabChange(tabs[currentIndex - 1].id);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-[calc(64px+env(safe-area-inset-bottom))] bg-[#16191a] border-t border-[rgba(255,255,255,0.04)] backdrop-blur-sm z-30"
      role="navigation"
      aria-label="Navigation principale"
      >
        <div className="grid grid-cols-4 h-full">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeId === tab.id;
            const showBadgeCount = tab.showBadge && (unreadMessages ?? unreadCount) > 0;

            // Déterminer le type de bannière à afficher sur le bouton Home
            const isHomeTab = tab.id === 'home';
            const showActiveSessionBanner = isHomeTab && !isOnSessionScreen && (sessionState ? sessionState !== 'none' : hasActiveSession);
            const showAddSessionBanner = isHomeTab && !isOnSessionScreen && hasAddSession && !showActiveSessionBanner;

            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-1 text-sm
                  transition-all duration-150
                  active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-[#89a688]/20 focus:ring-inset
                  ${isActive ? 'text-white/95' : 'text-[#bfc7c5]/80 hover:text-[#bfc7c5]'}
                  ${showActiveSessionBanner ? 'w-full bg-gradient-to-r from-orange-500 to-amber-500 p-4 shadow-lg shadow-orange-500/25 animate-pulse-slow' : ''}
                  ${showAddSessionBanner ? 'w-full bg-gradient-to-r from-blue-500 to-purple-500 p-4 shadow-lg shadow-blue-500/25 animate-pulse-slow' : ''}
                `}
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                tabIndex={0}
              >
                <div className="relative flex flex-col items-center gap-1">
                  {/* Indicateur actif */}
                  {isActive && (
                    <div 
                      className="absolute -top-3 w-2 h-2 rounded-full bg-[#89a688]"
                      aria-hidden="true"
                    />
                  )}
                  
                  {/* Icône avec badge optionnel */}
                  <div className="relative">
                    <Icon className="w-6 h-6" aria-hidden="true" />
                    
                    {/* Badge non-lus */}
                    {showBadgeCount && (
                      <div
                        className="absolute -top-1 -right-2 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-[#e85a5a] text-white text-xs font-semibold"
                        aria-label={`${(unreadMessages ?? unreadCount)} message${(unreadMessages ?? unreadCount) > 1 ? 's' : ''} non lu${(unreadMessages ?? unreadCount) > 1 ? 's' : ''}`}
                      >
                        {unreadMessages ?? unreadCount}
                      </div>
                    )}
                  </div>
                  
                  {/* Label */}
                  <span className="text-xs">{tab.label}</span>
                </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
