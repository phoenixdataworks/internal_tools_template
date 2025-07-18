import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { ReactNode } from 'react';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitText?: string;
  disabled?: boolean;
}

export function FormDialog({
  open,
  onClose,
  title,
  children,
  onSubmit,
  submitText = 'Submit',
  disabled = false,
}: FormDialogProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ zIndex: 9999 }}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>{children}</DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={disabled}>
            {submitText}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
