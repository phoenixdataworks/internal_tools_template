import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import FullscreenToggle from '@/components/FullscreenToggle';
import ChatIcon from '@mui/icons-material/Chat';
import useChatState from '@/hooks/useChatState';

interface AuthHeaderProps {
  title: React.ReactNode;
  actions?: React.ReactNode;
}

export function AuthHeader({ title, actions }: AuthHeaderProps) {
  const { setChatOpen } = useChatState();

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box>{typeof title === 'string' ? <Typography variant="h4">{title}</Typography> : title}</Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {actions}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FullscreenToggle />
          <Tooltip title="Open Chat">
            <IconButton onClick={() => setChatOpen(true)}>
              <ChatIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
