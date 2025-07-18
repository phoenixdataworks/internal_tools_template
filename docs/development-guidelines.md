# StreamTrack - Development Guidelines

## Code Style & Standards

### TypeScript Guidelines

1. **Type Safety**

```typescript
// ✅ Good
interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  teamId?: string;
}

// ❌ Bad
interface UserProfile {
  id: any;
  email: any;
  fullName: any;
  teamId: any;
}
```

2. **Null Handling**

```typescript
// ✅ Good
function getUserName(user: User | null): string {
  return user?.fullName ?? 'Anonymous';
}

// ❌ Bad
function getUserName(user: User): string {
  return user.fullName || 'Anonymous';
}
```

3. **Async/Await**

```typescript
// ✅ Good
async function fetchUserData(): Promise<UserData> {
  try {
    const response = await api.get('/user');
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}

// ❌ Bad
function fetchUserData(): Promise<UserData> {
  return api
    .get('/user')
    .then(response => response.data)
    .catch(error => {
      handleError(error);
      throw error;
    });
}
```

### React Best Practices

1. **Component Structure**

```typescript
// ✅ Good
interface ProfileCardProps {
  user: User;
  onEdit: (userId: string) => void;
}

export function ProfileCard({ user, onEdit }: ProfileCardProps) {
  return (
    <div>
      <h2>{user.fullName}</h2>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
}

// ❌ Bad
export function ProfileCard(props: any) {
  return (
    <div>
      <h2>{props.user.fullName}</h2>
      <button onClick={() => props.onEdit(props.user.id)}>Edit</button>
    </div>
  );
}
```

2. **Hooks Usage**

```typescript
// ✅ Good
function useStreamMetrics(streamId: string) {
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);

  useEffect(() => {
    const subscription = supabase
      .channel(`stream-${streamId}`)
      .subscribe(metrics => setMetrics(metrics));

    return () => subscription.unsubscribe();
  }, [streamId]);

  return metrics;
}

// ❌ Bad
function useStreamMetrics(streamId: string) {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    supabase.channel(`stream-${streamId}`).subscribe(metrics => setMetrics(metrics));
  }, []); // Missing dependency

  return metrics;
}
```

### Python Guidelines

1. **Type Hints**

```python
# ✅ Good
from typing import Optional, Dict, List

def process_stream_data(
    stream_id: str,
    metrics: Dict[str, float]
) -> Optional[Dict[str, float]]:
    pass

# ❌ Bad
def process_stream_data(stream_id, metrics):
    pass
```

2. **Error Handling**

```python
# ✅ Good
try:
    response = api.get_stream_metrics(stream_id)
except ApiError as e:
    logger.error(f"API Error: {e}")
    raise
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise

# ❌ Bad
try:
    response = api.get_stream_metrics(stream_id)
except:
    logger.error("Error occurred")
    pass
```

## Testing Standards

### Frontend Testing

1. **Component Tests**

```typescript
// ✅ Good
describe('ProfileCard', () => {
  it('renders user information correctly', () => {
    const user = {
      id: '1',
      fullName: 'John Doe',
      email: 'john@example.com'
    };

    const { getByText } = render(<ProfileCard user={user} />);
    expect(getByText('John Doe')).toBeInTheDocument();
  });
});

// ❌ Bad
test('ProfileCard works', () => {
  render(<ProfileCard user={{}} />);
  // No assertions
});
```

2. **Hook Tests**

```typescript
// ✅ Good
describe('useStreamMetrics', () => {
  it('subscribes to stream updates', async () => {
    const { result } = renderHook(() => useStreamMetrics('stream-1'));
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
  });
});

// ❌ Bad
test('useStreamMetrics', () => {
  renderHook(() => useStreamMetrics('stream-1'));
  // No assertions or async handling
});
```

### Backend Testing

1. **API Tests**

```python
# ✅ Good
@pytest.mark.asyncio
async def test_stream_metrics():
    stream_id = "test-stream"
    metrics = {
        "viewers": 100,
        "chat_rate": 2.5
    }

    result = await process_stream_metrics(stream_id, metrics)
    assert result["processed"] == True
    assert result["metrics"]["viewers"] == 100

# ❌ Bad
def test_stream_metrics():
    process_stream_metrics("test", {})
    # No assertions
```

## Code Review Guidelines

### Pull Request Requirements

