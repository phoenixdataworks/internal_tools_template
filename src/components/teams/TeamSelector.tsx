'use client';

import { useState } from 'react';
import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { useTeam } from '@/contexts/TeamContext';

export function TeamSelector() {
  const { teams, currentTeam, setCurrentTeam, isLoading, createTeam } = useTeam();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newTeamData, setNewTeamData] = useState({ name: '', description: '', slug: '' });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTeamChange = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    setCurrentTeam(team || null);
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

  if (isLoading) {
    return <Typography>Loading teams...</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Select Team</InputLabel>
        <Select
          value={currentTeam?.id || ''}
          onChange={e => handleTeamChange(e.target.value)}
          label="Select Team"
        >
          {teams.map(team => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button variant="outlined" onClick={() => setOpenCreateDialog(true)}>
        Create Team
      </Button>

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
    </Box>
  );
}
