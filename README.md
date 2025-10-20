# ProfitPlay MVP

A skill-based evaluation platform for sports performance analysis with simulated challenges.

## Tech Stack

- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (Postgres + Auth + Realtime)
- **Payments**: Stripe (subscriptions)
- **Odds Data**: Mock data initially → TheOddsAPI integration later
- **Hosting**: Vercel
- **Job Queue**: Vercel Cron or Inngest (for settlements)
- **Auth**: Email/password (2FA in Phase 3)

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or later)
- npm or yarn
- Git

## Getting Started

### 1. Clone and Install Dependencies

```bash
cd profitplay
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your database URL from the project settings
3. Copy `env.example` to `.env.local` and fill in your environment variables:

```bash
cp env.example .env.local
```

Update `.env.local` with your Supabase credentials:
```
DATABASE_URL="postgresql://postgres:[password]@[host]:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"
```

### 3. Set up Stripe (Optional for development)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your test API keys from the dashboard
3. Add them to `.env.local`:

```
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 4. Set up the Database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed the database with mock data
npm run db:seed
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
profitplay/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── webhooks/      # Stripe webhooks
│   │   ├── admin/         # Admin-only endpoints
│   │   └── bets/          # Betting endpoints
│   ├── auth/              # Auth pages (signin, signup)
│   ├── dashboard/         # User dashboard
│   ├── markets/           # Markets browsing
│   └── admin/             # Admin console
├── lib/                   # Utility functions
│   ├── prisma.ts         # Prisma client
│   ├── stripe.ts         # Stripe client
│   ├── rules-engine.ts   # Challenge rules logic
│   └── audit-logger.ts   # Audit logging
├── prisma/               # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   └── seed.ts          # Database seed script
└── public/               # Static assets
```

## Features

### Phase 1: Foundation (Current)
- ✅ Project setup with Next.js 14, TypeScript, Tailwind
- ✅ Database schema with Prisma
- ✅ Basic authentication pages
- ✅ Marketing site with pricing
- ✅ Mock data seeding

### Phase 2: Authentication & Subscriptions (Next)
- [ ] NextAuth.js integration
- [ ] Stripe subscription flow
- [ ] Challenge account creation
- [ ] User dashboard

### Phase 3: Betting Simulation (Future)
- [ ] Mock odds data
- [ ] Markets browsing
- [ ] Bet placement flow
- [ ] Settlement engine

### Phase 4: Rules Engine (Future)
- [ ] Rule validation
- [ ] Challenge state management
- [ ] Progress tracking

### Phase 5: Admin Console (Future)
- [ ] User management
- [ ] Challenge management
- [ ] Settlement tools
- [ ] Audit logs

## Development

### Database Commands

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database
npm run db:push

# Reset database and run seed
npm run db:push --force-reset
npm run db:seed
```

### Testing

```bash
# Run linting
npm run lint

# Run type checking
npx tsc --noEmit
```

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production

Make sure to set these in your Vercel dashboard:
- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support, email support@profitplay.com or create an issue in the repository.
