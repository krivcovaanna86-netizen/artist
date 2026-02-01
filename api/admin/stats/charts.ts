import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import prisma from '../../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { days = '30' } = req.query
    const daysNum = Math.min(parseInt(days as string, 10), 90)

    const now = new Date()
    const startDate = new Date(now.getTime() - daysNum * 24 * 60 * 60 * 1000)

    // Generate date labels
    const dates: string[] = []
    for (let i = 0; i < daysNum; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
      dates.push(date.toISOString().split('T')[0])
    }

    // Get plays by day
    const playsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(played_at) as date, COUNT(*) as count
      FROM play_history
      WHERE played_at >= ${startDate}
      GROUP BY DATE(played_at)
      ORDER BY date
    `

    // Get revenue by day
    const revenueByDay = await prisma.$queryRaw<{ date: string; amount: bigint }[]>`
      SELECT DATE(created_at) as date, SUM(amount) as amount
      FROM payments
      WHERE status = 'success' AND created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    // Get new users by day
    const usersByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    // Get new subscriptions by day
    const subsByDay = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM subscriptions
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date
    `

    // Convert to maps for easy lookup
    const playsMap = new Map(
      playsByDay.map((p) => [
        new Date(p.date).toISOString().split('T')[0],
        Number(p.count),
      ])
    )
    const revenueMap = new Map(
      revenueByDay.map((r) => [
        new Date(r.date).toISOString().split('T')[0],
        Number(r.amount),
      ])
    )
    const usersMap = new Map(
      usersByDay.map((u) => [
        new Date(u.date).toISOString().split('T')[0],
        Number(u.count),
      ])
    )
    const subsMap = new Map(
      subsByDay.map((s) => [
        new Date(s.date).toISOString().split('T')[0],
        Number(s.count),
      ])
    )

    // Build arrays with all dates
    const plays = dates.map((date) => playsMap.get(date) || 0)
    const revenue = dates.map((date) => revenueMap.get(date) || 0)
    const users = dates.map((date) => usersMap.get(date) || 0)
    const subscriptions = dates.map((date) => subsMap.get(date) || 0)

    return res.status(200).json({
      labels: dates,
      plays,
      revenue,
      users,
      subscriptions,
    })
  } catch (error) {
    console.error('Error fetching chart data:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
