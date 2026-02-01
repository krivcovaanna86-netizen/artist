import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest, serializeUser } from '../../_lib/auth'
import prisma from '../../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      search,
      filter,
      sort = 'createdAt',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 100)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {}
    const now = new Date()

    if (search) {
      where.OR = [
        { username: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    if (filter === 'subscribed') {
      where.subscriptionUntil = { gt: now }
    } else if (filter === 'unsubscribed') {
      where.OR = [{ subscriptionUntil: null }, { subscriptionUntil: { lte: now } }]
    } else if (filter === 'purchased') {
      where.purchases = { some: {} }
    }

    // Build order clause
    const orderBy: any = {}
    const sortField = sort as string
    if (['createdAt', 'firstName', 'username'].includes(sortField)) {
      orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          _count: {
            select: {
              purchases: true,
              playHistory: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ])

    // Get total spent for each user
    const userIds = users.map((u) => u.id)
    const spentStats = await prisma.payment.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'success',
      },
      _sum: { amount: true },
    })
    const spentMap = new Map(spentStats.map((s) => [s.userId, s._sum.amount || 0]))

    const transformedUsers = users.map((user) => ({
      ...serializeUser(user),
      hasActiveSubscription: user.subscriptionUntil && user.subscriptionUntil > now,
      purchaseCount: user._count.purchases,
      playCount: user._count.playHistory,
      totalSpent: spentMap.get(user.id) || 0,
    }))

    return res.status(200).json({
      users: transformedUsers,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
