# OAuth Architecture Summary

## Overview

Our social media OAuth integration provides secure, team-based authentication for Facebook, Instagram, X (Twitter), Google Analytics 4, and YouTube. The system uses Supabase Vault for encrypted token storage and implements comprehensive security measures.

## Key Architecture Decisions

### 1. Unified OAuth Pattern

- **Single Flow Structure**: Consistent `/api/oauth/[provider]` pattern across all providers
- **Provider-Specific Adaptations**: Each provider has unique requirements handled within the common flow
- **Security-First Design**: PKCE, CSRF protection, and encrypted storage built into the foundation

### 2. Supabase Vault Integration

- **Encrypted at Rest**: All tokens stored using Supabase Vault extension
- **No Key-in-Database**: Proper key management without storing encryption keys in the database
- **RLS Integration**: Vault access controlled by Row Level Security policies

### 3. Team-Based Access Control

- **Admin-Only Connections**: Only team admins can connect social accounts
- **Team Isolation**: RLS ensures teams can only access their own tokens
- **Audit Trail**: All OAuth operations logged for security monitoring

## Provider Architecture Patterns

### Meta Ecosystem (Facebook/Instagram)

- **Shared Authentication**: Both use the same Meta OAuth App
- **Hierarchical Tokens**: User tokens → Page tokens → Instagram account access
- **Permanent Page Tokens**: Facebook page tokens never expire

### Google Ecosystem (YouTube/GA4)

- **PKCE Required**: Enhanced security for public clients
- **Offline Access**: `access_type=offline` for long-term refresh tokens
- **Separate Services**: Different redirect URIs for YouTube vs GA4

### X (Twitter)

- **Short-Lived Tokens**: 2-hour expiry requires active refresh management
- **PKCE Implementation**: Required for OAuth 2.0 with PKCE
- **Rate Limit Sensitive**: Aggressive rate limiting requires careful handling

## Security Architecture

### Multi-Layer Protection

1. **Transport Security**: HTTPS, secure cookies, httpOnly flags
2. **CSRF Protection**: State parameters with secure validation
3. **PKCE Implementation**: Code challenge/verifier for supported providers
4. **Database Security**: RLS policies, encrypted token storage
5. **Application Security**: Team-based access control, audit logging

### Token Lifecycle Management

- **Secure Storage**: Encrypted JSON bundles in Supabase Vault
- **Automatic Refresh**: Built-in expiry detection with configurable buffer
- **Graceful Degradation**: Proper error handling for expired/invalid tokens
- **Proper Access Patterns**: Always use views (`team_social_tokens`, `rest_social_tokens`) or functions (`get_social_refresh_token`) to access tokens, never query `social_accounts.refresh_token` directly as this column doesn't exist

### Common Implementation Pitfalls

#### ❌ Incorrect Token Access

```typescript
// WRONG: This will fail with "column social_accounts.refresh_token does not exist"
const { data } = await supabase
  .from('social_accounts')
  .select('refresh_token, expires_at')
  .eq('id', accountId);
```

#### ✅ Correct Token Access

```typescript
// CORRECT: Use the team_social_tokens view
const { data } = await supabase
  .from('team_social_tokens')
  .select('refresh_token, expires_at, account_id')
  .eq('account_id', accountId);

// OR use the RPC function
const { data } = await supabase.rpc('get_social_refresh_token', {
  account_id: accountId,
});
```

## Integration Points

### Frontend Integration

- **Integrations Page**: `/settings/integrations` for connection management
- **Simple Connect Flow**: Single button redirects to OAuth initiation
- **Real-Time Updates**: React Query for live connection status

### Backend Integration

- **Vault Helpers**: Standardized functions for token operations
- **Provider Sync**: Automatic syncing of pages/channels/properties
- **Error Boundaries**: Comprehensive error handling and user feedback

## Operational Considerations

### Monitoring & Observability

- **OAuth Logs**: Detailed logging of all authentication operations
- **Token Health**: Monitoring expiry and refresh success rates
- **Provider Status**: Tracking API rate limits and service availability

### Maintenance & Updates

- **Provider Changes**: Isolated impact when providers update their APIs
- **Security Updates**: Centralized security improvements benefit all providers
- **Documentation**: Single source of truth for OAuth implementation

## Key Benefits

1. **Developer Experience**: Consistent patterns across all providers
2. **Security Posture**: Multiple layers of protection with industry best practices
3. **Scalability**: Team-based architecture supports multi-tenant usage
4. **Maintainability**: Centralized OAuth logic with provider-specific adaptations
5. **Auditability**: Comprehensive logging for security and compliance

## Future Considerations

- **Additional Providers**: Architecture supports easy addition of new OAuth providers
- **Enhanced Monitoring**: Potential for real-time OAuth health dashboards
- **Token Optimization**: Opportunities for intelligent caching and refresh strategies
- **Compliance**: Framework ready for additional security certifications

This architecture provides a secure, scalable foundation for social media integrations while maintaining flexibility for future enhancements and provider additions.
