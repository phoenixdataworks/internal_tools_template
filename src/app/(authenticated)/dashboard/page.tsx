import { Box, Typography, Paper } from '@mui/material';
import { Construction as ConstructionIcon } from '@mui/icons-material';

export default function DashboardPage() {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '60vh',
        p: 3,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: 'center',
          maxWidth: 600,
          borderRadius: 2,
        }}
      >
        <ConstructionIcon sx={{ fontSize: 64, color: 'primary.main', mb: 3 }} />
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'medium' }}>
          Dashboard Coming Soon
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We're building a comprehensive dashboard with real-time analytics, data visualization, and
          powerful insights to help you monitor and optimize your operations.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Stay tuned for updates as we continue to develop this feature.
        </Typography>
      </Paper>
    </Box>
  );
}
