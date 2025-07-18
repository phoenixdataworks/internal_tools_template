# Internal Tools Template

A lightweight, production-ready internal tools template built with Next.js, Supabase, and Material-UI.

## Features

- **Authentication**: Microsoft and Google OAuth integration
- **Domain-based Access**: Users within the same email domain can access the app
- **Dashboard**: Clean, responsive dashboard with navigation
- **Chat System**: Real-time team chat with threads and comments
- **Data Warehouse Ready**: Schema and components for data sources, analytics, and planning
- **Modern UI**: Material-UI v5 with dark/light theme support
- **TypeScript**: Fully typed for better developer experience
- **Security**: Row-level security policies and proper authentication

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **UI**: Material-UI v5, Emotion
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with OAuth providers
- **State Management**: Zustand, React Query
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts, Chart.js
- **Testing**: Vitest, Jest, Playwright

## Getting Started

### Prerequisites

- Node.js 22+
- Supabase CLI
- Microsoft/Google OAuth apps configured

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd internal_tools_template
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

4. Configure your environment variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OAuth Providers
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# App
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

5. Start Supabase:

```bash
npm run supabase:start
```

6. Run the development server:

```bash
npm run dev
```

### Database Setup

The template includes a complete database schema with:

- User profiles and authentication
- Chat system (threads, comments)
- Data warehouse tables (data sources, analytics, planning)
- Row-level security policies
- Domain-based access control

To apply the schema:

```bash
npm run supabase:migrate:diff
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (authenticated)/   # Protected app pages
│   └── api/               # API routes
├── components/            # Reusable UI components
├── contexts/              # React contexts
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── types/                 # TypeScript type definitions
└── utils/                 # Helper functions
```

## Key Components

### Authentication

- Microsoft and Google OAuth integration
- Domain-based access control
- Protected routes with middleware

### Dashboard

- Responsive navigation with collapsible sidebar
- Dark/light theme toggle
- User menu and notifications

### Chat System

- Thread-based chat with real-time updates
- Comment system with rich text editing
- Thread management (create, edit, delete)

### Data Warehouse

- Data source management
- Analytics query builder
- Planning model builder
- Results viewer

## Customization

### Adding New Features

1. **New Pages**: Add routes in `src/app/(authenticated)/`
2. **New Components**: Create in `src/components/`
3. **New API Routes**: Add in `src/app/api/`
4. **Database Changes**: Update schemas in `supabase/schemas/`

### Styling

The app uses Material-UI v5 with a custom theme. Modify `src/contexts/ThemeContext.tsx` to customize colors, typography, and other theme properties.

### Authentication

To add new OAuth providers:

1. Configure the provider in Supabase
2. Update environment variables
3. Add provider-specific logic in `src/lib/oauth/`

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Docker

```bash
docker build -t internal-tools .
docker run -p 3000:3000 internal-tools
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run supabase:start` - Start Supabase locally
- `npm run supabase:types` - Generate TypeScript types

### Code Quality

- ESLint with TypeScript support
- Prettier for code formatting
- Husky for pre-commit hooks
- TypeScript strict mode enabled

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
