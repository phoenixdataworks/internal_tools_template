import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { ChatThread, ChatComment } from './chat';
import { Notification } from './notification';

// Use generated types for database tables
export type DatabaseTables = {
  chat_threads: ChatThread;
  chat_comments: ChatComment;
  notifications: Notification;
};

export type RealtimePayload<T extends keyof DatabaseTables> = RealtimePostgresChangesPayload<
  DatabaseTables[T]
>;
