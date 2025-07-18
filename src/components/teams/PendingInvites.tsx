import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Skeleton,
  Alert,
} from '@mui/material';
import { usePendingInvites } from '@/contexts/PendingInvitesContext';
import { PendingInviteLogger } from '@/utils/logger';
import { apiFetch } from '@/lib/apiClient';
import { useTeam } from '@/contexts/TeamContext';

// Minimum height to reserve for the container to prevent layout shifts
const MIN_CONTAINER_HEIGHT = 100;

interface PendingInviteProps {
  invite: any;
  onAccept: (invite: any) => Promise<void>;
  onDecline: (invite: any) => Promise<void>;
  isProcessing?: boolean;
}

const PendingInviteCard = React.memo(function PendingInviteCard({
  invite,
  onAccept,
  onDecline,
  isProcessing = false,
}: PendingInviteProps) {
  PendingInviteLogger.debug('Preparing to render PendingInviteCard:', {
    id: invite.id,
    team: invite.teams?.name,
    invitedBy: invite.invited_by_name || invite.invited_by_email || 'Unknown',
    isProcessing: isProcessing,
  });

  try {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" component="div">
            {invite.teams.name}
          </Typography>
          <Typography color="text.secondary">
            Invited by: {invite.invited_by_name || invite.invited_by_email || 'Unknown'}
          </Typography>
          {invite.teams.description && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {invite.teams.description}
            </Typography>
          )}
        </CardContent>
        <CardActions>
          <Button
            size="small"
            color="primary"
            onClick={() => onAccept(invite)}
            disabled={isProcessing}
          >
            Accept
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => onDecline(invite)}
            disabled={isProcessing}
          >
            Decline
          </Button>
          {isProcessing && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </CardActions>
      </Card>
    );
  } catch (error) {
    PendingInviteLogger.error('Error rendering PendingInviteCard:', { error, inviteId: invite.id });
    return null; // Fallback to prevent breaking the app
  }
});

interface PendingInvitesProps {
  invites: any[];
  onInviteAction?: () => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

export const PendingInvites = React.memo(function PendingInvites({
  invites,
  onInviteAction,
  isLoading = false,
  setIsLoading = () => {},
}: PendingInvitesProps) {
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasRenderedRef = useRef(false);
  const [containerHeight, setContainerHeight] = useState(MIN_CONTAINER_HEIGHT);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { isInitiallyLoading } = usePendingInvites();
  const { refreshTeams } = useTeam();

  PendingInviteLogger.debug('PendingInvites component rendering with:', {
    invitesLength: invites?.length || 0,
    invitesData: invites?.map(i => ({ id: i.id, team: i.teams?.name })) || [],
    isLoading,
    isInitiallyLoading,
    hasRendered: hasRenderedRef.current,
  });

  // Measure the container height once rendered to prevent layout shifts
  useEffect(() => {
    if (containerRef.current && invites?.length > 0) {
      const height = containerRef.current.offsetHeight;
      if (height > MIN_CONTAINER_HEIGHT) {
        setContainerHeight(height);
      }
      hasRenderedRef.current = true;
    }
  }, [invites]);

  // Handle invitation acceptance
  const handleAccept = useCallback(
    async (invite: any) => {
      try {
        setError(null);
        setProcessingInviteId(invite.id);
        setIsLoading(true);
        PendingInviteLogger.debug('Accepting invitation:', invite.id);

        // Fetch CSRF token
        const csrfRes = await apiFetch('/api/auth/csrf-token');
        const { csrfToken } = await csrfRes.json();

        // API call to accept the invitation
        const response = await apiFetch('/api/teams/accept-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ token: invite.token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to accept invitation');
        }

        // Refresh teams after successful invite acceptance
        await refreshTeams?.();

        PendingInviteLogger.debug('Successfully accepted invitation:', invite.id);

        // Notify parent component
        if (onInviteAction) {
          onInviteAction();
        }
      } catch (err: any) {
        console.error('Error accepting invitation:', err);
        PendingInviteLogger.error('Error accepting invitation:', err);
        setError(err.message || 'Failed to accept invitation. Please try again.');
      } finally {
        setProcessingInviteId(null);
        setIsLoading(false);
      }
    },
    [onInviteAction, setIsLoading, refreshTeams]
  );

  // Handle invitation decline
  const handleDecline = useCallback(
    async (invite: any) => {
      try {
        setError(null);
        setProcessingInviteId(invite.id);
        setIsLoading(true);
        PendingInviteLogger.debug('Declining invitation:', invite.id);

        // Fetch CSRF token
        const csrfRes = await apiFetch('/api/auth/csrf-token');
        const { csrfToken } = await csrfRes.json();

        // API call to decline the invitation
        const response = await apiFetch('/api/teams/decline-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          body: JSON.stringify({ token: invite.token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || errorData.error || 'Failed to decline invitation');
        }

        PendingInviteLogger.debug('Successfully declined invitation:', invite.id);

        // Notify parent component
        if (onInviteAction) {
          onInviteAction();
        }
      } catch (err: any) {
        console.error('Error declining invitation:', err);
        PendingInviteLogger.error('Error declining invitation:', err);
        setError(err.message || 'Failed to decline invitation. Please try again.');
      } finally {
        setProcessingInviteId(null);
        setIsLoading(false);
      }
    },
    [onInviteAction, setIsLoading]
  );

  // Show loading skeletons when initially loading
  if (isInitiallyLoading) {
    PendingInviteLogger.debug('PendingInvites showing initial loading skeleton');
    return (
      <Box sx={{ mb: 4, minHeight: containerHeight }}>
        <Typography variant="h5" component="h2" gutterBottom>
          Pending Team Invitations
        </Typography>
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
        <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
      </Box>
    );
  }

  // If there are no invites and we have already rendered once,
  // don't show anything to prevent layout shifts
  if (!invites || invites.length === 0) {
    if (hasRenderedRef.current) {
      PendingInviteLogger.debug(
        'PendingInvites not rendering - no invites and already rendered once'
      );
      return null;
    }
    // On initial render with no invites, render a zero-height div
    PendingInviteLogger.debug(
      'PendingInvites rendering empty container (initial render with no invites)'
    );
    return <div style={{ height: 0, overflow: 'hidden', margin: 0 }}></div>;
  }

  PendingInviteLogger.debug('PendingInvites mapping invites for rendering', {
    invitesLength: invites.length,
    invites: invites.map(i => ({ id: i.id, team: i.teams?.name })),
  });

  return (
    <Box
      ref={containerRef}
      sx={{
        mb: 4,
        minHeight: containerHeight,
        transition: 'min-height 0.2s ease-in-out',
      }}
    >
      <Typography variant="h5" component="h2" gutterBottom>
        Pending Team Invitations
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {isLoading && !processingInviteId && invites.length === 0 ? (
        // Show skeletons when loading
        <>
          <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
          <Skeleton variant="rectangular" height={100} sx={{ mb: 2, borderRadius: 1 }} />
        </>
      ) : (
        invites.map(invite => (
          <PendingInviteCard
            key={invite.id}
            invite={invite}
            onAccept={handleAccept}
            onDecline={handleDecline}
            isProcessing={processingInviteId === invite.id}
          />
        ))
      )}
    </Box>
  );
});
