'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { Close as CloseIcon, Add as AddIcon } from '@mui/icons-material';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import ThreadList from './ThreadList';
import ThreadDetail from './ThreadDetail';
import useNavState from '@/hooks/useNavState';
import useChatState from '@/hooks/useChatState';

interface ChatPaneProps {
  open: boolean;
  onClose: () => void;
}

import { ChatErrorBoundary } from './ChatErrorBoundary';

export default function ChatPane({ open, onClose }: ChatPaneProps) {
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const { createThread, activeThreadId, setActiveThread } = useChat();
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const { expanded, setExpanded, setPreviousState } = useNavState();
  const { chatOpen, setChatOpen } = useChatState();
  const [localPreviousState, setLocalPreviousState] = useState(expanded);

  // Handle nav state when chat opens/closes
  useEffect(() => {
    if (chatOpen) {
      // Save current nav state before closing
      setLocalPreviousState(expanded);
      // Close nav pane
      setExpanded(false);
    } else {
      // Restore nav state when chat closes
      setExpanded(localPreviousState);
    }
  }, [chatOpen]); // Only run when chat opens/closes

  // Sync open prop with chatOpen state
  useEffect(() => {
    setChatOpen(open);
  }, [open, setChatOpen]);

  const handleCreateThread = async () => {
    try {
      const thread = await createThread(newThreadTitle, '');
      setActiveThread(thread.id);
      setNewThreadTitle('');
      setIsNewThreadDialogOpen(false);
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={chatOpen}
        onClose={() => {
          onClose();
          setChatOpen(false);
        }}
        variant="persistent"
        hideBackdrop
        sx={{
          '& .MuiDrawer-paper': {
            width: { xs: '100%', sm: 400 },
            maxWidth: '100%',
            position: 'fixed',
            height: '100%',
            border: 'none',
            boxShadow: 2,
            bgcolor: 'background.paper',
          },
          '& .MuiBackdrop-root': {
            display: 'none',
          },
        }}
        data-testid="chat-drawer"
      >
        {chatOpen && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box
              sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Typography variant="h6">Threads</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <ChatErrorBoundary>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setIsNewThreadDialogOpen(true)}
                    variant="contained"
                    size="small"
                  >
                    New Thread
                  </Button>
                  <IconButton onClick={onClose} size="small" aria-label="Close chat">
                    <CloseIcon />
                  </IconButton>
                </ChatErrorBoundary>
              </Box>
            </Box>
            <Divider />
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                bgcolor: 'background.default',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box
                sx={{
                  flexGrow: 1,
                  overflow: 'hidden',
                  height: '100%',
                }}
              >
                <ChatErrorBoundary>
                  {activeThreadId ? (
                    <ThreadDetail threadId={activeThreadId} onBack={() => setActiveThread(null)} />
                  ) : (
                    <ThreadList onThreadSelect={setActiveThread} />
                  )}
                </ChatErrorBoundary>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* Only render dialog when needed */}
      {isNewThreadDialogOpen && (
        <Dialog
          open={isNewThreadDialogOpen}
          onClose={() => setIsNewThreadDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>New Thread</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Thread Title"
              fullWidth
              value={newThreadTitle}
              onChange={e => setNewThreadTitle(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsNewThreadDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreateThread}
              variant="contained"
              disabled={!newThreadTitle.trim()}
            >
              Create
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
