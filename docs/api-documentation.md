# StreamTrack - API Documentation

## Authentication

StreamTrack uses Supabase Auth for authentication, supporting multiple providers and secure token management.

### Authentication Flow

1. **Initial Authentication**

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'azure',
  options: {
    scopes: 'email profile openid',
  },
});
```

2. **Token Refresh**

```typescript
const { data, error } = await supabase.auth.refreshSession();
```

3. **Logout**

```typescript
const { error } = await supabase.auth.signOut();
```

## API Endpoints

### Teams

#### 1. Create Team

```typescript
POST /api/teams
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Team Name",
  "slug": "team-name"
}

Response: {
  "id": "uuid",
  "name": "Team Name",
  "slug": "team-name",
  "created_at": "timestamp"
}
```

#### 2. Invite Team Member

```typescript
POST /api/teams/invite
Content-Type: application/json
Authorization: Bearer <token>

{
  "teamId": "uuid",
  "email": "user@example.com",
  "role": "member"
}

Response: {
  "id": "uuid",
  "email": "user@example.com",
  "status": "pending",
  "expires_at": "timestamp"
}
```

### Channel Management

#### 1. Add Channel

```typescript
POST /api/channels
Content-Type: application/json
Authorization: Bearer <token>

{
  "platform": "youtube",
  "channelId": "channel-id",
  "teamId": "team-uuid"
}

Response: {
  "id": "uuid",
  "platform": "youtube",
  "channelId": "channel-id",
  "status": "active"
}
```

#### 2. Get Channel Metrics

```typescript
GET /api/channels/{channelId}/metrics
Authorization: Bearer <token>

Response: {
  "metrics": {
    "viewerCount": number,
    "chatActivity": number,
    "timestamp": "timestamp"
  }[]
}
```

### Stream Monitoring

#### 1. Get Active Streams

```typescript
GET /api/monitor/stream/active
Authorization: Bearer <token>

Response: {
  "streams": [{
    "id": "uuid",
    "platform": "youtube",
    "title": "string",
    "viewerCount": number,
    "startTime": "timestamp"
  }]
}
```

#### 2. Get Stream Analytics

```typescript
GET /api/monitor/stream/{streamId}/analytics
Authorization: Bearer <token>

Response: {
  "analytics": {
    "averageViewers": number,
    "peakViewers": number,
    "chatActivity": {
      "messageCount": number,
      "messagesPerMinute": number
    },
    "retention": {
      "rate": number,
      "dropoffPoints": number[]
    }
  }
}
```

### Chat System

#### 1. Create Thread

```typescript
POST /api/chat/threads
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "string",
  "content": "string",
  "teamId": "uuid",
  "objectType": "stream",
  "objectId": "string"
}

Response: {
  "id": "uuid",
  "title": "string",
  "createdAt": "timestamp"
}
```

#### 2. Add Comment

```typescript
POST /api/chat/threads/{threadId}/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": {
    "text": "string",
    "mentions": ["uuid"]
  }
}

Response: {
  "id": "uuid",
  "content": object,
  "createdAt": "timestamp"
}
```

### Subscription Management

#### 1. Create Checkout Session

```typescript
POST /api/stripe/create-checkout-session
Content-Type: application/json
Authorization: Bearer <token>

{
  "priceId": "string",
  "teamId": "uuid"
}

Response: {
  "sessionId": "string",
  "url": "string"
}
```

#### 2. Get Subscription Status

```typescript
GET /api/stripe/subscriptions/{teamId}
Authorization: Bearer <token>

Response: {
  "subscription": {
    "status": "active" | "canceled" | "past_due",
    "currentPeriodEnd": "timestamp",
    "cancelAtPeriodEnd": boolean
  }
}
```

## Error Handling

### Error Response Format

```typescript
{
  "error": {
    "code": string,
    "message": string,
    "details?: object
  }
}
```

### Common Error Codes

- `auth/invalid-token`: Authentication token is invalid or expired
- `auth/insufficient-permissions`: User lacks required permissions
- `validation/invalid-input`: Request payload validation failed
- `resource/not-found`: Requested resource does not exist
- `subscription/limit-exceeded`: Action exceeds subscription limits

## Rate Limiting

- Standard tier: 60 requests per minute
- Premium tier: 300 requests per minute
- Enterprise tier: Custom limits

Rate limit headers:

```
X-RateLimit-Limit: <requests_per_minute>
X-RateLimit-Remaining: <remaining_requests>
X-RateLimit-Reset: <timestamp>
```

## WebSocket Connections

### Real-time Updates

```typescript
const channel = supabase
  .channel('room')
  .on('broadcast', { event: 'metrics' }, payload => console.log(payload))
  .subscribe();
```

### Subscription Patterns

1. Stream Metrics

```typescript
const metricsSubscription = supabase
  .channel(`stream-${streamId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'livestream_metrics',
      filter: `livestream_id=eq.${streamId}`,
    },
    payload => {
      console.log(payload);
    }
  )
  .subscribe();
```

2. Chat Updates

```typescript
const chatSubscription = supabase
  .channel(`thread-${threadId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'chat_comments',
      filter: `thread_id=eq.${threadId}`,
    },
    payload => {
      console.log(payload);
    }
  )
  .subscribe();
```

## Development Tools

### API Testing

```bash
# Health check
curl http://localhost:3000/api/health

# Authentication test
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/auth/me
```

### WebSocket Testing

```typescript
// Test message
const testChannel = supabase
  .channel('test')
  .on('broadcast', { event: 'test' }, payload => console.log('Test message:', payload))
  .subscribe();

// Send test message
await testChannel.send({
  type: 'broadcast',
  event: 'test',
  payload: { message: 'test' },
});
```

## Security Considerations

### 1. Authentication

- Use HTTPS for all API requests
- Implement token rotation
- Set appropriate token expiration
- Validate tokens server-side

### 2. Authorization

- Implement role-based access control
- Validate team membership
- Check subscription status
- Apply rate limiting

### 3. Data Validation

- Sanitize all inputs
- Validate request payloads
- Check content types
- Implement request size limits

### 4. Error Handling

- Use appropriate status codes
- Provide meaningful error messages
- Log security events
- Implement retry mechanisms

## Best Practices

### 1. API Requests

- Use appropriate HTTP methods
- Include required headers
- Handle errors gracefully
- Implement request timeouts

### 2. WebSocket Usage

- Implement reconnection logic
- Handle connection errors
- Clean up subscriptions
- Monitor connection health

### 3. Rate Limiting

- Implement client-side throttling
- Handle rate limit errors
- Use exponential backoff
- Cache responses when appropriate

### 4. Testing

- Write API tests
- Test error scenarios
- Validate response formats
- Check security measures
