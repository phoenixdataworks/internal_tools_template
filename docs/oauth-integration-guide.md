# Social Media OAuth Integration Guide

## Overview

Our platform provides secure OAuth integration with multiple social media providers to enable teams to connect their accounts and sync analytics data. This guide covers the complete OAuth flow, secure token storage architecture, and implementation details for all supported providers.

## Supported Providers

- **Facebook** - Facebook Pages and business accounts
- **Instagram** - Instagram Business accounts (via Facebook)
- **X (Twitter)** - Twitter accounts and analytics
- **Google Analytics 4** - GA4 properties and metrics
- **YouTube** - YouTube channels and analytics

## Architecture Overview

### Core Components

1. **OAuth Initiation** (`/api/oauth/[provider]`)
2. **OAuth Callback** (`/api/oauth/[provider]/callback`)
3. **Token Refresh** (`/api/oauth/[provider]/refresh`)
4. **Secure Token Storage** (Supabase Vault)
5. **Token Management** (Vault helper functions)

### Security Features

- **PKCE (Proof Key for Code Exchange)** for X and Google providers
- **CSRF Protection** using state parameters
- **Encrypted Token Storage** via Supabase Vault
- **Row Level Security (RLS)** for team-based access control
- **Secure Cookie Handling** for OAuth state management

## Database Schema

### Social Accounts Table

```sql
CREATE TABLE public.social_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    provider provider NOT NULL, -- enum: facebook, instagram, x, ga4, youtube
    provider_user_id TEXT NOT NULL,
    secret_id UUID UNIQUE, -- References vault.secrets for encrypted tokens
    expires_at TIMESTAMPTZ,
    scope TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    UNIQUE(team_id, provider, provider_user_id)
);
```

### Secure Token Storage

Tokens are stored encrypted in Supabase Vault:

```sql
-- Token data structure in vault
{
  "access_token": "encrypted_access_token",
  "refresh_token": "encrypted_refresh_token",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## OAuth Flow Implementation

### 1. OAuth Initiation

**Endpoint**: `GET /api/oauth/[provider]?teamId={teamId}`

**Process**:

1. Validate user authentication and team admin permissions
2. Generate secure state and PKCE parameters
3. Build provider-specific authorization URL
4. Store OAuth state in secure cookies
5. Redirect user to provider's authorization endpoint

**Security Measures**:

- State parameter for CSRF protection
- PKCE code challenge for supported providers
- Secure cookie storage with httpOnly flag
- Team admin permission validation

### 2. OAuth Callback

**Endpoint**: `GET /api/oauth/[provider]/callback`

**Process**:

1. Validate state parameter against stored cookie
2. Exchange authorization code for access tokens
3. Fetch user profile and provider-specific data
4. Store tokens securely in Supabase Vault
5. Sync provider-specific resources (pages, channels, etc.)
6. Redirect to integrations page with success notification

**Token Exchange Examples**:

#### Facebook/Instagram

```javascript
// Exchange code for short-lived token
const response = await fetch('https://graph.facebook.com/v23.0/oauth/access_token', {
  method: 'POST',
  body: new URLSearchParams({
    client_id: process.env.META_OAUTH_APP_ID,
    client_secret: process.env.META_OAUTH_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code: authorizationCode,
  }),
});

// Exchange for long-lived token
const longLivedResponse = await fetch(
  `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortLivedToken}`
);
```

#### Google (YouTube/GA4)

```javascript
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    code: authorizationCode,
    code_verifier: codeVerifier, // PKCE
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
});
```

#### X (Twitter)

```javascript
const response = await fetch('https://api.twitter.com/2/oauth2/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
  },
  body: new URLSearchParams({
    code: authorizationCode,
    code_verifier: codeVerifier, // PKCE
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  }),
});
```

### 3. Secure Token Storage

**Vault Functions**:

```sql
-- Store tokens securely
SELECT public.upsert_social_token(
  p_team_id := 'team-uuid',
  p_provider := 'facebook',
  p_provider_user_id := 'provider-user-id',
  p_access_token := 'access-token',
  p_refresh_token := 'refresh-token',
  p_expires_at := '2024-12-31T23:59:59Z',
  p_scope := 'pages_show_list,pages_read_engagement',
  p_metadata := '{"email": "user@example.com"}'
);

