import { Box } from '@mui/material';
import { generateMetadata } from '@/lib/metadata';

export const metadata = generateMetadata('Metrics');

export default function MetricsLayout({ children }: { children: React.ReactNode }) {
  return <Box>{children}</Box>;
}
