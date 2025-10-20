import { prisma } from './prisma'

export interface AuditLogData {
  userId?: string
  action: string
  payload: Record<string, any>
  ip?: string
}

export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        payload: data.payload,
        ip: data.ip,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
    // Don't throw error to avoid breaking the main flow
  }
}

export const AuditActions = {
  USER_SIGNUP: 'USER_SIGNUP',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
  CHALLENGE_ACCOUNT_CREATED: 'CHALLENGE_ACCOUNT_CREATED',
  CHALLENGE_ACCOUNT_UPDATED: 'CHALLENGE_ACCOUNT_UPDATED',
  BET_PLACED: 'BET_PLACED',
  BET_CANCELLED: 'BET_CANCELLED',
  BET_SETTLED: 'BET_SETTLED',
  RULE_VIOLATION: 'RULE_VIOLATION',
  CHALLENGE_PASSED: 'CHALLENGE_PASSED',
  CHALLENGE_FAILED: 'CHALLENGE_FAILED',
  CHALLENGE_PAUSED: 'CHALLENGE_PAUSED',
  ADMIN_ACTION: 'ADMIN_ACTION',
  PAYOUT_REQUESTED: 'PAYOUT_REQUESTED',
  PAYOUT_APPROVED: 'PAYOUT_APPROVED',
  PAYOUT_REJECTED: 'PAYOUT_REJECTED',
} as const

export type AuditAction = typeof AuditActions[keyof typeof AuditActions]
