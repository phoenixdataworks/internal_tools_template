import { useRouter, usePathname } from 'next/navigation';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ConnectWithoutContactIcon from '@mui/icons-material/ConnectWithoutContact';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LanguageIcon from '@mui/icons-material/Language';
import { useTeam } from '@/contexts/TeamContext';

interface TeamTabsProps {
  showSubscriptionTab?: boolean;
}

export default function TeamTabs({ showSubscriptionTab = true }: TeamTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentTeam } = useTeam();

  // Check current path to set active tab
  const getActiveTab = () => {
    if (pathname?.includes('/integrations')) return 'integrations';
    if (pathname?.includes('/settings')) return 'settings';
    if (pathname?.includes('/billing')) return 'billing';
    if (pathname?.includes('/domains')) return 'domains';
    return 'members'; // Default
  };

  const activeTab = getActiveTab();

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    if (newValue === activeTab) return;

    // Navigate to the corresponding route
    switch (newValue) {
      case 'members':
        router.push('/teams');
        break;
      case 'integrations':
        router.push('/teams/integrations');
        break;
      case 'settings':
        router.push('/teams/settings');
        break;
      case 'billing':
        router.push('/teams/billing');
        break;
      case 'domains':
        router.push('/teams/domains');
        break;
    }
  };

  // Don't show tabs if no team is selected
  if (!currentTeam) return null;

  return (
    <Paper sx={{ mb: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab value="members" label="Members" icon={<GroupIcon />} iconPosition="start" />
          <Tab
            value="integrations"
            label="Integrations"
            icon={<ConnectWithoutContactIcon />}
            iconPosition="start"
          />
          <Tab value="settings" label="Settings" icon={<SettingsIcon />} iconPosition="start" />
          <Tab value="domains" label="Domains" icon={<LanguageIcon />} iconPosition="start" />
          {showSubscriptionTab && (
            <Tab value="billing" label="Billing" icon={<ReceiptIcon />} iconPosition="start" />
          )}
        </Tabs>
      </Box>
    </Paper>
  );
}
