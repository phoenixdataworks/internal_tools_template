# Internal Tools Template - Setup Guide

## Prerequisites

Before setting up the Internal Tools Template, ensure you have the following installed:

- **Node.js** 22+ ([Download](https://nodejs.org/))
- **Git** ([Download](https://git-scm.com/))
- **Supabase CLI** ([Install Guide](https://supabase.com/docs/guides/cli))
- **Docker** (for local development) ([Download](https://www.docker.com/))

## Quick Start

### 1. Clone the Template

```bash
# Clone the template repository
git clone <template-repo-url>
cd internal_tools_template

# Install dependencies
npm install
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OAuth Providers (Optional)
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### 3. Supabase Setup

#### Option A: Local Development

```bash
# Start Supabase locally
npm run supabase:start

# Run migrations
npm run supabase:migrate:diff

# Generate types
npm run supabase:types:generate
```

#### Option B: Cloud Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project URL and keys from the project settings
3. Update your `.env.local` file with the cloud credentials
4. Run migrations:

```bash
# Link to your cloud project
npx supabase link --project-ref your-project-ref

# Push migrations
npm run supabase:migrate:push
```

### 4. Start Development Server

```bash
# Start the development server
npm run dev
```

Your application will be available at `http://localhost:3000`

## Detailed Setup

### Supabase Project Configuration

#### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: Your project name
   - **Database Password**: Strong password
   - **Region**: Choose closest region
5. Click "Create new project"

#### 2. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Configure your site URL:
   - **Site URL**: `http://localhost:3000` (development)
   - **Redirect URLs**: Add your production URL when ready
3. Configure email templates (optional)

#### 3. Set Up OAuth Providers (Optional)

##### Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**
4. Configure the app:
   - **Name**: Your app name
   - **Supported account types**: Choose appropriate option
   - **Redirect URI**: `https://your-project.supabase.co/auth/v1/callback`
5. Note the **Application (client) ID**
6. Go to **Certificates & secrets** → **New client secret**
7. Copy the secret value
8. Update your `.env.local`:

```bash
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
```

##### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create credentials** → **OAuth 2.0 Client IDs**
5. Configure the OAuth consent screen
6. Set up OAuth 2.0 client:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://your-project.supabase.co/auth/v1/callback`
7. Copy the client ID and secret
8. Update your `.env.local`:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Database Schema Setup

The template includes a complete database schema. To set it up:

```bash
# Apply the schema
npm run supabase:migrate:push

# Verify the setup
npm run supabase:db:reset
```

#### Schema Overview

The template provides these core tables:

- **profiles**: User profiles and authentication data
- **teams**: Team information for multi-tenancy
- **team_members**: Team membership with roles
- **team_join_requests**: Join request workflow
- **chat_threads**: Team conversations
- **chat_comments**: Conversation messages
- **chat_reactions**: Message reactions
- **chat_read_receipts**: Read status tracking
- **notifications**: User notifications

### Development Workflow

#### 1. Local Development

```bash
# Start all services
npm run dev

# Start only Supabase (if needed separately)
npm run supabase:start

# Stop Supabase
npm run supabase:stop
```

#### 2. Database Management

```bash
# Create a new migration
npm run supabase:migrate:new migration_name

# Apply migrations
npm run supabase:migrate:push

# Reset database (local only)
npm run supabase:db:reset

# Generate TypeScript types
npm run supabase:types:generate
```

#### 3. Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- path/to/test-file.test.ts

# Run E2E tests
npm run test:e2e
```

### Custom Development

#### 1. Adding Custom Features

Create custom features in the designated directories:

```bash
# Custom components
src/components/custom/

# Custom API routes
src/app/api/custom/

# Custom business logic
src/features/

# Custom services
src/services/

# Custom types
src/types/custom/
```

#### 2. Database Extensions

Add custom tables using migrations:

```bash
# Create new migration
npm run supabase:migrate:new add_custom_feature

# Edit the migration file
# supabase/migrations/YYYYMMDDHHMMSS_add_custom_feature.sql

# Apply the migration
npm run supabase:migrate:push
```

#### 3. Environment-Specific Configuration

Create environment-specific files:

```bash
# Development
.env.local

# Production
.env.production

# Testing
.env.test
```

## Production Deployment

### 1. Vercel Deployment

#### Prerequisites

- Vercel account
- Connected GitHub repository

#### Setup Steps

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Configure build settings

2. **Environment Variables**
   - Add all environment variables from `.env.local`
   - Update URLs for production

3. **Deploy**
   - Push to main branch
   - Vercel will auto-deploy

#### Vercel Configuration

Create `vercel.json` in the root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

### 2. Supabase Production

#### Database Migration

```bash
# Link to production project
npx supabase link --project-ref your-production-ref

# Push migrations
npm run supabase:migrate:push

# Verify schema
npm run supabase:db:diff
```

#### Environment Variables

Update production environment variables:

```bash
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# Production URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXTAUTH_URL=https://your-domain.com
```

### 3. Domain Configuration

#### Custom Domain Setup

1. **Vercel Domain**
   - Go to Vercel project settings
   - Add custom domain
   - Configure DNS records

2. **Supabase Domain**
   - Update redirect URLs in Supabase Auth settings
   - Add custom domain to allowed origins

3. **SSL Certificate**
   - Vercel provides automatic SSL
   - Ensure HTTPS is enforced

## Troubleshooting

### Common Issues

#### 1. Supabase Connection Issues

```bash
# Check Supabase status
npm run supabase:status

# Restart Supabase
npm run supabase:stop
npm run supabase:start

# Reset database
npm run supabase:db:reset
```

#### 2. Environment Variables

```bash
# Verify environment variables are loaded
npm run env:check

# Check for missing variables
npm run env:validate
```

#### 3. Database Migration Issues

```bash
# Check migration status
npm run supabase:migrate:status

# Reset migrations (local only)
npm run supabase:migrate:reset

# Generate new migration
npm run supabase:migrate:diff
```

#### 4. Type Generation Issues

```bash
# Regenerate types
npm run supabase:types:generate

# Check type generation
npm run supabase:types:check
```

### Performance Issues

#### 1. Slow Development Server

```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules
npm install

# Restart development server
npm run dev
```

#### 2. Database Performance

```bash
# Check database performance
npm run supabase:db:analyze

# Optimize queries
npm run supabase:db:optimize
```

## Security Checklist

### Development Security

- [ ] **Environment Variables**: Never commit secrets to version control
- [ ] **Database Access**: Use service role key only on server
- [ ] **OAuth Configuration**: Secure client secrets
- [ ] **CORS Settings**: Configure allowed origins
- [ ] **Rate Limiting**: Implement API rate limiting

### Production Security

- [ ] **HTTPS**: Enforce HTTPS in production
- [ ] **Security Headers**: Configure security headers
- [ ] **Database Backups**: Set up regular backups
- [ ] **Monitoring**: Implement security monitoring
- [ ] **Access Control**: Review and audit access

## Maintenance

### Regular Tasks

#### Daily

- [ ] Check application logs
- [ ] Monitor error rates
- [ ] Verify database connectivity

#### Weekly

- [ ] Review security logs
- [ ] Update dependencies
- [ ] Backup verification

#### Monthly

- [ ] Performance review
- [ ] Security audit
- [ ] Database maintenance

### Updates

#### Template Updates

```bash
# Create backup branch
git checkout -b backup-before-update

# Pull template updates
git pull origin main

# Resolve conflicts
# Test thoroughly
# Deploy updates
```

#### Dependency Updates

```bash
# Check for updates
npm outdated

# Update dependencies
npm update

# Update major versions
npm audit fix

# Test after updates
npm test
```

## Support

### Documentation

- [Template Documentation](docs/template/)
- [API Documentation](docs/api-documentation.md)
- [Database Guide](docs/database-guide.md)
- [Development Guidelines](docs/development-guidelines.md)

### Community

- [GitHub Issues](https://github.com/your-repo/issues)
- [Discussions](https://github.com/your-repo/discussions)
- [Documentation](https://your-docs-site.com)

### Getting Help

1. Check the documentation first
2. Search existing issues
3. Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Environment details
   - Error messages/logs

This setup guide provides comprehensive instructions for getting started with the Internal Tools Template and maintaining it in production.
