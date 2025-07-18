import { TableRow, TableInsert, TableUpdate } from '@/types/helpers';
import { Profile } from './user';

// Base types from database
export type ChatThread = TableRow<'chat_threads'>;
export type ChatComment = TableRow<'chat_comments'>;
export type ChatReaction = TableRow<'chat_reactions'>;
export type ChatReadReceipt = TableRow<'chat_read_receipts'>;

// Insert types
export type NewChatThread = TableInsert<'chat_threads'>;
export type NewChatComment = TableInsert<'chat_comments'>;
export type NewChatReaction = TableInsert<'chat_reactions'>;
export type NewChatReadReceipt = TableInsert<'chat_read_receipts'>;

// Update types
export type ChatThreadUpdate = TableUpdate<'chat_threads'>;
export type ChatCommentUpdate = TableUpdate<'chat_comments'>;
export type ChatReactionUpdate = TableUpdate<'chat_reactions'>;
export type ChatReadReceiptUpdate = TableUpdate<'chat_read_receipts'>;

// Extended types with additional fields
export interface ChatThreadWithDetails extends ChatThread {
  unread_count?: number;
  created_by_profile?: Profile;
  resolved_by_profile?: Profile;
  latest_comment?: ChatCommentWithDetails;
  comment_count?: number;
}

export interface ChatCommentWithDetails extends ChatComment {
  created_by_profile?: Profile;
  deleted_by_profile?: Profile;
  parent_comment?: ChatCommentWithDetails;
  reactions?: ChatReactionWithDetails[];
  children?: ChatCommentWithDetails[];
}

export interface ChatReactionWithDetails extends ChatReaction {
  user_profile?: Profile;
}

export interface ChatReadReceiptWithDetails extends ChatReadReceipt {
  user_profile?: Profile;
}
