'use client';

/**
 * Utility functions for data prefetching
 *
 * This module provides centralized logic for prefetching user and team data
 * to ensure a consistent approach across different authentication flows.
 */

import { QueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { fetchUserProfile, fetchUserTeams } from '@/services/authService';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Prefetch team members data for a specific team
 */
export async function prefetchTeamMembers(
  teamId: string,
  queryClient: QueryClient,
  customClient?: SupabaseClient
) {
  try {
    console.log('[Prefetch] Fetching team members for team:', teamId);
    const supabase = customClient || createClient();

    // Verify user is authenticated before executing query
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userData.user || userError) {
      console.error('[Prefetch] No authenticated user found, cannot fetch team members');
      return false;
    }

    // Load team members with their profiles
    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select(
        `
        *,
        profile:profiles!team_members_user_id_fkey (
          id,
          email,
          full_name
        )
        `
      )
      .eq('team_id', teamId);

    if (membersError) {
      console.error('[Prefetch] Error fetching team members:', membersError);
      return false;
    }

    // Add to query cache
    await queryClient.prefetchQuery({
      queryKey: ['team', teamId, 'members'],
      queryFn: () => ({ data: membersData, error: null }),
    });

    console.log('[Prefetch] Successfully prefetched team members:', {
      teamId,
      memberCount: membersData?.length || 0,
    });

    return true;
  } catch (error) {
    console.error('[Prefetch] Error prefetching team members:', error);
    return false;
  }
}

/**
 * Prefetch critical user and team data
 *
 * This function should be called after authentication is confirmed
 * to ensure the UI has immediate access to the required data.
 */
export async function prefetchUserData(
  userId: string,
  queryClient: QueryClient,
  customClient?: SupabaseClient
) {
  try {
    const supabase = customClient || createClient();

    // Verify user is authenticated before executing query
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (!userData.user || userError) {
      console.error('[Prefetch] No authenticated user found, cannot fetch user data');
      return false;
    }

    // Step 1: Prefetch user profile
    console.log('[Prefetch] Fetching user profile for:', userId);
    const { data: profileData, error: profileError } = await fetchUserProfile(userId, supabase);

    if (profileData && !profileError) {
      // Add to query cache
      await queryClient.prefetchQuery({
        queryKey: ['user', userId],
        queryFn: () => ({ data: profileData, error: null }),
      });

      // Step 2: Prefetch teams data
      const { data: teamsData, error: teamsError } = await fetchUserTeams(userId, supabase);

      console.log('[Prefetch] Teams query result:', {
        success: !teamsError,
        teamsCount: teamsData?.length || 0,
        error: teamsError ? teamsError.message : null,
      });

      if (teamsData && !teamsError) {
        await queryClient.prefetchQuery({
          queryKey: ['teams', userId],
          queryFn: () => teamsData,
        });

        // Step 3: If user has teams, prefetch members for the first team
        if (teamsData.length > 0) {
          const firstTeamId = teamsData[0].id;
          await prefetchTeamMembers(firstTeamId, queryClient, supabase);
        }

        console.log('[Prefetch] Successfully prefetched user and team data');
        return true;
      } else {
        console.error('[Prefetch] Error fetching teams data:', teamsError);
      }
    } else {
      console.error('[Prefetch] Error fetching user profile:', profileError);
    }
  } catch (error) {
    console.error('[Prefetch] Prefetching error:', error);
  }

  return false;
}
