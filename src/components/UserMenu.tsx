'use client';

import { useState } from 'react';
import { Avatar, Box, IconButton, Menu, MenuItem } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function UserMenu() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { user } = useAuth();
  const router = useRouter();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleClose();
    router.push('/user/profile');
  };

  const handleSettings = () => {
    handleClose();
    router.push('/user/settings');
  };

  const handleSignOut = () => {
    console.log('UserMenu: Redirecting to signout route');
    handleClose();
    window.location.href = '/signout';
  };

  if (!user) return null;

  return (
    <Box>
      <IconButton onClick={handleClick} size="small">
        {user.avatar_url ? (
          <Avatar src={user.avatar_url} alt={user.full_name || 'User'} />
        ) : (
          <Avatar>{user.full_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}</Avatar>
        )}
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={handleClose}
      >
        <MenuItem onClick={handleProfile}>Profile</MenuItem>
        <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
      </Menu>
    </Box>
  );
}
