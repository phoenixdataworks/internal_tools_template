'use client';

import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/user';
import { SignInWithPasswordCredentials } from '@supabase/supabase-js';

/**
 * Auth Service
 *
 * A centralized service for handling authentication operations.
 * This service encapsulates all Supabase auth operations to:
 * 1. Create a fresh client for each operation to ensure latest auth state
 * 2. Standardize error handling
 * 3. Provide a consistent interface for auth operations
 * 4. Make testing easier by allowing mock implementation
 */

/**
 * Get the current user session
 */
export async function getCurrentSession() {
  console.log('[AuthService] Getting current session');
  try {
    // Create a fresh client for this operation
    const client = createClient();
    const { data, error } = await client.auth.getSession();

    if (error) {
      console.error('[AuthService] Error getting session:', error);
      throw error;
    }

    console.log(
      '[AuthService] Session check complete:',
      data.session ? 'Session found' : 'No session'
    );
    return data.session;
  } catch (e) {
    console.error('[AuthService] Exception in getCurrentSession:', e);
    throw e;
  }
}

/**
 * Get the current user
 */
export async function getCurrentUser() {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.auth.getUser();
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(credentials: SignInWithPasswordCredentials) {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.auth.signInWithPassword(credentials);
}

/**
 * Create a user profile in the database
 */
export async function createUserProfile(
  userId: string,
  userData: {
    email?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
  }
) {
  console.log('[AuthService] Creating profile for user:', userId);
  const client = createClient();

  // Construct the profile data
  const profileData = {
    id: userId,
    email: userData.email,
    full_name:
      userData.full_name ||
      (userData.first_name && userData.last_name
        ? `${userData.first_name} ${userData.last_name}`
        : undefined),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return await client.from('profiles').upsert(profileData);
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  options?: {
    firstName?: string;
    lastName?: string;
    redirectTo?: string;
  }
) {
  // Create a fresh client for this operation
  const client = createClient();
  const signUpResult = await client.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?redirectTo=${
        options?.redirectTo || '/dashboard'
      }`,
      data:
        options?.firstName && options?.lastName
          ? {
              first_name: options.firstName,
              last_name: options.lastName,
              full_name: `${options.firstName} ${options.lastName}`,
            }
          : undefined,
    },
  });

  // Profile creation is now handled by the auth callback route
  // This prevents permission issues and ensures the profile is created
  // after the user has confirmed their email and completed the auth flow

  return signUpResult;
}

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'azure', redirectTo: string) {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      ...(provider === 'azure'
        ? {
            queryParams: {
              prompt: 'select_account',
              scopes: 'email',
            },
          }
        : {}),
    },
  });
}

/**
 * Set up auth state change listener
 */
export function onAuthStateChange(callback: (event: any, session: any) => void) {
  // Create a fresh client for this operation
  const client = createClient();
  const { data } = client.auth.onAuthStateChange(callback);
  return data.subscription;
}

/**
 * Sign out
 */
export async function signOut() {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.auth.signOut();
}

/**
 * Fetch user profile from database
 */
export async function fetchUserProfile(userId: string, customClient?: any) {
  // Use provided client or create a fresh one
  const client = customClient || createClient();
  return await client.from('profiles').select('*').eq('id', userId).single();
}

/**
 * Fetch teams for the current user
 */
export async function fetchUserTeams(userId: string, customClient?: any) {
  // Use provided client or create a fresh one
  const client = customClient || createClient();
  return await client
    .from('teams')
    .select(
      `
      *,
      team_members!inner (
        user_id,
        role
      )
    `
    )
    .eq('team_members.user_id', userId);
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
}

/**
 * Update password
 */
export async function updatePassword(password: string) {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.auth.updateUser({
    password,
  });
}

/**
 * Update user profile
 */
export async function updateProfile(userId: string, updates: Partial<Profile>) {
  // Create a fresh client for this operation
  const client = createClient();
  return await client.from('profiles').update(updates).eq('id', userId);
}

const authService = {
  getCurrentSession,
  getCurrentUser,
  signInWithPassword,
  signUp,
  signInWithOAuth,
  onAuthStateChange,
  signOut,
  fetchUserProfile,
  fetchUserTeams,
  resetPassword,
  updatePassword,
  updateProfile,
  createUserProfile,
};

export default authService;
