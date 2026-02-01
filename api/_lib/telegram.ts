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

export function validateTelegramWebAppData(initData: string): ParsedInitData | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    console.error('TELEGRAM_BOT_TOKEN is not set')
    return null
  }

  try {
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')

    if (!hash) {
      console.error('Hash not found in initData')
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
      console.error('Invalid hash')
      return null
    }

    // Check auth_date (not older than 24 hours)
    const authDate = parseInt(urlParams.get('auth_date') || '0', 10)
    const now = Math.floor(Date.now() / 1000)
    if (now - authDate > 86400) {
      console.error('Auth data is too old')
      return null
    }

    // Parse user data
    const userStr = urlParams.get('user')
    if (!userStr) {
      console.error('User data not found')
      return null
    }

    const user = JSON.parse(userStr) as TelegramUser

    return {
      user,
      auth_date: authDate,
      hash,
      query_id: urlParams.get('query_id') || undefined,
      chat_type: urlParams.get('chat_type') || undefined,
      chat_instance: urlParams.get('chat_instance') || undefined,
    }
  } catch (error) {
    console.error('Error validating Telegram data:', error)
    return null
  }
}

export function isAdminUser(telegramId: number | bigint): boolean {
  const adminIds = process.env.ADMIN_TELEGRAM_IDS?.split(',').map((id) => id.trim()) || []
  return adminIds.includes(String(telegramId))
}
