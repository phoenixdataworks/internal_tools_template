'use client';

import { useAuth } from '@/contexts/AuthContext';
import { CircularProgress, Typography } from '@mui/material';
import { Box } from '@mui/system';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

const LOADING_TIMEOUT = 3000; // 3 seconds timeout
const LOADING_DELAY = 200; // 200ms delay before showing loading state
const PUBLIC_ROUTES = [
  '/signin',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

export function AuthLoadingBoundary({ children }: { children: React.ReactNode }) {
  const { isLoading, error, isInitialized, authState } = useAuth();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const pathname = usePathname();
  const loadingTimer = useRef<ReturnType<typeof setTimeout>>(null!);
  const timeoutTimer = useRef<ReturnType<typeof setTimeout>>(null!);

  useEffect(() => {
    // Clear any existing timers
    if (loadingTimer.current) clearTimeout(loadingTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);

    // Check if we're in a loading state
    const isAuthLoading =
      authState === 'initializing' || authState === 'loading-profile' || isLoading;

    if (isAuthLoading) {
      console.log(`Auth loading started (state: ${authState})`);
      // Delay showing the loading state to prevent flash
      loadingTimer.current = setTimeout(() => {
        setShowLoading(true);
        // Start timeout timer only after loading state is shown
        timeoutTimer.current = setTimeout(() => {
          console.log('Auth loading timed out');
          setHasTimedOut(true);
        }, LOADING_TIMEOUT);
      }, LOADING_DELAY);
    } else {
      console.log(`Auth loading complete (state: ${authState})`);
      setShowLoading(false);
      setHasTimedOut(false);
    }

    return () => {
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    };
  }, [isLoading, authState]);

  // Don't show loading state for public routes
  if (pathname && PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  if (error) {
    console.error('Auth error:', error);
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          gap: 2,
          p: 2,
        }}
      >
        <Typography color="error" variant="h6">
          Authentication Error
        </Typography>
        <Typography variant="body2" align="center" maxWidth="sm">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center">
          Please try refreshing the page or logging in again.
        </Typography>
      </Box>
    );
  }

  // Check if we're in an OAuth flow
  const isOAuthFlow = typeof window !== 'undefined' && !!sessionStorage.getItem('oauth_state');

  // Show loading state if we're initializing or loading profile and the delay has passed
  if (
    ((authState === 'initializing' ||
      authState === 'loading-profile' ||
      !isInitialized ||
      isLoading) &&
      showLoading) ||
    isOAuthFlow
  ) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
          gap: 2,
          p: 2,
        }}
      >
        <CircularProgress size={40} />
        {hasTimedOut && (
          <>
            <Typography variant="body2" color="text.secondary" align="center">
              Taking longer than usual...
            </Typography>
            <Typography variant="caption" color="text.secondary" align="center">
              Please check your connection and try refreshing the page.
            </Typography>
          </>
        )}
      </Box>
    );
  }

  return <>{children}</>;
}
