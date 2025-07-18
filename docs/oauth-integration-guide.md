# Internal Tools Template - OAuth Integration Guide

## Overview

The Internal Tools Template supports multiple OAuth providers for enterprise authentication. This guide covers setting up Azure AD and Google Workspace OAuth integrations with Supabase Auth.

## Supported Providers

### Azure Active Directory (Azure AD)

- Enterprise SSO integration
- Group synchronization
- Custom claims mapping
- Conditional access policies

### Google Workspace

- OAuth 2.0 authentication
- Directory sync capabilities
- Custom attributes support
- Google Cloud Identity integration

## Azure AD Integration

### 1. Azure Portal Setup

#### Create App Registration

1. **Navigate to Azure Portal**
   - Go to [portal.azure.com](https://portal.azure.com)
   - Sign in with your Azure AD account

2. **Create New App Registration**
   - Navigate to **Azure Active Directory** → **App registrations**
   - Click **New registration**
   - Fill in the details:
     - **Name**: `Internal Tools Template`
     - **Supported account types**: Choose based on your needs:
       - `Accounts in this organizational directory only` (Single tenant)
       - `Accounts in any organizational directory` (Multi-tenant)
     - **Redirect URI**: `https://your-project.supabase.co/auth/v1/callback`

3. **Configure Authentication**
   - Go to **Authentication** in the left menu
   - Add redirect URIs:
     - `https://your-project.supabase.co/auth/v1/callback`
     - `http://localhost:3000/auth/callback` (for development)
   - Configure advanced settings:
     - **Access tokens**: Enable
     - **ID tokens**: Enable
     - **Logout URL**: `https://your-domain.com/auth/signout`

#### Create Client Secret

1. **Generate Secret**
   - Go to **Certificates & secrets**
   - Click **New client secret**
   - Add description: `Internal Tools Template Secret`
   - Choose expiration (recommend 12 months)
   - Copy the **Value** (not the ID)

2. **Store Securely**
   - Add to your environment variables:
   ```bash
   AZURE_CLIENT_ID=your-app-client-id
   AZURE_CLIENT_SECRET=your-client-secret-value
   ```

#### Configure API Permissions

1. **Add Permissions**
   - Go to **API permissions**
   - Click **Add a permission**
   - Select **Microsoft Graph**
   - Choose **Delegated permissions**
   - Add these permissions:
     - `User.Read` (Basic profile)
     - `User.ReadBasic.All` (Directory reading)
     - `Group.Read.All` (Group membership)
     - `Directory.Read.All` (Directory data)

2. **Grant Admin Consent**
   - Click **Grant admin consent for [Your Organization]**
   - Confirm the permissions

### 2. Supabase Configuration

#### Update Supabase Auth Settings

1. **Configure Azure Provider**
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Providers**
   - Find **Azure** and click **Configure**
   - Enable the provider
   - Enter your Azure AD credentials:
     - **Client ID**: Your Azure app client ID
     - **Client Secret**: Your Azure client secret
     - **Tenant ID**: Your Azure AD tenant ID (optional)

2. **Configure Redirect URLs**
   - In Azure app registration, add:
     - `https://your-project.supabase.co/auth/v1/callback`
   - In Supabase, verify the redirect URL is correct

#### Environment Variables

Update your `.env.local`:

```bash
# Azure AD Configuration
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Application Integration

#### Frontend Implementation

```typescript
// src/lib/auth/azure.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function signInWithAzure() {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile openid',
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Azure sign-in error:', error);
    throw error;
  }

  return data;
}

export async function signOut() {
  const supabase = createClientComponentClient();

  const { error } = await supabase.auth.signOut({
    scope: 'local',
  });

  if (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}
```

#### Auth Callback Handler

```typescript
// src/app/auth/callback/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(`${requestUrl.origin}/auth/signin?error=auth_callback_failed`);
    }
  }

  // Redirect to dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```

### 4. User Profile Sync

#### Handle User Creation

```typescript
// src/lib/auth/user-sync.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function syncUserProfile(user: any) {
  const supabase = createServerComponentClient({ cookies });

  // Extract user data from Azure AD
  const userData = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatar_url: user.user_metadata?.avatar_url,
    provider: 'azure',
    provider_id: user.user_metadata?.sub,
  };

  // Upsert user profile
  const { error } = await supabase.from('profiles').upsert(userData, {
    onConflict: 'id',
  });

  if (error) {
    console.error('Profile sync error:', error);
    throw error;
  }

  return userData;
}
```

#### Group Synchronization

