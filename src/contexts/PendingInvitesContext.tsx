'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from '@/hooks/useSupabaseQuery';
import { createClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { useTeam } from './TeamContext';
import { PendingInviteLogger } from '@/utils/logger';
import { debounce } from 'lodash';

interface PendingInvitesContextType {
  pendingInvitesCount: number;
  pendingInvites: any[];
  refreshPendingInvites: () => Promise<void>;
  isInitiallyLoading: boolean;
}

const PendingInvitesContext = createContext<PendingInvitesContextType>({
  pendingInvitesCount: 0,
  pendingInvites: [],
  refreshPendingInvites: async () => {},
  isInitiallyLoading: true,
});

// Create a minimal auth info wrapper to reduce re-renders
const AuthInfoProvider = React.memo(function AuthInfoProvider({
  children,
  userId,
  authStatus,
}: {
  children: React.ReactNode;
  userId: string | undefined;
  authStatus: string;
}) {
  return <>{children}</>;
});

const PendingInvitesProviderInner = React.memo(function PendingInvitesProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pendingInvitesCount, setPendingInvitesCount] = useState(0);
  const [isInitiallyLoading, setIsInitiallyLoading] = useState(true);
  const { user, authStatus } = useAuth();
  const { teams } = useTeam();
  const queryClient = useQueryClient();
  const initialLoadRef = useRef(false);
  const refreshInProgressRef = useRef(false);
  const lastRefreshTimeRef = useRef(0);
  const authInfoRef = useRef({ userId: user?.id, authStatus });

  // Update auth info ref when auth changes to avoid excessive re-renders
  useEffect(() => {
    authInfoRef.current = { userId: user?.id, authStatus };
  }, [user?.id, authStatus]);

  // Only create Supabase client once and memoize it
  const supabase = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
      return createClient('pending_invites_context');
    } catch (e) {
      PendingInviteLogger.error('Error creating client in PendingInvitesContext:', e);
      return null;
    }
  }, []);

  // Memoize the user ID to prevent unnecessary query key changes
  const userId = useMemo(() => user?.id || 'anonymous', [user?.id]);

  // Memoize the count query function
  const countQueryFn = useCallback(
    async (supabase: ReturnType<typeof createClient>, signal?: AbortSignal) => {
      // Skip queries if not authenticated
      if (authStatus !== 'authenticated' || !user?.id || !supabase) {
        PendingInviteLogger.debug('Skipping count query - not authenticated');
        return { data: 0, error: null };
      }

      PendingInviteLogger.debug('Loading invites...');

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        PendingInviteLogger.error('Error loading profile:', profileError);
        return { data: 0, error: profileError };
      }

      PendingInviteLogger.debug('Profile email:', profile.email, 'User ID:', user.id);

      // Get count of pending invites for the user's email that haven't been accepted
      // and aren't for teams they're already a member of
      const { count, error: invitesError } = await supabase
        .from('team_invites')
        .select(
          `
        *,
        teams!inner (
          id,
          team_members!team_members_team_id_fkey (
            user_id
          )
        )
      `,
          { count: 'exact' }
        )
        .eq('email', profile.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .not('teams.team_members.user_id', 'eq', user.id);

      if (invitesError) {
        PendingInviteLogger.error('Error loading pending invites:', invitesError);
        return { data: 0, error: invitesError };
      }

      PendingInviteLogger.debug('Found', count, 'pending invites for', profile.email);
      return { data: count || 0, error: null };
    },
    [user?.id, authStatus]
  );

  // Memoize the invite data query function
  const inviteDataQueryFn = useCallback(
    async (supabase: ReturnType<typeof createClient>, signal?: AbortSignal) => {
      // Skip queries if not authenticated
      if (authStatus !== 'authenticated' || !user?.id || !supabase) {
        PendingInviteLogger.debug('Skipping invite data query - not authenticated');
        return { data: [], error: null };
      }

      PendingInviteLogger.debug('Loading detailed invites...');

      // Get the user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        PendingInviteLogger.error('Error loading profile:', profileError);
        return { data: [], error: profileError };
      }

      PendingInviteLogger.debug('User profile loaded:', { email: profile.email, userId: user.id });

      const currentDate = new Date().toISOString();
      PendingInviteLogger.debug('Current date for expiry check:', currentDate);

      // Get all pending invites for the user's email with team data and inviter information
      const { data, error: invitesError } = await supabase
        .from('team_invites')
        .select(
          `
        *,
        teams!inner (
          id,
          name,
          description,
          team_members!team_members_team_id_fkey (
            user_id
          )
        ),
        profiles:invited_by (
          email,
          full_name
        )
      `
        )
        .eq('email', profile.email)
        .eq('status', 'pending')
        .gt('expires_at', currentDate)
        .not('teams.team_members.user_id', 'eq', user.id);

      if (invitesError) {
        PendingInviteLogger.error('Error loading pending invites details:', invitesError);
        return { data: [], error: invitesError };
      }

      // Log raw data for debugging
      PendingInviteLogger.debug('Raw invites data received:', JSON.stringify(data, null, 2));

      // Map the results to include inviter information
      const mappedInvites =
        data?.map(invite => ({
          ...invite,
          invited_by_email: invite.profiles?.email,
          invited_by_name: invite.profiles?.full_name,
        })) || [];

      PendingInviteLogger.debug(
        'Processed invites:',
        mappedInvites.length,
        'detailed invites found for',
        profile.email,
        mappedInvites.map(invite => ({
          id: invite.id,
          team: invite.teams.name,
          status: invite.status,
          expires_at: invite.expires_at,
          created_at: invite.created_at,
        }))
      );

      return { data: mappedInvites, error: null };
    },
    [user?.id, authStatus]
  );

  // Use the query to fetch pending invites
  const { data: invitesData, refetch } = useSupabaseQuery(
    ['pending-invites', userId],
    async (supabase, signal) => {
      return countQueryFn(supabase, signal);
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      allowEmpty: true,
      retry: 1,
      placeholderData: 0,
      dedupeTimeMs: 500, // Dedupe similar requests
    }
  );

  // Add a query to fetch the actual invite data for use in components
  const { data: pendingInvites = [] } = useSupabaseQuery(
    ['pending-invites-data', userId],
    async (supabase, signal) => {
      return inviteDataQueryFn(supabase, signal);
    },
    {
      staleTime: 10 * 60 * 1000, // 10 minutes
      cacheTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      allowEmpty: true,
      retry: 1,
      placeholderData: [],
      dedupeTimeMs: 500, // Dedupe similar requests
    }
  );

  // Update the state when the invites data changes
  useEffect(() => {
    // Safely handle invitesData which might be null, undefined, or a number
    if (typeof invitesData === 'number') {
      setPendingInvitesCount(invitesData);
      PendingInviteLogger.debug('Updated pendingInvitesCount state:', invitesData);
    } else {
      // If invitesData is null or undefined, set count to 0
      setPendingInvitesCount(0);
      PendingInviteLogger.debug('Reset pendingInvitesCount to 0 (no data)');
    }
  }, [invitesData]);

  // Set isInitiallyLoading to false when data loading completes
  useEffect(() => {
    if (initialLoadRef.current) {
      PendingInviteLogger.debug('Initial load complete, setting isInitiallyLoading to false');
      setIsInitiallyLoading(false);
    }
  }, [invitesData, pendingInvites]);

  // Throttled function to refresh pending invites
  const refreshPendingInvitesImpl = useCallback(async () => {
    // Check if a refresh is already in progress or if it's been less than 2 seconds since the last refresh
    const now = Date.now();
    if (refreshInProgressRef.current || now - lastRefreshTimeRef.current < 2000) {
      PendingInviteLogger.debug('Refresh skipped: already in progress or too soon');
      return;
    }

    try {
      refreshInProgressRef.current = true;
      lastRefreshTimeRef.current = now;
      PendingInviteLogger.debug('Manually refreshing pending invites...');
      await refetch();
      // Also invalidate the invites data query
      queryClient.invalidateQueries({ queryKey: ['pending-invites-data', userId] });
      PendingInviteLogger.debug('Pending invites refreshed and cache invalidated');
    } catch (error) {
      PendingInviteLogger.error('Error refreshing pending invites:', error);
    } finally {
      refreshInProgressRef.current = false;
    }
  }, [refetch, queryClient, userId]);

  // Debounced version of refresh function
  const refreshPendingInvites = useMemo(
    () =>
      debounce(refreshPendingInvitesImpl, 300, { leading: true, trailing: true, maxWait: 1000 }),
    [refreshPendingInvitesImpl]
  );

  // Track when auth becomes authenticated to load invites
  useEffect(() => {
    if (authStatus === 'authenticated' && user?.id) {
      if (!initialLoadRef.current) {
        PendingInviteLogger.debug('Auth is ready, loading invites (initial load)');
        initialLoadRef.current = true;
        refreshPendingInvites();
      }
    } else if (authStatus === 'unauthenticated') {
      PendingInviteLogger.debug('Auth is unauthenticated, clearing invites');
      setPendingInvitesCount(0);
      initialLoadRef.current = false;
      setIsInitiallyLoading(true);
    }
  }, [authStatus, user?.id, refreshPendingInvites]);

  // Monitor teams changes to refresh invites when needed
  useEffect(() => {
    if (teams?.length > 0 && initialLoadRef.current) {
      PendingInviteLogger.debug('Teams changed, refreshing invites');
      refreshPendingInvites();
    }
  }, [teams, refreshPendingInvites]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      refreshPendingInvites.cancel();
    };
  }, [refreshPendingInvites]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => {
    const contextValue = {
      pendingInvitesCount,
      // Ensure pendingInvites is always an array, even if the query returns null/undefined
      pendingInvites: Array.isArray(pendingInvites) ? pendingInvites : [],
      refreshPendingInvites,
      isInitiallyLoading,
    };

    PendingInviteLogger.debug('Context value updated:', {
      pendingInvitesCount,
      pendingInvitesLength: contextValue.pendingInvites.length,
      isInitiallyLoading,
    });

    return contextValue;
  }, [pendingInvitesCount, pendingInvites, refreshPendingInvites, isInitiallyLoading]);

  return (
    <AuthInfoProvider userId={user?.id} authStatus={authStatus}>
      <PendingInvitesContext.Provider value={value}>{children}</PendingInvitesContext.Provider>
    </AuthInfoProvider>
  );
});

export function PendingInvitesProvider({ children }: { children: React.ReactNode }) {
  return <PendingInvitesProviderInner>{children}</PendingInvitesProviderInner>;
}

export function usePendingInvites() {
  const context = useContext(PendingInvitesContext);
  if (context === undefined) {
    throw new Error('usePendingInvites must be used within a PendingInvitesProvider');
  }
  PendingInviteLogger.debug('usePendingInvites hook called, returning context with:', {
    count: context.pendingInvitesCount,
    invites: context.pendingInvites.length,
    isLoading: context.isInitiallyLoading,
  });
  return context;
}
