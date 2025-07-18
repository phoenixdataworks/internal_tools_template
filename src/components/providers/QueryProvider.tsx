'use client';

import { QueryClient, QueryClientProvider, HydrationBoundary } from '@tanstack/react-query';
import { useState } from 'react';

interface QueryProviderProps {
  children: React.ReactNode;
  dehydratedState?: unknown;
}

export function QueryProvider({ children, dehydratedState }: QueryProviderProps) {
  // Create a new QueryClient on each mount to prevent state persistence across refreshes
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: false, // Disable automatic refetch on reconnect
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Allow queries to run by default, individual hooks will control their own enabled state
          },
          mutations: {
            retry: 1,
            retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  // Don't clear query cache on mount - allow queries to persist between renders
  // This helps prevent unnecessary refetches when navigating between pages

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>{children}</HydrationBoundary>
    </QueryClientProvider>
  );
}
