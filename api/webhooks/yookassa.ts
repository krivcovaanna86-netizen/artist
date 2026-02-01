import type { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../_lib/prisma'
import type { YooKassaWebhookEvent } from '../_lib/yookassa'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const event = req.body as YooKassaWebhookEvent

    console.log('YooKassa webhook received:', event.event, event.object?.id)

    if (event.type !== 'notification') {
      return res.status(200).json({ received: true })
    }

    const paymentData = event.object

    // Find our payment by provider payment ID
    const payment = await prisma.payment.findFirst({
      where: { providerPaymentId: paymentData.id },
    })

    if (!payment) {
      console.error('Payment not found for provider ID:', paymentData.id)
      return res.status(200).json({ received: true })
    }

    // Handle different events
    switch (event.event) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(payment.id, paymentData)
        break
      case 'payment.canceled':
        await handlePaymentCanceled(payment.id, paymentData)
        break
      case 'refund.succeeded':
        await handleRefundSucceeded(payment.id, paymentData)
        break
      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    // Return 200 to prevent retries on our errors
    return res.status(200).json({ received: true, error: 'Internal processing error' })
  }
}

async function handlePaymentSucceeded(paymentId: string, providerData: any) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  })

  if (!payment || payment.status === 'success') {
    return // Already processed or not found
  }

  // Update payment status
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'success',
      providerData: providerData as any,
    },
  })

  if (payment.type === 'subscription') {
    // Activate subscription
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await prisma.subscription.create({
      data: {
        userId: payment.userId,
        price: payment.amount,
        paymentId: payment.providerPaymentId,
        startedAt: now,
        expiresAt,
      },
    })

    // Update user's subscription end date
    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
    })

    // Extend if already has subscription, otherwise set new date
    const currentExpiry = user?.subscriptionUntil
    const newExpiry =
      currentExpiry && currentExpiry > now
        ? new Date(currentExpiry.getTime() + 30 * 24 * 60 * 60 * 1000)
        : expiresAt

    await prisma.user.update({
      where: { id: payment.userId },
      data: { subscriptionUntil: newExpiry },
    })

    console.log(`Subscription activated for user ${payment.userId} until ${newExpiry}`)
  } else if (payment.type === 'track' && payment.trackId) {
    // Create purchase record
    await prisma.purchase.create({
      data: {
        userId: payment.userId,
        trackId: payment.trackId,
        price: payment.amount,
        paymentId: payment.providerPaymentId,
      },
    })

    console.log(`Track ${payment.trackId} purchased by user ${payment.userId}`)
  }
}

async function handlePaymentCanceled(paymentId: string, providerData: any) {
  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'failed',
      providerData: providerData as any,
    },
  })
}

async function handleRefundSucceeded(paymentId: string, providerData: any) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
  })

  if (!payment) return

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'refunded',
      providerData: providerData as any,
    },
  })

  // Note: We don't automatically revoke access on refund
  // This should be handled manually through admin panel
  console.log(`Payment ${paymentId} refunded`)
}
