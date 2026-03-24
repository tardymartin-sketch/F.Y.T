// ============================================================
// F.Y.T - COACH MESSAGES CAROUSEL (ATH-004)
// src/components/athlete/CoachMessagesCarousel.tsx
// Carrousel horizontal des messages WeekOrganizer du coach
// ============================================================

import React, { useState, useEffect } from 'react';
import { WeekOrganizerLog } from '../../../types';
import { Megaphone, ChevronLeft, ChevronRight } from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  messages: WeekOrganizerLog[];
  className?: string;
  variant?: 'default' | 'compact';
  onMessageClick?: (message: WeekOrganizerLog) => void;
  maxContentLines?: number;
  initialMessageId?: string; // ID du message à afficher initialement
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

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


// ===========================================
// COMPONENT
// ===========================================

export const CoachMessagesCarousel: React.FC<Props> = ({
  messages,
  className = '',
  variant = 'default',
  onMessageClick,
  maxContentLines = 2,
  initialMessageId,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Sort messages by startDate DESC (most recent first)
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  // Positionner le carousel sur le message initial si fourni
  useEffect(() => {
    if (initialMessageId && sortedMessages.length > 0) {
      const targetIndex = sortedMessages.findIndex(msg => msg.id === initialMessageId);
      if (targetIndex !== -1) {
        setActiveIndex(targetIndex);
      }
    }
  }, [initialMessageId, sortedMessages]);


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
    // En mode compact, ne rien afficher si pas de messages
    if (variant === 'compact') return null;

    return (
      <div className={`bg-theme-secondary border border-theme rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-lg font-semibold text-theme">Messages de ton coach</h2>
        </div>
        <p className="text-theme-muted text-center py-4">
          Aucun message pour le moment
        </p>
      </div>
    );
  }

  // MODE COMPACT : Carrousel complet mais avec style plus compact
  if (variant === 'compact') {
    return (
      <div className={`bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 border border-[var(--color-primary)]/30 rounded-xl overflow-hidden ${className}`}>
        {/* Header compact */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-primary)]/20">
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-theme">Messages coach</h3>
          </div>

          {/* Navigation arrows */}
          {sortedMessages.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={goToPrevious}
                disabled={activeIndex === 0}
                className="p-1 rounded text-[var(--color-primary)] hover:text-theme hover:bg-[var(--color-primary)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Message précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goToNext}
                disabled={activeIndex === sortedMessages.length - 1}
                className="p-1 rounded text-[var(--color-primary)] hover:text-theme hover:bg-[var(--color-primary)]/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                aria-label="Message suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Message content avec swipe */}
        <div
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          className={`p-3`}
        >
          {sortedMessages[activeIndex] && (
            <button
              key={sortedMessages[activeIndex].id}
              onClick={() => onMessageClick?.(sortedMessages[activeIndex])}
              className="w-full text-left transition-opacity duration-200 hover:opacity-80"
            >
              {/* Message Title - 1 ligne max */}
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-theme text-sm line-clamp-1 flex-1">
                  {sortedMessages[activeIndex].title}
                </h4>
                <span className="text-xs text-theme-muted whitespace-nowrap ml-2">
                  {activeIndex + 1}/{sortedMessages.length}
                </span>
              </div>

              {/* Message Content - 2 lignes maximum */}
              <p className="text-theme-secondary text-xs leading-relaxed whitespace-pre-line line-clamp-2">
                {formatMessageContent(sortedMessages[activeIndex].message)}
              </p>
            </button>
          )}
        </div>

        {/* Dots Indicator */}
        {sortedMessages.length > 1 && (
          <div className="flex items-center justify-center gap-2 pb-3">
            {sortedMessages.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`
                  w-1.5 h-1.5 rounded-full transition-all duration-200
                  ${index === activeIndex
                    ? 'bg-[var(--color-primary)] w-3'
                    : 'bg-theme-tertiary hover:bg-[var(--color-border-hover)]'
                  }
                `}
                aria-label={`Aller au message ${index + 1}`}
              />
            ))}
          </div>
        )}


      </div>
    );
  }

  return (
    <div className={`bg-theme-secondary border border-theme rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-theme">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <h2 className="text-lg font-semibold text-theme">Messages de ton coach</h2>
        </div>

        {/* Navigation arrows (desktop) */}
        {sortedMessages.length > 1 && (
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={goToPrevious}
              disabled={activeIndex === 0}
              className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-theme-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Message précédent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              disabled={activeIndex === sortedMessages.length - 1}
              className="p-1.5 rounded-lg text-theme-muted hover:text-theme hover:bg-theme-tertiary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
        className={`p-4`}
      >
        {sortedMessages[activeIndex] && (
          <div
            key={sortedMessages[activeIndex].id}
            className="bg-theme-tertiary rounded-xl p-4 transition-opacity duration-200"
          >
            {/* Message Title */}
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-theme text-lg leading-tight">
                {sortedMessages[activeIndex].title}
              </h3>
              <span className="text-xs text-theme-muted whitespace-nowrap ml-2">
                {activeIndex + 1}/{sortedMessages.length}
              </span>
            </div>

            {/* Message Content - Adapts to content size */}
            <div className="text-theme-secondary text-sm leading-relaxed whitespace-pre-line">
              {formatMessageContent(sortedMessages[activeIndex].message)}
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
                  ? 'bg-[var(--color-primary)] w-4'
                  : 'bg-theme-tertiary hover:bg-[var(--color-border-hover)]'
                }
              `}
              aria-label={`Aller au message ${index + 1}`}
            />
          ))}
        </div>
      )}


    </div>
  );
};

export default CoachMessagesCarousel;
