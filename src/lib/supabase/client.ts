import { createBrowserClient } from '@supabase/ssr';
import { SupabaseLogger } from '@/utils/logger';
import { SupabaseClient } from '@supabase/supabase-js';

// Store a singleton instance of the client
let clientInstance: SupabaseClient | null = null;
let requestCount = 0;
const activeRequests = new Set<string>();

// Add a cache for tracking recent client requests to avoid redundant logging
const recentLogCache = new Map<string, { timestamp: number; count: number }>();
const LOG_COOLDOWN_MS = 1000; // 1 second cooldown for similar logs

/**
 * Logs a debug message with cooldown to prevent log spam
 */
function logWithCooldown(message: string, type: 'debug' | 'warn' | 'error' = 'debug'): void {
  const cacheKey = message;
  const now = Date.now();
  const cached = recentLogCache.get(cacheKey);

  if (cached) {
    // If we've logged this recently, increment counter instead of logging again
    if (now - cached.timestamp < LOG_COOLDOWN_MS) {
      cached.count++;
      recentLogCache.set(cacheKey, cached);
      return;
    }

    // If we've crossed the cooldown threshold but have accumulated counts,
    // log with the count and reset
    if (cached.count > 1) {
      const logFn =
        type === 'debug'
          ? SupabaseLogger.debug
          : type === 'warn'
            ? SupabaseLogger.warn
            : SupabaseLogger.error;

      logFn(`${message} (occurred ${cached.count} times)`);
    }
  }

  // Log the current message and set/reset the cache entry
  if (type === 'debug') {
    SupabaseLogger.debug(message);
  } else if (type === 'warn') {
    SupabaseLogger.warn(message);
  } else {
    SupabaseLogger.error(message);
  }

  recentLogCache.set(cacheKey, { timestamp: now, count: 1 });

  // Clean up old cache entries
  if (recentLogCache.size > 100) {
    const oldestTime = now - LOG_COOLDOWN_MS * 10;
    for (const [key, value] of recentLogCache.entries()) {
      if (value.timestamp < oldestTime) {
        recentLogCache.delete(key);
      }
    }
  }
}

/**
 * Creates a Supabase client with the latest auth state
 * This function follows the recommended pattern from Supabase docs
 * for client-side authentication in Next.js applications.
 *
 * The client automatically reads auth state from cookies that are
 * set by the middleware.
 *
 * This implementation uses a singleton pattern to avoid creating
 * multiple client instances unnecessarily.
 */
export function createClient(requestId?: string) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    logWithCooldown('Not in browser environment, cannot create client', 'warn');
    throw new Error('Supabase client can only be created in browser environment');
  }

  // Generate request ID for tracking
  const reqId = requestId || `req_${Date.now()}_${++requestCount}`;

  // Track active requests to detect duplicates
  if (activeRequests.has(reqId)) {
    logWithCooldown(`Duplicate request detected: ${reqId}`, 'warn');
  } else {
    activeRequests.add(reqId);
    // Auto-cleanup after 30 seconds
    setTimeout(() => activeRequests.delete(reqId), 30000);
  }

  // Return existing instance if available
  if (clientInstance) {
    logWithCooldown(`Using existing client instance for request ${reqId}`);
    return clientInstance;
  }

  try {
    logWithCooldown(`Creating fresh client instance for request ${reqId}`);

    // Check if required environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      SupabaseLogger.error('Missing required environment variables');
      throw new Error('Missing Supabase environment variables');
    }

    // Create a new client with the latest auth state
    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
        global: {
          headers: {
            'X-Client-Info': 'supabase-ssr/0.5.2',
            'X-Client-Type': 'browser',
            'X-Request-ID': reqId,
          },
        },
      }
    );

    // Verify that the client was created successfully
    if (!client || !client.auth) {
      SupabaseLogger.error('Client created but auth is not available');
      throw new Error('Supabase client created without auth');
    }

    // Add a debug method to check session status
    const debugClient = client as any;
    debugClient.debug = async () => {
      try {
        const { data, error } = await client.auth.getSession();
        if (error) {
          SupabaseLogger.error('Error getting session:', error);
          return { hasSession: false, error };
        }
        return {
          hasSession: !!data.session,
          expiresAt: data.session?.expires_at,
          userId: data.session?.user?.id,
        };
      } catch (e) {
        SupabaseLogger.error('Exception in debug:', e);
        return { hasSession: false, error: e };
      }
    };

    // Store the client instance for reuse
    clientInstance = client;
    return client;
  } catch (error) {
    SupabaseLogger.error(`Error creating client for request ${reqId}:`, error);

    // In development, provide more detailed error information
    if (process.env.NODE_ENV === 'development') {
      SupabaseLogger.error('Detailed error:', error);
    }

    // Throw the error instead of returning a minimal client
    // This will help identify issues more clearly
    throw new Error(
      `Failed to create Supabase client: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Method to force refresh the client if needed (e.g., after sign-out)
export function resetSupabaseClient() {
  clientInstance = null;
  SupabaseLogger.debug('Supabase client instance reset');
}

// Store a singleton instance of the realtime client
let realtimeClientInstance: SupabaseClient | null = null;

/**
 * Creates a Supabase client specifically for realtime subscriptions
 * This implementation uses a singleton pattern to avoid creating
 * multiple client instances unnecessarily.
 */
export function createRealtimeClient(requestId?: string) {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    SupabaseLogger.warn('Not in browser environment, cannot create realtime client');
    throw new Error('Supabase realtime client can only be created in browser environment');
  }

  // Generate request ID for tracking
  const reqId = requestId || `realtime_req_${Date.now()}_${++requestCount}`;

  // Return existing instance if available
  if (realtimeClientInstance) {
    SupabaseLogger.debug(`Using existing realtime client instance for request ${reqId}`);
    return realtimeClientInstance;
  }

  try {
    SupabaseLogger.debug(`Creating fresh realtime client instance for request ${reqId}`);

    // Check if required environment variables are available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      SupabaseLogger.error('Missing required environment variables for realtime client');
      throw new Error('Missing Supabase environment variables');
    }

    const client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'supabase-ssr/0.5.2',
            'X-Client-Type': 'browser-realtime',
            'X-Request-ID': reqId,
          },
        },
      }
    );

    // Verify that the client was created successfully
    if (!client || !client.realtime) {
      SupabaseLogger.error('Realtime client created but realtime is not available');
      throw new Error('Supabase realtime client created without realtime capability');
    }

    // Store the client instance for reuse
    realtimeClientInstance = client;
    return client;
  } catch (error) {
    SupabaseLogger.error(`Error creating realtime client for request ${reqId}:`, error);

    // In development, provide more detailed error information
    if (process.env.NODE_ENV === 'development') {
      SupabaseLogger.error('Detailed realtime client error:', error);
    }

    // Throw the error instead of returning a minimal client
    throw new Error(
      `Failed to create Supabase realtime client: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

// Method to force refresh the realtime client if needed
export function resetRealtimeClient() {
  realtimeClientInstance = null;
  SupabaseLogger.debug('Supabase realtime client instance reset');
}
