# Internal Tools Template - Development Guidelines

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
function useTeamData(teamId: string) {
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    const subscription = supabase.channel(`team-${teamId}`).subscribe(team => setTeam(team));

    return () => subscription.unsubscribe();
  }, [teamId]);

  return team;
}

// ❌ Bad
function useTeamData(teamId: string) {
  const [team, setTeam] = useState<any>(null);

  useEffect(() => {
    supabase.channel(`team-${teamId}`).subscribe(team => setTeam(team));
  }, []); // Missing dependency

  return team;
}
```

3. **Context Usage**

```typescript
// ✅ Good
export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  const value = useMemo(() => ({
    currentTeam,
    setCurrentTeam,
  }), [currentTeam]);

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

// ❌ Bad
export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);

  return (
    <TeamContext.Provider value={{ currentTeam, setCurrentTeam }}>
      {children}
    </TeamContext.Provider>
  );
}
```

### Template Component Guidelines

1. **Using Template Components**

```typescript
// ✅ Good: Use template components as-is
import { ThreadList } from '@/components/chat';

export const MyPage = () => {
  return (
    <div>
      <ThreadList teamId="team-123" />
    </div>
  );
};

// ✅ Good: Create wrapper components
interface CustomThreadListProps {
  teamId: string;
  customFilter?: string;
}

export const CustomThreadList: React.FC<CustomThreadListProps> = ({
  teamId,
  customFilter,
  ...props
}) => {
  const filteredTeamId = customFilter ? `${teamId}-${customFilter}` : teamId;

  return <ThreadList teamId={filteredTeamId} {...props} />;
};
```

2. **Creating Custom Components**

```typescript
// ✅ Good: Create in designated directories
// src/components/custom/MyCustomComponent.tsx
interface MyCustomComponentProps {
  data: any[];
  onAction: (item: any) => void;
}

export const MyCustomComponent: React.FC<MyCustomComponentProps> = ({
  data,
  onAction,
}) => {
  return (
    <div>
      {data.map(item => (
        <button key={item.id} onClick={() => onAction(item)}>
          {item.name}
        </button>
      ))}
    </div>
  );
};
```

### API Development Guidelines

1. **Template API Usage**

```typescript
// ✅ Good: Use template APIs as-is
const response = await fetch('/api/teams', {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
});

const teams = await response.json();
```

2. **Creating Custom APIs**

```typescript
// ✅ Good: Create in designated directory
// src/app/api/custom/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  // Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Custom API logic
  return NextResponse.json({ message: 'Custom API' });
}
```

### Database Guidelines

1. **Template Database Usage**

```typescript
// ✅ Good: Use template tables
const { data: teams } = await supabase.from('teams').select('*').eq('id', teamId);
```

2. **Creating Custom Tables**

```sql
-- ✅ Good: Create custom tables in new migrations
CREATE TABLE custom_business_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  data JSONB,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow template RLS patterns
CREATE POLICY "Team members can access custom data" ON custom_business_data
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
```

## Testing Standards

### Frontend Testing

1. **Component Tests**

```typescript
// ✅ Good
import { render, screen } from '@testing-library/react';
import { ProfileCard } from '@/components/custom/ProfileCard';

