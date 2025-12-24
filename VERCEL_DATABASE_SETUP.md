# Vercel Database Connection Setup

## The Problem
Vercel's serverless functions cannot directly connect to Supabase on port 5432. You MUST use the connection pooler (port 6543).

## Get the Correct Connection String from Supabase

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `dztljvlnlcddadswlwgv`

2. **Go to Settings → Database**
   - Click the gear icon (Settings) in the left sidebar
   - Click "Database" in the settings menu

3. **Find "Connection string" section**
   - Scroll down to "Connection string"
   - Look for "Connection pooling" or "Session mode"
   - Click on the "URI" tab

4. **Copy the Pooled Connection String**
   - It should look like:
     ```
     postgresql://postgres.dztljvlnlcddadswlwgv:[YOUR-PASSWORD]@db.dztljvlnlcddadswlwgv.supabase.co:6543/postgres?pgbouncer=true
     ```
   - OR just:
     ```
     postgresql://postgres.dztljvlnlcddadswlwgv:[YOUR-PASSWORD]@db.dztljvlnlcddadswlwgv.supabase.co:6543/postgres
     ```

5. **Replace [YOUR-PASSWORD]**
   - Your password: `W3MakingitOut!`
   - URL-encoded: `W3MakingitOut%21`
   - Final string:
     ```
     postgresql://postgres.dztljvlnlcddadswlwgv:W3MakingitOut%21@db.dztljvlnlcddadswlwgv.supabase.co:6543/postgres
     ```

## Alternative: If You Can't Find Pooler String

If Supabase doesn't show a pooled connection string, construct it manually:

**Format:**
```
postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres
```

**Your values:**
- Project Ref: `dztljvlnlcddadswlwgv`
- Password: `W3MakingitOut!` (URL-encoded: `W3MakingitOut%21`)

**Result:**
```
postgresql://postgres.dztljvlnlcddadswlwgv:W3MakingitOut%21@db.dztljvlnlcddadswlwgv.supabase.co:6543/postgres
```

## Update in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `DATABASE_URL`
3. Click Edit
4. Paste the connection string above (with port 6543 and username `postgres.dztljvlnlcddadswlwgv`)
5. Make sure it's enabled for Production, Preview, and Development
6. Click Save
7. **Redeploy**: Go to Deployments → Latest deployment → three dots → Redeploy

## Important Notes

- **Port 5432 (direct)**: Blocked from Vercel serverless functions
- **Port 6543 (pooler)**: Required for Vercel, uses username `postgres.dztljvlnlcddadswlwgv`
- **Password must be URL-encoded**: `!` becomes `%21`

