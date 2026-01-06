// ============================================================
// F.Y.T - COACH MESSAGES (Mobile-First)
// src/components/athlete/CoachMessages.tsx
// Vue dédiée aux messages du coach et commentaires de l'athlète
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
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
  athleteComments
}) => {
  // Debug log
  console.log('[CoachMessages] Props reçues:', {
    activeMessages: activeMessages.length,
    pastMessages: pastMessages.length,
    athleteComments: athleteComments.length,
    commentsDetail: athleteComments
  });

  // ===========================================
  // STATE
  // ===========================================
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [expandedPastMessage, setExpandedPastMessage] = useState<string | null>(null);
  const [showFullMessage, setShowFullMessage] = useState<WeekOrganizerLog | null>(null);
  
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg my-8 shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between rounded-t-2xl">
            <h2 className="text-lg font-semibold text-white truncate">
              {showFullMessage.title}
            </h2>
            <button
              onClick={() => setShowFullMessage(null)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Date Range */}
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>{formatDateRange(showFullMessage.startDate, showFullMessage.endDate)}</span>
            </div>
            
            {/* Message Content */}
            <div 
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: showFullMessage.message }}
            />
            
            {/* Coach Info */}
            {showFullMessage.coachName && (
              <div className="pt-4 border-t border-slate-800">
                <p className="text-sm text-slate-500">
                  Envoyé par <span className="text-slate-300">{showFullMessage.coachName}</span>
                </p>
              </div>
            )}
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
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Coach</h1>
          <p className="text-sm text-slate-400">Messages et échanges</p>
        </div>
      </div>

      {/* Section 1: Mots du Coach */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4" />
          Mots du coach
        </h2>
        
        {activeMessages.length === 0 && pastMessages.length === 0 ? (
          <Card variant="default" className="p-6">
            <div className="text-center">
              <Megaphone className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Aucun message de ton coach</p>
              <p className="text-sm text-slate-500 mt-1">
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
                className="overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors"
                onClick={() => setShowFullMessage(message)}
              >
                <CardContent className="p-4">
                  {/* Date Badge */}
                  <div className="flex items-center gap-2 text-xs text-blue-400 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDateRange(message.startDate, message.endDate)}</span>
                    <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px] font-medium">
                      ACTIF
                    </span>
                  </div>
                  
                  {/* Title */}
                  <h3 className="font-semibold text-white mb-2">
                    {message.title}
                  </h3>
                  
                  {/* Excerpt */}
                  <p className="text-sm text-slate-400 line-clamp-3">
                    {getMessageExcerpt(message.message)}
                  </p>
                  
                  {/* Read More */}
                  <p className="text-sm text-blue-400 mt-2 font-medium">
                    Lire la suite →
                  </p>
                </CardContent>
              </Card>
            ))}
            
            {/* Messages Passés */}
            {pastMessages.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
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
                          <div className="text-xs text-slate-500">
                            <Calendar className="w-3 h-3" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-300 truncate">
                              {message.title}
                            </p>
                            <p className="text-xs text-slate-500">
                              {formatDateRange(message.startDate, message.endDate)}
                            </p>
                          </div>
                        </div>
                        {expandedPastMessage === message.id ? (
                          <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        )}
                      </button>
                      
                      {expandedPastMessage === message.id && (
                        <div className="px-3 pb-3 border-t border-slate-800">
                          <div 
                            className="prose prose-invert prose-sm max-w-none mt-3 text-slate-400"
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
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4" />
          Mes commentaires
        </h2>
        
        {athleteComments.length === 0 ? (
          <Card variant="default" className="p-6">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Aucun commentaire envoyé</p>
              <p className="text-sm text-slate-500 mt-1">
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
                      <Dumbbell className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-white text-sm truncate">
                        {comment.exerciseName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">
                      <Clock className="w-3 h-3" />
                      {getRelativeDate(comment.createdAt)}
                    </div>
                  </div>
                  
                  {/* Session Name */}
                  {comment.sessionName && (
                    <p className="text-xs text-slate-500 mb-2">
                      Séance: {comment.sessionName}
                    </p>
                  )}
                  
                  {/* Comment Content */}
                  <div className="bg-slate-800/50 rounded-lg p-3">
                    <p className="text-sm text-slate-300">
                      "{comment.comment}"
                    </p>
                  </div>
                  
                  {/* Status */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      {comment.isRead ? (
                        <>
                          <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                          <span className="text-emerald-400">Lu par le coach</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                          <span className="text-yellow-400">En attente de lecture</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Future: Reply section placeholder */}
                  {/* 
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-500 italic">
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
        <Card variant="default" className="mt-4 p-4 bg-slate-800/30 border-dashed">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-300 font-medium">
                Comment envoyer un commentaire ?
              </p>
              <p className="text-xs text-slate-500 mt-1">
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
