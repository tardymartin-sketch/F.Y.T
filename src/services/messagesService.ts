// ============================================
// F.Y.T V3 — SERVICE MESSAGES
// src/services/messagesService.ts
// CRUD conversations et messages
// ============================================

import { supabase } from '../supabaseClient';
import type {
  Conversation,
  Message,
  ConversationRow,
  MessageRow,
} from '../../types';

// ============================================
// TYPES LOCAUX
// ============================================

type UserRole = 'athlete' | 'coach';

// ============================================
// FETCH CONVERSATIONS
// ============================================

/**
 * Récupère toutes les conversations d'un utilisateur
 * Inclut le compteur de messages non lus et le dernier message
 */
export async function fetchConversations(
  userId: string,
  role: UserRole
): Promise<Conversation[]> {
  try {
    // Requête principale avec jointures
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        athlete:profiles!conversations_athlete_id_fkey(first_name, last_name),
        coach:profiles!conversations_coach_id_fkey(first_name, last_name),
        session:session_logs(id)
      `)
      .or(
        role === 'athlete' 
          ? `athlete_id.eq.${userId}` 
          : `coach_id.eq.${userId}`
      )
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    // Récupérer les compteurs non lus et derniers messages pour chaque conversation
    const conversationsWithDetails = await Promise.all(
      (data || []).map(async (conv) => {
        // Compteur non lus
        const { count: unreadCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .eq('is_read', false);

        // Dernier message
        const { data: lastMessageData } = await supabase
          .from('messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const athleteName = conv.athlete 
          ? `${conv.athlete.first_name} ${conv.athlete.last_name}`.trim()
          : undefined;
        const coachName = conv.coach
          ? `${conv.coach.first_name} ${conv.coach.last_name}`.trim()
          : undefined;

        return {
          id: conv.id,
          athleteId: conv.athlete_id,
          coachId: conv.coach_id,
          sessionId: conv.session_id ?? undefined,
          exerciseName: conv.exercise_name ?? undefined,
          lastMessageAt: conv.last_message_at,
          createdAt: conv.created_at,
          unreadCount: unreadCount ?? 0,
          lastMessage: lastMessageData?.content,
          athleteName,
          coachName,
        } as Conversation;
      })
    );

    return conversationsWithDetails;
  } catch (error) {
    console.error('Error fetching conversations:', error);
    throw error;
  }
}

// ============================================
// FETCH MESSAGES
// ============================================

/**
 * Récupère tous les messages d'une conversation
 * Triés par date croissante (du plus ancien au plus récent)
 */
export async function fetchMessages(
  conversationId: string
): Promise<Message[]> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((msg) => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      senderId: msg.sender_id,
      content: msg.content,
      isRead: msg.is_read,
      createdAt: msg.created_at,
      senderName: msg.sender
        ? `${msg.sender.first_name} ${msg.sender.last_name}`.trim()
        : undefined,
    }));
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// ============================================
// SEND MESSAGE
// ============================================

/**
 * Envoie un nouveau message dans une conversation
 * Met à jour automatiquement last_message_at de la conversation
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message> {
  try {
    // Insérer le message
    const { data: messageData, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content: content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (messageError) throw messageError;

    // Mettre à jour last_message_at de la conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation timestamp:', updateError);
    }

    return {
      id: messageData.id,
      conversationId: messageData.conversation_id,
      senderId: messageData.sender_id,
      content: messageData.content,
      isRead: messageData.is_read,
      createdAt: messageData.created_at,
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

// ============================================
// MARK AS READ
// ============================================

/**
 * Marque une liste de messages comme lus
 */
export async function markAsRead(messageIds: string[]): Promise<void> {
  if (messageIds.length === 0) return;

  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .in('id', messageIds);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}

/**
 * Marque tous les messages non lus d'une conversation comme lus
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    throw error;
  }
}

// ============================================
// GET UNREAD COUNT
// ============================================

/**
 * Récupère le nombre total de messages non lus pour un utilisateur
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    // Récupérer les conversations de l'utilisateur
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .or(`athlete_id.eq.${userId},coach_id.eq.${userId}`);

    if (convError) throw convError;

    if (!conversations || conversations.length === 0) {
      return 0;
    }

    const conversationIds = conversations.map((c) => c.id);

    // Compter les messages non lus dans ces conversations
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (countError) throw countError;

    return count ?? 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

// ============================================
// CREATE CONVERSATION
// ============================================

/**
 * Crée une nouvelle conversation ou retourne l'existante (UPSERT)
 * Basé sur la contrainte UNIQUE(athlete_id, coach_id, session_id, exercise_name)
 */
export async function createConversation(
  athleteId: string,
  coachId: string,
  sessionId?: string,
  exerciseName?: string
): Promise<Conversation> {
  try {
    // Chercher une conversation existante
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('coach_id', coachId);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      query = query.is('session_id', null);
    }

    if (exerciseName) {
      query = query.eq('exercise_name', exerciseName);
    } else {
      query = query.is('exercise_name', null);
    }

    const { data: existing, error: searchError } = await query.maybeSingle();

    if (searchError) throw searchError;

    // Si existe, retourner
    if (existing) {
      return {
        id: existing.id,
        athleteId: existing.athlete_id,
        coachId: existing.coach_id,
        sessionId: existing.session_id ?? undefined,
        exerciseName: existing.exercise_name ?? undefined,
        lastMessageAt: existing.last_message_at,
        createdAt: existing.created_at,
      };
    }

    // Sinon, créer
    const { data: newConv, error: insertError } = await supabase
      .from('conversations')
      .insert({
        athlete_id: athleteId,
        coach_id: coachId,
        session_id: sessionId ?? null,
        exercise_name: exerciseName ?? null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      id: newConv.id,
      athleteId: newConv.athlete_id,
      coachId: newConv.coach_id,
      sessionId: newConv.session_id ?? undefined,
      exerciseName: newConv.exercise_name ?? undefined,
      lastMessageAt: newConv.last_message_at,
      createdAt: newConv.created_at,
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
}

// ============================================
// HELPER: GET CONVERSATION BY ID
// ============================================

export async function getConversationById(
  conversationId: string
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        athlete:profiles!conversations_athlete_id_fkey(first_name, last_name),
        coach:profiles!conversations_coach_id_fkey(first_name, last_name)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      id: data.id,
      athleteId: data.athlete_id,
      coachId: data.coach_id,
      sessionId: data.session_id ?? undefined,
      exerciseName: data.exercise_name ?? undefined,
      lastMessageAt: data.last_message_at,
      createdAt: data.created_at,
      athleteName: data.athlete
        ? `${data.athlete.first_name} ${data.athlete.last_name}`.trim()
        : undefined,
      coachName: data.coach
        ? `${data.coach.first_name} ${data.coach.last_name}`.trim()
        : undefined,
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    throw error;
  }
}
