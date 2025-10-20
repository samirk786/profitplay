import { z } from 'zod'

// User validation schemas
export const userSignupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirmPassword: z.string(),
  ageVerified: z.boolean().refine(val => val === true, 'You must verify your age'),
  termsAccepted: z.boolean().refine(val => val === true, 'You must accept the terms')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

export const userSigninSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
})

export const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email format').optional()
})

// Bet validation schemas
export const betPlacementSchema = z.object({
  challengeAccountId: z.string().min(1, 'Challenge account ID is required'),
  marketId: z.string().min(1, 'Market ID is required'),
  selection: z.string().min(1, 'Selection is required'),
  stake: z.number()
    .min(10, 'Minimum stake is $10')
    .max(1000, 'Maximum stake is $1000')
    .multipleOf(0.01, 'Stake must be in cents')
})

export const betSettlementSchema = z.object({
  betId: z.string().min(1, 'Bet ID is required'),
  result: z.enum(['WON', 'LOST', 'PUSH'], {
    errorMap: () => ({ message: 'Result must be WON, LOST, or PUSH' })
  }),
  adminUserId: z.string().min(1, 'Admin user ID is required')
})

// Market validation schemas
export const marketQuerySchema = z.object({
  sport: z.string().optional(),
  marketType: z.string().optional(),
  date: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10)
})

export const marketCreateSchema = z.object({
  sport: z.string().min(1, 'Sport is required'),
  league: z.string().min(1, 'League is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  marketType: z.enum(['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS']),
  participants: z.array(z.string()).min(2, 'At least 2 participants required'),
  startTime: z.string().datetime('Invalid start time format')
})

// Challenge validation schemas
export const challengeCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  rulesetId: z.string().min(1, 'Ruleset ID is required'),
  startBalance: z.number()
    .min(1000, 'Minimum start balance is $1000')
    .max(100000, 'Maximum start balance is $100,000')
})

export const challengeUpdateSchema = z.object({
  state: z.enum(['ACTIVE', 'PASSED', 'FAILED', 'PAUSED']).optional(),
  equity: z.number().min(0, 'Equity cannot be negative').optional(),
  highWaterMark: z.number().min(0, 'High water mark cannot be negative').optional()
})

// Ruleset validation schemas
export const rulesetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  plan: z.enum(['STARTER', 'STANDARD', 'PRO']),
  profitTargetPct: z.number()
    .min(1, 'Profit target must be at least 1%')
    .max(50, 'Profit target cannot exceed 50%'),
  maxDailyLossPct: z.number()
    .min(1, 'Max daily loss must be at least 1%')
    .max(20, 'Max daily loss cannot exceed 20%'),
  maxDrawdownPct: z.number()
    .min(5, 'Max drawdown must be at least 5%')
    .max(50, 'Max drawdown cannot exceed 50%'),
  maxStakePct: z.number()
    .min(0.5, 'Max stake must be at least 0.5%')
    .max(10, 'Max stake cannot exceed 10%'),
  allowedMarkets: z.array(z.enum(['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS']))
    .min(1, 'At least one market type must be allowed'),
  maxOdds: z.number().min(100, 'Max odds must be at least 100').optional(),
  consistencyRule: z.boolean().default(false),
  consistencyPct: z.number()
    .min(10, 'Consistency percentage must be at least 10%')
    .max(90, 'Consistency percentage cannot exceed 90%')
    .optional()
})

// Subscription validation schemas
export const subscriptionCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  plan: z.enum(['STARTER', 'STANDARD', 'PRO']),
  stripeCustomerId: z.string().min(1, 'Stripe customer ID is required')
})

export const subscriptionUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'CANCELED', 'PAST_DUE', 'UNPAID']).optional(),
  renewAt: z.string().datetime().optional()
})

// Admin validation schemas
export const adminUserQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  role: z.string().optional(),
  search: z.string().optional()
})

export const adminChallengeQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  state: z.string().optional(),
  search: z.string().optional()
})

export const adminLogQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  action: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional()
})

// Audit log validation schemas
export const auditLogCreateSchema = z.object({
  userId: z.string().optional(),
  action: z.string().min(1, 'Action is required'),
  payload: z.record(z.any()),
  ip: z.string().optional()
})

// Transaction validation schemas
export const transactionCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['SUBSCRIPTION', 'REFUND', 'PAYOUT', 'ADJUSTMENT']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().length(3, 'Currency must be 3 characters').default('USD'),
  reference: z.string().optional()
})

// Payout request validation schemas
export const payoutRequestCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number()
    .min(100, 'Minimum payout is $100')
    .max(10000, 'Maximum payout is $10,000')
})

export const payoutRequestUpdateSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'PAID']),
  reviewedBy: z.string().min(1, 'Reviewer ID is required')
})

// Odds validation schemas
export const oddsSnapshotCreateSchema = z.object({
  marketId: z.string().min(1, 'Market ID is required'),
  bookmaker: z.string().min(1, 'Bookmaker is required'),
  lineJSON: z.record(z.any())
})

// Settlement validation schemas
export const settlementCreateSchema = z.object({
  betId: z.string().min(1, 'Bet ID is required'),
  resultJSON: z.record(z.any()),
  source: z.enum(['manual', 'api']).default('manual')
})

// Feature flag validation schemas
export const featureFlagCreateSchema = z.object({
  key: z.string().min(1, 'Key is required').max(100, 'Key too long'),
  value: z.string().min(1, 'Value is required')
})

// Utility functions for validation
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation failed: ${error.errors.map(e => e.message).join(', ')}`)
    }
    throw error
  }
}

export function validateSchemaSafe<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  try {
    const result = schema.safeParse(data)
    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return {
        success: false,
        errors: result.error.errors.map(e => e.message)
      }
    }
  } catch (error) {
    return {
      success: false,
      errors: ['Validation failed']
    }
  }
}

// Common validation patterns
export const commonValidations = {
  email: z.string().email('Invalid email format'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  uuid: z.string().uuid('Invalid UUID format'),
  cuid: z.string().regex(/^c[0-9a-z]{24}$/, 'Invalid CUID format'),
  positiveNumber: z.number().min(0, 'Number must be positive'),
  percentage: z.number().min(0, 'Percentage must be at least 0%').max(100, 'Percentage cannot exceed 100%'),
  dateString: z.string().datetime('Invalid date format'),
  pagination: z.object({
    page: z.number().min(1, 'Page must be at least 1'),
    limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100')
  })
}
