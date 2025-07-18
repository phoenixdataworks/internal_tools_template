# Template API Endpoints

This document lists all API endpoints provided by the template and their usage.

## Authentication API

### `src/app/api/auth/`

#### CSRF Token

- **GET** `/api/auth/csrf-token`
- **Purpose**: Generate CSRF token for form protection
- **Response**: `{ csrfToken: string }`

## OAuth API

### `src/app/api/oauth/`

#### Provider Authentication

- **GET** `/api/oauth/[provider]`
- **Purpose**: Initiate OAuth flow for specified provider
- **Providers**: `azure`, `google`
- **Query Parameters**:
  - `redirectTo`: URL to redirect after authentication
- **Response**: Redirects to OAuth provider

#### OAuth Callback

- **GET** `/api/oauth/[provider]/callback`
- **Purpose**: Handle OAuth callback from provider
- **Query Parameters**:
  - `code`: Authorization code from provider
  - `state`: OAuth state parameter
- **Response**: Redirects to application with session

#### OAuth Refresh

- **POST** `/api/oauth/refresh`
- **Purpose**: Refresh OAuth tokens
- **Body**: `{ provider: string, refreshToken: string }`
- **Response**: `{ accessToken: string, refreshToken: string }`

#### OAuth Deauthorize

- **POST** `/api/oauth/[provider]/deauthorize`
- **Purpose**: Revoke OAuth access
- **Response**: `{ success: boolean }`

#### OAuth Webhook

- **POST** `/api/oauth/[provider]/webhook`
- **Purpose**: Handle OAuth provider webhooks
- **Body**: Provider-specific webhook payload
- **Response**: `{ success: boolean }`

#### Sync Tokens

- **POST** `/api/oauth/sync-tokens`
- **Purpose**: Synchronize OAuth tokens
- **Headers**: `x-internal-signature` (HMAC authentication)
- **Response**: `{ success: boolean }`

## Chat API

### `src/app/api/chat/`

#### Threads

- **GET** `/api/chat/threads`
- **Purpose**: List chat threads for team
- **Query Parameters**:
  - `teamId`: Team ID (required)
  - `limit`: Number of threads to return
  - `offset`: Pagination offset
- **Response**: `{ threads: Thread[], total: number }`

- **POST** `/api/chat/threads`
- **Purpose**: Create new chat thread
- **Body**: `{ teamId: string, title: string, description?: string }`
- **Response**: `{ thread: Thread }`

#### Individual Thread

- **GET** `/api/chat/threads/[id]`
- **Purpose**: Get specific thread details
- **Response**: `{ thread: Thread }`

- **PUT** `/api/chat/threads/[id]`
- **Purpose**: Update thread
- **Body**: `{ title?: string, description?: string }`
- **Response**: `{ thread: Thread }`

- **DELETE** `/api/chat/threads/[id]`
- **Purpose**: Delete thread
- **Response**: `{ success: boolean }`

#### Comments

- **GET** `/api/chat/comments`
- **Purpose**: List comments for thread
- **Query Parameters**:
  - `threadId`: Thread ID (required)
  - `limit`: Number of comments to return
  - `offset`: Pagination offset
- **Response**: `{ comments: Comment[], total: number }`

- **POST** `/api/chat/comments`
- **Purpose**: Create new comment
- **Body**: `{ threadId: string, content: string, mentions?: string[] }`
- **Response**: `{ comment: Comment }`

## Notifications API

### `src/app/api/notifications/`

#### Notifications List

- **GET** `/api/notifications`
- **Purpose**: List user notifications
- **Query Parameters**:
  - `limit`: Number of notifications to return
  - `offset`: Pagination offset
  - `unreadOnly`: Filter unread notifications only
- **Response**: `{ notifications: Notification[], total: number }`

- **POST** `/api/notifications`
- **Purpose**: Create notification
- **Body**: `{ userId: string, type: string, title: string, message: string, data?: any }`
- **Response**: `{ notification: Notification }`

#### Individual Notification

- **GET** `/api/notifications/[id]`
- **Purpose**: Get specific notification
- **Response**: `{ notification: Notification }`

- **PUT** `/api/notifications/[id]`
- **Purpose**: Update notification (mark as read)
- **Body**: `{ read: boolean }`
- **Response**: `{ notification: Notification }`

