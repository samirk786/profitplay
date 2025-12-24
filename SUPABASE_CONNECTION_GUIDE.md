# How to Find Your Supabase Connection String

## Step-by-Step Instructions:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account

2. **Select Your Project**
   - Click on your project: `dztljvlnlcddadswlwgv` (or whatever it's named)

3. **Go to Settings**
   - Click the **Settings** icon (gear icon) in the left sidebar

4. **Click on "Database"**
   - In the Settings menu, click **Database**

5. **Find "Connection string"**
   - Scroll down to the **Connection string** section
   - You'll see different connection modes:
     - **URI** (this is what we need)
     - **JDBC**
     - **Golang**
     - etc.

6. **Copy the URI Connection String**
   - Click on the **URI** tab
   - You'll see something like:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.dztljvlnlcddadswlwgv.supabase.co:5432/postgres
     ```
   - Click the **Copy** button or manually copy it

7. **Replace [YOUR-PASSWORD]**
   - Replace `[YOUR-PASSWORD]` with your actual database password: `W3MakingitOut!`
   - **Important**: URL-encode special characters:
     - `!` becomes `%21`
     - So `W3MakingitOut!` becomes `W3MakingitOut%21`

8. **Final Connection String Should Look Like:**
   ```
   postgresql://postgres:W3MakingitOut%21@db.dztljvlnlcddadswlwgv.supabase.co:5432/postgres
   ```

## Alternative: If You Can't Find It

If you can't find the connection string, you can construct it manually:

**Format:**
```
postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

**Your values:**
- Password: `W3MakingitOut!` (URL-encoded: `W3MakingitOut%21`)
- Project Ref: `dztljvlnlcddadswlwgv`

**Result:**
```
postgresql://postgres:W3MakingitOut%21@db.dztljvlnlcddadswlwgv.supabase.co:5432/postgres
```

## For Vercel Environment Variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `DATABASE_URL` with the connection string above
3. Make sure `DIRECT_URL` is the same (for migrations)
4. **Redeploy** your project

