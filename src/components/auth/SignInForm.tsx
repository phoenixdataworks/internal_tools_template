'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
  Alert,
  AlertColor,
} from '@mui/material';
import { useToast } from '@/contexts/ToastContext';
import authService from '@/services/authService';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

export default function SignInForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const email = searchParams?.get('email');
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: email || '',
    },
  });

  // Pre-fill and disable email if provided
  useEffect(() => {
    if (email) {
      setValue('email', email);
    }
  }, [email, setValue]);

  // Move error handling to useEffect
  useEffect(() => {
    const error = searchParams?.get('error') ?? null;
    if (error) {
      showToast?.(error, 'error' as AlertColor);
    }
  }, [searchParams, showToast]);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: authData, error } = await authService.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) throw error;

      // If sign-in successful, redirect to dashboard or redirectTo URL
      router.push(searchParams?.get('redirectTo') || '/dashboard');
    } catch (error: any) {
      console.error('[Auth] Sign-in error:', error);
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          showToast?.('Email not verified', 'error' as AlertColor);
        } else if (error.message.includes('Invalid signin credentials')) {
          showToast?.('Invalid email or password.', 'error' as AlertColor);
        } else {
          showToast?.(error.message, 'error' as AlertColor);
        }
      } else if (typeof error === 'object' && error !== null && 'error' in error) {
        const supabaseError = error as { error: { message: string } };
        if (supabaseError.error.message.toLowerCase().includes('email not confirmed')) {
          showToast?.('Email not verified', 'error' as AlertColor);
        } else {
          showToast?.(supabaseError.error.message, 'error' as AlertColor);
        }
      } else {
        showToast?.('An error occurred during sign in.', 'error' as AlertColor);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    try {
      setIsLoading(true);
      const redirectTo = searchParams?.get('redirectTo');

      // Use the authService for OAuth sign-in
      const redirectUrl = `${window.location.origin}/auth/callback?provider=${provider}${
        redirectTo ? `&redirectTo=${encodeURIComponent(redirectTo)}` : ''
      }`;

      const { data, error } = await authService.signInWithOAuth(provider, redirectUrl);

      if (error) throw error;

      // Store OAuth state in sessionStorage
      sessionStorage.setItem(
        'oauth_state',
        JSON.stringify({
          provider,
          timestamp: Date.now(),
          redirectTo: redirectTo || '/dashboard',
        })
      );

      // Redirect to the OAuth provider's authorization URL
      if (data?.url) {
        window.location.href = data.url;
        return;
      }

      // If we have data.provider and data.url in a nested structure
      if (data?.provider && data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (error) {
      setIsLoading(false);
      console.error(`${provider} sign-in error:`, error);
      showToast?.(`Error signing in with ${provider}`, 'error' as AlertColor);
    }
  };

  const handleSignUpClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    router.push('/signup');
  };

  const handleResetPasswordClick = () => {
    router.push('/reset-password');
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Typography component="h1" variant="h5">
        Sign In
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        autoComplete="on"
        sx={{ mt: 3, width: '100%' }}
      >
        <Stack spacing={2}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <TextField
            {...register('email')}
            label="Email Address"
            type="email"
            autoComplete="email"
            autoFocus={!email}
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            required
            sx={{
              '& .MuiInputBase-input': {
                color: 'text.primary',
              },
            }}
            slotProps={{
              htmlInput: {
                autoCapitalize: 'none',
                readOnly: !!email,
              },

              inputLabel: { shrink: true },
            }}
          />
          <TextField
            {...register('password')}
            label="Password"
            type="password"
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password?.message}
            fullWidth
            required
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />
          <Button type="submit" fullWidth variant="contained" disabled={isLoading}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Link component="button" variant="body2" onClick={handleSignUpClick}>
              Don't have an account? Sign up
            </Link>
            <Link component="button" variant="body2" onClick={handleResetPasswordClick}>
              Forgot password?
            </Link>
          </Stack>
          <Divider>or</Divider>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => handleOAuthSignIn('azure')}
            disabled={isLoading}
          >
            Sign in with Azure AD
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
          >
            Sign in with Google
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
