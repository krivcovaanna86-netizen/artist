import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import prisma from '../_lib/prisma'
import { createPayment } from '../_lib/yookassa'
import { getSettings } from '../_lib/settings'
import { getPublicUrl, BUCKETS } from '../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { type, trackId, enableAutoRenewal } = req.body

    if (!type || !['subscription', 'track'].includes(type)) {
      return res.status(400).json({ error: 'Invalid payment type' })
    }

    const user = req.user!
    const settings = await getSettings()
    const appUrl = process.env.VITE_APP_URL || 'https://your-app.vercel.app'

    let amount: number
    let description: string
    let track = null
    let savePaymentMethod = false

    if (type === 'subscription') {
      amount = settings.subscriptionPrice
      description = 'Подписка на музыкальный сервис (1 месяц)'
      // Для подписки с автопродлением сохраняем способ оплаты
      savePaymentMethod = enableAutoRenewal === true
    } else {
      if (!trackId) {
        return res.status(400).json({ error: 'Track ID required for track purchase' })
      }

      track = await prisma.track.findUnique({
        where: { id: trackId, isPublished: true },
      })

      if (!track) {
        return res.status(404).json({ error: 'Track not found' })
      }

      // Check if already purchased
      const existingPurchase = await prisma.purchase.findUnique({
        where: {
          userId_trackId: {
            userId: user.id,
            trackId,
          },
        },
      })

      if (existingPurchase) {
        return res.status(400).json({ error: 'Track already purchased' })
      }

      amount = track.price
      description = `Покупка трека: ${track.artist} - ${track.title}`
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        type,
        trackId: type === 'track' ? trackId : null,
        amount,
        status: 'pending',
      },
    })

    // Create YooKassa payment
    const yooKassaPayment = await createPayment({
      amount,
      description,
      returnUrl: `${appUrl}/payment/status?id=${payment.id}`,
      savePaymentMethod, // Для автопродления подписки
      metadata: {
        paymentId: payment.id,
        userId: user.id,
        type,
        trackId: trackId || '',
        enableAutoRenewal: savePaymentMethod ? 'true' : 'false',
      },
    })

    // Update payment with provider ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: yooKassaPayment.id,
        providerData: yooKassaPayment as any,
      },
    })

    return res.status(200).json({
      paymentId: payment.id,
      paymentUrl: yooKassaPayment.confirmation?.confirmation_url,
      amount,
      description,
    })
  } catch (error) {
    console.error('Error creating payment:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
