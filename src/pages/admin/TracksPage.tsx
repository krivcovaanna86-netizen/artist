import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminTracks,
  getAdminCategories,
  createTrack,
  updateTrack,
  deleteTrack,
  getUploadUrl,
  uploadFile,
  type AdminTrack,
} from '../../lib/api/admin'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { TrackListSkeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'
import { formatPrice, formatNumber, formatDuration } from '../../lib/utils/format'

export default function AdminTracksPage() {
  const queryClient = useQueryClient()
  const { showAlert, showConfirm, hapticFeedback } = useTelegramWebApp()

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<AdminTrack | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    price: '',
    categoryIds: [] as string[],
    isPublished: false,
  })
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [uploadedAudioPath, setUploadedAudioPath] = useState('')
  const [uploadedCoverPath, setUploadedCoverPath] = useState('')

  // Queries
  const { data: tracksData, isLoading } = useQuery({
    queryKey: ['admin', 'tracks', search],
    queryFn: () => getAdminTracks({ search: search || undefined, limit: 50 }),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: getAdminCategories,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
      closeModal()
      hapticFeedback('success')
    },
    onError: () => {
      showAlert('Ошибка при создании трека')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTrack(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
      closeModal()
      hapticFeedback('success')
    },
    onError: () => {
      showAlert('Ошибка при обновлении трека')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTrack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
      hapticFeedback('success')
    },
    onError: () => {
      showAlert('Ошибка при удалении трека')
    },
  })

  const openModal = (track?: AdminTrack) => {
    if (track) {
      setEditingTrack(track)
      setFormData({
        title: track.title,
        artist: track.artist,
        price: String(track.price / 100),
        categoryIds: track.categories.map((c) => c.id),
        isPublished: track.isPublished,
      })
      setUploadedAudioPath(track.filePath)
      setUploadedCoverPath(track.coverPath || '')
    } else {
      setEditingTrack(null)
      setFormData({
        title: '',
        artist: '',
        price: '',
        categoryIds: [],
        isPublished: false,
      })
      setUploadedAudioPath('')
      setUploadedCoverPath('')
    }
    setAudioFile(null)
    setCoverFile(null)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTrack(null)
    setAudioFile(null)
    setCoverFile(null)
    setUploadedAudioPath('')
    setUploadedCoverPath('')
  }

  const handleFileUpload = async (file: File, type: 'track' | 'cover') => {
    try {
      const { uploadUrl, path } = await getUploadUrl(file.name, type)
      await uploadFile(uploadUrl, file)
      return path
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.artist) {
      showAlert('Заполните название и исполнителя')
      return
    }

    setIsUploading(true)

    try {
      let audioPath = uploadedAudioPath
      let coverPath = uploadedCoverPath

      // Upload audio if new file selected
      if (audioFile) {
        audioPath = await handleFileUpload(audioFile, 'track')
      }

      // Upload cover if new file selected
      if (coverFile) {
        coverPath = await handleFileUpload(coverFile, 'cover')
      }

      if (!audioPath && !editingTrack) {
        showAlert('Загрузите аудиофайл')
        setIsUploading(false)
        return
      }

      const trackData = {
        title: formData.title,
        artist: formData.artist,
        price: Math.round(parseFloat(formData.price || '0') * 100),
        filePath: audioPath,
        coverPath: coverPath || undefined,
        categoryIds: formData.categoryIds,
        isPublished: formData.isPublished,
      }

      if (editingTrack) {
        updateMutation.mutate({ id: editingTrack.id, data: trackData })
      } else {
        createMutation.mutate(trackData)
      }
    } catch (error) {
      showAlert('Ошибка при загрузке файлов')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (track: AdminTrack) => {
    const confirmed = await showConfirm(`Удалить трек "${track.title}"?`)
    if (confirmed) {
      deleteMutation.mutate(track.id)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Input
          placeholder="Поиск треков..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={() => openModal()}>+ Добавить</Button>
      </div>

      {/* Tracks List */}
      {isLoading ? (
        <TrackListSkeleton count={5} />
      ) : !tracksData?.tracks.length ? (
        <EmptyState
          title="Нет треков"
          description="Добавьте первый трек"
          action={<Button onClick={() => openModal()}>Добавить трек</Button>}
        />
      ) : (
        <div className="bg-tg-bg rounded-xl divide-y divide-tg-secondary-bg overflow-hidden">
          {tracksData.tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-3 p-4">
              {/* Cover */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-tg-secondary-bg flex-shrink-0">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-tg-text truncate">{track.title}</p>
                  {!track.isPublished && <Badge variant="warning" size="sm">Черновик</Badge>}
                </div>
                <p className="text-xs text-tg-hint truncate">{track.artist}</p>
                <div className="flex items-center gap-2 text-xs text-tg-hint mt-1">
                  <span>{formatDuration(track.duration)}</span>
                  <span>•</span>
                  <span>{formatNumber(track.playCount)} прослушиваний</span>
                  <span>•</span>
                  <span>{formatPrice(track.revenue)} доход</span>
                </div>
              </div>

              {/* Price */}
              <div className="text-sm font-medium text-tg-accent">
                {formatPrice(track.price)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(track)}
                  className="p-2 rounded-lg hover:bg-tg-secondary-bg transition-colors"
                >
                  <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(track)}
                  className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-tg-destructive" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingTrack ? 'Редактировать трек' : 'Новый трек'}
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Название трека"
          />

          <Input
            label="Исполнитель"
            value={formData.artist}
            onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
            placeholder="Имя исполнителя"
          />

          <Input
            label="Цена (₽)"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="0"
          />

          {/* Audio file */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">
              Аудиофайл (MP3)
            </label>
            <input
              type="file"
              accept=".mp3,audio/mpeg"
              onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-tg-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-tg-button file:text-tg-button-text hover:file:opacity-90"
            />
            {uploadedAudioPath && !audioFile && (
              <p className="text-xs text-tg-hint mt-1">Текущий файл: {uploadedAudioPath}</p>
            )}
          </div>

          {/* Cover file */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">
              Обложка (JPG/PNG)
            </label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-tg-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-tg-button file:text-tg-button-text hover:file:opacity-90"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">Категории</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    const ids = formData.categoryIds.includes(cat.id)
                      ? formData.categoryIds.filter((id) => id !== cat.id)
                      : [...formData.categoryIds, cat.id]
                    setFormData({ ...formData, categoryIds: ids })
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    formData.categoryIds.includes(cat.id)
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-secondary-bg text-tg-text'
                  }`}
                >
                  {cat.icon && <span className="mr-1">{cat.icon}</span>}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Published */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPublished}
              onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              className="w-5 h-5 rounded border-tg-hint"
            />
            <span className="text-tg-text">Опубликовать</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={closeModal} fullWidth>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              loading={isUploading || createMutation.isPending || updateMutation.isPending}
              fullWidth
            >
              {editingTrack ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
