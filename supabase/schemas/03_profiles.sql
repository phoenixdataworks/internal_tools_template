-- Internal Tools Schema
-- This schema defines the database structure for the internal tools template

-- Custom types (removed analytics-related types)

-- Profiles table (replaces users table for better integration with Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain-based access function (needed for profiles policy)
CREATE OR REPLACE FUNCTION public.is_allowed_domain()
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_domain TEXT;
    allowed_domains TEXT[];
BEGIN
    -- Get user email from JWT
    user_email := auth.jwt() ->> 'email';
    
    -- Extract domain from email
    user_domain := split_part(user_email, '@', 2);
    
    -- Get allowed domains from environment variable
    -- This will be set via Supabase secrets
    allowed_domains := string_to_array(current_setting('app.allowed_domains', true), ',');
    
    -- If no domains are configured, allow all
    IF allowed_domains IS NULL OR array_length(allowed_domains, 1) IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user's domain is in allowed list
    RETURN user_domain = ANY(allowed_domains);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Team-based access control (no analytics tables to add team_id to)

-- Row Level Security (RLS) Policies

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies - allow domain-based access
DROP POLICY IF EXISTS "Users can view all profiles in their domain" ON public.profiles;
CREATE POLICY "Users can view profiles in their domain" ON public.profiles
    FOR SELECT USING (
        public.is_allowed_domain() AND
        email LIKE '%@' || split_part(auth.jwt() ->> 'email', '@', 2)
    );

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- Add policy for profile creation during authentication
CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT WITH CHECK (
        id = auth.uid() AND 
        public.is_allowed_domain()
    );

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
