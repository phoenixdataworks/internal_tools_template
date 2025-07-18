import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Provider } from '@/lib/crypto/tokenVault';
import { exchangeFacebookCode } from '@/lib/oauth/facebook';
import { exchangeXCode } from '@/lib/oauth/x';
import { upsertSocialToken } from '@/lib/supabase/vault';
import { syncFacebookPages } from '@/lib/facebook/syncPages';
import { syncYoutubeChannels } from '@/lib/youtube/syncChannels';
import { syncXAccounts } from '@/lib/x/syncAccounts';
import { syncInstagramAccounts } from '@/lib/instagram/syncAccounts';
import { syncGa4Properties } from '@/lib/ga4/syncProperties';
import { fetchGa4Properties } from '@/lib/google/analyticsAdmin';
import { fetchInstagramAccounts } from '@/lib/instagram/fetchAccounts';

/**
 * Common error handler for OAuth flows
 */
function handleOAuthError(error: string, description: string | undefined, request: NextRequest) {
  console.error(`[OAuth CALLBACK] Error: ${error}`, description);
  const errorMessage = encodeURIComponent(description || error);
  // Get origin from request
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(`${origin}/teams/integrations?error=${errorMessage}`, {
    status: 302,
  });
}

/**
 * Token exchange for Google (YouTube & Analytics)
 */
async function exchangeGoogleCode(code: string, codeVerifier: string, provider: 'ga4' | 'youtube') {
  console.log(`[OAuth CALLBACK] Exchanging Google code for ${provider}`);
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  const redirectUri =
    process.env[
      provider === 'ga4' ? 'GOOGLE_OAUTH_GA4_REDIRECT_URI' : 'GOOGLE_OAUTH_YOUTUBE_REDIRECT_URI'
    ]!;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[OAuth CALLBACK] Google token exchange failed:', errorData);
      throw new Error(
        `Google token exchange failed: ${errorData.error_description || errorData.error}`
      );
    }

    const tokenData = await response.json();
    console.log(
      `[OAuth CALLBACK] Google token exchange successful, received ${Object.keys(tokenData).join(', ')}`
    );
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
    };
  } catch (error) {
    console.error('[OAuth CALLBACK] Google token exchange error:', error);
    throw error;
  }
}

/**
 * Fetch Google user profile
 */
async function fetchGoogleProfile(accessToken: string) {
  console.log('[OAuth CALLBACK] Fetching Google profile');
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[OAuth CALLBACK] Failed to fetch Google profile:', response.statusText);
      throw new Error(`Failed to fetch Google profile: ${response.statusText}`);
    }

    const userData = await response.json();
    console.log(
      `[OAuth CALLBACK] Google profile fetched: id=${userData.id}, email=${userData.email}`
    );
    return userData;
  } catch (error) {
    console.error('[OAuth CALLBACK] Error fetching Google profile:', error);
    throw error;
  }
}

/**
 * Save social account to database
 */
async function saveSocialAccount(
  teamId: string,
  provider: Provider,
  providerUserId: string,
  accessToken: string,
  refreshToken: string | null,
  expiresAt: Date | null,
  metadata: any
) {
  console.log(
    `[OAuth CALLBACK] Saving social account: team=${teamId}, provider=${provider}, userId=${providerUserId}`
  );
  try {
    const supabase = await createSupabaseServerClient();

    // Use the vault helper to store tokens securely
    const secretId = await upsertSocialToken(
      supabase,
      teamId,
      provider,
      providerUserId,
      accessToken,
      refreshToken,
      expiresAt,
      metadata
    );

    // Sync provider-specific tables with social_accounts
    try {
      switch (provider) {
        case 'facebook':
          await syncFacebookPages({ supabase, teamId });
          break;
        case 'youtube':
          await syncYoutubeChannels({ supabase, teamId });
          break;
        case 'x':
          await syncXAccounts({ supabase, teamId });
          break;
        case 'instagram':
          await syncInstagramAccounts({ supabase, teamId });
          break;
        case 'ga4':
          await syncGa4Properties({ supabase, teamId });
          break;
      }
    } catch (syncError) {
      // Log but don't fail the overall operation if sync fails
      console.error(`[OAuth CALLBACK] Error syncing ${provider} resources:`, syncError);
    }

    console.log(`[OAuth CALLBACK] Social account saved successfully, secretId=${secretId}`);
    return secretId;
  } catch (error: any) {
    console.error('[OAuth CALLBACK] Error saving social account:', error.message);
    throw error;
  }
}

