# Security Improvements

This document outlines the security improvements implemented in the codebase to address various vulnerabilities.

## Secured Service Role Endpoints

The following endpoints previously used the Supabase Service Role key without proper authentication:

- `/api/monitor/check-channels`
- `/api/monitor/check-streams`
- `/api/oauth/sync-tokens`
- `/api/discord-bot`

These have been secured with unified HMAC-SHA256 signature verification handled by middleware. This ensures that only authenticated internal services with proper signatures can trigger these endpoints.

### Required Environment Variables

Add the following to your `.env` file:

```
# Generate a strong random secret for securing internal API endpoints
INTERNAL_HMAC_SECRET=your-strong-random-secret
```

**⚠️ Important**: The `INTERNAL_HMAC_SECRET` environment variable is **required** and must be set in production. There are no fallback values.

### How to Call Secured Endpoints

When calling these endpoints from internal services, include the HMAC signature header:

```
x-internal-signature: ${hmac_signature}
```

The HMAC signature should be created using:

1. Message: Request body as string (empty string for GET requests)
2. Secret key: `INTERNAL_HMAC_SECRET` environment variable
3. Algorithm: HMAC-SHA256
4. Output: Hex-encoded string

Example code for generating the signature (Node.js):

```javascript
const crypto = require('crypto');

function generateInternalSignature(body, secret) {
  const message = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');
  return signature;
}

// Usage for GET requests (empty body)
const signature = generateInternalSignature('', process.env.INTERNAL_HMAC_SECRET);

// Usage for POST requests (with body)
const body = JSON.stringify({ key: 'value' });
const signature = generateInternalSignature(body, process.env.INTERNAL_HMAC_SECRET);
```

## Fixed IDOR Vulnerability

The `GET /api/users/[id]` endpoint had an Insecure Direct Object Reference vulnerability that allowed any authenticated user to access any other user's profile. This has been fixed by implementing proper authorization checks.

Now users can only access:

- Their own profile
- Profiles of users who are in teams where the current user has an admin or owner role

## CSRF Protection

All state-changing routes (POST, PATCH, DELETE) now implement double-submit CSRF token protection to prevent Cross-Site Request Forgery attacks. This ensures that requests are coming from our application and not from a malicious site.

### Database Schema

CSRF tokens are stored in the `security_tokens` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS public.security_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_type TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,

  CONSTRAINT unique_user_token_type UNIQUE (user_id, token_type)
);
```

### How CSRF Protection Works

1. When a user logs in, the application automatically calls `/api/auth/csrf-token` to generate a new CSRF token.
2. The token is stored in:
   - The database (token hash only)
   - A cookie (httpOnly, SameSite=Lax)
3. For state-changing requests, the client must include the token in the `x-csrf-token` header.
4. The server validates both the cookie and header to ensure they match.

### Client-Side Integration

Use the provided utility functions to automatically handle CSRF tokens:

```typescript
import { initCsrfProtection, fetchWithCsrf } from '@/utils/csrf';

// Initialize CSRF protection after login
await initCsrfProtection();

// Make an API call with CSRF protection
const response = await fetchWithCsrf('/api/teams/accept-invite', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ token: 'invite-token-here' }),
});
```

## Rate Limiting on Invite Endpoints

Rate limiting has been added to the following endpoints to prevent brute-force attacks:

- `/api/teams/accept-invite`
- `/api/teams/decline-invite`

These endpoints are now limited to 5 attempts per minute per IP address.

## Security Recommendations

1. **Move to Edge Functions**: Consider migrating the service-role endpoints to Supabase Edge Functions, where the service-role key can be securely stored in environment variables without being exposed in the client bundle.

2. **Improve Logging**: Add structured security logs for authentication/authorization events to help with incident detection.

3. **Security Headers**: Implement additional recommended security headers including Content-Security-Policy, X-Content-Type-Options, etc.

4. **Regular Security Scanning**: Add automated security scanning to your CI/CD pipeline.

# Security Updates - June 2024

## Chat Thread Read Receipts Security Fix

A security issue was identified in the chat thread reading functionality. Users were encountering errors during the onboarding process when accepting team invites, as the system attempted to mark thread IDs as read that either did not exist or the user did not have access to.

### Issues Fixed

1. **Foreign Key Constraint Violations**
   - When a user accepted a team invite, the system tried to mark previously persisted thread IDs as read in the new team context
   - This caused a `409 Conflict` error with code `23503` (foreign key violation)
   - Error: `Key is not present in table "chat_threads"`

2. **Error Message Exposure**
   - The error was propagated to the client, potentially revealing internal database structure information
   - Errors in chat read receipts unnecessarily blocked the onboarding flow

### Implemented Solutions

1. **Client-side Defensive Programming**
   - Added null check in `markThreadRead()` to prevent attempts to mark non-existent threads as read
   - Modified error handling to avoid propagating non-critical errors to the UI
   - Added explicit clearing of active thread ID when switching teams
   - Added conditional rendering in chat pane to avoid unnecessary network calls when drawer is closed

2. **Database-level Protection**
   - Added specific Row Level Security (RLS) policy to ensure users can only insert read receipts for threads they have access to
   - Verified and documented the cascading delete behavior for foreign keys to prevent orphaned records

3. **UX Improvements**
   - Changed error handling to fail silently for non-critical operations like marking threads as read
   - Ensured the onboarding flow continues working even if chat functionality encounters issues

## Implementation Notes

- Use `useChatState.getState()` to access the Zustand store outside of React components
- The existing ON DELETE CASCADE on foreign keys was verified to be working correctly
- Added an explicit clearing of stale thread IDs when loading threads to prevent reference errors

## Security Best Practices

1. **Input Validation**
   - Always verify entity existence before performing operations
   - Use RLS policies as a last line of defense, not the only protection

2. **Error Handling**
   - Don't propagate database errors to the client unless necessary
   - Implement silent failure for non-critical operations
   - Log errors server-side for monitoring without blocking the user experience

3. **State Management**
   - Clear persisted state that references entities in other security contexts
   - When switching teams, clear references to previous team resources
