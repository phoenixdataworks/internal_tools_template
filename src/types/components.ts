import { DashboardLivestream } from './monitoring';
import { Platform } from './platform';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  isLoading?: boolean;
  isPremium?: boolean;
}

export interface StreamCardProps {
  stream: DashboardLivestream;
}

export interface MetricsStreamCardProps {
  stream: {
    title: string | null;
    platform: Platform | null;
    video_id: string | null;
    start_time: string | null;
    is_active: boolean | null;
    source_url?: string | null;
    channel?: {
      channel_name: string | null;
      channel_id: string;
      platform: Platform;
    };
  };
}
