create table "public"."chat_comments" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "thread_id" uuid,
    "parent_id" uuid,
    "content" jsonb not null,
    "created_by" uuid,
    "edited_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "deleted" boolean default false,
    "deleted_at" timestamp with time zone,
    "deleted_by" uuid,
    "metadata" jsonb
);


alter table "public"."chat_comments" enable row level security;

create table "public"."chat_reactions" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "comment_id" uuid,
    "user_id" uuid,
    "emoji" text not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."chat_reactions" enable row level security;

create table "public"."chat_read_receipts" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "thread_id" uuid,
    "user_id" uuid,
    "last_read_at" timestamp with time zone not null default now(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."chat_read_receipts" enable row level security;

create table "public"."chat_threads" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "title" text not null,
    "content" text,
    "team_id" uuid,
    "created_by" uuid,
    "status" text not null default 'open'::text,
    "pinned" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "resolved_at" timestamp with time zone,
    "resolved_by" uuid,
    "metadata" jsonb,
    "object_type" text,
    "object_id" text
);


alter table "public"."chat_threads" enable row level security;

create table "public"."notifications" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "user_id" uuid not null,
    "type" text not null,
    "title" text not null,
    "message" text,
    "data" jsonb,
    "read" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."notifications" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "email" text not null,
    "full_name" text,
    "avatar_url" text,
    "is_super_admin" boolean default false,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."team_join_requests" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "team_id" uuid,
    "user_id" uuid,
    "message" text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."team_join_requests" enable row level security;

create table "public"."team_members" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "team_id" uuid,
    "user_id" uuid,
    "role" text not null default 'member'::text,
    "status" text not null default 'active'::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."team_members" enable row level security;

create table "public"."teams" (
    "id" uuid not null default extensions.gen_random_uuid(),
    "name" text not null,
    "description" text,
    "slug" text not null,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."teams" enable row level security;

CREATE INDEX chat_comments_created_at_idx ON public.chat_comments USING btree (created_at);

CREATE INDEX chat_comments_created_by_idx ON public.chat_comments USING btree (created_by);

CREATE INDEX chat_comments_parent_id_idx ON public.chat_comments USING btree (parent_id);

CREATE UNIQUE INDEX chat_comments_pkey ON public.chat_comments USING btree (id);

CREATE INDEX chat_comments_thread_id_idx ON public.chat_comments USING btree (thread_id);

CREATE UNIQUE INDEX chat_reactions_comment_id_user_id_emoji_key ON public.chat_reactions USING btree (comment_id, user_id, emoji);

CREATE INDEX chat_reactions_comment_idx ON public.chat_reactions USING btree (comment_id);

CREATE UNIQUE INDEX chat_reactions_pkey ON public.chat_reactions USING btree (id);

CREATE INDEX chat_reactions_user_idx ON public.chat_reactions USING btree (user_id);

CREATE UNIQUE INDEX chat_read_receipts_pkey ON public.chat_read_receipts USING btree (id);

CREATE UNIQUE INDEX chat_read_receipts_thread_id_user_id_key ON public.chat_read_receipts USING btree (thread_id, user_id);

CREATE INDEX chat_read_receipts_thread_idx ON public.chat_read_receipts USING btree (thread_id);

CREATE INDEX chat_read_receipts_user_idx ON public.chat_read_receipts USING btree (user_id);

CREATE INDEX chat_threads_created_by_idx ON public.chat_threads USING btree (created_by);

CREATE INDEX chat_threads_object_idx ON public.chat_threads USING btree (object_type, object_id);

CREATE UNIQUE INDEX chat_threads_object_type_object_id_team_id_key ON public.chat_threads USING btree (object_type, object_id, team_id);

CREATE UNIQUE INDEX chat_threads_pkey ON public.chat_threads USING btree (id);

CREATE INDEX chat_threads_status_idx ON public.chat_threads USING btree (status);

CREATE INDEX chat_threads_team_id_idx ON public.chat_threads USING btree (team_id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at);

CREATE INDEX idx_notifications_read ON public.notifications USING btree (read);

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read);

CREATE INDEX idx_team_join_requests_team_id ON public.team_join_requests USING btree (team_id);

CREATE INDEX idx_team_join_requests_user_id ON public.team_join_requests USING btree (user_id);

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);

CREATE INDEX idx_teams_slug ON public.teams USING btree (slug);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX team_join_requests_pkey ON public.team_join_requests USING btree (id);

