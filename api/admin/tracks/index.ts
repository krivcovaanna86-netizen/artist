import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const {
      search,
      category,
      published,
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

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { artist: { contains: search as string, mode: 'insensitive' } },
      ]
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

    if (published !== undefined) {
      where.isPublished = published === 'true'
    }

    // Build order clause
    const orderBy: any = {}
    const sortField = sort as string
    if (['createdAt', 'playCount', 'title', 'artist', 'price'].includes(sortField)) {
      orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [tracks, total] = await Promise.all([
      prisma.track.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          categories: {
            include: { category: true },
          },
          _count: {
            select: {
              purchases: true,
              playHistory: true,
            },
          },
        },
      }),
      prisma.track.count({ where }),
    ])

    // Calculate revenue for each track
    const trackIds = tracks.map((t) => t.id)
    const purchaseStats = await prisma.purchase.groupBy({
      by: ['trackId'],
      where: { trackId: { in: trackIds } },
      _sum: { price: true },
    })
    const revenueMap = new Map(purchaseStats.map((p) => [p.trackId, p._sum.price || 0]))

    const transformedTracks = tracks.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      coverUrl: track.coverPath ? getPublicUrl(BUCKETS.COVERS, track.coverPath) : null,
      filePath: track.filePath,
      coverPath: track.coverPath,
      price: track.price,
      isPublished: track.isPublished,
      playCount: track.playCount,
      purchaseCount: track._count.purchases,
      revenue: revenueMap.get(track.id) || 0,
      categories: track.categories.map((tc) => ({
        id: tc.category.id,
        name: tc.category.name,
        slug: tc.category.slug,
        icon: tc.category.icon,
      })),
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
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

async function handlePost(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { title, artist, duration, filePath, coverPath, price, categoryIds, isPublished } =
      req.body

    if (!title || !artist || !filePath) {
      return res.status(400).json({ error: 'Title, artist, and filePath are required' })
    }

    const track = await prisma.track.create({
      data: {
        title,
        artist,
        duration: duration || 0,
        filePath,
        coverPath,
        price: price || 0,
        isPublished: isPublished || false,
        categories: {
          create:
            categoryIds?.map((categoryId: string) => ({
              category: { connect: { id: categoryId } },
            })) || [],
        },
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    })

    return res.status(201).json({
      id: track.id,
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      coverUrl: track.coverPath ? getPublicUrl(BUCKETS.COVERS, track.coverPath) : null,
      filePath: track.filePath,
      coverPath: track.coverPath,
      price: track.price,
      isPublished: track.isPublished,
      categories: track.categories.map((tc) => ({
        id: tc.category.id,
        name: tc.category.name,
        slug: tc.category.slug,
        icon: tc.category.icon,
      })),
      createdAt: track.createdAt,
    })
  } catch (error) {
    console.error('Error creating track:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
