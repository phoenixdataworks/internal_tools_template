'use client';

import React from 'react';
import { Box } from '@mui/material';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: React.ReactNode; // Made optional since we don't use it anymore
  actions?: React.ReactNode; // Made optional since we don't use it anymore
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ flex: 1, overflow: 'auto' }}>{children}</Box>
    </Box>
  );
}