CREATE UNIQUE INDEX team_join_requests_team_id_user_id_key ON public.team_join_requests USING btree (team_id, user_id);

CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (id);

CREATE UNIQUE INDEX team_members_team_id_user_id_key ON public.team_members USING btree (team_id, user_id);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

CREATE UNIQUE INDEX teams_slug_key ON public.teams USING btree (slug);

alter table "public"."chat_comments" add constraint "chat_comments_pkey" PRIMARY KEY using index "chat_comments_pkey";

alter table "public"."chat_reactions" add constraint "chat_reactions_pkey" PRIMARY KEY using index "chat_reactions_pkey";

alter table "public"."chat_read_receipts" add constraint "chat_read_receipts_pkey" PRIMARY KEY using index "chat_read_receipts_pkey";

alter table "public"."chat_threads" add constraint "chat_threads_pkey" PRIMARY KEY using index "chat_threads_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."team_join_requests" add constraint "team_join_requests_pkey" PRIMARY KEY using index "team_join_requests_pkey";

alter table "public"."team_members" add constraint "team_members_pkey" PRIMARY KEY using index "team_members_pkey";

alter table "public"."teams" add constraint "teams_pkey" PRIMARY KEY using index "teams_pkey";

alter table "public"."chat_comments" add constraint "chat_comments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_comments" validate constraint "chat_comments_created_by_fkey";

alter table "public"."chat_comments" add constraint "chat_comments_deleted_by_fkey" FOREIGN KEY (deleted_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."chat_comments" validate constraint "chat_comments_deleted_by_fkey";

alter table "public"."chat_comments" add constraint "chat_comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES chat_comments(id) ON DELETE CASCADE not valid;

alter table "public"."chat_comments" validate constraint "chat_comments_parent_id_fkey";

alter table "public"."chat_comments" add constraint "chat_comments_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE not valid;

alter table "public"."chat_comments" validate constraint "chat_comments_thread_id_fkey";

alter table "public"."chat_reactions" add constraint "chat_reactions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES chat_comments(id) ON DELETE CASCADE not valid;

alter table "public"."chat_reactions" validate constraint "chat_reactions_comment_id_fkey";

alter table "public"."chat_reactions" add constraint "chat_reactions_comment_id_user_id_emoji_key" UNIQUE using index "chat_reactions_comment_id_user_id_emoji_key";

alter table "public"."chat_reactions" add constraint "chat_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_reactions" validate constraint "chat_reactions_user_id_fkey";

alter table "public"."chat_read_receipts" add constraint "chat_read_receipts_thread_id_fkey" FOREIGN KEY (thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE not valid;

alter table "public"."chat_read_receipts" validate constraint "chat_read_receipts_thread_id_fkey";

alter table "public"."chat_read_receipts" add constraint "chat_read_receipts_thread_id_user_id_key" UNIQUE using index "chat_read_receipts_thread_id_user_id_key";

alter table "public"."chat_read_receipts" add constraint "chat_read_receipts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_read_receipts" validate constraint "chat_read_receipts_user_id_fkey";

alter table "public"."chat_threads" add constraint "chat_threads_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_threads" validate constraint "chat_threads_created_by_fkey";

alter table "public"."chat_threads" add constraint "chat_threads_object_type_object_id_team_id_key" UNIQUE using index "chat_threads_object_type_object_id_team_id_key";

alter table "public"."chat_threads" add constraint "chat_threads_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."chat_threads" validate constraint "chat_threads_resolved_by_fkey";

alter table "public"."chat_threads" add constraint "chat_threads_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text, 'archived'::text]))) not valid;

alter table "public"."chat_threads" validate constraint "chat_threads_status_check";

alter table "public"."chat_threads" add constraint "chat_threads_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."chat_threads" validate constraint "chat_threads_team_id_fkey";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['auth'::text, 'system'::text, 'chat'::text, 'team'::text, 'mention'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."team_join_requests" add constraint "team_join_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))) not valid;

alter table "public"."team_join_requests" validate constraint "team_join_requests_status_check";

alter table "public"."team_join_requests" add constraint "team_join_requests_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_join_requests" validate constraint "team_join_requests_team_id_fkey";

alter table "public"."team_join_requests" add constraint "team_join_requests_team_id_user_id_key" UNIQUE using index "team_join_requests_team_id_user_id_key";

