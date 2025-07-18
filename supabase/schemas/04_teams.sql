-- Teams and Team Management Schema
-- This schema defines the team-based access control system

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE NOT NULL,
    created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Team join requests table
CREATE TABLE IF NOT EXISTS public.team_join_requests (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS policies
CREATE OR REPLACE FUNCTION public.is_user_in_teams(team_ids uuid[])
RETURNS BOOLEAN AS $$
BEGIN
    -- Set search_path to prevent injection attacks
    SET search_path = '';
    
    RETURN EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = ANY(team_ids)
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_admin(team_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    -- Set search_path to prevent injection attacks
    SET search_path = '';
    
    RETURN EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_member(team_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    -- Set search_path to prevent injection attacks
    SET search_path = '';
    
    RETURN EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_team_creator(team_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    -- Set search_path to prevent injection attacks
    SET search_path = '';
    
    RETURN EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = team_id
        AND t.created_by = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Set search_path to prevent injection attacks
    SET search_path = '';
    
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND is_super_admin = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for Teams
CREATE POLICY "Users can view teams they are members of" ON public.teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM public.team_members 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Super admins can view all teams" ON public.teams
    FOR SELECT USING (
        public.is_super_admin()
    );

-- Additional profile policy for team members
CREATE POLICY "Team members can view each other's profiles" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT DISTINCT tm2.user_id 
            FROM public.team_members tm1
            JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
            WHERE tm1.user_id = auth.uid() AND tm1.status = 'active'
        )
    );

CREATE POLICY "Super admins can create teams" ON public.teams
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        public.is_allowed_domain() AND
        public.is_super_admin()
    );

CREATE POLICY "Team creators and admins can update teams" ON public.teams
    FOR UPDATE USING (
        public.is_team_creator(id) OR public.is_team_admin(id)
    );

-- RLS Policies for Team Members
CREATE POLICY "Team members can view team membership" ON public.team_members
    FOR SELECT USING (
        public.is_team_member(team_id)
    );

CREATE POLICY "Team creators and admins can manage team members" ON public.team_members
    FOR ALL USING (
        public.is_team_creator(team_id) OR public.is_team_admin(team_id) OR public.is_super_admin()
    );

-- RLS Policies for Team Join Requests
CREATE POLICY "Users can view their own join requests" ON public.team_join_requests
    FOR SELECT USING (
        user_id = auth.uid() OR public.is_team_admin(team_id)
    );

CREATE POLICY "Any authenticated user can create join requests" ON public.team_join_requests
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        public.is_allowed_domain()
    );

CREATE POLICY "Team admins can manage join requests" ON public.team_join_requests
    FOR UPDATE USING (
        public.is_team_admin(team_id)
    );

-- Indexes
CREATE INDEX idx_teams_slug ON public.teams(slug);
CREATE INDEX idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX idx_team_join_requests_team_id ON public.team_join_requests(team_id);
CREATE INDEX idx_team_join_requests_user_id ON public.team_join_requests(user_id);

-- Triggers
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_join_requests_updated_at BEFORE UPDATE ON public.team_join_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 