-- Retrieve tokens securely
SELECT public.get_social_access_token('account-uuid');
SELECT public.get_social_refresh_token('account-uuid');
```

## Provider-Specific Configuration

### Facebook

- **Scopes**: `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `business_management`, `public_profile`
- **Token Type**: Long-lived user tokens + page tokens
- **Expiry**: 60 days for user tokens, no expiry for page tokens
- **Special Notes**:
  - Requires Facebook App to be Live or user to be a Tester
  - Page tokens are permanent and don't require refreshing
  - User token is used to get page-specific access tokens
  - For Facebook, provider_user_id is the Page ID (not User ID)

**Facebook-Specific Implementation**:

```javascript
// After getting long-lived user token, fetch pages
const pagesResponse = await fetch('https://graph.facebook.com/v23.0/me/accounts', {
  headers: { Authorization: `Bearer ${longLivedUserToken}` },
});

// Each page gets its own permanent access token
const pages = await pagesResponse.json();
for (const page of pages.data) {
  await upsertSocialToken(
    supabase,
    teamId,
    'facebook',
    page.id, // Page ID as provider_user_id
    page.access_token, // Permanent page token
    longLivedUserToken, // User token as refresh token
    null, // Page tokens don't expire
    { name: page.name, category: page.category }
  );
}
```

**Rate Limiting**: Facebook Graph API has a limit of 600 calls per 600 seconds.

### Instagram

- **Scopes**: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `public_profile`, `pages_manage_metadata`, `business_management`
- **Token Type**: Uses Facebook authentication
- **Dependencies**: Requires Facebook Page connection
- **Special Notes**:
  - Only works with Instagram Business and Creator accounts
  - Personal Instagram accounts are not supported
  - Uses Facebook's Graph API for authentication
  - Must explicitly request `id` field in API requests

**Instagram-Specific Implementation**:

```javascript
// Instagram uses Facebook OAuth but fetches Instagram accounts
// 1. Get Facebook pages first
const pagesResponse = await fetch('https://graph.facebook.com/v23.0/me/accounts', {
  headers: { Authorization: `Bearer ${longLivedUserToken}` },
});

// 2. Check which pages have Instagram accounts
for (const page of pages.data) {
  const igResponse = await fetch(
    `https://graph.facebook.com/v23.0/${page.id}?fields=instagram_business_account`,
    { headers: { Authorization: `Bearer ${page.access_token}` } }
  );

  const igData = await igResponse.json();
  if (igData.instagram_business_account) {
    // 3. Fetch Instagram account details
    const igAccountResponse = await fetch(
      `https://graph.facebook.com/v23.0/${igData.instagram_business_account.id}?fields=id,username,name,biography,followers_count,media_count`,
      { headers: { Authorization: `Bearer ${page.access_token}` } }
    );

    const igAccount = await igAccountResponse.json();
    await upsertSocialToken(
      supabase,
      teamId,
      'instagram',
      igAccount.id, // Instagram account ID
      page.access_token, // Page token works for Instagram
      longLivedUserToken,
      null,
      { username: igAccount.username, name: igAccount.name }
    );
  }
}
```

### X (Twitter)

- **Scopes**: `tweet.read`, `users.read`, `follows.read`, `offline.access`
- **Token Type**: Bearer tokens with refresh capability
- **Security**: Uses PKCE for enhanced security
- **Expiry**: 2 hours for access tokens
- **Special Notes**:
  - Requires PKCE implementation
  - Short token expiry requires active refresh management
  - Uses Basic Auth for token exchange

### Google Analytics 4

- **Scopes**: `https://www.googleapis.com/auth/analytics.readonly`
- **Token Type**: OAuth 2.0 with refresh tokens
- **Security**: Uses PKCE
- **Special Parameters**: `access_type=offline`, `prompt=consent`
- **Special Notes**:
  - Fetches GA4 properties immediately after authentication
  - Stores properties in metadata for later selection
  - Requires explicit consent prompt for refresh tokens

### YouTube

- **Scopes**: `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/yt-analytics.readonly`
- **Token Type**: OAuth 2.0 with refresh tokens
- **Security**: Uses PKCE
- **Special Parameters**: `access_type=offline`, `prompt=consent`

## Security Implementation

### Row Level Security (RLS)

