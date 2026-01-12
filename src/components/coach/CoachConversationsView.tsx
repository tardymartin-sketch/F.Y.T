// ============================================================
// F.Y.T - COACH CONVERSATIONS VIEW
// src/components/coach/CoachConversationsView.tsx
// Vue des conversations pour le coach avec hiérarchie:
// Athlète → Séance → Messages
// ============================================================

import React, { useState, useMemo } from 'react';
import { AthleteComment } from '../../../types';
import { ConversationThread, ThreadMessage } from '../ConversationThread';
import { useSubScreenWithValidation, SUB_SCREEN_KEYS, createValidator } from '../../hooks/useSubScreen';
import { useTempData } from '../../hooks/useUIState';
import {
  MessageSquare,
  ChevronRight,
  ChevronDown,
  User,
  Dumbbell,
  Calendar,
  Loader2
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface AthleteGroup {
  oderId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  unreadCount: number;
  lastMessageAt: string;
  sessions: SessionGroup[];
}

interface SessionGroup {
  sessionId?: string;
  sessionName?: string;
  exerciseName: string;
  unreadCount: number;
  lastMessageAt: string;
  lastMessage: string;
  comments: AthleteComment[];
}

interface Props {
  comments: AthleteComment[];
  currentUserId: string;
  onSendMessage: (athleteId: string, exerciseName: string, message: string, sessionId?: string) => Promise<void>;
  onMarkAsRead: (commentIds: string[]) => Promise<void>;
  isLoading?: boolean;
  className?: string;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "à l'instant";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'hier';
  if (diffDays < 7) return `${diffDays}j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getAthleteName(comment: AthleteComment): string {
  if (comment.firstName && comment.lastName) {
    return `${comment.firstName} ${comment.lastName}`;
  }
  if (comment.firstName) return comment.firstName;
  if (comment.lastName) return comment.lastName;
  if (comment.username) return comment.username;
  return 'Athlète';
}

function groupCommentsByAthleteAndSession(
  comments: AthleteComment[],
  currentUserId: string
): AthleteGroup[] {
  // Stratégie: Grouper par exerciseName, puis identifier l'athlète (celui qui n'est pas le coach)
  // Cela permet de regrouper les messages de l'athlète ET les réponses du coach dans le même thread

  // Étape 1: Grouper tous les messages par exerciseName
  const exerciseMap = new Map<string, AthleteComment[]>();
  comments.forEach(comment => {
    const key = comment.exerciseName;
    if (!exerciseMap.has(key)) {
      exerciseMap.set(key, []);
    }
    exerciseMap.get(key)!.push(comment);
  });

  // Étape 2: Pour chaque exercice, identifier l'athlète (celui qui n'est pas le coach/currentUser)
  // et créer un mapping athlète → conversations
  const athleteConversationsMap = new Map<string, Map<string, AthleteComment[]>>();
  const athleteInfoMap = new Map<string, { username?: string; firstName?: string; lastName?: string }>();

  exerciseMap.forEach((exerciseComments, exerciseName) => {
    // Trouver l'athlète dans cette conversation (premier message qui n'est pas du coach)
    const athleteComment = exerciseComments.find(c => c.userId !== currentUserId);
    if (!athleteComment) return; // Pas d'athlète trouvé, ignorer

    const athleteId = athleteComment.userId;

    // Stocker les infos de l'athlète
    if (!athleteInfoMap.has(athleteId)) {
      athleteInfoMap.set(athleteId, {
        username: athleteComment.username,
        firstName: athleteComment.firstName,
        lastName: athleteComment.lastName
      });
    }

    // Ajouter la conversation à l'athlète
    if (!athleteConversationsMap.has(athleteId)) {
      athleteConversationsMap.set(athleteId, new Map());
    }
    athleteConversationsMap.get(athleteId)!.set(exerciseName, exerciseComments);
  });

  // Étape 3: Transformer en AthleteGroup[]
  const athleteGroups: AthleteGroup[] = [];

  athleteConversationsMap.forEach((conversationsMap, athleteId) => {
    const athleteInfo = athleteInfoMap.get(athleteId)!;

    // Créer les SessionGroup pour chaque conversation
    const sessions: SessionGroup[] = [];
    conversationsMap.forEach((sessionComments, exerciseName) => {
      const sorted = [...sessionComments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const latest = sorted[0];
      // Compter les messages non lus (messages de l'athlète, pas du coach)
      const unreadCount = sorted.filter(c => c.userId !== currentUserId && !c.isRead).length;

      sessions.push({
        sessionId: latest.sessionId,
        sessionName: latest.sessionName,
        exerciseName,
        unreadCount,
        lastMessageAt: latest.createdAt,
        lastMessage: latest.comment,
        comments: sessionComments
      });
    });

    // Trier les sessions par date du dernier message
    sessions.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

    // Calculer les stats de l'athlète
    const totalUnread = sessions.reduce((acc, s) => acc + s.unreadCount, 0);
    const latestMessage = sessions[0];

    athleteGroups.push({
      oderId: athleteId,
      username: athleteInfo.username || 'Athlète',
      firstName: athleteInfo.firstName,
      lastName: athleteInfo.lastName,
      unreadCount: totalUnread,
      lastMessageAt: latestMessage?.lastMessageAt || '',
      sessions
    });
  });

  // Trier les athlètes par date du dernier message
  athleteGroups.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

  return athleteGroups;
}

// ===========================================
// ATHLETE ITEM COMPONENT
// ===========================================

interface AthleteItemProps {
  athlete: AthleteGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onSelectSession: (session: SessionGroup) => void;
}

const AthleteItem: React.FC<AthleteItemProps> = ({
  athlete,
  isExpanded,
  onToggle,
  onSelectSession
}) => {
  const displayName = getAthleteName({
    userId: athlete.oderId,
    username: athlete.username,
    firstName: athlete.firstName,
    lastName: athlete.lastName
  } as AthleteComment);

  return (
    <div className="border-b border-slate-800 last:border-b-0">
      {/* Athlete Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors"
      >
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
          ${athlete.unreadCount > 0 ? 'bg-blue-500/20' : 'bg-slate-700/50'}
        `}>
          <User className={`w-6 h-6 ${athlete.unreadCount > 0 ? 'text-blue-400' : 'text-slate-400'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between">
            <h3 className={`font-medium truncate ${athlete.unreadCount > 0 ? 'text-white' : 'text-slate-200'}`}>
              {displayName}
            </h3>
            <span className={`text-xs ml-2 ${athlete.unreadCount > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
              {formatRelativeTime(athlete.lastMessageAt)}
            </span>
          </div>
          <p className="text-sm text-slate-400 truncate">
            {athlete.sessions.length} conversation{athlete.sessions.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Unread badge + Chevron */}
        <div className="flex items-center gap-2">
          {/* Toujours afficher la pastille si non-lus, même si expanded */}
          {athlete.unreadCount > 0 && !isExpanded && (
            <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full text-xs font-bold text-white">
              {athlete.unreadCount > 9 ? '9+' : athlete.unreadCount}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Sessions List (expanded) */}
      {isExpanded && (
        <div className="bg-slate-800/30 border-t border-slate-800">
          {athlete.sessions.map((session, index) => (
            <button
              key={`${session.exerciseName}-${index}`}
              onClick={() => onSelectSession(session)}
              className="w-full flex items-center gap-3 px-4 py-3 pl-8 hover:bg-slate-800/50 transition-colors border-b border-slate-800/50 last:border-b-0"
            >
              {/* Exercise Icon */}
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${session.unreadCount > 0 ? 'bg-emerald-500/20' : 'bg-slate-700/50'}
              `}>
                <Dumbbell className={`w-5 h-5 ${session.unreadCount > 0 ? 'text-emerald-400' : 'text-slate-400'}`} />
              </div>

              {/* Session Info */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <h4 className={`font-medium truncate ${session.unreadCount > 0 ? 'text-white' : 'text-slate-300'}`}>
                    {session.exerciseName}
                  </h4>
                </div>
                {session.sessionName && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    <span className="text-xs text-slate-500 truncate">{session.sessionName}</span>
                  </div>
                )}
                <p className="text-sm text-slate-400 truncate mt-0.5">
                  {session.lastMessage.substring(0, 40)}...
                </p>
              </div>

              {/* Unread + Time */}
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-slate-500">
                  {formatRelativeTime(session.lastMessageAt)}
                </span>
                {session.unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold text-white">
                    {session.unreadCount}
                  </span>
                )}
              </div>

              <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

// Type pour la persistance du thread
interface PersistedThread {
  athlete: AthleteGroup;
  session: SessionGroup;
}

// Validator local pour PersistedThread
const isValidPersistedThread = createValidator<PersistedThread>((value) =>
  value &&
  typeof value === 'object' &&
  value.athlete &&
  typeof value.athlete.oderId === 'string' &&
  value.session &&
  typeof value.session.exerciseName === 'string'
);

export const CoachConversationsView: React.FC<Props> = ({
  comments,
  currentUserId,
  onSendMessage,
  onMarkAsRead,
  isLoading = false,
  className = ''
}) => {
  // V3: État expanded des athlètes avec persistance via store singleton
  const [persistedExpanded, setPersistedExpanded] = useTempData<string[]>('coach-conversations-expanded');
  const expandedAthletes = new Set(persistedExpanded || []);
  const setExpandedAthletes = (updater: (prev: Set<string>) => Set<string>) => {
    const newSet = updater(expandedAthletes);
    setPersistedExpanded(Array.from(newSet));
  };

  // V3: Thread actif avec persistance via store singleton
  const [activeThread, setActiveThread] = useSubScreenWithValidation<PersistedThread>(
    SUB_SCREEN_KEYS.COACH_CONVERSATIONS_THREAD,
    isValidPersistedThread
  );

  // Grouper les commentaires
  const athleteGroups = useMemo(
    () => groupCommentsByAthleteAndSession(comments, currentUserId),
    [comments, currentUserId]
  );

  // Toggle athlete expansion
  const toggleAthlete = (oderId: string) => {
    setExpandedAthletes(prev => {
      const next = new Set(prev);
      if (next.has(oderId)) {
        next.delete(oderId);
      } else {
        next.add(oderId);
      }
      return next;
    });
  };

  // Open thread
  const handleSelectSession = (athlete: AthleteGroup, session: SessionGroup) => {
    setActiveThread({ athlete, session });
  };

  // Close thread
  const handleBackFromThread = () => {
    setActiveThread(null);
  };

  // Get messages for thread - Utiliser directement les props comments pour réactivité
  const getThreadMessages = (exerciseName: string): ThreadMessage[] => {
    return comments
      .filter(c => c.exerciseName === exerciseName)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(c => ({
        id: c.id,
        content: c.comment,
        from: c.userId === currentUserId ? 'me' : 'other',
        timestamp: c.createdAt,
        isRead: c.isRead
      })) as ThreadMessage[];
  };

  // Send message in thread
  const handleSendThreadMessage = async (content: string) => {
    if (!activeThread) return;
    await onSendMessage(
      activeThread.athlete.oderId,
      activeThread.session.exerciseName,
      content,
      activeThread.session.sessionId
    );
  };

  // Mark as read
  const handleMarkAsRead = async (messageIds: string[]) => {
    await onMarkAsRead(messageIds);
  };

  // Calculate totals
  const totalUnread = athleteGroups.reduce((acc, a) => acc + a.unreadCount, 0);

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400">Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  // Thread view
  if (activeThread) {
    const athleteName = getAthleteName({
      userId: activeThread.athlete.oderId,
      username: activeThread.athlete.username,
      firstName: activeThread.athlete.firstName,
      lastName: activeThread.athlete.lastName
    } as AthleteComment);

    return (
      <div className={`h-[calc(100vh-120px)] ${className}`}>
        <ConversationThread
          exerciseName={`${athleteName} - ${activeThread.session.exerciseName}`}
          sessionName={activeThread.session.sessionName}
          messages={getThreadMessages(activeThread.session.exerciseName)}
          currentUserId={currentUserId}
          onBack={handleBackFromThread}
          onSendMessage={handleSendThreadMessage}
          onMarkAsRead={handleMarkAsRead}
        />
      </div>
    );
  }

  // Main view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white">Conversations</h2>
          </div>

          {totalUnread > 0 && (
            <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500 rounded-full text-xs font-bold text-white">
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </div>

        {/* Athletes List */}
        {athleteGroups.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">Aucune conversation</p>
            <p className="text-slate-500 text-sm mt-1">
              Les messages de vos athlètes apparaîtront ici
            </p>
          </div>
        ) : (
          <div>
            {athleteGroups.map(athlete => (
              <AthleteItem
                key={athlete.oderId}
                athlete={athlete}
                isExpanded={expandedAthletes.has(athlete.oderId)}
                onToggle={() => toggleAthlete(athlete.oderId)}
                onSelectSession={(session) => handleSelectSession(athlete, session)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CoachConversationsView;
