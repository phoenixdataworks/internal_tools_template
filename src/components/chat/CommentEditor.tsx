'use client';

import React from 'react';
import { Box, Button } from '@mui/material';
import RichTextEditor from './RichTextEditor';

interface CommentEditorProps {
  content: any;
  onChange: (content: any) => void;
  onSave?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  showActions?: boolean;
}

const CommentEditor: React.FC<CommentEditorProps> = ({
  content,
  onChange,
  onSave,
  onCancel,
  placeholder = 'Type your comment here...',
  submitLabel = 'Submit',
  showActions = true,
}) => {
  return (
    <Box>
      <RichTextEditor content={content} onChange={onChange} placeholder={placeholder} />
      {showActions && (onSave || onCancel) && (
        <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
          {onSave && (
            <Button variant="contained" color="primary" onClick={onSave}>
              {submitLabel}
            </Button>
          )}
          {onCancel && (
            <Button variant="outlined" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default CommentEditor;
