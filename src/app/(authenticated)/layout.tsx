'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Box, CircularProgress } from '@mui/material';
import { DashboardNav } from '@/components/DashboardNav';
import { useAuth } from '@/contexts/AuthContext';
import useNavState from '@/hooks/useNavState';
import ChatPane from '@/components/chat/ChatPane';
import useChatState from '@/hooks/useChatState';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ChatProvider } from '@/contexts/ChatContext';

/**
 * Layout for authenticated routes
 *
 * This layout assumes the middleware has already verified authentication.
 * It only handles specific business logic redirects (like onboarding)
 * and doesn't duplicate the basic auth checks already done in middleware.
 */
export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const { expanded, setExpanded } = useNavState();
  const { chatOpen, setChatOpen } = useChatState();
  const pathname = usePathname();

  // Show loading state while initializing auth
  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <NotificationProvider>
      <ChatProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
            <DashboardNav expanded={expanded} onExpandedChange={setExpanded} />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                pt: '64px', // Account for fixed header height
                px: 3,
                pb: 3,
                overflow: 'auto',
                transition: theme =>
                  theme.transitions.create('margin', {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.leavingScreen,
                  }),
                mr: chatOpen ? { xs: 0, sm: '400px' } : 0,
              }}
            >
              {children}
            </Box>
          </Box>
          <ChatPane open={chatOpen} onClose={() => setChatOpen(false)} />
        </Box>
      </ChatProvider>
    </NotificationProvider>
  );
}
