# Secure Token Handling

This document outlines the standard approach for working with secure tokens (OAuth, API keys, etc.) in our application using Supabase Vault.

## Principles

1. Tokens are sensitive data and must be stored securely
2. We use Supabase Vault for encrypted storage
3. All token operations follow a consistent pattern
4. Direct access to vault tables is prohibited in application code
5. All access is mediated through established helper functions

## Database Architecture

Our secure token storage uses:

- `public.social_accounts`: Stores metadata about connections but not the tokens themselves
- `vault.secrets`: Encrypted storage for token bundles
- `vault.decrypted_secrets`: View that exposes decrypted values (with RLS applied)
- RPC functions that handle token operations safely

## TypeScript Interfaces

### Core Token Data Structure

```typescript
interface SocialTokenData {
  access_token: string;
  refresh_token?: string | null;
  [k: string]: unknown; // Provider-specific extras
}

interface TeamProviderAccount {
  account: {
    id: string;
    provider_user_id: string;
    expires_at: string | null;
    metadata: Record<string, any> | null;
  } | null;
  tokens: SocialTokenData | null;
  expiresAt: number | null; // UNIX timestamp in seconds
  isExpired: boolean;
  expiresIn: number | null; // seconds until expiry
}
```

## Standard Workflow

### Storing Tokens

```typescript
import { upsertSocialToken } from '@/lib/supabase/vault';

// Store tokens received from OAuth or other source
await upsertSocialToken(
  supabase,
  teamId,
  'provider', // Provider enum value
  providerUserId,
  accessToken,
  refreshToken,
  expiresAt, // Date object or null
  metadata // Optional metadata object
);
```

### Retrieving Tokens

```typescript
import {
  getTeamProviderAccount,
  getSocialTokenData,
  tokenNeedsRefresh,
} from '@/lib/supabase/vault';

// Method 1: Get account and tokens together with expiry info (preferred)
const providerData = await getTeamProviderAccount(supabase, teamId, 'provider');

const { account, tokens, expiresAt, isExpired, expiresIn } = providerData;

if (tokens?.access_token) {
  // Use tokens.access_token and tokens.refresh_token
}

// Check if token needs refreshing within a buffer period (default 120s)
if (tokenNeedsRefresh(expiresIn)) {
  // Refresh token logic
}

// Method 2: Get tokens when you already have an account ID
const tokens = await getSocialTokenData(supabase, accountId);
```

## Token Refresh Pattern

When a token needs refreshing:

1. Use the provider's refresh mechanism
2. Store the new token immediately
3. Continue with the operation

```typescript
const providerData = await getTeamProviderAccount(supabase, teamId, 'provider');

const { account, tokens, expiresIn } = providerData;

// Check expiry within a 2-minute buffer period
if (tokenNeedsRefresh(expiresIn)) {
  const refreshed = await refreshProviderToken(tokens.refresh_token);

  // Store the refreshed token
  await upsertSocialToken(
    supabase,
    teamId,
    'provider',
    account.provider_user_id,
    refreshed.access_token,
    tokens.refresh_token, // Keep same refresh token unless it changed
    new Date(Date.now() + refreshed.expires_in * 1000),
    account.metadata
  );

  // Use the new access token
  return refreshed.access_token;
}

return tokens.access_token;
```

## Utility Functions

The vault module provides several helper functions for working with tokens:

- `getTeamProviderAccount`: Get account, tokens, and expiry info in one call
- `getSocialTokenData`: Get token data for a specific account ID
- `tokenNeedsRefresh`: Check if a token needs refreshing based on expiry
- `upsertSocialToken`: Store or update a token
- `getAccessToken` / `getRefreshToken`: Get individual tokens
- `normalizeTokenPayload`: Safely parse token data from vault
- `calculateExpiryInfo`: Calculate expiry timestamps and status

## Security Best Practices

### ❌ NEVER DO THIS

**Never directly query the vault tables or views:**

```typescript
// BAD - Don't do this!
const { data } = await supabase.from('vault.decrypted_secrets').select('*').eq('id', secretId);
```

**Never write your own token handling logic:**

```typescript
// BAD - Don't do this!
const { data } = await supabase
  .from('social_accounts')
  .select('*')
  .eq('team_id', teamId)
  .eq('provider', provider);

// Then getting secret_id and querying vault...
```

**Never manually calculate expiry or refresh timing:**

```typescript
// BAD - Don't do this!
const expiryDate = new Date(account.expires_at);
if (Date.now() > expiryDate.getTime()) {
  // Roll your own refresh logic
}
```

### ✅ DO THIS INSTEAD

**Use helper functions for all token operations:**

```typescript
// GOOD - Use established patterns
const account = await getTeamProviderAccount(supabase, teamId, provider);
if (tokenNeedsRefresh(account.expiresIn)) {
  // Use established refresh pattern
}
```

**Always validate token data:**

```typescript
// GOOD - Validate before use
const tokens = normalizeTokenPayload(rawTokenData);
if (!tokens?.access_token) {
  throw new Error('Invalid token data');
}
```

## Error Handling

### Token Validation

```typescript
// Always validate token existence and format
const account = await getTeamProviderAccount(supabase, teamId, provider);
if (!account.tokens?.access_token) {
  throw new Error(`No valid ${provider} token found for team ${teamId}`);
}

// Check token expiry with buffer
if (account.isExpired || tokenNeedsRefresh(account.expiresIn, 300)) {
  // Handle refresh or re-authentication
}
```

### Graceful Degradation

```typescript
// Handle missing or invalid tokens gracefully
try {
  const tokens = await getSocialTokenData(supabase, accountId);
  if (!tokens) {
    return { error: 'Token not found', requiresReauth: true };
  }

  // Use tokens for API call
  return await makeAPICall(tokens.access_token);
} catch (error) {
  console.error('Token operation failed:', error);
  return { error: 'Authentication failed', requiresReauth: true };
}
```

## Performance Considerations

### Token Caching

```typescript
// Cache tokens for short periods to reduce database calls
const tokenCache = new Map<string, { tokens: SocialTokenData; expires: number }>();

async function getCachedToken(teamId: string, provider: string): Promise<string | null> {
  const cacheKey = `${teamId}:${provider}`;
  const cached = tokenCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.tokens.access_token;
  }

  const account = await getTeamProviderAccount(supabase, teamId, provider);
  if (account.tokens?.access_token) {
    tokenCache.set(cacheKey, {
      tokens: account.tokens,
      expires: Date.now() + 60000, // Cache for 1 minute
    });
    return account.tokens.access_token;
  }

  return null;
}
```

### Batch Operations

```typescript
// When working with multiple providers, batch the operations
async function getMultipleProviderTokens(teamId: string, providers: string[]) {
  const promises = providers.map(provider => getTeamProviderAccount(supabase, teamId, provider));

  const results = await Promise.allSettled(promises);
  return results.map((result, index) => ({
    provider: providers[index],
    success: result.status === 'fulfilled',
    data: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
}
```

## Why This Pattern?

1. **Security**: Consistent pattern makes it harder to introduce vulnerabilities
2. **Maintainability**: Changes to the vault implementation only affect helpers
3. **Type Safety**: Helpers ensure correct token type handling
4. **Resilience**: Helpers handle format changes (JSON<->string) transparently
5. **Audit**: Security reviews only need to check helpers, not all application code
6. **Performance**: Built-in caching and optimization opportunities
7. **Error Handling**: Consistent error patterns across the application

For OAuth-specific implementation details, see the [OAuth Integration Guide](./oauth-integration-guide.md).
