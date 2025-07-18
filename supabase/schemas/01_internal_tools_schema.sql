-- Internal Tools Schema
-- This schema defines the database structure for the internal tools template

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE data_source_type AS ENUM ('snowflake', 'bigquery', 'redshift', 'postgres', 'mysql', 'sqlserver');
CREATE TYPE query_execution_status AS ENUM ('running', 'completed', 'failed');
CREATE TYPE model_type AS ENUM ('forecast', 'scenario', 'budget', 'kpi');
CREATE TYPE model_execution_status AS ENUM ('running', 'completed', 'failed');

-- Teams table (kept from original for team-based access)
CREATE TABLE IF NOT EXISTS teams (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (replaces users table for better integration with Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    onboarding_status onboarding_status DEFAULT 'pending',
    current_team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table (kept from original for team access control)
CREATE TABLE IF NOT EXISTS team_members (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Data sources table
CREATE TABLE IF NOT EXISTS data_sources (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type data_source_type NOT NULL,
    connection_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics queries table
CREATE TABLE IF NOT EXISTS analytics_queries (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    query_text TEXT NOT NULL,
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    parameters JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query executions table
CREATE TABLE IF NOT EXISTS query_executions (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    query_id UUID REFERENCES analytics_queries(id) ON DELETE CASCADE,
    status query_execution_status DEFAULT 'running',
    result_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by UUID REFERENCES profiles(id)
);

-- Planning models table
CREATE TABLE IF NOT EXISTS planning_models (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    model_type model_type NOT NULL,
    model_config JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Model executions table
CREATE TABLE IF NOT EXISTS model_executions (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    model_id UUID REFERENCES planning_models(id) ON DELETE CASCADE,
    status model_execution_status DEFAULT 'running',
    result_data JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by UUID REFERENCES profiles(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_sources_team_id ON data_sources(team_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_type ON data_sources(type);
CREATE INDEX IF NOT EXISTS idx_analytics_queries_team_id ON analytics_queries(team_id);
CREATE INDEX IF NOT EXISTS idx_analytics_queries_data_source_id ON analytics_queries(data_source_id);
CREATE INDEX IF NOT EXISTS idx_query_executions_team_id ON query_executions(team_id);
CREATE INDEX IF NOT EXISTS idx_query_executions_query_id ON query_executions(query_id);
CREATE INDEX IF NOT EXISTS idx_query_executions_status ON query_executions(status);
CREATE INDEX IF NOT EXISTS idx_planning_models_team_id ON planning_models(team_id);
CREATE INDEX IF NOT EXISTS idx_planning_models_type ON planning_models(model_type);
CREATE INDEX IF NOT EXISTS idx_model_executions_team_id ON model_executions(team_id);
CREATE INDEX IF NOT EXISTS idx_model_executions_model_id ON model_executions(model_id);
CREATE INDEX IF NOT EXISTS idx_model_executions_status ON model_executions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_team_id ON audit_logs(team_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Teams policies
CREATE POLICY "Users can view their own teams" ON teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team admins can update their teams" ON teams
    FOR UPDATE USING (
        id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team admins can manage team members" ON team_members
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Data sources policies
CREATE POLICY "Team members can view data sources" ON data_sources
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create data sources" ON data_sources
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update data sources" ON data_sources
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can delete data sources" ON data_sources
    FOR DELETE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Analytics queries policies
CREATE POLICY "Team members can view queries" ON analytics_queries
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create queries" ON analytics_queries
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update queries" ON analytics_queries
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can delete queries" ON analytics_queries
    FOR DELETE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Query executions policies
CREATE POLICY "Team members can view query executions" ON query_executions
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create query executions" ON query_executions
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update query executions" ON query_executions
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Planning models policies
CREATE POLICY "Team members can view models" ON planning_models
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create models" ON planning_models
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update models" ON planning_models
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can delete models" ON planning_models
    FOR DELETE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Model executions policies
CREATE POLICY "Team members can view model executions" ON model_executions
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can create model executions" ON model_executions
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can update model executions" ON model_executions
    FOR UPDATE USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Audit logs policies
CREATE POLICY "Team members can view audit logs" ON audit_logs
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE user_id = auth.uid()
        )
    );

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create audit log entry
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        team_id,
        user_id,
        action,
        table_name,
        record_id,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.team_id, OLD.team_id),
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_analytics_queries_updated_at BEFORE UPDATE ON analytics_queries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planning_models_updated_at BEFORE UPDATE ON planning_models
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for audit logging
CREATE TRIGGER audit_data_sources AFTER INSERT OR UPDATE OR DELETE ON data_sources
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_analytics_queries AFTER INSERT OR UPDATE OR DELETE ON analytics_queries
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_query_executions AFTER INSERT OR UPDATE OR DELETE ON query_executions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_planning_models AFTER INSERT OR UPDATE OR DELETE ON planning_models
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

CREATE TRIGGER audit_model_executions AFTER INSERT OR UPDATE OR DELETE ON model_executions
    FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Utility functions

-- Function to test data source connection
CREATE OR REPLACE FUNCTION test_data_source_connection(data_source_id UUID)
RETURNS JSONB AS $$
DECLARE
    data_source_record RECORD;
    result JSONB;
BEGIN
    -- Get data source details
    SELECT * INTO data_source_record 
    FROM data_sources 
    WHERE id = data_source_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Data source not found');
    END IF;
    
    -- In a real implementation, this would test the actual connection
    -- For now, we'll simulate a successful test
    result := jsonb_build_object(
        'success', true,
        'message', 'Connection test successful',
        'data_source_type', data_source_record.type,
        'data_source_name', data_source_record.name
    );
    
    RETURN result;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to get team statistics
CREATE OR REPLACE FUNCTION get_team_stats(team_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    SELECT jsonb_build_object(
        'data_sources_count', (SELECT COUNT(*) FROM data_sources WHERE team_id = team_uuid),
        'queries_count', (SELECT COUNT(*) FROM analytics_queries WHERE team_id = team_uuid),
        'models_count', (SELECT COUNT(*) FROM planning_models WHERE team_id = team_uuid),
        'recent_executions', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', qe.id,
                    'type', 'query',
                    'status', qe.status,
                    'created_at', qe.created_at
                )
            )
            FROM (
                SELECT * FROM query_executions 
                WHERE team_id = team_uuid 
                ORDER BY created_at DESC 
                LIMIT 5
            ) qe
        ),
        'recent_model_executions', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', me.id,
                    'type', 'model',
                    'status', me.status,
                    'created_at', me.created_at
                )
            )
            FROM (
                SELECT * FROM model_executions 
                WHERE team_id = team_uuid 
                ORDER BY created_at DESC 
                LIMIT 5
            ) me
        )
    ) INTO stats;
    
    RETURN stats;
END;
$$ language 'plpgsql' SECURITY DEFINER; 