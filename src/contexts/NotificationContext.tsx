'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useSupabaseQuery, useSupabaseMutation } from '@/hooks/useSupabaseQuery';
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { NotificationWithMetadata } from '@/types/notification';

interface NotificationContextType {
  notifications: NotificationWithMetadata[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  clearAll: async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const supabase = createClient();

  // Memoize the user ID to prevent unnecessary query recreations
  const userId = useMemo(() => user?.id || '', [user?.id]);

  // Memoize the notifications query function
  const notificationsQueryFn = useMemo(() => {
    return async () => {
      if (!user?.id) return { data: [], error: null };

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Notifications] Fetched ${data?.length || 0} notifications`);
      }

      return { data: data || [], error };
    };
  }, [user?.id, supabase]);

  // Fetch notifications
  const { data: rawNotifications, refetch } = useSupabaseQuery<NotificationWithMetadata[]>(
    ['notifications', userId],
    notificationsQueryFn,
    {
      enabled: !!userId,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnMount: true,
      refetchOnWindowFocus: true,
    }
  );

  // Subscribe to real-time updates
  useRealtimeSubscription({
    channelName: `notifications:${user?.id || ''}`,
    table: 'notifications',
    onInsert: () => void refetch(),
    onUpdate: () => void refetch(),
    onDelete: () => void refetch(),
  });

  // Mark as read mutation
  const markAsReadMutation = useSupabaseMutation(async (id: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useSupabaseMutation(async () => {
    if (!user?.id) throw new Error('No user found');

    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
      .select();

    return { data, error };
  });

  // Delete notification mutation
  const deleteNotificationMutation = useSupabaseMutation(async (id: string) => {
    const { data, error } = await supabase.from('notifications').delete().eq('id', id).select();

    return { data, error };
  });

  // Clear all notifications mutation
  const clearAllMutation = useSupabaseMutation(async () => {
    if (!user?.id) throw new Error('No user found');

    const { data, error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .select();

    return { data, error };
  });

  const markAsRead = useCallback(
    async (id: string) => {
      await markAsReadMutation.mutateAsync(id);
    },
    [markAsReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    await markAllAsReadMutation.mutateAsync({});
  }, [markAllAsReadMutation]);

  const deleteNotification = useCallback(
    async (id: string) => {
      await deleteNotificationMutation.mutateAsync(id);
    },
    [deleteNotificationMutation]
  );

  const clearAll = useCallback(async () => {
    await clearAllMutation.mutateAsync({});
  }, [clearAllMutation]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return (rawNotifications || []).filter(n => !n.read).length;
  }, [rawNotifications]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      notifications: rawNotifications || [],
      unreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }),
    [rawNotifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll]
  );

  return (
    <NotificationContext.Provider value={contextValue}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
