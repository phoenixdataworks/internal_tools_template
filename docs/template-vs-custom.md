# Template vs Custom Code Separation

This document provides a clear separation between template code (don't modify) and custom code (safe to modify).

## Template Code (Don't Modify)

### Authentication System

- **Files**: All files in `src/app/(auth)/`
- **Purpose**: OAuth authentication pages and flows
- **Includes**: Sign in, sign up, password reset, OAuth callbacks
- **Reason**: Core authentication functionality, critical for security

### Protected Pages

- **Files**: All files in `src/app/(authenticated)/`
- **Purpose**: Pages that require authentication
- **Includes**: Dashboard, chat, teams, settings, user profile
- **Reason**: Core application pages with established patterns

### API Routes

- **Files**: All files in `src/app/api/auth/`, `src/app/api/chat/`, `src/app/api/teams/`, `src/app/api/users/`, `src/app/api/notifications/`
- **Purpose**: Core API endpoints for template functionality
- **Includes**: Authentication, chat, teams, users, notifications
- **Reason**: Established API patterns and security implementations

### Template Components

- **Files**: All files in `src/components/auth/`, `src/components/chat/`, `src/components/common/`, `src/components/dashboard/`, `src/components/notifications/`, `src/components/teams/`
- **Purpose**: Reusable UI components
- **Includes**: Authentication forms, chat interface, common UI elements, dashboard, notifications, team management
- **Reason**: Core UI components with established patterns

### Context Providers

- **Files**: All files in `src/contexts/`
- **Purpose**: React context providers for state management
- **Includes**: Authentication, chat, notifications, teams, theme, toast
- **Reason**: Core state management with established patterns

### Custom Hooks

- **Files**: All files in `src/hooks/`
- **Purpose**: Reusable React hooks
- **Includes**: Authentication, chat state, navigation, real-time subscriptions
- **Reason**: Core functionality with established patterns

### Utility Libraries

- **Files**: All files in `src/lib/`
- **Purpose**: Core utility functions and configurations
- **Includes**: Supabase client, API client, middleware, metadata
- **Reason**: Core infrastructure with established patterns

### Type Definitions

- **Files**: All files in `src/types/`
- **Purpose**: TypeScript type definitions
- **Includes**: Database types, component types, API types
- **Reason**: Core type safety with established patterns

### Database Schema

- **Files**: All files in `supabase/schemas/`
- **Purpose**: Database table definitions
- **Includes**: Profiles, teams, chat, notifications
- **Reason**: Core data structure with established relationships

### Database Migrations

- **Files**: All files in `supabase/migrations/`
- **Purpose**: Database schema changes
- **Includes**: Initial setup, feature additions, fixes
- **Reason**: Core database structure with established relationships

### Edge Functions

- **Files**: All files in `supabase/functions/`
- **Purpose**: Serverless functions
- **Includes**: CORS handling, health checks
- **Reason**: Core serverless functionality

## Custom Code (Safe to Modify)

### Custom Features

- **Directory**: `src/features/`
- **Purpose**: Business-specific features
- **Examples**: Custom dashboards, business logic, specialized tools
- **Guidelines**: Create new features here, don't modify template features

### Custom Services

- **Directory**: `src/services/`
- **Purpose**: Business-specific service layer
- **Examples**: Custom API integrations, business logic services
- **Guidelines**: Add custom services here, extend template services carefully

### Custom Components

- **Directory**: `src/components/custom/`, `src/components/business/`
- **Purpose**: Custom UI components
- **Examples**: Business-specific forms, custom widgets, specialized UI
- **Guidelines**: Create custom components here, use template components as building blocks

### Custom API Routes

- **Directory**: `src/app/api/custom/`
- **Purpose**: Custom API endpoints
- **Examples**: Business-specific APIs, custom integrations
- **Guidelines**: Add custom APIs here, follow template API patterns

### Custom Types

- **Directory**: `src/types/custom/`
- **Purpose**: Custom TypeScript types
- **Examples**: Business-specific interfaces, custom data types
- **Guidelines**: Add custom types here, extend template types carefully

### Custom Database Tables

- **Location**: New migration files in `supabase/migrations/`
- **Purpose**: Custom database tables
- **Examples**: Business-specific data, custom analytics
- **Guidelines**: Create new tables, follow template RLS patterns

### Custom Documentation

- **Directory**: `docs/custom/`
- **Purpose**: Custom feature documentation
- **Examples**: Custom API docs, business logic documentation
- **Guidelines**: Document custom features here

### Project Context

- **Directory**: `memory-bank/`
- **Purpose**: Project decisions and context
- **Examples**: Customization decisions, business requirements
- **Guidelines**: Track custom decisions and context here

## Extension Points (Template Integration)

### Auth Extensions

- **Directory**: `src/extensions/auth/`
- **Purpose**: Extend template authentication
- **Examples**: Custom OAuth providers, additional auth flows
- **Guidelines**: Use extension points, don't modify template auth

### Dashboard Extensions

- **Directory**: `src/extensions/dashboard/`
- **Purpose**: Extend template dashboard
- **Examples**: Custom dashboard widgets, additional tabs
- **Guidelines**: Use extension points, don't modify template dashboard

### Team Extensions

- **Directory**: `src/extensions/teams/`
- **Purpose**: Extend template team features
- **Examples**: Custom team roles, additional team features
- **Guidelines**: Use extension points, don't modify template team features

### API Extensions

- **Directory**: `src/extensions/api/`
- **Purpose**: Extend template API functionality
- **Examples**: Custom middleware, additional API features
- **Guidelines**: Use extension points, don't modify template APIs

## Template Integration Patterns

### Using Template Components

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
```

### Extending Template Components

```typescript
// ✅ Good: Create wrapper components
import { ThreadList } from '@/components/chat';

interface CustomThreadListProps {
  teamId: string;
  customFilter?: string;
}

export const CustomThreadList: React.FC<CustomThreadListProps> = ({
  teamId,
  customFilter,
  ...props
}) => {
  // Add custom logic
  const filteredTeamId = customFilter ? `${teamId}-${customFilter}` : teamId;

  return <ThreadList teamId={filteredTeamId} {...props} />;
};
```

### Creating Custom Components

```typescript
// ✅ Good: Create completely custom components
interface MyCustomComponentProps {
  data: any[];
  onAction: (item: any) => void;
}

export const MyCustomComponent: React.FC<MyCustomComponentProps> = ({
  data,
  onAction,
}) => {
  // Custom implementation
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

### Using Template APIs

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

### Creating Custom APIs

```typescript
// ✅ Good: Create custom API routes
// src/app/api/custom/my-endpoint/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Custom API logic
  return NextResponse.json({ message: 'Custom API' });
}
```

### Extending Template Database

```sql
-- ✅ Good: Create custom tables
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

## What NOT to Do

### ❌ Don't Modify Template Files

```typescript
// ❌ Bad: Modifying template components
// src/components/chat/ThreadList.tsx
export const ThreadList: React.FC<ThreadListProps> = ({ teamId }) => {
  // Don't add custom logic here
  const customData = fetchCustomData(); // ❌ Don't do this

  return (
    <div>
      {/* Template implementation */}
    </div>
  );
};
```

### ❌ Don't Override Template APIs

```typescript
// ❌ Bad: Overriding template API routes
// src/app/api/teams/route.ts
export async function GET(request: NextRequest) {
  // Don't modify template API logic
  const customLogic = processCustomData(); // ❌ Don't do this

  return NextResponse.json({ teams: [] });
}
```

### ❌ Don't Modify Template Database

```sql
-- ❌ Bad: Modifying template tables
ALTER TABLE teams ADD COLUMN custom_field TEXT; -- ❌ Don't do this
```

## What TO Do Instead

### ✅ Use Extension Points

```typescript
// ✅ Good: Use extension points
// src/extensions/dashboard/custom-dashboard.tsx
import { InternalToolsDashboard } from '@/components/dashboard';

export const CustomDashboard = () => {
  return (
    <InternalToolsDashboard>
      {/* Add custom dashboard content */}
      <MyCustomWidget />
    </InternalToolsDashboard>
  );
};
```

### ✅ Create Custom Components

```typescript
// ✅ Good: Create custom components
// src/components/custom/MyCustomWidget.tsx
export const MyCustomWidget = () => {
  return (
    <div>
      {/* Custom widget implementation */}
    </div>
  );
};
```

### ✅ Add Custom Database Tables

```sql
-- ✅ Good: Create custom tables
CREATE TABLE my_custom_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  -- Custom fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### ✅ Create Custom API Routes

```typescript
// ✅ Good: Create custom API routes
// src/app/api/custom/my-data/route.ts
export async function GET(request: NextRequest) {
  // Custom API logic
  return NextResponse.json({ data: [] });
}
```

## Template Update Process

### Before Updating

1. Document current customizations in `memory-bank/customizations.md`
2. Create backup branch: `git checkout -b backup-before-template-update`
3. Commit current state: `git commit -m "Backup before template update"`

### During Update

1. Add template as remote: `git remote add template <template-repo-url>`
2. Fetch latest: `git fetch template main`
3. Create merge branch: `git checkout -b template-update-$(date +%Y%m%d)`
4. Merge template: `git merge template/main --no-ff`
5. Resolve conflicts in extension points only
6. Test thoroughly with custom code

### After Update

1. Update `memory-bank/template-version.md` with new version
2. Update `docs/custom/custom-integration.md` if needed
3. Test all custom features with updated template
4. Merge to main: `git checkout main && git merge template-update-*`

### Conflict Resolution

- **Template files**: Always accept template changes
- **Custom files**: Keep your customizations
- **Extension files**: Manual merge with care
- **Database migrations**: Apply template migrations first, then custom ones

## Best Practices Summary

### Template Code

1. **Never modify** template files directly
2. **Use extension points** for customization
3. **Follow template patterns** for consistency
4. **Test thoroughly** after template updates
5. **Document customizations** clearly

### Custom Code

1. **Create in designated directories** only
2. **Follow template patterns** for consistency
3. **Use TypeScript** throughout
4. **Include proper error handling**
5. **Add comprehensive tests**
6. **Document thoroughly**

### Integration

1. **Use template components** as building blocks
2. **Extend through props** and composition
3. **Follow security patterns** (RLS, authentication)
4. **Maintain performance** standards
5. **Keep accessibility** in mind

This separation ensures that:

- ✅ Template updates can be applied easily
- ✅ Custom code is preserved and maintained
- ✅ Clear boundaries exist between template and custom functionality
- ✅ Development team understands what can and cannot be modified
- ✅ Template functionality remains intact and secure
