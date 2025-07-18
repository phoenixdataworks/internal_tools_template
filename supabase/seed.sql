-- Create admin user and store the ID
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Drop existing user if exists
    DELETE FROM auth.users WHERE email = 'bobby@phoenixdata.works';

    -- Create admin user and get ID
    SELECT create_admin_user('bobby@phoenixdata.works', 'admin1234!') INTO admin_user_id;

    -- Ensure user is confirmed and can sign in
    UPDATE auth.users
    SET
        email_confirmed_at = now(),
        last_sign_in_at = now(),
        raw_app_meta_data = jsonb_build_object(
            'provider', 'email',
            'providers', ARRAY['email']
        ),
        raw_user_meta_data = jsonb_build_object(
            'full_name', 'Bobby Lansing',
            'is_admin', true,
            'onboarding_status', 'completed'
        ),
        role = 'authenticated'
    WHERE id = admin_user_id;

    -- Create initial admin team
    INSERT INTO public.teams (id, name, description, slug)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Admin Team',
        'Administrative team for system management',
        'admin-team'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        slug = EXCLUDED.slug;

    -- Create free subscription for admin team
    INSERT INTO public.subscriptions (
        team_id,
        status,
        tier,
        provider,
        provider_subscription_id,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        trial_start,
        trial_end
    )
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'active',
        'free',
        'custom',
        'free_tier_' || '00000000-0000-0000-0000-000000000001',
        now(),
        null,
        false,
        null,
        null
    )
    ON CONFLICT (provider, provider_subscription_id) DO UPDATE
    SET
        status = EXCLUDED.status,
        tier = EXCLUDED.tier,
        current_period_start = EXCLUDED.current_period_start,
        current_period_end = EXCLUDED.current_period_end,
        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
        trial_start = EXCLUDED.trial_start,
        trial_end = EXCLUDED.trial_end;

    -- Create or update profile
    INSERT INTO public.profiles (id, full_name, email)
    VALUES (
        admin_user_id,
        'Bobby Lansing',
        'bobby@phoenixdata.works'
    )
    ON CONFLICT (id) DO UPDATE
    SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;

    -- Add the admin user to the team
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        admin_user_id,
        'admin'
    )
    ON CONFLICT (team_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;

    -- Create a sample chat thread
    INSERT INTO public.chat_threads (id, title, team_id, created_by)
    VALUES (
        '00000000-0000-0000-0000-000000000002',
        'Welcome to the Team Chat',
        '00000000-0000-0000-0000-000000000001',
        admin_user_id
    )
    ON CONFLICT (id) DO NOTHING;

    -- Add a welcome message
    INSERT INTO public.chat_comments (thread_id, content, created_by)
    VALUES (
        '00000000-0000-0000-0000-000000000002',
        '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Welcome to the team chat! This is where we can collaborate and communicate effectively."}]}]}',
        admin_user_id
    );
END
$$;

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Verify the data was inserted correctly
SELECT 'Auth User Check' as check_type, count(*) as count, string_agg(id::text, ', ') as user_ids
FROM auth.users
WHERE email = 'bobby@phoenixdata.works';

SELECT 'Team Check' as check_type, count(*) as count
FROM public.teams
WHERE name = 'Admin Team';

SELECT 'Team Membership Check' as check_type, count(*) as count, string_agg(tm.user_id::text, ', ') as member_ids
FROM public.team_members tm
JOIN public.teams t ON t.id = tm.team_id
JOIN public.profiles p ON p.id = tm.user_id
WHERE p.email = 'bobby@phoenixdata.works';