import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import prisma from '../_lib/prisma'
import { getSettings } from '../_lib/settings'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const user = req.user!
    const settings = await getSettings()

    // Get subscription history
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const isActive = user.subscriptionUntil && user.subscriptionUntil > new Date()

    return res.status(200).json({
      subscription: {
        isActive,
        expiresAt: user.subscriptionUntil,
        price: settings.subscriptionPrice,
        history: subscriptions.map((sub) => ({
          id: sub.id,
          price: sub.price,
          startedAt: sub.startedAt,
          expiresAt: sub.expiresAt,
        })),
      },
    })
  } catch (error) {
    console.error('Error fetching subscription:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
