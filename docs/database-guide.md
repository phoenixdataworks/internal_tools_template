# StreamTrack - Database Guide

## Overview

StreamTrack uses PostgreSQL through Supabase as its primary database. The schema is designed to support multi-tenancy, real-time features, and comprehensive analytics tracking.

## Schema Design

### Core Tables

#### 1. Profiles

```sql
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text,
    avatar_url text,
    email text unique,
    is_super_admin boolean default false,
    onboarding_status onboarding_status default 'pending',
    current_team_id uuid references public.teams(id) on delete set null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
```

#### 2. Teams

```sql
create table public.teams (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    slug text unique not null,
    logo_url text,
    max_members int default 3,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);
```

#### 3. Team Members

```sql
create table public.team_members (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams on delete cascade,
    user_id uuid references public.profiles(id) on delete cascade,
    role text not null check (role in ('admin', 'member')),
    created_at timestamptz default now(),
    unique (team_id, user_id)
);
```

### Monitoring Tables

#### 1. Channels

```sql
create table public.channels (
    id uuid default gen_random_uuid() primary key,
    platform platform not null,
    channel_id text not null,
    channel_name text,
    source_url text,
    is_monitored boolean default false,
    last_checked timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(platform, channel_id)
);
```

#### 2. Livestreams

```sql
create table public.livestreams (
    id uuid default gen_random_uuid() primary key,
    platform platform not null,
    channel_id uuid references public.channels(id) on delete cascade,
    video_id text not null,
    title text not null,
    start_time timestamptz not null,
    end_time timestamptz,
    is_active boolean default true,
    average_viewers float,
    peak_viewers integer,
    peak_viewer_timestamp timestamptz,
    duration integer,
    total_unique_viewers integer,
    chat_message_count integer,
    avg_chat_messages_per_min float,
    peak_chat_activity_time timestamptz,
    viewer_retention_rate float,
    subscriber_growth integer,
    viewer_growth_rate float,
    bounce_rate float,
    source_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(platform, video_id)
);
```

## Row Level Security (RLS)

### 1. Profile Policies

```sql
-- Users can view their own profile
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);
```

### 2. Team Policies

```sql
-- Team members can view their teams
create policy "Team members can view their teams"
    on public.teams for select
    using (
        id in (
            select team_id from public.team_members
            where user_id = auth.uid()
        )
    );

-- Team admins can update their teams
create policy "Team admins can update their teams"
    on public.teams for update
    using (
        exists (
            select 1 from public.team_members
            where team_id = id
            and user_id = auth.uid()
            and role = 'admin'
        )
    );
```

## Database Functions

### 1. Team Management

```sql
-- Create team with subscription
create or replace function public.create_team_with_subscription(
    team_name text,
    team_slug text,
    user_id uuid,
    tier subscription_tier DEFAULT 'free'::subscription_tier
) returns json
language plpgsql security definer
as $$
    -- Function implementation details in migrations
$$;

-- Check team member limit
create or replace function public.can_add_team_member(team_id uuid)
returns boolean
language plpgsql security definer
as $$
    -- Function implementation details in migrations
$$;
```

### 2. Notification System

```sql
-- Create notification
create or replace function public.create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text,
    p_data jsonb default null
) returns uuid
language plpgsql security definer
as $$
    -- Function implementation details in migrations
$$;
```

## Optimization Strategies

### 1. Indexing Strategy

Key indexes for performance:

```sql
-- Team-related indexes
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_user_id_idx on public.team_members(user_id);

-- Monitoring-related indexes
create index channels_platform_idx on public.channels(platform);
create index livestreams_channel_id_idx on public.livestreams(channel_id);
create index livestream_metrics_timestamp_idx on public.livestream_metrics(timestamp);
```

### 2. Query Optimization

#### Common Query Patterns

1. Team Member Lookup

```sql
select tm.*, p.full_name, p.avatar_url
from public.team_members tm
join public.profiles p on p.id = tm.user_id
where tm.team_id = :team_id;
```

2. Active Streams Query

```sql
select l.*, c.channel_name
from public.livestreams l
join public.channels c on c.id = l.channel_id
where l.is_active = true
and c.id in (
    select channel_id
    from public.team_channel_subscriptions
    where team_id = :team_id
);
```

### 3. Real-time Optimization

Tables enabled for real-time:

```sql
create publication supabase_realtime for table
    public.chat_threads,
    public.chat_comments,
    public.chat_reactions,
    public.chat_read_receipts,
    public.notifications,
    public.livestreams,
    public.livestream_metrics
with (publish = 'insert,update,delete');
```

## Maintenance Procedures

### 1. Regular Maintenance

- Run VACUUM ANALYZE daily
- Monitor table bloat
- Review and update statistics
- Check index usage

### 2. Performance Monitoring

- Track slow queries
- Monitor connection pools
- Check cache hit ratios
- Review real-time subscription load

### 3. Backup Strategy

- Daily full backups
- Point-in-time recovery enabled
- Regular backup testing
- Retention policy enforcement

## Best Practices

### 1. Schema Changes

- Use migrations for all changes
- Test migrations on staging
- Include rollback procedures
- Document schema changes

### 2. Query Writing

- Use parameterized queries
- Implement proper joins
- Avoid N+1 queries
- Use appropriate indexes

### 3. Security

- Implement RLS policies
- Use security definer functions
- Regular security audits
- Monitor access patterns

## Troubleshooting Guide

### 1. Common Issues

- Connection timeouts
- Slow queries
- Real-time disconnections
- RLS policy conflicts

### 2. Monitoring Queries

```sql
-- Check active queries
select pid, query, query_start, state
from pg_stat_activity
where state != 'idle';

-- Find slow queries
select pid, query, query_start, now() - query_start as duration
from pg_stat_activity
where state = 'active'
and now() - query_start > interval '5 seconds';
```

### 3. Performance Analysis

```sql
-- Check index usage
select schemaname, tablename, indexname, idx_scan, idx_tup_read
from pg_stat_user_indexes
order by idx_scan desc;

-- Table statistics
select relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
from pg_stat_user_tables;
```
