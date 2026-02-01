import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Storage bucket names
export const BUCKETS = {
  TRACKS: 'tracks',
  COVERS: 'covers',
} as const

// Generate signed URL for private files
export async function getSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}

// Generate signed upload URL
export async function getUploadUrl(bucket: string, path: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error) throw error
  return data
}

// Delete file from storage
export async function deleteFile(bucket: string, path: string) {
  const { error } = await supabaseAdmin.storage.from(bucket).remove([path])
  if (error) throw error
}

// Get public URL for covers
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
