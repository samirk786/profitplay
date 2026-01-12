import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '../../auth/[...nextauth]/route'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get user's active challenge account
    const challengeAccount = await prisma.challengeAccount.findFirst({
      where: {
        userId: session.user.id,
        state: 'ACTIVE'
      }
    })

    return NextResponse.json({
      plan: subscription?.plan || null,
      startingScore: challengeAccount?.startBalance || null
    })
  } catch (error: any) {
    console.error('User profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
