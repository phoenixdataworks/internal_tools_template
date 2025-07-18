# Internal Tools Template - Performance Optimization Guide

## Frontend Optimization

### React Component Optimization

#### 1. Memoization Strategies

```typescript
// ✅ Good: Use React.memo for expensive components
import React from 'react';

interface ExpensiveListProps {
  items: any[];
  onItemClick: (item: any) => void;
}

export const ExpensiveList = React.memo<ExpensiveListProps>(({ items, onItemClick }) => {
  return (
    <div>
      {items.map(item => (
        <ExpensiveItem key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
});

// ✅ Good: Use useMemo for expensive calculations
export function TeamDashboard({ teamId, data }: { teamId: string; data: any[] }) {
  const filteredData = useMemo(() =>
    data.filter(item => item.teamId === teamId),
    [data, teamId]
  );

  const sortedData = useMemo(() =>
    filteredData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [filteredData]
  );

  return (
    <div>
      <ExpensiveList items={sortedData} onItemClick={handleItemClick} />
    </div>
  );
}

// ✅ Good: Use useCallback for event handlers
export function TeamActions({ teamId, onSuccess }: { teamId: string; onSuccess: () => void }) {
  const handleDelete = useCallback(async () => {
    try {
      await deleteTeam(teamId);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  }, [teamId, onSuccess]);

  const handleUpdate = useCallback(async (updates: any) => {
    try {
      await updateTeam(teamId, updates);
      onSuccess();
    } catch (error) {
      console.error('Failed to update team:', error);
    }
  }, [teamId, onSuccess]);

  return (
    <div>
      <button onClick={handleDelete}>Delete Team</button>
      <button onClick={() => handleUpdate({ name: 'New Name' })}>Update Team</button>
    </div>
  );
}
```

#### 2. Code Splitting

```typescript
// ✅ Good: Lazy load heavy components
import { lazy, Suspense } from 'react';

const ExpensiveChart = lazy(() => import('@/components/custom/ExpensiveChart'));
const DataTable = lazy(() => import('@/components/custom/DataTable'));

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      <Suspense fallback={<div>Loading chart...</div>}>
        <ExpensiveChart />
      </Suspense>

      <Suspense fallback={<div>Loading table...</div>}>
        <DataTable />
      </Suspense>
    </div>
  );
}

// ✅ Good: Route-based code splitting
// src/app/(authenticated)/analytics/page.tsx
import { lazy } from 'react';

const AnalyticsDashboard = lazy(() => import('@/components/custom/AnalyticsDashboard'));

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Loading analytics...</div>}>
      <AnalyticsDashboard />
    </Suspense>
  );
}
```

#### 3. Bundle Optimization

```typescript
// next.config.mjs
const nextConfig = {
  // Enable bundle analyzer
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Optimize bundle size
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
        },
      },
    };

    return config;
  },

  // Enable compression
  compress: true,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};
```

### State Management Optimization

#### 1. React Query Optimization

```typescript
// ✅ Good: Optimize React Query usage
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Use proper query keys
const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (filters: string) => [...teamKeys.lists(), { filters }] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (id: string) => [...teamKeys.details(), id] as const,
};

// Optimize queries with proper caching
export function useTeams(filters?: any) {
  return useQuery({
    queryKey: teamKeys.list(JSON.stringify(filters)),
    queryFn: () => fetchTeams(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => fetchTeam(teamId),
    enabled: !!teamId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Optimize mutations
export function useUpdateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTeam,
    onSuccess: updatedTeam => {
      // Update cache optimistically
      queryClient.setQueryData(teamKeys.detail(updatedTeam.id), updatedTeam);

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: teamKeys.lists() });
    },
    onError: (error, variables) => {
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(variables.id) });
    },
  });
}
```

#### 2. Context Optimization

```typescript
// ✅ Good: Optimize context providers
import { createContext, useContext, useMemo, useCallback } from 'react';

interface TeamContextValue {
  currentTeam: Team | null;
  setCurrentTeam: (team: Team | null) => void;
  isAdmin: boolean;
  canEdit: boolean;
}

const TeamContext = createContext<TeamContextValue | null>(null);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Memoize computed values
  const isAdmin = useMemo(() => userRole === 'admin', [userRole]);
  const canEdit = useMemo(() => ['admin', 'editor'].includes(userRole || ''), [userRole]);

  // Memoize context value
  const value = useMemo(() => ({
    currentTeam,
    setCurrentTeam,
    isAdmin,
    canEdit,
  }), [currentTeam, isAdmin, canEdit]);

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

// ✅ Good: Custom hook for context
export function useTeam() {
  const context = useContext(TeamContext);
  if (!context) {
    throw new Error('useTeam must be used within TeamProvider');
  }
  return context;
}
```

### Real-time Optimization

#### 1. WebSocket Connection Management

