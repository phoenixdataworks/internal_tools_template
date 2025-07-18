'use client';

import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Box, IconButton, Tooltip } from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatListBulleted,
  FormatListNumbered,
  Code,
} from '@mui/icons-material';

interface RichTextEditorProps {
  content: any;
  onChange?: (content: any) => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  readOnly = false,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editable: !disabled && !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none',
      },
    },
    immediatelyRender: false,
  });

  // Update content when it changes externally
  useEffect(() => {
    if (editor && content) {
      // Only update if content has changed
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor || !isMounted) {
    return null;
  }

  const ToolbarButton = ({
    title,
    icon,
    command,
  }: {
    title: string;
    icon: React.ReactNode;
    command: () => void;
  }) => (
    <Tooltip title={title}>
      <IconButton
        size="small"
        onClick={command}
        color={editor.isActive(title.toLowerCase()) ? 'primary' : 'default'}
        aria-label={title}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );

  return (
    <Box>
      {!readOnly && (
        <Box sx={{ mb: 1, display: 'flex', gap: 0.5 }}>
          <ToolbarButton
            title="Bold"
            icon={<FormatBold fontSize="small" />}
            command={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            title="Italic"
            icon={<FormatItalic fontSize="small" />}
            command={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            title="Bullet List"
            icon={<FormatListBulleted fontSize="small" />}
            command={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            title="Numbered List"
            icon={<FormatListNumbered fontSize="small" />}
            command={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            title="Code"
            icon={<Code fontSize="small" />}
            command={() => editor.chain().focus().toggleCode().run()}
          />
        </Box>
      )}
      <Box
        sx={{
          border: readOnly ? 0 : 1,
          borderColor: 'divider',
          borderRadius: 1,
          p: readOnly ? 0 : 1,
          minHeight: readOnly ? 'auto' : 100,
          '& .ProseMirror': {
            outline: 'none',
            height: '100%',
            p: readOnly ? 0 : 1,
          },
          '& .ProseMirror p:first-of-type:empty::before': {
            content: `"${placeholder}"`,
            float: 'left',
            color: 'text.disabled',
            pointerEvents: 'none',
            height: 0,
          },
          '& .ProseMirror p': {
            m: 0,
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default RichTextEditor;
