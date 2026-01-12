import { Home, History, MessageSquare, User } from 'lucide-react';
import { useUnreadCount } from '../../hooks/useUnreadCount';

type TabId = 'home' | 'history' | 'coach' | 'profile';

interface Tab {
  id: TabId;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  showBadge?: boolean;
}

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

const tabs: Tab[] = [
  { id: 'home', icon: Home, label: 'Accueil' },
  { id: 'history', icon: History, label: 'Historique' },
  { id: 'coach', icon: MessageSquare, label: 'Coach', showBadge: true },
  { id: 'profile', icon: User, label: 'Profil' },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { count: unreadCount } = useUnreadCount();

  const handleTabClick = (tabId: TabId) => {
    onTabChange(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: TabId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTabClick(tabId);
    }
    
    // Arrow navigation
    const currentIndex = tabs.findIndex(t => t.id === tabId);
    if (e.key === 'ArrowRight' && currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1].id);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1].id);
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
          const isActive = activeTab === tab.id;
          const showBadgeCount = tab.showBadge && unreadCount > 0;

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
                      aria-label={`${unreadCount} message${unreadCount > 1 ? 's' : ''} non lu${unreadCount > 1 ? 's' : ''}`}
                    >
                      {unreadCount}
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
