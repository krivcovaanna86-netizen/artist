import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSettings, updateSettings } from '../../lib/api/admin'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Skeleton } from '../../components/ui/Skeleton'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const { showAlert, hapticFeedback } = useTelegramWebApp()

  const [formData, setFormData] = useState({
    subscriptionPrice: '',
    dailyPlayLimit: '',
    defaultTrackPrice: '',
    supportEmail: '',
    supportTelegram: '',
  })

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: getSettings,
  })

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        subscriptionPrice: String(settings.subscriptionPrice / 100),
        dailyPlayLimit: String(settings.dailyPlayLimit),
        defaultTrackPrice: String(settings.defaultTrackPrice / 100),
        supportEmail: settings.supportEmail,
        supportTelegram: settings.supportTelegram,
      })
    }
  }, [settings])

  const updateMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] })
      hapticFeedback('success')
      showAlert('Настройки сохранены')
    },
    onError: () => {
      showAlert('Ошибка при сохранении настроек')
    },
  })

  const handleSubmit = () => {
    updateMutation.mutate({
      subscriptionPrice: Math.round(parseFloat(formData.subscriptionPrice) * 100) || 0,
      dailyPlayLimit: parseInt(formData.dailyPlayLimit) || 1,
      defaultTrackPrice: Math.round(parseFloat(formData.defaultTrackPrice) * 100) || 0,
      supportEmail: formData.supportEmail,
      supportTelegram: formData.supportTelegram,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-tg-bg rounded-xl p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <Skeleton width={100} height={16} className="mb-2" />
              <Skeleton height={44} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pricing Settings */}
      <div className="bg-tg-bg rounded-xl p-4">
        <h3 className="font-medium text-tg-text mb-4">Цены</h3>
        <div className="space-y-4">
          <Input
            label="Цена подписки (₽/месяц)"
            type="number"
            step="0.01"
            value={formData.subscriptionPrice}
            onChange={(e) => setFormData({ ...formData, subscriptionPrice: e.target.value })}
            helperText="Стоимость ежемесячной подписки в рублях"
          />

          <Input
            label="Цена трека по умолчанию (₽)"
            type="number"
            step="0.01"
            value={formData.defaultTrackPrice}
            onChange={(e) => setFormData({ ...formData, defaultTrackPrice: e.target.value })}
            helperText="Используется при создании новых треков"
          />
        </div>
      </div>

      {/* Limits Settings */}
      <div className="bg-tg-bg rounded-xl p-4">
        <h3 className="font-medium text-tg-text mb-4">Лимиты</h3>
        <div className="space-y-4">
          <Input
            label="Бесплатных прослушиваний в день"
            type="number"
            min="0"
            max="100"
            value={formData.dailyPlayLimit}
            onChange={(e) => setFormData({ ...formData, dailyPlayLimit: e.target.value })}
            helperText="Сколько раз пользователь может послушать каждый трек бесплатно в день"
          />
        </div>
      </div>

      {/* Support Settings */}
      <div className="bg-tg-bg rounded-xl p-4">
        <h3 className="font-medium text-tg-text mb-4">Поддержка</h3>
        <div className="space-y-4">
          <Input
            label="Email поддержки"
            type="email"
            value={formData.supportEmail}
            onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
            placeholder="support@example.com"
          />

          <Input
            label="Telegram поддержки"
            value={formData.supportTelegram}
            onChange={(e) => setFormData({ ...formData, supportTelegram: e.target.value })}
            placeholder="@support"
            helperText="Username или ссылка на Telegram"
          />
        </div>
      </div>

      {/* Current Values Info */}
      <div className="bg-tg-bg rounded-xl p-4">
        <h3 className="font-medium text-tg-text mb-4">Текущие значения</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-tg-hint">Цена подписки:</span>
            <span className="text-tg-text">{(settings?.subscriptionPrice || 0) / 100} ₽</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Цена трека по умолчанию:</span>
            <span className="text-tg-text">{(settings?.defaultTrackPrice || 0) / 100} ₽</span>
          </div>
          <div className="flex justify-between">
            <span className="text-tg-hint">Бесплатных прослушиваний:</span>
            <span className="text-tg-text">{settings?.dailyPlayLimit || 1} / день</span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <Button
        fullWidth
        size="lg"
        onClick={handleSubmit}
        loading={updateMutation.isPending}
      >
        Сохранить настройки
      </Button>

      {/* Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h4 className="font-medium text-yellow-800 mb-2">Важно</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Изменения вступают в силу немедленно</li>
          <li>• Цены для уже созданных треков не изменятся автоматически</li>
          <li>• Активные подписки продолжат действовать до окончания срока</li>
        </ul>
      </div>
    </div>
  )
}
