import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Category ID required' })
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
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    return res.status(200).json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      sortOrder: category.sortOrder,
      trackCount: category._count.tracks,
      createdAt: category.createdAt,
    })
  } catch (error) {
    console.error('Error fetching category:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePut(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const { name, slug, icon, sortOrder } = req.body

    // Check if category exists
    const existing = await prisma.category.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Check if new slug conflicts with another category
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.category.findUnique({ where: { slug } })
      if (slugConflict) {
        return res.status(400).json({ error: 'Category with this slug already exists' })
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(icon !== undefined && { icon }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    })

    return res.status(200).json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      sortOrder: category.sortOrder,
      trackCount: category._count.tracks,
      createdAt: category.createdAt,
    })
  } catch (error) {
    console.error('Error updating category:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDelete(req: AuthenticatedRequest, res: VercelResponse, id: string) {
  try {
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Check if category has tracks
    if (category._count.tracks > 0) {
      return res.status(400).json({
        error: 'Cannot delete category with tracks. Remove tracks first.',
        trackCount: category._count.tracks,
      })
    }

    await prisma.category.delete({ where: { id } })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
