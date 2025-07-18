'use client';

import { useState } from 'react';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  ChevronRight as ChevronRightIcon,
  Settings as SettingsIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { DarkModeToggle } from './DarkModeToggle';
import FullscreenToggle from './FullscreenToggle';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import { useTheme as useCustomTheme } from '@/contexts/ThemeContext';
import { UserMenu } from '@/components/UserMenu';
import useChatState from '@/hooks/useChatState';

const drawerWidth = 220;
const collapsedDrawerWidth = 64;

interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
}

interface DashboardNavProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}

const navItems: NavItem[] = [{ title: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> }];

const settingsItem: NavItem = {
  title: 'Settings',
  path: '/settings',
  icon: <SettingsIcon />,
};

export function DashboardNav({ expanded, onExpandedChange }: DashboardNavProps) {
  const [open, setOpen] = useState(false);
  const [squareLogoError, setSquareLogoError] = useState(false);
  const [wideLogoError, setWideLogoError] = useState(false);
  const theme = useTheme();
  const { mode } = useCustomTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const { chatOpen, setChatOpen } = useChatState();

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentItem = navItems.find(item => item.path === pathname);
    if (currentItem) return currentItem.title;

    if (pathname === settingsItem.path) return settingsItem.title;

    // Handle other routes
    if (pathname.startsWith('/user/profile')) return 'Profile Settings';
    if (pathname.startsWith('/user/settings')) return 'Settings';
    if (pathname.startsWith('/settings')) return 'Settings';

    return 'Dashboard';
  };

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleExpandToggle = () => {
    onExpandedChange(!expanded);
  };

  const handleNavClick = (path: string) => {
    router.push(path);
    if (!isDesktop) {
      setOpen(false);
    }
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          minHeight: 64,
          p: 0,
          '&.MuiToolbar-gutters': {
            p: 0,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            overflow: 'hidden',
            ml: '10px',
          }}
        >
          {/* Square Logo - Shown when collapsed */}
          {!expanded && !squareLogoError && (
            <Link href="/dashboard" style={{ display: 'block' }}>
              <Box
                sx={{
                  position: 'relative',
                  width: 44,
                  height: 44,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={mode === 'dark' ? '/logo-square-dark.png' : '/logo-square.png'}
                  alt="Internal Tools"
                  fill
                  sizes="44px"
                  style={{ objectFit: 'contain' }}
                  onError={() => setSquareLogoError(true)}
                />
              </Box>
            </Link>
          )}

          {/* Wide Logo - Shown when expanded */}
          {expanded && !wideLogoError && (
            <Link href="/dashboard" style={{ display: 'block' }}>
              <Box
                sx={{
                  position: 'relative',
                  height: 40,
                  width: 160,
                  opacity: expanded ? 1 : 0,
                  transition: theme.transitions.create(['opacity', 'width'], {
                    easing: theme.transitions.easing.sharp,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={mode === 'dark' ? '/logo-wide-dark.png' : '/logo-wide.png'}
                  alt="Internal Tools"
                  fill
                  sizes="160px"
                  style={{ objectFit: 'contain' }}
                  priority
                  onError={() => setWideLogoError(true)}
                />
              </Box>
            </Link>
          )}

          {/* Text Fallback */}
          {((expanded && wideLogoError) || (!expanded && squareLogoError)) && (
            <Link
              href="/dashboard"
              style={{
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  opacity: expanded ? 1 : 0,
                  width: expanded ? 'auto' : 0,
                  transition: theme.transitions.create(['opacity', 'width']),
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                Internal Tools
              </Typography>
            </Link>
          )}
        </Box>
        {!isDesktop && (
          <IconButton onClick={handleDrawerToggle} sx={{ mr: 1 }}>
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <List sx={{ flexGrow: 1, px: '10px' }}>
        {navItems.map(item => (
          <ListItem key={item.path} disablePadding>
            <Tooltip title={expanded ? '' : item.title} placement="right">
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  minHeight: 48,
                  justifyContent: expanded ? 'initial' : 'center',
                  px: 2.5,
                  borderRadius: 1,
                  mb: 0.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: expanded ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  sx={{
                    opacity: expanded ? 1 : 0,
                    transition: theme.transitions.create(['opacity']),
                  }}
                />
              </ListItemButton>
            </Tooltip>
          </ListItem>
        ))}
      </List>

      {/* Settings at bottom */}
      <List sx={{ px: '10px', mt: 'auto' }}>
        <ListItem disablePadding>
          <Tooltip title={expanded ? '' : settingsItem.title} placement="right">
            <ListItemButton
              selected={pathname === settingsItem.path}
              onClick={() => handleNavClick(settingsItem.path)}
              sx={{
                minHeight: 48,
                justifyContent: expanded ? 'initial' : 'center',
                px: 2.5,
                borderRadius: 1,
                mb: 0.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: expanded ? 3 : 'auto',
                  justifyContent: 'center',
                }}
              >
                {settingsItem.icon}
              </ListItemIcon>
              <ListItemText
                primary={settingsItem.title}
                sx={{
                  opacity: expanded ? 1 : 0,
                  transition: theme.transitions.create(['opacity']),
                }}
              />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <Drawer
        variant="permanent"
        sx={{
          width: expanded ? drawerWidth : collapsedDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: expanded ? drawerWidth : collapsedDrawerWidth,
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={open}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Top toolbar */}
      <Box
        component="nav"
        sx={{
          position: 'fixed',
          top: 0,
          left: { xs: 0, sm: expanded ? drawerWidth : collapsedDrawerWidth },
          right: chatOpen ? { xs: 0, sm: '400px' } : 0,
          zIndex: theme.zIndex.appBar,
          transition: theme.transitions.create(['left', 'right'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="expand drawer"
              edge="start"
              onClick={handleExpandToggle}
              sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}
            >
              {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
            </IconButton>
            <Typography variant="h6" component="h1" sx={{ ml: 1 }}>
              {getCurrentPageTitle()}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotificationCenter />
            <DarkModeToggle />
            <FullscreenToggle />
            <Tooltip title="Open Chat">
              <IconButton onClick={() => setChatOpen(true)}>
                <ChatIcon />
              </IconButton>
            </Tooltip>
            <UserMenu />
          </Box>
        </Toolbar>
      </Box>
    </>
  );
}
