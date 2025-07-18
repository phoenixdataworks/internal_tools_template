# Internal Tools Template - Setup Guide

## Overview

This guide will help you set up the Internal Tools Template, a comprehensive platform for data warehouse integration and analytics built with Next.js, Supabase, and Azure Functions.

## Prerequisites

### Required Software
- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Git**: For version control
- **Supabase CLI**: For database management

### Accounts Required
- **Supabase**: Free tier account for database and authentication
- **Microsoft Azure**: For Azure Functions (optional)
- **Vercel**: For deployment (optional)

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd internal_tools_template
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_oauth_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_oauth_client_secret

# Azure Functions (Optional)
AZURE_FUNCTIONS_URL=your_azure_functions_url
AZURE_FUNCTIONS_KEY=your_azure_functions_key

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 4. Supabase Setup

#### Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

#### Initialize Local Development

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase in your project
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Start local development
supabase start
```

#### Apply Database Schema

```bash
# Apply the schema to your local database
supabase db reset

# Apply the schema to your remote database
supabase db push
```

### 5. OAuth Provider Setup

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`

#### Microsoft OAuth Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Register a new application
3. Configure redirect URIs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.com/auth/callback`
4. Note the Client ID and Client Secret

### 6. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Database Schema

The template includes the following core tables:

- **teams**: Team management and access control
- **users**: User profiles and authentication
- **team_members**: Team membership and roles
- **data_sources**: Data warehouse connections
- **analytics_queries**: Saved SQL queries
- **query_executions**: Query execution history
- **planning_models**: Forecasting and scenario models
- **model_executions**: Model execution history
- **audit_logs**: Comprehensive audit logging

## Supported Data Sources

The template supports connections to:

- **Snowflake**: Cloud data warehouse
- **BigQuery**: Google's data warehouse
- **Redshift**: AWS data warehouse
- **PostgreSQL**: Open-source database
- **MySQL**: Open-source database
- **SQL Server**: Microsoft database

## Development Workflow

### Local Development

1. **Start Supabase**: `supabase start`
2. **Start Next.js**: `npm run dev`
3. **Make Changes**: Edit code and see live updates
4. **Test**: Use the dashboard to test functionality

### Database Changes

1. **Edit Schema**: Modify files in `supabase/schemas/`
2. **Generate Migration**: `npm run supabase:migrate:diff`
3. **Apply Changes**: `supabase db push`

### Edge Functions

1. **Create Function**: Add new function in `supabase/functions/`
2. **Deploy**: `supabase functions deploy function-name`
3. **Test**: Use the Supabase dashboard or API

## Troubleshooting

### Common Issues

#### Authentication Problems
- Verify OAuth redirect URIs are correct
- Check environment variables are set
- Ensure Supabase project is properly configured

#### Database Connection Issues
- Verify Supabase is running locally: `supabase status`
- Check database URL and keys in environment
- Ensure schema is applied: `supabase db reset`

#### Build Errors
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

### Getting Help

- Check the [README](README_INTERNAL_TOOLS.md) for detailed documentation
- Review the [API Documentation](api-documentation.md)
- Check [Supabase Documentation](https://supabase.com/docs)

## Next Steps

After setup, you can:

1. **Configure Data Sources**: Add your data warehouse connections
2. **Create Queries**: Build analytics queries for your data
3. **Build Models**: Create forecasting and planning models
4. **Deploy**: Set up production deployment
5. **Customize**: Modify components for your specific needs

## Production Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Azure Functions Deployment

1. Create Azure Function App
2. Deploy functions: `func azure functionapp publish your-app-name`
3. Configure environment variables

### Database Migration

1. Apply schema to production: `supabase db push --db-url your-production-url`
2. Verify RLS policies are active
3. Test authentication flow
