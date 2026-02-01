import type { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from '../_lib/prisma'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: {
            tracks: {
              where: {
                track: {
                  isPublished: true,
                },
              },
            },
          },
        },
      },
    })

    return res.status(200).json({
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        trackCount: cat._count.tracks,
      })),
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