/**
 * GET handler for /api/oauth/[provider]/callback
 * Processes OAuth callbacks from various providers
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> }
) {
  const params = await context.params;
  const provider = params.provider as Provider;
  const searchParams = request.nextUrl.searchParams;

  // Extract state and error (if any) from callback
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const code = searchParams.get('code');

  // Debug: Log granted_scopes from Facebook
  const grantedScopes = searchParams.get('granted_scopes');
  if (provider === 'facebook' && grantedScopes) {
    console.log(`[OAuth CALLBACK] Facebook granted_scopes: ${grantedScopes}`);

    // Check for critical page permissions
    const hasShowListScope = grantedScopes.includes('pages_show_list');
    const hasReadEngagementScope = grantedScopes.includes('pages_read_engagement');
    const hasManageMetadataScope = grantedScopes.includes('pages_manage_metadata');

    console.log(`[OAuth CALLBACK] Critical permissions granted:
      pages_show_list: ${hasShowListScope ? 'YES' : 'NO'}
      pages_read_engagement: ${hasReadEngagementScope ? 'YES' : 'NO'}
      pages_manage_metadata: ${hasManageMetadataScope ? 'YES' : 'NO'}`);

    if (!hasShowListScope) {
      console.warn(`[OAuth CALLBACK] User did not grant critical permission: pages_show_list
        Without this permission, we cannot access their Facebook Pages.`);
    }
  }

  console.log(
    `[OAuth CALLBACK] Provider: ${provider}, State: ${state}, Code: ${code ? 'present' : 'missing'}, Error: ${error || 'none'}`
  );

  // Handle OAuth errors from provider
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error';
    console.log(`[OAuth CALLBACK] Provider returned error: ${error}, ${errorDescription}`);
    return handleOAuthError(error, errorDescription, request);
  }

  // Validate required parameters
  if (!code) {
    console.log('[OAuth CALLBACK] Missing code parameter');
    return handleOAuthError('missing_code', 'Authorization code is missing from callback', request);
  }

  // Get stored state and other OAuth data from cookies using standard cookies() API
  // In Next.js 15, cookies() returns a Promise that must be awaited
  const cookieStore = await cookies();
  const storedState = cookieStore.get('oauth_state')?.value;
  const codeVerifier = cookieStore.get('oauth_code_verifier')?.value;
  const teamId = cookieStore.get('oauth_team_id')?.value;
  const storedProvider = cookieStore.get('oauth_provider')?.value;

  console.log(
    `[OAuth CALLBACK] Cookies: state=${storedState || 'missing'}, codeVerifier=${codeVerifier ? 'present' : 'missing'}, teamId=${teamId || 'missing'}, provider=${storedProvider || 'missing'}`
  );

  // Get origin from request for absolute URL
  const origin = request.nextUrl.origin;

  // Create response for redirecting after callback processing
  const response = NextResponse.redirect(
    `${origin}/teams/integrations?success=${provider}&action=connected`,
    { status: 302 }
  );

  // Clear OAuth cookies on the response
  response.cookies.set('oauth_state', '', { maxAge: 0 });
  response.cookies.set('oauth_code_verifier', '', { maxAge: 0 });
  response.cookies.set('oauth_team_id', '', { maxAge: 0 });
  response.cookies.set('oauth_provider', '', { maxAge: 0 });

  // Validate state to prevent CSRF
  if (!storedState || storedState !== state) {
    console.log(`[OAuth CALLBACK] Invalid state - stored: ${storedState}, received: ${state}`);
    return handleOAuthError(
      'invalid_state',
      'Security validation failed. Please try connecting again.',
      request
    );
  }

  // Validate provider matches
  if (!storedProvider || storedProvider !== provider) {
    console.log(
      `[OAuth CALLBACK] Provider mismatch - stored: ${storedProvider}, received: ${provider}`
    );
    return handleOAuthError(
      'provider_mismatch',
      'Provider mismatch. Please try connecting again.',
      request
    );
  }

  // Validate teamId
  if (!teamId) {
    console.log('[OAuth CALLBACK] Missing team ID in cookies');
    return handleOAuthError(
      'missing_team_id',
      'Team ID is missing. Please try connecting again.',
      request
    );
  }

  try {
    // Exchange code for tokens based on provider
    let tokenData: any;
    let userData: any;
    let externalId: string;
    let metadata: any;

    switch (provider) {
      case 'ga4':
        if (!codeVerifier) {
          console.log('[OAuth CALLBACK] Missing code verifier');
          return handleOAuthError(
            'missing_code_verifier',
            'PKCE code verifier is missing. Please try connecting again.',
            request
          );
        }

        // Exchange code for Google tokens
        tokenData = await exchangeGoogleCode(code, codeVerifier, provider);

        // Fetch Google user profile
        userData = await fetchGoogleProfile(tokenData.access_token);

        // Fetch GA4 properties right after authentication to store in metadata
        let propertiesMetadata: Array<{
          id: string;
          display_name: string;
          currency?: string;
          time_zone?: string;
        }> = [];
        try {
          const properties = await fetchGa4Properties(tokenData.access_token);
          propertiesMetadata = properties.map((property: any) => ({
            id: property.id,
            display_name: property.displayName || 'GA4 Property',
            currency: property.currencyCode,
            time_zone: property.timeZone,
          }));
          console.log(
            `[OAuth CALLBACK] Fetched ${propertiesMetadata.length} GA4 properties for metadata storage`
          );
        } catch (propertiesError) {
          console.error('[OAuth CALLBACK] Error fetching GA4 properties:', propertiesError);
          // Continue with empty properties array - user can select properties later
        }

        // Set external ID (email) and metadata
        externalId = userData.id;
        metadata = {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
          properties: propertiesMetadata, // Store properties in metadata
        };

        // Calculate token expiry time
        const ga4ExpiresAt = new Date();
        ga4ExpiresAt.setSeconds(ga4ExpiresAt.getSeconds() + tokenData.expires_in);

        // Save account to database
        await saveSocialAccount(
          teamId,
          provider,
          externalId,
          tokenData.access_token,
          tokenData.refresh_token || null,
          ga4ExpiresAt,
          metadata
        );
        break;

      case 'youtube':
        if (!codeVerifier) {
          console.log('[OAuth CALLBACK] Missing code verifier');
          return handleOAuthError(
            'missing_code_verifier',
            'PKCE code verifier is missing. Please try connecting again.',
            request
          );
        }

        // Exchange code for Google tokens
        tokenData = await exchangeGoogleCode(code, codeVerifier, provider);

        // Fetch Google user profile
        userData = await fetchGoogleProfile(tokenData.access_token);

        // Set external ID (email) and metadata
        externalId = userData.id;
        metadata = {
          email: userData.email,
          name: userData.name,
          picture: userData.picture,
        };

        // Calculate token expiry time
        const expiresAt = new Date();
        expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

        // Save account to database
        await saveSocialAccount(
          teamId,
          provider,
          externalId,
          tokenData.access_token,
          tokenData.refresh_token || null,
          expiresAt,
          metadata
        );
        break;

      case 'facebook':
        console.log('[OAuth CALLBACK] Exchanging Facebook code');
        // Exchange code for Facebook tokens and page access
        const fbData = await exchangeFacebookCode(code, 'facebook');
        console.log(
          `[OAuth CALLBACK] Facebook exchange successful: user_id=${fbData.user_id}, pages=${fbData.pages.length}`
        );

        // Calculate expiry time for user token
        const userExpiresAt = new Date();
        userExpiresAt.setSeconds(userExpiresAt.getSeconds() + fbData.expires_in);

        // For Facebook, we save each page as a separate social account
        // Each uses the page's access token which doesn't expire
        if (fbData.pages.length > 0) {
          for (const page of fbData.pages) {
            console.log(
              `[OAuth CALLBACK] Processing Facebook page: id=${page.id}, name=${page.name}`
            );
            await saveSocialAccount(
              teamId,
              'facebook',
              page.id, // provider_user_id is the page ID
              page.access_token, // use page token which is long-lived
              fbData.user_access_token, // store user token as refresh token for future use
              userExpiresAt, // track user token expiry time
              {
                name: page.name,
                category: page.category,
                user_id: fbData.user_id,
                page_id: page.id,
              }
            );
          }
        } else {
          // Fallback: If no pages were found, store the user-level token
          // This helps with debugging and allows us to retry page fetch later
          console.log(
            `[OAuth CALLBACK] No Facebook pages found, storing user token for ${fbData.user_id}`
          );
          await saveSocialAccount(
            teamId,
            'facebook',
            fbData.user_id, // provider_user_id is the user ID
            fbData.user_access_token, // use user token
            null, // no refresh token for user token
            userExpiresAt, // track user token expiry time
            {
              name: 'Facebook User',
              user_id: fbData.user_id,
              note: 'No pages found during initial setup',
            }
          );
        }
        break;

      case 'x':
        if (!codeVerifier) {
          console.log('[OAuth CALLBACK] Missing code verifier for X');
          return handleOAuthError(
            'missing_code_verifier',
            'PKCE code verifier is missing. Please try connecting again.',
            request
          );
        }

        console.log('[OAuth CALLBACK] Exchanging X code');
        // Exchange code for X tokens and profile
        const xData = await exchangeXCode(code, codeVerifier);
        console.log(`[OAuth CALLBACK] X exchange successful: user_id=${xData.user_id}`);

        // Calculate expiry time
        const xExpiresAt = new Date();
        xExpiresAt.setSeconds(xExpiresAt.getSeconds() + xData.expires_in);

        // Save account to database
        await saveSocialAccount(
          teamId,
          'x',
          xData.user_id,
          xData.access_token,
          xData.refresh_token || null,
          xExpiresAt,
          xData.metadata
        );
        break;

      case 'instagram':
        console.log('[OAuth CALLBACK] Exchanging Instagram code');
        // Exchange code for Facebook tokens (Instagram uses Facebook's OAuth)
        const igData = await exchangeFacebookCode(code, 'instagram');
        console.log(`[OAuth CALLBACK] Instagram exchange successful: user_id=${igData.user_id}`);

        // Calculate expiry time for user token
        const igExpiresAt = new Date();
        igExpiresAt.setSeconds(igExpiresAt.getSeconds() + igData.expires_in);

        // Fetch connected Instagram accounts
        const instagramAccounts = await fetchInstagramAccounts(igData.user_access_token);
        console.log(`[OAuth CALLBACK] Found ${instagramAccounts.length} Instagram accounts`);

        if (instagramAccounts.length > 0) {
          for (const account of instagramAccounts) {
            // Add validation to ensure account has a valid ID
            if (!account.id) {
              console.error('[OAuth CALLBACK] Instagram account missing ID, skipping:', account);
              continue;
            }

            console.log(
              `[OAuth CALLBACK] Processing Instagram account: id=${account.id}, username=${account.username}`
            );
            await saveSocialAccount(
              teamId,
              'instagram',
              account.id, // provider_user_id is the Instagram account ID
              igData.user_access_token, // use long-lived user token
              igData.user_access_token, // store user token as refresh token (same as Facebook)
              igExpiresAt, // track user token expiry time
              {
                name: account.name,
                username: account.username,
                fb_page_id: account.fb_page_id,
                biography: account.biography,
                website: account.website,
                followers_count: account.followers_count,
                follows_count: account.follows_count,
                media_count: account.media_count,
                profile_picture_url: account.profile_picture_url,
                is_business_account: account.is_business_account,
                user_id: igData.user_id,
              }
            );
          }
        } else {
          // Fallback: If no Instagram accounts were found, store the user-level token
          console.log(
            `[OAuth CALLBACK] No Instagram accounts found, storing user token for ${igData.user_id}`
          );
          await saveSocialAccount(
            teamId,
            'instagram',
            igData.user_id, // provider_user_id is the user ID
            igData.user_access_token, // use user token
            igData.user_access_token, // store user token as refresh token
            igExpiresAt, // track user token expiry time
            {
              name: 'Instagram User',
              user_id: igData.user_id,
              note: 'No Instagram business accounts found during initial setup',
            }
          );
        }
        break;

      default:
        console.log(`[OAuth CALLBACK] Provider not implemented: ${provider}`);
        return handleOAuthError(
          'provider_not_implemented',
          `OAuth for ${provider} is not yet implemented.`,
          request
        );
    }

    console.log(`[OAuth CALLBACK] OAuth flow completed successfully for ${provider}`);
    // Return response with cookies cleared
    return response;
  } catch (err: any) {
    console.error(`[OAuth CALLBACK] Error for ${provider}:`, err);
    return handleOAuthError(
      'callback_error',
      err.message ?? 'Unknown Facebook OAuth error',
      request
    );
  }
}
