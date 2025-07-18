# Deployment Guide - Vercel & Supabase

This guide provides comprehensive deployment instructions for the internal tools template using Vercel for frontend hosting and Supabase for backend services.

## Prerequisites

### Required Accounts

- **Vercel Account**: [vercel.com](https://vercel.com)
- **Supabase Account**: [supabase.com](https://supabase.com)
- **GitHub Account**: [github.com](https://github.com)

### Required Tools

- **Node.js**: 22+ (for local development)
- **Git**: Latest version
- **Supabase CLI**: `npm install -g supabase`

## Supabase Setup

### 1. Create Supabase Project

1. **Sign up/Login** to [supabase.com](https://supabase.com)
2. **Create New Project**:
   - Click "New Project"
   - Choose organization
   - Enter project name (e.g., `internal-tools-template`)
   - Enter database password (save this securely)
   - Choose region closest to your users
   - Click "Create new project"

### 2. Configure Environment Variables

1. **Get Project Credentials**:
   - Go to Project Settings → API
   - Copy the following values:
     - Project URL
     - Anon/Public Key
     - Service Role Key

2. **Set Environment Variables**:
   ```bash
   # Local development (.env.local)
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 3. Database Setup

1. **Apply Migrations**:

   ```bash
   # Link to your Supabase project
   supabase link --project-ref your-project-ref

   # Apply migrations
   supabase db push

   # Generate TypeScript types
   npm run supabase:types
   ```

2. **Verify Setup**:
   - Check Tables in Supabase Dashboard
   - Verify RLS policies are applied
   - Test authentication flow

### 4. Configure Authentication

1. **OAuth Providers** (Azure AD):

   ```bash
   # Add to environment variables
   AZURE_CLIENT_ID=your-azure-client-id
   AZURE_CLIENT_SECRET=your-azure-client-secret
   ```

2. **OAuth Providers** (Google Workspace):

   ```bash
   # Add to environment variables
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. **Configure in Supabase Dashboard**:
   - Go to Authentication → Providers
   - Enable and configure Azure AD
   - Enable and configure Google
   - Set redirect URLs

## Vercel Setup

### 1. Connect GitHub Repository

1. **Push to GitHub**:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository

### 2. Configure Build Settings

1. **Framework Preset**: Next.js
2. **Root Directory**: `./` (default)
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next` (default)
5. **Install Command**: `npm install`

### 3. Environment Variables

Add these environment variables in Vercel:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OAuth Configuration
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Internal API Authentication
INTERNAL_HMAC_SECRET=your-hmac-secret-key

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
NEXT_PUBLIC_CLARITY_ID=your-microsoft-clarity-id
```

### 4. Domain Configuration

1. **Custom Domain** (Optional):
   - Go to Project Settings → Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **Update OAuth Redirect URLs**:
   - Update Supabase OAuth settings with your domain
   - Add both `https://your-domain.vercel.app` and `https://your-custom-domain.com`

## GitHub Workflows

### 1. CI/CD Pipeline

Create `.github/workflows/ci.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linting
        run: npm run lint

      - name: Run type checking
        run: npx tsc --noEmit

      - name: Run tests
        run: npm run test

      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. Database Migration Workflow

Create `.github/workflows/db-migrate.yml`:

```yaml
name: Database Migration

on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  migrate:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install Supabase CLI
        run: npm install -g supabase

      - name: Deploy migrations
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Generate types
        run: |
          supabase gen types typescript --project-id ${{ secrets.SUPABASE_PROJECT_REF }} > src/types/supabase.ts
```

### 3. Security Scanning Workflow

Create `.github/workflows/security.yml`:

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2 AM

jobs:
  security:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Run Snyk to check for vulnerabilities
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
```

## Environment Setup

### 1. Development Environment

Create `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-role-key

# OAuth (use test credentials)
AZURE_CLIENT_ID=your-test-azure-client-id
AZURE_CLIENT_SECRET=your-test-azure-client-secret
GOOGLE_CLIENT_ID=your-test-google-client-id
GOOGLE_CLIENT_SECRET=your-test-google-client-secret

# Internal API
INTERNAL_HMAC_SECRET=your-local-hmac-secret

# Development flags
NODE_ENV=development
```

### 2. Staging Environment

Create `.env.staging`:

```bash
# Supabase (staging project)
NEXT_PUBLIC_SUPABASE_URL=your-staging-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-staging-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key

# OAuth (staging credentials)
AZURE_CLIENT_ID=your-staging-azure-client-id
AZURE_CLIENT_SECRET=your-staging-azure-client-secret
GOOGLE_CLIENT_ID=your-staging-google-client-id
GOOGLE_CLIENT_SECRET=your-staging-google-client-secret

# Internal API
INTERNAL_HMAC_SECRET=your-staging-hmac-secret

# Environment
NODE_ENV=staging
```

### 3. Production Environment

Environment variables are set in Vercel dashboard:

```bash
# Supabase (production project)
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-production-service-role-key

# OAuth (production credentials)
AZURE_CLIENT_ID=your-production-azure-client-id
AZURE_CLIENT_SECRET=your-production-azure-client-secret
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret

# Internal API
INTERNAL_HMAC_SECRET=your-production-hmac-secret

# Environment
NODE_ENV=production
```

## Deployment Process

### 1. Initial Deployment

1. **Setup Supabase**:

   ```bash
   # Create and configure Supabase project
   # Apply migrations
   supabase db push
   ```

2. **Setup Vercel**:

   ```bash
   # Deploy to Vercel
   vercel --prod
   ```

3. **Configure Domains**:
   - Update OAuth redirect URLs
   - Configure custom domain (if needed)

### 2. Continuous Deployment

1. **Push to Main Branch**:

   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. **Automatic Deployment**:
   - GitHub Actions run tests
   - Vercel automatically deploys
   - Database migrations apply (if needed)

### 3. Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy with specific environment
vercel --env production
```

## Monitoring and Maintenance

### 1. Vercel Monitoring

1. **Performance Monitoring**:
   - Vercel Analytics
   - Core Web Vitals
   - Function execution times

2. **Error Monitoring**:
   - Vercel Error Tracking
   - Function error logs
   - Build error notifications

### 2. Supabase Monitoring

1. **Database Monitoring**:
   - Query performance
   - Connection pool usage
   - Storage usage

2. **Authentication Monitoring**:
   - Login attempts
   - OAuth provider status
   - User registration rates

### 3. Application Monitoring

1. **Error Tracking**:

   ```typescript
   // Add to your app
   import * as Sentry from '@sentry/nextjs';

   Sentry.init({
     dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
     environment: process.env.NODE_ENV,
   });
   ```

2. **Performance Monitoring**:

   ```typescript
   // Add to your app
   import { Analytics } from '@vercel/analytics/react';

   export default function App({ Component, pageProps }) {
     return (
       <>
         <Component {...pageProps} />
         <Analytics />
       </>
     );
   }
   ```

## Security Best Practices

### 1. Environment Variables

- **Never commit secrets** to version control
- **Use different secrets** for each environment
- **Rotate secrets** regularly
- **Use Vercel's built-in encryption**

### 2. Database Security

- **Enable RLS** on all tables
- **Use service role key** only for admin operations
- **Monitor access logs** regularly
- **Backup data** regularly

### 3. API Security

- **Validate all inputs** with Zod schemas
- **Use HMAC authentication** for internal APIs
- **Rate limit** API endpoints
- **Monitor API usage** for anomalies

### 4. Authentication Security

- **Use HTTPS** for all OAuth redirects
- **Validate OAuth state** parameters
- **Implement proper session management**
- **Monitor authentication logs**

## Troubleshooting

### Common Issues

1. **Build Failures**:

   ```bash
   # Check build logs
   vercel logs

   # Test build locally
   npm run build
   ```

2. **Database Connection Issues**:

   ```bash
   # Check Supabase status
   supabase status

   # Test connection
   supabase db ping
   ```

3. **OAuth Issues**:
   - Verify redirect URLs in Supabase
   - Check OAuth provider settings
   - Validate environment variables

4. **Environment Variable Issues**:

   ```bash
   # Check Vercel environment variables
   vercel env ls

   # Pull environment variables
   vercel env pull .env.local
   ```

### Support Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
- **GitHub Actions Documentation**: [docs.github.com/en/actions](https://docs.github.com/en/actions)

## Cost Optimization

### 1. Vercel Optimization

- **Use Edge Functions** for simple operations
- **Optimize bundle size** with code splitting
- **Use CDN caching** for static assets
- **Monitor function execution** times

### 2. Supabase Optimization

- **Use connection pooling** efficiently
- **Optimize database queries** with indexes
- **Monitor storage usage** and clean up
- **Use read replicas** for heavy queries

### 3. Monitoring Costs

- **Set up billing alerts** in both platforms
- **Monitor usage patterns** regularly
- **Optimize based on usage** data
- **Consider reserved capacity** for predictable loads

This deployment guide provides a comprehensive approach to deploying the internal tools template with proper CI/CD, monitoring, and security practices.
