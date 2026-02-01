import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Payment ID required' })
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        track: true,
      },
    })

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' })
    }

    // Verify user owns this payment
    if (payment.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    return res.status(200).json({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      status: payment.status,
      track: payment.track
        ? {
            id: payment.track.id,
            title: payment.track.title,
            artist: payment.track.artist,
          }
        : null,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching payment status:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
