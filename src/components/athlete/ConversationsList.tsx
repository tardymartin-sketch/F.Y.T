// ============================================================
// F.Y.T - CONVERSATIONS LIST (ATH-005)
// src/components/athlete/ConversationsList.tsx
// Liste des conversations style WhatsApp
// Composant réutilisable pour athlète ET coach
// ============================================================

import React from 'react';
import {
  MessageSquare,
  Dumbbell,
  Check,
  CheckCheck,
  ChevronRight
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

export interface Conversation {
  id: string;
  exerciseName: string;
  sessionName?: string;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageFrom: 'me' | 'other';
  unreadCount: number;
  isRead: boolean; // For sent messages: has the other person read it?
}

interface Props {
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  emptyMessage?: string;
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

function truncateMessage(message: string, maxLength: number = 50): string {
  if (message.length <= maxLength) return message;
  return message.slice(0, maxLength).trim() + '...';
}

function getExerciseIcon(exerciseName: string): React.ReactNode {
  // Could be extended to return different icons based on exercise type
  if (exerciseName.toLowerCase() === 'général' || exerciseName.toLowerCase() === 'general') {
    return <MessageSquare className="w-5 h-5 text-blue-400" />;
  }
  return <Dumbbell className="w-5 h-5 text-emerald-400" />;
}

// ===========================================
// CONVERSATION ITEM COMPONENT
// ===========================================

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onClick }) => {
  const {
    exerciseName,
    lastMessage,
    lastMessageAt,
    lastMessageFrom,
    unreadCount,
    isRead
  } = conversation;

  const hasUnread = unreadCount > 0;
  const isFromMe = lastMessageFrom === 'me';

  // Build message preview
  const messagePrefix = isFromMe ? 'Toi: ' : 'Coach: ';
  const previewText = `${messagePrefix}"${truncateMessage(lastMessage, 35)}"`;

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-4 text-left
        bg-slate-800/30 hover:bg-slate-800/60
        border-b border-slate-800/50 last:border-b-0
        transition-colors duration-150
        focus:outline-none focus:bg-slate-800/60
      `}
    >
      {/* Exercise Icon */}
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
        ${hasUnread ? 'bg-blue-500/20' : 'bg-slate-700/50'}
      `}>
        {getExerciseIcon(exerciseName)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Top row: Exercise name + Time */}
        <div className="flex items-center justify-between mb-1">
          <h3 className={`font-medium truncate ${hasUnread ? 'text-white' : 'text-slate-200'}`}>
            {exerciseName}
          </h3>
          <span className={`text-xs ml-2 flex-shrink-0 ${hasUnread ? 'text-blue-400' : 'text-slate-500'}`}>
            • {formatRelativeTime(lastMessageAt)}
          </span>
        </div>

        {/* Bottom row: Preview + Status */}
        <div className="flex items-center justify-between">
          <p className={`text-sm truncate ${hasUnread ? 'text-slate-300' : 'text-slate-400'}`}>
            {previewText}
          </p>

          {/* Status indicators */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {/* Unread badge for received messages */}
            {hasUnread && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full text-xs font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}

            {/* Read status for sent messages */}
            {isFromMe && !hasUnread && (
              isRead ? (
                <CheckCheck className="w-4 h-4 text-blue-400" />
              ) : (
                <Check className="w-4 h-4 text-slate-500" />
              )
            )}
          </div>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-slate-600 flex-shrink-0" />
    </button>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const ConversationsList: React.FC<Props> = ({
  conversations,
  onSelectConversation,
  emptyMessage = 'Aucune conversation',
  className = ''
}) => {
  // Sort by lastMessageAt DESC
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  // Calculate total unread
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-purple-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Discussions</h2>
        </div>

        {/* Total unread badge */}
        {totalUnread > 0 && (
          <span className="flex items-center justify-center min-w-[24px] h-6 px-2 bg-red-500 rounded-full text-xs font-bold text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>

      {/* Conversations List */}
      {sortedConversations.length === 0 ? (
        <div className="p-6 text-center">
          <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/50">
          {sortedConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              onClick={() => onSelectConversation(conversation)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ConversationsList;
