import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import ErrorIcon from '@mui/icons-material/Error';
import Tooltip from '@mui/material/Tooltip';
import { TeamDomain, useTeamDomains } from '@/hooks/useTeamQueries';
import LinearProgress from '@mui/material/LinearProgress';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/contexts/ToastContext';

export default function DomainList() {
  const { data: domains, isLoading, refetch } = useTeamDomains();
  const { showToast } = useToast();

  const handleDelete = async (domain: TeamDomain) => {
    if (!confirm(`Remove domain ${domain.domain}?`)) return;
    const res = await apiFetch(`/api/domains/${domain.id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast?.('Domain removed', 'success');
      refetch();
    } else {
      const json = await res.json();
      showToast?.(json.error || 'Failed', 'error');
    }
  };

  if (isLoading) {
    return <LinearProgress />;
  }

  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Domain</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Verified At</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {domains?.map(domain => (
            <TableRow key={domain.id} hover>
              <TableCell>{domain.domain}</TableCell>
              <TableCell>
                {domain.status === 'verified' && (
                  <Tooltip title="Verified">
                    <CheckCircleIcon color="success" />
                  </Tooltip>
                )}
                {domain.status === 'pending' && (
                  <Tooltip title="Pending verification">
                    <HourglassBottomIcon color="warning" />
                  </Tooltip>
                )}
                {domain.status === 'failed' && (
                  <Tooltip title="Verification failed">
                    <ErrorIcon color="error" />
                  </Tooltip>
                )}
              </TableCell>
              <TableCell>
                {domain.verified_at ? new Date(domain.verified_at).toLocaleString() : '—'}
              </TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => handleDelete(domain)}
                  disabled={domain.status === 'pending'}
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {domains?.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                No custom domains yet
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
