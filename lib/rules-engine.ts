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

  // 1. Daily Loss Check
  const maxDailyLoss = startBalance * (ruleset.maxDailyLossPct / 100)
  if (todayPnl < -maxDailyLoss) {
    violations.push(`Daily loss limit exceeded: $${Math.abs(todayPnl).toFixed(2)} > $${maxDailyLoss.toFixed(2)}`)
    newState = ChallengeState.PAUSED
  }

  // 2. Drawdown Check
  const currentDrawdown = (highWaterMark - currentEquity) / highWaterMark
  const maxDrawdown = ruleset.maxDrawdownPct / 100
  if (currentDrawdown > maxDrawdown) {
    violations.push(`Maximum drawdown exceeded: ${(currentDrawdown * 100).toFixed(2)}% > ${ruleset.maxDrawdownPct}%`)
    newState = ChallengeState.FAILED
  }

  // 3. Profit Target Check
  const profitTarget = startBalance * (ruleset.profitTargetPct / 100)
  const currentProfit = currentEquity - startBalance
  if (currentProfit >= profitTarget) {
    // Check if no rule violations occurred
    if (violations.length === 0) {
      newState = ChallengeState.PASSED
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

  // 2. Check max stake percentage
  const maxStake = challengeAccount.equity * (ruleset.maxStakePct / 100)
  if (stake > maxStake) {
    errors.push(`Stake exceeds maximum allowed: $${stake.toFixed(2)} > $${maxStake.toFixed(2)}`)
  }

  // 3. Check if market type is allowed
  if (!ruleset.allowedMarkets.includes(marketType)) {
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
