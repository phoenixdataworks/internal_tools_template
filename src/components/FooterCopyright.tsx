'use client';

import { Typography } from '@mui/material';
import { APP_NAME } from '@/lib/metadata';

// Get the current year at module initialization
const CURRENT_YEAR = new Date().getFullYear();

export function FooterCopyright() {
  return (
    <Typography variant="body2" color="text.secondary">
      © {CURRENT_YEAR} {APP_NAME}. All rights reserved.
    </Typography>
  );
}
