import { PrismaClient, SubscriptionPlan } from '@prisma/client'

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
        maxStakePct: 1.0,
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
        maxStakePct: 1.0,
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
        maxStakePct: 1.0,
        allowedMarkets: ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS'],
        maxOdds: 1000.0,
        consistencyRule: true,
        consistencyPct: 40.0,
      },
    }),
  ])

  console.log('✅ Created rulesets:', rulesets.length)

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
