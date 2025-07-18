# Template Database Schema

This document describes the database schema provided by the template.

## Database Overview

The template uses PostgreSQL via Supabase with Row Level Security (RLS) for team-based data isolation.

## Core Tables

### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: User profiles and authentication data
**RLS Policies**:

- Users can view their own profile
- Users can update their own profile
- Users can create their own profile during authentication

### Teams Table

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Team information and management
**RLS Policies**:

- Team members can view their teams
- Team admins can update their teams
- Team admins can delete their teams

### Team Members Table

```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

**Purpose**: Team membership with roles
**RLS Policies**:

- Users can view their team memberships
- Team admins can manage team members
- Users can view other members in their teams

### Team Join Requests Table

```sql
CREATE TABLE team_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

**Purpose**: Team join request workflow
**RLS Policies**:

- Users can view their own join requests
- Team admins can view join requests for their teams
- Team admins can approve/reject join requests

## Chat System Tables

### Chat Threads Table

```sql
CREATE TABLE chat_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Team-based conversations
**RLS Policies**:

- Team members can view threads in their teams
- Team members can create threads in their teams
- Thread creators can update their threads
- Team admins can delete threads in their teams

### Chat Comments Table

```sql
CREATE TABLE chat_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: Conversation messages
**RLS Policies**:

- Team members can view comments in their team threads
- Team members can create comments in their team threads
- Comment creators can update their comments
- Team admins can delete comments in their teams

### Chat Reactions Table

```sql
CREATE TABLE chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES chat_comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id, reaction_type)
);
```

**Purpose**: Message reactions
**RLS Policies**:

- Team members can view reactions in their team comments
- Team members can add reactions to comments in their teams
- Users can remove their own reactions

### Chat Read Receipts Table

```sql
CREATE TABLE chat_read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES chat_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);
```

**Purpose**: Read status tracking
**RLS Policies**:

- Users can view their own read receipts
- Users can update their own read receipts
- Team members can view read receipts in their team threads

## Notifications Table

### Notifications Table

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose**: User notifications system
**RLS Policies**:

- Users can view their own notifications
- Users can update their own notifications
- System can create notifications for users

## Custom Types

### Data Source Type

```sql
CREATE TYPE data_source_type AS ENUM (
  'snowflake',
  'bigquery',
  'redshift',
  'postgres',
  'mysql',
  'sqlserver'
);
```

### Query Execution Status

```sql
CREATE TYPE query_execution_status AS ENUM (
  'running',
  'completed',
  'failed'
);
```

### Model Execution Status

```sql
CREATE TYPE model_execution_status AS ENUM (
  'running',
  'completed',
  'failed'
);
```

### Model Type

```sql
CREATE TYPE model_type AS ENUM (
  'forecast',
  'scenario',
  'budget',
  'kpi'
);
```

## Database Functions

### Update Timestamp Function

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

**Purpose**: Automatically update `updated_at` timestamps

### Audit Log Function

```sql
CREATE OR REPLACE FUNCTION audit_log()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    table_name,
    record_id,
    action,
    old_values,
    new_values,
    user_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';
```

**Purpose**: Track all database changes for audit purposes

## Database Triggers

### Update Timestamp Triggers

```sql
-- Apply to all tables with updated_at column
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (similar triggers for other tables)
```

### Audit Triggers

```sql
-- Apply to important tables for audit logging
CREATE TRIGGER audit_teams_changes AFTER INSERT OR UPDATE OR DELETE ON teams
  FOR EACH ROW EXECUTE FUNCTION audit_log();

CREATE TRIGGER audit_team_members_changes AFTER INSERT OR UPDATE OR DELETE ON team_members
  FOR EACH ROW EXECUTE FUNCTION audit_log();

-- ... (similar triggers for other important tables)
```

## Row Level Security (RLS)

### RLS Policies Overview

All tables have RLS enabled with team-based access control:

1. **Team Isolation**: Users can only access data from their teams
2. **Role-based Access**: Admins have additional permissions
3. **User-specific Access**: Users can access their own data
4. **System Access**: System operations bypass RLS when needed

### Policy Examples

#### Team-based View Policy

```sql
CREATE POLICY "Team members can view team data" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
```

#### Admin Update Policy

```sql
CREATE POLICY "Team admins can update teams" ON teams
  FOR UPDATE USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```

## Database Indexes

### Performance Indexes

```sql
-- Team membership lookups
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);

-- Chat lookups
CREATE INDEX idx_chat_comments_thread_id ON chat_comments(thread_id);
CREATE INDEX idx_chat_comments_created_at ON chat_comments(created_at);

-- Notification lookups
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Join request lookups
CREATE INDEX idx_team_join_requests_team_id ON team_join_requests(team_id);
CREATE INDEX idx_team_join_requests_status ON team_join_requests(status);
```

## Database Migrations

### Migration Files

- `20250717235414_changes.sql` - Initial schema setup
- `20250718003757_changes.sql` - OAuth RLS fixes
- `20250718141900_changes.sql` - Notification system
- `20250718142508_changes.sql` - Chat system
- `20250718143000_add_notifications_realtime.sql` - Real-time notifications

### Migration Commands

```bash
# Generate migration from schema changes
npm run supabase:migrate:diff

# Apply migrations to local database
npx supabase db push --local

# Generate TypeScript types
npm run supabase:types
```

## Database Extensions

### Template Extensions (Don't Modify)

The template provides these database features:

- Row Level Security (RLS)
- Real-time subscriptions
- Audit logging
- Automatic timestamps
- Type safety with TypeScript

### Custom Extensions (Safe to Add)

Add custom database features in new migrations:

```sql
-- Custom table example
CREATE TABLE custom_business_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Custom RLS policy
CREATE POLICY "Team members can access custom data" ON custom_business_data
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );

-- Custom index
CREATE INDEX idx_custom_business_data_team_id ON custom_business_data(team_id);
```

## Database Best Practices

### Template Database (Don't Modify)

1. **Don't modify template tables** - Use custom tables instead
2. **Don't change RLS policies** - Maintain security isolation
3. **Don't remove indexes** - Keep performance optimizations
4. **Don't modify triggers** - Maintain audit logging

### Custom Database (Safe to Modify)

1. **Add custom tables** - Use new migration files
2. **Extend existing tables** - Add custom columns carefully
3. **Create custom policies** - Follow template RLS patterns
4. **Add custom indexes** - Optimize for your queries
5. **Use custom functions** - Add business logic as needed

### Migration Best Practices

1. **Test migrations locally** - Use Supabase local development
2. **Backup before production** - Always backup before applying
3. **Use transactions** - Wrap migrations in transactions
4. **Version control** - Track all schema changes
5. **Document changes** - Update this documentation

## Database Monitoring

### Performance Monitoring

```sql
-- Slow query identification
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Table size monitoring
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Security Monitoring

```sql
-- RLS policy violations
SELECT * FROM audit_logs
WHERE action = 'SELECT'
AND old_values IS NULL
AND new_values IS NULL;

-- Failed authentication attempts
SELECT * FROM auth.audit_log_entries
WHERE event_type = 'login_failed';
```
