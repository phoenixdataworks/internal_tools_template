# OAuth Setup Guides

This directory contains comprehensive guides for setting up OAuth authentication providers for the Internal Tools Template.

## Available Guides

### [Microsoft OAuth Setup](./microsoft-oauth-setup.md)

Complete step-by-step instructions for configuring Microsoft Azure OAuth application registration, including:

- Azure Portal navigation
- Application registration process
- API permissions configuration
- Client secret management
- Domain verification
- Troubleshooting common issues
- Security best practices

### [Google OAuth Setup](./google-oauth-setup.md)

Detailed guide for setting up Google OAuth application in Google Cloud Console, covering:

- Google Cloud Console setup
- OAuth consent screen configuration
- Credential creation and management
- API enablement
- Domain verification
- Advanced configurations
- Monitoring and analytics

## Quick Start

1. **Choose your OAuth provider(s)**:
   - Microsoft (Azure AD) - Recommended for enterprise environments
   - Google (Google Cloud) - Good for mixed environments
   - Both - For maximum compatibility

2. **Follow the setup guide(s)**:
   - Start with the provider you'll use most
   - Complete all steps in order
   - Test the configuration before proceeding

3. **Configure environment variables**:
   - Add credentials to your `.env.local` file
   - Use different credentials for development and production
   - Follow security best practices

4. **Test the integration**:
   - Start your development server
   - Test the OAuth flow end-to-end
   - Verify user profile creation

## Prerequisites

Before starting OAuth setup, ensure you have:

- **Microsoft Setup**:
  - Azure account with admin privileges
  - Access to Azure Active Directory
  - Domain ownership (for production)

- **Google Setup**:
  - Google account with admin privileges
  - Google Cloud Platform project
  - Domain verification (for production)

## Security Considerations

### Credential Management

- Never hardcode secrets in your application
- Use environment variables for all credentials
- Rotate secrets regularly (every 12 months)
- Use different secrets for development and production

### Redirect URI Security

- Use HTTPS in production
- Validate redirect URIs on your server
- Avoid wildcard domains
- Use specific, limited redirect URIs

### Permission Principle

- Request minimum required permissions
- Review and audit permissions regularly
- Remove unused permissions
- Use incremental authorization when possible

## Environment Variables Reference

### Microsoft OAuth

```bash
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_REDIRECT_URI=https://your-domain.com/api/oauth/microsoft/callback
```

### Google OAuth

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/oauth/google/callback
GOOGLE_WORKSPACE_DOMAIN=your-company.com  # Optional
```

## Common Issues and Solutions

### Redirect URI Mismatch

- **Problem**: OAuth provider rejects the redirect URI
- **Solution**: Ensure exact match between configured and requested URIs
- **Check**: Protocol, domain, port, and path

### Invalid Client Credentials

- **Problem**: Authentication fails with invalid client error
- **Solution**: Verify Client ID and Secret are correct
- **Check**: No extra spaces, correct credentials

### Permission Denied

- **Problem**: User cannot authenticate due to permissions
- **Solution**: Grant admin consent for required permissions
- **Check**: API permissions in provider console

### Domain Verification Required

- **Problem**: Production app requires domain verification
- **Solution**: Complete domain verification process
- **Check**: DNS records or HTML file verification

## Testing Checklist

### Development Testing

- [ ] OAuth flow completes successfully
- [ ] User profile is created in database
- [ ] Session is established correctly
- [ ] Error handling works for invalid credentials
- [ ] Logout functionality works

### Production Testing

- [ ] HTTPS redirect URIs configured
- [ ] Domain verification completed
- [ ] Admin consent granted
- [ ] Rate limiting configured
- [ ] Monitoring and alerting set up

## Support Resources

### Microsoft OAuth

- [Microsoft Identity Platform Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
- [OAuth 2.0 and OpenID Connect Protocols](https://docs.microsoft.com/en-us/azure/active-directory/develop/active-directory-v2-protocols)
- [Azure AD App Registration Troubleshooting](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal#troubleshoot)

### Google OAuth

- [Google Identity Platform Documentation](https://developers.google.com/identity)
- [OAuth 2.0 for Google APIs](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console Help](https://cloud.google.com/apis/docs/getting-started)

## Next Steps

After completing OAuth setup:

1. **Test authentication flow** end-to-end
2. **Implement user profile synchronization**
3. **Set up team-based access control**
4. **Configure production deployment**
5. **Set up monitoring and alerting**
6. **Document your configuration** in your project

## Contributing

If you find issues with these guides or have suggestions for improvements:

1. Check the troubleshooting sections first
2. Review the support resources
3. Update the guides with your findings
4. Share your experience with the team

## Related Documentation

- [OAuth Integration Guide](../oauth-integration-guide.md) - Technical implementation details
- [OAuth Quick Reference](../oauth-quick-reference.md) - Quick commands and settings
- [Security Documentation](../auth/security.md) - Security best practices
- [Setup Guide](../setup-guide.md) - Overall project setup
