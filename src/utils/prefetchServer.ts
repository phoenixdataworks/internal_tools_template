'use server';

/**
 * Server-side utility functions for data prefetching
 *
 * This module provides centralized logic for prefetching user and team data
 * from the server side to ensure a consistent approach across different
 * authentication flows.
 */

import { QueryClient } from '@tanstack/react-query';
import { fetchUserProfileServer, fetchUserTeamsServer } from '@/app/(auth)/actions';
import { QueryKeys } from './queryKeys';
import { createLogger } from './logger';

// Create a server-specific logger
const ServerLogger = createLogger('[Server]');

/**
 * Prefetch critical user and team data from the server
 *
 * This function should be called after authentication is confirmed
 * to ensure the UI has immediate access to the required data.
 */
export async function prefetchUserDataServer(userId: string, queryClient: QueryClient) {
  try {
    // Step 1: Prefetch user profile
    const { data: profileData, error: profileError } = await fetchUserProfileServer(userId);

    if (profileData && !profileError) {
      // Add to query cache
      await queryClient.prefetchQuery({
        queryKey: QueryKeys.user(userId),
        queryFn: () => ({ data: profileData, error: null }),
      });

      // Step 2: Prefetch teams data
      const { data: teamsData, error: teamsError } = await fetchUserTeamsServer(userId);

      ServerLogger.info('Teams query result:', {
        success: !teamsError,
        teamsCount: teamsData?.length || 0,
        error: teamsError ? teamsError.message : null,
      });

      if (teamsData && !teamsError) {
        await queryClient.prefetchQuery({
          queryKey: QueryKeys.teams(userId),
          queryFn: () => teamsData,
        });
        ServerLogger.info('Successfully prefetched user and team data');
        return true;
      } else {
        ServerLogger.error('Error fetching teams data:', teamsError);
      }
    } else {
      ServerLogger.error('Error fetching user profile:', profileError);
    }
  } catch (error) {
    ServerLogger.error('Prefetching error:', error);
  }

  return false;
}
