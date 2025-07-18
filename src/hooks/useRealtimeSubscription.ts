import { useEffect, useCallback } from 'react';
import { realtimeManager } from '@/lib/supabase/realtime';
import { DatabaseTables, RealtimePayload } from '@/types/realtime';
import { useAuth } from '@/contexts/AuthContext';

interface UseRealtimeSubscriptionOptions<T extends keyof DatabaseTables> {
  channelName: string;
  table: T;
  onInsert?: (payload: RealtimePayload<T>) => void;
  onUpdate?: (payload: RealtimePayload<T>) => void;
  onDelete?: (payload: RealtimePayload<T>) => void;
  onError?: (error: Error) => void;
}

export function useRealtimeSubscription<T extends keyof DatabaseTables>({
  channelName,
  table,
  onInsert,
  onUpdate,
  onDelete,
  onError,
}: UseRealtimeSubscriptionOptions<T>) {
  const { user, isLoading } = useAuth();

  // Memoize callbacks to prevent unnecessary resubscriptions
  const memoizedOnInsert = useCallback(onInsert || (() => {}), [onInsert]);
  const memoizedOnUpdate = useCallback(onUpdate || (() => {}), [onUpdate]);
  const memoizedOnDelete = useCallback(onDelete || (() => {}), [onDelete]);
  const memoizedOnError = useCallback(onError || (() => {}), [onError]);

  useEffect(() => {
    // Don't subscribe until user is loaded and channelName is available
    if (isLoading || !user || !channelName) return;

    let cleanup: (() => void) | undefined;

    const setup = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[useRealtimeSubscription] Setting up subscription for ${channelName}`);
        }

        cleanup = await realtimeManager.subscribe(channelName, {
          onInsert: memoizedOnInsert,
          onUpdate: memoizedOnUpdate,
          onDelete: memoizedOnDelete,
          onError: memoizedOnError,
        });
      } catch (error) {
        console.error('[useRealtimeSubscription] Subscription error:', error);
        memoizedOnError(error as Error);
      }
    };

    setup();

    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[useRealtimeSubscription] Cleaning up subscription for ${channelName}`);
      }
      cleanup?.();
    };
  }, [
    channelName,
    user,
    isLoading,
    memoizedOnInsert,
    memoizedOnUpdate,
    memoizedOnDelete,
    memoizedOnError,
  ]);
}
