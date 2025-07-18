import { Metadata } from 'next';
import { getPageTitle } from '@/lib/metadata';
import SignUpForm from '@/components/auth/SignUpForm';
import { Container, Box } from '@mui/material';

export const metadata: Metadata = {
  title: getPageTitle('Sign Up'),
};

export default function SignUpPage() {
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
          <SignUpForm />
        </Box>
      </Box>
    </Container>
  );
}
