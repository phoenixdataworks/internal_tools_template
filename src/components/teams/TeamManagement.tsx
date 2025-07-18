'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography,
  CircularProgress,
  Chip,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Close as CloseIcon } from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePendingInvites } from '@/contexts/PendingInvitesContext';
import { FormDialog } from '@/components/common/FormDialog';
import { Dispatch, SetStateAction } from 'react';
import { Team, TeamMember, TeamInvite } from '@/types/team';
import { apiFetch } from '@/lib/apiClient';

interface ConfirmationState {
  type: 'remove_member' | 'cancel_invite';
  id: string;
  email: string;
  confirmStep: boolean;
}

type MemberWithProfile = TeamMember & {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type InviteWithTeam = TeamInvite & {
  teams: {
    name: string;
  };
  invited_by_email?: string;
};

type PendingInviteWithTeam = TeamInvite & {
  teams: {
    name: string;
  };
  invited_by_email?: string;
};

interface TeamManagementProps {
  teamId: string;
  isAdmin: boolean;
  isInviteDialogOpen: boolean;
  setIsInviteDialogOpen: Dispatch<SetStateAction<boolean>>;
  isCreateTeamDialogOpen: boolean;
  setIsCreateTeamDialogOpen: Dispatch<SetStateAction<boolean>>;
  allowCreateTeam?: boolean;
  onMemberRemoved?: () => void;
}

// Add utility function for error handling
const handleError = (
  error: unknown,
  defaultMessage: string,
  showToast?: (message: string, severity: 'error' | 'success') => void
) => {
  console.error(defaultMessage + ':', error);
  showToast?.(error instanceof Error ? error.message : defaultMessage, 'error');
};

export function TeamManagement({
  teamId,
  isAdmin,
  isInviteDialogOpen,
  setIsInviteDialogOpen,
  isCreateTeamDialogOpen,
  setIsCreateTeamDialogOpen,
  allowCreateTeam = false,
  onMemberRemoved,
}: TeamManagementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [invites, setInvites] = useState<InviteWithTeam[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [newTeamName, setNewTeamName] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const { showToast } = useToast();
  const { user, isSuperAdmin } = useAuth();
  if (!user) throw new Error('User is required');
  const { refreshPendingInvites } = usePendingInvites();
  // Check if current user is admin of selected team
  const isTeamAdmin = () => {
    if (!user || !teamId) return false;
    const currentMember = members.find(member => member.user_id === user.id);
    return currentMember?.role === 'admin';
  };

  const loadTeams = async () => {
    try {
      // Create a fresh client for loading teams
      const teamsClient = createClient();

      const { data, error } = await teamsClient
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.log(error, 'loading teams');
        return;
      }

      setTeams(data || []);
      if (data && data.length > 0 && !selectedTeam) {
        setSelectedTeam(data[0]);
      }
    } catch (error) {
      console.log(error, 'loading teams');
    }
  };

  const loadTeamMembers = async () => {
    console.log('[Teams] teamId:', teamId);
    if (!teamId) return;

    try {
      setIsLoading(true);
      console.log('[Teams] Loading team members...');

      // Create a fresh client for team members query
      const membersClient = createClient();

      const { data: membersData, error: membersError } = await membersClient
        .from('team_members_with_profiles')
        .select('*')
        .eq('team_id', teamId);

      console.log('[Teams] Team members data:', membersData);

      if (membersError) {
        console.log(membersError, 'loading team members');
        return; // Auth error was handled, stop execution
      }

      // Create a fresh client for invites query
      const invitesClient = createClient();

      // Only fetch invites that were sent from this team (not received)
      const { data: invitesData, error: invitesError } = await invitesClient
        .from('team_invites')
        .select(
          `
          *,
          teams (
            name
          )
          `
        )
        .eq('team_id', teamId)
        .eq('status', 'pending')
        .not('email', 'eq', user?.email); // Don't show user's own invites

      console.log('[Teams] Team invites data:', invitesData);

      if (invitesError) {
        console.log(invitesError, 'loading team invites');
        return; // Auth error was handled, stop execution
      }

      // Only update state if we successfully loaded both data sets
      setMembers(membersData || []);
      setInvites(invitesData || []);
      setError(null); // Clear any previous errors on success
    } catch (error) {
      console.log(error, 'loading team data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTeams();
  }, [user]);

  useEffect(() => {
    loadTeamMembers();
  }, [teamId]);

  const handleCreateTeam = async () => {
    if (!newTeamName.trim() || (!isSuperAdmin && !allowCreateTeam)) {
      showToast?.(
        !newTeamName.trim()
          ? 'Team name is required'
          : 'You do not have permission to create teams',
        'error'
      );
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create a fresh client for creating the team
      const createTeamClient = createClient();

      // Create team, add member, and create subscription
      const { data: team, error: teamError } = await createTeamClient.rpc(
        'create_team_with_subscription',
        {
          team_name: newTeamName.trim(),
          team_slug: newTeamName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, '-'),
          user_id: user?.id,
        }
      );

      if (teamError) {
        console.log(teamError, 'creating team');
        return; // Auth error was handled, stop execution
      }

      if (!team) {
        throw new Error('Failed to create team');
      }

      if (!team.id) {
        console.error('Team created but no valid ID returned');
        throw new Error('Team created but no valid ID returned');
      }

      showToast?.('Team created successfully', 'success');
      setIsCreateTeamDialogOpen(false);
      setNewTeamName('');

      // Refresh teams list and select the new team
      await loadTeams();
      setSelectedTeam(team);
    } catch (error) {
      console.log(error, 'creating team');
    } finally {
      setIsLoading(false);
    }
  };

  const isLastAdmin = (userId: string | null) => {
    if (!userId) return false;
    const adminMembers = members.filter(member => member.role === 'admin');
    return adminMembers.length === 1 && adminMembers[0].user_id === userId;
  };

  const handleRoleChange = async (userId: string | null, newRole: 'admin' | 'member') => {
    if (!selectedTeam || !isTeamAdmin() || !userId) return;

    // Prevent changing role if this would remove the last admin
    if (newRole === 'member' && isLastAdmin(userId)) {
      showToast?.('Cannot change role: Team must have at least one admin', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Create a fresh client for updating the role
      const roleClient = createClient();

      const { error } = await roleClient
        .from('team_members')
        .update({ role: newRole })
        .eq('team_id', selectedTeam.id)
        .eq('user_id', userId);

      if (error) {
        console.log(error, 'updating role');
        return; // Auth error was handled, stop execution
      }

      showToast?.('Role updated successfully', 'success');
      await loadTeamMembers();
    } catch (error) {
      console.log(error, 'updating role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedTeam || !isTeamAdmin()) return;

    // Prevent removing the last admin
    if (isLastAdmin(userId)) {
      showToast?.('Cannot remove the last admin from the team', 'error');
      return;
    }

    try {
      setIsLoading(true);

      // Create a fresh client for checking team count
      const countClient = createClient();

      // First check if this is the user's last team
      const { count, error: countError } = await countClient
        .from('team_members')
        .select('team_id', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        console.log(countError, 'checking team count');
        return; // Auth error was handled, stop execution
      }

      // Create a fresh client for removing the member
      const removeClient = createClient();

      // Remove the member
      const { error: removeError } = await removeClient
        .from('team_members')
        .delete()
        .eq('team_id', selectedTeam.id)
        .eq('user_id', userId);

      if (removeError) {
        console.log(removeError, 'removing member');
        return; // Auth error was handled, stop execution
      }

      // If this was their last team, update onboarding status to pending
      if (count === 1) {
        // Create a fresh client for updating the profile
        const profileClient = createClient();

        const { error: updateError } = await profileClient
          .from('profiles')
          .update({ onboarding_status: 'pending' })
          .eq('id', userId);

        if (updateError) {
          console.log(updateError, 'updating profile');
          return; // Auth error was handled, stop execution
        }
      }

      showToast?.('Member removed successfully', 'success');
      await loadTeamMembers();
      onMemberRemoved?.();
    } catch (error) {
      console.log(error, 'removing member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!selectedTeam || !isTeamAdmin()) return;

    try {
      setIsLoading(true);

      // Create a fresh client for cancelling the invite
      const inviteClient = createClient();

      const { error } = await inviteClient.from('team_invites').delete().eq('id', inviteId);

      if (error) {
        console.log(error, 'cancelling invitation');
        return; // Auth error was handled, stop execution
      }

      showToast?.('Invitation cancelled successfully', 'success');
      await loadTeamMembers();
    } catch (error) {
      console.log(error, 'cancelling invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMemberClick = async () => {
    if (!inviteEmail || !inviteRole || !selectedTeam || !isTeamAdmin()) return;
    await handleInviteMember(inviteEmail, inviteRole);
  };

  const handleInviteMember = async (email: string, role: string) => {
    if (!teamId || !isTeamAdmin()) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    console.log('handleInviteMember');

    try {
      // Call the invite-user API endpoint
      const response = await apiFetch('/api/teams/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: teamId,
          email,
          role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to send invitation');
      }

      showToast?.('Invitation sent successfully', 'success');
      setIsInviteDialogOpen(false);
      setInviteEmail('');
      setInviteRole('member');
      await loadTeamMembers();
      await refreshPendingInvites();
      setIsLoading(false);
    } catch (error) {
      console.error('Error inviting member:', error);
      showToast?.(error instanceof Error ? error.message : 'Failed to send invitation', 'error');
      setIsLoading(false);
      throw error; // Re-throw to allow form error handling
    }
  };

  const handleAcceptInvite = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await apiFetch('/api/teams/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept invite');
      }

      showToast?.('Successfully joined team', 'success');
      await loadTeamMembers();
      await loadTeams();
    } catch (error) {
      console.error('Error accepting invite:', error);
      showToast?.(error instanceof Error ? error.message : 'Failed to accept invite', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineInvite = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await apiFetch('/api/teams/decline-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline invite');
      }

      showToast?.('Invite declined', 'success');
      await loadTeamMembers();
    } catch (error) {
      console.error('Error declining invite:', error);
      showToast?.(error instanceof Error ? error.message : 'Failed to decline invite', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveClick = (userId: string | null, email: string | null) => {
    if (!userId || !email) return;

    if (
      confirmation?.type === 'remove_member' &&
      confirmation.id === userId &&
      confirmation.confirmStep
    ) {
      // Second click - actually remove
      handleRemoveMember(userId);
      setConfirmation(null);
    } else {
      // First click - show confirmation
      setConfirmation({ type: 'remove_member', id: userId, email, confirmStep: true });
    }
  };

  const handleCancelInviteClick = (inviteId: string, email: string) => {
    if (
      confirmation?.type === 'cancel_invite' &&
      confirmation.id === inviteId &&
      confirmation.confirmStep
    ) {
      // Second click - actually cancel
      handleCancelInvite(inviteId);
      setConfirmation(null);
    } else {
      // First click - show confirmation
      setConfirmation({ type: 'cancel_invite', id: inviteId, email, confirmStep: true });
    }
  };

  const handleCancelConfirmation = () => {
    setConfirmation(null);
  };

  return (
    <Box>
      {error && (
        <Box sx={{ mb: 3 }}>
          <Typography color="error" variant="body1">
            {error}
          </Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h2">
          Team Members
        </Typography>
        {isTeamAdmin() && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsInviteDialogOpen(true)}
          >
            Invite Member
          </Button>
        )}
      </Box>
      {isLoading ? (
        <CircularProgress />
      ) : (
        <Card sx={{ bgcolor: 'background.paper' }}>
          <CardContent>
            <List>
              {members.map(member => (
                <ListItem
                  key={member.user_id}
                  secondaryAction={
                    isTeamAdmin() ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {isLastAdmin(member.user_id) ? (
                          <Tooltip title="Cannot change role of the last admin">
                            <span>
                              <Select
                                value={member.role}
                                disabled
                                size="small"
                                data-testid={`member-role-select-${member.user_id}`}
                              >
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="member">Member</MenuItem>
                              </Select>
                            </span>
                          </Tooltip>
                        ) : (
                          <Select
                            value={member.role}
                            onChange={e =>
                              handleRoleChange(member.user_id, e.target.value as 'admin' | 'member')
                            }
                            size="small"
                            data-testid={`member-role-select-${member.user_id}`}
                          >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="member">Member</MenuItem>
                          </Select>
                        )}
                        {isLastAdmin(member.user_id) ? (
                          <Tooltip title="Cannot remove the last admin from the team">
                            <span>
                              <IconButton disabled sx={{ color: 'action.disabled' }}>
                                <DeleteIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : confirmation?.type === 'remove_member' &&
                          confirmation.id === member.user_id ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                              variant="contained"
                              color="error"
                              size="small"
                              onClick={() => handleRemoveClick(member.user_id, member.email || '')}
                              startIcon={<DeleteIcon />}
                            >
                              Confirm Remove
                            </Button>
                            <IconButton
                              size="small"
                              onClick={handleCancelConfirmation}
                              sx={{ ml: 1 }}
                            >
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <IconButton
                            onClick={() => handleRemoveClick(member.user_id, member.email || '')}
                            color="error"
                            data-testid={`remove-member-${member.user_id}`}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    ) : (
                      <Chip
                        label={member.role}
                        color={member.role === 'admin' ? 'primary' : 'default'}
                        size="small"
                      />
                    )
                  }
                >
                  <ListItemText
                    primary={member.full_name || member.email || 'Unknown User'}
                    secondary={member.email || 'No email'}
                  />
                </ListItem>
              ))}
              {invites.map(invite => {
                const expirationDate = invite.expires_at ? new Date(invite.expires_at) : null;
                const expirationText = expirationDate
                  ? ` • Expires: ${expirationDate.toLocaleDateString()} at ${expirationDate.toLocaleTimeString()}`
                  : '';

                return (
                  <ListItem
                    key={invite.id}
                    secondaryAction={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            mr: 2,
                            backgroundColor: 'action.hover',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                          }}
                        >
                          Pending Invite
                        </Typography>
                        {isTeamAdmin() && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {confirmation?.type === 'cancel_invite' &&
                            confirmation.id === invite.id ? (
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  color="error"
                                  size="small"
                                  onClick={() => handleCancelInviteClick(invite.id, invite.email)}
                                  startIcon={<DeleteIcon />}
                                  data-testid={`cancel-invite-confirm-${invite.token}`}
                                >
                                  Confirm Cancel
                                </Button>
                                <IconButton size="small" onClick={handleCancelConfirmation}>
                                  <CloseIcon />
                                </IconButton>
                              </Box>
                            ) : (
                              <IconButton
                                onClick={() => handleCancelInviteClick(invite.id, invite.email)}
                                color="error"
                                data-testid={`cancel-invite-${invite.token}`}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                  >
                    <ListItemText
                      primary={invite.email}
                      secondary={`Invited as ${invite.role}${expirationText}`}
                    />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}
      <FormDialog
        open={isCreateTeamDialogOpen}
        onClose={() => setIsCreateTeamDialogOpen(false)}
        title="Create New Team"
        onSubmit={handleCreateTeam}
        submitText="Create"
      >
        <TextField
          autoFocus
          margin="dense"
          label="Team Name"
          type="text"
          fullWidth
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
        />
      </FormDialog>
      <FormDialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        title="Invite Team Member"
        onSubmit={handleInviteMemberClick}
        submitText="Send Invite"
      >
        <TextField
          autoFocus
          margin="dense"
          label="Email Address"
          type="email"
          fullWidth
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'email' },
          }}
        />
        <Select
          value={inviteRole}
          onChange={e => setInviteRole(e.target.value as 'admin' | 'member')}
          fullWidth
          sx={{ mt: 2 }}
          inputProps={{ 'aria-label': 'role' }}
        >
          <MenuItem value="member">Member</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
        </Select>
      </FormDialog>
    </Box>
  );
}