alter table "public"."team_join_requests" add constraint "team_join_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."team_join_requests" validate constraint "team_join_requests_user_id_fkey";

alter table "public"."team_members" add constraint "team_members_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text]))) not valid;

alter table "public"."team_members" validate constraint "team_members_role_check";

alter table "public"."team_members" add constraint "team_members_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'pending'::text, 'inactive'::text]))) not valid;

alter table "public"."team_members" validate constraint "team_members_status_check";

alter table "public"."team_members" add constraint "team_members_team_id_fkey" FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE not valid;

alter table "public"."team_members" validate constraint "team_members_team_id_fkey";

alter table "public"."team_members" add constraint "team_members_team_id_user_id_key" UNIQUE using index "team_members_team_id_user_id_key";

alter table "public"."team_members" add constraint "team_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."team_members" validate constraint "team_members_user_id_fkey";

alter table "public"."teams" add constraint "teams_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."teams" validate constraint "teams_created_by_fkey";

alter table "public"."teams" add constraint "teams_slug_key" UNIQUE using index "teams_slug_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_title text, p_message text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        p_user_id,
        p_type,
        p_title,
        p_message,
        p_data
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_team_notification(p_team_id uuid, p_type text, p_title text, p_message text DEFAULT NULL::text, p_data jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    )
    SELECT 
        tm.user_id,
        p_type,
        p_title,
        p_message,
        p_data
    FROM public.team_members tm
    WHERE tm.team_id = p_team_id 
    AND tm.status = 'active';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_comment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Update the thread's updated_at timestamp when a new comment is added
    UPDATE public.chat_threads 
    SET updated_at = NOW() 
    WHERE id = NEW.thread_id;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_allowed_domain()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_owner(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND is_super_admin = true
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_team_admin(team_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
        AND tm.status = 'active'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_team_creator(team_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.teams t
        WHERE t.id = team_id
        AND t.created_by = auth.uid()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_team_member(team_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = team_id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_user_in_teams(team_ids uuid[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.team_id = ANY(team_ids)
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."chat_comments" to "authenticated";

grant insert on table "public"."chat_comments" to "authenticated";

grant references on table "public"."chat_comments" to "authenticated";

grant select on table "public"."chat_comments" to "authenticated";

grant trigger on table "public"."chat_comments" to "authenticated";

grant truncate on table "public"."chat_comments" to "authenticated";

grant update on table "public"."chat_comments" to "authenticated";

grant delete on table "public"."chat_comments" to "service_role";

grant insert on table "public"."chat_comments" to "service_role";

grant references on table "public"."chat_comments" to "service_role";

grant select on table "public"."chat_comments" to "service_role";

grant trigger on table "public"."chat_comments" to "service_role";

grant truncate on table "public"."chat_comments" to "service_role";

grant update on table "public"."chat_comments" to "service_role";

grant delete on table "public"."chat_reactions" to "authenticated";

grant insert on table "public"."chat_reactions" to "authenticated";

grant references on table "public"."chat_reactions" to "authenticated";

grant select on table "public"."chat_reactions" to "authenticated";

grant trigger on table "public"."chat_reactions" to "authenticated";

grant truncate on table "public"."chat_reactions" to "authenticated";

grant update on table "public"."chat_reactions" to "authenticated";

grant delete on table "public"."chat_reactions" to "service_role";

grant insert on table "public"."chat_reactions" to "service_role";

grant references on table "public"."chat_reactions" to "service_role";

grant select on table "public"."chat_reactions" to "service_role";

grant trigger on table "public"."chat_reactions" to "service_role";

grant truncate on table "public"."chat_reactions" to "service_role";

grant update on table "public"."chat_reactions" to "service_role";

grant delete on table "public"."chat_read_receipts" to "authenticated";

grant insert on table "public"."chat_read_receipts" to "authenticated";

grant references on table "public"."chat_read_receipts" to "authenticated";

grant select on table "public"."chat_read_receipts" to "authenticated";

grant trigger on table "public"."chat_read_receipts" to "authenticated";

grant truncate on table "public"."chat_read_receipts" to "authenticated";

grant update on table "public"."chat_read_receipts" to "authenticated";

grant delete on table "public"."chat_read_receipts" to "service_role";

grant insert on table "public"."chat_read_receipts" to "service_role";

grant references on table "public"."chat_read_receipts" to "service_role";

grant select on table "public"."chat_read_receipts" to "service_role";

grant trigger on table "public"."chat_read_receipts" to "service_role";

grant truncate on table "public"."chat_read_receipts" to "service_role";

grant update on table "public"."chat_read_receipts" to "service_role";

grant delete on table "public"."chat_threads" to "authenticated";

grant insert on table "public"."chat_threads" to "authenticated";

grant references on table "public"."chat_threads" to "authenticated";

grant select on table "public"."chat_threads" to "authenticated";

grant trigger on table "public"."chat_threads" to "authenticated";

grant truncate on table "public"."chat_threads" to "authenticated";

grant update on table "public"."chat_threads" to "authenticated";

grant delete on table "public"."chat_threads" to "service_role";

grant insert on table "public"."chat_threads" to "service_role";

grant references on table "public"."chat_threads" to "service_role";

grant select on table "public"."chat_threads" to "service_role";

grant trigger on table "public"."chat_threads" to "service_role";

grant truncate on table "public"."chat_threads" to "service_role";

grant update on table "public"."chat_threads" to "service_role";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."team_join_requests" to "authenticated";

grant insert on table "public"."team_join_requests" to "authenticated";

grant references on table "public"."team_join_requests" to "authenticated";

grant select on table "public"."team_join_requests" to "authenticated";

grant trigger on table "public"."team_join_requests" to "authenticated";

grant truncate on table "public"."team_join_requests" to "authenticated";

grant update on table "public"."team_join_requests" to "authenticated";

grant delete on table "public"."team_join_requests" to "service_role";

grant insert on table "public"."team_join_requests" to "service_role";

grant references on table "public"."team_join_requests" to "service_role";

grant select on table "public"."team_join_requests" to "service_role";

grant trigger on table "public"."team_join_requests" to "service_role";

grant truncate on table "public"."team_join_requests" to "service_role";

grant update on table "public"."team_join_requests" to "service_role";

grant delete on table "public"."team_members" to "authenticated";

grant insert on table "public"."team_members" to "authenticated";

grant references on table "public"."team_members" to "authenticated";

grant select on table "public"."team_members" to "authenticated";

grant trigger on table "public"."team_members" to "authenticated";

grant truncate on table "public"."team_members" to "authenticated";

grant update on table "public"."team_members" to "authenticated";

grant delete on table "public"."team_members" to "service_role";

grant insert on table "public"."team_members" to "service_role";

grant references on table "public"."team_members" to "service_role";

grant select on table "public"."team_members" to "service_role";

grant trigger on table "public"."team_members" to "service_role";

grant truncate on table "public"."team_members" to "service_role";

grant update on table "public"."team_members" to "service_role";

grant delete on table "public"."teams" to "authenticated";

grant insert on table "public"."teams" to "authenticated";

grant references on table "public"."teams" to "authenticated";

grant select on table "public"."teams" to "authenticated";

grant trigger on table "public"."teams" to "authenticated";

grant truncate on table "public"."teams" to "authenticated";

grant update on table "public"."teams" to "authenticated";

grant delete on table "public"."teams" to "service_role";

grant insert on table "public"."teams" to "service_role";

grant references on table "public"."teams" to "service_role";

grant select on table "public"."teams" to "service_role";

grant trigger on table "public"."teams" to "service_role";

grant truncate on table "public"."teams" to "service_role";

grant update on table "public"."teams" to "service_role";

create policy "Comment creators can delete their comments"
on "public"."chat_comments"
as permissive
for delete
to authenticated
using (is_owner(created_by));


create policy "Comment creators can update their comments"
on "public"."chat_comments"
as permissive
for update
to authenticated
using (is_owner(created_by))
with check (is_owner(created_by));


create policy "Team members can create comments"
on "public"."chat_comments"
as permissive
for insert
to authenticated
with check ((thread_id IN ( SELECT chat_threads.id
   FROM chat_threads
  WHERE is_team_member(chat_threads.team_id))));


create policy "Team members can view chat comments"
on "public"."chat_comments"
as permissive
for select
to authenticated
using ((thread_id IN ( SELECT chat_threads.id
   FROM chat_threads
  WHERE is_team_member(chat_threads.team_id))));


create policy "Team members can manage reactions"
on "public"."chat_reactions"
as permissive
for all
to authenticated
using ((comment_id IN ( SELECT c.id
   FROM (chat_comments c
     JOIN chat_threads t ON ((c.thread_id = t.id)))
  WHERE is_team_member(t.team_id))))
with check (is_owner(user_id));


create policy "Users can manage their read receipts"
on "public"."chat_read_receipts"
as permissive
for all
to authenticated
using (is_owner(user_id))
with check (is_owner(user_id));


create policy "Team members can create chat threads"
on "public"."chat_threads"
as permissive
for insert
to authenticated
with check (is_team_member(team_id));


create policy "Team members can view chat threads"
on "public"."chat_threads"
as permissive
for select
to authenticated
using (is_team_member(team_id));


create policy "Thread creators and team admins can update threads"
on "public"."chat_threads"
as permissive
for update
to authenticated
using ((is_owner(created_by) OR is_team_admin(team_id)))
with check ((is_owner(created_by) OR is_team_admin(team_id)));


create policy "System can create notifications for users"
on "public"."notifications"
as permissive
for insert
to public
with check (((auth.role() = 'service_role'::text) OR ((auth.role() = 'authenticated'::text) AND (user_id = auth.uid()))));


create policy "Users can delete their own notifications"
on "public"."notifications"
as permissive
for delete
to public
using ((user_id = auth.uid()));


create policy "Users can update their own notifications"
on "public"."notifications"
as permissive
for update
to public
using ((user_id = auth.uid()));


create policy "Users can view their own notifications"
on "public"."notifications"
as permissive
for select
to public
using ((user_id = auth.uid()));


create policy "Team members can view each other's profiles"
on "public"."profiles"
as permissive
for select
to public
using ((id IN ( SELECT DISTINCT tm2.user_id
   FROM (team_members tm1
     JOIN team_members tm2 ON ((tm1.team_id = tm2.team_id)))
  WHERE ((tm1.user_id = auth.uid()) AND (tm1.status = 'active'::text)))));


create policy "Users can create their own profile"
on "public"."profiles"
as permissive
for insert
to public
with check (((id = auth.uid()) AND is_allowed_domain()));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((id = auth.uid()));


create policy "Users can view profiles in their domain"
on "public"."profiles"
as permissive
for select
to public
using ((is_allowed_domain() AND (email ~~ ('%@'::text || split_part((auth.jwt() ->> 'email'::text), '@'::text, 2)))));


create policy "Any authenticated user can create join requests"
on "public"."team_join_requests"
as permissive
for insert
to public
with check (((auth.role() = 'authenticated'::text) AND is_allowed_domain()));


create policy "Team admins can manage join requests"
on "public"."team_join_requests"
as permissive
for update
to public
using (is_team_admin(team_id));


create policy "Users can view their own join requests"
on "public"."team_join_requests"
as permissive
for select
to public
using (((user_id = auth.uid()) OR is_team_admin(team_id)));


create policy "Team creators and admins can manage team members"
on "public"."team_members"
as permissive
for all
to public
using ((is_team_creator(team_id) OR is_team_admin(team_id) OR is_super_admin()));


create policy "Team members can view team membership"
on "public"."team_members"
as permissive
for select
to public
using (is_team_member(team_id));


create policy "Super admins can create teams"
on "public"."teams"
as permissive
for insert
to public
with check (((auth.role() = 'authenticated'::text) AND is_allowed_domain() AND is_super_admin()));


create policy "Super admins can view all teams"
on "public"."teams"
as permissive
for select
to public
using (is_super_admin());


create policy "Team creators and admins can update teams"
on "public"."teams"
as permissive
for update
to public
using ((is_team_creator(id) OR is_team_admin(id)));


create policy "Users can view teams they are members of"
on "public"."teams"
as permissive
for select
to public
using ((id IN ( SELECT team_members.team_id
   FROM team_members
  WHERE ((team_members.user_id = auth.uid()) AND (team_members.status = 'active'::text)))));


CREATE TRIGGER handle_chat_comments_updated_at BEFORE UPDATE ON public.chat_comments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_new_comment AFTER INSERT ON public.chat_comments FOR EACH ROW EXECUTE FUNCTION handle_new_comment();

CREATE TRIGGER handle_chat_read_receipts_updated_at BEFORE UPDATE ON public.chat_read_receipts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_chat_threads_updated_at BEFORE UPDATE ON public.chat_threads FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_join_requests_updated_at BEFORE UPDATE ON public.team_join_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