```typescript
// ✅ Good: Optimize real-time subscriptions
import { useEffect, useRef } from 'react';

export function useTeamRealtime(teamId: string) {
  const subscriptionRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!teamId) return;

    // Create subscription
    const subscription = supabase
      .channel(`team-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
          filter: `id=eq.${teamId}`,
        },
        payload => {
          // Handle team updates
          console.log('Team updated:', payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_members',
          filter: `team_id=eq.${teamId}`,
        },
        payload => {
          // Handle member updates
          console.log('Member updated:', payload);
        }
      )
      .subscribe();

    subscriptionRef.current = subscription;

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [teamId]);

  return subscriptionRef.current;
}

// ✅ Good: Batch real-time updates
export function useBatchedUpdates<T>(callback: (updates: T[]) => void) {
  const batchRef = useRef<T[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addToBatch = useCallback(
    (update: T) => {
      batchRef.current.push(update);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        if (batchRef.current.length > 0) {
          callback(batchRef.current);
          batchRef.current = [];
        }
      }, 100); // Batch updates within 100ms
    },
    [callback]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return addToBatch;
}
```

## Database Optimization

### Query Optimization

#### 1. Efficient Queries

```typescript
// ✅ Good: Select only needed columns
const { data: teams } = await supabase
  .from('teams')
  .select('id, name, slug, created_at')
  .eq('id', teamId);

// ✅ Good: Use proper joins
const { data: teamWithMembers } = await supabase
  .from('teams')
  .select(
    `
    id,
    name,
    slug,
    team_members!inner(
      user_id,
      role,
      profiles!inner(
        email,
        full_name
      )
    )
  `
  )
  .eq('id', teamId);

// ✅ Good: Use pagination
const { data: teams, count } = await supabase
  .from('teams')
  .select('*', { count: 'exact' })
  .range(0, 9)
  .order('created_at', { ascending: false });

// ✅ Good: Use filters efficiently
const { data: recentTeams } = await supabase
  .from('teams')
  .select('*')
  .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  .order('created_at', { ascending: false });
```

#### 2. Indexing Strategy

```sql
-- ✅ Good: Add indexes for frequently queried columns
CREATE INDEX idx_teams_created_at ON teams(created_at DESC);
CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX idx_team_members_user_role ON team_members(user_id, role);
CREATE INDEX idx_chat_comments_thread_created ON chat_comments(thread_id, created_at DESC);

-- ✅ Good: Partial indexes for filtered queries
CREATE INDEX idx_active_teams ON teams(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_admin_members ON team_members(team_id, user_id) WHERE role = 'admin';

-- ✅ Good: Composite indexes for complex queries
CREATE INDEX idx_team_activity ON chat_comments(team_id, created_at DESC, thread_id);
```

#### 3. Connection Pooling

```typescript
// ✅ Good: Use connection pooling in production
// supabase/config.toml
[api];
enabled = true;
port = 54321;
schemas = ['public', 'storage', 'graphql_public'];
extra_search_path = ['public', 'extensions'];
max_rows = (1000)[db];
port = 54322;
shadow_port = 54320;
major_version = (15)[db.pooler];
enabled = true;
port = 54329;
pool_mode = 'transaction';
default_pool_size = 15;
max_client_conn = 100;
```

### Caching Strategy

#### 1. Application-Level Caching

```typescript
// ✅ Good: Implement caching utilities
class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttl: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

const cacheManager = new CacheManager();

// ✅ Good: Use caching in API routes
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');

  if (!teamId) {
    return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = `team-${teamId}`;
  const cachedData = cacheManager.get(cacheKey);
  if (cachedData) {
    return NextResponse.json(cachedData);
  }

  // Fetch from database
  const { data, error } = await supabase.from('teams').select('*').eq('id', teamId).single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cache the result
  cacheManager.set(cacheKey, data, 5 * 60 * 1000); // 5 minutes

  return NextResponse.json(data);
}
```

#### 2. React Query Caching

```typescript
// ✅ Good: Configure React Query for optimal caching
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// ✅ Good: Prefetch data
export function prefetchTeam(teamId: string) {
  return queryClient.prefetchQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: () => fetchTeam(teamId),
    staleTime: 10 * 60 * 1000,
  });
}
```

## Network Optimization

### API Optimization

#### 1. Request Batching

```typescript
// ✅ Good: Batch multiple requests
export async function batchFetchTeams(teamIds: string[]) {
  const { data, error } = await supabase.from('teams').select('*').in('id', teamIds);

  if (error) throw error;
  return data;
}

// ✅ Good: Use GraphQL for complex queries
const GET_TEAM_WITH_MEMBERS = `
  query GetTeamWithMembers($teamId: UUID!) {
    teams_by_pk(id: $teamId) {
      id
      name
      slug
      team_members {
        user_id
        role
        profiles {
          email
          full_name
        }
      }
    }
  }
`;

