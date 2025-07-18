import { TableRow, TableInsert, TableUpdate } from '@/types/helpers';
import { Json } from './supabase';

// Base types from database
export type Notification = TableRow<'notifications'>;
export type NotificationInsert = TableInsert<'notifications'>;
export type NotificationUpdate = TableUpdate<'notifications'>;

// Notification types
export type NotificationType = 'auth' | 'system' | 'chat' | 'team' | 'mention';

// Extended types with UI-specific fields
export interface NotificationWithMetadata extends Omit<Notification, 'data'> {
  data?: Json;
}

// Notification data types
export interface AuthNotificationData {
  action: 'verify_email' | 'password_reset' | 'new_device' | 'account_update';
  [key: string]: any;
}

export interface ChatNotificationData {
  thread_id: string;
  comment_id?: string;
  commenter_id?: string;
  [key: string]: any;
}

export interface TeamNotificationData {
  team_id: string;
  team_name: string;
  inviter_name?: string;
  action: 'team_invitation' | 'team_join' | 'team_leave';
  [key: string]: any;
}

export interface SystemNotificationData {
  action: 'update' | 'maintenance' | 'security';
  severity: 'info' | 'warning' | 'critical';
  [key: string]: any;
}

// Type guard functions
export function isAuthNotification(
  notification: NotificationWithMetadata
): notification is NotificationWithMetadata & { data: AuthNotificationData } {
  return notification.type === 'auth' && !!notification.data;
}

export function isChatNotification(
  notification: NotificationWithMetadata
): notification is NotificationWithMetadata & { data: ChatNotificationData } {
  return notification.type === 'chat' && !!notification.data;
}

export function isTeamNotification(
  notification: NotificationWithMetadata
): notification is NotificationWithMetadata & { data: TeamNotificationData } {
  return notification.type === 'team' && !!notification.data;
}

export function isSystemNotification(
  notification: NotificationWithMetadata
): notification is NotificationWithMetadata & { data: SystemNotificationData } {
  return notification.type === 'system' && !!notification.data;
}
