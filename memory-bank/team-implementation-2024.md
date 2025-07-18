# Team-Based Access Control Implementation - 2024

## Overview

Implemented a comprehensive team-based access control system that allows domain-based authentication, team creation, member management, and role-based permissions.

## Database Schema

### New Tables Created (`supabase/schemas/05_teams.sql`)

- **teams**: Core team information (id, name, description, slug, created_by)
- **team_members**: Team membership with roles (admin/member) and status
- **team_join_requests**: Join request workflow with approval/rejection

### Helper Functions

- `is_user_in_teams(team_ids[])`: Check if user is member of any team
- `is_team_admin(team_id)`: Check if user is admin of specific team
- `is_team_member(team_id)`: Check if user is member of specific team
- `is_team_creator(team_id)`: Check if user created the team
- `is_allowed_domain()`: Domain-based access control

### RLS Policies

- Team members can view their teams
- Any authenticated user from allowed domains can create teams
- Team creators and admins can update teams
- Team admins can manage members and join requests

## Frontend Implementation

### TeamContext (`src/contexts/TeamContext.tsx`)

- Centralized team state management
- Team CRUD operations
- Member management (add, remove, role changes)
- Join request workflow
- Real-time data synchronization with React Query

### API Routes

- `GET/POST /api/teams`: List and create teams
- `GET/PUT/DELETE /api/teams/[id]`: Team management
- Proper authentication and authorization checks

### Components

- **TeamSelector**: Team switching and creation
- **TeamsPage**: Full team management interface
- Member role management
- Join request approval/rejection

## Access Control Features

### Domain-Based Authentication

- Environment variable: `NEXT_PUBLIC_ALLOWED_DOMAINS`
- Comma-separated list of allowed email domains
- Middleware integration for API routes
- Database-level enforcement via RLS

### Team Permissions

1. **Any authenticated user** from allowed domains can:
   - Create teams
   - Request to join teams

2. **Team creators** can:
   - Update team information
   - Delete teams
   - Manage all team members

3. **Team admins** can:
   - Update team information
   - Add/remove team members
   - Change member roles
   - Approve/reject join requests

4. **Team members** can:
   - View team data
   - Access team-scoped resources

## Data Isolation

### Row Level Security (RLS)

- Chat threads are team-scoped
- RLS policies ensure users only access their team's data
- Team-based access control for all team-related resources

### Team-Scoped Tables

- `chat_threads`: Team-based conversations
- `teams`: Team information
- `team_members`: Team membership
- `team_join_requests`: Join workflow

## Integration Points

### Provider Integration

- TeamProvider added to main Providers component
- Available throughout the application
- Automatic team selection and switching

### Authentication Flow

- Domain validation in middleware
- Team context initialization after login
- Automatic team assignment for new users
- OAuth integration with Microsoft Azure AD and Google Workspace
- Comprehensive setup guides available in `docs/guides/`

### Chat Integration

- Chat threads properly scoped to teams
- Team-based real-time updates
- Member-only access to conversations

## Security Features

### Authentication

- Supabase Auth integration
- Domain-based access control
- Session management

### Authorization

- Role-based permissions (admin/member)
- Team-scoped data access
- Creator privileges

### Data Protection

- RLS policies on all tables
- Team-based data isolation
- Audit trail via team-based logging

## Usage Examples

### Creating a Team

```typescript
const { createTeam } = useTeam();
await createTeam({
  name: 'Engineering Team',
  description: 'Core development team',
  slug: 'engineering-team',
});
```

### Managing Members

```typescript
const { addTeamMember, updateTeamMemberRole, removeTeamMember } = useTeam();
await addTeamMember(teamId, userId, 'admin');
await updateTeamMemberRole(teamId, userId, 'member');
await removeTeamMember(teamId, userId);
```

### Join Requests

```typescript
const { requestToJoinTeam, approveJoinRequest, rejectJoinRequest } = useTeam();
await requestToJoinTeam(teamId, 'I would like to join the team');
await approveJoinRequest(requestId);
await rejectJoinRequest(requestId);
```

## Environment Configuration

### Required Environment Variables

```bash
# Domain-based access control
NEXT_PUBLIC_ALLOWED_DOMAINS=phoenixdata.works,example.com

# Supabase secrets (for database-level domain check)
# Set via: supabase secrets set app.allowed_domains=phoenixdata.works,example.com
```

## Next Steps

### Immediate

1. Run database migrations to create teams schema
2. Regenerate Supabase types: `npm run supabase:types`
3. Set up environment variables for domain control
4. Test team creation and member management
5. Verify RLS policies are working correctly

### Future Enhancements

1. Team invitation system via email
2. Team templates and default configurations
3. Advanced role permissions (viewer, editor, etc.)
4. Team analytics and usage metrics
5. Bulk member operations
6. Team export/import functionality

## Testing Checklist

- [ ] Domain-based authentication works
- [ ] Team creation and management
- [ ] Member role assignment
- [ ] Join request workflow
- [ ] RLS policies enforce team isolation
- [ ] Chat threads are team-scoped
- [ ] API routes respect team permissions
- [ ] UI components display correct team data
- [ ] Error handling for unauthorized access

## Removed Analytics Tables

The following analytics-related tables have been removed from the schema:

- `data_sources`: Data warehouse connections
- `analytics_queries`: SQL queries
- `query_executions`: Query execution history
- `planning_models`: Forecasting models
- `model_executions`: Model execution history

## Removed Analytics Enums

The following analytics and streaming-related enums have been removed:

- `metrics_capture_type`: Real-time vs daily metric collection
- `platform`: Streaming platforms (youtube, rumble, twitch, kick)
- `provider`: Social media providers (facebook, instagram, x, ga4, youtube)
- `stream_media_type`: Livestream vs video distinction
- `safety_status`: Content safety status
- `transcription_status`: Stream transcription status
- `processing_mode`: Real-time vs end-of-stream processing

This simplifies the application to focus on team-based collaboration and chat functionality.

## Schema Dependencies Fixed

### Function Dependencies

- **Moved `is_allowed_domain()` function** from `05_teams.sql` to `03_internal_tools_schema.sql`
- This fixes the dependency issue where the profiles RLS policy needed the function before it was created
- The function is now available when the profiles policy is created

### Table Dependencies

- **Simplified profiles policy** in `03_internal_tools_schema.sql` to only check domain access
- **Added team member profile policy** in `05_teams.sql` to allow team members to view each other's profiles
- This prevents the circular dependency where profiles policy needed team_members table before it was created

### Function References

- **Fixed function references** to use fully qualified names (`public.update_updated_at_column()`)
- **Updated all triggers** in both schemas to reference the correct function name
- This ensures the function is found when triggers are created

### Enum Restoration

- **Restored essential enums** in `02_custom_types.sql` that were accidentally removed:
  - `billing_provider`: Payment processing
  - `subscription_status`: Subscription management
  - `subscription_tier`: Subscription tiers
  - `domain_status`: Custom domain verification

### Schema Order

The correct schema execution order is:

1. `02_custom_types.sql` - Essential enums
2. `03_internal_tools_schema.sql` - Profiles and domain function
3. `04_chat.sql` - Chat functionality
4. `05_teams.sql` - Team management (uses functions from #3)

This ensures all dependencies are available when needed.
