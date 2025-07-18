'use client';

import React, { Component, ReactNode } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Chat Error:', error, errorInfo);
    // Add error logging service integration here
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <ErrorOutline color="error" sx={{ fontSize: 48 }} />
          <Typography variant="h6">Something went wrong in the chat interface</Typography>
          <Button variant="contained" onClick={() => this.setState({ hasError: false })}>
            Try Again
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}
