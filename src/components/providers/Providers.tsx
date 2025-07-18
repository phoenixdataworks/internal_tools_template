'use client';

import { memo, useState, useEffect, ReactNode } from 'react';
import { Box } from '@mui/material';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TeamProvider } from '@/contexts/TeamContext';
import { ToastProvider } from '@/contexts/ToastContext';

import { QueryProvider } from './QueryProvider';
import { Profile } from '@/types';

// Create a ClientOnly wrapper component
const ClientOnly = ({ children }: { children: React.ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
};

// Memoize the container to prevent unnecessary re-renders
const Container = memo(({ children }: { children: React.ReactNode }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      overflow: 'hidden',
      bgcolor: 'background.default',
    }}
  >
    {children}
  </Box>
));
Container.displayName = 'Container';

interface ProvidersProps {
  children: ReactNode;
  user: Profile;
  dehydratedState?: unknown;
}

export function Providers({ children, user, dehydratedState }: ProvidersProps) {
  return (
    <ClientOnly>
      <QueryProvider dehydratedState={dehydratedState}>
        <AuthProvider initialUser={user}>
          <ThemeProvider>
            <TeamProvider>
              <ToastProvider>
                <Container>{children}</Container>
              </ToastProvider>
            </TeamProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryProvider>
    </ClientOnly>
  );
}
