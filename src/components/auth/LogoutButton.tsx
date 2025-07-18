'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      const supabase = createClient();

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      router.refresh();
      router.push('/');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outlined" color="error" onClick={handleLogout} disabled={isLoading}>
      {isLoading ? 'Logging out...' : 'Sign out'}
    </Button>
  );
}
