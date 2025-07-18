'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Box } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import { Footer } from '@/components/Footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, authStatus } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isLoading && user) {
      // Check for invite token in URL
      const inviteToken = searchParams?.get('invite_token');

      if (inviteToken) {
        console.log(
          '[AuthLayout] User already authenticated with invite token, redirecting to teams'
        );
        router.push('/teams');
        return;
      }

      // Existing redirect for signin pages
      const checkRedirect = searchParams.entries();
      checkRedirect.forEach(entry => {
        if (entry.includes('redirectTo') && pathname && pathname.startsWith('/signin')) {
          const [param, value] = entry;
          window.location.href = value;
        }
      });
    }
  }, [isLoading, user, router, pathname, searchParams, authStatus]);

  const isInvitePath = pathname ? pathname.startsWith('/accept-invite') : false;
  if (!isInvitePath && (isLoading || user)) {
    return null;
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        width: '100%',
      }}
    >
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: '100%',
          p: 3,
        }}
      >
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
