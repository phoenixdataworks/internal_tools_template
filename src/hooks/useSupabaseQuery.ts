import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
  UseQueryOptions,
  QueryKey,
} from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth as useOriginalAuth } from '@/contexts/AuthContext';
import { useMemo, useRef, useEffect } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { QueryLogger, SupabaseLogger, ClientLogger } from '@/utils/logger';
import { stableStringify } from '@/utils/stableStringify';

// Track in-flight requests to prevent duplicates
const inflightRequests = new Map<string, Promise<any>>();

// Add time-based throttling for query executions
const queryThrottles = new Map<string, number>();
const THROTTLE_DURATION_MS = 300; // 300ms minimum between identical queries
// Shorter throttle for high-priority queries like pending invites
const HIGH_PRIORITY_THROTTLE_DURATION_MS = 100; // Only 100ms minimum between high-priority queries

// List of high-priority query prefixes that should use reduced throttling
const HIGH_PRIORITY_QUERY_PREFIXES = ['pending-invites', 'team-invites'];

/**
 * Simple hash function for query keys
 */
function hashQueryKey(queryKey: QueryKey): string {
  return stableStringify(queryKey);
}

/**
 * Check if a query is high-priority based on its key
 */
function isHighPriorityQuery(queryKey: QueryKey): boolean {
  const keyString = stableStringify(queryKey);
  return HIGH_PRIORITY_QUERY_PREFIXES.some(prefix => keyString.includes(prefix));
}

/**
 * Gets the current authenticated user from a Supabase client
 */
const getUserFromClient = async (client: SupabaseClient) => {
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error) {
      SupabaseLogger.error('Error getting user:', error);
      return null;
    } else if (user) {
      SupabaseLogger.debug('User found:', {
        user_id: user.id,
        email: user.email,
        app_metadata: user.app_metadata,
      });
      return user;
    } else {
      SupabaseLogger.warn('No user found');
      return null;
    }
  } catch (e) {
    SupabaseLogger.error('Exception getting user:', e);
    return null;
  }
};

// Re-export useAuth with a fallback to handle circular dependencies
export function useAuth() {
  try {
    // Try to use the original hook
    const auth = useOriginalAuth();

    // Log auth state for debugging
    QueryLogger.debug('Auth state:', {
      authStatus: auth.authStatus,
      userId: auth.user?.id,
      isInitialized: auth.isInitialized,
      hasUser: Boolean(auth.user),
    });

    return auth;
  } catch (error) {
    // If it fails (likely due to a circular dependency), return a fallback
    QueryLogger.warn('Using fallback auth implementation');
    return {
      user: null,
      isInitialized: false,
      authStatus: 'loading',
    };
  }
}

interface SupabaseQueryOptions<TData>
  extends Omit<UseQueryOptions<TData | null, Error, TData | null>, 'queryKey' | 'queryFn'> {
  allowEmpty?: boolean;
  cacheTime?: number;
  staleTime?: number;
  retry?: number;
  retryDelay?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  skipAuthCheck?: boolean;
  queryKey?: QueryKey;
  dedupeTimeMs?: number;
}

/**
 * Helper function to check if an error is an authentication error
 */
function isAuthError(error: any): boolean {
  if (!error) return false;

  // Check for common auth error patterns
  return (
    error.status === 401 ||
    error.code === 'PGRST301' ||
    error.code === 'PGRST204' ||
    (typeof error.message === 'string' &&
      (error.message.includes('JWT') ||
        error.message.includes('auth') ||
        error.message.includes('Authentication') ||
        error.message.includes('session')))
  );
}

/**
 * Handle authentication errors consistently
 */
function handleAuthError(error: any): void {
  QueryLogger.error('Authentication error detected:', error);

  // Redirect to login page with error message
  if (typeof window !== 'undefined') {
    QueryLogger.debug('Redirecting to login page due to auth error');
    // Use a short delay to allow error logging to complete
    setTimeout(() => {
      window.location.href = '/signin?error=session_expired';
    }, 100);
  }
}

/**
 * Generate a stable request ID from a query key
 */
function getRequestId(queryKey: QueryKey): string {
  return `query_${hashQueryKey(queryKey)}`;
}

/**
 * Check if a query has been executed too recently and should be throttled
 */
