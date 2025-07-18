import { IconButton, Tooltip } from '@mui/material';
import { DarkMode as DarkIcon, LightMode as LightIcon } from '@mui/icons-material';
import { useTheme } from '@/contexts/ThemeContext';

export function DarkModeToggle() {
  const { mode, toggleTheme } = useTheme();

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <IconButton onClick={toggleTheme} color="inherit">
        {mode === 'light' ? <DarkIcon /> : <LightIcon />}
      </IconButton>
    </Tooltip>
  );
}
