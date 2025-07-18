-- Chat and Communication Schema
-- This schema defines the chat and communication system

-- Helper functions for chat policies
CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_new_comment()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the thread's updated_at timestamp when a new comment is added
    UPDATE public.chat_threads 
    SET updated_at = NOW() 
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Chat threads table
CREATE TABLE IF NOT EXISTS public.chat_threads (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    team_id uuid,
    created_by uuid,
    status TEXT DEFAULT 'open' NOT NULL,
    pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by uuid,
    metadata JSONB,
    object_type TEXT,
    object_id TEXT,
    CONSTRAINT chat_threads_status_check CHECK (status = ANY (ARRAY['open', 'resolved', 'archived'])),
    UNIQUE(object_type, object_id, team_id),
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Chat comments table
CREATE TABLE IF NOT EXISTS public.chat_comments (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    thread_id uuid,
    parent_id uuid,
    content JSONB NOT NULL,
    created_by uuid,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_by uuid,
    metadata JSONB,
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_id) REFERENCES public.chat_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE
);

-- Chat reactions table
CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    comment_id uuid,
    user_id uuid,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id, emoji),
    FOREIGN KEY (comment_id) REFERENCES public.chat_comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Chat read receipts table
CREATE TABLE IF NOT EXISTS public.chat_read_receipts (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    thread_id uuid,
    user_id uuid,
    last_read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(thread_id, user_id),
    FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Chat Threads
CREATE POLICY "Team members can create chat threads" ON public.chat_threads
    FOR INSERT TO authenticated WITH CHECK (public.is_team_member(team_id));

CREATE POLICY "Team members can view chat threads" ON public.chat_threads
    FOR SELECT TO authenticated USING (public.is_team_member(team_id));

CREATE POLICY "Thread creators and team admins can update threads" ON public.chat_threads
    FOR UPDATE TO authenticated USING (public.is_owner(created_by) OR public.is_team_admin(team_id))
    WITH CHECK (public.is_owner(created_by) OR public.is_team_admin(team_id));

-- RLS Policies for Chat Comments
CREATE POLICY "Team members can create comments" ON public.chat_comments
    FOR INSERT TO authenticated WITH CHECK (
        thread_id IN (
            SELECT id FROM public.chat_threads
            WHERE public.is_team_member(team_id)
        )
    );

CREATE POLICY "Team members can view chat comments" ON public.chat_comments
    FOR SELECT TO authenticated USING (
        thread_id IN (
            SELECT id FROM public.chat_threads
            WHERE public.is_team_member(team_id)
        )
    );

CREATE POLICY "Comment creators can update their comments" ON public.chat_comments
    FOR UPDATE TO authenticated USING (public.is_owner(created_by))
    WITH CHECK (public.is_owner(created_by));

CREATE POLICY "Comment creators can delete their comments" ON public.chat_comments
    FOR DELETE TO authenticated USING (public.is_owner(created_by));

-- RLS Policies for Chat Reactions
CREATE POLICY "Team members can manage reactions" ON public.chat_reactions
    TO authenticated USING (
        comment_id IN (
            SELECT c.id FROM public.chat_comments c
            JOIN public.chat_threads t ON c.thread_id = t.id
            WHERE public.is_team_member(t.team_id)
        )
    ) WITH CHECK (public.is_owner(user_id));

-- RLS Policies for Chat Read Receipts
CREATE POLICY "Users can manage their read receipts" ON public.chat_read_receipts
    TO authenticated USING (public.is_owner(user_id))
    WITH CHECK (public.is_owner(user_id));

-- Indexes
CREATE INDEX chat_comments_created_by_idx ON public.chat_comments USING btree (created_by);
CREATE INDEX chat_comments_parent_id_idx ON public.chat_comments USING btree (parent_id);
CREATE INDEX chat_comments_thread_id_idx ON public.chat_comments USING btree (thread_id);
CREATE INDEX chat_comments_created_at_idx ON public.chat_comments USING btree (created_at);

CREATE INDEX chat_reactions_comment_idx ON public.chat_reactions USING btree (comment_id);
CREATE INDEX chat_reactions_user_idx ON public.chat_reactions USING btree (user_id);

CREATE INDEX chat_read_receipts_thread_idx ON public.chat_read_receipts USING btree (thread_id);
CREATE INDEX chat_read_receipts_user_idx ON public.chat_read_receipts USING btree (user_id);

CREATE INDEX chat_threads_created_by_idx ON public.chat_threads USING btree (created_by);
CREATE INDEX chat_threads_object_idx ON public.chat_threads USING btree (object_type, object_id);
CREATE INDEX chat_threads_status_idx ON public.chat_threads USING btree (status);
CREATE INDEX chat_threads_team_id_idx ON public.chat_threads USING btree (team_id);

-- Triggers
CREATE TRIGGER handle_chat_comments_updated_at
    BEFORE UPDATE ON public.chat_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chat_threads_updated_at
    BEFORE UPDATE ON public.chat_threads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chat_read_receipts_updated_at
    BEFORE UPDATE ON public.chat_read_receipts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_new_comment
    AFTER INSERT ON public.chat_comments
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_comment();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_threads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_read_receipts TO authenticated;

GRANT ALL ON public.chat_threads TO service_role;
GRANT ALL ON public.chat_comments TO service_role;
GRANT ALL ON public.chat_reactions TO service_role;
GRANT ALL ON public.chat_read_receipts TO service_role;

-- Realtime publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_read_receipts;