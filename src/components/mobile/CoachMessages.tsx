// ============================================================
// F.Y.T - COACH MESSAGES (Mobile-First)
// src/components/athlete/CoachMessages.tsx
// Vue dédiée aux messages du coach et commentaires de l'athlète
// ============================================================

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { WeekOrganizerLog, AthleteComment } from '../../../types';
import { Card, CardContent } from '../shared/Card';
import {
  MessageSquare,
  Megaphone,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Dumbbell,
  MessageCircle,
  Send
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  activeMessages: WeekOrganizerLog[];
  pastMessages: WeekOrganizerLog[];
  athleteComments: AthleteComment[];
  initialMessageId?: string; // ID du message à ouvrir automatiquement
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  
  if (startMonth === endMonth) {
    return `${startDay} - ${endDay} ${endMonth}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function getMessageExcerpt(htmlContent: string, maxLength = 150): string {
  // Supprimer les tags HTML
  const textContent = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  
  if (textContent.length <= maxLength) return textContent;
  
  // Couper au dernier espace avant maxLength
  const truncated = textContent.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return truncated.substring(0, lastSpace > 0 ? lastSpace : maxLength) + '...';
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ===========================================
// COMPONENT
// ===========================================

export const CoachMessages: React.FC<Props> = ({
  activeMessages,
  pastMessages,
  athleteComments,
  initialMessageId
}) => {
  // Debug log
  console.log('[CoachMessages] Props reçues:', {
    activeMessages: activeMessages.length,
    pastMessages: pastMessages.length,
    athleteComments: athleteComments.length,
    commentsDetail: athleteComments,
    initialMessageId
  });

  // ===========================================
  // STATE
  // ===========================================
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [expandedPastMessage, setExpandedPastMessage] = useState<string | null>(null);
  const [showFullMessage, setShowFullMessage] = useState<WeekOrganizerLog | null>(null);

  // ===========================================
  // EFFECTS
  // ===========================================

  // Ouvrir automatiquement le message si initialMessageId est fourni
  useEffect(() => {
    if (initialMessageId) {
      // Chercher dans les messages actifs et passés
      const allMessages = [...activeMessages, ...pastMessages];
      const targetMessage = allMessages.find(msg => msg.id === initialMessageId);

      if (targetMessage) {
        setShowFullMessage(targetMessage);
      }
    }
  }, [initialMessageId, activeMessages, pastMessages]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const togglePastMessage = useCallback((messageId: string) => {
    setExpandedPastMessage(prev => prev === messageId ? null : messageId);
  }, []);

  // ===========================================
  // RENDER: Message Modal
  // ===========================================
  
  const renderMessageModal = () => {
    if (!showFullMessage) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto p-4">
        <div className="bg-theme-secondary border border-theme rounded-2xl w-full max-w-lg my-8 shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-theme-secondary border-b border-theme px-4 py-3 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-lg font-semibold text-theme truncate">
              {showFullMessage.title}
            </h2>
            <button
              onClick={() => setShowFullMessage(null)}
              className="p-2 text-theme-muted hover:text-theme transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Date Range */}
            <div className="flex items-center gap-2 text-sm text-theme-muted">
              <Calendar className="w-4 h-4" />
              <span>{formatDateRange(showFullMessage.startDate, showFullMessage.endDate)}</span>
            </div>

            {/* Message Content */}
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: showFullMessage.message }}
            />
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-theme">Coach</h1>
          <p className="text-sm text-theme-muted">Messages et échanges</p>
        </div>
      </div>

      {/* Section 1: Mots du Coach */}
      <section>
        <h2 className="text-sm font-medium text-theme-muted uppercase tracking-wide flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4" />
          Mots du coach
        </h2>
        
        {activeMessages.length === 0 && pastMessages.length === 0 ? (
          <Card variant="default" className="p-6">
            <div className="text-center">
              <Megaphone className="w-10 h-10 text-theme-muted mx-auto mb-3" />
              <p className="text-theme-muted">Aucun message de ton coach</p>
              <p className="text-sm text-theme-muted mt-1">
                Les instructions hebdomadaires apparaîtront ici
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Messages Actifs */}
            {activeMessages.map((message) => (
              <Card
                key={message.id}
                variant="gradient"
                className="overflow-hidden cursor-pointer hover:border-[var(--color-primary)]/50 transition-colors"
                onClick={() => setShowFullMessage(message)}
              >
                <CardContent className="p-4">
                  {/* Date Badge */}
                  <div className="flex items-center gap-2 text-xs text-[var(--color-primary)] mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDateRange(message.startDate, message.endDate)}</span>
                    <span className="px-1.5 py-0.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded text-[10px] font-medium">
                      ACTIF
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-theme mb-2">
                    {message.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-sm text-theme-muted line-clamp-3">
                    {getMessageExcerpt(message.message)}
                  </p>

                  {/* Read More */}
                  <p className="text-sm text-[var(--color-primary)] mt-2 font-medium">
                    Lire la suite →
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {/* Messages Passés */}
            {pastMessages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-theme-muted uppercase tracking-wide mb-2">
                  Messages passés
                </h3>
                <div className="space-y-2">
                  {pastMessages.slice(0, 5).map((message) => (
                    <Card
                      key={message.id}
                      variant="default"
                      className="overflow-hidden"
                    >
                      <button
                        onClick={() => togglePastMessage(message.id)}
                        className="w-full text-left p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="text-xs text-theme-muted">
                            <Calendar className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-theme-secondary truncate">
                              {message.title}
                            </p>
                            <p className="text-xs text-theme-muted">
                              {formatDateRange(message.startDate, message.endDate)}
                            </p>
                          </div>
                        </div>
                        {expandedPastMessage === message.id ? (
                          <ChevronUp className="w-4 h-4 text-theme-muted flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-theme-muted flex-shrink-0" />
                        )}
                      </button>

                      {expandedPastMessage === message.id && (
                        <div className="px-3 pb-3 border-t border-theme">
                          <div
                            className="prose prose-invert prose-sm max-w-none mt-3 text-theme-muted"
                            dangerouslySetInnerHTML={{ __html: message.message }}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Section 2: Mes Commentaires */}
      <section>
        <h2 className="text-sm font-medium text-theme-muted uppercase tracking-wide flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4" />
          Mes commentaires
        </h2>

        {athleteComments.length === 0 ? (
          <Card variant="default" className="p-6">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 text-theme-muted mx-auto mb-3" />
              <p className="text-theme-muted">Aucun commentaire envoyé</p>
              <p className="text-sm text-theme-muted mt-1">
                Envoie des commentaires pendant tes séances
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {athleteComments.map((comment) => (
              <Card key={comment.id} variant="default" className="overflow-hidden">
                <CardContent className="p-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell className="w-4 h-4 text-theme-muted flex-shrink-0" />
                      <span className="font-medium text-theme text-sm truncate">
                        {comment.exerciseName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-theme-muted flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {getRelativeDate(comment.createdAt)}
                    </div>
                  </div>

                  {/* Session Name */}
                  {comment.sessionName && (
                    <p className="text-xs text-theme-muted mb-2">
                      Séance: {comment.sessionName}
                    </p>
                  )}

                  {/* Comment Content */}
                  <div className="bg-theme-tertiary rounded-lg p-3">
                    <p className="text-sm text-theme-secondary">
                      "{comment.comment}"
                    </p>
                  </div>

                  {/* Status */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      {comment.isRead ? (
                        <>
                          <div className="w-2 h-2 bg-[var(--color-success)] rounded-full" />
                          <span className="text-[var(--color-success)]">Lu par le coach</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-[var(--color-warning)] rounded-full animate-pulse" />
                          <span className="text-[var(--color-warning)]">En attente de lecture</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Future: Reply section placeholder */}
                  {/*
                  <div className="mt-3 pt-3 border-t border-theme">
                    <p className="text-xs text-theme-muted italic">
                      La messagerie arrive bientôt ! 🚀
                    </p>
                  </div>
                  */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Info Box */}
        <Card variant="default" className="mt-4 p-4 bg-theme-tertiary border-dashed">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-sm text-theme-secondary font-medium">
                Comment envoyer un commentaire ?
              </p>
              <p className="text-xs text-theme-muted mt-1">
                Pendant une séance active, utilise le champ "Message au coach"
                sous chaque exercice pour partager tes retours.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Message Modal */}
      {renderMessageModal()}
    </div>
  );
};

export default CoachMessages;
