# Active Context - Internal Tools Template

## Project Overview

This is an internal tools template built with Next.js, Supabase, and Azure Functions, focused on data warehouse integration and analytics. The template provides a comprehensive platform for managing data sources, running analytics queries, and executing planning models.

## Current State

- **Status**: Template transformation complete
- **Architecture**: Next.js App Router + Supabase + Azure Functions
- **Focus**: Data warehouse integration and analytics workflows
- **Authentication**: Microsoft and Google OAuth
- **Database**: PostgreSQL with Row Level Security (RLS)

## Recent Fixes

### OAuth Authentication RLS Issue (Fixed)

- **Problem**: Row Level Security policies were preventing profile creation during OAuth authentication
- **Root Cause**: Missing INSERT policy for the `profiles` table
- **Solution**: Added `"Users can create their own profile"` RLS policy to allow authenticated users to create their own profile
- **Files Modified**:
  - `supabase/schemas/03_profiles.sql` - Added INSERT policy
  - `src/app/auth/callback/route.ts` - Enhanced error logging
- **Migration**: `20250718003757_changes.sql` - Applied to database

### Notification System Implementation (Completed)

- **Problem**: Missing `notifications` table causing 404 errors
- **Solution**: Implemented complete notification system with database schema, API endpoints, and frontend integration
- **Components Added**:
  - `supabase/schemas/06_notifications.sql` - Database schema with RLS policies
  - `src/services/notificationService.ts` - Service layer for notification operations
  - `src/app/api/notifications/route.ts` - REST API endpoints
  - `src/app/api/notifications/[id]/route.ts` - Individual notification operations
  - Enhanced `src/types/notification.ts` - Added team notification types
- **Features**:
  - Real-time notifications via Supabase subscriptions
  - Team-based notifications
  - Chat mention notifications
  - System notifications
  - Notification management (mark as read, delete, clear all)
- **Migration**: `20250718141900_changes.sql` - Applied to database
- **Realtime Fix**: Added notifications table to Supabase Realtime publication to enable real-time subscriptions

### Chat System Implementation (Completed)

- **Problem**: Chat functionality needed proper API endpoints
- **Solution**: Implemented complete chat system with REST API endpoints
- **Components Added**:
  - `src/app/api/chat/threads/route.ts` - Thread management API
  - `src/app/api/chat/threads/[id]/route.ts` - Individual thread operations
  - `src/app/api/chat/comments/route.ts` - Comment management with mention detection
- **Features**:
  - Thread creation, reading, updating, deletion
  - Comment creation with automatic mention detection
  - Real-time updates via Supabase subscriptions
  - Team-based access control
  - Rich text content support

## Key Components

### Frontend Components

- `DataSourceManager`: Manage data warehouse connections
- `QueryEditor`: Create and execute SQL queries
- `PlanningModelBuilder`: Build forecasting and scenario models
- `ResultsViewer`: Display query and model results
- `InternalToolsDashboard`: Main dashboard integration
- `NotificationCenter`: Real-time notification management
- `ChatPane`, `ThreadList`, `CommentEditor`: Chat system components

### Database Schema

- `profiles`: User profiles and authentication data
- `teams`: Team information and management
- `team_members`: Team membership with roles
- `team_join_requests`: Join request workflow
- `chat_threads`: Team-based conversations
- `chat_comments`: Conversation messages
- `chat_reactions`: Message reactions
- `chat_read_receipts`: Read status tracking
- `notifications`: User notifications system

### API Endpoints

- `/api/notifications` - Notification management
- `/api/chat/threads` - Chat thread management
- `/api/chat/comments` - Chat comment management
- `/api/teams` - Team management
- `/api/users` - User management

### Edge Functions

- CORS handling for cross-origin requests

## Team Features

- Team creation and management
- Member role assignment (admin/member)
- Join request workflow
- Team-based chat conversations
- Domain-based access control
- Team notifications

## Security Features

- Row Level Security (RLS) for team isolation
- Domain-based access control
- Team-based permissions and roles
- OAuth authentication with enterprise providers
- **Profile Creation Policy**: Users can create their own profile during authentication
- **Notification Security**: Users can only access their own notifications
- **Chat Security**: Team-based access control for all chat operations

## Development Status

- ✅ Core component architecture complete
- ✅ Database schema with RLS policies
- ✅ Team-based access control system
- ✅ Chat functionality with team scoping
- ✅ Comprehensive documentation
- ✅ OAuth authentication RLS fix
- ✅ Notification system implementation
- ✅ Chat system API endpoints
- ✅ Real-time subscriptions for notifications and chat
- ✅ OAuth setup guides (Microsoft and Google)
- 🔄 Real-time updates (to be implemented)
- 🔄 Team invitation system via email

## Next Steps

1. Implement real-time updates via WebSocket connections
2. Add team invitation system via email
3. Set up CI/CD pipeline and production deployment
4. Add comprehensive testing for notification and chat systems
5. Follow OAuth setup guides for production deployment

## Recent Additions

### OAuth Setup Guides (Completed)

- **Added**: Comprehensive OAuth setup documentation
- **Location**: `docs/guides/` directory
- **Contents**:
  - `microsoft-oauth-setup.md` - Complete Microsoft Azure OAuth setup guide
  - `google-oauth-setup.md` - Complete Google OAuth setup guide
  - `README.md` - Overview and navigation for OAuth guides
- **Features**:
  - Step-by-step instructions for both providers
  - Troubleshooting sections for common issues
  - Security best practices and checklists
  - Environment variable configuration
  - Production deployment guidance

## File Structure

```
src/
├── components/
│   ├── teams/            # Team management components
│   ├── chat/             # Chat and conversation components
│   ├── notifications/    # Notification components
│   └── dashboard/        # Main dashboard integration
├── app/(authenticated)/  # Next.js App Router pages
├── app/api/              # REST API endpoints
│   ├── notifications/    # Notification API
│   └── chat/             # Chat API
├── services/             # Service layer
│   └── notificationService.ts
└── supabase/
    ├── schemas/          # Database schema definitions
    └── functions/        # Edge functions
```

## Technical Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, MUI v5
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Authentication**: Supabase Auth with OAuth providers
- **Database**: PostgreSQL with RLS and team-based access control
- **Real-time**: Supabase Realtime subscriptions
- **API**: RESTful API endpoints with proper authentication and authorization
