# Internal Tools Template - Database Guide

## Overview

This guide covers the database architecture, schema design, and best practices for the Internal Tools Template. The template uses PostgreSQL via Supabase with Row Level Security (RLS) for multi-tenant data isolation.

## Database Architecture

### Core Tables

The template provides a complete database schema for team-based applications:

```sql
-- User profiles (extends Supabase Auth)
profiles
├── id (UUID, references auth.users)
├── email (CITEXT, unique)
├── full_name (TEXT)
├── avatar_url (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

-- Teams for multi-tenant support
teams
├── id (UUID, primary key)
├── name (TEXT, not null)
├── slug (CITEXT, unique)
├── logo_url (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

-- Team membership with roles
team_members
├── team_id (UUID, references teams)
├── user_id (UUID, references profiles)
├── role (USER_ROLE enum: 'admin', 'member')
├── created_at (TIMESTAMPTZ)
└── Primary key: (team_id, user_id)

-- Team join requests
team_join_requests
├── id (UUID, primary key)
├── team_id (UUID, references teams)
├── user_id (UUID, references profiles)
├── status (REQUEST_STATUS enum: 'pending', 'approved', 'rejected')
├── message (TEXT)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

-- Chat system
chat_threads
├── id (UUID, primary key)
├── title (TEXT, not null)
├── content (TEXT, not null)
├── team_id (UUID, references teams)
├── created_by (UUID, references profiles)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

-- Chat comments
chat_comments
├── id (UUID, primary key)
├── thread_id (UUID, references chat_threads)
├── content (JSONB, rich text content)
├── created_by (UUID, references profiles)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

-- Chat reactions
chat_reactions
├── id (UUID, primary key)
├── comment_id (UUID, references chat_comments)
├── user_id (UUID, references profiles)
├── reaction_type (TEXT, not null)
├── created_at (TIMESTAMPTZ)
└── Primary key: (comment_id, user_id, reaction_type)

-- Read receipts
chat_read_receipts
├── thread_id (UUID, references chat_threads)
├── user_id (UUID, references profiles)
├── last_read_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── Primary key: (thread_id, user_id)

-- Notifications
notifications
├── id (UUID, primary key)
├── user_id (UUID, references profiles)
├── title (TEXT, not null)
├── message (TEXT, not null)
├── type (NOTIFICATION_TYPE enum: 'info', 'warning', 'error', 'success')
├── read (BOOLEAN, default false)
├── data (JSONB, additional data)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## Row Level Security (RLS)

### Security Policies

The template implements comprehensive RLS policies for data isolation:

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Teams policies
CREATE POLICY "Team members can view team"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can update team"
  ON teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = teams.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Team members policies
CREATE POLICY "Team members can view team members"
  ON team_members FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team admins can manage team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_id = team_members.team_id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Chat policies
CREATE POLICY "Team members can view chat threads"
  ON chat_threads FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create chat threads"
  ON chat_threads FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can view chat comments"
  ON chat_comments FOR SELECT
  USING (
    thread_id IN (
      SELECT id FROM chat_threads
      WHERE team_id IN (
        SELECT team_id FROM team_members
        WHERE user_id = auth.uid()
      )
    )
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
```

## Custom Table Development

### Adding Custom Tables

When building custom features, create new tables following the template patterns:

```sql
-- Example: Custom business data table
CREATE TABLE custom_business_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  data JSONB,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_business_data ENABLE ROW LEVEL SECURITY;

-- Add RLS policies following template pattern
CREATE POLICY "Team members can access custom data"
  ON custom_business_data FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Add indexes for performance
CREATE INDEX idx_custom_business_data_team_id ON custom_business_data(team_id);
CREATE INDEX idx_custom_business_data_created_by ON custom_business_data(created_by);
CREATE INDEX idx_custom_business_data_status ON custom_business_data(status);
CREATE INDEX idx_custom_business_data_created_at ON custom_business_data(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER set_custom_business_data_updated_at
  BEFORE UPDATE ON custom_business_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Migration Best Practices

```sql
-- ✅ Good: Use proper migration structure
-- Migration: 20241201000000_add_custom_feature.sql

-- Add new enum type
CREATE TYPE custom_status AS ENUM ('draft', 'active', 'archived');

-- Add new table
CREATE TABLE custom_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status custom_status DEFAULT 'draft',
  config JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE custom_features ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Team members can access custom features"
  ON custom_features FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Add indexes
CREATE INDEX idx_custom_features_team_id ON custom_features(team_id);
CREATE INDEX idx_custom_features_status ON custom_features(status);
CREATE INDEX idx_custom_features_created_at ON custom_features(created_at DESC);

-- Add trigger
CREATE TRIGGER set_custom_features_updated_at
  BEFORE UPDATE ON custom_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE custom_features IS 'Custom features for teams';