1. **Description Template**

```markdown
## Changes

- Detailed list of changes

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Screenshots

(if applicable)

## Related Issues

Fixes #123
```

2. **Review Checklist**

- Code follows style guidelines
- Tests are comprehensive
- Documentation is updated
- No security vulnerabilities
- Performance impact considered

## Security Guidelines

### 1. Authentication

```typescript
// ✅ Good
const { data: user, error } = await supabase.auth.getUser();
if (!user) {
  throw new AuthError('User not authenticated');
}

// ❌ Bad
const user = await supabase.auth.getUser();
// No error handling
```

### 2. Data Validation

```typescript
// ✅ Good
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const result = schema.safeParse(input);
if (!result.success) {
  throw new ValidationError(result.error);
}

// ❌ Bad
if (input.email && input.password) {
  // Process input
}
```

## Performance Guidelines

### 1. React Optimization

```typescript
// ✅ Good
const MemoizedComponent = React.memo(({ data }) => (
  <ExpensiveRenderer data={data} />
));

// ❌ Bad
function ExpensiveComponent({ data }) {
  return <ExpensiveRenderer data={data} />;
}
```

### 2. Database Queries

```typescript
// ✅ Good
const { data: streams } = await supabase
  .from('streams')
  .select('id, title, metrics:stream_metrics(viewer_count)')
  .eq('is_active', true)
  .limit(10);

// ❌ Bad
const { data: streams } = await supabase.from('streams').select('*').eq('is_active', true);
```

## Deployment Guidelines

### 1. Environment Configuration

```typescript
// ✅ Good
const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  stripeKey: process.env.STRIPE_SECRET_KEY,
};

if (!config.apiUrl || !config.stripeKey) {
  throw new Error('Missing required environment variables');
}

// ❌ Bad
const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  stripeKey: process.env.STRIPE_SECRET_KEY || 'default_key',
};
```

### 2. Build Process

```bash
# Production build steps
npm run lint
npm run test
npm run build
```

## Documentation Guidelines

### 1. Component Documentation

````typescript
/**
 * Displays stream metrics with real-time updates.
 *
 * @param streamId - The ID of the stream to monitor
 * @param refreshInterval - Update interval in milliseconds
 * @returns A component displaying stream metrics
 *
 * @example
 * ```tsx
 * <StreamMetrics
 *   streamId="123"
 *   refreshInterval={5000}
 * />
 * ```
 */
export function StreamMetrics({ streamId, refreshInterval = 5000 }: StreamMetricsProps) {
  // Implementation
}
````

### 2. API Documentation

````typescript
/**
 * Fetches stream analytics for a given time period.
 *
 * @param streamId - The ID of the stream
 * @param startTime - Start of the period (ISO string)
 * @param endTime - End of the period (ISO string)
 * @returns Stream analytics data
 * @throws {ApiError} If the API request fails
 *
 * @example
 * ```typescript
 * const analytics = await getStreamAnalytics(
 *   "stream-123",
 *   "2024-01-01T00:00:00Z",
 *   "2024-01-02T00:00:00Z"
 * );
 * ```
 */
async function getStreamAnalytics(
  streamId: string,
  startTime: string,
  endTime: string
): Promise<StreamAnalytics> {
  // Implementation
}
````

## Version Control Guidelines

### 1. Commit Messages

```
feat(monitoring): add real-time viewer count updates

- Add WebSocket subscription for viewer counts
- Implement auto-reconnection logic
- Add error handling for connection failures

Fixes #123
```

### 2. Branch Naming

```
feature/real-time-monitoring
bugfix/connection-timeout
hotfix/security-vulnerability
```

## Monitoring Guidelines

### 1. Error Tracking

```typescript
// ✅ Good
try {
  await processStream(streamId);
} catch (error) {
  logger.error('Stream processing failed', {
    streamId,
    error: error.message,
    stack: error.stack,
  });
  throw error;
}

// ❌ Bad
try {
  await processStream(streamId);
} catch (error) {
  console.error(error);
}
```

### 2. Performance Monitoring

```typescript
// ✅ Good
const startTime = performance.now();
await processStream(streamId);
const duration = performance.now() - startTime;

logger.info('Stream processing completed', {
  streamId,
  duration,
  timestamp: new Date().toISOString(),
});

// ❌ Bad
await processStream(streamId);
// No performance tracking
```