function shouldThrottleQuery(queryKey: QueryKey): boolean {
  const queryKeyStr = stableStringify(queryKey);
  const lastExecution = queryThrottles.get(queryKeyStr);
  const now = Date.now();

  // Determine throttle duration based on query type
  const throttleDuration = isHighPriorityQuery(queryKey)
    ? HIGH_PRIORITY_THROTTLE_DURATION_MS
    : THROTTLE_DURATION_MS;

  if (lastExecution && now - lastExecution < throttleDuration) {
    return true;
  }

  // Update last execution time
  queryThrottles.set(queryKeyStr, now);

  // Clean up old entries
  if (queryThrottles.size > 100) {
    const oldThreshold = now - 60000; // 1 minute
    for (const [key, timestamp] of queryThrottles.entries()) {
      if (timestamp < oldThreshold) {
        queryThrottles.delete(key);
      }
    }
  }

  return false;
}

/**
 * Enhanced React Query hook for Supabase data fetching with improved performance,
 * reduced logging overhead, and better auth error handling
 */
export function useSupabaseQuery<TData = any>(
  key: string | string[] | QueryKey,
  queryFn: (
    supabase: SupabaseClient,
    signal?: AbortSignal
  ) => Promise<{ data: TData | null; error: any }>,
  options?: SupabaseQueryOptions<TData>
) {
  const { user, authStatus } = useAuth();
  const queryClient = useQueryClient();
  const pendingRequest = useRef<Promise<any> | null>(null);
  const skipQueryOnceRef = useRef<boolean>(false);

  // Normalize the query key to always be an array
  const normalizedKey = useMemo(
    () => (Array.isArray(key) ? key : [key]) as QueryKey,
    // We need to stringify the key for proper dependency tracking
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableStringify(key)]
  );

  // Only proceed with query if we're authenticated or explicitly skipping auth check
  const shouldSkipQuery =
    (!options?.skipAuthCheck && (authStatus === 'loading' || !user)) || skipQueryOnceRef.current;

  // Reset skipQueryOnce after render
  useEffect(() => {
    skipQueryOnceRef.current = false;
  });

  // Get a stable request ID for this query
  const requestId = useMemo(() => getRequestId(normalizedKey), [normalizedKey]);

  // Memoize the query function to prevent recreation on each render
  const memoizedQueryFn = useMemo(() => {
    return async ({ signal }: { signal?: AbortSignal }): Promise<TData | null> => {
      // Apply throttling to prevent excessive identical queries
      if (shouldThrottleQuery(normalizedKey)) {
        // Special handling for high-priority queries - log differently
        if (isHighPriorityQuery(normalizedKey)) {
          QueryLogger.debug(
            `Throttling high-priority query "${stableStringify(normalizedKey)}" - brief delay`
          );
        } else {
          QueryLogger.debug(
            `Throttling query "${stableStringify(normalizedKey)}" - executed too recently`
          );
        }

        // Skip next execution to prevent rapid refetches
        skipQueryOnceRef.current = true;

        // Return existing data from cache if available
        const existingData = queryClient.getQueryData<TData | null>(normalizedKey);
        if (existingData !== undefined) {
          return existingData;
        }
      }

      QueryLogger.debug(
        `Executing query "${stableStringify(normalizedKey)}" with requestId ${requestId}`
      );

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        QueryLogger.warn('Not in browser environment, skipping query execution');
        return null;
      }

      // Check for an existing in-flight request
      const dedupeTimeMs = options?.dedupeTimeMs ?? 200; // Default dedupe window
      const existingRequest = inflightRequests.get(requestId);

      if (existingRequest && dedupeTimeMs > 0) {
        QueryLogger.debug(`Reusing in-flight request for "${stableStringify(normalizedKey)}"`);
        return existingRequest;
      }

      const executeRequest = async () => {
        try {
          // Create a fresh client for this specific query execution
          QueryLogger.debug('Creating Supabase client for query execution');
          let supabase;

          try {
            supabase = createClient(requestId);
          } catch (clientError) {
            ClientLogger.error('Error creating Supabase client:', clientError);

            // If this is a server-side rendering issue, return null instead of throwing
            if (
              clientError instanceof Error &&
              clientError.message.includes('browser environment')
            ) {
              ClientLogger.warn('Browser environment issue, returning null');
              return null;
            }

            throw clientError;
          }

          // Verify user authentication before executing query
          if (!options?.skipAuthCheck) {
            QueryLogger.debug('Verifying user authentication before executing query');
            let userData;

            try {
              const { data, error } = await supabase.auth.getUser();
              userData = data;

              if (error || !data.user) {
                QueryLogger.error('Authentication error or no user found:', error);
                handleAuthError({ message: 'User authentication failed', error });
                throw new Error('User authentication failed');
              }
            } catch (authError) {
              QueryLogger.error('Error verifying authentication:', authError);

              // If this is a server-side rendering issue, return null instead of throwing
              if (authError instanceof Error && authError.message.includes('browser environment')) {
                QueryLogger.warn('Browser environment issue, returning null');
                return null;
              }

              handleAuthError({ message: 'Authentication verification failed', error: authError });
              throw new Error('Authentication verification failed');
            }

            if (!userData.user) {
              QueryLogger.error('No authenticated user found after verification');
              handleAuthError({ message: 'No authenticated user' });
              throw new Error('No authenticated user');
            }

            QueryLogger.debug('User authentication verified, proceeding with query');
          }

          // Execute the query with the fresh client
          const result = await queryFn(supabase, signal);

          if (result.error) {
            QueryLogger.error(`Query "${stableStringify(normalizedKey)}" error:`, result.error);

            // Check if this is an auth error and handle it specially
            if (isAuthError(result.error)) {
              handleAuthError(result.error);
            }

            throw new Error(result.error.message);
          }

          QueryLogger.debug(`Query "${stableStringify(normalizedKey)}" success:`, {
            hasData: Boolean(result.data),
            dataLength: Array.isArray(result.data) ? result.data.length : null,
          });

          if (!result.data && !options?.allowEmpty) {
            throw new Error('No data returned from query');
          }

          return result.data;
        } catch (error) {
          // Also check for auth errors in caught exceptions
          if (error instanceof Error && isAuthError(error)) {
            handleAuthError(error);
          }
          throw error;
        } finally {
          // Remove the request from in-flight after a short delay
          // This prevents immediate duplicate requests while allowing
          // eventual refreshes
          if (dedupeTimeMs > 0) {
            setTimeout(() => {
              inflightRequests.delete(requestId);
            }, dedupeTimeMs);
          } else {
            inflightRequests.delete(requestId);
          }
        }
      };

      // Store the request in the in-flight map
      const request = executeRequest();
      inflightRequests.set(requestId, request);

      // Also store in the ref for the hook instance
      pendingRequest.current = request;

      return request;
    };
    // Only recreate the query function when these dependencies change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    normalizedKey,
    requestId,
    options?.skipAuthCheck,
    options?.allowEmpty,
    options?.dedupeTimeMs,
  ]);

  return useQuery<TData | null, Error>({
    queryKey: normalizedKey,
    queryFn: memoizedQueryFn,
    enabled: !shouldSkipQuery,
    staleTime: options?.staleTime ?? 60 * 1000, // Default to 1 minute
    gcTime: options?.cacheTime ?? 5 * 60 * 1000, // Default to 5 minutes
    retry: options?.retry ?? 1, // Default to 1 retry
    retryDelay: options?.retryDelay ?? 1000, // Default to 1 second
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false, // Default to false
    refetchOnReconnect: options?.refetchOnReconnect ?? false, // Default to false
    ...options,
  });
}

