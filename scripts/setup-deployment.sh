#!/bin/bash

# Deployment Setup Script for Internal Tools Template
# This script helps set up the initial deployment configuration

set -e

echo "🚀 Internal Tools Template - Deployment Setup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 22+"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm"
        exit 1
    fi
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git"
        exit 1
    fi
    
    if ! command -v supabase &> /dev/null; then
        print_warning "Supabase CLI is not installed. Installing..."
        npm install -g supabase
    fi
    
    print_success "All requirements are met!"
}

# Setup environment variables
setup_env() {
    print_status "Setting up environment variables..."
    
    if [ ! -f .env.local ]; then
        cat > .env.local << EOF
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

# Development flags
NODE_ENV=development
EOF
        print_success "Created .env.local file"
        print_warning "Please update .env.local with your actual values"
    else
        print_warning ".env.local already exists. Please verify your values."
    fi
}

# Setup GitHub secrets instructions
setup_github_secrets() {
    print_status "Setting up GitHub secrets instructions..."
    
    cat > GITHUB_SECRETS.md << EOF
# GitHub Secrets Setup

Add the following secrets to your GitHub repository:

## Required Secrets

### Vercel Deployment
- \`VERCEL_TOKEN\`: Your Vercel API token
- \`VERCEL_ORG_ID\`: Your Vercel organization ID
- \`VERCEL_PROJECT_ID\`: Your Vercel project ID

### Supabase
- \`SUPABASE_PROJECT_REF\`: Your Supabase project reference
- \`SUPABASE_ACCESS_TOKEN\`: Your Supabase access token
- \`NEXT_PUBLIC_SUPABASE_URL\`: Your Supabase project URL
- \`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY\`: Your Supabase anon key

### Security (Optional)
- \`SNYK_TOKEN\`: Your Snyk API token for vulnerability scanning

## How to add secrets:

1. Go to your GitHub repository
2. Click on "Settings"
3. Click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the exact name above

## Getting the values:

### Vercel
1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Create a new token
3. Get org and project IDs from your Vercel dashboard

### Supabase
1. Go to your Supabase project dashboard
2. Go to Settings → API
3. Copy the project reference and access token
4. Copy the project URL and anon key
EOF
    
    print_success "Created GITHUB_SECRETS.md with setup instructions"
}

# Setup local development
setup_local_dev() {
    print_status "Setting up local development..."
    
    # Install dependencies
    npm install
    
    # Start Supabase locally
    print_status "Starting Supabase locally..."
    supabase start
    
    # Apply migrations
    print_status "Applying database migrations..."
    supabase db push
    
    # Generate types
    print_status "Generating TypeScript types..."
    npm run supabase:types
    
    print_success "Local development setup complete!"
}

# Setup Vercel deployment
setup_vercel() {
    print_status "Setting up Vercel deployment..."
    
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI is not installed. Installing..."
        npm install -g vercel
    fi
    
    print_status "Please run the following commands to deploy to Vercel:"
    echo "1. vercel login"
    echo "2. vercel --prod"
    echo ""
    print_warning "Make sure to set up your environment variables in Vercel dashboard"
}

# Main setup function
main() {
    echo ""
    print_status "Starting deployment setup..."
    
    check_requirements
    setup_env
    setup_github_secrets
    setup_local_dev
    
    echo ""
    print_success "Setup complete! Next steps:"
    echo ""
    echo "1. Update .env.local with your actual values"
    echo "2. Set up GitHub secrets (see GITHUB_SECRETS.md)"
    echo "3. Push your code to GitHub"
    echo "4. Deploy to Vercel: vercel --prod"
    echo "5. Configure your domain and OAuth providers"
    echo ""
    echo "For detailed instructions, see docs/template/deployment-guide.md"
    echo ""
}

# Run main function
main "$@" 