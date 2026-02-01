import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import prisma from '../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { page = '1', limit = '20' } = req.query
    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 50)
    const skip = (pageNum - 1) * limitNum

    const [history, total] = await Promise.all([
      prisma.playHistory.findMany({
        where: { userId: req.user!.id },
        include: {
          track: {
            include: {
              categories: {
                include: { category: true },
              },
            },
          },
        },
        orderBy: { playedAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.playHistory.count({ where: { userId: req.user!.id } }),
    ])

    const transformedHistory = history.map((item) => ({
      id: item.id,
      playedAt: item.playedAt,
      completed: item.completed,
      track: {
        id: item.track.id,
        title: item.track.title,
        artist: item.track.artist,
        duration: item.track.duration,
        coverUrl: item.track.coverPath
          ? getPublicUrl(BUCKETS.COVERS, item.track.coverPath)
          : null,
        categories: item.track.categories.map((tc) => ({
          id: tc.category.id,
          name: tc.category.name,
          slug: tc.category.slug,
        })),
      },
    }))

    return res.status(200).json({
      history: transformedHistory,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching history:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
