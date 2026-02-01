import type { VercelRequest, VercelResponse } from '@vercel/node'
import prisma from './prisma'
import { validateTelegramWebAppData, isAdminUser } from './telegram'
import type { User } from '@prisma/client'

export interface AuthenticatedRequest extends VercelRequest {
  user?: User
}

type Handler = (req: AuthenticatedRequest, res: VercelResponse) => Promise<void | VercelResponse>

export function withAuth(handler: Handler, options?: { adminOnly?: boolean }): Handler {
  return async (req: AuthenticatedRequest, res: VercelResponse) => {
    try {
      const initData = req.headers['x-telegram-init-data'] as string

      if (!initData) {
        return res.status(401).json({ error: 'Unauthorized: No init data provided' })
      }

      const parsed = validateTelegramWebAppData(initData)

      if (!parsed) {
        return res.status(401).json({ error: 'Unauthorized: Invalid init data' })
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { telegramId: BigInt(parsed.user.id) },
      })

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            telegramId: BigInt(parsed.user.id),
            username: parsed.user.username,
            firstName: parsed.user.first_name,
            lastName: parsed.user.last_name,
            photoUrl: parsed.user.photo_url,
            isAdmin: isAdminUser(parsed.user.id),
          },
        })
      } else {
        // Update user info if changed
        const isAdmin = isAdminUser(parsed.user.id)
        if (
          user.username !== parsed.user.username ||
          user.firstName !== parsed.user.first_name ||
          user.lastName !== parsed.user.last_name ||
          user.photoUrl !== parsed.user.photo_url ||
          user.isAdmin !== isAdmin
        ) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              username: parsed.user.username,
              firstName: parsed.user.first_name,
              lastName: parsed.user.last_name,
              photoUrl: parsed.user.photo_url,
              isAdmin,
            },
          })
        }
      }

      // Check admin access
      if (options?.adminOnly && !user.isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      req.user = user
      return handler(req, res)
    } catch (error) {
      console.error('Auth error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

// Serialize user for JSON response (convert BigInt to string)
export function serializeUser(user: User) {
  return {
    ...user,
    telegramId: user.telegramId.toString(),
  }
}
