// ============================================================
// F.Y.T - COACH MESSAGES CAROUSEL (ATH-004)
// src/components/athlete/CoachMessagesCarousel.tsx
// Carrousel horizontal des messages WeekOrganizer du coach
// ============================================================

import React, { useState, useEffect } from 'react';
import { WeekOrganizerLog } from '../../../types';
import { Megaphone, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  messages: WeekOrganizerLog[];
  className?: string;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'long' });
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'long' });

  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth.slice(0, 3)} - ${endDay} ${endMonth.slice(0, 3)}`;
}

/**
 * Sanitize and format HTML content for safe rendering
 * Converts HTML lists to readable text format
 */
function formatMessageContent(html: string): string {
  if (!html) return '';

  // Check if content contains HTML tags
  if (!/<[^>]+>/.test(html)) {
    return html; // Plain text, return as-is
  }

  let text = html;

  // Convert <li> items to bullet points with line breaks
  text = text.replace(/<li[^>]*><p[^>]*>/gi, '• ');
  text = text.replace(/<li[^>]*>/gi, '• ');
  text = text.replace(/<\/p><\/li>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // Convert <br> to line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Convert </p> to line breaks (paragraph endings)
  text = text.replace(/<\/p>/gi, '\n');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Clean up extra whitespace and line breaks
  text = text.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive line breaks
  text = text.trim();

  return text;
}

// ===========================================
// CONSTANTS
// ===========================================

const SWIPE_HINT_STORAGE_KEY = 'fyt_coach_carousel_hint_shown';

// ===========================================
// COMPONENT
// ===========================================

export const CoachMessagesCarousel: React.FC<Props> = ({ messages, className = '' }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Sort messages by startDate DESC (most recent first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Check if we should show the swipe hint animation
  useEffect(() => {
    if (sortedMessages.length > 1) {
      const hintShown = localStorage.getItem(SWIPE_HINT_STORAGE_KEY);
      if (!hintShown) {
        setShowHint(true);
        // Mark as shown after animation plays
        const timer = setTimeout(() => {
          localStorage.setItem(SWIPE_HINT_STORAGE_KEY, 'true');
          setShowHint(false);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [sortedMessages.length]);

  // Swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeIndex < sortedMessages.length - 1) {
      setActiveIndex(prev => prev + 1);
    }
    if (isRightSwipe && activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  // Navigate functions
  const goToPrevious = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  const goToNext = () => {
    if (activeIndex < sortedMessages.length - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  // Empty state
  if (sortedMessages.length === 0) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Messages de ton coach</h2>
        </div>
        <p className="text-slate-400 text-center py-4">
          Aucun message pour le moment
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Messages de ton coach</h2>
        </div>

        {/* Navigation arrows (desktop) */}
        {sortedMessages.length > 1 && (
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={goToPrevious}
              disabled={activeIndex === 0}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Message précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              disabled={activeIndex === sortedMessages.length - 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Message suivant"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Single Message Display (adapts height to content) */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`p-4 ${showHint ? 'animate-swipe-hint' : ''}`}
      >
        {sortedMessages[activeIndex] && (
          <div
            key={sortedMessages[activeIndex].id}
            className="bg-slate-800/50 rounded-xl p-4 transition-opacity duration-200"
          >
            {/* Message Title */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-white text-lg leading-tight">
                {sortedMessages[activeIndex].title}
              </h3>
              <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                {activeIndex + 1}/{sortedMessages.length}
              </span>
            </div>

            {/* Message Content - Adapts to content size */}
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {formatMessageContent(sortedMessages[activeIndex].message)}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">
                {formatDateRange(sortedMessages[activeIndex].startDate, sortedMessages[activeIndex].endDate)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Dots Indicator */}
      {sortedMessages.length > 1 && (
        <div className="flex items-center justify-center gap-2 pb-4">
          {sortedMessages.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${index === activeIndex
                  ? 'bg-blue-500 w-4'
                  : 'bg-slate-600 hover:bg-slate-500'
                }
              `}
              aria-label={`Aller au message ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Swipe Hint Text (shown only during animation) */}
      {showHint && sortedMessages.length > 1 && (
        <div className="text-center pb-3 text-xs text-slate-500 animate-pulse">
          ← Swipe pour plus →
        </div>
      )}

      {/* CSS for swipe hint animation */}
      <style>{`
        @keyframes swipe-hint {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }

        .animate-swipe-hint {
          animation: swipe-hint 0.8s ease-in-out 2;
        }
      `}</style>
    </div>
  );
};

export default CoachMessagesCarousel;
