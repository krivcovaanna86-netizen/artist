import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { sort = 'playCount', order = 'desc', limit = '10' } = req.query
    const limitNum = Math.min(parseInt(limit as string, 10), 50)

    // Build order clause
    const orderBy: any = {}
    const sortField = sort as string
    if (['playCount', 'createdAt', 'title'].includes(sortField)) {
      orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.playCount = 'desc'
    }

    // Top tracks by plays
    const topByPlays = await prisma.track.findMany({
      where: { isPublished: true },
      orderBy: { playCount: 'desc' },
      take: limitNum,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    })

    // Top tracks by purchases
    const purchaseStats = await prisma.purchase.groupBy({
      by: ['trackId'],
      _count: { trackId: true },
      _sum: { price: true },
      orderBy: { _count: { trackId: 'desc' } },
      take: limitNum,
    })

    const topPurchasedIds = purchaseStats.map((p) => p.trackId)
    const topPurchasedTracks = await prisma.track.findMany({
      where: { id: { in: topPurchasedIds } },
    })
    const trackMap = new Map(topPurchasedTracks.map((t) => [t.id, t]))

    const topBySales = purchaseStats.map((stat) => {
      const track = trackMap.get(stat.trackId)
      return {
        id: track?.id,
        title: track?.title,
        artist: track?.artist,
        coverUrl: track?.coverPath ? getPublicUrl(BUCKETS.COVERS, track.coverPath) : null,
        purchaseCount: stat._count.trackId,
        revenue: stat._sum.price || 0,
      }
    })

    // All tracks with full stats
    const allTracks = await prisma.track.findMany({
      where: { isPublished: true },
      orderBy,
      take: limitNum * 2,
      include: {
        _count: {
          select: { purchases: true },
        },
      },
    })

    const trackIds = allTracks.map((t) => t.id)
    const revenueStats = await prisma.purchase.groupBy({
      by: ['trackId'],
      where: { trackId: { in: trackIds } },
      _sum: { price: true },
    })
    const revenueMap = new Map(revenueStats.map((r) => [r.trackId, r._sum.price || 0]))

    return res.status(200).json({
      topByPlays: topByPlays.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverPath ? getPublicUrl(BUCKETS.COVERS, track.coverPath) : null,
        playCount: track.playCount,
        purchaseCount: track._count.purchases,
        revenue: revenueMap.get(track.id) || 0,
      })),
      topBySales,
      allTracks: allTracks.map((track) => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        coverUrl: track.coverPath ? getPublicUrl(BUCKETS.COVERS, track.coverPath) : null,
        playCount: track.playCount,
        purchaseCount: track._count.purchases,
        revenue: revenueMap.get(track.id) || 0,
      })),
    })
  } catch (error) {
    console.error('Error fetching track stats:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