COMMENT ON COLUMN custom_features.config IS 'Feature configuration as JSON';
```

## Database Functions and Triggers

### Utility Functions

```sql
-- Update updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate slug from name
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Check if user is team admin
CREATE OR REPLACE FUNCTION is_team_admin(team_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid
    AND user_id = user_uuid
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql;

-- Get user's teams
CREATE OR REPLACE FUNCTION get_user_teams(user_uuid UUID)
RETURNS TABLE (
  team_id UUID,
  team_name TEXT,
  team_slug TEXT,
  user_role user_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tm.team_id,
    t.name,
    t.slug,
    tm.role
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql;
```

### Triggers

```sql
-- Auto-update updated_at columns
CREATE TRIGGER set_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_chat_threads_updated_at
  BEFORE UPDATE ON chat_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate slug for teams
CREATE OR REPLACE FUNCTION set_team_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_team_slug_trigger
  BEFORE INSERT OR UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_team_slug();
```

## Query Optimization

### Efficient Queries

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

### Complex Queries

```typescript
// ✅ Good: Use RPC for complex queries
const { data: teamStats } = await supabase.rpc('get_team_statistics', {
  team_id: teamId,
  start_date: startDate,
  end_date: endDate,
});

// ✅ Good: Use materialized views for heavy analytics
const { data: analytics } = await supabase
  .from('team_analytics_materialized')
  .select('*')
  .eq('team_id', teamId)
  .gte('date', startDate)
  .lte('date', endDate);
```

## Indexing Strategy

### Performance Indexes

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

-- ✅ Good: Text search indexes
CREATE INDEX idx_teams_name_search ON teams USING gin(to_tsvector('english', name));
CREATE INDEX idx_chat_content_search ON chat_comments USING gin(to_tsvector('english', content->>'text'));
```

### Index Maintenance

```sql
-- Analyze table statistics
ANALYZE teams;
ANALYZE team_members;
ANALYZE chat_comments;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

## Data Validation

### Check Constraints

```sql
-- ✅ Good: Add data validation constraints
ALTER TABLE teams ADD CONSTRAINT teams_name_length
  CHECK (char_length(name) >= 1 AND char_length(name) <= 100);

ALTER TABLE teams ADD CONSTRAINT teams_slug_format
  CHECK (slug ~ '^[a-z0-9-]+$');

ALTER TABLE team_members ADD CONSTRAINT team_members_valid_role
  CHECK (role IN ('admin', 'member'));

ALTER TABLE notifications ADD CONSTRAINT notifications_valid_type
  CHECK (type IN ('info', 'warning', 'error', 'success'));
```

### Custom Validation Functions

```sql
-- ✅ Good: Custom validation functions
CREATE OR REPLACE FUNCTION validate_team_name(name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check length
  IF char_length(name) < 1 OR char_length(name) > 100 THEN
    RETURN FALSE;
  END IF;

  -- Check for profanity (example)
  IF name ILIKE '%badword%' THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Use in constraint
ALTER TABLE teams ADD CONSTRAINT teams_valid_name
  CHECK (validate_team_name(name));
```

## Backup and Recovery

### Backup Strategy

```sql
-- ✅ Good: Create backup functions
CREATE OR REPLACE FUNCTION backup_team_data(team_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  backup_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'team', to_jsonb(t.*),
    'members', (
      SELECT jsonb_agg(to_jsonb(tm.*))
      FROM team_members tm
      WHERE tm.team_id = team_uuid
    ),
    'threads', (
      SELECT jsonb_agg(to_jsonb(ct.*))
      FROM chat_threads ct
      WHERE ct.team_id = team_uuid
    )
  ) INTO backup_data
  FROM teams t
  WHERE t.id = team_uuid;

  RETURN backup_data;
END;
$$ LANGUAGE plpgsql;
```

### Data Archival

```sql
-- ✅ Good: Archive old data
CREATE TABLE archived_notifications (
  LIKE notifications INCLUDING ALL
);

CREATE OR REPLACE FUNCTION archive_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  INSERT INTO archived_notifications
  SELECT * FROM notifications
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND read = true;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  DELETE FROM notifications
  WHERE created_at < NOW() - INTERVAL '1 year'
  AND read = true;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring and Maintenance

### Performance Monitoring

```sql
-- ✅ Good: Monitor query performance
SELECT
  query,
  calls,
  total_time,
  mean_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%teams%'
ORDER BY total_time DESC
LIMIT 10;

-- ✅ Good: Monitor table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Maintenance Tasks

```sql
-- ✅ Good: Regular maintenance
-- Vacuum tables
VACUUM ANALYZE teams;
VACUUM ANALYZE team_members;
VACUUM ANALYZE chat_comments;

-- Update statistics
ANALYZE;

-- Clean up old data
SELECT archive_old_notifications();
```

## Best Practices Summary

### Database Design

- [ ] **Follow template patterns** for all custom tables
- [ ] **Enable RLS** on all tables
- [ ] **Add proper indexes** for performance
- [ ] **Use constraints** for data validation
- [ ] **Include audit columns** (created_at, updated_at, created_by)

### Security

- [ ] **Implement RLS policies** for all tables
- [ ] **Validate team membership** in all queries
- [ ] **Use parameterized queries** to prevent SQL injection
- [ ] **Limit database permissions** to minimum required
- [ ] **Encrypt sensitive data** at rest

### Performance

- [ ] **Add indexes** for frequently queried columns
- [ ] **Use efficient queries** with proper joins
- [ ] **Implement pagination** for large datasets
- [ ] **Monitor query performance** regularly
- [ ] **Archive old data** to maintain performance

### Maintenance

- [ ] **Create regular backups** of important data
- [ ] **Monitor database size** and growth
- [ ] **Update statistics** regularly
- [ ] **Clean up old data** periodically
- [ ] **Test migrations** in staging environment

This database guide provides comprehensive coverage of the template's database architecture and best practices for extending it with custom features while maintaining security and performance.
