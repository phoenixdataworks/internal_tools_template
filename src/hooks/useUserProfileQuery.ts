'use client';

import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { QueryKeys } from '@/utils/queryKeys';

export function useUserProfileQuery(userId: string | undefined) {
  const supabase = createClient();

  return useQuery({
    queryKey: QueryKeys.user(userId),
    queryFn: async () => {
      if (!userId) {
        return { data: null, error: null };
      }

      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

      return { data, error };
    },
    // Only run the query if we have a userId
    enabled: !!userId,
    // Keep the data fresh for 5 minutes
    staleTime: 5 * 60 * 1000,
    // Don't retry on error - this is a critical query
    retry: 3,
    // Log more details about this query
    meta: {
      source: 'useUserProfileQuery',
    },
  });
}
