import prisma from './prisma'

export interface AppSettings {
  subscriptionPrice: number // в копейках
  dailyPlayLimit: number
  defaultTrackPrice: number // в копейках
  supportEmail: string
  supportTelegram: string
}

const DEFAULT_SETTINGS: AppSettings = {
  subscriptionPrice: 29900, // 299 рублей
  dailyPlayLimit: 1,
  defaultTrackPrice: 9900, // 99 рублей
  supportEmail: 'support@example.com',
  supportTelegram: '@support',
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await prisma.setting.findMany()
  const settingsMap = new Map(settings.map((s) => [s.key, s.value]))

  return {
    subscriptionPrice: parseInt(settingsMap.get('subscriptionPrice') || String(DEFAULT_SETTINGS.subscriptionPrice), 10),
    dailyPlayLimit: parseInt(settingsMap.get('dailyPlayLimit') || String(DEFAULT_SETTINGS.dailyPlayLimit), 10),
    defaultTrackPrice: parseInt(settingsMap.get('defaultTrackPrice') || String(DEFAULT_SETTINGS.defaultTrackPrice), 10),
    supportEmail: settingsMap.get('supportEmail') || DEFAULT_SETTINGS.supportEmail,
    supportTelegram: settingsMap.get('supportTelegram') || DEFAULT_SETTINGS.supportTelegram,
  }
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined)

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(value) },
        update: { value: String(value) },
      })
    )
  )

  return getSettings()
}
