import type { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Track ID required' })
    }

    const track = await prisma.track.findUnique({
      where: { id, isPublished: true },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    })

    if (!track) {
      return res.status(404).json({ error: 'Track not found' })
    }

    return res.status(200).json({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      coverUrl: track.coverPath ? getPublicUrl(BUCKETS.COVERS, track.coverPath) : null,
      price: track.price,
      playCount: track.playCount,
      categories: track.categories.map((tc) => ({
        id: tc.category.id,
        name: tc.category.name,
        slug: tc.category.slug,
        icon: tc.category.icon,
      })),
      createdAt: track.createdAt,
    })
  } catch (error) {
    console.error('Error fetching track:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
