'use client';

import { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Profile } from '@/types/user';
import { useRouter } from 'next/navigation';
import { signInWithOAuth as serverSignInWithOAuth } from '@/app/(auth)/actions';
import { useUserProfileQuery } from '@/hooks/useUserProfileQuery';
import { useQueryClient } from '@tanstack/react-query';
import {
  onAuthStateChange,
  signInWithPassword,
  signOut as signOutFn,
  getCurrentUser,
  createUserProfile,
} from '@/services/authService';
import { QueryKeys } from '@/utils/queryKeys';
import { AuthLogger } from '@/utils/logger';

// Define possible auth states for better type safety and clarity
type AuthStatus =
  | 'initializing' // Initial state, checking for session
  | 'authenticated' // User is authenticated and profile loaded
  | 'unauthenticated' // No user session
  | 'error'; // Auth error occurred

// Legacy auth state type for backward compatibility
type AuthState =
  | 'initializing' // Initial state, checking for session
  | 'loading-profile' // Session found, loading user profile
  | 'ready' // Auth is fully initialized and ready
  | 'error' // Auth error occurred
  | 'signed-out'; // User is signed out

interface AuthContextType {
  user: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithAzure: () => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  isSuperAdmin: boolean;
  authStatus: AuthStatus;
  reloadProfile: () => Promise<void>;

