import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import { checkCanPlay } from '../_lib/playLimits'
import { getSignedUrl, BUCKETS } from '../_lib/supabase'
import prisma from '../_lib/prisma'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { trackId } = req.query

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

    // Check if user can play
    const canPlayResult = await checkCanPlay(req.user!.id, trackId)

    if (!canPlayResult.canPlay) {
      return res.status(403).json({
        error: 'Play limit exceeded',
        ...canPlayResult,
      })
    }

    // Generate signed URL for the audio file (1 hour expiry)
    const streamUrl = await getSignedUrl(BUCKETS.TRACKS, track.filePath, 3600)

    return res.status(200).json({
      streamUrl,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error('Error generating stream URL:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
