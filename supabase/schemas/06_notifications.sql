-- Notifications Schema
-- This schema defines the notification system for the internal tools template

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT extensions.gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('auth', 'system', 'chat', 'team', 'mention')),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (user_id = auth.uid());

-- System can create notifications for users (via service role)
-- This policy allows the application to create notifications for users
CREATE POLICY "System can create notifications for users" ON public.notifications
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role' OR 
        (auth.role() = 'authenticated' AND user_id = auth.uid())
    );

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read);

-- Triggers
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create notifications
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_type text,
    p_title text,
    p_message text DEFAULT NULL,
    p_data jsonb DEFAULT NULL
)
RETURNS uuid AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create team notifications
CREATE OR REPLACE FUNCTION public.create_team_notification(
    p_team_id uuid,
    p_type text,
    p_title text,
    p_message text DEFAULT NULL,
    p_data jsonb DEFAULT NULL
)
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add notifications table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; 