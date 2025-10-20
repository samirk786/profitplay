import { 
  checkChallengeRules, 
  validateBetPlacement, 
  calculatePotentialPayout,
  calculatePnlFromBet 
} from '@/lib/rules-engine'
import { ChallengeState } from '@prisma/client'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    bet: {
      findMany: jest.fn(),
    },
    challengeAccount: {
      findUnique: jest.fn(),
    },
  },
}))

describe('Rules Engine', () => {
  const mockChallengeAccount = {
    id: 'challenge-1',
    startBalance: 10000,
    equity: 10000,
    highWaterMark: 10000,
    state: ChallengeState.ACTIVE,
    ruleset: {
      profitTargetPct: 10,
      maxDailyLossPct: 5,
      maxDrawdownPct: 15,
      maxStakePct: 5,
      allowedMarkets: ['MONEYLINE', 'SPREAD'],
      maxOdds: 500,
      consistencyRule: false,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculatePotentialPayout', () => {
    it('should calculate positive odds correctly', () => {
      const payout = calculatePotentialPayout(100, 150)
      expect(payout).toBe(150)
    })

    it('should calculate negative odds correctly', () => {
      const payout = calculatePotentialPayout(100, -150)
      expect(payout).toBe(66.67)
    })
  })

  describe('calculatePnlFromBet', () => {
    it('should calculate P&L for winning bet', () => {
      const pnl = calculatePnlFromBet({
        stake: 100,
        potentialPayout: 150,
        status: 'WON'
      })
      expect(pnl).toBe(50)
    })

    it('should calculate P&L for losing bet', () => {
      const pnl = calculatePnlFromBet({
        stake: 100,
        potentialPayout: 150,
        status: 'LOST'
      })
      expect(pnl).toBe(-100)
    })

    it('should calculate P&L for push bet', () => {
      const pnl = calculatePnlFromBet({
        stake: 100,
        potentialPayout: 150,
        status: 'PUSH'
      })
      expect(pnl).toBe(0)
    })
  })

  describe('validateBetPlacement', () => {
    it('should validate a valid bet', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue(mockChallengeAccount)

      const result = await validateBetPlacement('challenge-1', 100, 'MONEYLINE', 150)
      
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject bet with stake too high', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue(mockChallengeAccount)

      const result = await validateBetPlacement('challenge-1', 600, 'MONEYLINE', 150)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Stake exceeds maximum allowed: $600.00 > $500.00')
    })

    it('should reject bet with invalid market type', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue(mockChallengeAccount)

      const result = await validateBetPlacement('challenge-1', 100, 'PROPS', 150)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Market type 'PROPS' is not allowed for this plan")
    })

    it('should reject bet with odds too high', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue(mockChallengeAccount)

      const result = await validateBetPlacement('challenge-1', 100, 'MONEYLINE', 600)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Odds exceed maximum allowed: 600 > 500')
    })

    it('should reject bet with insufficient balance', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue({
        ...mockChallengeAccount,
        equity: 50
      })

      const result = await validateBetPlacement('challenge-1', 100, 'MONEYLINE', 150)
      
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Insufficient balance for this stake')
    })
  })

  describe('checkChallengeRules', () => {
    it('should pass when no violations', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue(mockChallengeAccount)
      prisma.bet.findMany.mockResolvedValue([])

      const result = await checkChallengeRules('challenge-1')
      
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.newState).toBeUndefined()
    })

    it('should detect daily loss violation', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue(mockChallengeAccount)
      prisma.bet.findMany.mockResolvedValue([
        { status: 'LOST', stake: 100, potentialPayout: 0 },
        { status: 'LOST', stake: 200, potentialPayout: 0 },
        { status: 'LOST', stake: 300, potentialPayout: 0 },
      ])

      const result = await checkChallengeRules('challenge-1')
      
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('Daily loss limit exceeded: $600.00 > $500.00')
      expect(result.newState).toBe(ChallengeState.PAUSED)
    })

    it('should detect drawdown violation', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue({
        ...mockChallengeAccount,
        equity: 8000,
        highWaterMark: 10000
      })
      prisma.bet.findMany.mockResolvedValue([])

      const result = await checkChallengeRules('challenge-1')
      
      expect(result.passed).toBe(false)
      expect(result.violations).toContain('Maximum drawdown exceeded: 20.00% > 15%')
      expect(result.newState).toBe(ChallengeState.FAILED)
    })

    it('should detect profit target achievement', async () => {
      const { prisma } = require('@/lib/prisma')
      prisma.challengeAccount.findUnique.mockResolvedValue({
        ...mockChallengeAccount,
        equity: 11000
      })
      prisma.bet.findMany.mockResolvedValue([])

      const result = await checkChallengeRules('challenge-1')
      
      expect(result.passed).toBe(true)
      expect(result.violations).toHaveLength(0)
      expect(result.newState).toBe(ChallengeState.PASSED)
    })
  })
})
