import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { prefetchUserDataServer } from '@/utils/prefetchServer';

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const { searchParams } = requestUrl;

    // Determine the correct origin based on environment
    const origin = process.env.NEXT_PUBLIC_APP_URL || requestUrl.origin;

    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';
    const inviteToken = searchParams.get('invite_token');
    const provider = searchParams.get('provider');

    // Handle errors first
    if (error) {
      console.error('OAuth error:', error, error_description);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(error_description || error)}`
      );
    }

    if (!code) {
      console.error('No code received in callback');
      return NextResponse.redirect(`${origin}/signin?error=No authorization code received`);
    }

    // Create fresh Supabase instance for this request
    const supabase = await createSupabaseServerClient();
    const queryClient = new QueryClient();

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      return NextResponse.redirect(
        `${origin}/signin?error=${encodeURIComponent(
          exchangeError.message || 'Error signing in with provider'
        )}`
      );
    }

    console.log('[Auth] Successfully exchanged code for session, user:', data?.user?.id);

    // Check if user has a profile, if not create one
    if (data?.user) {
      try {
        // Check if profile exists
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profileData) {
          console.log('[Auth] Profile not found for user, creating one');

          // Extract user data from OAuth metadata
          const userMetadata = data.user.user_metadata || {};

          // Build full name from various possible OAuth fields
          const fullName =
            userMetadata.full_name ||
            userMetadata.name ||
            (userMetadata.first_name && userMetadata.last_name
              ? `${userMetadata.first_name} ${userMetadata.last_name}`
              : userMetadata.first_name || userMetadata.last_name) ||
            data.user.email?.split('@')[0] || // Fallback to email prefix
            'User';

          // Extract avatar URL from various possible OAuth fields
          const avatarUrl =
            userMetadata.avatar_url ||
            userMetadata.picture ||
            userMetadata.photo ||
            userMetadata.image ||
            null;

          // Create or update profile
          const { error: createError } = await supabase.from('profiles').upsert(
            {
              id: data.user.id,
              email: data.user.email!,
              full_name: fullName,
              avatar_url: avatarUrl,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          );

          if (createError) {
            console.error('[Auth] Error creating profile:', createError);
            // Log detailed error information for debugging
            if (createError.code === '42501') {
              console.error(
                '[Auth] RLS Policy violation - user may not have permission to create profile'
              );
              console.error('[Auth] User ID:', data.user.id);
              console.error('[Auth] User Email:', data.user.email);
              console.error('[Auth] User Metadata:', userMetadata);
            }
            // Continue with authentication even if profile creation fails
          } else {
            console.log('[Auth] Profile created/updated for user:', {
              id: data.user.id,
              email: data.user.email,
              fullName,
              hasAvatar: !!avatarUrl,
              provider,
            });
          }
        } else {
          console.log('[Auth] Existing profile found for user:', {
            id: data.user.id,
            fullName: profileData.full_name,
            hasAvatar: !!profileData.avatar_url,
          });
        }

        // Use the centralized prefetch utility
        await prefetchUserDataServer(data.user.id, queryClient);

        // Check the cache before dehydration
        const teamQueryKey = ['teams', data.user.id] as const;
        const teamData = queryClient.getQueryCache().find({ queryKey: teamQueryKey });

        // Serialize the dehydrated state
        const dehydratedState = dehydrate(queryClient);
      } catch (prefetchError) {
        console.error('[Auth] Error prefetching data:', prefetchError);
        // Continue with authentication even if prefetching fails
      }
    }

    // Handle the invite token if present
    // Append token to redirect if processing invite
    let finalRedirectUrl = redirectTo;
    if (inviteToken) {
      finalRedirectUrl = `/accept-invite?token=${encodeURIComponent(inviteToken)}`;
      console.log('[Auth] Appending invite token to redirect:', finalRedirectUrl);
    }

    // Create response with redirect
    return NextResponse.redirect(`${origin}${finalRedirectUrl}`);
  } catch (e) {
    console.error('Unexpected error in auth callback:', e);
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    return NextResponse.redirect(
      `${origin}/signin?error=${encodeURIComponent('An unexpected error occurred')}`
    );
  }
}
