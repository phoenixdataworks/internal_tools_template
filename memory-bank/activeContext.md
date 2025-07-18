# Active Context - Internal Tools Template

## Project Overview
This is an internal tools template built with Next.js, Supabase, and Azure Functions, focused on data warehouse integration and analytics. The template provides a comprehensive platform for managing data sources, running analytics queries, and executing planning models.

## Current State
- **Status**: Template transformation complete
- **Architecture**: Next.js App Router + Supabase + Azure Functions
- **Focus**: Data warehouse integration and analytics workflows
- **Authentication**: Microsoft and Google OAuth
- **Database**: PostgreSQL with Row Level Security (RLS)

## Key Components

### Frontend Components
- `DataSourceManager`: Manage data warehouse connections
- `QueryEditor`: Create and execute SQL queries
- `PlanningModelBuilder`: Build forecasting and scenario models
- `ResultsViewer`: Display query and model results
- `InternalToolsDashboard`: Main dashboard integration

### Database Schema
- `data_sources`: Data warehouse connections with encrypted configs
- `analytics_queries`: Saved SQL queries with parameters
- `query_executions`: Query execution history and results
- `planning_models`: Forecasting and scenario analysis models
- `model_executions`: Model execution history and results
- `teams`, `users`, `team_members`: Team-based access control
- `audit_logs`: Comprehensive audit logging

### Edge Functions
- `test-data-source`: Test data source connections
- CORS handling for cross-origin requests

## Supported Data Sources
- Snowflake
- BigQuery
- Redshift
- PostgreSQL
- MySQL
- SQL Server

## Planning Model Types
- Forecast: Time series forecasting with confidence intervals
- Scenario: What-if analysis with multiple scenarios
- Budget: Budget planning and allocation models
- KPI: Key performance indicator tracking

## Security Features
- Row Level Security (RLS) for data isolation
- Encrypted connection configurations
- Team-based access control
- Comprehensive audit logging
- OAuth authentication with enterprise providers

## Development Status
- ✅ Core component architecture complete
- ✅ Database schema with RLS policies
- ✅ Example edge function for data source testing
- ✅ Comprehensive documentation
- 🔄 API endpoints (to be implemented)
- 🔄 Azure Functions integration (to be implemented)
- 🔄 Real-time updates (to be implemented)

## Next Steps
1. Implement REST API endpoints for all CRUD operations
2. Add Azure Functions integration for long-running processes
3. Implement real-time updates via WebSocket connections
4. Add data visualization components
5. Set up CI/CD pipeline and production deployment

## File Structure
```
src/
├── components/
│   ├── data-warehouse/     # Data source and query components
│   ├── planning/          # Planning model components
│   └── dashboard/         # Main dashboard integration
├── app/(authenticated)/   # Next.js App Router pages
└── supabase/
    ├── schemas/           # Database schema definitions
    └── functions/         # Edge functions
```

## Technical Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, MUI v5
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Cloud**: Azure Functions for long-running processes
- **Authentication**: Supabase Auth with OAuth providers
- **Database**: PostgreSQL with RLS and audit logging
