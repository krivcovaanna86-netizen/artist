import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest, serializeUser } from '../_lib/auth'
import prisma from '../_lib/prisma'
import { getPublicUrl, BUCKETS, supabaseAdmin } from '../_lib/supabase'
import { getSettings, updateSettings } from '../_lib/settings'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  const { path } = req.query
  const route = Array.isArray(path) ? path.join('/') : path || ''
  const method = req.method

  try {
// UPLOAD URL
if (route === 'upload-url' && method === 'POST') {
  const { fileName, fileType, bucket } = req.body
  if (!fileName || !fileType || !bucket) {
    return res.status(400).json({ error: 'fileName, fileType, and bucket are required' })
  }
  const bucketName = bucket === 'tracks' ? BUCKETS.TRACKS : BUCKETS.COVERS
  const filePath = `${Date.now()}-${fileName}`
  const { data, error } = await supabaseAdmin.storage.from(bucketName).createSignedUploadUrl(filePath)
  if (error) throw error
  return res.status(200).json({ uploadUrl: data.signedUrl, filePath, token: data.token })
}


    // CATEGORIES - GET ALL
    if (route === 'categories' && method === 'GET') {
      const categories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { tracks: true } } },
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
    }

    // CATEGORIES - CREATE
    if (route === 'categories' && method === 'POST') {
      const { name, slug, icon, sortOrder } = req.body
      if (!name || !slug) {
        return res.status(400).json({ error: 'Name and slug are required' })
      }
      const existing = await prisma.category.findUnique({ where: { slug } })
      if (existing) {
        return res.status(400).json({ error: 'Category with this slug already exists' })
      }
      const category = await prisma.category.create({
        data: { name, slug, icon, sortOrder: sortOrder || 0 },
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
    }

    // CATEGORIES - GET ONE
    if (route.match(/^categories\/[^/]+$/) && method === 'GET') {
      const id = route.split('/')[1]
      const category = await prisma.category.findUnique({
        where: { id },
        include: { _count: { select: { tracks: true } } },
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
    }

    // CATEGORIES - UPDATE
    if (route.match(/^categories\/[^/]+$/) && method === 'PUT') {
      const id = route.split('/')[1]
      const { name, slug, icon, sortOrder } = req.body
      if (slug) {
        const existing = await prisma.category.findFirst({
          where: { slug, NOT: { id } },
        })
        if (existing) {
          return res.status(400).json({ error: 'Category with this slug already exists' })
        }
      }
      const category = await prisma.category.update({
        where: { id },
        data: { name, slug, icon, sortOrder },
      })
      return res.status(200).json({
        id: category.id,
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: category.sortOrder,
      })
    }

    // CATEGORIES - DELETE
    if (route.match(/^categories\/[^/]+$/) && method === 'DELETE') {
      const id = route.split('/')[1]
      await prisma.trackCategory.deleteMany({ where: { categoryId: id } })
      await prisma.category.delete({ where: { id } })
      return res.status(200).json({ success: true })
    }

    // PAYMENTS - GET ALL
    if (route === 'payments' && method === 'GET') {
      const { type, status, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query
      const pageNum = parseInt(page as string, 10)
      const limitNum = Math.min(parseInt(limit as string, 10), 100)
      const skip = (pageNum - 1) * limitNum
      const where: any = {}
      if (type && ['subscription', 'track'].includes(type as string)) {
        where.type = type
      }
      if (status && ['pending', 'success', 'failed', 'refunded'].includes(status as string)) {
        where.status = status
      }
      const orderBy: any = {}
      const sortField = sort as string
      if (['createdAt', 'amount', 'status'].includes(sortField)) {
        orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
      } else {
        orderBy.createdAt = 'desc'
      }
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: { user: true, track: true },
        }),
        prisma.payment.count({ where }),
      ])
      return res.status(200).json({
        payments: payments.map((p) => ({
          id: p.id,
          type: p.type,
          amount: p.amount,
          status: p.status,
          providerPaymentId: p.providerPaymentId,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          user: {
            id: p.user.id,
            telegramId: p.user.telegramId.toString(),
            username: p.user.username,
            firstName: p.user.firstName,
            lastName: p.user.lastName,
          },
          track: p.track
            ? {
                id: p.track.id,
                title: p.track.title,
                artist: p.track.artist,
                coverUrl: p.track.coverPath ? getPublicUrl(BUCKETS.COVERS, p.track.coverPath) : null,
              }
            : null,
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      })
    }

    // SETTINGS - GET
    if (route === 'settings' && method === 'GET') {
      const settings = await getSettings()
      return res.status(200).json({ settings })
    }

    // SETTINGS - UPDATE
    if (route === 'settings' && method === 'PUT') {
      const { subscriptionPrice, dailyPlayLimit, defaultTrackPrice, supportEmail, supportTelegram } = req.body
      if (subscriptionPrice !== undefined && (subscriptionPrice < 0 || subscriptionPrice > 100000000)) {
        return res.status(400).json({ error: 'Invalid subscription price' })
      }
      if (dailyPlayLimit !== undefined && (dailyPlayLimit < 0 || dailyPlayLimit > 100)) {
        return res.status(400).json({ error: 'Invalid daily play limit' })
      }
      if (defaultTrackPrice !== undefined && (defaultTrackPrice < 0 || defaultTrackPrice > 100000000)) {
        return res.status(400).json({ error: 'Invalid default track price' })
      }
      const settings = await updateSettings({
        subscriptionPrice,
        dailyPlayLimit,
        defaultTrackPrice,
        supportEmail,
        supportTelegram,
      })
      return res.status(200).json({ settings })
    }

    // STATS - OVERVIEW
    if (route === 'stats/overview' && method === 'GET') {
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000)

      const totalUsers = await prisma.user.count()

      const [activeToday, activeWeek, activeMonth] = await Promise.all([
        prisma.playHistory.groupBy({ by: ['userId'], where: { playedAt: { gte: todayStart } } }),
        prisma.playHistory.groupBy({ by: ['userId'], where: { playedAt: { gte: weekAgo } } }),
        prisma.playHistory.groupBy({ by: ['userId'], where: { playedAt: { gte: monthAgo } } }),
      ])

      const [playsToday, playsWeek, playsMonth] = await Promise.all([
        prisma.playHistory.count({ where: { playedAt: { gte: todayStart } } }),
        prisma.playHistory.count({ where: { playedAt: { gte: weekAgo } } }),
        prisma.playHistory.count({ where: { playedAt: { gte: monthAgo } } }),
      ])

      const revenueWhere = { status: 'success' as const }
      const [revenueToday, revenueWeek, revenueMonth, revenueTotal] = await Promise.all([
        prisma.payment.aggregate({ where: { ...revenueWhere, createdAt: { gte: todayStart } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { ...revenueWhere, createdAt: { gte: weekAgo } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: { ...revenueWhere, createdAt: { gte: monthAgo } }, _sum: { amount: true } }),
        prisma.payment.aggregate({ where: revenueWhere, _sum: { amount: true } }),
      ])

      const activeSubscriptions = await prisma.user.count({ where: { subscriptionUntil: { gt: now } } })

      const [newSubsWeek, newSubsMonth] = await Promise.all([
        prisma.subscription.count({ where: { createdAt: { gte: weekAgo } } }),
        prisma.subscription.count({ where: { createdAt: { gte: monthAgo } } }),
      ])

      const totalTracks = await prisma.track.count({ where: { isPublished: true } })
      const totalPurchases = await prisma.purchase.count()

      return res.status(200).json({
        users: {
          total: totalUsers,
          activeToday: activeToday.length,
          activeWeek: activeWeek.length,
          activeMonth: activeMonth.length,
        },
        plays: { today: playsToday, week: playsWeek, month: playsMonth },
        revenue: {
          today: revenueToday._sum.amount || 0,
          week: revenueWeek._sum.amount || 0,
          month: revenueMonth._sum.amount || 0,
          total: revenueTotal._sum.amount || 0,
        },
        subscriptions: { active: activeSubscriptions, newWeek: newSubsWeek, newMonth: newSubsMonth },
        tracks: { total: totalTracks, purchases: totalPurchases },
      })
    }

    // STATS - CHARTS
    if (route === 'stats/charts' && method === 'GET') {
      const { days = '30' } = req.query
      const daysNum = Math.min(parseInt(days as string, 10), 90)
      const now = new Date()
      const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000)

      const dates: string[] = []
      for (let i = 0; i < daysNum; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        dates.push(date.toISOString().split('T')[0])
      }

      const playsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(played_at) as date, COUNT(*) as count
        FROM play_history WHERE played_at >= ${startDate}
        GROUP BY DATE(played_at) ORDER BY date`

      const revenueByDay = await prisma.$queryRaw<{ date: string; amount: bigint }[]>`
        SELECT DATE(created_at) as date, SUM(amount) as amount
        FROM payments WHERE status = 'success' AND created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date`

      const usersByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date`

      const subsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM subscriptions WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date`

      const playsMap = new Map(playsByDay.map((p) => [new Date(p.date).toISOString().split('T')[0], Number(p.count)]))
      const revenueMap = new Map(revenueByDay.map((r) => [new Date(r.date).toISOString().split('T')[0], Number(r.amount)]))
      const usersMap = new Map(usersByDay.map((u) => [new Date(u.date).toISOString().split('T')[0], Number(u.count)]))
      const subsMap = new Map(subsByDay.map((s) => [new Date(s.date).toISOString().split('T')[0], Number(s.count)]))

      return res.status(200).json({
        labels: dates,
        plays: dates.map((d) => playsMap.get(d) || 0),
        revenue: dates.map((d) => revenueMap.get(d) || 0),
        users: dates.map((d) => usersMap.get(d) || 0),
        subscriptions: dates.map((d) => subsMap.get(d) || 0),
      })
    }

    // STATS - TRACKS
    if (route === 'stats/tracks' && method === 'GET') {
      const { limit = '10' } = req.query
      const limitNum = Math.min(parseInt(limit as string, 10), 50)

      const topByPlays = await prisma.track.findMany({
        where: { isPublished: true },
        orderBy: { playCount: 'desc' },
        take: limitNum,
        include: { _count: { select: { purchases: true } } },
      })

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

      const trackIds = topByPlays.map((t) => t.id)
      const revenueStats = await prisma.purchase.groupBy({
        by: ['trackId'],
        where: { trackId: { in: trackIds } },
        _sum: { price: true },
      })
      const revenueMap = new Map(revenueStats.map((r) => [r.trackId, r._sum.price || 0]))

      return res.status(200).json({
        topByPlays: topByPlays.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          coverUrl: t.coverPath ? getPublicUrl(BUCKETS.COVERS, t.coverPath) : null,
          playCount: t.playCount,
          purchaseCount: t._count.purchases,
          revenue: revenueMap.get(t.id) || 0,
        })),
        topBySales,
      })
    }

    // TRACKS - GET ALL
    if (route === 'tracks' && method === 'GET') {
      const { search, category, published, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query
      const pageNum = parseInt(page as string, 10)
      const limitNum = Math.min(parseInt(limit as string, 10), 100)
      const skip = (pageNum - 1) * limitNum

      const where: any = {}
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { artist: { contains: search as string, mode: 'insensitive' } },
        ]
      }
      if (category) {
        where.categories = { some: { category: { slug: category as string } } }
      }
      if (published !== undefined) {
        where.isPublished = published === 'true'
      }

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
            categories: { include: { category: true } },
            _count: { select: { purchases: true, playHistory: true } },
          },
        }),
        prisma.track.count({ where }),
      ])

      const trackIds = tracks.map((t) => t.id)
      const purchaseStats = await prisma.purchase.groupBy({
        by: ['trackId'],
        where: { trackId: { in: trackIds } },
        _sum: { price: true },
      })
      const revenueMap = new Map(purchaseStats.map((p) => [p.trackId, p._sum.price || 0]))

      return res.status(200).json({
        tracks: tracks.map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          duration: t.duration,
          coverUrl: t.coverPath ? getPublicUrl(BUCKETS.COVERS, t.coverPath) : null,
          filePath: t.filePath,
          coverPath: t.coverPath,
          price: t.price,
          isPublished: t.isPublished,
          playCount: t.playCount,
          purchaseCount: t._count.purchases,
          revenue: revenueMap.get(t.id) || 0,
          categories: t.categories.map((tc) => ({
            id: tc.category.id,
            name: tc.category.name,
            slug: tc.category.slug,
            icon: tc.category.icon,
          })),
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      })
    }

    // TRACKS - CREATE
    if (route === 'tracks' && method === 'POST') {
      const { title, artist, duration, filePath, coverPath, price, categoryIds, isPublished } = req.body
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
            create: categoryIds?.map((categoryId: string) => ({
              category: { connect: { id: categoryId } },
            })) || [],
          },
        },
        include: { categories: { include: { category: true } } },
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
    }

    // TRACKS - GET ONE
    if (route.match(/^tracks\/[^/]+$/) && method === 'GET') {
      const id = route.split('/')[1]
      const track = await prisma.track.findUnique({
        where: { id },
        include: {
          categories: { include: { category: true } },
          _count: { select: { purchases: true } },
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
    }

    // TRACKS - UPDATE
    if (route.match(/^tracks\/[^/]+$/) && method === 'PUT') {
      const id = route.split('/')[1]
      const { title, artist, duration, filePath, coverPath, price, categoryIds, isPublished } = req.body
      await prisma.trackCategory.deleteMany({ where: { trackId: id } })
      const track = await prisma.track.update({
        where: { id },
        data: {
          title,
          artist,
          duration,
          filePath,
          coverPath,
          price,
          isPublished,
          categories: {
            create: categoryIds?.map((categoryId: string) => ({
              category: { connect: { id: categoryId } },
            })) || [],
          },
        },
        include: { categories: { include: { category: true } } },
      })
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
    }

    // TRACKS - DELETE
    if (route.match(/^tracks\/[^/]+$/) && method === 'DELETE') {
      const id = route.split('/')[1]
      await prisma.trackCategory.deleteMany({ where: { trackId: id } })
      await prisma.playHistory.deleteMany({ where: { trackId: id } })
      await prisma.purchase.deleteMany({ where: { trackId: id } })
      await prisma.track.delete({ where: { id } })
      return res.status(200).json({ success: true })
    }

    // USERS - GET ALL
    if (route === 'users' && method === 'GET') {
      const { search, filter, sort = 'createdAt', order = 'desc', page = '1', limit = '20' } = req.query
      const pageNum = parseInt(page as string, 10)
      const limitNum = Math.min(parseInt(limit as string, 10), 100)
      const skip = (pageNum - 1) * limitNum
      const where: any = {}
      const now = new Date()

      if (search) {
        where.OR = [
          { username: { contains: search as string, mode: 'insensitive' } },
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
        ]
      }
      if (filter === 'subscribed') {
        where.subscriptionUntil = { gt: now }
      } else if (filter === 'unsubscribed') {
        where.OR = [{ subscriptionUntil: null }, { subscriptionUntil: { lte: now } }]
      } else if (filter === 'purchased') {
        where.purchases = { some: {} }
      }

      const orderBy: any = {}
      const sortField = sort as string
      if (['createdAt', 'firstName', 'username'].includes(sortField)) {
        orderBy[sortField] = order === 'asc' ? 'asc' : 'desc'
      } else {
        orderBy.createdAt = 'desc'
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          orderBy,
          skip,
          take: limitNum,
          include: { _count: { select: { purchases: true, playHistory: true } } },
        }),
        prisma.user.count({ where }),
      ])

      const userIds = users.map((u) => u.id)
      const spentStats = await prisma.payment.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, status: 'success' },
        _sum: { amount: true },
      })
      const spentMap = new Map(spentStats.map((s) => [s.userId, s._sum.amount || 0]))

      return res.status(200).json({
        users: users.map((u) => ({
          ...serializeUser(u),
          hasActiveSubscription: u.subscriptionUntil && u.subscriptionUntil > now,
          purchaseCount: u._count.purchases,
          playCount: u._count.playHistory,
          totalSpent: spentMap.get(u.id) || 0,
        })),
        pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
      })
    }

    // USERS - GET ONE
    if (route.match(/^users\/[^/]+$/) && method === 'GET') {
      const id = route.split('/')[1]
      const user = await prisma.user.findUnique({
        where: { id },
        include: { _count: { select: { purchases: true, playHistory: true } } },
      })
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      const spent = await prisma.payment.aggregate({
        where: { userId: id, status: 'success' },
        _sum: { amount: true },
      })
      const now = new Date()
      return res.status(200).json({
        ...serializeUser(user),
        hasActiveSubscription: user.subscriptionUntil && user.subscriptionUntil > now,
        purchaseCount: user._count.purchases,
        playCount: user._count.playHistory,
        totalSpent: spent._sum.amount || 0,
      })
    }

    // USERS - UPDATE
    if (route.match(/^users\/[^/]+$/) && method === 'PUT') {
      const id = route.split('/')[1]
      const { isAdmin, subscriptionUntil } = req.body
      const user = await prisma.user.update({
        where: { id },
        data: {
          isAdmin,
          subscriptionUntil: subscriptionUntil ? new Date(subscriptionUntil) : undefined,
        },
      })
      return res.status(200).json(serializeUser(user))
    }

    return res.status(404).json({ error: 'Not found' })
  } catch (error) {
    console.error('Admin API error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
