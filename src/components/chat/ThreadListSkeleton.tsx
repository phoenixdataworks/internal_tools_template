import { Box, Skeleton } from '@mui/material';

export default function ThreadListSkeleton() {
  return (
    <Box sx={{ p: 2 }}>
      {[...Array(5)].map((_, i) => (
        <Box
          key={i}
          sx={{
            mb: 2,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
      ))}
    </Box>
  );
}
