'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/apiClient';

/**
 * Hook to check and create required security tables if they don't exist
 * This is a fallback in case migrations have not been applied
 */
export function useSecuritySetup() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const createSecurityTokensTable = useCallback(async () => {
    try {
      // Check if security_tokens table exists
      const { error: checkError } = await supabase.from('security_tokens').select('id').limit(1);

      // If table exists, we're done
      if (!checkError) {
        console.log('Security tokens table exists');
        setIsReady(true);
        return;
      }

      // Table doesn't exist, try to create it using service role key
      // This should be done via migrations in a real app
      console.warn('Security tokens table does not exist, attempting to create');

      // Call a server API route that creates the table with admin privileges
      const response = await apiFetch('/api/admin/setup-security-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create security tables: ${errorData.error}`);
      }

      const data = await response.json();
      console.log('Security setup result:', data);
      setIsReady(true);
    } catch (err) {
      console.error('Error setting up security tables:', err);
      setError(err instanceof Error ? err : new Error(String(err)));

      // Set as ready anyway since we can fall back to user metadata
      setIsReady(true);
    }
  }, [supabase]);

  useEffect(() => {
    // Only run this check once on initial load
    if (!isReady && !error) {
      createSecurityTokensTable();
    }
  }, [isReady, error, createSecurityTokensTable]);

  return { isReady, error };
}
