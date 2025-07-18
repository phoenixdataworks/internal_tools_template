# Internal Tools Template - Overview

## What This Template Provides

This is a comprehensive internal tools template built with Next.js 15+, Supabase, and MUI v5. It provides a modern, scalable foundation for building team-based collaboration and data management applications.

## Core Template Features

### Authentication & Authorization

- **Multi-provider OAuth**: Microsoft Azure AD and Google Workspace integration
- **Team-based Access Control**: Row Level Security (RLS) for data isolation
- **Role Management**: Admin and member roles within teams
- **Session Management**: JWT-based authentication with refresh tokens

### Team Management

- **Team Creation**: Create and manage teams
- **Member Management**: Add/remove team members with role assignment
- **Domain-based Access**: Control access based on email domains
- **Join Requests**: Workflow for team membership requests

### Real-time Communication

- **Chat System**: Team-based conversations with threads and comments
- **Rich Text Editor**: TipTap-based editor with mentions and formatting
- **Real-time Updates**: WebSocket-based live updates via Supabase Realtime
- **Notifications**: Real-time notification system with team scoping

### User Interface

- **Modern UI**: Material-UI v5 components with dark/light theme support
- **Responsive Design**: Mobile-first responsive layout
- **Dashboard**: Comprehensive dashboard with tabbed interface
- **Navigation**: Intuitive navigation with breadcrumbs and menus

### Database & API

- **PostgreSQL**: Robust database with RLS policies
- **REST API**: Comprehensive API endpoints for all features
- **Type Safety**: Full TypeScript support with generated types
- **Migrations**: Automated database schema management

## Technical Stack

### Frontend

- **Framework**: Next.js 15+ with App Router
- **Language**: TypeScript 5+
- **UI Library**: Material-UI v5
- **State Management**: React Query + Context API
- **Styling**: MUI theme system + Emotion

### Backend

- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **API**: Next.js API routes + Supabase Edge Functions
- **Hosting**: Vercel-ready deployment

### Development Tools

- **Testing**: Vitest + Jest + Playwright
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode
- **Git Hooks**: Husky + lint-staged

## Template Architecture

### File Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (authenticated)/   # Protected pages
│   └── api/               # API routes
├── components/            # React components
│   ├── auth/              # Authentication components
│   ├── chat/              # Chat system components
│   ├── common/            # Common UI components
│   ├── dashboard/         # Dashboard components
│   ├── notifications/     # Notification components
│   └── teams/             # Team management components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── services/              # Service layer
├── types/                 # TypeScript type definitions
└── utils/                 # Utility functions
```

### Database Schema

```
profiles          # User profiles and authentication
teams            # Team information
team_members     # Team membership with roles
team_join_requests # Join request workflow
chat_threads     # Team conversations
chat_comments    # Conversation messages
chat_reactions   # Message reactions
chat_read_receipts # Read status tracking
notifications    # User notifications
```

## Getting Started

### Prerequisites

- Node.js 22+
- Supabase account
- Microsoft Azure AD or Google Workspace (for OAuth)

### Quick Start

1. Clone the template
2. Install dependencies: `npm install`
3. Set up environment variables
4. Start Supabase: `npm run supabase:start`
5. Run migrations: `npm run supabase:migrate:diff`
6. Start development: `npm run dev`

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OAuth Providers
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Template Customization

### Extension Points

- `src/extensions/` - Template extension points
- `src/components/custom/` - Custom components
- `src/features/` - Custom business features
- `src/services/` - Custom business services

### Database Extensions

- Add custom tables in new migrations
- Extend existing tables with custom columns
- Maintain RLS policies for security

### API Extensions

- Add custom API routes in `src/app/api/custom/`
- Extend existing endpoints through middleware
- Maintain authentication and authorization

## Template Updates

### Update Process

1. Document current customizations
2. Create backup branch
3. Merge template updates
4. Resolve conflicts in extension points
5. Test thoroughly
6. Update documentation

### Version Tracking

- Track template version in `docs/template/template-version.md`
- Document customizations in `memory-bank/customizations.md`
- Maintain update history in `docs/template/template-updates.md`

## Support & Documentation

### Template Documentation

- `docs/template/` - Template-specific documentation
- `docs/auth/` - Authentication documentation
- `docs/api-documentation.md` - API reference
- `docs/development-guidelines.md` - Development guidelines

### Custom Documentation

- `docs/custom/` - Custom code documentation
- `memory-bank/` - Project context and decisions
- `docs/template-vs-custom.md` - Template vs custom separation

## License & Usage

This template is designed for building internal tools and team collaboration applications. Follow the template's architecture patterns and extension points for best results.

## Contributing

When contributing to this template:

1. Follow the established patterns
2. Maintain backward compatibility
3. Update documentation
4. Add comprehensive tests
5. Follow security best practices
