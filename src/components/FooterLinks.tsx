'use client';

import { Stack, Link } from '@mui/material';

export function FooterLinks() {
  return (
    <Stack
      direction="row"
      spacing={3}
      sx={{
        '& a': {
          color: 'text.secondary',
          textDecoration: 'none',
          typography: 'body2',
        },
      }}
    >
      <Link href="/privacy">Privacy Policy</Link>
      <Link href="/terms">Terms of Service</Link>
      <Link href="/contact">Contact</Link>
    </Stack>
  );
}
