'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  IconButton,
  Tooltip as MuiTooltip,
  Grid,
  TextField,
  Autocomplete,
  Popover,
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { createClient } from '@/lib/supabase/client';
import ChatPane from '@/components/chat/ChatPane';
import useChatState from '@/hooks/useChatState';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PageLayout from '@/components/layouts/PageLayout';
import { RealtimeManager } from '@/lib/supabase/realtime';
import {
  DetailedLivestream as Livestream,
  LivestreamMetric,
  Metric,
  Channel,
} from '@/types/monitoring';
import { RealtimePayload } from '@/types/realtime';
import { useTeamChannels } from '@/hooks/useTeamQueries';
import { useTeam } from '@/contexts/TeamContext';
import MetricsChart from '@/components/metrics/MetricsChart';
import StreamDetails from '@/components/metrics/StreamDetails';
import FilterPopover from '@/components/metrics/FilterPopover';
import { startOfDay, endOfDay } from 'date-fns';
import { SubscriptionGuard } from '@/components/SubscriptionGuard';

function MetricsPageContent() {
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedStreams, setSelectedStreams] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return startOfDay(date);
  });
  const [endDate, setEndDate] = useState<Date | null>(() => endOfDay(new Date()));
  const [streams, setStreams] = useState<Livestream[]>([]);
  const [metrics, setMetrics] = useState<Record<string, Metric[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [realtimeMetrics, setRealtimeMetrics] = useState<Record<string, LivestreamMetric[]>>({});
  const { chatOpen, setChatOpen } = useChatState();
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const supabase = createClient();
  const { currentTeam } = useTeam();

  // Team-scoped queries
  const { data: channels = [] as Channel[] } = useTeamChannels();

  // Reset selections when team changes
  useEffect(() => {
    setSelectedChannels([]);
    setSelectedPlatforms([]);
    setSelectedStreams([]);
    setMetrics({});
    setRealtimeMetrics({});
    fetchStreams();
  }, [currentTeam?.id]);

  // Initialize from URL
  useEffect(() => {
    if (!supabase?.from || !currentTeam?.id) return;

    const streams = searchParams?.get('streams');
    const streamIds = streams?.split(',').filter(Boolean) || [];
    if (streamIds.length > 0) {
      setSelectedStreams(streamIds);
    }

    // Only fetch streams initially
    fetchStreams();
  }, [supabase, currentTeam?.id]);

  const fetchStreams = useCallback(async () => {
    if (!currentTeam?.id) return;

    try {
      // First get all team's channel subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from('team_channel_subscriptions')
        .select('channel_id')
        .eq('team_id', currentTeam.id);

      if (subError) throw subError;

      const channelIds = (subscriptions || []).map((sub: { channel_id: string }) => sub.channel_id);

      if (channelIds.length === 0) {
        setStreams([]);
        return;
      }

      // Then get all streams for those channels
      let query = supabase
        .from('livestreams')
        .select(
          `
            id,
            title,
            platform,
            start_time,
            end_time,
            is_active,
            video_id,
            channel_id,
            peak_viewers,
            average_viewers,
            source_url,
            created_at,
            updated_at,
            avg_chat_messages_per_min,
            bounce_rate,
            chat_message_count,
            duration,
            peak_chat_activity_time,
            peak_viewer_timestamp,
            subscriber_growth,
            total_unique_viewers,
            viewer_growth_rate,
            viewer_retention_rate,
            channel:channels (
              channel_name,
              channel_id,
              platform
            )
          `
        )
        .in('channel_id', channelIds)
        .order('start_time', { ascending: false });

      if (startDate) {
        // Use start of day for start date
        query = query.gte('start_time', startOfDay(startDate).toISOString());
      }
      if (endDate) {
        // Use end of day for end date
        query = query.lte('start_time', endOfDay(endDate).toISOString());
      }

      if (selectedChannels.length > 0) {
        query = query.in('channel_id', selectedChannels);
      }
      if (selectedPlatforms.length > 0) {
        query = query.in('platform', selectedPlatforms);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the data to match the DetailedLivestream interface
      const transformedData = (data || []).map((stream: any) => {
        // Extract the channel from the array and set it as an object
        const channelData = stream.channel && stream.channel.length > 0 ? stream.channel[0] : null;
        return {
          ...stream,
          // Replace the channel array with an object
          channel: channelData
            ? {
                channel_name: channelData.channel_name,
                channel_id: channelData.channel_id,
                platform: channelData.platform,
              }
            : undefined,
        };
      });

      setStreams(transformedData);
    } catch (error) {
      console.error('Error fetching streams:', error);
      setStreams([]);
    }
  }, [supabase, currentTeam?.id, startDate, endDate, selectedChannels, selectedPlatforms]);

  // Add effect to refetch streams when filters change
  useEffect(() => {
    fetchStreams();
  }, [selectedChannels, selectedPlatforms, startDate, endDate]);

  // Update URL when selections change
  useEffect(() => {
    const currentQuery = searchParams?.get('streams') || '';
    const newQuery = selectedStreams.length > 0 ? selectedStreams.join(',') : '';

    if (currentQuery !== newQuery) {
      if (selectedStreams.length > 0) {
        router.push(`?streams=${newQuery}`, { scroll: false });
      } else {
        router.push(pathname ?? '/', { scroll: false });
      }
    }
  }, [selectedStreams, router, searchParams]);

  // Update metrics when selected streams change
  useEffect(() => {
    if (selectedStreams.length > 0) {
      fetchAllMetrics(selectedStreams);
    }
  }, [selectedStreams, startDate, endDate]);

  // Helper function to determine if a stream is historical (outside current date range)
  const isHistoricalStream = (streamId: string) => {
    const stream = streams.find(s => s.id === streamId);
    if (!stream || !stream.start_time) return false;

    // If stream start time is before the current date range, consider it historical
    const streamStartDate = new Date(stream.start_time);
    const currentStartDate = startDate
      ? startOfDay(startDate)
      : startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

    return streamStartDate < currentStartDate;
  };

  const fetchMetrics = async (streamId: string) => {
    try {
      const query = supabase
        .from('livestream_metrics')
        .select(
          `
            timestamp,
            viewer_count,
            chat_activity
          `
        )
        .eq('livestream_id', streamId)
        .order('timestamp', { ascending: true });

      const { data, error } = await query;

      // Handle PGRST116 (no rows) gracefully
      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      // Group metrics by minute and take the latest value in each minute
      const minuteGroups = new Map<string, any>();

      (data || []).forEach((metric: any) => {
        const date = new Date(metric.timestamp);
        // Set seconds to 0 to group by minute
        date.setSeconds(0, 0);
        const minuteKey = date.toISOString();

        // Only update if this is a newer value for this minute
        if (
          !minuteGroups.has(minuteKey) ||
          new Date(metric.timestamp) > new Date(minuteGroups.get(minuteKey)!.timestamp)
        ) {
          minuteGroups.set(minuteKey, metric);
        }
      });

      // Convert the grouped data to the expected format
      const metricsData = Array.from(minuteGroups.values()).map(metric => ({
        date: Math.floor(new Date(metric.timestamp).getTime() / 1000),
        value: metric.viewer_count,
        chat_activity: metric.chat_activity || 0,
      }));

      return metricsData;
    } catch (error) {
      // Handle error silently
      return [];
    }
  };

  // Batch fetch metrics for all selected streams
  const fetchAllMetrics = useCallback(async (streamIds: string[]) => {
    setIsLoading(true);
    try {
      const results = await Promise.all(streamIds.map(streamId => fetchMetrics(streamId)));
      const newMetrics: Record<string, Metric[]> = {};
      streamIds.forEach((id, index) => {
        if (results[index]) {
          newMetrics[id] = results[index];
        }
      });
      setMetrics(newMetrics);
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      if (selectedStreams.length > 0) {
        await fetchAllMetrics(selectedStreams);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  }, [selectedStreams, fetchAllMetrics]);

  const handleChannelChange = (_event: any, newValue: Channel[]) => {
    setSelectedChannels(newValue.map(channel => channel.id));
  };

  const handlePlatformChange = (_event: any, newValue: { label: string; value: string }[]) => {
    setSelectedPlatforms(newValue.map(platform => platform.value));
  };

  const handleStreamChange = useCallback((_event: any, newValue: Livestream[]) => {
    const newStreamIds = newValue.map(stream => stream.id);
    setSelectedStreams(newStreamIds);
  }, []);

  const handleFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const filterOpen = Boolean(filterAnchorEl);

  // Handle date changes with proper start/end of day
  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date ? startOfDay(date) : null);
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date ? endOfDay(date) : null);
  };

  // Combine historical and realtime metrics for the chart
  const combinedMetrics = useMemo(() => {
    const combined: Record<string, Metric[]> = { ...metrics };

    Object.entries(realtimeMetrics).forEach(([streamId, realtimeData]) => {
      if (!combined[streamId]) combined[streamId] = [];

      // Group metrics by minute to prevent duplicates
      const minuteGroups = new Map<number, Metric>();

      // First, add existing metrics to minute groups
      combined[streamId].forEach(metric => {
        const minuteKey = Math.floor(metric.date / 60) * 60;
        minuteGroups.set(minuteKey, metric);
      });

      // Then add realtime metrics, overwriting if newer for same minute
      realtimeData.forEach((metric: any) => {
        const date = Math.floor(new Date(metric.timestamp).getTime() / 1000);
        const minuteKey = Math.floor(date / 60) * 60;

        // Only update if this is a newer value for this minute
        const existingMetric = minuteGroups.get(minuteKey);
        if (!existingMetric || date > existingMetric.date) {
          minuteGroups.set(minuteKey, {
            date,
            value: metric.viewer_count,
            chat_activity: metric.chat_activity || 0,
          });
        }
      });

      // Convert back to array and sort
      combined[streamId] = Array.from(minuteGroups.values()).sort((a, b) => a.date - b.date);
    });

    return combined;
  }, [metrics, realtimeMetrics]);

  // Subscribe to realtime updates for active livestreams
  useEffect(() => {
    const realtimeManager = RealtimeManager.getInstance();
    const unsubscribers: (() => void)[] = [];

    const subscribeToLivestream = async (streamId: string) => {
      const unsubscribe = await realtimeManager.subscribe<'livestream_metrics'>(
        `livestream_metrics:${streamId}`,
        {
          onInsert: (payload: RealtimePayload<'livestream_metrics'>) => {
            if (!payload.new) return;

            const newMetric = payload.new as LivestreamMetric;
            if (newMetric.livestream_id !== streamId) return;

            // Filter out metrics outside the selected date range
            const metricDate = new Date(newMetric.timestamp);
            if (
              (startDate && metricDate < startOfDay(startDate)) ||
              (endDate && metricDate > endOfDay(endDate))
            ) {
              return;
            }

            setRealtimeMetrics(prev => {
              const existingMetrics = prev[streamId] || [];
              return {
                ...prev,
                [streamId]: [...existingMetrics, newMetric],
              };
            });
          },
          onError: () => {
            // Handle error silently
          },
        }
      );
      unsubscribers.push(unsubscribe);
    };

    // Only subscribe to selected active streams
    const activeStreams = streams.filter(
      stream => stream.is_active && selectedStreams.includes(stream.id)
    );

    // Clean up any existing subscriptions for streams that are no longer selected
    setRealtimeMetrics(prev => {
      const newMetrics = { ...prev };
      Object.keys(newMetrics).forEach(streamId => {
        if (!selectedStreams.includes(streamId)) {
          delete newMetrics[streamId];
        }
      });
      return newMetrics;
    });

    // Subscribe to currently selected active streams
    activeStreams.forEach(stream => {
      subscribeToLivestream(stream.id);
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [streams, selectedStreams]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <PageLayout title="Metrics">
        <Container
          className="metrics-container"
          maxWidth={false}
          sx={{
            py: 3,
            px: { xs: 2, lg: 3 },
            flex: 1,
            overflowY: 'auto',
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          <Box maxWidth="lg" sx={{ mx: 'auto' }}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid
                  size={{
                    xs: 12,
                    md: 6,
                  }}
                >
                  <Autocomplete
                    multiple
                    value={streams.filter(s => selectedStreams.includes(s.id))}
                    onChange={handleStreamChange}
                    options={streams}
                    getOptionLabel={option => {
                      const date = new Date(option.start_time).toLocaleDateString();
                      const platform =
                        option.platform.charAt(0).toUpperCase() + option.platform.slice(1);
                      const channel =
                        (channels || []).find(c => c.id === option.channel_id)?.channel_name ||
                        'Unknown Channel';
                      return `${date} - ${platform} - ${option.title} - ${channel}`;
                    }}
                    renderInput={params => <TextField {...params} label="Livestreams" fullWidth />}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                  />
                </Grid>
                <Grid
                  size={{
                    xs: 12,
                    md: 5,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <DatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                    <DatePicker
                      label="End Date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      slotProps={{ textField: { size: 'small' } }}
                    />
                  </Box>
                </Grid>
                <Grid
                  sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}
                  size={{
                    xs: 12,
                    md: 1,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <MuiTooltip title="Refresh Data">
                      <span>
                        <IconButton onClick={handleRefresh} disabled={isLoading}>
                          <RefreshIcon />
                        </IconButton>
                      </span>
                    </MuiTooltip>
                    <MuiTooltip title="Filters">
                      <IconButton onClick={handleFilterClick}>
                        <FilterListIcon />
                      </IconButton>
                    </MuiTooltip>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            <Popover
              open={filterOpen}
              anchorEl={filterAnchorEl}
              onClose={handleFilterClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <FilterPopover
                channels={channels}
                selectedChannels={selectedChannels}
                selectedPlatforms={selectedPlatforms}
                onChannelChange={handleChannelChange}
                onPlatformChange={handlePlatformChange}
              />
            </Popover>

            {selectedStreams.length > 0 && !isLoading ? (
              <Box sx={{ mb: 4 }}>
                <Paper sx={{ p: 3, mb: 3, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                    <MuiTooltip title="Export Data">
                      <span>
                        <IconButton
                          onClick={() => {
                            // Get all selected streams
                            const selectedStreamData = streams
                              .filter(stream => selectedStreams.includes(stream.id))
                              .map(stream => ({
                                id: stream.id,
                                title: stream.title,
                                metrics: combinedMetrics[stream.id] || [],
                              }));

                            // Get all unique timestamps across all streams
                            const allTimestamps = new Set<number>();
                            selectedStreamData.forEach(stream => {
                              stream.metrics.forEach(metric => {
                                // Round to nearest second
                                allTimestamps.add(Math.round(metric.date));
                              });
                            });

                            // Sort timestamps
                            const sortedTimestamps = Array.from(allTimestamps).sort(
                              (a, b) => a - b
                            );

                            // Create headers with escaped titles
                            const headers = [
                              'Timestamp',
                              ...selectedStreamData.map(s => {
                                // Escape quotes and wrap in quotes to handle commas
                                const escapedTitle = s.title.replace(/"/g, '""');
                                return `"${escapedTitle}"`;
                              }),
                            ];
                            const csvRows = [headers.join(',')];

                            // Create data rows
                            sortedTimestamps.forEach(timestamp => {
                              const row = [new Date(timestamp * 1000).toISOString()];

                              selectedStreamData.forEach(stream => {
                                // Find the metric closest to this timestamp
                                const metric = stream.metrics.find(
                                  m => Math.round(m.date) === timestamp
                                );
                                row.push(metric ? metric.value.toString() : '');
                              });

                              csvRows.push(row.join(','));
                            });

                            // Create and trigger download
                            const csvContent = csvRows.join('\n');
                            const blob = new Blob([csvContent], {
                              type: 'text/csv;charset=utf-8;',
                            });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = 'metrics_export.csv';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          disabled={selectedStreams.length === 0 || isLoading}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': { bgcolor: 'primary.dark' },
                          }}
                        >
                          <DownloadIcon />
                        </IconButton>
                      </span>
                    </MuiTooltip>
                  </Box>
                  <MetricsChart
                    metrics={combinedMetrics}
                    selectedStreams={selectedStreams}
                    streams={streams}
                  />
                </Paper>

                {/* Stream Details Cards */}
                <Grid container spacing={3} sx={{ mb: 4, width: '100%' }}>
                  {streams
                    .filter(stream => selectedStreams.includes(stream.id))
                    .map((stream, index) => (
                      <Grid key={stream.id} size={12}>
                        <StreamDetails
                          stream={stream}
                          metrics={combinedMetrics[stream.id] || []}
                          index={index}
                          streams={streams}
                        />
                      </Grid>
                    ))}
                </Grid>
              </Box>
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                  No Streams Selected
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Select one or more streams from the dropdown above to view metrics
                </Typography>
              </Paper>
            )}
          </Box>
        </Container>
      </PageLayout>
      <ChatPane open={chatOpen} onClose={() => setChatOpen(false)} />
    </LocalizationProvider>
  );
}

export default function MetricsPage() {
  return (
    <SubscriptionGuard requiredTier="pro" featureName="metrics">
      <MetricsPageContent />
    </SubscriptionGuard>
  );
}
