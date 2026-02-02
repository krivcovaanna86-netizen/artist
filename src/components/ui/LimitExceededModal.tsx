import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { Button } from './Button'

interface LimitExceededModalProps {
  isOpen: boolean
  onClose: () => void
  trackTitle?: string
  trackArtist?: string
}

export function LimitExceededModal({ isOpen, onClose, trackTitle, trackArtist }: LimitExceededModalProps) {
  const navigate = useNavigate()

  const handleSubscribe = () => {
    onClose()
    navigate('/subscription')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Лимит исчерпан">
      <div className="text-center space-y-4">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>

        {/* Title */}
        <div>
          <h3 className="text-xl font-bold text-tg-text mb-2">
            Бесплатные прослушивания закончились
          </h3>
          {trackTitle && (
            <p className="text-tg-hint">
              {trackTitle} — {trackArtist}
            </p>
          )}
        </div>

        {/* Description */}
        <p className="text-tg-text">
          Вы исчерпали лимит бесплатных прослушиваний на сегодня. 
          Оформите подписку, чтобы слушать музыку без ограничений!
        </p>

        {/* Benefits */}
        <div className="bg-tg-secondary-bg rounded-xl p-4 text-left">
          <p className="font-medium text-tg-text mb-2">С подпиской вы получите:</p>
          <ul className="space-y-2 text-sm text-tg-hint">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Безлимитное прослушивание всех треков
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Высокое качество звука
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
              Доступ к эксклюзивному контенту
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button fullWidth size="lg" onClick={handleSubscribe}>
            Оформить подписку
          </Button>
          <Button fullWidth variant="secondary" onClick={onClose}>
            Позже
          </Button>
        </div>
      </div>
    </Modal>
  )
}
