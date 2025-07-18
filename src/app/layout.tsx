import './globals.css';
import { Viewport } from 'next';
import { Providers } from '@/components/providers/Providers';
import { Box } from '@mui/material';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { createSupabaseServerClient } from '../lib/supabase/server';
import { getUserProfile } from '@/queries/users';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { prefetchUserDataServer } from '../utils/prefetchServer';

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Define body styles outside component to prevent recreation
const bodyStyle = { margin: 0, padding: 0, height: '100vh', overflow: 'hidden' } as const;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const queryClient = new QueryClient();

  let profile = null;

  // Attempt to prefetch user data if available
  // This is for performance optimization, not authentication control
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Fetch user profile for hydration
      const { data } = await getUserProfile(user.id, supabase);
      const sessionResponse = await supabase.auth.refreshSession();
      // console.log('[RootLayout] Session:', sessionResponse.data.session);

      profile = data;

      // Use the centralized prefetch utility to get user and team data
      if (data) {
        await prefetchUserDataServer(user.id, queryClient);
        console.log('[RootLayout] Successfully prefetched user and team data');
      }
    }
  } catch (err) {
    console.error('Error prefetching user data:', err);
    // Continue rendering without the prefetched data
  }

  // Check query cache before dehydration
  const teamQueryKey = ['teams', profile?.id] as const;
  const teamData = queryClient.getQueryCache().find({ queryKey: teamQueryKey });
  // console.log('[RootLayout] Query cache before dehydration:', {
  //   teamQueryKey,
  //   hasTeamData: Boolean(teamData),
  //   hasTeamQueryData: Boolean(queryClient.getQueryData(teamQueryKey)),
  // });

  // Dehydrate the query cache
  const dehydratedState = dehydrate(queryClient);

  return (
    <html lang="en">
      <body style={bodyStyle}>
        <Providers user={profile} dehydratedState={dehydratedState}>
          <Box
            component="main"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100%',
              width: '100%',
            }}
          >
            {children}
          </Box>
        </Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
