import { Box } from '@mui/material';
import { generateMetadata } from '@/lib/metadata';

export const metadata = generateMetadata('UserProfile');

export default function UserProfileLayout({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>;
}
