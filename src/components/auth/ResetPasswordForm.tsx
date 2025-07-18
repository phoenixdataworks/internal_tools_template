'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert, AlertTitle, Box, Link, Stack, TextField, Typography, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import authService from '@/services/authService';

const schema = z.object({
  email: z.string().email('Invalid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState('');
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsLoading(true);
      setError('');

      const { error } = await authService.resetPassword(data.email);

      if (error) throw error;

      setSuccess(true);
      setEmailSent(data.email);
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
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
          <AlertTitle>Reset email sent!</AlertTitle>
          Password reset instructions have been sent to <strong>{emailSent}</strong>
        </Alert>
        <Typography
          variant="body1"
          sx={{
            marginBottom: '16px',
          }}
        >
          Please check your email and follow the link to reset your password.
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
      <Typography component="h1" variant="h5">
        Reset Password
      </Typography>
      <Typography variant="body2" sx={{ mt: 1, mb: 3 }}>
        Enter your email address and we'll send you instructions to reset your password.
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ width: '100%' }}>
        <Stack spacing={2}>
          <TextField
            {...register('email')}
            label="Email Address"
            autoComplete="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            required
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" fullWidth variant="contained" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Instructions'}
          </Button>
          <Link component="button" variant="body2" onClick={handleSignInClick}>
            Back to Sign In
          </Link>
        </Stack>
      </Box>
    </Box>
  );
}
