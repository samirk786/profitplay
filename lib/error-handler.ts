import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: any) {
    super(message, 400)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409)
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429)
  }
}

export function handleError(error: unknown): NextResponse {
  console.error('Error:', error)

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        statusCode: error.statusCode,
        ...(error instanceof ValidationError && { details: error.details })
      },
      { status: error.statusCode }
    )
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        statusCode: 400,
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      },
      { status: 400 }
    )
  }

  // Handle Prisma errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as any
    
    switch (prismaError.code) {
      case 'P2002':
        return NextResponse.json(
          {
            error: 'A record with this information already exists',
            statusCode: 409
          },
          { status: 409 }
        )
      case 'P2025':
        return NextResponse.json(
          {
            error: 'Record not found',
            statusCode: 404
          },
          { status: 404 }
        )
      case 'P2003':
        return NextResponse.json(
          {
            error: 'Foreign key constraint failed',
            statusCode: 400
          },
          { status: 400 }
        )
      default:
        return NextResponse.json(
          {
            error: 'Database error',
            statusCode: 500
          },
          { status: 500 }
        )
    }
  }

  // Handle unknown errors
  return NextResponse.json(
    {
      error: 'Internal server error',
      statusCode: 500
    },
    { status: 500 }
  )
}

export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`)
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format')
  }
}

export function validatePassword(password: string): void {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long')
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  }
}

export function validateStake(stake: number, maxStake: number, minStake: number = 10): void {
  if (stake < minStake) {
    throw new ValidationError(`Minimum stake is $${minStake}`)
  }
  
  if (stake > maxStake) {
    throw new ValidationError(`Maximum stake is $${maxStake}`)
  }
}

export function validateOdds(odds: number, maxOdds: number = 1000): void {
  if (odds < -1000 || odds > maxOdds) {
    throw new ValidationError(`Odds must be between -1000 and ${maxOdds}`)
  }
}

export function validateAge(age: number, minAge: number = 18): void {
  if (age < minAge) {
    throw new ValidationError(`You must be at least ${minAge} years old`)
  }
}

export function validateChallengeState(state: string): void {
  const validStates = ['ACTIVE', 'PASSED', 'FAILED', 'PAUSED']
  if (!validStates.includes(state)) {
    throw new ValidationError(`Invalid challenge state: ${state}`)
  }
}

export function validateBetStatus(status: string): void {
  const validStatuses = ['OPEN', 'WON', 'LOST', 'PUSH', 'CANCELLED']
  if (!validStatuses.includes(status)) {
    throw new ValidationError(`Invalid bet status: ${status}`)
  }
}

export function validateMarketType(marketType: string): void {
  const validTypes = ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS']
  if (!validTypes.includes(marketType)) {
    throw new ValidationError(`Invalid market type: ${marketType}`)
  }
}

export function validateSubscriptionPlan(plan: string): void {
  const validPlans = ['STARTER', 'STANDARD', 'PRO']
  if (!validPlans.includes(plan)) {
    throw new ValidationError(`Invalid subscription plan: ${plan}`)
  }
}

export function validateUserRole(role: string): void {
  const validRoles = ['GUEST', 'MEMBER', 'ADMIN']
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid user role: ${role}`)
  }
}

export function validatePagination(page: number, limit: number): void {
  if (page < 1) {
    throw new ValidationError('Page must be greater than 0')
  }
  
  if (limit < 1 || limit > 100) {
    throw new ValidationError('Limit must be between 1 and 100')
  }
}

export function validateDateRange(startDate: string, endDate: string): void {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new ValidationError('Invalid date format')
  }
  
  if (start > end) {
    throw new ValidationError('Start date must be before end date')
  }
  
  const daysDifference = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  if (daysDifference > 365) {
    throw new ValidationError('Date range cannot exceed 365 days')
  }
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function validateUUID(uuid: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(uuid)) {
    throw new ValidationError('Invalid UUID format')
  }
}

export function validateCUID(cuid: string): void {
  const cuidRegex = /^c[0-9a-z]{24}$/
  if (!cuidRegex.test(cuid)) {
    throw new ValidationError('Invalid CUID format')
  }
}
