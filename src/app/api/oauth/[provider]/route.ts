import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { generateRandomString, Provider, generateCodeChallenge } from '@/lib/crypto/tokenVault';
import { googleOAuthConfig } from '@/lib/oauth/google';

// Map of OAuth endpoints for each provider
const AUTH_ENDPOINTS = {
  facebook: 'https://www.facebook.com/v23.0/dialog/oauth',
  instagram: 'https://www.facebook.com/v23.0/dialog/oauth', // Instagram uses Facebook's OAuth
  x: 'https://twitter.com/i/oauth2/authorize',
  ga4: 'https://accounts.google.com/o/oauth2/v2/auth',
  youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
};

// Default scopes for each provider
const DEFAULT_SCOPES = {
  facebook: [
    'pages_show_list',
    'pages_read_engagement',
    'pages_read_user_content',
    'pages_manage_metadata', //  ← NEW
    'read_insights',
    'public_profile',
    'business_management',
  ],
  instagram: [
    'instagram_basic',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'public_profile',
    'pages_manage_metadata',
    'business_management',
  ],
  x: ['tweet.read', 'users.read', 'follows.read', 'offline.access'],
  ga4: googleOAuthConfig.ga4Scopes,
  youtube: googleOAuthConfig.youtubeScopes,
};

// OAuth configurations
const OAUTH_CONFIG = {
  facebook: {
    client_id: process.env.META_OAUTH_APP_ID!,
    redirect_uri: process.env.META_FACEBOOK_OAUTH_REDIRECT_URI!,
  },
  instagram: {
    client_id: process.env.META_OAUTH_APP_ID!,
    redirect_uri: process.env.META_INSTAGRAM_OAUTH_REDIRECT_URI!,
  },
  x: {
    client_id: process.env.X_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.X_OAUTH_REDIRECT_URI!,
  },
  ga4: {
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_GA4_REDIRECT_URI!,
  },
  youtube: {
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_YOUTUBE_REDIRECT_URI!,
  },
};

/**
 * Cookie options for OAuth state
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as 'lax' | 'strict' | 'none',
  maxAge: 60 * 10, // 10 minutes
};

/**
 * GET handler for /api/oauth/[provider]
 * This initiates the OAuth flow for the specified provider
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const params = await context.params;
  const provider = params.provider as Provider;
  const searchParams = request.nextUrl.searchParams;
  const teamId = searchParams.get('teamId');

  console.log(`[OAuth INIT] Provider: ${provider}, TeamID: ${teamId}`);

  // Validate provider
  if (!Object.keys(AUTH_ENDPOINTS).includes(provider)) {
    console.log(`[OAuth INIT] Invalid provider: ${provider}`);
    return NextResponse.json({ error: `Invalid provider: ${provider}` }, { status: 400 });
  }

  // Validate teamId
  if (!teamId) {
    console.log(`[OAuth INIT] Missing teamId`);
    return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
  }

  // Verify user is authenticated and is a team admin
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log(`[OAuth INIT] Unauthenticated - no user found`);
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  console.log(`[OAuth INIT] User authenticated: ${user.id}`);

  // Check if user is a team admin
  const { data: teamMember, error: teamError } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single();

  if (teamError) {
    console.log(`[OAuth INIT] Team member query error: ${teamError.message}`);
  }

  if (teamError || !teamMember || teamMember.role !== 'admin') {
    console.log(`[OAuth INIT] User is not a team admin: role=${teamMember?.role || 'none'}`);
    return NextResponse.json(
      { error: 'You must be a team admin to connect social accounts' },
      { status: 403 }
    );
  }

  // Generate state and code verifier (for PKCE)
  const state = generateRandomString(32);
  const codeVerifier = generateRandomString(64);

  // Generate code challenge for PKCE
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Build provider-specific authorization URL
  const authUrl = new URL(AUTH_ENDPOINTS[provider]);

  // Common OAuth 2.0 parameters
  authUrl.searchParams.append('client_id', OAUTH_CONFIG[provider].client_id);
  authUrl.searchParams.append('redirect_uri', OAUTH_CONFIG[provider].redirect_uri);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', DEFAULT_SCOPES[provider].join(' '));

  // Google-specific parameters for refresh token and explicit consent
  if (provider === 'ga4' || provider === 'youtube') {
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');
  }

  // Add PKCE parameters for providers that support it (X and Google)
  if (provider === 'x' || provider === 'ga4' || provider === 'youtube') {
    // For providers that support PKCE, use the proper code challenge
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('code_challenge', codeChallenge);
  }

  // Create response with proper redirect
  const response = NextResponse.redirect(authUrl.toString(), { status: 302 });

  // Enhanced debugging for OAuth initiation
  if (provider === 'facebook' || provider === 'instagram') {
    const requestedScopes = DEFAULT_SCOPES[provider].join(' ');
    console.log(`[OAuth INIT] ${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth details:
      - App ID: ${OAUTH_CONFIG[provider].client_id.substring(0, 4)}...
      - Redirect URI: ${OAUTH_CONFIG[provider].redirect_uri}
      - Requested Scopes: ${requestedScopes}
      - State: ${state.substring(0, 8)}...
      - Full Auth URL: ${authUrl.toString()}`);
    console.log(`[OAuth INIT] Make sure the Facebook app is properly configured:
      1. App should be Live OR the user should be a Tester
      2. Required permissions (pages_show_list, pages_read_engagement) should be in "Advanced Access"
      3. User must check all permission boxes in the Facebook consent dialog`);
  }

  console.log(`[OAuth INIT] Redirecting to: ${authUrl.toString()}`);

  // Store OAuth data in cookies
  response.cookies.set('oauth_state', state, COOKIE_OPTIONS);
  response.cookies.set('oauth_code_verifier', codeVerifier, COOKIE_OPTIONS);
  response.cookies.set('oauth_team_id', teamId, COOKIE_OPTIONS);
  response.cookies.set('oauth_provider', provider, COOKIE_OPTIONS);
  console.log(`[OAuth INIT] Cookies set for: state, code_verifier, team_id, provider`);

  return response;
}
