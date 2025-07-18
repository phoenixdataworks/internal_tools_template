'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import { Alert, AlertColor, Snackbar } from '@mui/material';
import { useRouter, usePathname } from 'next/navigation';

interface ToastContextType {
  showToast: (message: string, severity?: AlertColor) => void;
}

// Initialize with a no-op function to avoid undefined checks
const ToastContext = createContext<ToastContextType>({
  showToast: () => {}, // Default no-op implementation
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');
  const router = useRouter();
  const pathname = usePathname();

  // Function to clear URL parameters
  const clearUrlParams = useCallback(() => {
    try {
      const currentUrl = window.location.href;
      // Check if there's a question mark in the URL
      if (currentUrl.indexOf('?') > -1) {
        // Get the base URL without query params
        const baseUrl = currentUrl.split('?')[0];
        // Use history API to update the URL without reloading
        window.history.replaceState(null, '', baseUrl);

        // Verify the change happened
        setTimeout(() => {}, 50);
      }
    } catch (error) {
      console.error('[ToastContext] Error clearing URL params:', error);
    }
  }, []);

  const showToast = useCallback(
    (message: string, severity: AlertColor = 'success') => {
      setMessage(message);
      setSeverity(severity);
      setOpen(true);

      // Clear URL parameters after a short delay
      setTimeout(clearUrlParams, 300);
    },
    [clearUrlParams]
  );

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    console.log('Closing toast');
    setOpen(false);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={6000}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiAlert-root': {
            width: '100%',
            maxWidth: '600px', // Limit maximum width
          },
        }}
      >
        <Alert onClose={handleClose} severity={severity} variant="filled" elevation={6}>
          {message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
