import crypto from 'crypto'

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
  is_premium?: boolean
  photo_url?: string
}

interface ParsedInitData {
  user: TelegramUser
  auth_date: number
  hash: string
  query_id?: string
  chat_type?: string
  chat_instance?: string
}

// Validate Telegram Mini App WebApp initData
export function validateTelegramWebAppData(initData: string): ParsedInitData | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    console.error('[Telegram] TELEGRAM_BOT_TOKEN is not set')
    return null
  }

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')

    if (!hash) {
      console.error('[Telegram] Hash not found in initData')
      return null
    }

    // Remove hash from params for verification
    urlParams.delete('hash')

    // Sort params alphabetically and create data-check-string
    const dataCheckArr: string[] = []
    urlParams.sort()
    urlParams.forEach((value, key) => {
      dataCheckArr.push(`${key}=${value}`)
    })
    const dataCheckString = dataCheckArr.join('\n')

    // Create secret key using HMAC-SHA256
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    // Compare hashes
    if (calculatedHash !== hash) {
      console.error('[Telegram] Invalid hash for WebApp data')
      return null
    }

    // Check auth_date (not older than 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      console.error('[Telegram] WebApp auth data is too old')
      return null
    }

    // Parse user data
    const userStr = urlParams.get('user')
    if (!userStr) {
      console.error('[Telegram] User data not found in WebApp data')
      return null
    }

    const user = JSON.parse(userStr) as TelegramUser
    console.log('[Telegram] WebApp auth validated for user:', user.id)

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: urlParams.get('query_id') || undefined,
      chat_type: urlParams.get('chat_type') || undefined,
      chat_instance: urlParams.get('chat_instance') || undefined,
    }
  } catch (error) {
    console.error('[Telegram] Error validating WebApp data:', error)
    return null
  }
}

// Validate Telegram Login Widget data
export function validateTelegramLoginWidget(authData: string): TelegramUser | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    console.error('[Telegram] TELEGRAM_BOT_TOKEN is not set')
    return null
  }

  try {
    const urlParams = new URLSearchParams(authData)
    const hash = urlParams.get('hash')

    if (!hash) {
      console.error('[Telegram] Hash not found in Login Widget data')
      return null
    }

    // Get required fields
    const id = urlParams.get('id')
    const firstName = urlParams.get('first_name')
    const authDateStr = urlParams.get('auth_date')

    if (!id || !firstName || !authDateStr) {
      console.error('[Telegram] Missing required fields in Login Widget data')
      return null
    }

    // Remove hash from params for verification
    urlParams.delete('hash')

    // Sort params alphabetically and create data-check-string
    const dataCheckArr: string[] = []
    const sortedKeys = Array.from(urlParams.keys()).sort()
    for (const key of sortedKeys) {
      const value = urlParams.get(key)
      if (value) {
        dataCheckArr.push(`${key}=${value}`)
      }
    }
    const dataCheckString = dataCheckArr.join('\n')

    // For Login Widget, secret key is SHA256 of bot token
    const secretKey = crypto
      .createHash('sha256')
      .update(botToken)
      .digest()

    // Calculate hash
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    // Compare hashes
    if (calculatedHash !== hash) {
      console.error('[Telegram] Invalid hash for Login Widget data')
      console.log('[Telegram] Expected:', calculatedHash)
      console.log('[Telegram] Received:', hash)
      return null
    }

    // Check auth_date (not older than 24 hours)
    const authDate = parseInt(authDateStr, 10)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      console.error('[Telegram] Login Widget auth data is too old')
      return null
    }

    const user: TelegramUser = {
      id: parseInt(id, 10),
      first_name: firstName,
      last_name: urlParams.get('last_name') || undefined,
      username: urlParams.get('username') || undefined,
      photo_url: urlParams.get('photo_url') || undefined,
    }

    console.log('[Telegram] Login Widget auth validated for user:', user.id)
    return user
  } catch (error) {
    console.error('[Telegram] Error validating Login Widget data:', error)
    return null
  }
}

export function isAdminUser(telegramId: number | bigint): boolean {
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map((id) => id.trim()) || []
  return adminIds.includes(String(telegramId))
}
