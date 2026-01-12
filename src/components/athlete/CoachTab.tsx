// ============================================================
// F.Y.T - COACH TAB (ATH-004, ATH-005, ATH-006)
// src/components/athlete/CoachTab.tsx
// Onglet Coach pour l'athlète : Messages + Discussions + Thread
// ============================================================

import React, { useMemo, useEffect } from 'react';
import { WeekOrganizerLog, AthleteComment } from '../../../types';
import { CoachMessagesCarousel } from './CoachMessagesCarousel';
import { ConversationsList, Conversation } from './ConversationsList';
import { ConversationThread, ThreadMessage } from '../ConversationThread';
import { Loader2 } from 'lucide-react';
import { useSubScreenWithValidation, SUB_SCREEN_KEYS, createValidator } from '../../hooks/useSubScreen';

// Validator local pour Conversation (inclut tous les champs requis)
const isValidConversation = createValidator<Conversation>((value) =>
  value &&
  typeof value === 'object' &&
  typeof value.id === 'string' &&
  typeof value.exerciseName === 'string' &&
  typeof value.lastMessage === 'string' &&
  typeof value.lastMessageAt === 'string' &&
  typeof value.lastMessageFrom === 'string' &&
  typeof value.unreadCount === 'number' &&
  typeof value.isRead === 'boolean'
);

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  coachId?: string;
  weekOrganizerMessages: WeekOrganizerLog[];
  athleteComments: AthleteComment[];
  onSelectConversation?: (conversation: Conversation) => void;
  onSendMessage?: (exerciseName: string, message: string) => Promise<void>;
  onMarkAsRead?: (messageIds: string[]) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  initialExerciseName?: string | null;
  onClearInitialExercise?: () => void;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Transform AthleteComments into Conversations
 * Groups comments by exerciseName and creates conversation objects
 */
function transformToConversations(
  comments: AthleteComment[],
  currentUserId: string
): Conversation[] {
  // Group comments by exerciseName
  const groupedByExercise: Record<string, AthleteComment[]> = {};

  comments.forEach(comment => {
    const key = comment.exerciseName;
    if (!groupedByExercise[key]) {
      groupedByExercise[key] = [];
    }
    groupedByExercise[key].push(comment);
  });

  // Transform each group into a Conversation
  const conversations: Conversation[] = Object.entries(groupedByExercise).map(
    ([exerciseName, exerciseComments]) => {
      // Sort by createdAt DESC to get latest message
      const sorted = [...exerciseComments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const latestComment = sorted[0];
      const isFromMe = latestComment.userId === currentUserId;

      // Count unread messages (received messages that are not read)
      const unreadCount = sorted.filter(
        c => c.userId !== currentUserId && !c.isRead
      ).length;

      return {
        id: `conv-${exerciseName}`,
        exerciseName,
        sessionName: latestComment.sessionName,
        lastMessage: latestComment.comment,
        lastMessageAt: latestComment.createdAt,
        lastMessageFrom: isFromMe ? 'me' : 'other',
        unreadCount,
        isRead: latestComment.isRead
      };
    }
  );

  return conversations;
}

// ===========================================
// COMPONENT
// ===========================================

export const CoachTab: React.FC<Props> = ({
  userId,
  coachId,
  weekOrganizerMessages,
  athleteComments,
  onSelectConversation,
  onSendMessage,
  onMarkAsRead,
  isLoading = false,
  className = '',
  initialExerciseName,
  onClearInitialExercise
}) => {
  // V3: Thread actif avec persistance via store singleton
  const [activeThread, setActiveThread] = useSubScreenWithValidation<Conversation>(
    SUB_SCREEN_KEYS.COACH_TAB_THREAD,
    isValidConversation
  );

  // Transform comments to conversations
  const conversations = useMemo(
    () => transformToConversations(athleteComments, userId),
    [athleteComments, userId]
  );

  // V3: Ouvrir automatiquement le thread si initialExerciseName est fourni
  useEffect(() => {
    if (initialExerciseName && conversations.length > 0) {
      const targetConversation = conversations.find(c => c.exerciseName === initialExerciseName);
      if (targetConversation) {
        setActiveThread(targetConversation);
      } else {
        // Créer une conversation temporaire pour ce nouvel exercice
        setActiveThread({
          id: `conv-${initialExerciseName}`,
          exerciseName: initialExerciseName,
          lastMessage: '',
          lastMessageAt: new Date().toISOString(),
          lastMessageFrom: 'me',
          unreadCount: 0,
          isRead: true
        });
      }
      // Nettoyer l'initialExerciseName après ouverture
      if (onClearInitialExercise) {
        onClearInitialExercise();
      }
    }
  }, [initialExerciseName, conversations, onClearInitialExercise]);

  // Get messages for a specific exercise
  const getMessagesForExercise = (exerciseName: string): ThreadMessage[] => {
    return athleteComments
      .filter(c => c.exerciseName === exerciseName)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(c => ({
        id: c.id,
        content: c.comment,
        from: c.userId === userId ? 'me' : 'other',
        timestamp: c.createdAt,
        isRead: c.isRead
      })) as ThreadMessage[];
  };

  // Handle conversation selection - open thread
  const handleSelectConversation = (conversation: Conversation) => {
    if (onSelectConversation) {
      onSelectConversation(conversation);
    }
    setActiveThread(conversation);
  };

  // Handle back from thread
  const handleBackFromThread = () => {
    setActiveThread(null);
  };

  // Handle send message in thread
  const handleSendThreadMessage = async (content: string) => {
    if (!activeThread || !onSendMessage) return;
    await onSendMessage(activeThread.exerciseName, content);
  };

  // Handle mark as read
  const handleMarkAsRead = async (messageIds: string[]) => {
    if (onMarkAsRead) {
      await onMarkAsRead(messageIds);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-20 ${className}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // No coach assigned
  if (!coachId) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Pas encore de coach
          </h2>
          <p className="text-slate-400">
            Tu n'es pas encore assigné à un coach.
            Contacte l'administrateur pour être ajouté à une équipe.
          </p>
        </div>
      </div>
    );
  }

  // V3: Si un thread est actif, afficher ConversationThread (ATH-006)
  if (activeThread) {
    return (
      <div className={`h-[calc(100vh-180px)] ${className}`}>
        <ConversationThread
          exerciseName={activeThread.exerciseName}
          sessionName={activeThread.sessionName}
          messages={getMessagesForExercise(activeThread.exerciseName)}
          currentUserId={userId}
          onBack={handleBackFromThread}
          onSendMessage={handleSendThreadMessage}
          onMarkAsRead={handleMarkAsRead}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Coach Messages Carousel */}
      <CoachMessagesCarousel messages={weekOrganizerMessages} />

      {/* Conversations List */}
      <ConversationsList
        conversations={conversations}
        onSelectConversation={handleSelectConversation}
        emptyMessage="Aucune discussion pour le moment. Pose une question sur un exercice pour démarrer !"
      />
    </div>
  );
};

export default CoachTab;
