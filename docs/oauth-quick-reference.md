# Internal Tools Template - OAuth Quick Reference

## Quick Setup Checklist

### Azure AD Setup

- [ ] **Azure Portal**
  - [ ] Create app registration
  - [ ] Configure redirect URIs
  - [ ] Generate client secret
  - [ ] Add API permissions
  - [ ] Grant admin consent

- [ ] **Supabase Configuration**
  - [ ] Enable Azure provider
  - [ ] Add client ID and secret
  - [ ] Configure redirect URL

- [ ] **Environment Variables**
  ```bash
  AZURE_CLIENT_ID=your-azure-client-id
  AZURE_CLIENT_SECRET=your-azure-client-secret
  AZURE_TENANT_ID=your-azure-tenant-id
  ```

### Google Workspace Setup

- [ ] **Google Cloud Console**
  - [ ] Create OAuth 2.0 client
  - [ ] Configure consent screen
  - [ ] Add redirect URIs
  - [ ] Enable required APIs

- [ ] **Supabase Configuration**
  - [ ] Enable Google provider
  - [ ] Add client ID and secret
  - [ ] Configure redirect URL

- [ ] **Environment Variables**
  ```bash
  GOOGLE_CLIENT_ID=your-google-client-id
  GOOGLE_CLIENT_SECRET=your-google-client-secret
  ```

## Redirect URIs

### Development

```
http://localhost:3000/auth/callback
```

### Production

```
https://your-project.supabase.co/auth/v1/callback
https://your-domain.com/auth/callback
```

## Required Scopes

### Azure AD

- `openid`
- `email`
- `profile`
- `User.Read`
- `User.ReadBasic.All`
- `Group.Read.All`
- `Directory.Read.All`

### Google Workspace

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/admin.directory.user.readonly`

## Environment Variables Reference

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Azure AD Configuration
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_TENANT_ID=your-azure-tenant-id

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-nextauth-secret
```

## Common Error Codes

| Error Code              | Description                | Solution                                 |
| ----------------------- | -------------------------- | ---------------------------------------- |
| `redirect_uri_mismatch` | Redirect URI doesn't match | Check URIs in both provider and Supabase |
| `invalid_client`        | Invalid client credentials | Regenerate client secret                 |
| `invalid_scope`         | Invalid or missing scopes  | Verify scope configuration               |
| `access_denied`         | User denied permission     | Check consent screen                     |
| `invalid_grant`         | Token refresh failed       | Clear browser storage                    |

## Testing Commands

```bash
# Test Azure AD connection
npm run test:auth:azure

# Test Google OAuth connection
npm run test:auth:google

# Validate OAuth configuration
npm run auth:validate

# Check environment variables
npm run env:check
```

## Security Checklist

- [ ] **Client Secrets**
  - [ ] Never commit to version control
  - [ ] Use environment variables
  - [ ] Rotate regularly

- [ ] **Redirect URIs**
  - [ ] Use HTTPS in production
  - [ ] Validate exact matches
  - [ ] Remove unused URIs

- [ ] **Scopes**
  - [ ] Request minimum required scopes
  - [ ] Document scope usage
  - [ ] Review permissions regularly

- [ ] **Token Security**
  - [ ] Store tokens securely
  - [ ] Implement token refresh
  - [ ] Handle token expiration

## Troubleshooting Commands

```bash
# Check Supabase status
npm run supabase:status

# Reset local database
npm run supabase:db:reset

# View auth logs
npm run auth:logs

# Test OAuth flow
npm run auth:test
```

## Provider-Specific Notes

### Azure AD

- Requires admin consent for directory permissions
- Supports conditional access policies
- Group sync requires additional API permissions
- Tenant ID is optional for single-tenant apps

### Google Workspace

- Requires domain verification for internal apps
- Supports service account authentication
- Directory sync requires Admin SDK API
- Consent screen must be configured

## Migration Checklist

### From Local to Production

- [ ] Update redirect URIs
- [ ] Configure production environment variables
- [ ] Test OAuth flow in production
- [ ] Verify user profile sync
- [ ] Check group synchronization

### Provider Changes

- [ ] Update client credentials
- [ ] Modify redirect URIs
- [ ] Test authentication flow
- [ ] Update user profiles
- [ ] Verify permissions

## Monitoring

### Key Metrics

- Authentication success rate
- Token refresh success rate
- User profile sync status
- Group synchronization status
- Error rates by provider

### Log Locations

- Supabase Auth logs
- Application error logs
- Provider-specific logs
- Network request logs

## Support Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Azure AD Documentation](https://docs.microsoft.com/en-us/azure/active-directory/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Template OAuth Guide](docs/oauth-integration-guide.md)
