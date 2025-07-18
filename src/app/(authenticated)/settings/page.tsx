'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useTeam } from '@/contexts/TeamContext';
import { useAuth } from '@/contexts/AuthContext';
import PageLayout from '@/components/layouts/PageLayout';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const {
    teams,
    currentTeam,
    teamMembers,
    joinRequests,
    isLoading,
    createTeam,
    addTeamMember,
    removeTeamMember,
    updateTeamMemberRole,
    approveJoinRequest,
    rejectJoinRequest,
  } = useTeam();
  const { user, isSuperAdmin } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openJoinDialog, setOpenJoinDialog] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '', slug: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleCreateTeam = async () => {
    if (!newTeamData.name || !newTeamData.slug) {
      setError('Name and slug are required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createTeam(newTeamData);
      setOpenCreateDialog(false);
      setNewTeamData({ name: '', description: '', slug: '' });
    } catch (error) {
      console.error('Error creating team:', error);
      setError(error instanceof Error ? error.message : 'Failed to create team');
    } finally {
      setIsCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setNewTeamData({ ...newTeamData, name, slug: generateSlug(name) });
  };

  const handleMemberMenuOpen = (event: React.MouseEvent<HTMLElement>, member: any) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMemberMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleRoleChange = async (role: 'admin' | 'member') => {
    if (!selectedMember || !currentTeam) return;

    try {
      await updateTeamMemberRole(currentTeam.id, selectedMember.user_id, role);
      handleMemberMenuClose();
    } catch (error) {
      console.error('Error updating member role:', error);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember || !currentTeam) return;

    try {
      await removeTeamMember(currentTeam.id, selectedMember.user_id);
      handleMemberMenuClose();
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const isTeamAdmin = (teamId: string) => {
    return teamMembers.some(
      member => member.team_id === teamId && member.user_id === user?.id && member.role === 'admin'
    );
  };

  const canManageTeams = isSuperAdmin || teams.some(team => isTeamAdmin(team.id));

  if (isLoading) {
    return (
      <PageLayout>
        <Typography>Loading settings...</Typography>
      </PageLayout>
    );
  }

  if (!canManageTeams) {
    return (
      <PageLayout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">
            You don't have permission to access settings. Contact a super admin or team admin for
            access.
          </Alert>
        </Box>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Box sx={{ p: 3 }}>
        {isSuperAdmin && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="primary">
              Super Admin - Full system access
            </Typography>
          </Box>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
            <Tab icon={<GroupIcon />} label="Team Management" iconPosition="start" />
            <Tab icon={<SettingsIcon />} label="System Settings" iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
          >
            <Typography variant="h5">Team Management</Typography>
            {isSuperAdmin && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreateDialog(true)}
              >
                Create Team
              </Button>
            )}
          </Box>

          {teams.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No teams yet
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {isSuperAdmin
                    ? 'Create your first team to get started with collaboration.'
                    : 'You are not a member of any teams. Contact a super admin to be added to a team.'}
                </Typography>
                {isSuperAdmin && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenCreateDialog(true)}
                  >
                    Create Your First Team
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                gap: 3,
              }}
            >
              {teams.map(team => (
                <Card key={team.id}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" component="h2">
                        {team.name}
                      </Typography>
                      {isTeamAdmin(team.id) && <Chip label="Admin" size="small" color="primary" />}
                    </Box>
                    {team.description && (
                      <Typography color="text.secondary" sx={{ mb: 2 }}>
                        {team.description}
                      </Typography>
                    )}
                    <Typography variant="body2" color="text.secondary">
                      Slug: {team.slug}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button size="small" onClick={() => setOpenJoinDialog(true)}>
                      View Members
                    </Button>
                  </CardActions>
                </Card>
              ))}
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            System Settings
          </Typography>
          <Alert severity="info">
            System settings will be available here for super admins to configure application-wide
            settings.
          </Alert>
        </TabPanel>

        {/* Create Team Dialog */}
        <Dialog
          open={openCreateDialog}
          onClose={() => setOpenCreateDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Create New Team</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              autoFocus
              margin="dense"
              label="Team Name"
              fullWidth
              value={newTeamData.name}
              onChange={e => handleNameChange(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={newTeamData.description}
              onChange={e => setNewTeamData({ ...newTeamData, description: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              label="Team Slug"
              fullWidth
              value={newTeamData.slug}
              onChange={e => setNewTeamData({ ...newTeamData, slug: e.target.value })}
              helperText="Unique identifier for the team (e.g., 'engineering-team')"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenCreateDialog(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateTeam} variant="contained" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Team Members Dialog */}
        <Dialog
          open={openJoinDialog}
          onClose={() => setOpenJoinDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Team Members</DialogTitle>
          <DialogContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Members ({teamMembers.length})
            </Typography>
            <List>
              {teamMembers.map((member, index) => (
                <Box key={member.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {member.profile?.full_name || member.profile?.email}
                          {member.role === 'admin' && (
                            <AdminIcon fontSize="small" color="primary" />
                          )}
                          <Chip label={member.role} size="small" variant="outlined" />
                        </Box>
                      }
                      secondary={member.profile?.email}
                    />
                    {(isTeamAdmin(currentTeam?.id || '') || isSuperAdmin) &&
                      member.user_id !== user?.id && (
                        <IconButton onClick={e => handleMemberMenuOpen(e, member)}>
                          <MoreVertIcon />
                        </IconButton>
                      )}
                  </ListItem>
                  {index < teamMembers.length - 1 && <Divider />}
                </Box>
              ))}
            </List>

            {joinRequests.length > 0 && (
              <>
                <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                  Join Requests ({joinRequests.filter(r => r.status === 'pending').length})
                </Typography>
                <List>
                  {joinRequests
                    .filter(request => request.status === 'pending')
                    .map((request, index) => (
                      <Box key={request.id}>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar>
                              <PersonIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={request.profile?.full_name || request.profile?.email}
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {request.profile?.email}
                                </Typography>
                                {request.message && (
                                  <Typography variant="body2" color="text.secondary">
                                    Message: {request.message}
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                          {(isTeamAdmin(currentTeam?.id || '') || isSuperAdmin) && (
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => approveJoinRequest(request.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                onClick={() => rejectJoinRequest(request.id)}
                              >
                                Reject
                              </Button>
                            </Box>
                          )}
                        </ListItem>
                        {index < joinRequests.filter(r => r.status === 'pending').length - 1 && (
                          <Divider />
                        )}
                      </Box>
                    ))}
                </List>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenJoinDialog(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Member Actions Menu */}
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMemberMenuClose}>
          <MenuItem onClick={() => handleRoleChange('admin')}>Make Admin</MenuItem>
          <MenuItem onClick={() => handleRoleChange('member')}>Make Member</MenuItem>
          <MenuItem onClick={handleRemoveMember} sx={{ color: 'error.main' }}>
            Remove from Team
          </MenuItem>
        </Menu>
      </Box>
    </PageLayout>
  );
}