- **DELETE** `/api/notifications/[id]`
- **Purpose**: Delete notification
- **Response**: `{ success: boolean }`

#### Bulk Operations

- **POST** `/api/notifications/mark-all-read`
- **Purpose**: Mark all notifications as read
- **Response**: `{ success: boolean }`

- **DELETE** `/api/notifications/clear-all`
- **Purpose**: Delete all notifications
- **Response**: `{ success: boolean }`

## Teams API

### `src/app/api/teams/`

#### Teams List

- **GET** `/api/teams`
- **Purpose**: List user's teams
- **Response**: `{ teams: Team[] }`

- **POST** `/api/teams`
- **Purpose**: Create new team
- **Body**: `{ name: string, slug?: string }`
- **Response**: `{ team: Team }`

#### Individual Team

- **GET** `/api/teams/[id]`
- **Purpose**: Get team details
- **Response**: `{ team: Team }`

- **PUT** `/api/teams/[id]`
- **Purpose**: Update team
- **Body**: `{ name?: string, slug?: string }`
- **Response**: `{ team: Team }`

- **DELETE** `/api/teams/[id]`
- **Purpose**: Delete team
- **Response**: `{ success: boolean }`

## Users API

### `src/app/api/users/`

#### User Profile

- **GET** `/api/users/[id]`
- **Purpose**: Get user profile
- **Response**: `{ user: User }`

- **PUT** `/api/users/[id]`
- **Purpose**: Update user profile
- **Body**: `{ fullName?: string, avatarUrl?: string }`
- **Response**: `{ user: User }`

## API Authentication

### Authentication Headers

All API endpoints require authentication unless specified otherwise:

```typescript
// Client-side requests
const response = await fetch('/api/teams', {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Include session cookies
});

// Server-side requests
const response = await fetch('/api/teams', {
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});
```

### Internal API Authentication

Some endpoints require HMAC signature authentication:

```typescript
// Generate HMAC signature
const signature = crypto
  .createHmac('sha256', process.env.INTERNAL_HMAC_SECRET!)
  .update(body || '')
  .digest('hex');

// Include in request
const response = await fetch('/api/oauth/sync-tokens', {
  method: 'POST',
  headers: {
    'x-internal-signature': signature,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

## API Error Handling

### Standard Error Response

```typescript
interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
```

### Common Error Codes

- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (resource already exists)
- `422` - Unprocessable Entity (validation error)
- `500` - Internal Server Error

### Error Handling Example

```typescript
try {
  const response = await fetch('/api/teams');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error);
  throw error;
}
```

## API Rate Limiting

### Rate Limit Headers

```typescript
// Response headers
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

### Rate Limit Handling

```typescript
const handleRateLimit = (response: Response) => {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const reset = response.headers.get('X-RateLimit-Reset');

  if (remaining === '0') {
    const resetTime = new Date(parseInt(reset!) * 1000);
    throw new Error(`Rate limit exceeded. Reset at ${resetTime}`);
  }
};
```

## API Testing

### Template API Tests

Template API endpoints include comprehensive tests in `src/app/api/__tests__/`.

### Custom API Testing

Create tests for custom API endpoints:

```typescript
// src/app/api/custom/__tests__/my-endpoint.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '../my-endpoint';

describe('/api/custom/my-endpoint', () => {
  it('should handle GET requests', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toEqual({
      message: 'Success',
    });
  });
});
```

## API Documentation

### Template API

Template API endpoints are documented in this file and should not be modified.

### Custom API

Document custom API endpoints in `docs/custom/custom-api.md`:

```markdown
# Custom API Endpoints

## GET /api/custom/my-endpoint

- **Purpose**: Description of what the endpoint does
- **Query Parameters**: List of query parameters
- **Response**: Expected response format
- **Authentication**: Authentication requirements
```

## API Best Practices

1. **Use TypeScript** - All API routes should be fully typed
2. **Validate Input** - Use Zod schemas for request validation
3. **Handle Errors** - Provide meaningful error messages
4. **Authenticate Requests** - Verify user authentication and authorization
5. **Rate Limit** - Implement appropriate rate limiting
6. **Log Requests** - Log important API operations
7. **Test Thoroughly** - Include unit and integration tests
8. **Document Usage** - Provide clear API documentation
9. **Version APIs** - Use versioning for breaking changes
10. **Follow REST Conventions** - Use standard HTTP methods and status codes
