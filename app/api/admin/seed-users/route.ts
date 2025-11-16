import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Temporary endpoint to seed users in production
// TODO: Remove this after seeding is complete
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you can remove this after seeding
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET || 'temp-seed-token'
    
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🌱 Seeding users...')

    // Create admin user
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

    // Create member user
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

    return NextResponse.json({
      success: true,
      message: 'Users seeded successfully',
      users: {
        admin: adminUser.email,
        member: memberUser.email,
      },
    })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed users', details: error.message },
      { status: 500 }
    )
  }
}

