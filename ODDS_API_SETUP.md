# Odds API Integration Setup Guide

## 🎯 What You've Got

Your ProfitPlay application now has full Odds API integration! Here's what's been added:

### New Features:
- ✅ Real-time odds data from The Odds API
- ✅ Automatic odds synchronization
- ✅ Support for multiple sports (NBA, NFL, MLB, NHL)
- ✅ Multiple market types (Moneyline, Spreads, Totals)
- ✅ API usage monitoring
- ✅ Scheduled odds updates

## 🔧 Setup Instructions

### 1. Add Your Odds API Key

1. **Copy your environment file:**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` and add your Odds API key:**
   ```bash
   ODDS_API_KEY="your-actual-odds-api-key-here"
   CRON_SECRET="your-secure-random-string"
   ```

### 2. Test the Integration

#### Test API Connection:
```bash
# Check API usage and available sports
curl http://localhost:3000/api/odds/sync
```

#### Sync Odds Data:
```bash
# Sync NBA odds
curl -X POST http://localhost:3000/api/odds/sync \
  -H "Content-Type: application/json" \
  -d '{"sport": "basketball_nba"}'
```

#### Fetch Markets with Real Data:
```bash
# Get NBA markets with fresh odds
curl "http://localhost:3000/api/markets?sport=NBA&refresh=true"
```

### 3. Available Sports

The integration supports these sports:
- **NBA**: `basketball_nba`
- **NFL**: `americanfootball_nfl`
- **MLB**: `baseball_mlb`
- **NHL**: `icehockey_nhl`
- **Soccer**: `soccer_epl`

### 4. Market Types

Each sport supports:
- **Moneyline**: Win/lose bets
- **Spreads**: Point spread bets
- **Totals**: Over/under bets

## 🚀 Usage Examples

### Frontend Integration

```typescript
// Fetch markets with real odds
const response = await fetch('/api/markets?sport=NBA&refresh=true')
const { markets } = await response.json()

// Markets now contain real odds data!
markets.forEach(market => {
  console.log(`${market.participants[0]} vs ${market.participants[1]}`)
  console.log('Odds:', market.odds)
  console.log('Last updated:', market.lastUpdated)
})
```

### Manual Odds Sync

```typescript
// Sync specific sport
await fetch('/api/odds/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ sport: 'basketball_nba' })
})
```

## 📊 API Endpoints

### New Endpoints Added:

1. **`GET /api/odds/sync`** - Check API usage and available sports
2. **`POST /api/odds/sync`** - Sync odds data for a specific sport
3. **`POST /api/odds/cron`** - Scheduled odds updates (for cron jobs)
4. **`GET /api/markets?refresh=true`** - Fetch markets with fresh odds

### Enhanced Endpoints:

- **`GET /api/markets`** - Now supports `refresh=true` parameter to fetch fresh odds

## 🔄 Automated Updates

### Option 1: Vercel Cron (Recommended)
Add to your `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/odds/cron",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### Option 2: GitHub Actions
Create `.github/workflows/update-odds.yml`:
```yaml
name: Update Odds
on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  update-odds:
    runs-on: ubuntu-latest
    steps:
      - name: Update Odds
        run: |
          curl -X POST https://your-app.vercel.app/api/odds/cron \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Cron Service
Use services like:
- [cron-job.org](https://cron-job.org/)
- [EasyCron](https://www.easycron.com/)
- [SetCronJob](https://www.setcronjob.com/)

## 📈 API Usage Monitoring

The Odds API has usage limits:
- **Free tier**: 500 requests/month
- **Paid tiers**: Higher limits available

Monitor usage:
```bash
curl http://localhost:3000/api/odds/sync
```

Response includes:
```json
{
  "apiUsage": {
    "used": 45,
    "remaining": 455
  }
}
```

## 🛠️ Troubleshooting

### Common Issues:

1. **"ODDS_API_KEY environment variable is required"**
   - Make sure you've added your API key to `.env`
   - Restart your development server

2. **"Odds API error: 401"**
   - Check your API key is correct
   - Verify you have remaining requests

3. **"Failed to sync odds data"**
   - Check your internet connection
   - Verify the sport key is correct
   - Check API usage limits

### Debug Commands:

```bash
# Check API usage
curl http://localhost:3000/api/odds/sync

# Test specific sport sync
curl -X POST http://localhost:3000/api/odds/sync \
  -H "Content-Type: application/json" \
  -d '{"sport": "basketball_nba"}'

# View database
npm run db:studio
```

## 🎉 Next Steps

1. **Add your Odds API key** to `.env`
2. **Test the integration** with the curl commands above
3. **Set up automated updates** using one of the cron options
4. **Monitor API usage** to stay within limits
5. **Customize sports** by modifying the sync endpoint

Your ProfitPlay app now has real-time odds data! 🚀
