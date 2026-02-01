import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import { checkCanPlay } from '../_lib/playLimits'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { trackId } = req.query

    if (!trackId || typeof trackId !== 'string') {
      return res.status(400).json({ error: 'Track ID required' })
    }

    const result = await checkCanPlay(req.user!.id, trackId)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error checking play permission:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler)
