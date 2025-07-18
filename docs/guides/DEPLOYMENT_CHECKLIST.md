# Deployment Checklist

This checklist helps ensure a successful deployment of the internal tools template.

## Pre-Deployment Setup

### ✅ Prerequisites

- [ ] Node.js 22+ installed
- [ ] Git installed
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] GitHub account with repository access
- [ ] Supabase account
- [ ] Vercel account

### ✅ Local Development

- [ ] Run deployment setup: `npm run deploy:setup`
- [ ] Update `.env.local` with actual values
- [ ] Test local development: `npm run dev`
- [ ] Verify Supabase connection
- [ ] Test authentication flow

## Supabase Setup

### ✅ Project Creation

- [ ] Create Supabase project
- [ ] Note project URL and keys
- [ ] Choose appropriate region
- [ ] Set secure database password

### ✅ Database Configuration

- [ ] Link local project: `supabase link --project-ref your-ref`
- [ ] Apply migrations: `npm run deploy:db:push`
- [ ] Generate types: `npm run deploy:db:types`
- [ ] Verify tables created in dashboard
- [ ] Check RLS policies applied

### ✅ Authentication Setup

- [ ] Configure OAuth providers (Azure AD/Google)
- [ ] Set redirect URLs
- [ ] Test OAuth flow
- [ ] Verify user creation works

## Vercel Setup

### ✅ Project Configuration

- [ ] Import GitHub repository to Vercel
- [ ] Configure build settings
- [ ] Set environment variables
- [ ] Configure custom domain (if needed)

### ✅ Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `AZURE_CLIENT_ID`
- [ ] `AZURE_CLIENT_SECRET`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `INTERNAL_HMAC_SECRET`

## GitHub Setup

### ✅ Repository Configuration

- [ ] Push code to GitHub
- [ ] Set up branch protection rules
- [ ] Configure required status checks

### ✅ GitHub Secrets

- [ ] `VERCEL_TOKEN`
- [ ] `VERCEL_ORG_ID`
- [ ] `VERCEL_PROJECT_ID`
- [ ] `SUPABASE_PROJECT_REF`
- [ ] `SUPABASE_ACCESS_TOKEN`
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- [ ] `SNYK_TOKEN` (optional)

## Initial Deployment

### ✅ First Deployment

- [ ] Deploy to Vercel: `npm run deploy:vercel`
- [ ] Verify deployment success
- [ ] Check build logs for errors
- [ ] Test application functionality

### ✅ Domain Configuration

- [ ] Update OAuth redirect URLs with production domain
- [ ] Configure custom domain (if needed)
- [ ] Set up SSL certificates
- [ ] Test HTTPS redirects

## Post-Deployment Verification

### ✅ Functionality Testing

- [ ] Test user registration/login
- [ ] Test OAuth authentication
- [ ] Test team creation and management
- [ ] Test chat functionality
- [ ] Test notification system
- [ ] Test API endpoints

### ✅ Security Verification

- [ ] Verify HTTPS is enforced
- [ ] Check security headers
- [ ] Test RLS policies
- [ ] Verify OAuth state validation
- [ ] Check for exposed secrets

### ✅ Performance Testing

- [ ] Check Core Web Vitals
- [ ] Test page load times
- [ ] Verify real-time functionality
- [ ] Test mobile responsiveness

## Monitoring Setup

### ✅ Error Tracking

- [ ] Set up Sentry (optional)
- [ ] Configure error notifications
- [ ] Test error reporting

### ✅ Analytics

- [ ] Set up Google Analytics
- [ ] Configure Vercel Analytics
- [ ] Set up performance monitoring

### ✅ Database Monitoring

- [ ] Monitor query performance
- [ ] Set up connection pool alerts
- [ ] Configure backup monitoring

## Documentation

### ✅ Update Documentation

- [ ] Update deployment guide with custom values
- [ ] Document custom configurations
- [ ] Update team onboarding docs
- [ ] Create runbook for common issues

### ✅ Team Access

- [ ] Grant team access to Vercel
- [ ] Grant team access to Supabase
- [ ] Set up team notifications
- [ ] Create deployment runbook

## Maintenance

### ✅ Regular Tasks

- [ ] Monitor application performance
- [ ] Review security logs
- [ ] Update dependencies
- [ ] Backup database regularly
- [ ] Review cost optimization

### ✅ Update Process

- [ ] Test template updates locally
- [ ] Follow template update process
- [ ] Verify custom code compatibility
- [ ] Update documentation

## Troubleshooting

### Common Issues

- [ ] Build failures - check environment variables
- [ ] Database connection issues - verify Supabase status
- [ ] OAuth issues - check redirect URLs
- [ ] Type generation failures - verify Supabase CLI

### Support Resources

- [ ] Vercel documentation
- [ ] Supabase documentation
- [ ] GitHub Actions documentation
- [ ] Template documentation

## Success Criteria

### ✅ Deployment Success

- [ ] Application accessible via production URL
- [ ] All core features working
- [ ] Authentication flow complete
- [ ] Team management functional
- [ ] Real-time features working
- [ ] API endpoints responding
- [ ] Database operations successful
- [ ] Security measures in place
- [ ] Performance metrics acceptable
- [ ] Monitoring configured

### ✅ Team Ready

- [ ] Team members can access application
- [ ] Documentation is complete
- [ ] Support process established
- [ ] Maintenance procedures defined

---

**Note**: This checklist should be completed for each environment (staging, production) and updated as the application evolves.
