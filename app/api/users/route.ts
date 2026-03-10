import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SubscriptionPlan } from '@prisma/client'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, ageVerified } = await request.json()

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    if (email.toLowerCase() === 'admin@profitplay.com') {
      return NextResponse.json(
        { error: 'This email is reserved.' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user (force MEMBER role)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'MEMBER',
        ageVerified: ageVerified || false,
        ageVerifiedAt: ageVerified ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        ageVerified: true,
        createdAt: true,
      }
    })

    // Auto-assign STANDARD plan for beta testing
    try {
      const ruleset = await prisma.ruleset.findUnique({
        where: { plan: 'STANDARD' as SubscriptionPlan }
      })

      if (ruleset) {
        // Ensure ruleset has all required markets
        const requiredMarkets = ['MONEYLINE', 'SPREAD', 'TOTAL', 'PROPS']
        const currentMarkets = ruleset.allowedMarkets || []
        const missingMarkets = requiredMarkets.filter(m => !currentMarkets.includes(m))
        if (missingMarkets.length > 0) {
          await prisma.ruleset.update({
            where: { id: ruleset.id },
            data: {
              allowedMarkets: [...new Set([...currentMarkets, ...requiredMarkets])]
            }
          })
        }

        // Create subscription
        await prisma.subscription.create({
          data: {
            userId: user.id,
            stripeCustomerId: `beta_${user.id}_${Date.now()}`,
            status: 'ACTIVE',
            plan: 'STANDARD' as SubscriptionPlan,
            renewAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year for beta
          }
        })

        // Create challenge account
        await prisma.challengeAccount.create({
          data: {
            userId: user.id,
            rulesetId: ruleset.id,
            startBalance: 10000,
            equity: 10000,
            highWaterMark: 10000,
            state: 'ACTIVE'
          }
        })
      }
    } catch (subError) {
      // Don't fail signup if subscription auto-assign fails
      console.error('Failed to auto-assign STANDARD plan:', subError)
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    console.error('User creation error:', error)
    // Return more specific error messages for debugging
    const errorMessage = error?.message || 'Internal server error'
    return NextResponse.json(
      { error: errorMessage, details: error?.code || 'UNKNOWN_ERROR' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const where: any = {}
    
    if (role) {
      where.role = role
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          ageVerified: true,
          createdAt: true,
          subscriptions: {
            select: {
              status: true,
              plan: true,
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ])

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Users fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
