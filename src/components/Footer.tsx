'use client';

import { Box, Container, Link, Typography } from '@mui/material';
import { useTheme } from '@/contexts/ThemeContext';
import { APP_NAME } from '@/lib/metadata';

export function Footer() {
  const { mode } = useTheme();
  const currentYear = new Date().getFullYear();

  return (
    <Box
      component="footer"
      sx={{
        py: 1,
        bgcolor: mode === 'light' ? 'grey.100' : 'grey.900',
        color: mode === 'light' ? 'grey.700' : 'grey.300',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="body2">
            © {currentYear} {APP_NAME}. All rights reserved.
          </Typography>
          <Box>
            <Link href="/privacy" color="inherit" sx={{ mr: 2, fontSize: '0.875rem' }}>
              Privacy Policy
            </Link>
            <Link href="/terms" color="inherit" sx={{ mr: 2, fontSize: '0.875rem' }}>
              Terms of Service
            </Link>
            <Link href="/contact" color="inherit" sx={{ fontSize: '0.875rem' }}>
              Contact
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