```typescript
// src/lib/auth/group-sync.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function syncUserGroups(userId: string, accessToken: string) {
  const supabase = createServerComponentClient({ cookies });

  try {
    // Fetch user groups from Microsoft Graph
    const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user groups');
    }

    const data = await response.json();
    const groups = data.value || [];

    // Sync groups to your application
    for (const group of groups) {
      await syncGroup(group, userId);
    }

    return groups;
  } catch (error) {
    console.error('Group sync error:', error);
    throw error;
  }
}

async function syncGroup(group: any, userId: string) {
  const supabase = createServerComponentClient({ cookies });

  // Create or update team based on Azure AD group
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .upsert(
      {
        name: group.displayName,
        slug: group.displayName.toLowerCase().replace(/\s+/g, '-'),
        azure_group_id: group.id,
      },
      {
        onConflict: 'azure_group_id',
      }
    )
    .select()
    .single();

  if (teamError) {
    console.error('Team sync error:', teamError);
    return;
  }

  // Add user to team
  const { error: memberError } = await supabase.from('team_members').upsert(
    {
      team_id: team.id,
      user_id: userId,
      role: 'member',
    },
    {
      onConflict: 'team_id,user_id',
    }
  );

  if (memberError) {
    console.error('Member sync error:', memberError);
  }
}
```

## Google Workspace Integration

### 1. Google Cloud Console Setup

#### Create OAuth 2.0 Credentials

1. **Access Google Cloud Console**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create a new project or select existing

2. **Enable APIs**
   - Go to **APIs & Services** → **Library**
   - Enable these APIs:
     - **Google+ API**
     - **Google Admin SDK API** (for directory sync)
     - **People API**

3. **Create OAuth 2.0 Client**
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth 2.0 Client IDs**
   - Configure OAuth consent screen first if prompted
   - Set up OAuth 2.0 client:
     - **Application type**: Web application
     - **Name**: `Internal Tools Template`
     - **Authorized redirect URIs**:
       - `https://your-project.supabase.co/auth/v1/callback`
       - `http://localhost:3000/auth/callback` (development)

4. **Get Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Store securely in environment variables

#### Configure OAuth Consent Screen

1. **Set Up Consent Screen**
   - Go to **OAuth consent screen**
   - Choose **External** or **Internal** (recommended for enterprise)
   - Fill in app information:
     - **App name**: `Internal Tools Template`
     - **User support email**: Your email
     - **Developer contact information**: Your email

2. **Add Scopes**
   - Click **Add or remove scopes**
   - Add these scopes:
     - `openid`
     - `email`
     - `profile`
     - `https://www.googleapis.com/auth/admin.directory.user.readonly` (for directory sync)

### 2. Supabase Configuration

#### Update Supabase Auth Settings

1. **Configure Google Provider**
   - Go to your Supabase project dashboard
   - Navigate to **Authentication** → **Providers**
   - Find **Google** and click **Configure**
   - Enable the provider
   - Enter your Google credentials:
     - **Client ID**: Your Google OAuth client ID
     - **Client Secret**: Your Google OAuth client secret

2. **Verify Redirect URLs**
   - Ensure the redirect URL matches your Supabase project

#### Environment Variables

Update your `.env.local`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

### 3. Application Integration

#### Frontend Implementation

```typescript
// src/lib/auth/google.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function signInWithGoogle() {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'email profile openid',
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }

  return data;
}
```

#### User Profile Sync

```typescript
// src/lib/auth/google-sync.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function syncGoogleUserProfile(user: any) {
  const supabase = createServerComponentClient({ cookies });

  // Extract user data from Google
  const userData = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatar_url: user.user_metadata?.avatar_url,
    provider: 'google',
    provider_id: user.user_metadata?.sub,
  };

  // Upsert user profile
  const { error } = await supabase.from('profiles').upsert(userData, {
    onConflict: 'id',
  });

  if (error) {
    console.error('Google profile sync error:', error);
    throw error;
  }

  return userData;
}
```

## Multi-Provider Support

### Provider-Agnostic Authentication

```typescript
// src/lib/auth/multi-provider.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type AuthProvider = 'azure' | 'google';

export async function signInWithProvider(provider: AuthProvider) {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      scopes: 'email profile openid',
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`${provider} sign-in error:`, error);
    throw error;
  }

  return data;
}

export async function getAvailableProviders(): Promise<AuthProvider[]> {
  // Check which providers are configured
  const providers: AuthProvider[] = [];

  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET) {
    providers.push('azure');
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push('google');
  }

  return providers;
}
```

### Provider Selection UI

