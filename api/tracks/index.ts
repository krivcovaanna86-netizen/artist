import type { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../_lib/supabase'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      category,
      search,
      sort = 'createdAt',
      order = 'desc',
      page = '1',
      limit = '20',
    } = req.query

    const pageNum = parseInt(page as string, 10)
    const limitNum = Math.min(parseInt(limit as string, 10), 50)
    const skip = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {
      isPublished: true,
    }

    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category as string,
          },
        },
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { artist: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    // Build order clause
    const orderBy: any = {}
    const sortField = sort as string
    if (['createdAt', 'playCount', 'title', 'artist'].includes(sortField)) {
      orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    // Fetch tracks
    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      }),
      prisma.track.count({ where }),
    ])

    // Transform response
    const transformedTracks = tracks.map((track) => ({
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
    }))

    return res.status(200).json({
      tracks: transformedTracks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    })
  } catch (error) {
    console.error('Error fetching tracks:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
