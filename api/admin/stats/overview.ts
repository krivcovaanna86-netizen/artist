import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Total users
    const totalUsers = await prisma.user.count()

    // Active users
    const [activeToday, activeWeek, activeMonth] = await Promise.all([
      prisma.playHistory.groupBy({
        by: ['userId'],
        where: { playedAt: { gte: todayStart } },
      }),
      prisma.playHistory.groupBy({
        by: ['userId'],
        where: { playedAt: { gte: weekAgo } },
      }),
      prisma.playHistory.groupBy({
        by: ['userId'],
        where: { playedAt: { gte: monthAgo } },
      }),
    ])

    // Total plays
    const [playsToday, playsWeek, playsMonth] = await Promise.all([
      prisma.playHistory.count({ where: { playedAt: { gte: todayStart } } }),
      prisma.playHistory.count({ where: { playedAt: { gte: weekAgo } } }),
      prisma.playHistory.count({ where: { playedAt: { gte: monthAgo } } }),
    ])

    // Revenue
    const revenueWhere = { status: 'success' }
    const [revenueToday, revenueWeek, revenueMonth, revenueTotal] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...revenueWhere, createdAt: { gte: todayStart } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...revenueWhere, createdAt: { gte: weekAgo } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...revenueWhere, createdAt: { gte: monthAgo } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: revenueWhere,
        _sum: { amount: true },
      }),
    ])

    // Active subscriptions
    const activeSubscriptions = await prisma.user.count({
      where: { subscriptionUntil: { gt: now } },
    })

    // New subscriptions
    const [newSubsWeek, newSubsMonth] = await Promise.all([
      prisma.subscription.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.subscription.count({ where: { createdAt: { gte: monthAgo } } }),
    ])

    // Track stats
    const totalTracks = await prisma.track.count({ where: { isPublished: true } })
    const totalPurchases = await prisma.purchase.count()

    return res.status(200).json({
      users: {
        total: totalUsers,
        activeToday: activeToday.length,
        activeWeek: activeWeek.length,
        activeMonth: activeMonth.length,
      },
      plays: {
        today: playsToday,
        week: playsWeek,
        month: playsMonth,
      },
      revenue: {
        today: revenueToday._sum.amount || 0,
        week: revenueWeek._sum.amount || 0,
        month: revenueMonth._sum.amount || 0,
        total: revenueTotal._sum.amount || 0,
      },
      subscriptions: {
        active: activeSubscriptions,
        newWeek: newSubsWeek,
        newMonth: newSubsMonth,
      },
      tracks: {
        total: totalTracks,
        purchases: totalPurchases,
      },
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
