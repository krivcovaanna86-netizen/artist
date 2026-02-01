import type { VercelResponse } from '@vercel/node'
import { withAuth, serializeUser, AuthenticatedRequest } from '../_lib/auth'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const user = req.user!

  return res.status(200).json({
    user: {
      ...serializeUser(user),
      hasActiveSubscription: user.subscriptionUntil && user.subscriptionUntil > new Date(),
    },
  })
}

export default withAuth(handler)
