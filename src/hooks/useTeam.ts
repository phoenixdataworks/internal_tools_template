import { useContext } from 'react';
import { TeamContext } from '@/contexts/TeamContext';

/**
 * Hook to access the current team information
 */
export function useTeam() {
  const context = useContext(TeamContext);

  if (!context) {
    throw new Error('useTeam must be used within a TeamProvider');
  }

  return context;
}
