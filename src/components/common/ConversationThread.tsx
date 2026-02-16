// ============================================================
// F.Y.T - CONVERSATION THREAD (ATH-006)
// src/components/ConversationThread.tsx
// Vue thread de conversation style messagerie
// Composant réutilisable pour athlète ET coach
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { AthleteComment } from '../../../types';
import {
  ArrowLeft,
  Send,
  Calendar,
  Check,
  CheckCheck,
  Dumbbell,
  Loader2
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

export interface ThreadMessage {
  id: string;
  content: string;
  from: 'me' | 'other';
  timestamp: string;
  isRead: boolean;
}

interface Props {
  exerciseName: string;
  sessionName?: string;
  sessionDate?: string;
  messages: ThreadMessage[];
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (content: string) => Promise<void>;
  onMarkAsRead?: (messageIds: string[]) => Promise<void>;
  isLoading?: boolean;
  className?: string;
  // Desktop adaptation - default preserves mobile behavior
  layout?: 'mobile' | 'desktop';
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) {
    return timeStr;
  } else if (diffDays === 1) {
    return `Hier ${timeStr}`;
  } else if (diffDays < 7) {
    const dayName = date.toLocaleDateString('fr-FR', { weekday: 'long' });
    return `${dayName} ${timeStr}`;
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ` ${timeStr}`;
  }
}

function formatSessionDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// ===========================================
// MESSAGE BUBBLE COMPONENT
// ===========================================

interface MessageBubbleProps {
  message: ThreadMessage;
  isFromMe: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isFromMe }) => {
  return (
    <div className={`flex ${isFromMe ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`
          max-w-[80%] rounded-2xl px-4 py-2.5
          ${isFromMe
            ? 'bg-[var(--color-primary)] text-theme rounded-br-md'
            : 'bg-theme-tertiary text-theme rounded-bl-md'
          }
        `}
      >
        {/* Message Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Timestamp + Status */}
        <div className={`flex items-center gap-1 mt-1 ${isFromMe ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-xs ${isFromMe ? 'text-white/80' : 'text-theme-muted'}`}>
            {formatMessageTime(message.timestamp)}
          </span>

          {/* Read status for sent messages */}
          {isFromMe && (
            message.isRead ? (
              <CheckCheck className="w-3.5 h-3.5 text-white/80" />
            ) : (
              <Check className="w-3.5 h-3.5 text-white/60" />
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const ConversationThread: React.FC<Props> = ({
  exerciseName,
  sessionName,
  sessionDate,
  messages,
  currentUserId,
  onBack,
  onSendMessage,
  onMarkAsRead,
  isLoading = false,
  className = '',
  layout = 'mobile'
}) => {
  const isDesktop = layout === 'desktop';
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark unread messages as read on mount
  useEffect(() => {
    if (onMarkAsRead) {
      const unreadIds = messages
        .filter(m => m.from === 'other' && !m.isRead)
        .map(m => m.id);

      if (unreadIds.length > 0) {
        onMarkAsRead(unreadIds);
      }
    }
  }, [messages, onMarkAsRead]);

  // Handle send message
  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      await onSendMessage(content);
      setNewMessage('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
      // Focus après que l'input soit réactivé (disabled=false)
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Input bar position:
  // Mobile: fixed au bas de l'écran, au-dessus de la BottomNav (64px + safe-area)
  // Desktop: dans le flux normal du conteneur flex (flex-shrink-0)
  const inputAreaClasses = isDesktop
    ? 'flex-shrink-0 p-4 border-t border-theme bg-theme-secondary'
    : 'fixed left-0 right-0 p-4 border-t border-theme bg-theme-secondary z-20 bottom-[calc(64px+env(safe-area-inset-bottom))]';

  // Pas de padding-bottom - l'input est fixed au bas du viewport
  // Le conteneur parent (CoachTab) s'arrête AVANT le bas du viewport
  // donc les messages n'ont pas besoin de pb pour éviter l'input

  return (
    <div className={`flex flex-col h-full bg-theme ${className}`}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 p-4 border-b border-theme bg-theme-secondary">
        {/* Bouton retour - uniquement en mode mobile */}
        {!isDesktop && (
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-theme-muted hover:text-theme hover:bg-theme-tertiary rounded-lg transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <h2 className="font-semibold text-theme truncate">{exerciseName}</h2>
          </div>

          {(sessionName || sessionDate) && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Calendar className="w-3 h-3 text-theme-muted" />
              <span className="text-xs text-theme-muted truncate">
                {sessionName && <span>{sessionName}</span>}
                {sessionName && sessionDate && <span> - </span>}
                {sessionDate && <span>{formatSessionDate(sessionDate)}</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area - flex-1, pas de padding-bottom car l'input est fixed hors du conteneur */}
      <div className="flex-1 overflow-y-auto px-4 pt-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-theme-tertiary flex items-center justify-center mb-4">
              <Dumbbell className="w-8 h-8 text-theme-muted" />
            </div>
            <p className="text-theme-muted mb-1">Aucun message</p>
            <p className="text-theme-muted text-sm">
              Posez une question sur cet exercice
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isFromMe={message.from === 'me'}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area - fixed au bas de l'écran */}
      <div className={inputAreaClasses}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Votre message..."
            disabled={sending}
            className="flex-1 bg-theme-tertiary border border-theme rounded-xl px-4 py-3 text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-3 bg-[var(--color-primary)] hover:bg-blue-500 disabled:bg-theme-tertiary disabled:cursor-not-allowed text-theme rounded-xl transition-colors"
            aria-label="Envoyer"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationThread;
