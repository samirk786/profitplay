import { PrismaClient, SubscriptionPlan, MarketType, MarketStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create rulesets for each plan
  const rulesets = await Promise.all([
    prisma.ruleset.upsert({
      where: { plan: SubscriptionPlan.STARTER },
      update: {},
      create: {
        name: 'Starter Plan Rules',
        plan: SubscriptionPlan.STARTER,
        profitTargetPct: 8.0,
        maxDailyLossPct: 5.0,
        maxDrawdownPct: 15.0,
        maxStakePct: 2.0,
        allowedMarkets: ['MONEYLINE', 'SPREAD', 'TOTAL'],
        maxOdds: 500.0,
        consistencyRule: false,
      },
    }),
    prisma.ruleset.upsert({
      where: { plan: SubscriptionPlan.STANDARD },
      update: {},
      create: {
        name: 'Standard Plan Rules',
        plan: SubscriptionPlan.STANDARD,
        profitTargetPct: 10.0,
        maxDailyLossPct: 5.0,
        maxDrawdownPct: 15.0,
        maxStakePct: 3.0,
        allowedMarkets: ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS'],
        maxOdds: 500.0,
        consistencyRule: true,
        consistencyPct: 40.0,
      },
    }),
    prisma.ruleset.upsert({
      where: { plan: SubscriptionPlan.PRO },
      update: {},
      create: {
        name: 'Pro Plan Rules',
        plan: SubscriptionPlan.PRO,
        profitTargetPct: 12.0,
        maxDailyLossPct: 5.0,
        maxDrawdownPct: 15.0,
        maxStakePct: 5.0,
        allowedMarkets: ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS'],
        maxOdds: 1000.0,
        consistencyRule: true,
        consistencyPct: 40.0,
      },
    }),
  ])

  console.log('✅ Created rulesets:', rulesets.length)

  // Create mock markets
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const mockMarkets = [
    // NBA Games
    {
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-001',
      marketType: MarketType.MONEYLINE,
      participants: ['Los Angeles Lakers', 'Golden State Warriors'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-001',
      marketType: MarketType.SPREAD,
      participants: ['Los Angeles Lakers', 'Golden State Warriors'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-001',
      marketType: MarketType.TOTAL,
      participants: ['Los Angeles Lakers', 'Golden State Warriors'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'NBA',
      league: 'National Basketball Association',
      eventId: 'nba-002',
      marketType: MarketType.MONEYLINE,
      participants: ['Boston Celtics', 'Miami Heat'],
      startTime: dayAfter,
      status: MarketStatus.UPCOMING,
    },
    // NFL Games
    {
      sport: 'NFL',
      league: 'National Football League',
      eventId: 'nfl-001',
      marketType: MarketType.MONEYLINE,
      participants: ['Kansas City Chiefs', 'Buffalo Bills'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'NFL',
      league: 'National Football League',
      eventId: 'nfl-001',
      marketType: MarketType.SPREAD,
      participants: ['Kansas City Chiefs', 'Buffalo Bills'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'NFL',
      league: 'National Football League',
      eventId: 'nfl-001',
      marketType: MarketType.TOTAL,
      participants: ['Kansas City Chiefs', 'Buffalo Bills'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    // MLB Games
    {
      sport: 'MLB',
      league: 'Major League Baseball',
      eventId: 'mlb-001',
      marketType: MarketType.MONEYLINE,
      participants: ['New York Yankees', 'Boston Red Sox'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'MLB',
      league: 'Major League Baseball',
      eventId: 'mlb-001',
      marketType: MarketType.SPREAD,
      participants: ['New York Yankees', 'Boston Red Sox'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
    {
      sport: 'MLB',
      league: 'Major League Baseball',
      eventId: 'mlb-001',
      marketType: MarketType.TOTAL,
      participants: ['New York Yankees', 'Boston Red Sox'],
      startTime: tomorrow,
      status: MarketStatus.UPCOMING,
    },
  ]

  const createdMarkets = []
  for (const market of mockMarkets) {
    const existingMarket = await prisma.market.findFirst({
      where: {
        eventId: market.eventId,
        marketType: market.marketType,
      }
    })
    
    if (!existingMarket) {
      const created = await prisma.market.create({
        data: market,
      })
      createdMarkets.push(created)
    } else {
      createdMarkets.push(existingMarket)
    }
  }

  console.log('✅ Created markets:', createdMarkets.length)

  // Create mock odds snapshots for each market
  const oddsSnapshots = []
  for (const market of createdMarkets) {
    const bookmakers = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars']
    
    for (const bookmaker of bookmakers) {
      let oddsData: any = {}
      
      if (market.marketType === MarketType.MONEYLINE) {
        oddsData = {
          home: Math.random() > 0.5 ? -150 + Math.random() * 100 : 120 + Math.random() * 200,
          away: Math.random() > 0.5 ? -150 + Math.random() * 100 : 120 + Math.random() * 200,
        }
      } else if (market.marketType === MarketType.SPREAD) {
        oddsData = {
          home: { spread: -3.5, odds: -110 + Math.random() * 20 },
          away: { spread: 3.5, odds: -110 + Math.random() * 20 },
        }
      } else if (market.marketType === MarketType.TOTAL) {
        oddsData = {
          over: { total: 220.5, odds: -110 + Math.random() * 20 },
          under: { total: 220.5, odds: -110 + Math.random() * 20 },
        }
      }

      oddsSnapshots.push({
        marketId: market.id,
        bookmaker,
        lineJSON: oddsData,
      })
    }
  }

  await prisma.oddsSnapshot.createMany({
    data: oddsSnapshots,
  })

  console.log('✅ Created odds snapshots:', oddsSnapshots.length)

  // Create a test admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@profitplay.com' },
    update: { password: adminPassword },
    create: {
      email: 'admin@profitplay.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      ageVerified: true,
      ageVerifiedAt: new Date(),
    },
  })

  console.log('✅ Created admin user:', adminUser.email)

  // Give admin user a PRO subscription and challenge account for testing
  const proRuleset = rulesets.find(r => r.plan === SubscriptionPlan.PRO)
  if (proRuleset) {
    // Check if admin already has a subscription
    let adminSubscription = await prisma.subscription.findFirst({
      where: { userId: adminUser.id }
    })
    
    if (!adminSubscription) {
      // Create subscription for admin
      adminSubscription = await prisma.subscription.create({
        data: {
          userId: adminUser.id,
          stripeCustomerId: `admin_${adminUser.id}`,
          status: 'ACTIVE',
          plan: SubscriptionPlan.PRO,
          renewAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        },
      })
      console.log('✅ Created admin subscription:', adminSubscription.id)
    } else {
      // Update existing subscription to PRO
      adminSubscription = await prisma.subscription.update({
        where: { id: adminSubscription.id },
        data: {
          plan: SubscriptionPlan.PRO,
          status: 'ACTIVE',
        },
      })
      console.log('✅ Updated admin subscription to PRO:', adminSubscription.id)
    }

    // Check if admin already has a challenge account
    let adminChallenge = await prisma.challengeAccount.findFirst({
      where: { userId: adminUser.id, state: 'ACTIVE' }
    })

    if (!adminChallenge) {
      // Create challenge account for admin with some progress
      adminChallenge = await prisma.challengeAccount.create({
        data: {
          userId: adminUser.id,
          rulesetId: proRuleset.id,
          startBalance: 10000,
          equity: 10750, // Some profit to show progress
          highWaterMark: 10750,
          state: 'ACTIVE',
        },
      })
      console.log('✅ Created admin challenge account:', adminChallenge.id)
    } else {
      // Update existing challenge account with PRO ruleset and mock progress
      adminChallenge = await prisma.challengeAccount.update({
        where: { id: adminChallenge.id },
        data: {
          rulesetId: proRuleset.id,
          equity: 10750,
          highWaterMark: 10750,
        },
      })
      console.log('✅ Updated admin challenge account:', adminChallenge.id)
    }
  }

  // Create a test member user
  const memberPassword = await bcrypt.hash('member123', 10)
  const memberUser = await prisma.user.upsert({
    where: { email: 'member@profitplay.com' },
    update: { password: memberPassword },
    create: {
      email: 'member@profitplay.com',
      name: 'Test Member',
      password: memberPassword,
      role: 'MEMBER',
      ageVerified: true,
      ageVerifiedAt: new Date(),
    },
  })

  console.log('✅ Created member user:', memberUser.email)

  console.log('🎉 Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
