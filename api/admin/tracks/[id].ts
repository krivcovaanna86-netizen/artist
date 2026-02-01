import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'
import { getPublicUrl, deleteFile, BUCKETS } from '../../_lib/supabase'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Track ID required' })
  }

  if (req.method === 'GET') {
    return handleGet(req, res, id)
  } else if (req.method === 'PUT') {
    return handlePut(req, res, id)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const track = await prisma.track.findUnique({
      where: { id },
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
      filePath: track.filePath,
      coverPath: track.coverPath,
      price: track.price,
      isPublished: track.isPublished,
      playCount: track.playCount,
      purchaseCount: track._count.purchases,
      categories: track.categories.map((tc) => ({
        id: tc.category.id,
        name: tc.category.name,
        slug: tc.category.slug,
        icon: tc.category.icon,
      })),
      createdAt: track.createdAt,
      updatedAt: track.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching track:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePut(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const { title, artist, duration, filePath, coverPath, price, categoryIds, isPublished } =
      req.body

    // Check if track exists
    const existingTrack = await prisma.track.findUnique({ where: { id } })
    if (!existingTrack) {
      return res.status(404).json({ error: 'Track not found' })
    }

    // Delete old files if replaced
    if (filePath && existingTrack.filePath !== filePath) {
      try {
        await deleteFile(BUCKETS.TRACKS, existingTrack.filePath)
      } catch (e) {
        console.error('Error deleting old track file:', e)
      }
    }

    if (coverPath && existingTrack.coverPath && existingTrack.coverPath !== coverPath) {
      try {
        await deleteFile(BUCKETS.COVERS, existingTrack.coverPath)
      } catch (e) {
        console.error('Error deleting old cover file:', e)
      }
    }

    // Update track
    const track = await prisma.track.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(artist !== undefined && { artist }),
        ...(duration !== undefined && { duration }),
        ...(filePath !== undefined && { filePath }),
        ...(coverPath !== undefined && { coverPath }),
        ...(price !== undefined && { price }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    })

    // Update categories if provided
    if (categoryIds !== undefined) {
      // Remove existing categories
      await prisma.trackCategory.deleteMany({ where: { trackId: id } })

      // Add new categories
      if (categoryIds.length > 0) {
        await prisma.trackCategory.createMany({
          data: categoryIds.map((categoryId: string) => ({
            trackId: id,
            categoryId,
          })),
        })
      }

      // Refetch with updated categories
      const updatedTrack = await prisma.track.findUnique({
        where: { id },
        include: {
          categories: {
            include: { category: true },
          },
        },
      })

      return res.status(200).json({
        id: updatedTrack!.id,
        title: updatedTrack!.title,
        artist: updatedTrack!.artist,
        duration: updatedTrack!.duration,
        coverUrl: updatedTrack!.coverPath
          ? getPublicUrl(BUCKETS.COVERS, updatedTrack!.coverPath)
          : null,
        filePath: updatedTrack!.filePath,
        coverPath: updatedTrack!.coverPath,
        price: updatedTrack!.price,
        isPublished: updatedTrack!.isPublished,
        categories: updatedTrack!.categories.map((tc) => ({
          id: tc.category.id,
          name: tc.category.name,
          slug: tc.category.slug,
          icon: tc.category.icon,
        })),
        createdAt: updatedTrack!.createdAt,
        updatedAt: updatedTrack!.updatedAt,
      })
    }

    return res.status(200).json({
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
      updatedAt: track.updatedAt,
    })
  } catch (error) {
    console.error('Error updating track:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDelete(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const track = await prisma.track.findUnique({ where: { id } })

    if (!track) {
      return res.status(404).json({ error: 'Track not found' })
    }

    // Delete files from storage
    try {
      await deleteFile(BUCKETS.TRACKS, track.filePath)
    } catch (e) {
      console.error('Error deleting track file:', e)
    }

    if (track.coverPath) {
      try {
        await deleteFile(BUCKETS.COVERS, track.coverPath)
      } catch (e) {
        console.error('Error deleting cover file:', e)
      }
    }

    // Delete track (cascades to track_categories, purchases, etc.)
    await prisma.track.delete({ where: { id } })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting track:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
