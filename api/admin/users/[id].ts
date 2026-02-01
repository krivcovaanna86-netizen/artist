import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest, serializeUser } from '../../_lib/auth'
import prisma from '../../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'User ID required' })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        purchases: {
          include: { track: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        playHistory: {
          include: { track: true },
          orderBy: { playedAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            purchases: true,
            playHistory: true,
          },
        },
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Calculate total spent
    const totalSpent = await prisma.payment.aggregate({
      where: { userId: id, status: 'success' },
      _sum: { amount: true },
    })

    const now = new Date()

    return res.status(200).json({
      user: {
        ...serializeUser(user),
        hasActiveSubscription: user.subscriptionUntil && user.subscriptionUntil > now,
        purchaseCount: user._count.purchases,
        playCount: user._count.playHistory,
        totalSpent: totalSpent._sum.amount || 0,
      },
      purchases: user.purchases.map((p) => ({
        id: p.id,
        price: p.price,
        createdAt: p.createdAt,
        track: {
          id: p.track.id,
          title: p.track.title,
          artist: p.track.artist,
          coverUrl: p.track.coverPath ? getPublicUrl(BUCKETS.COVERS, p.track.coverPath) : null,
        },
      })),
      subscriptions: user.subscriptions.map((s) => ({
        id: s.id,
        price: s.price,
        startedAt: s.startedAt,
        expiresAt: s.expiresAt,
      })),
      payments: user.payments.map((p) => ({
        id: p.id,
        type: p.type,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
      })),
      recentPlays: user.playHistory.map((h) => ({
        id: h.id,
        playedAt: h.playedAt,
        completed: h.completed,
        track: {
          id: h.track.id,
          title: h.track.title,
          artist: h.track.artist,
          coverUrl: h.track.coverPath ? getPublicUrl(BUCKETS.COVERS, h.track.coverPath) : null,
        },
      })),
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
