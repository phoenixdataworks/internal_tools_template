'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, AlertTitle, Box, Button, Divider, Link, Stack, Typography } from '@mui/material';
import { Google as GoogleIcon, Info as InfoIcon } from '@mui/icons-material';
import { FormInput } from '../common/FormInput';
import authService from '@/services/authService';

const signupSchema = z
  .object({
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'Password must include uppercase, lowercase, number and special character'
      ),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignUpForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState('');
  const [inviteDetails, setInviteDetails] = useState<{ teamName: string; email: string } | null>(
    null
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();

  // Check if user is already authenticated and has an invite token
  useEffect(() => {
    if (isAuthLoading) return; // Wait for auth to initialize

    if (user) {
      console.log('[SignUpForm] User already authenticated:', user.id);
      const inviteToken = searchParams?.get('invite_token');

      if (inviteToken) {
        console.log('[SignUpForm] Found invite token, redirecting to teams page');
        router.push('/teams');
      }
    }
  }, [user, isAuthLoading, searchParams, router]);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  useEffect(() => {
    const fetchInviteDetails = async () => {
      // Check URL first, then localStorage
      const params = new URLSearchParams(window.location.search);
      const token =
        params.get('token') ||
        params.get('invite_token') ||
        localStorage.getItem('pendingInviteToken');
      if (!token) return;

      try {
        const response = await fetch(`/api/teams/check-invite?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          console.error('Error fetching invite:', data.error);
          localStorage.removeItem('pendingInviteToken');
          return;
        }

        // Store token in localStorage for later
        localStorage.setItem('pendingInviteToken', token);

        setInviteDetails({
          teamName: data.teamName || 'Unknown Team',
          email: data.email,
        });

        // Pre-fill and lock the email field
        setValue('email', data.email);
      } catch (error) {
        console.error('Error fetching invite details:', error);
      }
    };

    fetchInviteDetails();
  }, [setValue]);

  const handleOAuthSignIn = async (provider: 'google' | 'azure') => {
    try {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/dashboard';
      const inviteToken = params.get('invite_token');

      const { error } = await authService.signInWithOAuth(
        provider,
        `${window.location.origin}/auth/callback?${new URLSearchParams({
          redirectTo: redirectTo,
          ...(inviteToken ? { invite_token: inviteToken } : {}),
        })}`
      );

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error(`${provider} sign in error:`, error);
      setError(
        error instanceof Error ? error.message : `An error occurred signing in with ${provider}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SignupFormData) => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess(false);

      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get('redirectTo') || '/dashboard';
      const inviteToken = params.get('invite_token');

      const { error } = await authService.signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        redirectTo: redirectTo,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
      setEmailSent(data.email);
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during signup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInClick = () => {
    router.push('/signin');
  };

  if (success) {
    return (
      <Box>
        <Alert severity="success" sx={{ mb: 2 }}>
          <AlertTitle>Sign up successful!</AlertTitle>A confirmation email has been sent to{' '}
          <strong>{emailSent}</strong>
        </Alert>
        <Typography
          variant="body1"
          sx={{
            marginBottom: '16px',
          }}
        >
          Please check your email and click the confirmation link to verify your account.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          If you don't see the email, please check your spam folder.
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Link component="button" variant="body2" onClick={handleSignInClick}>
            Return to Sign In
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 3, width: '100%', maxWidth: 400 }} role="alert">
          {error}
        </Alert>
      )}
      {inviteDetails && (
        <Alert
          severity="info"
          icon={<InfoIcon />}
          role="alert"
          sx={{
            mb: 3,
            width: '100%',
            maxWidth: 400,
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <AlertTitle>Team Invitation</AlertTitle>
          You've been invited to join <strong>{inviteDetails.teamName}</strong>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" component="span">
              Please sign up using{' '}
            </Typography>
            <Typography variant="body2" component="span" sx={{ fontWeight: 'bold' }}>
              {inviteDetails.email}
            </Typography>
            <Typography variant="body2" component="span">
              {' '}
              to accept the invitation.
            </Typography>
          </Box>
        </Alert>
      )}
      <Typography component="h1" variant="h5">
        Sign Up
      </Typography>
      <Box sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
        <Stack spacing={2}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<GoogleIcon />}
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
          >
            Sign up with Google
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => handleOAuthSignIn('azure')}
            disabled={isLoading}
          >
            Sign up with Azure AD
          </Button>
          <Divider>or</Divider>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="off">
            <Stack spacing={2}>
              <FormInput
                {...register('firstName')}
                label="First Name"
                autoComplete="given-name"
                InputLabelProps={{ shrink: true }}
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
                fullWidth
              />
              <FormInput
                {...register('lastName')}
                label="Last Name"
                autoComplete="family-name"
                InputLabelProps={{ shrink: true }}
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
                fullWidth
              />
              <FormInput
                {...register('email')}
                label="Email Address"
                type="email"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  autoCapitalize: 'none',
                  readOnly: !!inviteDetails,
                }}
                sx={{
                  '& .MuiInputBase-input': {
                    color: 'text.primary',
                  },
                }}
              />
              <FormInput
                {...register('password')}
                label="Password"
                type="password"
                autoComplete="new-password"
                InputLabelProps={{ shrink: true }}
                error={!!errors.password}
                helperText={errors.password?.message}
                fullWidth
              />
              <FormInput
                {...register('confirmPassword')}
                label="Confirm Password"
                type="password"
                autoComplete="new-password"
                InputLabelProps={{ shrink: true }}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword?.message}
                fullWidth
              />
              <Button type="submit" fullWidth variant="contained" disabled={isLoading}>
                {isLoading ? 'Signing Up...' : 'Sign Up'}
              </Button>
              <Link component="button" variant="body2" onClick={handleSignInClick}>
                Already have an account? Sign in
              </Link>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
