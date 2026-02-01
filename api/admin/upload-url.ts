import type { VercelResponse } from '@vercel/node'
import { withAuth, AuthenticatedRequest } from '../_lib/auth'
import { getUploadUrl, BUCKETS } from '../_lib/supabase'
import { v4 as uuidv4 } from 'uuid'

async function handler(req: AuthenticatedRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { filename, type } = req.body

    if (!filename || !type) {
      return res.status(400).json({ error: 'Filename and type required' })
    }

    if (!['track', 'cover'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "track" or "cover"' })
    }

    // Get file extension
    const ext = filename.split('.').pop()?.toLowerCase()

    // Validate extensions
    if (type === 'track' && ext !== 'mp3') {
      return res.status(400).json({ error: 'Only MP3 files allowed for tracks' })
    }

    if (type === 'cover' && !['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      return res.status(400).json({ error: 'Only JPG, PNG, WEBP files allowed for covers' })
    }

    // Generate unique path
    const uniqueId = uuidv4()
    const path = `${uniqueId}.${ext}`
    const bucket = type === 'track' ? BUCKETS.TRACKS : BUCKETS.COVERS

    // Get signed upload URL
    const uploadData = await getUploadUrl(bucket, path)

    return res.status(200).json({
      uploadUrl: uploadData.signedUrl,
      path,
      token: uploadData.token,
    })
  } catch (error) {
    console.error('Error generating upload URL:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAuth(handler, { adminOnly: true })
