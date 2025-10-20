import { NextRequest, NextResponse } from 'next/server'
import { stripe, constructWebhookEvent } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createAuditLog, AuditActions } from '@/lib/audit-logger'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe signature' },
      { status: 400 }
    )
  }

  try {
    const event = await constructWebhookEvent(body, signature)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object)
        break

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const { userId, plan } = session.metadata

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session:', session.id)
    return
  }

  try {
    // Create or update subscription
    const subscription = await prisma.subscription.upsert({
      where: { stripeCustomerId: session.customer },
      update: {
        stripeSubscriptionId: session.subscription,
        status: 'ACTIVE',
        plan: plan.toUpperCase(),
        renewAt: new Date(session.subscription_details?.metadata?.current_period_end * 1000)
      },
      create: {
        userId,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription,
        status: 'ACTIVE',
        plan: plan.toUpperCase(),
        renewAt: new Date(session.subscription_details?.metadata?.current_period_end * 1000)
      }
    })

    // Create challenge account
    const ruleset = await prisma.ruleset.findUnique({
      where: { plan: plan.toUpperCase() }
    })

    if (ruleset) {
      const startBalance = 10000 // Default starting balance
      
      const challengeAccount = await prisma.challengeAccount.create({
        data: {
          userId,
          rulesetId: ruleset.id,
          startBalance,
          equity: startBalance,
          highWaterMark: startBalance,
          state: 'ACTIVE'
        }
      })

      // Create audit log for challenge creation
      await createAuditLog({
        userId,
        action: AuditActions.CHALLENGE_ACCOUNT_CREATED,
        payload: {
          challengeAccountId: challengeAccount.id,
          plan: plan.toUpperCase(),
          startBalance,
          rulesetId: ruleset.id
        }
      })
    }

    // Create audit log
    await createAuditLog({
      userId,
      action: AuditActions.SUBSCRIPTION_CREATED,
      payload: {
        subscriptionId: subscription.id,
        plan: plan.toUpperCase(),
        stripeCustomerId: session.customer
      }
    })

    console.log('Checkout session completed:', session.id)
  } catch (error) {
    console.error('Error handling checkout session:', error)
  }
}

async function handleInvoicePaid(invoice: any) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: invoice.subscription }
    })

    if (subscription) {
      // Create transaction record
      await prisma.transaction.create({
        data: {
          userId: subscription.userId,
          type: 'SUBSCRIPTION',
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency,
          reference: invoice.payment_intent
        }
      })

      // Create audit log
      await createAuditLog({
        userId: subscription.userId,
        action: AuditActions.SUBSCRIPTION_CREATED,
        payload: {
          invoiceId: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency
        }
      })
    }
  } catch (error) {
    console.error('Error handling invoice paid:', error)
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase(),
        renewAt: new Date(subscription.current_period_end * 1000)
      }
    })

    console.log('Subscription updated:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription update:', error)
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELED'
      }
    })

    console.log('Subscription deleted:', subscription.id)
  } catch (error) {
    console.error('Error handling subscription deletion:', error)
  }
}
