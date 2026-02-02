import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest, serializeUser } from '../_lib/auth'
import prisma from '../_lib/prisma'
import { getPublicUrl, BUCKETS } from '../_lib/supabase'
import { getSettings } from '../_lib/settings'

// Helper to parse route from URL
function parseRoute(url: string): string {
  // URL like /api/user/profile -> profile
  const match = url.match(/\/api\/user\/?(.*)/)
  if (!match) return ''
  
  // Remove query string
  let route = match[1].split('?')[0]
  // Remove trailing slash
  route = route.replace(/\/$/, '')
  
  console.log('[User API] URL:', url, '-> Route:', route)
  return route
}

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const url = req.url || ''
  const route = parseRoute(url)
  
  console.log('[User API] Route:', route)

  try {
    // PROFILE
    if (route === 'profile' || route === '') {
      const user = req.user!
      return res.status(200).json({
        user: {
          ...serializeUser(user),
          hasActiveSubscription: user.subscriptionUntil && user.subscriptionUntil > new Date(),
        },
      })
    }

    // PURCHASES
    if (route === 'purchases') {
      const purchases = await prisma.purchase.findMany({
        where: { userId: req.user!.id },
        include: {
          track: {
            include: {
              categories: { include: { category: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      return res.status(200).json({
        purchases: purchases.map((purchase) => ({
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
        })),
      })
    }

    // HISTORY
    if (route === 'history') {
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
                categories: { include: { category: true } },
              },
            },
          },
          orderBy: { playedAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.playHistory.count({ where: { userId: req.user!.id } }),
      ])

      return res.status(200).json({
        history: history.map((item) => ({
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
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      })
    }

    // SUBSCRIPTION
    if (route === 'subscription') {
      const user = req.user!
      const settings = await getSettings()

      const subscriptions = await prisma.subscription.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })

      const isActive = user.subscriptionUntil && user.subscriptionUntil > new Date()

      return res.status(200).json({
        subscription: {
          isActive: !!isActive,
          expiresAt: user.subscriptionUntil,
          price: settings.subscriptionPrice,
          history: subscriptions.map((sub) => ({
            id: sub.id,
            price: sub.price,
            startedAt: sub.startedAt,
            expiresAt: sub.expiresAt,
          })),
        },
      })
    }

    return res.status(404).json({ error: 'User endpoint not found', route })
  } catch (error) {
    console.error('User API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
