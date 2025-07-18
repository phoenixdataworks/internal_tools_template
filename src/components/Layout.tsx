import { Box, AppBar, Toolbar, Typography } from '@mui/material';
import { DarkModeToggle } from './DarkModeToggle';
import { Footer } from './Footer';
import { APP_NAME } from '../lib/metadata';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {APP_NAME}
          </Typography>
          <DarkModeToggle />
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
}
