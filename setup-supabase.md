# ProfitPlay Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign in/create an account
2. Click "New Project"
3. Fill in the details:
   - **Project name**: `profitplay-mvp`
   - **Database password**: Choose a strong password (save this!)
   - **Region**: Choose the closest to your location
4. Wait for project creation (1-2 minutes)

## Step 2: Get Your Credentials

Once your project is created:

1. Go to **Settings > API** in your Supabase dashboard
2. Copy these values:
   - **Project URL**: `https://[YOUR_PROJECT_REF].supabase.co`
   - **Database password**: (the one you set during creation)
   - **anon key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 3: Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` file with your Supabase credentials:
   ```bash
   # Replace [YOUR_DB_PASSWORD] with your database password
   # Replace [YOUR_PROJECT_REF] with your project reference
   # Replace [YOUR_ANON_KEY] with your anon key
   # Replace [YOUR_SERVICE_ROLE_KEY] with your service role key

   DATABASE_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"
   DIRECT_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"
   SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
   SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
   SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"
   ```

## Step 4: Run Database Setup

```bash
# Install dependencies (if not already done)
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with mock data
npm run db:seed
```

## Step 5: Test Your Application

```bash
# Start the development server
npm run dev
```

Visit `http://localhost:3000` to test your application.

## Troubleshooting

### Common Issues:

1. **Connection refused**: Check your DATABASE_URL format
2. **Migration errors**: Ensure DIRECT_URL is set correctly
3. **Seed script errors**: Make sure the database is properly migrated first

### Useful Commands:

```bash
# Reset database (destructive!)
npm run db:reset

# View database in Prisma Studio
npm run db:studio

# Check database status
npx prisma db status
```

## Next Steps

Once everything is working:
1. Test user registration/login
2. Test betting functionality
3. Verify admin panel access
4. Test payment integration (if configured)
