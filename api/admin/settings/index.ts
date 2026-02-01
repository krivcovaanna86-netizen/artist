import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../../_lib/auth'
import { getSettings, updateSettings } from '../../_lib/settings'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'PUT') {
    return handlePut(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const settings = await getSettings()
    return res.status(200).json({ settings })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePut(req: AuthenticatedRequest, res: VercelResponse) {
  try {
    const { subscriptionPrice, dailyPlayLimit, defaultTrackPrice, supportEmail, supportTelegram } =
      req.body

    // Validate values
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
  } catch (error) {
    console.error('Error updating settings:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