```sql
-- Team members can read social accounts
CREATE POLICY "Team members can read social accounts"
ON public.social_accounts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = social_accounts.team_id
    AND tm.user_id = auth.uid()
  )
);

-- Team admins can manage social accounts
CREATE POLICY "Team admins can manage social accounts"
ON public.social_accounts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = social_accounts.team_id
    AND tm.user_id = auth.uid()
    AND tm.role = 'admin'
  )
);
```

### Token Access Control

```sql
-- Secure view for REST API access
CREATE VIEW public.rest_social_tokens AS
SELECT account_id, team_id, provider, access_token, refresh_token
FROM public.team_social_tokens
WHERE EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE tm.team_id = team_social_tokens.team_id
  AND tm.user_id = auth.uid()
);
```

## Token Management

### Automatic Token Refresh

```typescript
// Check if token needs refresh
export function tokenNeedsRefresh(expiresIn: number | null, bufferSeconds: number = 120): boolean {
  if (expiresIn === null) return true;
  return expiresIn <= bufferSeconds;
}

// Refresh token workflow
const { tokens, isExpired } = await getTeamProviderAccount(supabase, teamId, provider);
if (isExpired || tokenNeedsRefresh(tokens?.expiresIn)) {
  await refreshProviderToken(provider, tokens?.refresh_token);
}
```

### Token Retrieval

```typescript
// Get complete account and token data
const account = await getTeamProviderAccount(supabase, teamId, 'facebook');

// Get specific tokens
const accessToken = await getAccessToken(supabase, accountId);
const refreshToken = await getRefreshToken(supabase, accountId);
```

## Error Handling

### Common Error Scenarios

1. **Invalid State Parameter**
   - Cause: CSRF attack or expired cookies
   - Response: Redirect to error page with security message

2. **Missing Permissions**
   - Cause: User declined critical permissions
   - Response: Show specific permission requirements

3. **Token Exchange Failure**
   - Cause: Invalid code or network issues
   - Response: Log error and redirect with user-friendly message

4. **Team Permission Issues**
   - Cause: User not team admin
   - Response: 403 Forbidden with clear message

5. **Provider Mismatch (Instagram/Facebook)**
   - Cause: Incorrect redirect URI configuration
   - Response: Ensure separate redirect URIs for each provider

### Error Logging

```typescript
// OAuth operation logging
INSERT INTO public.oauth_logs (
  operation, team_id, provider, provider_user_id,
  secret_id, succeeded, details
) VALUES (
  'token_exchange', team_id, provider, provider_user_id,
  secret_id, false, jsonb_build_object('error', error_message)
);
```

## Environment Variables

### Required Configuration

```bash
# Meta (Facebook/Instagram)
META_OAUTH_APP_ID=your_facebook_app_id
META_OAUTH_CLIENT_SECRET=your_facebook_app_secret
META_FACEBOOK_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/facebook/callback
META_INSTAGRAM_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/instagram/callback

# Google (YouTube/GA4)
GOOGLE_OAUTH_CLIENT_ID=your_google_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_client_secret
GOOGLE_OAUTH_YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/oauth/youtube/callback
GOOGLE_OAUTH_GA4_REDIRECT_URI=https://yourdomain.com/api/oauth/ga4/callback

# X (Twitter)
X_OAUTH_CLIENT_ID=your_twitter_client_id
X_OAUTH_CLIENT_SECRET=your_twitter_client_secret
X_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/x/callback
```

## Testing and Debugging

### OAuth Flow Testing

1. **Test with Admin Users**: Ensure team admin permissions work correctly
2. **Test Permission Scopes**: Verify all required permissions are requested
3. **Test Error Scenarios**: Simulate user declining permissions
4. **Test Token Refresh**: Verify automatic token refresh works
5. **Test Cross-Provider**: Ensure no interference between providers

### Debugging Tools

```typescript
// Enable detailed OAuth logging
console.log(`[OAuth INIT] Provider: ${provider}, TeamID: ${teamId}`);
console.log(`[OAuth CALLBACK] Granted scopes: ${grantedScopes}`);
console.log(`[Vault] Token stored with secretId: ${secretId}`);
```

### Provider-Specific Debugging

#### Facebook/Instagram

