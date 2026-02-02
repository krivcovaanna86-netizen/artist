import type { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from './prisma'
import { validateTelegramWebAppData, validateTelegramLoginWidget, isAdminUser } from './telegram'
import type { User } from '@prisma/client'

export interface AuthenticatedRequest extends VercelRequest {
  user?: User
}

type Handler = (req: AuthenticatedRequest, res: VercelResponse) => Promise<void | VercelResponse>

// Development mode mock user
const DEV_MODE = process.env.NODE_ENV === 'development' || process.env.ALLOW_DEV_AUTH === 'true'
const DEV_USER = {
  id: 123456789,
  first_name: 'Dev',
  last_name: 'User',
  username: 'devuser',
  photo_url: null,
}

export function withAuth(handler: Handler, options?: { adminOnly?: boolean }): Handler {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      const initData = req.headers['x-telegram-init-data'] as string
      const telegramAuth = req.headers['x-telegram-auth'] as string
      const devMode = req.headers['x-dev-mode'] as string

      console.log('[Auth] Headers:', { 
        hasInitData: !!initData, 
        hasTelegramAuth: !!telegramAuth, 
        hasDevMode: !!devMode 
      })

      // Priority 1: Telegram Mini App initData
      if (initData) {
        console.log('[Auth] Validating Telegram Mini App initData')
        const parsed = validateTelegramWebAppData(initData)

        if (!parsed) {
          console.log('[Auth] Invalid Mini App init data')
          return res.status(401).json({ error: 'Unauthorized: Invalid init data' })
        }

        const user = await findOrCreateUser(parsed.user)
        
        if (options?.adminOnly && !user.isAdmin) {
          return res.status(403).json({ error: 'Forbidden: Admin access required' })
        }

        req.user = user
        return handler(req, res)
      }

      // Priority 2: Telegram Login Widget auth
      if (telegramAuth) {
        console.log('[Auth] Validating Telegram Login Widget auth')
        const parsed = validateTelegramLoginWidget(telegramAuth)

        if (!parsed) {
          console.log('[Auth] Invalid Login Widget auth')
          return res.status(401).json({ 
            error: 'Unauthorized: Invalid Telegram Login auth',
            hint: 'The login session may have expired. Please log in again.'
          })
        }

        const user = await findOrCreateUser(parsed)
        
        if (options?.adminOnly && !user.isAdmin) {
          return res.status(403).json({ error: 'Forbidden: Admin access required' })
        }

        req.user = user
        return handler(req, res)
      }

      // Priority 3: Development mode (only if explicitly enabled)
      if (DEV_MODE && devMode === 'true') {
        console.log('[Auth] Development mode enabled, using mock user')
        
        let user = await prisma.user.findUnique({
          where: { telegramId: BigInt(DEV_USER.id) },
        })

        if (!user) {
          user = await prisma.user.create({
            data: {
              telegramId: BigInt(DEV_USER.id),
              username: DEV_USER.username,
              firstName: DEV_USER.first_name,
              lastName: DEV_USER.last_name,
              photoUrl: DEV_USER.photo_url,
              isAdmin: true,
            },
          })
          console.log('[Auth] Created dev user:', user.id)
        }

        if (options?.adminOnly && !user.isAdmin) {
          return res.status(403).json({ error: 'Forbidden: Admin access required' })
        }

        req.user = user
        return handler(req, res)
      }

      // No valid authentication
      console.log('[Auth] No valid authentication found')
      return res.status(401).json({ 
        error: 'Unauthorized: No authentication provided',
        hint: DEV_MODE 
          ? 'Add X-Dev-Mode: true header for development, or use Telegram Login Widget' 
          : 'Open this app through Telegram or use Telegram Login Widget',
        allowedMethods: [
          'Telegram Mini App (X-Telegram-Init-Data header)',
          'Telegram Login Widget (X-Telegram-Auth header)',
          ...(DEV_MODE ? ['Development mode (X-Dev-Mode: true header)'] : [])
        ]
      })
    } catch (error) {
      console.error('[Auth] Error:', error)
      return res.status(500).json({ error: 'Internal server error', details: String(error) })
    }
  }
}

// Helper function to find or create user
async function findOrCreateUser(userData: {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
}) {
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(userData.id) },
  })

  const isAdmin = isAdminUser(userData.id)

  if (!user) {
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(userData.id),
        username: userData.username || null,
        firstName: userData.first_name,
        lastName: userData.last_name || null,
        photoUrl: userData.photo_url || null,
        isAdmin,
      },
    })
    console.log('[Auth] Created new user:', user.id)
  } else {
    // Update user info if changed
    if (
      user.username !== (userData.username || null) ||
      user.firstName !== userData.first_name ||
      user.lastName !== (userData.last_name || null) ||
      user.photoUrl !== (userData.photo_url || null) ||
      user.isAdmin !== isAdmin
    ) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: userData.username || null,
          firstName: userData.first_name,
          lastName: userData.last_name || null,
          photoUrl: userData.photo_url || null,
          isAdmin,
        },
      })
      console.log('[Auth] Updated user:', user.id)
    }
  }

  return user
}

// Serialize user for JSON response (convert BigInt to string)
export function serializeUser(user: User) {
  return {
    ...user,
    telegramId: user.telegramId.toString(),
  }
}
