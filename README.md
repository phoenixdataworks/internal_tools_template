# Internal Tools Template

A comprehensive internal tools platform built with Next.js, Supabase, and Azure Functions for data warehouse integration and analytics.

## Features

### 🔗 Data Source Management
- Connect to multiple data warehouse platforms (Snowflake, BigQuery, Redshift, PostgreSQL, MySQL, SQL Server)
- Secure connection configuration storage
- Connection testing and health monitoring
- Active/inactive status management

### 📊 Analytics Query Editor
- SQL query creation and management
- Parameterized queries support
- Query execution with real-time status tracking
- Query history and result caching
- Integration with multiple data sources

### 📈 Planning Model Builder
- Forecasting models (time series, trend analysis)
- Scenario analysis (what-if modeling)
- Budget planning and allocation
- KPI tracking and monitoring
- Model execution and result visualization

### 📋 Results Viewer
- Tabular data display for query results
- JSON result viewing for model outputs
- Export functionality (CSV, JSON)
- Execution history and performance metrics
- Error handling and status tracking

### 🔐 Authentication & Authorization
- Microsoft and Google OAuth integration
- Team-based access control
- Role-based permissions
- Secure API endpoints

## Architecture

### Frontend (Next.js App Router)
```
src/
├── app/                    # Next.js App Router pages
├── components/
│   ├── data-warehouse/     # Data source and query components
│   ├── planning/          # Planning model components
│   ├── dashboard/         # Main dashboard integration
│   └── common/            # Shared UI components
├── contexts/              # React contexts for state management
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries and API clients
└── types/                 # TypeScript type definitions
```

### Backend (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with OAuth providers
- **API**: Supabase Edge Functions for serverless API endpoints
- **Real-time**: WebSocket connections for live updates

### Azure Functions
- **Long-running processes**: Query execution, model training
- **Data processing**: ETL pipelines, data transformation
- **Scheduled tasks**: Automated reporting, data synchronization

## Database Schema

### Core Tables
- `data_sources`: Data warehouse connections
- `analytics_queries`: Saved SQL queries
- `query_executions`: Query execution history and results
- `planning_models`: Forecasting and scenario models
- `model_executions`: Model execution history and results
- `teams`: Team management and access control
- `users`: User profiles and authentication

### Security
- Row Level Security (RLS) policies for data isolation
- Encrypted connection configurations
- Audit logging for all operations
- Team-based access control

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- Azure Functions (optional for advanced features)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd internal_tools_template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following environment variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # OAuth Providers
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   MICROSOFT_CLIENT_ID=your_microsoft_client_id
   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
   
   # Azure Functions (optional)
   AZURE_FUNCTIONS_URL=your_azure_functions_url
   AZURE_FUNCTIONS_KEY=your_azure_functions_key
   ```

4. **Database Setup**
   ```bash
   # Run Supabase migrations
   npx supabase db push
   
   # Seed initial data (optional)
   npx supabase db reset
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

### Azure Functions Setup (Optional)

For advanced features like long-running queries and model training:

1. **Deploy Azure Functions**
   ```bash
   cd azure_functions
   npm install
   func azure functionapp publish your-function-app-name
   ```

2. **Configure Function URLs**
   Update environment variables with your Azure Functions endpoints.

## Usage

### Data Source Management

1. **Add Data Source**
   - Navigate to Data Sources tab
   - Click "Add Data Source"
   - Select data warehouse type
   - Enter connection configuration
   - Test connection before saving

2. **Connection Configuration Examples**
   ```json
   // Snowflake
   {
     "account": "company.snowflakecomputing.com",
     "warehouse": "COMPUTE_WH",
     "database": "ANALYTICS",
     "schema": "PUBLIC"
   }
   
   // BigQuery
   {
     "project_id": "analytics-project",
     "dataset": "analytics",
     "location": "US"
   }
   ```

### Analytics Queries

1. **Create Query**
   - Navigate to Analytics tab
   - Click "New Query"
   - Select data source
   - Write SQL query with optional parameters
   - Save and execute

2. **Parameterized Queries**
   ```sql
   SELECT * FROM sales 
   WHERE year = :year 
   AND region = :region
   ```
   
   Parameters:
   ```json
   {
     "year": 2024,
     "region": "North"
   }
   ```

### Planning Models

1. **Create Model**
   - Navigate to Planning tab
   - Click "New Model"
   - Select model type (forecast, scenario, budget, kpi)
   - Configure model parameters
   - Save and execute

2. **Model Types**
   - **Forecast**: Time series forecasting with confidence intervals
   - **Scenario**: What-if analysis with multiple scenarios
   - **Budget**: Budget planning and allocation models
   - **KPI**: Key performance indicator tracking

### Results Management

1. **View Results**
   - Navigate to Results tab
   - View recent executions
   - Click on execution to see detailed results
   - Export results in CSV or JSON format

2. **Execution History**
   - Track execution status (running, completed, failed)
   - Monitor execution time and performance
   - View error messages and debugging information

## API Endpoints

### Data Sources
- `GET /api/data-sources` - List data sources
- `POST /api/data-sources` - Create data source
- `PUT /api/data-sources/:id` - Update data source
- `DELETE /api/data-sources/:id` - Delete data source
- `POST /api/data-sources/:id/test` - Test connection

### Analytics Queries
- `GET /api/queries` - List queries
- `POST /api/queries` - Create query
- `PUT /api/queries/:id` - Update query
- `DELETE /api/queries/:id` - Delete query
- `POST /api/queries/:id/execute` - Execute query

### Planning Models
- `GET /api/models` - List models
- `POST /api/models` - Create model
- `PUT /api/models/:id` - Update model
- `DELETE /api/models/:id` - Delete model
- `POST /api/models/:id/execute` - Execute model

### Results
- `GET /api/executions` - List executions
- `GET /api/executions/:id` - Get execution details
- `GET /api/executions/:id/download` - Download results

## Security Considerations

### Data Protection
- All connection configurations are encrypted at rest
- Row Level Security (RLS) ensures data isolation between teams
- API endpoints require authentication and authorization
- Audit logging tracks all data access and modifications

### Access Control
- Team-based access control for all resources
- Role-based permissions for different user types
- OAuth integration with enterprise identity providers
- Session management and secure token handling

### Network Security
- HTTPS enforcement for all communications
- CORS configuration for API endpoints
- Rate limiting to prevent abuse
- Input validation and sanitization

## Deployment

### Production Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel**
   ```bash
   npx vercel --prod
   ```

3. **Configure Environment Variables**
   Set production environment variables in your deployment platform.

4. **Database Migration**
   ```bash
   npx supabase db push
   ```

### Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t internal-tools .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 internal-tools
   ```

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make changes and test**
4. **Commit changes**
   ```bash
   git commit -m "Add feature: description"
   ```
5. **Push and create pull request**

### Code Standards

- TypeScript for all new code
- ESLint and Prettier for code formatting
- Component-based architecture
- Proper error handling and loading states
- Comprehensive type definitions

## Support

For questions and support:
- Create an issue in the repository
- Check the documentation in `/docs`
- Review the memory bank in `/memory-bank`

## License

This project is licensed under the MIT License - see the LICENSE file for details. 