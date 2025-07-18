'use client';

import { Box, Container, Typography, Button } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorMessage =
    searchParams?.get('message') ?? 'We encountered an error while processing your request.';

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1">
          Oops! Something went wrong
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {errorMessage}
        </Typography>
        <Button variant="contained" onClick={() => router.push('/signin')}>
          Return to Sign In
        </Button>
      </Box>
    </Container>
  );
}
