# Template vs Custom Code - Memory Bank

## Project Context

This is an internal tools template that has been transformed from StreamTrack into a comprehensive foundation for building team-based collaboration and data management applications. The template provides core functionality while allowing for extensive customization through proper extension points.

## Template Code (Don't Modify)

### Core Template Files

#### Authentication System

- **Location**: `src/app/(auth)/`
- **Purpose**: OAuth authentication with Microsoft Azure AD and Google Workspace
- **Components**: Sign in, sign up, password reset, OAuth callbacks
- **Status**: ✅ Complete and tested
- **Reason**: Core security functionality, critical for all applications
- **Documentation**: Comprehensive setup guides in `docs/guides/` for Microsoft and Google OAuth

#### Protected Pages

- **Location**: `src/app/(authenticated)/`
- **Purpose**: Pages requiring authentication
- **Components**: Dashboard, chat, teams, settings, user profile
- **Status**: ✅ Complete and tested
- **Reason**: Core application structure with established patterns

#### API Routes

- **Location**: `src/app/api/auth/`, `src/app/api/chat/`, `src/app/api/teams/`, `src/app/api/users/`, `src/app/api/notifications/`
- **Purpose**: Core API endpoints for template functionality
- **Status**: ✅ Complete with comprehensive error handling
- **Reason**: Established API patterns and security implementations

#### Template Components

- **Location**: `src/components/auth/`, `src/components/chat/`, `src/components/common/`, `src/components/dashboard/`, `src/components/notifications/`, `src/components/teams/`
- **Purpose**: Reusable UI components with established patterns
- **Status**: ✅ Complete with TypeScript types and error boundaries
- **Reason**: Core UI components with consistent design patterns

#### State Management

- **Location**: `src/contexts/`, `src/hooks/`
- **Purpose**: React context providers and custom hooks
- **Status**: ✅ Complete with proper error handling
- **Reason**: Core state management with established patterns

#### Infrastructure

- **Location**: `src/lib/`, `src/types/`
- **Purpose**: Core utilities, configurations, and type definitions
- **Status**: ✅ Complete with comprehensive type safety
- **Reason**: Core infrastructure with established patterns

#### Database Schema

- **Location**: `supabase/schemas/`, `supabase/migrations/`
- **Purpose**: Database table definitions and schema changes
- **Status**: ✅ Complete with RLS policies and indexes
- **Reason**: Core data structure with established relationships

### Template Features

#### Authentication & Authorization

- Multi-provider OAuth (Azure AD, Google Workspace)
- Row Level Security (RLS) for team-based data isolation
- Role-based access control (admin/member roles)
- Session management with JWT tokens

#### Team Management

- Team creation and management
- Member role assignment and management
- Domain-based access control
- Join request workflow

#### Real-time Communication

- Team-based chat with threads and comments
- Rich text editor with mentions and formatting
- Real-time updates via Supabase Realtime
- Notification system with team scoping

#### User Interface

- Material-UI v5 components with dark/light theme
- Responsive design with mobile support
- Comprehensive dashboard with tabbed interface
- Intuitive navigation and breadcrumbs

## Custom Code (Safe to Modify)

### Custom Directories

#### Features

- **Location**: `src/features/`
- **Purpose**: Business-specific features and functionality
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Create new features here, don't modify template features

#### Services

- **Location**: `src/services/`
- **Purpose**: Business-specific service layer
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Add custom services here, extend template services carefully

#### Components

- **Location**: `src/components/custom/`, `src/components/business/`
- **Purpose**: Custom UI components
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Create custom components here, use template components as building blocks

#### API Routes

- **Location**: `src/app/api/custom/`
- **Purpose**: Custom API endpoints
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Add custom APIs here, follow template API patterns

#### Types

- **Location**: `src/types/custom/`
- **Purpose**: Custom TypeScript types
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Add custom types here, extend template types carefully

#### Database

- **Location**: New migration files in `supabase/migrations/`
- **Purpose**: Custom database tables and schema changes
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Create new tables, follow template RLS patterns

#### Documentation

- **Location**: `docs/custom/`
- **Purpose**: Custom feature documentation
- **Status**: 🔄 Ready for custom development
- **Guidelines**: Document custom features here

#### OAuth Setup Guides

- **Location**: `docs/guides/`
- **Purpose**: Comprehensive OAuth provider setup instructions
- **Status**: ✅ Complete with Microsoft and Google guides
- **Contents**: Step-by-step setup, troubleshooting, security best practices
- **Guidelines**: Follow these guides for production OAuth configuration

## Extension Points (Template Integration)

### Auth Extensions

