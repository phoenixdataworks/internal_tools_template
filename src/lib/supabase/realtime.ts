import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createRealtimeClient } from '@/lib/supabase/client';
import { DatabaseTables } from '@/types/realtime';

export class RealtimeManager {
  private static instance: RealtimeManager | null = null;
  /**
   * Track active realtime channels with a simple reference-count so that
   * multiple React effects/components can share the same underlying
   * Supabase channel instance safely.
   *
   * Key   – channelName (table[:id])
   * Value – { channel: RealtimeChannel; refCount: number }
   */
  private channels: Map<string, { channel: RealtimeChannel; refCount: number }> = new Map();

  private constructor() {}

  static getInstance(): RealtimeManager {
    if (!RealtimeManager.instance) {
      RealtimeManager.instance = new RealtimeManager();
    }
    return RealtimeManager.instance;
  }

  async subscribe<T extends keyof DatabaseTables>(
    channelName: string,
    handlers: {
      onInsert?: (payload: RealtimePostgresChangesPayload<DatabaseTables[T]>) => void;
      onUpdate?: (payload: RealtimePostgresChangesPayload<DatabaseTables[T]>) => void;
      onDelete?: (payload: RealtimePostgresChangesPayload<DatabaseTables[T]>) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<() => void> {
    // ---------------------------------------------------------------------
    // STEP 1: If an entry already exists, just bump its refCount and return
    // ---------------------------------------------------------------------
    const existingEntry = this.channels.get(channelName);
    if (existingEntry) {
      existingEntry.refCount += 1;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[RealtimeManager] Reusing existing channel for ${channelName} (refCount=${existingEntry.refCount})`
        );
      }

      return () => this.unsubscribe(channelName);
    }

    try {
      // Extract table name from channel name (e.g. "metrics-123" -> "metrics")
      const tableName = channelName.split(/[-:]/)[0];
      if (!tableName) throw new Error(`Invalid channel name: ${channelName}`);

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[RealtimeManager] Creating subscription to ${tableName} for channel ${channelName}
          `
        );
      }

      // Create a fresh client for each subscription – the singleton inside
      // createRealtimeClient() guarantees a single websocket connection while
      // still returning the same client for subsequent table subscriptions.
      const supabase = createRealtimeClient();

      if (process.env.NODE_ENV === 'development') {
        console.log('[RealtimeManager] Created/using realtime client for subscription');
      }

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: tableName,
            filter:
              tableName === 'livestream_metrics'
                ? `livestream_id=eq.${channelName.split(':')[1]}`
                : undefined,
          },
          (payload: RealtimePostgresChangesPayload<DatabaseTables[T]>) => {
            handlers.onInsert?.(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: tableName,
            filter:
              tableName === 'livestream_metrics'
                ? `livestream_id=eq.${channelName.split(':')[1]}`
                : undefined,
          },
          (payload: RealtimePostgresChangesPayload<DatabaseTables[T]>) => {
            handlers.onUpdate?.(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: tableName,
            filter:
              tableName === 'livestream_metrics'
                ? `livestream_id=eq.${channelName.split(':')[1]}`
                : undefined,
          },
          (payload: RealtimePostgresChangesPayload<DatabaseTables[T]>) => {
            handlers.onDelete?.(payload);
          }
        )
        .on('system', { event: 'error' }, (error: any) => {
          // Check if this is actually a successful subscription message incorrectly classified as an error
          if (
            error &&
            typeof error === 'object' &&
            error.status === 'ok' &&
            error.message === 'Subscribed to PostgreSQL'
          ) {
            if (process.env.NODE_ENV === 'development') {
              console.log(`[RealtimeManager] Successfully subscribed to channel ${channelName}`);
            }
          } else {
            console.error(`[RealtimeManager] Error on channel ${channelName}:`, error);
            handlers.onError?.(error);
          }
        });

      // -------------------------------------------------------------------
      // STEP 2: Put the channel in the registry BEFORE awaiting subscribe()
      //         so that concurrent calls use the same instance and we avoid
      //         the "subscribe multiple times" error.
      // -------------------------------------------------------------------
      this.channels.set(channelName, { channel, refCount: 1 });

      await channel.subscribe();

      if (process.env.NODE_ENV === 'development') {
        console.log(`[RealtimeManager] Successfully subscribed to channel ${channelName}`);
      }

      return () => this.unsubscribe(channelName);
    } catch (error) {
      console.error(`[RealtimeManager] Subscription error for ${channelName}:`, error);
      handlers.onError?.(error as Error);
      return () => {};
    }
  }

  /**
   * Decrement the reference count and clean up the underlying Supabase
   * channel once no more consumers are using it.
   */
  unsubscribe(channelName: string) {
    const entry = this.channels.get(channelName);

    if (!entry) return; // Nothing to do

    entry.refCount -= 1;

    if (process.env.NODE_ENV === 'development') {
      console.log(
        `[RealtimeManager] Unsubscribe called for ${channelName} (refCount=${entry.refCount})`
      );
    }

    if (entry.refCount <= 0) {
      try {
        entry.channel.unsubscribe();
      } catch (err) {
        console.error(`[RealtimeManager] Error unsubscribing ${channelName}:`, err);
      }
      this.channels.delete(channelName);

      if (process.env.NODE_ENV === 'development') {
        console.log(`[RealtimeManager] Channel ${channelName} fully unsubscribed and removed`);
      }
    }
  }

  cleanup() {
    Array.from(this.channels.values()).forEach(entry => {
      try {
        entry.channel.unsubscribe();
      } catch (err) {
        console.error('[RealtimeManager] Error during cleanup:', err);
      }
    });
    this.channels.clear();
  }
}

const realtimeManager = RealtimeManager.getInstance();
export { realtimeManager };
