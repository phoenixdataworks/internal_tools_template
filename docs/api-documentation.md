# Internal Tools Template - API Documentation

## Authentication

The template uses Supabase Auth for authentication, supporting multiple OAuth providers and secure token management.

### Authentication Flow

1. **Initial Authentication**

```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'azure', // or 'google'
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

## Template API Endpoints

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

#### 2. Get Teams

```typescript
GET /api/teams
Authorization: Bearer <token>

Response: {
  "teams": [{
    "id": "uuid",
    "name": "Team Name",
    "slug": "team-name",
    "created_at": "timestamp"
  }]
}
```

#### 3. Update Team

```typescript
PUT /api/teams/{teamId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Team Name",
  "slug": "updated-team-name"
}

Response: {
  "id": "uuid",
  "name": "Updated Team Name",
  "slug": "updated-team-name",
  "updated_at": "timestamp"
}
```

#### 4. Delete Team

```typescript
DELETE /api/teams/{teamId}
Authorization: Bearer <token>

Response: {
  "success": true
}
```

### Team Members

#### 1. Add Team Member

```typescript
POST /api/teams/{teamId}/members
Content-Type: application/json
Authorization: Bearer <token>

{
  "email": "user@example.com",
  "role": "member" // or "admin"
}

Response: {
  "id": "uuid",
  "email": "user@example.com",
  "role": "member",
  "status": "pending"
}
```

#### 2. Get Team Members

```typescript
GET /api/teams/{teamId}/members
Authorization: Bearer <token>

Response: {
  "members": [{
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "User Name",
    "role": "member",
    "joined_at": "timestamp"
  }]
}
```

#### 3. Update Member Role

```typescript
PUT /api/teams/{teamId}/members/{memberId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "role": "admin"
}

Response: {
  "id": "uuid",
  "role": "admin",
  "updated_at": "timestamp"
}
```

#### 4. Remove Team Member

```typescript
DELETE /api/teams/{teamId}/members/{memberId}
Authorization: Bearer <token>

Response: {
  "success": true
}
```

### Chat System

#### 1. Create Thread

```typescript
POST /api/chat/threads
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Thread Title",
  "content": "Initial message content",
  "teamId": "uuid"
}

Response: {
  "id": "uuid",
  "title": "Thread Title",
  "created_at": "timestamp"
}
```

#### 2. Get Threads

```typescript
GET /api/chat/threads?teamId={teamId}
Authorization: Bearer <token>

Response: {
  "threads": [{
    "id": "uuid",
    "title": "Thread Title",
    "created_by": "uuid",
    "created_at": "timestamp",
    "comment_count": 5
  }]
}
```

#### 3. Get Thread Details

```typescript
GET /api/chat/threads/{threadId}
Authorization: Bearer <token>

Response: {
  "id": "uuid",
  "title": "Thread Title",
  "content": "Initial message",
  "created_by": "uuid",
  "created_at": "timestamp",
  "comments": [{
    "id": "uuid",
    "content": "Comment content",
    "created_by": "uuid",
    "created_at": "timestamp"
  }]
}
```

#### 4. Add Comment

```typescript
POST /api/chat/threads/{threadId}/comments
Content-Type: application/json
Authorization: Bearer <token>

{
  "content": "Comment content"
}

Response: {
  "id": "uuid",
  "content": "Comment content",
  "created_at": "timestamp"
}
```

### Notifications

#### 1. Get Notifications

```typescript
GET /api/notifications
Authorization: Bearer <token>

Response: {
  "notifications": [{
    "id": "uuid",
    "title": "Notification Title",
    "message": "Notification message",
    "type": "info",
    "read": false,
    "created_at": "timestamp"
  }]
}
```

#### 2. Mark Notification as Read

```typescript
PUT /api/notifications/{notificationId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "read": true
}

Response: {
  "id": "uuid",
  "read": true,
  "updated_at": "timestamp"
}
```

#### 3. Mark All Notifications as Read

```typescript
PUT /api/notifications/read-all
Authorization: Bearer <token>

Response: {
  "success": true,
  "updated_count": 5
}
```

### User Profile

#### 1. Get User Profile

```typescript
GET /api/users/profile
Authorization: Bearer <token>

Response: {
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "User Name",
  "avatar_url": "https://example.com/avatar.jpg",
  "created_at": "timestamp"
}
```

#### 2. Update User Profile

```typescript
PUT /api/users/profile
Content-Type: application/json
Authorization: Bearer <token>

{
  "full_name": "Updated Name",
  "avatar_url": "https://example.com/new-avatar.jpg"
}

Response: {
  "id": "uuid",
  "full_name": "Updated Name",
  "avatar_url": "https://example.com/new-avatar.jpg",
  "updated_at": "timestamp"
}
```

## Custom API Development

### Creating Custom Endpoints

When building custom features, create API endpoints in the designated directory:

```typescript
// src/app/api/custom/my-feature/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { z } from 'zod';

// Validation schema
const CreateFeatureSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  teamId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateFeatureSchema.parse(body);

    // Verify team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', validatedData.teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Custom business logic
    const { data, error } = await supabase
      .from('custom_features')
      .insert({
        name: validatedData.name,
        description: validatedData.description,
        team_id: validatedData.teamId,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID required' }, { status: 400 });
    }

    // Verify team membership
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Custom business logic
    const { data, error } = await supabase
      .from('custom_features')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ features: data });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### API Response Patterns

Follow consistent response patterns for all API endpoints:

```typescript
// Success response
{
  "data": { /* response data */ },
  "message": "Operation successful"
}

// Error response
{
  "error": "Error message",
  "details": { /* additional error details */ }
}

// List response
{
  "data": [ /* array of items */ ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### Error Handling

Implement comprehensive error handling:

```typescript
// Common error types
export enum ApiErrorType {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// Error response helper
function createErrorResponse(type: ApiErrorType, message: string, details?: any) {
  return NextResponse.json(
    {
      error: type,
      message,
      details,
    },
    { status: getStatusCode(type) }
  );
}

function getStatusCode(type: ApiErrorType): number {
  switch (type) {
    case ApiErrorType.UNAUTHORIZED:
      return 401;
    case ApiErrorType.FORBIDDEN:
      return 403;
    case ApiErrorType.NOT_FOUND:
      return 404;
    case ApiErrorType.VALIDATION_ERROR:
      return 400;
    case ApiErrorType.INTERNAL_ERROR:
      return 500;
    default:
      return 500;
  }
}
```

## Real-time Features

### WebSocket Subscriptions

The template provides real-time updates through Supabase Realtime:

```typescript
// Subscribe to team updates
const subscription = supabase
  .channel(`team-${teamId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'teams',
      filter: `id=eq.${teamId}`,
    },
    payload => {
      console.log('Team updated:', payload);
    }
  )
  .subscribe();

// Subscribe to chat updates
const chatSubscription = supabase
  .channel(`chat-${threadId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_comments',
      filter: `thread_id=eq.${threadId}`,
    },
    payload => {
      console.log('New comment:', payload);
    }
  )
  .subscribe();
```

### Custom Real-time Events

For custom features, use the same pattern:

```typescript
// Subscribe to custom feature updates
const customSubscription = supabase
  .channel(`custom-features-${teamId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'custom_features',
      filter: `team_id=eq.${teamId}`,
    },
    payload => {
      console.log('Custom feature updated:', payload);
    }
  )
  .subscribe();
```

## Testing API Endpoints

### Unit Testing

```typescript
// src/app/api/custom/my-feature/__tests__/route.test.ts
import { GET, POST } from '../route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs');

describe('Custom Feature API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests', async () => {
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };

    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/custom/my-feature');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('creates feature successfully', async () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'admin' } }),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'feature-123', name: 'Test Feature' },
        error: null,
      }),
    };

    (createRouteHandlerClient as jest.Mock).mockReturnValue(mockSupabase);

    const request = new Request('http://localhost:3000/api/custom/my-feature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Feature',
        teamId: 'team-123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('Test Feature');
  });
});
```

## API Security Best Practices

### 1. Authentication Verification

Always verify user authentication in API routes:

```typescript
const {
  data: { user },
  error: authError,
} = await supabase.auth.getUser();
if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

### 2. Authorization Checks

Verify team membership and permissions:

```typescript
const { data: membership } = await supabase
  .from('team_members')
  .select('role')
  .eq('team_id', teamId)
  .eq('user_id', user.id)
  .single();

if (!membership) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

### 3. Input Validation

Use Zod schemas for request validation:

```typescript
const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const validatedData = schema.parse(requestBody);
```

### 4. SQL Injection Prevention

Use Supabase's parameterized queries:

```typescript
// ✅ Good
const { data } = await supabase.from('teams').select('*').eq('id', teamId);

// ❌ Bad - Don't use string concatenation
const { data } = await supabase.rpc('custom_query', {
  query: `SELECT * FROM teams WHERE id = '${teamId}'`,
});
```

### 5. Rate Limiting

Implement rate limiting for sensitive endpoints:

```typescript
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const identifier = request.ip ?? 'anonymous';
  const { success } = await rateLimit(identifier);

  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // API logic
}
```

## API Documentation Standards

### OpenAPI/Swagger

Consider using OpenAPI for comprehensive API documentation:

```yaml
openapi: 3.0.0
info:
  title: Internal Tools Template API
  version: 1.0.0
  description: API for internal tools template

paths:
  /api/teams:
    get:
      summary: Get teams
      security:
        - bearerAuth: []
      responses:
        '200':
          description: List of teams
          content:
            application/json:
              schema:
                type: object
                properties:
                  teams:
                    type: array
                    items:
                      $ref: '#/components/schemas/Team'
```

### API Versioning

Consider API versioning for future compatibility:

```typescript
// Versioned API route
// src/app/api/v1/teams/route.ts
export async function GET(request: NextRequest) {
  // v1 implementation
}

// src/app/api/v2/teams/route.ts
export async function GET(request: NextRequest) {
  // v2 implementation with breaking changes
}
```

## Performance Optimization

### 1. Database Query Optimization

```typescript
// ✅ Good: Select only needed columns
const { data } = await supabase.from('teams').select('id, name, slug').eq('id', teamId);

// ✅ Good: Use pagination
const { data } = await supabase
  .from('teams')
  .select('*')
  .range(0, 9)
  .order('created_at', { ascending: false });
```

### 2. Caching

Implement caching for frequently accessed data:

```typescript
import { cache } from 'react';

export const getTeamData = cache(async (teamId: string) => {
  const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();

  return data;
});
```

### 3. Response Compression

Enable response compression in production:

```typescript
// next.config.mjs
const nextConfig = {
  compress: true,
  // ... other config
};
```

This API documentation provides a comprehensive guide for working with the template's built-in APIs and creating custom endpoints following the template's patterns and security practices.