- **Location**: `src/extensions/auth/`
- **Purpose**: Extend template authentication
- **Status**: 🔄 Ready for custom development
- **Examples**: Custom OAuth providers, additional auth flows

### Dashboard Extensions

- **Location**: `src/extensions/dashboard/`
- **Purpose**: Extend template dashboard
- **Status**: 🔄 Ready for custom development
- **Examples**: Custom dashboard widgets, additional tabs

### Team Extensions

- **Location**: `src/extensions/teams/`
- **Purpose**: Extend template team features
- **Status**: 🔄 Ready for custom development
- **Examples**: Custom team roles, additional team features

### API Extensions

- **Location**: `src/extensions/api/`
- **Purpose**: Extend template API functionality
- **Status**: 🔄 Ready for custom development
- **Examples**: Custom middleware, additional API features

## Template Integration Patterns

### Component Integration

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
import { ThreadList } from '@/components/chat';

export const CustomThreadList: React.FC<CustomProps> = (props) => {
  // Add custom logic
  return <ThreadList {...props} />;
};
```

### API Integration

```typescript
// ✅ Good: Use template APIs as-is
const response = await fetch('/api/teams', {
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
});

// ✅ Good: Create custom APIs
// src/app/api/custom/my-endpoint/route.ts
export async function GET(request: NextRequest) {
  // Custom API logic
  return NextResponse.json({ message: 'Custom API' });
}
```

### Database Integration

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

## Template Update Process

### Current Template Version

- **Version**: v1.0.0
- **Last Update**: 2024-01-15
- **Next Planned Update**: 2024-02-15

### Update Checklist

1. ✅ Document current customizations
2. ✅ Create backup branch
3. ✅ Test custom code with template updates
4. ✅ Update documentation
5. ✅ Verify all integrations work

### Conflict Resolution Strategy

- **Template files**: Always accept template changes
- **Custom files**: Keep your customizations
- **Extension files**: Manual merge with care
- **Database migrations**: Apply template migrations first, then custom ones

## Customization Tracking

### Custom Features Added

- [ ] Feature 1: Description and files
- [ ] Feature 2: Description and files

### Custom Components Added

- [ ] Component 1: Location and purpose
- [ ] Component 2: Location and purpose

### Custom API Endpoints Added

- [ ] Endpoint 1: Route and functionality
- [ ] Endpoint 2: Route and functionality

### Database Extensions

- [ ] Table 1: Custom table added
- [ ] Column 1: Custom column added to template table
- [ ] Migration 1: Custom migration applied

### Template Extensions

- [ ] Auth Extension: How custom auth integrates
- [ ] Dashboard Extension: How custom dashboard integrates
- [ ] Team Extension: How custom team features integrate

## Best Practices

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

## Project Status

### Template Status

- ✅ Authentication system complete
- ✅ Team management complete
- ✅ Chat system complete
- ✅ Notification system complete
- ✅ Database schema complete
- ✅ API endpoints complete
- ✅ UI components complete
- ✅ Documentation complete

### Custom Development Status

- 🔄 Ready for custom feature development
- 🔄 Ready for custom component development
- 🔄 Ready for custom API development
- 🔄 Ready for custom database development
- 🔄 Ready for custom documentation

### Next Steps

1. Identify business requirements
2. Plan custom features
3. Create custom components
4. Implement custom APIs
5. Add custom database tables
6. Document custom functionality
7. Test custom integrations
8. Deploy custom features

## Key Decisions

### Architecture Decisions

- **Template-first approach**: Use template as foundation, extend through proper channels
- **Clear separation**: Maintain clear boundaries between template and custom code
- **Extension points**: Use designated extension points for customization
- **Pattern consistency**: Follow template patterns for custom code

### Security Decisions

- **RLS policies**: Maintain template RLS policies, add custom policies following same patterns
- **Authentication**: Use template authentication, extend through OAuth providers
- **Authorization**: Follow template role-based access control patterns
- **Data isolation**: Maintain team-based data isolation for custom features

### Performance Decisions

- **Component optimization**: Use React.memo and useMemo where appropriate
- **API optimization**: Follow template API patterns for performance
- **Database optimization**: Use indexes and query optimization
- **Caching strategy**: Follow template caching patterns

### Testing Decisions

- **Template tests**: Don't modify template tests
- **Custom tests**: Create comprehensive tests for custom code
- **Integration tests**: Test custom code with template functionality
- **E2E tests**: Test complete user workflows

This memory bank entry provides a comprehensive overview of the template vs custom code separation, ensuring that the development team understands what can and cannot be modified while maintaining the ability to accept future template updates.
