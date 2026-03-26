import { prisma } from './prisma'
import { ChallengeState } from '@prisma/client'

export interface RuleCheckResult {
  passed: boolean
  violations: string[]
  newState?: ChallengeState
}

export interface DailyPnlData {
  date: string
  pnl: number
}

export async function checkChallengeRules(
  challengeAccountId: string,
  dailyPnl?: number
): Promise<RuleCheckResult> {
  const challengeAccount = await prisma.challengeAccount.findUnique({
    where: { id: challengeAccountId },
    include: { ruleset: true },
  })

  if (!challengeAccount) {
    throw new Error('Challenge account not found')
  }

  const violations: string[] = []
  let newState: ChallengeState | undefined

  // Get today's P&L if not provided
  let todayPnl = dailyPnl
  if (todayPnl === undefined) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayBets = await prisma.bet.findMany({
      where: {
        challengeAccountId,
        settledAt: {
          gte: today,
          lt: tomorrow,
        },
        status: { in: ['WON', 'LOST', 'PUSH'] },
      },
    })

    todayPnl = todayBets.reduce((sum, bet) => {
      if (bet.status === 'WON') {
        return sum + (bet.potentialPayout - bet.stake)
      } else if (bet.status === 'LOST') {
        return sum - bet.stake
      }
      return sum // PUSH
    }, 0)
  }

  const ruleset = challengeAccount.ruleset
  const currentEquity = challengeAccount.equity
  const startBalance = challengeAccount.startBalance
  const highWaterMark = challengeAccount.highWaterMark
  const isFunded = (challengeAccount as any).isFunded || false

  // 1. Daily Loss Check
  const maxDailyLoss = startBalance * (ruleset.maxDailyLossPct / 100)
  if (todayPnl < -maxDailyLoss) {
    violations.push(`Daily loss limit exceeded: $${Math.abs(todayPnl).toFixed(2)} > $${maxDailyLoss.toFixed(2)}`)
    newState = ChallengeState.PAUSED
  }

  // 2. Trailing Drawdown Check
  // Drawdown = drop from high water mark, measured as fixed dollar amount based on startBalance
  // Example: 7% of $5000 = $350. If HWM is $5200 and equity is $4850, that's $350 drop = hit limit
  const maxDrawdownDollars = startBalance * (ruleset.maxDrawdownPct / 100)
  const currentDrawdownDollars = highWaterMark - currentEquity
  if (currentDrawdownDollars >= maxDrawdownDollars) {
    violations.push(`Max trailing drawdown exceeded: $${currentDrawdownDollars.toFixed(2)} >= $${maxDrawdownDollars.toFixed(2)}`)
    if (isFunded) {
      // Funded accounts get frozen (PAUSED), not failed
      newState = ChallengeState.PAUSED
    } else {
      // Challenge accounts fail
      newState = ChallengeState.FAILED
    }
  }

  // 3. Profit Target Check (only for challenge accounts, not funded)
  if (!isFunded) {
    const profitTarget = startBalance * (ruleset.profitTargetPct / 100)
    const currentProfit = currentEquity - startBalance
    if (currentProfit >= profitTarget) {
      // Check if no rule violations occurred
      if (violations.length === 0) {
        newState = ChallengeState.PASSED
      }
    }
  }

  // 4. Consistency Rule Check (if enabled)
  if (ruleset.consistencyRule && ruleset.consistencyPct) {
    const totalProfit = currentEquity - startBalance
    if (totalProfit > 0) {
      const maxSingleDayProfit = totalProfit * (ruleset.consistencyPct / 100)
      if (todayPnl > maxSingleDayProfit) {
        violations.push(`Consistency rule violated: single day profit $${todayPnl.toFixed(2)} > $${maxSingleDayProfit.toFixed(2)}`)
        newState = ChallengeState.PAUSED
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    newState,
  }
}

export async function updateChallengeAccountState(
  challengeAccountId: string,
  newState: ChallengeState,
  completedAt?: Date
) {
  const updateData: any = {
    state: newState,
    updatedAt: new Date(),
  }

  if (completedAt) {
    updateData.completedAt = completedAt
  }

  return await prisma.challengeAccount.update({
    where: { id: challengeAccountId },
    data: updateData,
  })
}

/**
 * When a challenge account passes, create a funded account with the same rules
 */
export async function createFundedAccount(
  challengeAccountId: string
): Promise<any> {
  const challengeAccount = await prisma.challengeAccount.findUnique({
    where: { id: challengeAccountId },
    include: { ruleset: true },
  })

  if (!challengeAccount) {
    throw new Error('Challenge account not found')
  }

  const startBalance = challengeAccount.startBalance

  const fundedAccount = await prisma.challengeAccount.create({
    data: {
      userId: challengeAccount.userId,
      rulesetId: challengeAccount.rulesetId,
      startBalance,
      equity: startBalance,
      highWaterMark: startBalance,
      isFunded: true,
      state: 'ACTIVE',
    },
  })

  return fundedAccount
}

export async function validateBetPlacement(
  challengeAccountId: string,
  stake: number,
  marketType: string,
  odds: number
): Promise<{ valid: boolean; errors: string[] }> {
  const challengeAccount = await prisma.challengeAccount.findUnique({
    where: { id: challengeAccountId },
    include: { ruleset: true },
  })

  if (!challengeAccount) {
    return { valid: false, errors: ['Challenge account not found'] }
  }

  const errors: string[] = []
  const ruleset = challengeAccount.ruleset

  // 1. Check if challenge is active
  if (challengeAccount.state !== ChallengeState.ACTIVE) {
    errors.push('Challenge account is not active')
  }

  // 2. Check max stake percentage (based on starting balance, not current equity)
  const maxStake = challengeAccount.startBalance * (ruleset.maxStakePct / 100)
  if (stake > maxStake) {
    errors.push(`Stake exceeds maximum allowed: $${stake.toFixed(2)} > $${maxStake.toFixed(2)}`)
  }

  // 3. Check if market type is allowed
  const normalizedMarketType =
    marketType === 'PROPS' || marketType.startsWith('PLAYER_') ? 'PROPS' : marketType
  const allowedMarkets = ruleset.allowedMarkets || []
  if (allowedMarkets.length > 0 && !allowedMarkets.includes(normalizedMarketType)) {
    errors.push(`Market type '${marketType}' is not allowed for this plan`)
  }

  // 4. Check odds limits
  if (ruleset.maxOdds && odds > ruleset.maxOdds) {
    errors.push(`Odds exceed maximum allowed: ${odds} > ${ruleset.maxOdds}`)
  }

  // 5. Check if user has sufficient balance
  if (stake > challengeAccount.equity) {
    errors.push('Insufficient balance for this stake')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function calculatePotentialPayout(stake: number, odds: number): number {
  if (odds > 0) {
    return stake * (odds / 100)
  } else {
    return stake * (100 / Math.abs(odds))
  }
}

export function calculatePnlFromBet(
  bet: {
    stake: number
    potentialPayout: number
    status: 'WON' | 'LOST' | 'PUSH'
  }
): number {
  switch (bet.status) {
    case 'WON':
      return bet.potentialPayout - bet.stake
    case 'LOST':
      return -bet.stake
    case 'PUSH':
      return 0
    default:
      return 0
  }
}
