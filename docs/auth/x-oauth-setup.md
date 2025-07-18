# X (Twitter) OAuth Integration

This document outlines the setup process for integrating X (Twitter) OAuth with our application.

## Prerequisites

1. A Twitter Developer Account
2. An approved X/Twitter project and application
3. The necessary environment variables configured

## Twitter Developer Setup

1. Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create a new Project (or use an existing one)
3. Within the project, create a new App (or modify an existing one)
4. Configure your App settings:

### App Configuration

1. **App permissions**: Read-only access is sufficient for basic integration
2. **Type of App**: Web App, Automated App or Bot
3. **App Info**:
   - Set a descriptive name for your app
   - Add a description
   - Set your website URL
   - Configure your callback URL: `https://yourdomain.com/api/oauth/x/callback`
   - Configure your Terms of Service and Privacy Policy URLs if required

4. **Keys and Tokens**:
   - After app creation, note your API Key (Client ID) and API Secret (Client Secret)
   - You'll need these for environment variables

## Environment Variables

Add the following environment variables to your project:

```
X_OAUTH_CLIENT_ID=your-twitter-api-key
X_OAUTH_CLIENT_SECRET=your-twitter-api-secret
X_OAUTH_REDIRECT_URI=https://yourdomain.com/api/oauth/x/callback
```

Make sure to update these in all deployment environments (development, staging, production).

## OAuth Flow

The X OAuth integration follows standard OAuth 2.0 with PKCE:

1. **Initiation**: User clicks "Connect X" button
2. **Authorization**: User is redirected to X to grant permissions
3. **Callback**: X redirects to our callback URL with an authorization code
4. **Token Exchange**: We exchange the code for access and refresh tokens
5. **Profile Fetch**: We retrieve the user's X profile information
6. **Storage**: We securely store the tokens in our vault system

## Requested Permissions

By default, we request the following scopes:

- `tweet.read` - Read Tweets from the timeline
- `users.read` - Read user profile information
- `offline.access` - Enable refresh tokens

## Troubleshooting

Common issues:

1. **Invalid redirect URI**: Make sure your redirect URI exactly matches what's registered in the X Developer Portal
2. **Missing refresh token**: Ensure the `offline.access` scope is included
3. **Rate limiting**: X has rate limits for API calls, ensure proper handling

## Testing

After setup, you can test the integration by:

1. Going to the "Integrations" page in your team settings
2. Clicking "Connect X"
3. Authorizing the app on X
4. Verifying you're redirected back with successful connection
5. Checking the X account appears in your connected accounts list

## Security Considerations

- All tokens are stored securely in our vault system
- Access is governed by team membership and permissions
- Tokens are automatically refreshed as needed
- API calls respect X's rate limits and terms of service
