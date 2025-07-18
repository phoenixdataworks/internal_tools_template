import { Box } from '@mui/material';
import { generateMetadata } from '@/lib/metadata';

export const metadata = generateMetadata('Dashboard');

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>;
}
