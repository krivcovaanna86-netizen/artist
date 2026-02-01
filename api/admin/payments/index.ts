import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest, serializeUser } from '../../_lib/auth'
import prisma from '../../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      type,
      status,
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

    if (type && ['subscription', 'track'].includes(type as string)) {
      where.type = type
    }

    if (status && ['pending', 'success', 'failed', 'refunded'].includes(status as string)) {
      where.status = status
    }

    // Build order clause
    const orderBy: any = {}
    const sortField = sort as string
    if (['createdAt', 'amount', 'status'].includes(sortField)) {
      orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          user: true,
          track: true,
        },
      }),
      prisma.payment.count({ where }),
    ])

    const transformedPayments = payments.map((payment) => ({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      status: payment.status,
      providerPaymentId: payment.providerPaymentId,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      user: {
        id: payment.user.id,
        telegramId: payment.user.telegramId.toString(),
        username: payment.user.username,
        firstName: payment.user.firstName,
        lastName: payment.user.lastName,
      },
      track: payment.track
        ? {
            id: payment.track.id,
            title: payment.track.title,
            artist: payment.track.artist,
            coverUrl: payment.track.coverPath
              ? getPublicUrl(BUCKETS.COVERS, payment.track.coverPath)
              : null,
          }
        : null,
    }))

    return res.status(200).json({
      payments: transformedPayments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching payments:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
