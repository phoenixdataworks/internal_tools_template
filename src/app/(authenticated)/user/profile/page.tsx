'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Box,
  Button,
  Container,
  Grid,
  TextField,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { updateUser, UserUpdateData } from '@/services/userService';
import { createClient } from '@/lib/supabase/client';
import PageLayout from '@/components/layouts/PageLayout';
import { User } from '@supabase/supabase-js';
import { useTeam } from '@/contexts/TeamContext';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(6, 'Password must be at least 6 characters'),
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine(data => data.new_password === data.confirm_password, {
    message: "Passwords don't match",
    path: ['confirm_password'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState(false);
  const [expanded, setExpanded] = useState<string | false>('personal');
  const supabase = createClient();
  const { teams, currentTeam, setCurrentTeam, isLoading: teamsLoading } = useTeam();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAuthUser(data.user);
      }
    });
  }, []);

  // Check if user is using password auth (not OAuth)
  const isPasswordAuth =
    !authUser?.app_metadata?.provider || authUser?.app_metadata?.provider === 'email';

  const {
    register,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: authUser?.user_metadata?.full_name || '',
      email: authUser?.email || '',
    },
  });

  // Watch form values for controlled inputs
  const fullName = watch('full_name');
  const email = watch('email');

  // Load user data when available
  useEffect(() => {
    if (authUser) {
      resetProfile({
        full_name: authUser.user_metadata?.full_name || '',
        email: authUser.email || '',
      });
    }
  }, [authUser, resetProfile]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(false);

      if (!authUser?.id) {
        throw new Error('User not found');
      }

      const updates: UserUpdateData = {
        full_name: data.full_name,
        metadata: {
          full_name: data.full_name,
        },
      };

      await updateUser(authUser.id, updates);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsLoading(true);
      setPasswordError(null);
      setPasswordSuccess(false);

      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      resetPassword();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccordionChange =
    (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
      setExpanded(isExpanded ? panel : false);
    };

  const handleTeamChange = async (teamId: string) => {
    try {
      setTeamError(null);
      setTeamSuccess(false);

      const selectedTeam = teams.find(team => team.id === teamId);
      if (!selectedTeam) {
        throw new Error('Selected team not found');
      }

      setCurrentTeam(selectedTeam);
      setTeamSuccess(true);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : 'Failed to change team');
    }
  };

  return (
    <Container maxWidth="lg">
      <PageLayout>
        <Accordion
          expanded={expanded === 'personal'}
          onChange={handleAccordionChange('personal')}
          sx={{ mb: 2 }}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
              },
            }}
          >
            <PersonIcon sx={{ mr: 2 }} />
            <Box>
              <Typography variant="subtitle1">Personal Information</Typography>
              <Typography variant="body2" color="text.secondary">
                Update your name and email
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box component="form" onSubmit={handleProfileSubmit(onProfileSubmit)} noValidate>
              <Grid container spacing={3}>
                <Grid size={12}>
                  <TextField
                    {...register('full_name')}
                    label="Full Name"
                    fullWidth
                    error={!!profileErrors.full_name}
                    helperText={profileErrors.full_name?.message}
                    value={fullName}
                  />
                </Grid>
                <Grid size={12}>
                  <TextField
                    {...register('email')}
                    label="Email"
                    fullWidth
                    disabled
                    error={!!profileErrors.email}
                    helperText={profileErrors.email?.message || 'Email cannot be changed'}
                    value={email}
                  />
                </Grid>
                {error && (
                  <Grid size={12}>
                    <Alert severity="error">{error}</Alert>
                  </Grid>
                )}
                {success && (
                  <Grid size={12}>
                    <Alert severity="success">Profile updated successfully</Alert>
                  </Grid>
                )}
                <Grid size={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isLoading}
                    startIcon={isLoading ? <CircularProgress size={20} /> : null}
                  >
                    Save Changes
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </AccordionDetails>
        </Accordion>

        {isPasswordAuth && (
          <Accordion
            expanded={expanded === 'security'}
            onChange={handleAccordionChange('security')}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              sx={{
                '& .MuiAccordionSummary-content': {
                  alignItems: 'center',
                },
              }}
            >
              <LockIcon sx={{ mr: 2 }} />
              <Box>
                <Typography variant="subtitle1">Security</Typography>
                <Typography variant="body2" color="text.secondary">
                  Change your password
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box component="form" onSubmit={handlePasswordSubmit(onPasswordSubmit)} noValidate>
                <Grid container spacing={3}>
                  <Grid size={12}>
                    <TextField
                      {...registerPassword('current_password')}
                      type="password"
                      label="Current Password"
                      fullWidth
                      error={!!passwordErrors.current_password}
                      helperText={passwordErrors.current_password?.message}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      {...registerPassword('new_password')}
                      type="password"
                      label="New Password"
                      fullWidth
                      error={!!passwordErrors.new_password}
                      helperText={passwordErrors.new_password?.message}
                    />
                  </Grid>
                  <Grid size={12}>
                    <TextField
                      {...registerPassword('confirm_password')}
                      type="password"
                      label="Confirm New Password"
                      fullWidth
                      error={!!passwordErrors.confirm_password}
                      helperText={passwordErrors.confirm_password?.message}
                    />
                  </Grid>
                  {passwordError && (
                    <Grid size={12}>
                      <Alert severity="error">{passwordError}</Alert>
                    </Grid>
                  )}
                  {passwordSuccess && (
                    <Grid size={12}>
                      <Alert severity="success">Password updated successfully</Alert>
                    </Grid>
                  )}
                  <Grid size={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isLoading}
                      startIcon={isLoading ? <CircularProgress size={20} /> : null}
                    >
                      Update Password
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        <Accordion expanded={expanded === 'team'} onChange={handleAccordionChange('team')}>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            sx={{
              '& .MuiAccordionSummary-content': {
                alignItems: 'center',
              },
            }}
          >
            <GroupIcon sx={{ mr: 2 }} />
            <Box>
              <Typography variant="subtitle1">Team Settings</Typography>
              <Typography variant="body2" color="text.secondary">
                Select your current team
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid size={12}>
                <FormControl fullWidth disabled={teamsLoading}>
                  <InputLabel id="team-select-label">Current Team</InputLabel>
                  <Select
                    labelId="team-select-label"
                    value={currentTeam?.id || ''}
                    label="Current Team"
                    onChange={e => handleTeamChange(e.target.value)}
                  >
                    {teams.map(team => (
                      <MenuItem key={team.id} value={team.id}>
                        {team.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {teams.length === 0 && !teamsLoading && (
                <Grid size={12}>
                  <Alert severity="info">
                    You are not a member of any teams. Contact an administrator to be added to a
                    team.
                  </Alert>
                </Grid>
              )}
              {teamError && (
                <Grid size={12}>
                  <Alert severity="error">{teamError}</Alert>
                </Grid>
              )}
              {teamSuccess && (
                <Grid size={12}>
                  <Alert severity="success">Team changed successfully</Alert>
                </Grid>
              )}
              {currentTeam && (
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    Current team: <strong>{currentTeam.name}</strong>
                    {currentTeam.description && <span> - {currentTeam.description}</span>}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </AccordionDetails>
        </Accordion>
      </PageLayout>
    </Container>
  );
}