describe('ProfileCard', () => {
  it('renders user information correctly', () => {
    const user = {
      id: '1',
      fullName: 'John Doe',
      email: 'john@example.com'
    };

    render(<ProfileCard user={user} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
});
```

2. **Hook Tests**

```typescript
// ✅ Good
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamData } from '@/hooks/useTeamData';

describe('useTeamData', () => {
  it('fetches team data', async () => {
    const { result } = renderHook(() => useTeamData('team-123'));

    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });
});
```

### API Testing

```typescript
// ✅ Good
import { GET } from '@/app/api/custom/my-endpoint/route';

describe('Custom API', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const request = new Request('http://localhost:3000/api/custom/my-endpoint');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

## Security Guidelines

### Authentication & Authorization

1. **Always verify authentication in API routes**

```typescript
// ✅ Good
export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // API logic here
}
```

2. **Use RLS policies for data access**

```sql
-- ✅ Good: Template RLS pattern
CREATE POLICY "Team members can access team data" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid()
    )
  );
```

### Input Validation

```typescript
// ✅ Good: Use Zod for validation
import { z } from 'zod';

const CreateTeamSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validatedData = CreateTeamSchema.parse(body);

  // Use validated data
}
```

## Performance Guidelines

### React Optimization

1. **Use React.memo for expensive components**

```typescript
// ✅ Good
export const ExpensiveComponent = React.memo<ExpensiveComponentProps>(
  ({ data, onAction }) => {
    return (
      <div>
        {data.map(item => (
          <ExpensiveItem key={item.id} item={item} onAction={onAction} />
        ))}
      </div>
    );
  }
);
```

2. **Optimize re-renders with useMemo and useCallback**

```typescript
// ✅ Good
export function TeamDashboard({ teamId }: { teamId: string }) {
  const [data, setData] = useState<TeamData[]>([]);

  const filteredData = useMemo(() =>
    data.filter(item => item.teamId === teamId),
    [data, teamId]
  );

  const handleAction = useCallback((itemId: string) => {
    // Action logic
  }, []);

  return (
    <div>
      {filteredData.map(item => (
        <TeamItem key={item.id} item={item} onAction={handleAction} />
      ))}
    </div>
  );
}
```

### Database Optimization

1. **Use proper indexes**

```sql
-- ✅ Good: Add indexes for frequently queried columns
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
```

2. **Optimize queries**

```typescript
// ✅ Good: Select only needed columns
const { data } = await supabase.from('teams').select('id, name, slug').eq('id', teamId);

// ❌ Bad: Select all columns
const { data } = await supabase.from('teams').select('*').eq('id', teamId);
```

## Template Integration Guidelines

### Extension Points

1. **Use designated extension directories**

```
src/
├── extensions/           # Template extension points
├── components/custom/    # Custom components
├── features/            # Custom business features
├── services/            # Custom business services
└── types/custom/        # Custom type definitions
```

2. **Follow template patterns**

```typescript
// ✅ Good: Follow template component patterns
interface CustomComponentProps {
  teamId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export const CustomComponent: React.FC<CustomComponentProps> = ({ teamId, onSuccess, onError }) => {
  // Implementation following template patterns
};
```

### Template Updates

1. **Before updating template**

```bash
# Document current customizations
git checkout -b backup-before-template-update
git commit -m "Backup before template update"

# Create update branch
git checkout -b template-update-$(date +%Y%m%d)
```

2. **After template update**

```bash
# Test thoroughly
npm run test
npm run build
npm run lint

# Update documentation
# Update memory-bank with changes
```

## Code Review Checklist

### Before Submitting

- [ ] Code follows TypeScript strict mode
- [ ] All functions have proper type definitions
- [ ] Error handling is implemented
- [ ] Authentication is verified where needed
- [ ] RLS policies are in place for new tables
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Code follows template patterns
- [ ] No template files are modified
- [ ] Custom code is in designated directories

### Review Points

- [ ] Security: Authentication, authorization, input validation
- [ ] Performance: Query optimization, component optimization
- [ ] Maintainability: Code organization, naming conventions
- [ ] Testing: Coverage, edge cases, error scenarios
- [ ] Documentation: API docs, component docs, setup instructions
- [ ] Template Integration: Proper extension points, no template modifications

## Best Practices Summary

1. **Never modify template files directly**
2. **Use designated extension points for customization**
3. **Follow template patterns for consistency**
4. **Maintain security through RLS and authentication**
5. **Write comprehensive tests for custom code**
6. **Document custom functionality thoroughly**
7. **Optimize for performance and maintainability**
8. **Keep custom code modular and reusable**