```typescript
// Log granted scopes to verify permissions
const grantedScopes = searchParams.get('granted_scopes');
console.log(`Facebook granted scopes: ${grantedScopes}`);

// Check for critical permissions
const hasShowListScope = grantedScopes?.includes('pages_show_list');
const hasReadEngagementScope = grantedScopes?.includes('pages_read_engagement');
if (!hasShowListScope) {
  console.warn('User did not grant critical permission: pages_show_list');
}
```

**Facebook App Configuration Checklist**:

- App must be Live OR user must be a Tester
- Required permissions must be in "Advanced Access"
- Redirect URI must match exactly (including protocol)
- User must check all permission boxes in consent dialog

#### Instagram Specific

```typescript
// Always explicitly request ID field
const igAccountResponse = await fetch(
  `https://graph.facebook.com/v23.0/${igAccountId}?fields=id,username,name`, // Always include 'id'
  { headers: { Authorization: `Bearer ${pageToken}` } }
);

// Validate account has ID before saving
const igAccount = await igAccountResponse.json();
if (!igAccount.id) {
  console.error('Instagram account missing ID field');
  return;
}
```

### Common Issues

1. **Redirect URI Mismatch**
   - Ensure exact match in provider app settings
   - Check for trailing slashes and protocol
   - Use separate redirect URIs for Facebook and Instagram

2. **Permission Scope Issues**
   - Verify app has required permissions approved
   - Check if app is in development vs production mode
   - For Facebook: Ensure "Advanced Access" is granted for required permissions

3. **Token Storage Failures**
   - Verify Supabase Vault extension is enabled
   - Check RLS policies allow token storage
   - Ensure all required parameters are passed to database functions

4. **Instagram Business Account Issues**
   - Verify Instagram account is Business or Creator (not Personal)
   - Ensure Instagram account is properly connected to Facebook Page
   - Check that Facebook App has "Instagram Basic Display" product added

5. **Missing Account IDs (Instagram)**
   - Always explicitly request `id` field in API requests
   - Validate account has ID before database operations
   - Log full API responses when debugging

## Troubleshooting Guide

### Facebook Issues

- **No Pages Found**: User may not have admin access to any Facebook Pages
- **Permission Denied**: Check if user granted all required permissions in consent dialog
- **Rate Limiting**: Implement exponential backoff for API calls

### Instagram Issues

- **No Instagram Accounts**: User's Facebook Pages may not have connected Instagram Business accounts
- **API Field Errors**: Always include `id` field explicitly in requests
- **Personal Account Error**: Instagram Graph API only supports Business/Creator accounts

### Google Issues

- **No Refresh Token**: Ensure `access_type=offline` and `prompt=consent` are set
- **Properties Not Found**: User may not have access to any GA4 properties
- **PKCE Errors**: Verify code_verifier matches code_challenge

### X Issues

- **PKCE Validation Failed**: Ensure code_verifier is properly generated and stored
- **Token Expired**: Implement proactive token refresh (2-hour expiry)
- **Rate Limiting**: Monitor API usage and implement proper backoff

## Best Practices

### Security

- Always use HTTPS in production
- Implement proper CSRF protection
- Use secure cookie settings
- Regularly rotate client secrets
- Monitor for suspicious OAuth activity

### Performance

- Cache frequently accessed tokens
- Implement proper error boundaries
- Use connection pooling for database operations
- Monitor API rate limits

### Maintenance

- Regularly audit OAuth permissions
- Monitor token expiry and refresh rates
- Keep provider SDK versions updated
- Document any provider-specific quirks

## Integration Examples

### Frontend Integration Button

```typescript
const handleConnect = async (provider: Provider) => {
  const teamId = currentTeam?.id;
  if (!teamId) return;

  // Redirect to OAuth initiation
  window.location.href = `/api/oauth/${provider}?teamId=${teamId}`;
};
```

### Backend Token Usage

```typescript
// Get tokens for API calls
const account = await getTeamProviderAccount(supabase, teamId, 'facebook');
if (account.tokens?.access_token) {
  const response = await fetch(`https://graph.facebook.com/v23.0/me/accounts`, {
    headers: { Authorization: `Bearer ${account.tokens.access_token}` },
  });
}
```

This comprehensive OAuth integration provides secure, scalable social media authentication with proper token management and team-based access control.
