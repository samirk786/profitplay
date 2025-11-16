import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Temporary endpoint to seed users in production
// TODO: Remove this after seeding is complete
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Temporarily allow seeding without auth for initial setup
    // TODO: Remove this endpoint after seeding is complete
    console.log('🌱 Seeding users endpoint called')

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

