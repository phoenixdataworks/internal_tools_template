'use client';

import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import ThreadList from '@/components/chat/ThreadList';
import ThreadDetail from '@/components/chat/ThreadDetail';
import { ChatErrorBoundary } from '@/components/chat/ChatErrorBoundary';

export default function ChatPage() {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const { createThread } = useChat();
  const { user } = useAuth();

  const handleCreateThread = async () => {
    try {
      const thread = await createThread('New Thread', '');
      setActiveThreadId(thread.id);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" component="h1">
          Chat
        </Typography>
        <Button
          startIcon={<AddIcon />}
          onClick={handleCreateThread}
          variant="contained"
          size="small"
        >
          New Thread
        </Button>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <ChatErrorBoundary>
          {activeThreadId ? (
            <ThreadDetail threadId={activeThreadId} onBack={() => setActiveThreadId(null)} />
          ) : (
            <ThreadList onThreadSelect={setActiveThreadId} />
          )}
        </ChatErrorBoundary>
      </Box>
    </Box>
  );
}
