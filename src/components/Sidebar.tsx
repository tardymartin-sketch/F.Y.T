import { useState, useEffect, useRef } from 'react';
import { Home, Download, Users, MessageSquare, Settings, Menu, X, LogOut } from 'lucide-react';
import { useUnreadCount } from '../hooks/useUnreadCount';

type ViewId = 'home' | 'import' | 'team' | 'messages' | 'settings';

interface MenuItem {
  id: ViewId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  showBadge?: boolean;
}

interface SidebarProps {
  currentView: ViewId;
  onNavigate: (viewId: ViewId) => void;
  coachName?: string;
  athletesCount?: number;
  onLogout?: () => void;
}

const menuItems: MenuItem[] = [
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'import', icon: Download, label: 'Importer' },
  { id: 'team', icon: Users, label: 'Mes Athlètes' },
  { id: 'messages', icon: MessageSquare, label: 'Messages', showBadge: true },
  { id: 'settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar({ 
  currentView, 
  onNavigate,
  coachName = 'Coach',
  athletesCount = 0,
  onLogout 
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { count: unreadCount } = useUnreadCount();
  
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout>();
  const closeTimerRef = useRef<NodeJS.Timeout>();

  // Gérer l'ouverture au hover
  const handleHoverZoneEnter = () => {
    if (!isOpen) {
      hoverTimerRef.current = setTimeout(() => {
        setIsOpen(true);
      }, 150);
    }
  };

  const handleHoverZoneLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
    }
  };

  // Gérer la fermeture quand la souris quitte
  const handleSidebarMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
  };

  const handleSidebarMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 300);
  };

  // Toggle via hamburger
  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  // Fermer la sidebar
  const closeSidebar = () => {
    setIsOpen(false);
  };

  // Gérer la navigation
  const handleNavigate = (viewId: ViewId) => {
    onNavigate(viewId);
    closeSidebar();
  };

  // Gérer le clic en dehors (overlay)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        const hamburger = document.getElementById('hamburger-button');
        if (hamburger && hamburger.contains(event.target as Node)) {
          return;
        }
        closeSidebar();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Gérer l'accessibilité clavier
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Hamburger button - toujours visible */}
      <button
        id="hamburger-button"
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#16191a] border border-[rgba(255,255,255,0.04)] text-[#bfc7c5] hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#89a688]/20"
        aria-label={isOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={isOpen}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Zone de hover pour ouverture */}
      {!isOpen && (
        <div
          className="fixed top-0 left-0 w-[50px] h-full z-40"
          onMouseEnter={handleHoverZoneEnter}
          onMouseLeave={handleHoverZoneLeave}
          aria-hidden="true"
        />
      )}

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        className={`
          fixed top-0 left-0 h-full bg-[#16191a] border-r border-[rgba(255,255,255,0.04)] z-50
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ width: 'clamp(256px, 20vw, 320px)' }}
        role="navigation"
        aria-label="Navigation coach"
        aria-hidden={!isOpen}
      >
        <div className="flex flex-col h-full">
          {/* Header avec close button */}
          <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.04)]">
            <h2 className="text-lg font-semibold text-white">F.Y.T Coach</h2>
            <button
              onClick={closeSidebar}
              className="p-1 rounded-lg text-[#bfc7c5] hover:text-white hover:bg-[rgba(255,255,255,0.02)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#89a688]/20"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Menu items */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                const showBadgeCount = item.showBadge && unreadCount > 0;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleNavigate(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                        transition-all duration-200
                        focus:outline-none focus:ring-2 focus:ring-[#89a688]/20
                        ${isActive 
                          ? 'bg-[#89a688]/10 text-white border-l-2 border-[#89a688]' 
                          : 'text-[#bfc7c5] hover:bg-[rgba(255,255,255,0.02)] hover:text-white'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <div className="relative">
                        <Icon className="w-5 h-5" aria-hidden="true" />
                        
                        {/* Badge non-lus */}
                        {showBadgeCount && (
                          <div
                            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 flex items-center justify-center rounded-full bg-[#e85a5a] text-white text-xs font-semibold"
                            aria-label={`${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`}
                          >
                            {unreadCount}
                          </div>
                        )}
                      </div>
                      
                      <span className="text-sm font-medium">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-[rgba(255,255,255,0.04)] p-4 space-y-3">
            {/* Coach info */}
            <div className="flex items-center gap-3 px-2">
              <div className="w-10 h-10 rounded-full bg-[#89a688]/20 flex items-center justify-center">
                <span className="text-sm font-semibold text-[#89a688]">
                  {coachName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{coachName}</p>
                <p className="text-xs text-[#bfc7c5]">
                  {athletesCount} athlète{athletesCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Logout button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#bfc7c5] hover:bg-[rgba(255,255,255,0.02)] hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#89a688]/20"
                aria-label="Se déconnecter"
              >
                <LogOut className="w-5 h-5" aria-hidden="true" />
                <span className="text-sm font-medium">Déconnexion</span>
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