```typescript
// src/components/auth/ProviderSelector.tsx
import { Button, Stack, Typography } from '@mui/material';
import { signInWithProvider, getAvailableProviders } from '@/lib/auth/multi-provider';

export function ProviderSelector() {
  const [providers, setProviders] = useState<AuthProvider[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAvailableProviders().then(setProviders);
  }, []);

  const handleProviderSignIn = async (provider: AuthProvider) => {
    setLoading(true);
    try {
      await signInWithProvider(provider);
    } catch (error) {
      console.error('Sign-in failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="h6" align="center">
        Sign in with your organization
      </Typography>

      {providers.map((provider) => (
        <Button
          key={provider}
          variant="outlined"
          size="large"
          onClick={() => handleProviderSignIn(provider)}
          disabled={loading}
          startIcon={
            provider === 'azure' ? <AzureIcon /> : <GoogleIcon />
          }
        >
          Continue with {provider === 'azure' ? 'Microsoft' : 'Google'}
        </Button>
      ))}
    </Stack>
  );
}
```

## Security Best Practices

### 1. Environment Security

```bash
# ✅ Good: Use environment variables
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# ❌ Bad: Hardcode secrets
const clientSecret = "my-secret-key";
```

### 2. Token Management

```typescript
// ✅ Good: Handle token refresh
export async function refreshSession() {
  const supabase = createClientComponentClient();

  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error('Token refresh failed:', error);
    // Redirect to sign-in
    window.location.href = '/auth/signin';
  }

  return data;
}

// ✅ Good: Secure token storage
export function secureTokenStorage(token: string) {
  // Store in httpOnly cookies (handled by Supabase)
  // Never store in localStorage
}
```

### 3. Error Handling

```typescript
// ✅ Good: Comprehensive error handling
export async function handleAuthError(error: any) {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password';
    case 'Email not confirmed':
      return 'Please check your email to confirm your account';
    case 'Too many requests':
      return 'Too many sign-in attempts. Please try again later';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
```

## Testing OAuth Integration

### 1. Local Testing

```typescript
// src/lib/auth/test-helpers.ts
export async function testOAuthFlow(provider: AuthProvider) {
  const supabase = createClientComponentClient();

  // Test sign-in
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: 'http://localhost:3000/auth/callback',
    },
  });

  if (error) {
    console.error('Test sign-in failed:', error);
    return false;
  }

  return true;
}
```

### 2. Production Testing

```typescript
// src/lib/auth/production-test.ts
export async function validateOAuthConfiguration() {
  const providers = await getAvailableProviders();

  for (const provider of providers) {
    try {
      // Test configuration without full sign-in
      const isValid = await testProviderConfiguration(provider);
      console.log(`${provider} configuration:`, isValid ? 'Valid' : 'Invalid');
    } catch (error) {
      console.error(`${provider} configuration error:`, error);
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Redirect URI Mismatch

**Error**: `redirect_uri_mismatch`

**Solution**:

- Verify redirect URIs in both Azure/Google and Supabase
- Ensure exact match including protocol and port
- Check for trailing slashes

#### 2. Invalid Client Secret

**Error**: `invalid_client`

**Solution**:

- Regenerate client secret in Azure/Google
- Update environment variables
- Verify secret format and encoding

#### 3. Scope Issues

**Error**: `invalid_scope`

**Solution**:

- Check requested scopes match configured scopes
- Verify OAuth consent screen configuration
- Ensure admin consent is granted

#### 4. Token Refresh Issues

**Error**: `invalid_grant`

**Solution**:

- Check token expiration settings
- Verify refresh token rotation
- Clear browser storage and retry

### Debug Tools

```typescript
// src/lib/auth/debug.ts
export function debugAuthFlow() {
  const supabase = createClientComponentClient();

  // Monitor auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state change:', event, session);
  });

  // Check current session
  supabase.auth.getSession().then(({ data, error }) => {
    console.log('Current session:', data, error);
  });
}
```

## Monitoring and Logging

### 1. Auth Event Logging

```typescript
// src/lib/auth/logging.ts
export function logAuthEvent(event: string, details: any) {
  console.log(`Auth Event [${event}]:`, {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href,
  });

  // Send to your logging service
  // sendToLoggingService('auth', event, details);
}
```

### 2. Error Tracking

```typescript
// src/lib/auth/error-tracking.ts
export function trackAuthError(error: any, context: any) {
  console.error('Auth Error:', {
    error: error.message,
    code: error.status,
    context,
    timestamp: new Date().toISOString(),
  });

  // Send to error tracking service
  // sendToErrorTracking(error, context);
}
```

This OAuth integration guide provides comprehensive coverage for setting up and maintaining OAuth authentication in the Internal Tools Template, ensuring secure and reliable enterprise authentication.
