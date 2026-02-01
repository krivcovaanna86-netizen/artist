import prisma from './prisma'
import { getSettings } from './settings'

// Get Moscow timezone date (UTC+3)
function getMoscowDate(): Date {
  const now = new Date()
  // Create date in Moscow timezone
  const moscowOffset = 3 * 60 // UTC+3 in minutes
  const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60000)
  const moscowDate = new Date(utcDate.getTime() + moscowOffset * 60000)

  // Return start of day in Moscow
  return new Date(moscowDate.getFullYear(), moscowDate.getMonth(), moscowDate.getDate())
}

export interface PlayCheckResult {
  canPlay: boolean
  reason: 'subscription' | 'purchased' | 'free_limit' | 'limit_exceeded'
  remainingPlays?: number
  subscriptionUntil?: Date
}

export async function checkCanPlay(userId: string, trackId: string): Promise<PlayCheckResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      purchases: {
        where: { trackId },
      },
    },
  })

  if (!user) {
    return { canPlay: false, reason: 'limit_exceeded' }
  }

  // Check if user has active subscription
  if (user.subscriptionUntil && user.subscriptionUntil > new Date()) {
    return {
      canPlay: true,
      reason: 'subscription',
      subscriptionUntil: user.subscriptionUntil,
    }
  }

  // Check if user purchased this track
  if (user.purchases.length > 0) {
    return { canPlay: true, reason: 'purchased' }
  }

  // Check daily limit
  const settings = await getSettings()
  const today = getMoscowDate()

  const dailyLimit = await prisma.dailyPlayLimit.findUnique({
    where: {
      userId_trackId_date: {
        userId,
        trackId,
        date: today,
      },
    },
  })

  const currentPlays = dailyLimit?.playCount || 0
  const remainingPlays = Math.max(0, settings.dailyPlayLimit - currentPlays)

  if (remainingPlays > 0) {
    return {
      canPlay: true,
      reason: 'free_limit',
      remainingPlays,
    }
  }

  return {
    canPlay: false,
    reason: 'limit_exceeded',
    remainingPlays: 0,
  }
}

export async function recordPlay(userId: string, trackId: string): Promise<void> {
  const today = getMoscowDate()

  // Update daily limit
  await prisma.dailyPlayLimit.upsert({
    where: {
      userId_trackId_date: {
        userId,
        trackId,
        date: today,
      },
    },
    create: {
      userId,
      trackId,
      date: today,
      playCount: 1,
    },
    update: {
      playCount: { increment: 1 },
    },
  })

  // Record in play history
  await prisma.playHistory.create({
    data: {
      userId,
      trackId,
    },
  })

  // Increment track play count
  await prisma.track.update({
    where: { id: trackId },
    data: { playCount: { increment: 1 } },
  })
}

export async function markPlayCompleted(userId: string, trackId: string): Promise<void> {
  // Find the most recent play record and mark as completed
  const lastPlay = await prisma.playHistory.findFirst({
    where: { userId, trackId },
    orderBy: { playedAt: 'desc' },
  })

  if (lastPlay) {
    await prisma.playHistory.update({
      where: { id: lastPlay.id },
      data: { completed: true },
    })
  }
}
