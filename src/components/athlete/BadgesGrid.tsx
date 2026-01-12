// ============================================================
// F.Y.T - BADGES GRID (ATH-009)
// src/components/athlete/BadgesGrid.tsx
// Grille des badges par catégorie avec compteurs
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, ChevronRight, Loader2 } from 'lucide-react';
import type { BadgeWithProgress, BadgeCategory } from '../../../types';
import { getUserBadgesProgress } from '../../services/badgeService';
import { BadgeModal } from './BadgeModal';

// ===========================================
// CONSTANTS
// ===========================================

const CATEGORY_CONFIG: Record<BadgeCategory, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  regularity: {
    label: 'Régularité',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30'
  },
  endurance: {
    label: 'Endurance',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30'
  },
  perseverance: {
    label: 'Persévérance',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30'
  },
  community: {
    label: 'Communauté',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30'
  },
  exploration: {
    label: 'Exploration',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/30'
  }
};

const CATEGORY_ORDER: BadgeCategory[] = [
  'regularity',
  'endurance',
  'perseverance',
  'community',
  'exploration'
];

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  className?: string;
}

// ===========================================
// BADGE ICON COMPONENT
// ===========================================

interface BadgeIconProps {
  badge: BadgeWithProgress;
  onClick: () => void;
}

const BadgeIcon: React.FC<BadgeIconProps> = ({ badge, onClick }) => {
  const config = CATEGORY_CONFIG[badge.category];

  return (
    <button
      onClick={onClick}
      className={`
        relative w-12 h-12 rounded-xl flex items-center justify-center
        transition-all duration-200
        ${badge.isUnlocked
          ? `${config.bgColor} ${config.borderColor} border hover:scale-110`
          : 'bg-slate-800/50 border border-slate-700/50 opacity-40 grayscale'
        }
      `}
      title={badge.name}
    >
      <div
        className={`w-6 h-6 ${badge.isUnlocked ? config.color : 'text-slate-500'}`}
        dangerouslySetInnerHTML={{ __html: badge.iconSvg }}
      />
    </button>
  );
};

// ===========================================
// CATEGORY PROGRESS DOTS
// ===========================================

interface CategoryDotsProps {
  unlocked: number;
  total: number;
  color: string;
}

const CategoryDots: React.FC<CategoryDotsProps> = ({ unlocked, total, color }) => {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < unlocked ? color.replace('text-', 'bg-') : 'bg-slate-700'
          }`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">
        {unlocked}/{total}
      </span>
    </div>
  );
};

// ===========================================
// CATEGORY ROW
// ===========================================

interface CategoryRowProps {
  category: BadgeCategory;
  badges: BadgeWithProgress[];
  onBadgeClick: (badge: BadgeWithProgress) => void;
}

const CategoryRow: React.FC<CategoryRowProps> = ({ category, badges, onBadgeClick }) => {
  const config = CATEGORY_CONFIG[category];
  const unlockedCount = badges.filter(b => b.isUnlocked).length;

  return (
    <div className="space-y-2">
      {/* Category Header */}
      <div className="flex items-center justify-between">
        <h4 className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </h4>
        <CategoryDots
          unlocked={unlockedCount}
          total={badges.length}
          color={config.color}
        />
      </div>

      {/* Badges Row */}
      <div className="flex items-center gap-2">
        {badges.map(badge => (
          <BadgeIcon
            key={badge.id}
            badge={badge}
            onClick={() => onBadgeClick(badge)}
          />
        ))}
      </div>
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const BadgesGrid: React.FC<Props> = ({ userId, className = '' }) => {
  const [badges, setBadges] = useState<BadgeWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeWithProgress | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Load badges (un seul appel API)
  useEffect(() => {
    let isMounted = true;

    const loadBadges = async () => {
      try {
        setLoading(true);
        setError(null);

        const badgesData = await getUserBadgesProgress(userId);

        if (isMounted) {
          setBadges(badgesData);
        }
      } catch (err) {
        console.error('Error loading badges:', err);
        if (isMounted) {
          setError('Erreur lors du chargement des badges');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBadges();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Group badges by category
  const badgesByCategory = useMemo(() => {
    const grouped: Record<BadgeCategory, BadgeWithProgress[]> = {
      regularity: [],
      endurance: [],
      perseverance: [],
      community: [],
      exploration: []
    };

    badges.forEach(badge => {
      if (grouped[badge.category]) {
        grouped[badge.category].push(badge);
      }
    });

    // Sort by order index
    Object.keys(grouped).forEach(key => {
      grouped[key as BadgeCategory].sort((a, b) => a.orderIndex - b.orderIndex);
    });

    return grouped;
  }, [badges]);

  // Calcul des stats localement (évite un double appel API)
  const totalBadges = badges.length || 25;
  const totalUnlocked = badges.filter(b => b.isUnlocked).length;

  if (loading) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 ${className}`}>
        <p className="text-red-400 text-sm text-center">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Mes Badges</h3>
              <p className="text-sm text-slate-400">
                {totalUnlocked}/{totalBadges} débloqués
              </p>
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {expanded ? 'Réduire' : 'Voir tout'}
            <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {expanded ? (
            // Full view - all categories
            <div className="space-y-4">
              {CATEGORY_ORDER.map(category => (
                <CategoryRow
                  key={category}
                  category={category}
                  badges={badgesByCategory[category]}
                  onBadgeClick={setSelectedBadge}
                />
              ))}
            </div>
          ) : (
            // Compact view - just show unlocked badges summary
            <div className="space-y-3">
              {/* Recent/Featured badges */}
              <div className="flex flex-wrap gap-2">
                {badges
                  .filter(b => b.isUnlocked)
                  .slice(0, 8)
                  .map(badge => (
                    <BadgeIcon
                      key={badge.id}
                      badge={badge}
                      onClick={() => setSelectedBadge(badge)}
                    />
                  ))}
                {totalUnlocked === 0 && (
                  <p className="text-sm text-slate-500 italic">
                    Aucun badge débloqué pour l'instant
                  </p>
                )}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${(totalUnlocked / totalBadges) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 text-right">
                  {Math.round((totalUnlocked / totalBadges) * 100)}% complété
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Badge Modal */}
      {selectedBadge && (
        <BadgeModal
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </>
  );
};

export default BadgesGrid;
