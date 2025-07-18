'use client';

import React from 'react';
import { useState } from 'react';
import {
  ListItemIcon,
  Typography,
  Box,
  Chip,
  MenuItem,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PushPin as PushPinIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  ExpandMore as ExpandMoreIcon,
  ChatBubbleOutline,
} from '@mui/icons-material';
import { useChat } from '@/contexts/ChatContext';
import { ChatThreadWithDetails } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/contexts/ToastContext';

interface ThreadActionsProps {
  thread: ChatThreadWithDetails;
  onClose: () => void;
}

function ThreadActions({ thread, onClose }: ThreadActionsProps) {
  const { updateThread, deleteThread } = useChat();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: () => Promise<void>) => {
    try {
      setIsLoading(true);
      await action();
      onClose();
    } catch (error) {
      showToast?.('Failed to perform action', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ minWidth: 200 }}>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          <MenuItem
            onClick={() =>
              handleAction(async () => {
                await updateThread(thread.id, { pinned: !thread.pinned });
              })
            }
          >
            <ListItemIcon>
              <PushPinIcon />
            </ListItemIcon>
            {thread.pinned ? 'Unpin' : 'Pin'}
          </MenuItem>

          <MenuItem
            onClick={() =>
              handleAction(async () => {
                await updateThread(thread.id, { status: 'archived' });
              })
            }
          >
            <ListItemIcon>
              <ArchiveIcon />
            </ListItemIcon>
            Archive
          </MenuItem>
          <MenuItem
            onClick={() =>
              handleAction(async () => {
                await deleteThread(thread.id);
              })
            }
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon sx={{ color: 'error.main' }}>
              <DeleteIcon />
            </ListItemIcon>
            Delete
          </MenuItem>
        </>
      )}
    </Box>
  );
}

interface NewThreadDialogProps {
  open: boolean;
  onClose: () => void;
}

function NewThreadDialog({ open, onClose }: NewThreadDialogProps) {
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createThread } = useChat();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsLoading(true);
      await createThread(title, '');
      onClose();
      showToast?.('Thread created successfully', 'success');
    } catch (error) {
      showToast?.('Failed to create thread', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>New Thread</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Thread Title"
            fullWidth
            value={title}
            onChange={e => setTitle(e.target.value)}
            disabled={isLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading || !title.trim()}>
            {isLoading ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

interface ThreadListProps {
  onThreadSelect: (threadId: string) => void;
}

export default function ThreadList({ onThreadSelect }: ThreadListProps) {
  const { threads, activeThreadId, setActiveThread, isLoading } = useChat();
  const [showResolved, setShowResolved] = useState(false);

  // Separate active and resolved threads
  const activeThreads = threads
    .filter(thread => thread.status === 'open')
    .sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || 0);
      const dateB = new Date(b.updated_at || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

  const resolvedThreads = threads
    .filter(thread => thread.status === 'resolved')
    .sort((a, b) => {
      const dateA = new Date(a.resolved_at || a.created_at || 0);
      const dateB = new Date(b.resolved_at || b.created_at || 0);
      return dateB.getTime() - dateA.getTime();
    });

  if (isLoading) {
    return <ThreadListSkeleton />;
  }

  const ThreadItem = ({ thread }: { thread: ChatThreadWithDetails }) => (
    <Box
      onClick={() => handleThreadClick(thread)}
      sx={{
        p: 2,
        cursor: 'pointer',
        '&:hover': {
          bgcolor: 'action.hover',
        },
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        borderRadius: 1,
        mb: 1,
        opacity: thread.status === 'resolved' ? 0.6 : 1,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      <ChatBubbleOutline sx={{ mt: 0.5 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="subtitle1" noWrap>
          {thread.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {thread.created_by_profile?.full_name} •{' '}
          {formatDistanceToNow(new Date(thread.created_at || ''), { addSuffix: true })}
        </Typography>
      </Box>
      {(thread.unread_count ?? 0) > 0 && (
        <Chip size="small" color="primary" label={thread.unread_count} />
      )}
    </Box>
  );

  const handleThreadClick = (thread: ChatThreadWithDetails) => {
    setActiveThread(thread.id);
    onThreadSelect(thread.id);
  };

  return (
    <Box
      sx={{
        height: '100%',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Active Threads Section */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ px: 2, py: 1 }}>
          Active Threads
        </Typography>
        {activeThreads.map(thread => (
          <ThreadItem key={thread.id} thread={thread} />
        ))}
        {activeThreads.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
            No active threads
          </Typography>
        )}
      </Box>

      {/* Resolved Threads Section */}
      {resolvedThreads.length > 0 && (
        <Accordion
          expanded={showResolved}
          onChange={() => setShowResolved(!showResolved)}
          sx={{
            bgcolor: 'transparent',
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
            <Typography variant="h6">Resolved Threads ({resolvedThreads.length})</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
            {resolvedThreads.map(thread => (
              <ThreadItem key={thread.id} thread={thread} />
            ))}
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

function ThreadListSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      <CircularProgress />
    </Box>
  );
}