  // Deprecated - kept for backward compatibility
  isInitialized: boolean;
  isFullyReady: boolean;
  authState: AuthState;
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: Profile | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser = null }: AuthProviderProps) {
  // Primary state
  const [user, setUser] = useState<Profile | null>(initialUser);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    initialUser ? 'authenticated' : 'initializing'
  );
  const [error, setError] = useState<Error | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(initialUser?.is_super_admin || false);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const [userId, setUserId] = useState<string | undefined>(initialUser?.id);

  // Add refs to track previous values and prevent unnecessary updates
  const prevUserRef = useRef<Profile | null>(initialUser);
  const prevAuthStatusRef = useRef<AuthStatus>(initialUser ? 'authenticated' : 'initializing');
  const authCheckedRef = useRef<boolean>(false);
  const authListenerSetupRef = useRef<boolean>(false);

  // Use the query client to invalidate queries
  const queryClient = useQueryClient();
  const router = useRouter();

  // Use the user profile query - this will automatically fetch the profile when userId changes
  // Only fetch if we don't already have initialUser set
  const { data: profileData, isSuccess: profileSuccess } = useUserProfileQuery(
    initialUser ? undefined : userId
  );

  // More focused update of the user profile when the query returns
  useEffect(() => {
    if (initialUser) {
      // If we have an initialUser, use that directly
      if (!user && !authCheckedRef.current) {
        AuthLogger.debug('Using initial user data:', initialUser.id);
        prevUserRef.current = initialUser;
        setUser(initialUser);
        setIsSuperAdmin(!!initialUser.is_super_admin);
        setAuthStatus('authenticated');
        setIsLoading(false);
        authCheckedRef.current = true;
      }
    } else if (profileSuccess && profileData) {
      // Otherwise use profile data from query
      const userData = 'data' in profileData ? profileData.data : profileData;

      if (userData) {
        // Only update if user data has actually changed to prevent unnecessary re-renders
        const currentUserStr = JSON.stringify(prevUserRef.current);
        const newUserStr = JSON.stringify(userData);

        if (currentUserStr !== newUserStr) {
          AuthLogger.debug('Profile data loaded and changed:', userData);
          prevUserRef.current = userData;
          setUser(userData);
          setIsSuperAdmin(!!userData.is_super_admin);
          setAuthStatus('authenticated');
          setIsLoading(false);
        } else {
          AuthLogger.debug('Profile data loaded but unchanged');
        }
      } else if (userId) {
        // If we have a userId but no profile data, create a profile as a fallback
        AuthLogger.debug('No profile found for authenticated user, creating one as fallback');
        createFallbackProfile(userId);
      }
    }
  }, [profileSuccess, profileData, userId, initialUser, user]);

  // Function to create a fallback profile for authenticated users without a profile
  const createFallbackProfile = async (userId: string) => {
    try {
      AuthLogger.debug('Creating fallback profile for user:', userId);

      // Get user data from Supabase Auth
      const { data, error: userError } = await getCurrentUser();

      if (userError || !data.user) {
        AuthLogger.error('Error getting user data for fallback profile:', userError);
        return;
      }

      const user = data.user;

      // Create the profile using the authService function
      const { error: createError } = await createUserProfile(userId, {
        email: user.email,
        full_name: user.user_metadata?.full_name,
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
      });

      if (createError) {
        AuthLogger.error('Error creating fallback profile:', createError);
      } else {
        AuthLogger.debug('Fallback profile created successfully');
        // Reload the profile data
        queryClient.invalidateQueries({ queryKey: QueryKeys.user(userId) });
      }
    } catch (error) {
      AuthLogger.error('Unexpected error creating fallback profile:', error);
    }
  };

  // Map authStatus to legacy authState for backward compatibility
  const authState: AuthState = (() => {
    switch (authStatus) {
      case 'initializing':
        return 'initializing';
      case 'authenticated':
        return 'ready';
      case 'unauthenticated':
        return 'signed-out';
      case 'error':
        return 'error';
      default:
        return 'initializing';
    }
  })();

  // For backward compatibility
  const isInitialized = authStatus === 'authenticated' || authStatus === 'unauthenticated';
  const isFullyReady = authStatus === 'authenticated' || authStatus === 'unauthenticated';

  // Initial auth check - simplified to use getCurrentUser
  useEffect(() => {
    // Skip if we already have an initialUser or already checked auth
    if (initialUser || authCheckedRef.current) return;

    // Get current pathname
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

    // Check if current route is a public route
    const isPublicRoute =
      pathname === '/' ||
      pathname.includes('/signin') ||
      pathname.includes('/signup') ||
      pathname.includes('/forgot-password') ||
      pathname.includes('/auth/callback') ||
      pathname.startsWith('/about') ||
      pathname.startsWith('/features') ||
      pathname.startsWith('/contact') ||
      pathname.startsWith('/pricing') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/accept-invite');

    // Skip auth check for public routes to avoid unnecessary errors
    if (isPublicRoute) {
      AuthLogger.debug('Skipping auth check for public route:', pathname);
      setAuthStatus('unauthenticated');
      setIsLoading(false);
      authCheckedRef.current = true;
      return;
    }

    async function checkAuth() {
      try {
        AuthLogger.debug('Checking for current user');
        const { data, error: userError } = await getCurrentUser();

        if (userError) {
          AuthLogger.error('Error getting current user:', userError);
          setAuthStatus('unauthenticated');
          setIsLoading(false);
          authCheckedRef.current = true;
          return;
        }

        if (data.user) {
          AuthLogger.debug('User found, setting userId for query', data.user.id);
          setUserId(data.user.id);
        } else {
          AuthLogger.debug('No user found, setting unauthenticated');
          setAuthStatus('unauthenticated');
          setIsLoading(false);
        }

        authCheckedRef.current = true;
      } catch (error) {
        AuthLogger.error('Error during auth check:', error);
        setAuthStatus('unauthenticated');
        setIsLoading(false);
        authCheckedRef.current = true;
      }
    }

    checkAuth();
  }, [initialUser]);

  // Auth state subscription - only set up once
  useEffect(() => {
    if (authListenerSetupRef.current) return;

    let subscription: { unsubscribe: () => void } | null = null;

    async function setupAuthListener() {
      try {
        authListenerSetupRef.current = true;
        subscription = await onAuthStateChange(
          async (event: AuthChangeEvent, session: Session | null) => {
            AuthLogger.debug('Auth state changed:', event);

            if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
              AuthLogger.debug('User signed in or token refreshed, setting userId for query');
              setUserId(session.user.id);
            } else if (event === 'SIGNED_OUT') {
              AuthLogger.debug('User signed out, clearing state');
              prevUserRef.current = null;
              setUser(null);
              setUserId(undefined);
              setAuthStatus('unauthenticated');
              queryClient.clear();
            }
          }
        );
      } catch (error) {
        AuthLogger.error('Error setting up auth state change listener:', error);
      }
    }

    setupAuthListener();

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [queryClient]);

  // Auth methods
  const signIn = async (email: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await signInWithPassword({ email, password });
      if (error) throw error;
      AuthLogger.debug('Sign in successful');
    } catch (error) {
      AuthLogger.error('Sign in error:', error);
      setError(error instanceof Error ? error : new Error('Failed to sign in'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await signOutFn();
      if (error) throw error;

      // Clear user state
      setUser(null);
      setUserId(undefined);
      setAuthStatus('unauthenticated');
      queryClient.clear();
      router.push('/signin');
    } catch (error) {
      AuthLogger.error('Sign out error:', error);
      setError(error instanceof Error ? error : new Error('Failed to sign out'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    await serverSignInWithOAuth('google', baseUrl);
  };

  const signInWithAzure = async (): Promise<void> => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    await serverSignInWithOAuth('azure', baseUrl);
  };

  const reloadProfile = async () => {
    if (!userId) return;
    AuthLogger.debug('Reloading profile for user:', userId);
    queryClient.invalidateQueries({ queryKey: QueryKeys.user(userId) });
  };

  // Create a memoized context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      user,
      signIn,
      signOut,
      signInWithGoogle,
      signInWithAzure,
      isLoading,
      error,
      isInitialized: authStatus === 'authenticated' || authStatus === 'unauthenticated',
      isFullyReady: authStatus === 'authenticated' || authStatus === 'unauthenticated',
      isSuperAdmin,
      authState: (authStatus === 'initializing'
        ? 'initializing'
        : authStatus === 'authenticated'
          ? 'ready'
          : authStatus === 'unauthenticated'
            ? 'signed-out'
            : 'error') as AuthState,
      authStatus,
      reloadProfile,
    }),
    [user, isLoading, error, authStatus, isSuperAdmin]
  );

  // Check if current route is a public route
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isPublicRoute =
    // Marketing pages
    pathname === '/' ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    // Auth pages
    pathname.startsWith('/auth') ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/accept-invite') ||
    pathname.includes('/forgot-password');

  // Show loading state only for protected routes and when still initializing
  if (isLoading && !isPublicRoute && authStatus === 'initializing') {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        <div>Loading authentication...</div>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
