import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'

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
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { tracks: true },
        },
      },
    })

    return res.status(200).json({
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        trackCount: cat._count.tracks,
        createdAt: cat.createdAt,
      })),
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePost(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { name, slug, icon, sortOrder } = req.body

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' })
    }

    // Check if slug already exists
    const existing = await prisma.category.findUnique({ where: { slug } })
    if (existing) {
      return res.status(400).json({ error: 'Category with this slug already exists' })
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        icon,
        sortOrder: sortOrder || 0,
      },
    })

    return res.status(201).json({
      id: category.id,
      name: category.name,
      slug: category.slug,
      icon: category.icon,
      sortOrder: category.sortOrder,
      trackCount: 0,
      createdAt: category.createdAt,
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