export async function fetchTeamWithMembers(teamId: string) {
  const { data, error } = await supabase.rpc('graphql', {
    query: GET_TEAM_WITH_MEMBERS,
    variables: { teamId },
  });

  if (error) throw error;
  return data;
}
```

#### 2. Response Compression

```typescript
// ✅ Good: Enable compression in Next.js
// next.config.mjs
const nextConfig = {
  compress: true,
  poweredByHeader: false,

  // Optimize headers
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600',
          },
        ],
      },
    ];
  },
};
```

### Asset Optimization

#### 1. Image Optimization

```typescript
// ✅ Good: Use Next.js Image component
import Image from 'next/image';

export function TeamLogo({ team, size = 64 }: { team: Team; size?: number }) {
  return (
    <Image
      src={team.logo_url || '/default-team-logo.png'}
      alt={`${team.name} logo`}
      width={size}
      height={size}
      className="rounded-full"
      priority={size > 100} // Prioritize larger images
    />
  );
}

// ✅ Good: Optimize image loading
export function OptimizedImageGrid({ images }: { images: string[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {images.map((src, index) => (
        <Image
          key={src}
          src={src}
          alt={`Image ${index + 1}`}
          width={200}
          height={200}
          className="object-cover rounded"
          loading={index < 4 ? 'eager' : 'lazy'} // Load first 4 images eagerly
        />
      ))}
    </div>
  );
}
```

#### 2. Font Optimization

```typescript
// ✅ Good: Optimize font loading
import { Inter, Roboto } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

// ✅ Good: Use in layout
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
```

## Monitoring and Analytics

### Performance Monitoring

#### 1. Core Web Vitals

```typescript
// ✅ Good: Monitor Core Web Vitals
import { useEffect } from 'react';

export function usePerformanceMonitoring() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log('LCP:', lastEntry.startTime);

        // Send to analytics
        if (lastEntry.startTime > 2500) {
          console.warn('LCP is too slow:', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          console.log('FID:', entry.processingStart - entry.startTime);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver(list => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        console.log('CLS:', clsValue);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);
}
```

#### 2. Custom Performance Metrics

```typescript
// ✅ Good: Track custom performance metrics
export function useCustomMetrics() {
  const trackMetric = useCallback((name: string, value: number) => {
    if (typeof window !== 'undefined') {
      // Send to analytics service
      console.log(`Metric: ${name} = ${value}`);

      // Use Performance API
      performance.mark(`${name}-start`);
      performance.measure(name, `${name}-start`);
    }
  }, []);

  const trackApiCall = useCallback(
    async (name: string, apiCall: () => Promise<any>) => {
      const start = performance.now();
      try {
        const result = await apiCall();
        const duration = performance.now() - start;
        trackMetric(`${name}-success`, duration);
        return result;
      } catch (error) {
        const duration = performance.now() - start;
        trackMetric(`${name}-error`, duration);
        throw error;
      }
    },
    [trackMetric]
  );

  return { trackMetric, trackApiCall };
}
```

### Error Tracking

```typescript
// ✅ Good: Comprehensive error tracking
export function useErrorTracking() {
  const trackError = useCallback((error: Error, context?: any) => {
    console.error('Error tracked:', {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  }, []);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      trackError(new Error(event.reason), { type: 'unhandled-rejection' });
    };

    const handleError = (event: ErrorEvent) => {
      trackError(event.error, { type: 'error-event' });
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, [trackError]);

  return { trackError };
}
```

## Best Practices Summary

### Performance Checklist

- [ ] **React Optimization**
  - [ ] Use React.memo for expensive components
  - [ ] Implement useMemo and useCallback appropriately
  - [ ] Lazy load heavy components
  - [ ] Optimize re-renders

- [ ] **State Management**
  - [ ] Configure React Query caching properly
  - [ ] Optimize context providers
  - [ ] Use proper query keys
  - [ ] Implement optimistic updates

- [ ] **Database**
  - [ ] Add appropriate indexes
  - [ ] Use efficient queries
  - [ ] Implement connection pooling
  - [ ] Use pagination for large datasets

- [ ] **Network**
  - [ ] Enable compression
  - [ ] Implement caching strategies
  - [ ] Optimize API responses
  - [ ] Use CDN for static assets

- [ ] **Monitoring**
  - [ ] Track Core Web Vitals
  - [ ] Monitor custom metrics
  - [ ] Implement error tracking
  - [ ] Set up performance alerts

### Performance Targets

- **Page Load Time**: < 2 seconds
- **Time to Interactive**: < 3 seconds
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms
- **API Response Time**: < 200ms
- **Database Query Time**: < 100ms

This optimization guide provides comprehensive strategies for optimizing the performance of internal tools built with this template, ensuring fast, responsive, and scalable applications.
