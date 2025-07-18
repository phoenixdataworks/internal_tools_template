import { Database } from './supabase';

/**
 * This file contains utility types for working with the Supabase database schema.
 * All database-related types should be derived from the central Database type in
 * src/types/supabase.ts using these helper types to maintain consistency.
 *
 * - Use TableRow<'table_name'> for fetched database records
 * - Use TableInsert<'table_name'> for creating new records
 * - Use TableUpdate<'table_name'> for updating records
 * - Create extended interfaces (extends TableRow<'table_name'>) for UI-specific fields
 */

// Utility type to extract table types
export type TableRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type TableInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type TableUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Utility type for function parameters and returns
export type FunctionArgs<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Args'];
export type FunctionReturns<T extends keyof Database['public']['Functions']> =
  Database['public']['Functions'][T]['Returns'];

// Example usage:
// type User = TableRow<'users'>;
// type NewUser = TableInsert<'users'>;
// type UserUpdate = TableUpdate<'users'>;
