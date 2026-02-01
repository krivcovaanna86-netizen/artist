import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import { checkCanPlay, recordPlay, markPlayCompleted } from '../_lib/playLimits'
import prisma from '../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { trackId } = req.query
    const { action } = req.body || {}

    if (!trackId || typeof trackId !== 'string') {
      return res.status(400).json({ error: 'Track ID required' })
    }

    // Verify track exists
    const track = await prisma.track.findUnique({
      where: { id: trackId, isPublished: true },
    })

    if (!track) {
      return res.status(404).json({ error: 'Track not found' })
    }

    // Handle completion event
    if (action === 'complete') {
      await markPlayCompleted(req.user!.id, trackId)
      return res.status(200).json({ success: true })
    }

    // Check if user can play
    const canPlayResult = await checkCanPlay(req.user!.id, trackId)

    if (!canPlayResult.canPlay) {
      return res.status(403).json({
        error: 'Play limit exceeded',
        ...canPlayResult,
      })
    }

    // Record play only for free limit (subscription and purchased don't count against limits)
    if (canPlayResult.reason === 'free_limit') {
      await recordPlay(req.user!.id, trackId)
    } else {
      // Still record in history but don't count against daily limit
      await prisma.playHistory.create({
        data: {
          userId: req.user!.id,
          trackId,
        },
      })
      // Increment track play count
      await prisma.track.update({
        where: { id: trackId },
        data: { playCount: { increment: 1 } },
      })
    }

    return res.status(200).json({
      success: true,
      ...canPlayResult,
      remainingPlays:
        canPlayResult.reason === 'free_limit' && canPlayResult.remainingPlays
          ? canPlayResult.remainingPlays - 1
          : undefined,
    })
  } catch (error) {
    console.error('Error recording play:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
