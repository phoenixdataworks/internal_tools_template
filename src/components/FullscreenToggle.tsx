import { useEffect, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
} from '@mui/icons-material';

interface FullscreenToggleProps {
  onFullscreenChange?: (isFullscreen: boolean) => void;
  tooltipPlacement?: 'top' | 'bottom' | 'left' | 'right';
}

export default function FullscreenToggle({
  onFullscreenChange,
  tooltipPlacement = 'bottom',
}: FullscreenToggleProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prevNavState, setPrevNavState] = useState<boolean | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const newIsFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(newIsFullscreen);
      onFullscreenChange?.(newIsFullscreen);

      if (newIsFullscreen) {
        // Store previous nav state and collapse nav
        const storedNavState = localStorage.getItem('dashboardNavExpanded');
        setPrevNavState(storedNavState === 'true');
        window.dispatchEvent(new CustomEvent('toggleNav', { detail: { collapsed: true } }));
      } else if (prevNavState !== null) {
        // Restore previous nav state
        window.dispatchEvent(
          new CustomEvent('toggleNav', { detail: { collapsed: !prevNavState } })
        );
        setPrevNavState(null);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [prevNavState, onFullscreenChange]);

  const handleFullscreenClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <Tooltip
      title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
      placement={tooltipPlacement}
    >
      <IconButton onClick={handleFullscreenClick}>
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </IconButton>
    </Tooltip>
  );
}
