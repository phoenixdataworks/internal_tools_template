'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/contexts/ToastContext';
import { createClient } from '@/lib/supabase/client';
import {
  ChatThread,
  ChatThreadWithDetails,
  ChatCommentWithDetails,
  ChatThreadUpdate,
  NewChatComment,
} from '@/types/chat';

export type { ChatThread as Thread };

export interface ChatContextType {
  threads: ChatThreadWithDetails[];
  threadsById: Record<string, ChatThreadWithDetails>;
  comments: Record<string, ChatCommentWithDetails[]>;
  activeThreadId: string | null;
  isLoading: boolean;
  error: string | null;
  createThread: (
    title: string,
    content: string,
    objectId?: string,
    objectType?: string
  ) => Promise<ChatThreadWithDetails>;
  updateThread: (threadId: string, updates: Partial<ChatThreadUpdate>) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  createComment: (
    threadId: string,
    data: Pick<NewChatComment, 'content' | 'parent_id'> & { author_id: string }
  ) => Promise<void>;
  editComment: (commentId: string, content: ChatCommentWithDetails['content']) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  loadThreadComments: (threadId: string) => Promise<void>;
  setActiveThread: React.Dispatch<React.SetStateAction<string | null>>;
}

export const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [threads, setThreads] = useState<ChatThreadWithDetails[]>([]);
  const [comments, setComments] = useState<Record<string, ChatCommentWithDetails[]>>({});
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const { showToast } = useToast();
  const supabase = createClient();

  const threadsById = useMemo(() => {
    if (!threads) return {};
    return threads.reduce(
      (acc, thread) => {
        acc[thread.id] = thread;
        return acc;
      },
      {} as Record<string, ChatThreadWithDetails>
    );
  }, [threads]);

  const loadThreads = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Get threads for the current user (domain-based access)
      const { data, error } = await supabase
        .from('chat_threads')
        .select(
          `
          id,
          title,
          content,
          created_by,
          created_at,
          updated_at,
          status,
          object_id,
          object_type,
          metadata,
          pinned,
          resolved_at,
          resolved_by,
          team_id,
          creator:profiles!chat_threads_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (err) {
      console.error('Error in loadThreads:', err);
      setError(err instanceof Error ? err.message : 'Failed to load threads');
      showToast?.('Failed to load threads', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!user || !mounted) return;
      setIsLoading(true);
      try {
        await loadThreads();
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [user?.id]); // Only reload when user ID changes

  const loadThreadComments = useCallback(
    async (threadId: string) => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('chat_comments')
          .select(
            `
          id,
          thread_id,
          parent_id,
          content,
          created_by,
          created_at,
          updated_at,
          deleted,
          deleted_at,
          deleted_by,
          edited_at,
          metadata,
          author:profiles!chat_comments_author_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `
          )
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setComments(prev => ({
          ...prev,
          [threadId]: data || [],
        }));
      } catch (err) {
        console.error('Error loading comments:', err);
        showToast?.('Failed to load comments', 'error');
      }
    },
    [user, showToast]
  );

  const createThread = async (
    title: string,
    content: string,
    objectId?: string,
    objectType?: string
  ): Promise<ChatThreadWithDetails> => {
    if (!user) throw new Error('User not authenticated');
    if (!currentTeam)
      throw new Error('No team selected. Please select a team before creating a thread.');

    try {
      console.log('Creating thread with data:', {
        title,
        content,
        created_by: user.id,
        team_id: currentTeam.id,
        object_id: objectId,
        object_type: objectType,
      });

      // First, insert the thread
      const { data: insertData, error: insertError } = await supabase
        .from('chat_threads')
        .insert({
          title,
          content,
          created_by: user.id,
          team_id: currentTeam.id,
          object_id: objectId,
          object_type: objectType,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }

      console.log('Thread inserted successfully with ID:', insertData.id);

      // Then, fetch the complete thread with details
      const { data, error } = await supabase
        .from('chat_threads')
        .select(
          `
          id,
          title,
          content,
          created_by,
          created_at,
          updated_at,
          status,
          object_id,
          object_type,
          metadata,
          pinned,
          resolved_at,
          resolved_by,
          team_id,
          creator:profiles!chat_threads_created_by_fkey (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('id', insertData.id)
        .single();

      if (error) {
        console.error('Select error:', error);
        throw error;
      }

      console.log('Thread fetched successfully:', data);

      const newThread = data as ChatThreadWithDetails;
      setThreads(prev => [newThread, ...prev]);
      return newThread;
    } catch (err) {
      console.error('Error creating thread2:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create thread';
      showToast?.(errorMessage, 'error');
      throw err;
    }
  };

  const updateThread = async (threadId: string, updates: Partial<ChatThreadUpdate>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('chat_threads').update(updates).eq('id', threadId);

      if (error) throw error;

      setThreads(prev =>
        prev.map(thread => (thread.id === threadId ? { ...thread, ...updates } : thread))
      );
    } catch (err) {
      console.error('Error updating thread:', err);
      showToast?.('Failed to update thread', 'error');
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('chat_threads').delete().eq('id', threadId);

      if (error) throw error;

      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      setComments(prev => {
        const newComments = { ...prev };
        delete newComments[threadId];
        return newComments;
      });
    } catch (err) {
      console.error('Error deleting thread:', err);
      showToast?.('Failed to delete thread', 'error');
    }
  };

  const createComment = async (
    threadId: string,
    data: Pick<NewChatComment, 'content' | 'parent_id'> & { author_id: string }
  ) => {
    if (!user) return;

    try {
      const { data: newComment, error } = await supabase
        .from('chat_comments')
        .insert({
          thread_id: threadId,
          content: data.content,
          author_id: data.author_id,
          parent_id: data.parent_id,
        })
        .select(
          `
          id,
          thread_id,
          parent_id,
          content,
          created_by,
          created_at,
          updated_at,
          deleted,
          deleted_at,
          deleted_by,
          edited_at,
          metadata,
          author:profiles!chat_comments_author_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      setComments(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), newComment as ChatCommentWithDetails],
      }));

      // Update thread's updated_at
      await updateThread(threadId, { updated_at: new Date().toISOString() });
    } catch (err) {
      console.error('Error creating comment:', err);
      showToast?.('Failed to create comment', 'error');
    }
  };

  const editComment = async (commentId: string, content: ChatCommentWithDetails['content']) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('chat_comments')
        .update({ content })
        .eq('id', commentId);

      if (error) throw error;

      setComments(prev => {
        const newComments = { ...prev };
        Object.keys(newComments).forEach(threadId => {
          newComments[threadId] = newComments[threadId].map(comment =>
            comment.id === commentId ? { ...comment, content } : comment
          );
        });
        return newComments;
      });
    } catch (err) {
      console.error('Error editing comment:', err);
      showToast?.('Failed to edit comment', 'error');
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('chat_comments').delete().eq('id', commentId);

      if (error) throw error;

      setComments(prev => {
        const newComments = { ...prev };
        Object.keys(newComments).forEach(threadId => {
          newComments[threadId] = newComments[threadId].filter(comment => comment.id !== commentId);
        });
        return newComments;
      });
    } catch (err) {
      console.error('Error deleting comment:', err);
      showToast?.('Failed to delete comment', 'error');
    }
  };

  const contextValue = useMemo(
    () => ({
      threads,
      threadsById,
      comments,
      activeThreadId,
      isLoading,
      error,
      createThread,
      updateThread,
      deleteThread,
      createComment,
      editComment,
      deleteComment,
      loadThreadComments,
      setActiveThread: setActiveThreadId,
    }),
    [
      threads,
      threadsById,
      comments,
      activeThreadId,
      isLoading,
      error,
      createThread,
      updateThread,
      deleteThread,
      createComment,
      editComment,
      deleteComment,
      loadThreadComments,
    ]
  );

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
}

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
