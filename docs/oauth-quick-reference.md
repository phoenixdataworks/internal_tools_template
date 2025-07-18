# OAuth Quick Reference

## Environment Variables Checklist

```bash
# Meta (Facebook/Instagram)
META_OAUTH_APP_ID=
META_OAUTH_CLIENT_SECRET=
META_FACEBOOK_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/facebook/callback
META_INSTAGRAM_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/instagram/callback

# Google (YouTube/GA4)
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_YOUTUBE_REDIRECT_URI=https://yourdomain.com/api/oauth/youtube/callback
GOOGLE_OAUTH_GA4_REDIRECT_URI=https://yourdomain.com/api/oauth/ga4/callback

# X (Twitter)
X_OAUTH_CLIENT_ID=
X_OAUTH_CLIENT_SECRET=
X_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/x/callback
```

## Provider Scopes

| Provider               | Required Scopes                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Facebook**           | `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata`, `business_management`, `public_profile`                                                 |
| **Instagram**          | `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`, `public_profile`, `pages_manage_metadata`, `business_management` |
| **X (Twitter)**        | `tweet.read`, `users.read`, `follows.read`, `offline.access`                                                                                                 |
| **Google Analytics 4** | `https://www.googleapis.com/auth/analytics.readonly`                                                                                                         |
| **YouTube**            | `https://www.googleapis.com/auth/youtube.readonly`, `https://www.googleapis.com/auth/yt-analytics.readonly`                                                  |

## Token Expiry & Refresh

| Provider                 | Access Token Expiry          | Refresh Token | Notes                        |
| ------------------------ | ---------------------------- | ------------- | ---------------------------- |
| **Facebook**             | 60 days (user), Never (page) | User token    | Page tokens are permanent    |
| **Instagram**            | 60 days                      | User token    | Uses Facebook authentication |
| **X (Twitter)**          | 2 hours                      | Yes           | Requires active refresh      |
| **Google (GA4/YouTube)** | 1 hour                       | Yes           | Long-lived refresh tokens    |

## Common Error Codes

| Error                   | Cause                          | Solution                               |
| ----------------------- | ------------------------------ | -------------------------------------- |
| `invalid_state`         | CSRF protection failed         | Check state parameter matches cookie   |
| `access_denied`         | User declined permissions      | Show permission requirements           |
| `redirect_uri_mismatch` | URI doesn't match app settings | Verify exact match in provider console |
| `invalid_grant`         | Code expired/invalid           | Regenerate authorization flow          |
| `insufficient_scope`    | Missing required permissions   | Check granted_scopes parameter         |

## Quick Code Snippets

### Initiate OAuth Flow

```typescript
const handleConnect = (provider: Provider) => {
  const teamId = currentTeam?.id;
  window.location.href = `/api/oauth/${provider}?teamId=${teamId}`;
};
```

### Get Team Tokens

```typescript
import { getTeamProviderAccount } from '@/lib/supabase/vault';

const account = await getTeamProviderAccount(supabase, teamId, 'facebook');
if (account.tokens?.access_token) {
  // Use token for API calls
}
```

### Check Token Expiry

```typescript
import { tokenNeedsRefresh } from '@/lib/supabase/vault';

if (tokenNeedsRefresh(account.expiresIn, 120)) {
  // Refresh token before use
}
```

## Testing Checklist

### Pre-Flight Checks

- [ ] Environment variables set correctly
- [ ] Redirect URIs match provider app settings exactly
- [ ] Provider app is Live or user is a Tester
- [ ] Required permissions have "Advanced Access" (Facebook)
- [ ] Team admin permissions working

### Flow Testing

- [ ] OAuth initiation redirects correctly
- [ ] User can grant permissions
- [ ] Callback processes successfully
- [ ] Tokens stored in vault
- [ ] Provider-specific resources sync
- [ ] Error scenarios handled gracefully

### Provider-Specific Checks

#### Facebook

- [ ] App has required permissions in "Advanced Access"
- [ ] User has admin access to Facebook Pages
- [ ] `granted_scopes` parameter logged and verified

#### Instagram

- [ ] Instagram accounts are Business/Creator (not Personal)
- [ ] Instagram accounts connected to Facebook Pages
- [ ] `id` field explicitly requested in API calls

#### Google

- [ ] `access_type=offline` and `prompt=consent` set
- [ ] Refresh tokens received and stored
- [ ] Properties/channels fetched successfully

#### X (Twitter)

- [ ] PKCE implementation working
- [ ] Token refresh mechanism active
- [ ] Rate limiting handled

## Debugging Commands

```bash
# Check environment variables
echo $META_OAUTH_APP_ID
echo $GOOGLE_OAUTH_CLIENT_ID

# Test redirect URIs
curl -I "https://yourdomain.com/api/oauth/facebook/callback"

# Check database
psql -c "SELECT provider, COUNT(*) FROM social_accounts GROUP BY provider;"
```

## Rate Limits

| Provider        | Limit        | Window      |
| --------------- | ------------ | ----------- |
| **Facebook**    | 600 calls    | 600 seconds |
| **Instagram**   | 600 calls    | 600 seconds |
| **X (Twitter)** | 300 requests | 15 minutes  |
| **Google**      | 100 requests | 100 seconds |

## Security Checklist

- [ ] HTTPS enabled in production
- [ ] Secure cookie settings configured
- [ ] State parameters validated
- [ ] PKCE implemented for supported providers
- [ ] RLS policies active on social_accounts table
- [ ] Vault extension enabled
- [ ] Team admin permissions enforced

## Common Issues & Quick Fixes

| Issue               | Quick Fix                                    |
| ------------------- | -------------------------------------------- |
| "Provider mismatch" | Check redirect URI configuration             |
| "No pages found"    | Verify user has admin access to pages        |
| "Missing ID field"  | Always include `id` in API field requests    |
| "Token expired"     | Implement proactive refresh with buffer time |
| "Permission denied" | Check if all required scopes were granted    |

For detailed implementation, see [OAuth Integration Guide](./oauth-integration-guide.md)
