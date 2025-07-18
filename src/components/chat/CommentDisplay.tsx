'use client';

import React from 'react';
import { Box, Typography, IconButton, Paper } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { ChatCommentWithDetails } from '@/types/chat';
import RichTextEditor from './RichTextEditor';

interface CommentDisplayProps {
  comment: ChatCommentWithDetails;
  currentUserId?: string;
  onMenuOpen?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const CommentDisplay: React.FC<CommentDisplayProps> = ({ comment, currentUserId, onMenuOpen }) => {
  const isCurrentUser = currentUserId && comment.created_by === currentUserId;

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2,
        p: 2,
        bgcolor: isCurrentUser ? 'action.hover' : 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 1,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {comment.created_by_profile?.full_name ||
              comment.created_by_profile?.email ||
              'Anonymous User'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {comment.created_at && new Date(comment.created_at).toLocaleString()}
          </Typography>
        </Box>
        {isCurrentUser && onMenuOpen && (
          <IconButton size="small" onClick={onMenuOpen} sx={{ ml: 1 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Box sx={{ mt: 1 }}>
        <RichTextEditor content={comment.content} readOnly />
      </Box>
    </Paper>
  );
};

export default CommentDisplay;
