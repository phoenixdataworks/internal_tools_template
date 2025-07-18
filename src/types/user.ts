import { TableRow, TableInsert, TableUpdate } from '@/types/helpers';
import { NotificationType } from './notification';

// Base types from database
export type Profile = TableRow<'profiles'>;

export type NewProfile = TableInsert<'profiles'>;
export type ProfileUpdate = TableUpdate<'profiles'>;

// Extended types with UI-specific fields
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  digest: 'daily' | 'weekly' | 'never';
  types: {
    [key in NotificationType]: boolean;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  emailDigest: boolean;
}

// Base type from database
type BaseProfile = TableRow<'profiles'>;

// Extended user type with auth metadata
export interface User extends BaseProfile {
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    preferences?: UserPreferences;
    role?: 'super_admin' | 'admin' | 'user';
    [key: string]: any;
  };
  app_metadata?: {
    provider?: string;
    [key: string]: any;
  };
}
