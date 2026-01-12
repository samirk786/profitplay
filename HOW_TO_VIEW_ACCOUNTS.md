# How to View Accounts in the Database

There are several ways to view user accounts in your ProfitPlay database:

## 1. Supabase Dashboard (Recommended - Easiest)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in to your account
   - Select your project: `dztljvlnlcddadswlwgv`

2. **Navigate to Table Editor**
   - Click on "Table Editor" in the left sidebar
   - Click on the `users` table
   - You'll see all user accounts with their details (name, email, role, etc.)

3. **View Related Data**
   - Click on `subscriptions` table to see user subscriptions
   - Click on `challenge_accounts` table to see challenge accounts
   - Click on `bets` table to see user bets

## 2. Admin Panel (When Fixed)

1. **Sign in as Admin**
   - Go to: https://your-domain.com/auth/signin
   - Sign in with: `admin@profitplay.com` / `admin123`

2. **Navigate to Admin Panel**
   - Go to: https://your-domain.com/admin/users
   - View all users in a table format
   - Search and filter users by role

**Note**: The admin users page currently shows mock data. It needs to be updated to fetch real data from the API.

## 3. API Endpoint (For Developers)

1. **Get Authentication Token** (if needed)
2. **Call the API**
   ```bash
   curl https://your-domain.com/api/users
   ```

   Or with authentication:
   ```bash
   curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" https://your-domain.com/api/users
   ```

## 4. Database Query (Advanced)

If you have direct database access:

```sql
SELECT * FROM users;
SELECT * FROM users WHERE email = 'user@example.com';
SELECT u.*, s.plan, s.status 
FROM users u 
LEFT JOIN subscriptions s ON u.id = s."userId";
```

## Quick Access Links

- **Supabase Dashboard**: https://supabase.com/dashboard/project/dztljvlnlcddadswlwgv
- **Table Editor**: https://supabase.com/dashboard/project/dztljvlnlcddadswlwgv/editor
- **Admin Panel**: https://your-domain.com/admin/users (after signing in as admin)

## Troubleshooting Signup Errors

If you're seeing "an error occurred please try again later" when creating an account:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for error messages

2. **Check Server Logs**
   - If running locally: Check terminal/console output
   - If on Vercel: Check Vercel Dashboard → Your Project → Logs

3. **Common Issues**:
   - **Database Connection**: Make sure DATABASE_URL is set correctly
   - **Email Already Exists**: Try a different email address
   - **Network Error**: Check your internet connection
   - **Server Error**: Check if the API endpoint is working

4. **Debug Mode**:
   - The improved error handling will now show more specific error messages
   - Check the error message in the browser console for details
