'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { ChatErrorBoundary } from './ChatErrorBoundary';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useToast } from '@/contexts/ToastContext';
import { ChatCommentWithDetails } from '@/types/chat';
import CommentEditor from './CommentEditor';
import CommentDisplay from './CommentDisplay';

interface ThreadDetailProps {
  threadId: string;
  onBack?: () => void;
}

const ThreadDetail: React.FC<ThreadDetailProps> = ({ threadId, onBack }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { threadsById, comments, createComment, editComment, deleteComment, loadThreadComments } =
    useChat();
  const [newComment, setNewComment] = useState({ type: 'doc', content: [{ type: 'paragraph' }] });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<any>(null);
  const [replyToComment, setReplyToComment] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const thread = threadsById[threadId];
  const threadComments = (comments?.[threadId] || []) as ChatCommentWithDetails[];

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (!threadId || !loadThreadComments || !mounted) {
        return;
      }

      try {
        await loadThreadComments(threadId);
      } catch (error) {
        // Ignore errors during unmount
        if (mounted) {
          console.error('Error loading thread data:', error);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [threadId, loadThreadComments]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, commentId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedCommentId(commentId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCommentId(null);
  };

  const handleEdit = (comment: ChatCommentWithDetails) => {
    const content =
      typeof comment.content === 'string'
        ? {
            type: 'doc',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: comment.content }] }],
          }
        : comment.content || { type: 'doc', content: [{ type: 'paragraph' }] };
    setEditingCommentId(comment.id);
    setEditingContent(content);
    handleMenuClose();
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      handleMenuClose();
      await loadThreadComments(threadId);
      showToast('Comment deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting comment:', error);
      showToast('Failed to delete comment', 'error');
    }
  };

  const handleReply = (commentId: string) => {
    setReplyToComment(commentId);
    handleMenuClose();
  };

  const handleSaveEdit = async () => {
    if (editingCommentId && editingContent) {
      try {
        await editComment(editingCommentId, editingContent);
        setEditingCommentId(null);
        setEditingContent(null);
        await loadThreadComments(threadId);
        showToast('Comment updated successfully', 'success');
      } catch (error) {
        console.error('Error saving edit:', error);
        showToast('Failed to update comment', 'error');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent(null);
  };

  const handleComment = async () => {
    try {
      const commentData = {
        content: newComment,
        author_id: user!.id,
        ...(replyToComment && { parent_id: replyToComment }),
      };
      await createComment(threadId, commentData);
      await loadThreadComments(threadId);
      setNewComment({ type: 'doc', content: [{ type: 'paragraph' }] });
      setReplyToComment(null);
      showToast('Comment added successfully', 'success');
    } catch (error) {
      console.error('Error creating comment:', error);
      showToast('Failed to add comment', 'error');
    }
  };

  if (!thread) {
    return (
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ChatErrorBoundary>
      <Box>
        <Box display="flex" alignItems="center" p={2} borderColor="divider">
          {onBack && (
            <IconButton onClick={onBack} edge="start">
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box flexGrow={1}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {thread.title}
            </Typography>
            {thread.content && (
              <Typography variant="body1" sx={{ mb: 2 }}>
                {thread.content}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Started by{' '}
                {thread.created_by_profile?.full_name ||
                  thread.created_by_profile?.email ||
                  'Anonymous User'}{' '}
                • {thread.created_at && new Date(thread.created_at).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ p: 2 }}>
          <Typography variant="h6">Comments</Typography>
          {threadComments.map((comment: ChatCommentWithDetails) => (
            <Box key={comment.id}>
              {editingCommentId === comment.id ? (
                <CommentEditor
                  content={editingContent}
                  onChange={setEditingContent}
                  onSave={handleSaveEdit}
                  onCancel={handleCancelEdit}
                  placeholder="Edit your comment..."
                  submitLabel="Save"
                />
              ) : (
                <CommentDisplay
                  comment={comment}
                  currentUserId={user?.id}
                  onMenuOpen={(event: React.MouseEvent<HTMLButtonElement>) =>
                    handleMenuOpen(event, comment.id)
                  }
                />
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1">Add a comment</Typography>
          <CommentEditor
            content={newComment}
            onChange={setNewComment}
            onSave={handleComment}
            placeholder="Type your comment here..."
          />
        </Box>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
          <MenuItem onClick={() => selectedCommentId && handleReply(selectedCommentId)}>
            Reply
          </MenuItem>
          {selectedCommentId &&
            threadComments.find(c => c.id === selectedCommentId)?.created_by === user?.id && [
              <MenuItem
                key="edit"
                onClick={() =>
                  selectedCommentId &&
                  handleEdit(threadComments.find(c => c.id === selectedCommentId)!)
                }
              >
                Edit
              </MenuItem>,
              <MenuItem
                key="delete"
                onClick={() => selectedCommentId && handleDelete(selectedCommentId)}
              >
                Delete
              </MenuItem>,
            ]}
        </Menu>
      </Box>
    </ChatErrorBoundary>
  );
};

export default ThreadDetail;
