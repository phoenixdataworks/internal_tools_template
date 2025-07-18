# StreamTrack - Technical Specification

## 1. Architecture Overview

### 1.1 System Architecture ✅

```
                    Azure Functions (Python)
                            ↓
Frontend (Next.js) <--> Supabase (PostgreSQL)
```

### 1.2 Technology Stack ✅

- Frontend:
  - Next.js 14
  - React 18
  - TypeScript 5
  - MUI (Material-UI) v5
  - Emotion for styling
- State Management:
  - React Query
  - Zustand
- Backend:
  - Supabase (PostgreSQL)
  - Supabase Auth
  - Supabase RLS
  - Supabase Realtime
- Authentication:
  - Supabase Auth
  - Azure AD
  - Google OAuth
- Cloud:
  - Supabase for database and auth
  - Azure Functions for batch processing
- CI/CD: GitHub Actions
- Testing:
  - Frontend: Jest, React Testing Library, Cypress
  - Backend: Pytest, hypothesis

### 1.3 Frontend Dependencies ✅

```json
{
  "dependencies": {
    "@emotion/cache": "^11.11.0",
    "@emotion/react": "^11.11.3",
    "@emotion/server": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "@hookform/resolvers": "^3.3.4",
    "@mui/icons-material": "^5.15.3",
    "@mui/lab": "^5.0.0-alpha.159",
    "@mui/material": "^5.15.3",
    "@supabase/ssr": "^0.0.10",
    "@supabase/supabase-js": "^2.39.2",
    "@tanstack/react-query": "^5.17.9",
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.49.2",
    "zod": "^3.22.4"
  }
}
```

## 4. Database Schema ✅

### 4.1 Initial Schema

```sql
-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "citext";

-- Create custom types
create type user_role as enum ('admin', 'member');

-- Create profiles table
create table public.profiles (
    id uuid references auth.users on delete cascade not null primary key,
    email citext not null unique,
    full_name text,
    avatar_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create teams table
create table public.teams (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    slug citext not null unique,
    logo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Create team_members table
create table public.team_members (
    team_id uuid references public.teams on delete cascade not null,
    user_id uuid references public.profiles on delete cascade not null,
    role user_role not null default 'member',
    created_at timestamptz not null default now(),
    primary key (team_id, user_id)
);

-- Create team_invites table
create table public.team_invites (
    id uuid default gen_random_uuid() primary key,
    team_id uuid references public.teams on delete cascade not null,
    email citext not null,
    role user_role not null default 'member',
    token uuid default gen_random_uuid() not null unique,
    expires_at timestamptz not null default (now() + interval '24 hours'),
    created_at timestamptz not null default now()
);
```

### 4.2 Row Level Security (RLS) ✅

```sql
-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;

-- Create policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Team members can view team"
    on public.teams for select
    using (
        exists (
            select 1
            from public.team_members
            where team_members.team_id = teams.id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team admins can update team"
    on public.teams for update
    using (
        exists (
            select 1
            from public.team_members
            where team_members.team_id = teams.id
            and team_members.user_id = auth.uid()
            and team_members.role = 'admin'
        )
    );

create policy "Team members can view team members"
    on public.team_members for select
    using (
        exists (
            select 1
            from public.team_members as tm
            where tm.team_id = team_members.team_id
            and tm.user_id = auth.uid()
        )
    );

create policy "Team admins can manage team members"
    on public.team_members for all
    using (
        exists (
            select 1
            from public.team_members as tm
            where tm.team_id = team_members.team_id
            and tm.user_id = auth.uid()
            and tm.role = 'admin'
        )
    );

create policy "Team admins can manage invites"
    on public.team_invites for all
    using (
        exists (
            select 1
            from public.team_members
            where team_members.team_id = team_invites.team_id
            and team_members.user_id = auth.uid()
            and team_members.role = 'admin'
        )
    );
```

### 4.3 Triggers and Functions ✅

```sql
-- Create functions
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'avatar_url'
    );
    return new;
end;
$$;

-- Create triggers
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
```

// ... rest of existing content ...
