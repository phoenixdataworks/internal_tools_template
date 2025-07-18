'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@mui/material';

interface LoginButtonProps {
  provider?: 'google' | 'github';
  redirectTo?: string;
}

export default function ClientLoginButton({
  provider = 'google',
  redirectTo = '/dashboard',
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error logging in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="contained" onClick={handleLogin} disabled={isLoading}>
      {isLoading
        ? 'Loading...'
        : `Sign in with ${provider.charAt(0).toUpperCase() + provider.slice(1)}`}
    </Button>
  );
}
