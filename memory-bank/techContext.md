# Technical Context - Internal Tools Template

## Architecture Overview

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript throughout
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context + React Query
- **Styling**: MUI's sx prop and theme system
- **Authentication**: Supabase Auth with OAuth providers

### Backend Stack
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth (Microsoft/Google OAuth)
- **API**: Supabase Edge Functions + Next.js API routes
- **Real-time**: Supabase Realtime subscriptions
- **Cloud Functions**: Azure Functions for long-running processes

### Database Architecture
- **Row Level Security (RLS)**: Team-based data isolation
- **Encryption**: Connection configurations encrypted at rest
- **Audit Logging**: Comprehensive tracking of all operations
- **Indexes**: Optimized for common query patterns
- **Triggers**: Automatic timestamp updates and audit logging

## Supabase Configuration

### Key System (Updated 2024)
- **Publishable Key**: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (replaces anon key)
- **Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` (server-side operations)
- **SDK Versions**: 
  - `@supabase/ssr`: 0.6.1
  - `@supabase/supabase-js`: 2.52.0

### Client Configuration
- **Browser Client**: Uses publishable key for client-side operations
- **Server Client**: Uses publishable key for server-side operations with RLS
- **Service Client**: Uses service role key for elevated privileges
- **Realtime Client**: Separate client instance for WebSocket connections

### Migration Notes
- Migrated from `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Updated all client creation functions in `src/lib/supabase/`
- Updated middleware authentication
- Updated documentation and environment variable examples
- No backward compatibility maintained - direct migration approach

## Key Technical Decisions

### Component Architecture
- **Modular Design**: Reusable components with clear separation
- **Type Safety**: Comprehensive TypeScript interfaces
- **Props Pattern**: Consistent prop interfaces across components
- **Error Boundaries**: Proper error handling and recovery
- **Loading States**: Skeleton screens and progress indicators

### Data Flow
- **React Query**: Server state management and caching
- **Optimistic Updates**: Immediate UI feedback
- **Error Handling**: Graceful degradation and user feedback
- **Real-time Updates**: WebSocket connections for live data

### Security Model
- **Team-based Access**: RLS policies for data isolation
- **OAuth Integration**: Enterprise identity providers
- **Encrypted Storage**: Sensitive data encryption
- **Audit Trail**: Complete operation logging
- **Input Validation**: Server-side validation and sanitization

## Database Schema Design

### Core Tables
```sql
-- Team-based access control
teams (id, name, slug, created_at, updated_at)
users (id, email, full_name, avatar_url, created_at, updated_at)
team_members (id, team_id, user_id, role, created_at)

-- Data warehouse integration
data_sources (id, team_id, name, type, connection_config, is_active, created_by)
analytics_queries (id, team_id, name, description, query_text, data_source_id, parameters)
query_executions (id, team_id, query_id, status, result_data, error_message, execution_time_ms)

-- Planning and forecasting
planning_models (id, team_id, name, description, model_type, model_config, created_by)
model_executions (id, team_id, model_id, status, result_data, error_message, execution_time_ms)

-- Audit and monitoring
audit_logs (id, team_id, user_id, action, table_name, record_id, old_values, new_values)
```

### Custom Types
```sql
-- Data source types
data_source_type: 'snowflake' | 'bigquery' | 'redshift' | 'postgres' | 'mysql' | 'sqlserver'

-- Execution status
query_execution_status: 'running' | 'completed' | 'failed'
model_execution_status: 'running' | 'completed' | 'failed'

-- Model types
model_type: 'forecast' | 'scenario' | 'budget' | 'kpi'
```

## API Design Patterns

### REST Endpoints
- **Data Sources**: CRUD operations with connection testing
- **Analytics Queries**: Create, execute, and manage SQL queries
- **Planning Models**: Build and execute forecasting models
- **Results**: View and export execution results
- **Teams**: Team management and access control

### Edge Functions
- **test-data-source**: Validate data warehouse connections
- **execute-query**: Run long-running SQL queries
- **execute-model**: Process planning models
- **export-results**: Generate CSV/JSON exports

### Real-time Features
- **Execution Status**: Live updates for query/model execution
- **Team Activity**: Real-time team member activity
- **System Alerts**: Notifications for system events

## Performance Considerations

### Database Optimization
- **Indexes**: Strategic indexing for common query patterns
- **Partitioning**: Large tables partitioned by date/team
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Optimized SQL queries with proper joins

### Frontend Performance
- **Code Splitting**: Dynamic imports for route-based splitting
- **Image Optimization**: Next.js Image component for optimized images
- **Caching**: React Query for intelligent data caching
- **Bundle Optimization**: Tree shaking and dead code elimination

### Scalability
- **Horizontal Scaling**: Stateless application design
- **Database Scaling**: Read replicas for query-heavy workloads
- **CDN**: Global content delivery for static assets
- **Caching Layers**: Redis for session and data caching

## Security Implementation

### Authentication Flow
1. **OAuth Redirect**: User redirected to Microsoft/Google
2. **Token Exchange**: Supabase handles OAuth token exchange
3. **Session Management**: JWT tokens with refresh mechanism
4. **Team Assignment**: User assigned to teams based on OAuth claims

### Authorization Model
- **Team-based Access**: All data scoped to user's teams
- **Role-based Permissions**: Admin/member roles within teams
- **Resource-level Security**: Individual resource access control
- **Audit Logging**: Complete audit trail for compliance

### Data Protection
- **Encryption at Rest**: Sensitive data encrypted in database
- **Encryption in Transit**: HTTPS for all communications
- **Input Validation**: Server-side validation and sanitization
- **SQL Injection Prevention**: Parameterized queries only

## Development Workflow

### Code Quality
- **TypeScript**: Strict type checking throughout
- **ESLint**: Code quality and consistency rules
- **Prettier**: Automated code formatting
- **Pre-commit Hooks**: Quality checks before commits

### Testing Strategy
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Critical user workflow testing
- **Performance Tests**: Load testing for scalability

### Deployment Pipeline
- **CI/CD**: Automated testing and deployment
- **Environment Management**: Separate dev/staging/prod environments
- **Database Migrations**: Automated schema updates
- **Rollback Strategy**: Quick rollback capabilities

## Monitoring and Observability

### Application Monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Monitoring**: Response time and throughput tracking
- **User Analytics**: Usage patterns and feature adoption
- **Health Checks**: System health monitoring

### Database Monitoring
- **Query Performance**: Slow query identification and optimization
- **Connection Monitoring**: Database connection pool health
- **Storage Monitoring**: Database size and growth tracking
- **Backup Monitoring**: Automated backup verification

### Infrastructure Monitoring
- **Resource Utilization**: CPU, memory, and storage monitoring
- **Network Monitoring**: Latency and bandwidth tracking
- **Security Monitoring**: Intrusion detection and alerting
- **Compliance Monitoring**: Audit log monitoring and reporting
