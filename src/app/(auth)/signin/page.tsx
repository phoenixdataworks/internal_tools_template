import { Metadata } from 'next';
import { getPageTitle } from '@/lib/metadata';
import SignInForm from '@/components/auth/SignInForm';
import { Container, Box } from '@mui/material';

export const metadata: Metadata = {
  title: getPageTitle('Sign In'),
};

export default function SignInPage() {
  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          minHeight: '80vh',
          py: 8,
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          <SignInForm />
        </Box>
      </Box>
    </Container>
  );
}
