import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import { apiFetch } from '@/lib/apiClient';
import { useToast } from '@/contexts/ToastContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddDomainDialog({ open, onClose, onSuccess }: Props) {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const res = await apiFetch('/api/domains', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain }),
    });
    const json = await res.json();
    if (res.ok) {
      showToast?.('Domain added. Please add DNS TXT record to verify.', 'success');
      onSuccess();
      setDomain('');
      onClose();
    } else {
      setError(json.error || 'Failed to add domain');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add Custom Domain</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <TextField
          fullWidth
          label="Domain (e.g., go.example.com)"
          value={domain}
          onChange={e => setDomain(e.target.value)}
          autoFocus
          disabled={isSubmitting}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting || !domain}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}
