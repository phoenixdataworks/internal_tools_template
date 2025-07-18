'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signup(data: any) {
  const supabase = await createSupabaseServerClient();
  const user = {
    email: data.email,
    password: data.password,
  };

  const { error, data: signupResult } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}${data.redirectTo}`,
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        full_name: `${data.firstName} ${data.lastName}`,
      },
    },
  });
  console.log('error ', error);
  if (error) throw error;
  revalidatePath('/', 'layout');
}

export async function signin(data: any) {
  const supabase = await createSupabaseServerClient();
  const user = {
    email: data.email,
    password: data.password,
  };

  const { error, data: result } = await supabase.auth.signInWithPassword(user);
  console.log('[Auth] Signin action result:', result);
  if (error) throw error;

  // Revalidate the layout to ensure fresh data
  revalidatePath('/', 'layout');

  // Redirect to the specified path or default to dashboard
  const redirectPath = data.redirectTo || '/dashboard';
  const finalRedirectPath = redirectPath;

  console.log(`[Auth] Redirecting to: ${finalRedirectPath}`);
  redirect(finalRedirectPath);
}

export async function signOut() {
  // No need to call supabase.auth.signOut() here
  // Just redirect to the signout route
  revalidatePath('/', 'layout');
  redirect('/signout');
}

export async function signInWithOAuth(provider: 'google' | 'azure', redirectTo: string) {
  const supabase = await createSupabaseServerClient();

  // Parse the redirectTo URL to extract any query parameters
  const redirectUrl = new URL(redirectTo);
  const callbackUrl = redirectUrl.origin + '/auth/callback';

  // Extract any additional query parameters from the redirectTo URL
  const searchParams = redirectUrl.searchParams;
  const redirectParam = searchParams.get('redirectTo');

  // Build the final callback URL with all necessary parameters
  const finalRedirectTo = `${callbackUrl}?provider=${provider}${
    redirectParam ? `&redirectTo=${encodeURIComponent(redirectParam)}` : ''
  }`;

  console.log(`[Auth] OAuth redirect setup: ${finalRedirectTo}`);

  const options: any = {
    redirectTo: finalRedirectTo,
  };

  if (provider === 'google') {
    options.queryParams = {
      access_type: 'offline',
      prompt: 'consent',
      scope: 'email profile',
    };
  } else if (provider === 'azure') {
    options.scopes = 'email profile openid';
    options.queryParams = {
      prompt: 'select_account',
      access_type: 'offline',
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options,
  });

  if (error) {
    console.error(`[Auth] OAuth error:`, error);
    throw error;
  }

  console.log(`[Auth] OAuth initiated for provider: ${provider}`);
  return data;
}

export async function updateUserPassword(password: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) throw error;
  revalidatePath('/', 'layout');
}

export async function updateUserProfile(userId: string, updates: any) {
  const supabase = await createSupabaseServerClient();

  // Update user metadata if needed
  if (updates.metadata) {
    const { error: authError } = await supabase.auth.updateUser({
      data: updates.metadata,
    });

    if (authError) throw authError;
  }

  // Update profile in database
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: updates.full_name,
      updated_at: new Date().toISOString(),
      ...updates,
    })
    .eq('id', userId);

  if (profileError) throw profileError;
  revalidatePath('/', 'layout');
}

/**
 * Server-side function to fetch user profile
 */
export async function fetchUserProfileServer(userId: string) {
  const supabase = await createSupabaseServerClient();
  return await supabase.from('profiles').select('*').eq('id', userId).single();
}

/**
 * Server-side function to fetch user teams
 */
export async function fetchUserTeamsServer(userId: string) {
  const supabase = await createSupabaseServerClient();

  const result = await supabase
    .from('teams')
    .select(
      `
      *,
      team_members!inner (
        user_id,
        role
      )
    `
    )
    .eq('team_members.user_id', userId);

  console.log('[Server] Teams result:', {
    success: !result.error,
    teamsCount: result.data?.length || 0,
    error: result.error ? result.error.message : null,
  });

  return result;
}
