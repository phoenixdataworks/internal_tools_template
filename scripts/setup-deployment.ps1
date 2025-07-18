# Deployment Setup Script for Internal Tools Template (PowerShell)
# This script helps set up the initial deployment configuration

param(
    [switch]$SkipLocalDev
)

Write-Host "🚀 Internal Tools Template - Deployment Setup" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if required tools are installed
function Test-Requirements {
    Write-Status "Checking requirements..."
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed. Please install Node.js 22+"
        exit 1
    }
    
    # Check npm
    try {
        $npmVersion = npm --version
        Write-Success "npm found: $npmVersion"
    }
    catch {
        Write-Error "npm is not installed. Please install npm"
        exit 1
    }
    
    # Check Git
    try {
        $gitVersion = git --version
        Write-Success "Git found: $gitVersion"
    }
    catch {
        Write-Error "Git is not installed. Please install Git"
        exit 1
    }
    
    # Check Supabase CLI
    try {
        $supabaseVersion = supabase --version
        Write-Success "Supabase CLI found: $supabaseVersion"
    }
    catch {
        Write-Warning "Supabase CLI is not installed. Installing..."
        npm install -g supabase
    }
    
    Write-Success "All requirements are met!"
}

# Setup environment variables
function Set-EnvironmentVariables {
    Write-Status "Setting up environment variables..."
    
    if (-not (Test-Path ".env.local")) {
        $envContent = @"
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
"@
        
        $envContent | Out-File -FilePath ".env.local" -Encoding UTF8
        Write-Success "Created .env.local file"
        Write-Warning "Please update .env.local with your actual values"
    }
    else {
        Write-Warning ".env.local already exists. Please verify your values."
    }
}

# Setup GitHub secrets instructions
function Set-GitHubSecretsInstructions {
    Write-Status "Setting up GitHub secrets instructions..."
    
    $secretsContent = @"
# GitHub Secrets Setup

Add the following secrets to your GitHub repository:

## Required Secrets

### Vercel Deployment
- `VERCEL_TOKEN`: Your Vercel API token
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID

### Supabase
- `SUPABASE_PROJECT_REF`: Your Supabase project reference
- `SUPABASE_ACCESS_TOKEN`: Your Supabase access token
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase anon key

### Security (Optional)
- `SNYK_TOKEN`: Your Snyk API token for vulnerability scanning

## How to add secrets:

1. Go to your GitHub repository
2. Click on "Settings"
3. Click on "Secrets and variables" → "Actions"
4. Click "New repository secret"
5. Add each secret with the exact name above

## Getting the values:

### Vercel
1. Go to https://vercel.com/account/tokens
2. Create a new token
3. Get org and project IDs from your Vercel dashboard

### Supabase
1. Go to your Supabase project dashboard
2. Go to Settings → API
3. Copy the project reference and access token
4. Copy the project URL and anon key
"@
    
    $secretsContent | Out-File -FilePath "GITHUB_SECRETS.md" -Encoding UTF8
    Write-Success "Created GITHUB_SECRETS.md with setup instructions"
}

# Setup local development
function Set-LocalDevelopment {
    if ($SkipLocalDev) {
        Write-Warning "Skipping local development setup"
        return
    }
    
    Write-Status "Setting up local development..."
    
    # Install dependencies
    Write-Status "Installing dependencies..."
    npm install
    
    # Start Supabase locally
    Write-Status "Starting Supabase locally..."
    try {
        supabase start
    }
    catch {
        Write-Warning "Failed to start Supabase locally. You may need to set up Docker first."
        Write-Warning "See: https://supabase.com/docs/guides/cli/local-development"
    }
    
    # Apply migrations
    Write-Status "Applying database migrations..."
    try {
        supabase db push
    }
    catch {
        Write-Warning "Failed to apply migrations. Make sure Supabase is running."
    }
    
    # Generate types
    Write-Status "Generating TypeScript types..."
    try {
        npm run supabase:types
    }
    catch {
        Write-Warning "Failed to generate types. Make sure Supabase is running."
    }
    
    Write-Success "Local development setup complete!"
}

# Setup Vercel deployment
function Set-VercelDeployment {
    Write-Status "Setting up Vercel deployment..."
    
    try {
        $vercelVersion = vercel --version
        Write-Success "Vercel CLI found: $vercelVersion"
    }
    catch {
        Write-Warning "Vercel CLI is not installed. Installing..."
        npm install -g vercel
    }
    
    Write-Status "Please run the following commands to deploy to Vercel:"
    Write-Host "1. vercel login" -ForegroundColor Yellow
    Write-Host "2. vercel --prod" -ForegroundColor Yellow
    Write-Host ""
    Write-Warning "Make sure to set up your environment variables in Vercel dashboard"
}

# Main setup function
function Start-Setup {
    Write-Host ""
    Write-Status "Starting deployment setup..."
    
    Test-Requirements
    Set-EnvironmentVariables
    Set-GitHubSecretsInstructions
    Set-LocalDevelopment
    Set-VercelDeployment
    
    Write-Host ""
    Write-Success "Setup complete! Next steps:"
    Write-Host ""
    Write-Host "1. Update .env.local with your actual values" -ForegroundColor Yellow
    Write-Host "2. Set up GitHub secrets (see GITHUB_SECRETS.md)" -ForegroundColor Yellow
    Write-Host "3. Push your code to GitHub" -ForegroundColor Yellow
    Write-Host "4. Deploy to Vercel: vercel --prod" -ForegroundColor Yellow
    Write-Host "5. Configure your domain and OAuth providers" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "For detailed instructions, see docs/template/deployment-guide.md" -ForegroundColor Cyan
    Write-Host ""
}

# Run main setup function
Start-Setup 