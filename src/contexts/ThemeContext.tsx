'use client';

import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { useMediaQuery } from '@mui/material';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [{ cache, flush }] = useState(() => {
    const cache = createCache({
      key: 'mui',
      prepend: true,
    });
    return {
      cache,
      flush: () => {
        const prevInsertionPoints = cache.inserted;
        cache.inserted = {};
        return prevInsertionPoints;
      },
    };
  });

  useServerInsertedHTML(() => {
    const names = flush();
    if (!names) return null;
    let styles = '';
    for (const name in names) {
      styles += names[name];
    }
    return (
      <style
        key="emotion"
        data-emotion={`${cache.key} ${Object.keys(names).join(' ')}`}
        dangerouslySetInnerHTML={{ __html: styles }}
      />
    );
  });

  // Start with light theme for SSR
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isClient, setIsClient] = useState(false);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Mark when we're in the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Only run theme detection after hydration
  useEffect(() => {
    if (!isClient) return;

    const savedMode = localStorage.getItem('themeMode') as ThemeMode;
    if (savedMode) {
      setMode(savedMode);
    } else if (prefersDarkMode) {
      setMode('dark');
    }
  }, [isClient, prefersDarkMode]);

  useEffect(() => {
    if (!isClient) return;
    localStorage.setItem('themeMode', mode);
  }, [mode, isClient]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#1976d2',
          },
          secondary: {
            main: '#c62828',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
          },
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
          ].join(','),
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
              },
            },
          },
          MuiTextField: {
            defaultProps: {
              variant: 'outlined',
            },
          },
          MuiTypography: {
            defaultProps: {
              color: 'text.primary',
            },
          },
          MuiListItemText: {
            defaultProps: {
              slotProps: {
                primary: {
                  color: 'text.primary',
                },

                secondary: {
                  color: 'text.secondary',
                },
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode(prevMode => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      <CacheProvider value={cache}>
        <MuiThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </MuiThemeProvider>
      </CacheProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