/**
 * Enhanced React Mutation hook for Supabase data mutations with improved performance
 * and reduced logging overhead
 */
export function useSupabaseMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<{ data: TData | null; error: any }>,
  options?: Omit<
    UseMutationOptions<{ data: TData | null; error: null }, Error, TVariables>,
    'mutationFn'
  >
) {
  const { user, isInitialized } = useAuth();
  const queryClient = useQueryClient();
  const pendingMutation = useRef<Promise<any> | null>(null);

  // Determine if auth is ready for mutations
  // Only check if we have a user ID - don't wait for profile data
  const authReady = Boolean(user?.id);

  // Only log in development mode
  const isDev = process.env.NODE_ENV === 'development';

  // Memoize the mutation function to prevent recreation on every render
  const memoizedMutationFn = useMemo(() => {
    return async (variables: TVariables) => {
      // Generate a unique request ID for tracing
      const requestId = `mutation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        QueryLogger.warn('Not in browser environment, aborting mutation');
        throw new Error('Supabase mutation can only be executed in browser environment');
      }

      try {
        // Check if auth is ready before proceeding
        if (!authReady) {
          QueryLogger.warn('Auth not ready, aborting mutation');
          throw new Error('Auth not ready');
        }

        // Create a fresh client for this specific mutation
        QueryLogger.debug(`Creating Supabase client for mutation ${requestId}`);
        let supabase;

        try {
          supabase = createClient(requestId);
        } catch (clientError) {
          ClientLogger.error('Error creating Supabase client:', clientError);
          throw new Error(
            `Failed to create Supabase client: ${clientError instanceof Error ? clientError.message : String(clientError)}`
          );
        }

        // Verify user authentication before executing mutation
        QueryLogger.debug('Verifying user authentication before executing mutation');

        try {
          const { data, error } = await supabase.auth.getUser();

          if (error || !data.user) {
            QueryLogger.error('Authentication error or no user found:', error);
            handleAuthError({ message: 'User authentication failed', error });
            throw new Error('User authentication failed');
          }

          QueryLogger.debug('User authentication verified, proceeding with mutation');
        } catch (authError) {
          QueryLogger.error('Error verifying authentication:', authError);
          handleAuthError({ message: 'Authentication verification failed', error: authError });
          throw new Error('Authentication verification failed');
        }

        // Execute the mutation function with the variables
        const result = await mutationFn(variables);

        const { data, error } = result;

        if (error) {
          // Always log errors
          QueryLogger.error(`Mutation ${requestId} error:`, error);

          // Check if this is an auth error and handle it specially
          if (isAuthError(error)) {
            handleAuthError(error);
          }
        } else if (isDev && process.env.NEXT_PUBLIC_ENABLE_QUERY_DATA_LOGS) {
          // Only log success with data in development with explicit flag
          QueryLogger.debug(
            `Mutation ${requestId} success`,
            Array.isArray(data) ? `(${data.length} items)` : ''
          );
        }

        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        // Check for auth errors in caught exceptions
        if (error instanceof Error && isAuthError(error)) {
          handleAuthError(error);
        }

        // Log errors unless they're auth-related (which we already log)
        if (error instanceof Error && error.message !== 'Auth not ready' && !isAuthError(error)) {
          QueryLogger.error('Error:', error);
        }
        throw error;
      } finally {
        pendingMutation.current = null;
      }
    };
  }, [authReady, isDev, mutationFn]);

  return useMutation<{ data: TData | null; error: null }, Error, TVariables>({
    mutationFn: memoizedMutationFn,
    ...options,
  });
}

// Standard hooks that use the enhanced query hooks
export function useMetricsQuery(streamIds: string[]) {
  // Use a stable query key with proper dependency tracking
  const queryKey = useMemo(
    () => ['metrics', ...streamIds.sort()],
    // We need to stringify streamIds for proper dependency tracking
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stableStringify(streamIds)]
  );

  return useSupabaseQuery(
    queryKey,
    async (supabase, signal) => {
      const { data, error } = await supabase
        .from('metrics')
        .select('*')
        .in('stream_id', streamIds)
        .order('timestamp', { ascending: true });

      return { data, error };
    },
    {
      enabled: streamIds.length > 0, // Only enable if we have streamIds
      retry: 1,
      retryDelay: 1000,
      staleTime: 30 * 1000,
      cacheTime: 5 * 60 * 1000,
      allowEmpty: true,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      dedupeTimeMs: 500, // Deduplicate requests for 500ms
    }
  );
}

// Example usage for updating metrics:
export function useUpdateMetrics() {
  // We don't need to check auth readiness here since useSupabaseMutation will handle it
  return useSupabaseMutation(
    async ({ streamId, metrics }: { streamId: number; metrics: Record<string, any>[] }) => {
      // Generate a unique request ID for tracing
      const requestId = `metrics_update_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        QueryLogger.warn('Not in browser environment, aborting operation');
        throw new Error('Supabase operation can only be executed in browser environment');
      }

      try {
        // Create a fresh client for this operation
        ClientLogger.debug(`Creating Supabase client for metrics update ${requestId}`);
        let client;

        try {
          client = createClient(requestId);
        } catch (clientError) {
          ClientLogger.error('Error creating Supabase client:', clientError);
          throw new Error(
            `Failed to create Supabase client: ${clientError instanceof Error ? clientError.message : String(clientError)}`
          );
        }

        // Execute the upsert operation
        const { data, error } = await client
          .from('metrics')
          .upsert(metrics.map(m => ({ stream_id: streamId, ...m })));

        if (error) {
          QueryLogger.error('Error upserting metrics:', error);
        } else {
          QueryLogger.debug('Successfully upserted metrics:', {
            count: metrics.length,
            streamId,
          });
        }

        return { data, error };
      } catch (error) {
        QueryLogger.error('Exception in metrics update:', error);
        throw error;
      }
    }
  );
}
