import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import prisma from '../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const purchases = await prisma.purchase.findMany({
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
      orderBy: { createdAt: 'desc' },
    })

    const transformedPurchases = purchases.map((purchase) => ({
      id: purchase.id,
      purchasedAt: purchase.createdAt,
      price: purchase.price,
      track: {
        id: purchase.track.id,
        title: purchase.track.title,
        artist: purchase.track.artist,
        duration: purchase.track.duration,
        coverUrl: purchase.track.coverPath
          ? getPublicUrl(BUCKETS.COVERS, purchase.track.coverPath)
          : null,
        categories: purchase.track.categories.map((tc) => ({
          id: tc.category.id,
          name: tc.category.name,
          slug: tc.category.slug,
        })),
      },
    }))

    return res.status(200).json({ purchases: transformedPurchases })
  } catch (error) {
    console.error('Error fetching purchases:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
