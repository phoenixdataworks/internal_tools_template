'use client';

import { IconButton, Badge } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { useChat } from '@/contexts/ChatContext';

interface ChatMenuProps {
  onOpenChat: () => void;
}

export default function ChatMenu({ onOpenChat }: ChatMenuProps) {
  const { threads } = useChat();

  const unreadCount =
    threads?.reduce((count, thread) => count + (thread.unread_count || 0), 0) || 0;

  return (
    <IconButton size="large" color="inherit" onClick={onOpenChat}>
      <Badge badgeContent={unreadCount} color="error">
        <ChatIcon />
      </Badge>
    </IconButton>
  );
}
