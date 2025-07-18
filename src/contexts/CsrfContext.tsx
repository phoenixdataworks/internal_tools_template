'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { getCsrfToken, withCsrfToken } from '@/utils/csrf';

// Replace with actual session management hook from your authentication setup
// For example, if using @supabase/auth-helpers-react or a custom hook
interface Session {
  user: { id: string };
}

// Placeholder for your actual hook
function useSupabase() {
  // In a real implementation, this would use Supabase auth
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        // This would be replaced with actual Supabase session check
        // e.g. const { data } = await supabase.auth.getSession();
        const isLoggedIn = localStorage.getItem('auth.session');
        if (isLoggedIn) {
          setSession({ user: { id: 'user-id' } });
        }
      } catch (error) {
        console.error('Session check error:', error);
      }
    };

    checkSession();
  }, []);

  return { session };
}

interface CsrfContextType {
  isInitialized: boolean;
  fetchWithCsrf: <T>(url: string, options?: RequestInit) => Promise<T>;
  refreshCsrfToken: () => Promise<void>;
}

const CsrfContext = createContext<CsrfContextType | undefined>(undefined);

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { session } = useSupabase();

  const refreshCsrfToken = useCallback(async () => {
    if (!session) return;

    try {
      await getCsrfToken();
      setIsInitialized(true);
    } catch (error) {
      console.error('Error initializing CSRF token:', error);
      setIsInitialized(false);
    }
  }, [session]);

  useEffect(() => {
    if (session && !isInitialized) {
      refreshCsrfToken();
    }
  }, [session, isInitialized, refreshCsrfToken]);

  const fetchWithCsrf = useCallback(
    async <T,>(url: string, options: RequestInit = {}): Promise<T> => {
      const method = options.method?.toUpperCase() || 'GET';
      let fetchOptions = options;

      // Only add CSRF token for state-changing methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && isInitialized) {
        fetchOptions = withCsrfToken(options);
      }

      const response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include', // Always include cookies
      });

      if (!response.ok) {
        // Check if CSRF token expired or is invalid
        if (response.status === 403 && response.headers.get('x-csrf-error')) {
          // Try to refresh the token and retry once
          await refreshCsrfToken();

          // Retry with new token
          const retryOptions = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
            ? withCsrfToken(options)
            : options;

          const retryResponse = await fetch(url, {
            ...retryOptions,
            credentials: 'include',
          });

          if (!retryResponse.ok) {
            throw new Error(`Request failed: ${retryResponse.statusText}`);
          }

          return retryResponse.json();
        }

        throw new Error(`Request failed: ${response.statusText}`);
      }

      return response.json();
    },
    [isInitialized, refreshCsrfToken]
  );

  return (
    <CsrfContext.Provider value={{ isInitialized, fetchWithCsrf, refreshCsrfToken }}>
      {children}
    </CsrfContext.Provider>
  );
}

export function useCsrf() {
  const context = useContext(CsrfContext);
  if (context === undefined) {
    throw new Error('useCsrf must be used within a CsrfProvider');
  }
  return context;
}
