import { useState, useCallback } from 'react'
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
import { extractCoverFromAudioFile, blobToFile, blobToDataUrl } from '../../lib/utils/coverExtractor'

export default function AdminTracksPage() {
  const queryClient = useQueryClient()
  const { showAlert, showConfirm, hapticFeedback } = useTelegramWebApp()

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<AdminTrack | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [isExtractingCover, setIsExtractingCover] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

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
  const { data: tracksData, isLoading, error: tracksError } = useQuery({
    queryKey: ['admin', 'tracks', search],
    queryFn: () => {
      console.log('[TracksPage] Fetching tracks...')
      return getAdminTracks({ search: search || undefined, limit: 50 })
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: getAdminCategories,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTrack,
    onSuccess: (data) => {
      console.log('[TracksPage] ✅ Track created successfully:', data.id)
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
      closeModal()
      hapticFeedback('success')
      setUploadStatus('')
    },
    onError: (error) => {
      console.error('[TracksPage] ❌ Create track error:', error)
      showAlert('Ошибка при создании трека')
      setUploadStatus('')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTrack(id, data),
    onSuccess: (data) => {
      console.log('[TracksPage] ✅ Track updated successfully:', data.id)
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
      closeModal()
      hapticFeedback('success')
      setUploadStatus('')
    },
    onError: (error) => {
      console.error('[TracksPage] ❌ Update track error:', error)
      showAlert('Ошибка при обновлении трека')
      setUploadStatus('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTrack,
    onSuccess: () => {
      console.log('[TracksPage] ✅ Track deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin', 'tracks'] })
      hapticFeedback('success')
    },
    onError: (error) => {
      console.error('[TracksPage] ❌ Delete track error:', error)
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
      setCoverPreview(track.coverUrl)
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
      setCoverPreview(null)
    }
    setAudioFile(null)
    setCoverFile(null)
    setUploadStatus('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTrack(null)
    setAudioFile(null)
    setCoverFile(null)
    setUploadedAudioPath('')
    setUploadedCoverPath('')
    setCoverPreview(null)
    setUploadStatus('')
  }

  const handleFileUpload = async (file: File, type: 'track' | 'cover'): Promise<string> => {
    const step = type === 'track' ? 'audio' : 'cover'
    
    try {
      console.log(`[TracksPage] 📤 Step: Getting upload URL for ${step}...`)
      setUploadStatus(`Получение URL для ${step === 'audio' ? 'аудио' : 'обложки'}...`)
      
      const { uploadUrl, path } = await getUploadUrl(file.name, type)
      console.log(`[TracksPage] Got upload URL, path: ${path}`)
      
      console.log(`[TracksPage] 📤 Step: Uploading ${step} file...`)
      setUploadStatus(`Загрузка ${step === 'audio' ? 'аудио' : 'обложки'}... 0%`)
      
      await uploadFile(uploadUrl, file)
      
      console.log(`[TracksPage] ✅ ${step} uploaded successfully to: ${path}`)
      setUploadStatus(`${step === 'audio' ? 'Аудио' : 'Обложка'} загружена ✓`)
      
      return path
    } catch (error) {
      console.error(`[TracksPage] ❌ ${step} upload failed:`, error)
      setUploadStatus(`Ошибка загрузки ${step === 'audio' ? 'аудио' : 'обложки'}`)
      throw error
    }
  }

  // Обработка выбора аудиофайла с автоматическим извлечением обложки
  const handleAudioFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    console.log('[TracksPage] Audio file selected:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
    })
    
    setAudioFile(file)
    
    // Попробовать извлечь обложку из файла
    if (!coverFile && !uploadedCoverPath) {
      console.log('[TracksPage] Attempting to extract cover from audio...')
      setIsExtractingCover(true)
      try {
        const coverBlob = await extractCoverFromAudioFile(file)
        if (coverBlob) {
          console.log('[TracksPage] ✅ Cover extracted from audio file')
          const coverFileFromBlob = blobToFile(coverBlob, `cover-${Date.now()}.jpg`)
          setCoverFile(coverFileFromBlob)
          
          // Показать превью
          const previewUrl = await blobToDataUrl(coverBlob)
          setCoverPreview(previewUrl)
          
          hapticFeedback('success')
        } else {
          console.log('[TracksPage] No cover found in audio file')
        }
      } catch (error) {
        console.error('[TracksPage] Error extracting cover:', error)
      } finally {
        setIsExtractingCover(false)
      }
    }
  }, [coverFile, uploadedCoverPath, hapticFeedback])

  // Обработка выбора файла обложки
  const handleCoverFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    console.log('[TracksPage] Cover file selected:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024).toFixed(2)} KB`
    })
    
    setCoverFile(file)
    
    // Показать превью
    const previewUrl = await blobToDataUrl(file)
    setCoverPreview(previewUrl)
  }, [])

  const handleSubmit = async () => {
    console.log('[TracksPage] 🚀 Starting track submit...')
    console.log('[TracksPage] Form data:', formData)
    console.log('[TracksPage] Audio file:', audioFile?.name || 'none')
    console.log('[TracksPage] Cover file:', coverFile?.name || 'none')
    console.log('[TracksPage] Uploaded audio path:', uploadedAudioPath || 'none')
    console.log('[TracksPage] Uploaded cover path:', uploadedCoverPath || 'none')
    
    if (!formData.title || !formData.artist) {
      console.log('[TracksPage] ❌ Validation failed: missing title or artist')
      showAlert('Заполните название и исполнителя')
      return
    }

    setIsUploading(true)
    setUploadStatus('Начинаем...')

    try {
      let audioPath = uploadedAudioPath
      let coverPath = uploadedCoverPath

      // Upload audio if new file selected
      if (audioFile) {
        console.log('[TracksPage] Uploading new audio file...')
        audioPath = await handleFileUpload(audioFile, 'track')
        console.log('[TracksPage] Audio uploaded to:', audioPath)
      }

      // Upload cover if new file selected
      if (coverFile) {
        console.log('[TracksPage] Uploading new cover file...')
        coverPath = await handleFileUpload(coverFile, 'cover')
        console.log('[TracksPage] Cover uploaded to:', coverPath)
      }

      if (!audioPath && !editingTrack) {
        console.log('[TracksPage] ❌ No audio file for new track')
        showAlert('Загрузите аудиофайл')
        setIsUploading(false)
        setUploadStatus('')
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

      console.log('[TracksPage] 📤 Submitting track data:', trackData)
      setUploadStatus(editingTrack ? 'Сохранение трека...' : 'Создание трека...')

      if (editingTrack) {
        console.log('[TracksPage] Updating existing track:', editingTrack.id)
        updateMutation.mutate({ id: editingTrack.id, data: trackData })
      } else {
        console.log('[TracksPage] Creating new track')
        createMutation.mutate(trackData)
      }
    } catch (error) {
      console.error('[TracksPage] ❌ Submit error:', error)
      showAlert('Ошибка при загрузке файлов')
      setUploadStatus('Ошибка!')
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

  // Show error if loading tracks failed
  if (tracksError) {
    console.error('[TracksPage] Error loading tracks:', tracksError)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Input
          placeholder="Поиск треков..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 sm:max-w-xs"
        />
        <Button onClick={() => openModal()}>+ Добавить</Button>
      </div>

      {/* Error display */}
      {tracksError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-sm text-red-500">
            Ошибка загрузки треков: {(tracksError as Error).message}
          </p>
        </div>
      )}

      {/* Stats on desktop */}
      {tracksData && (
        <div className="hidden lg:flex gap-4">
          <div className="bg-tg-section-bg rounded-xl p-4 flex-1">
            <p className="text-sm text-tg-hint">Всего треков</p>
            <p className="text-2xl font-bold text-tg-text">{tracksData.pagination.total}</p>
          </div>
          <div className="bg-tg-section-bg rounded-xl p-4 flex-1">
            <p className="text-sm text-tg-hint">Опубликовано</p>
            <p className="text-2xl font-bold text-tg-text">
              {tracksData.tracks.filter(t => t.isPublished).length}
            </p>
          </div>
          <div className="bg-tg-section-bg rounded-xl p-4 flex-1">
            <p className="text-sm text-tg-hint">Черновики</p>
            <p className="text-2xl font-bold text-tg-text">
              {tracksData.tracks.filter(t => !t.isPublished).length}
            </p>
          </div>
        </div>
      )}

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
            <div key={track.id} className="flex items-center gap-3 p-4 hover:bg-tg-secondary-bg/50 transition-colors">
              {/* Cover */}
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-lg overflow-hidden bg-tg-secondary-bg flex-shrink-0">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 lg:w-6 lg:h-6 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm lg:text-base font-medium text-tg-text truncate">{track.title}</p>
                  {!track.isPublished && <Badge variant="warning" size="sm">Черновик</Badge>}
                </div>
                <p className="text-xs lg:text-sm text-tg-hint truncate">{track.artist}</p>
                <div className="flex items-center gap-2 text-xs text-tg-hint mt-1">
                  <span>{formatDuration(track.duration)}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">{formatNumber(track.playCount)} прослушиваний</span>
                  <span className="hidden md:inline">•</span>
                  <span className="hidden md:inline">{formatPrice(track.revenue)} доход</span>
                </div>
              </div>

              {/* Price */}
              <div className="hidden sm:block text-sm font-medium text-tg-accent">
                {formatPrice(track.price)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(track)}
                  className="p-2 rounded-lg hover:bg-tg-secondary-bg transition-colors"
                  title="Редактировать"
                >
                  <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(track)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                  title="Удалить"
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
              Аудиофайл (MP3, M4A, MP4)
            </label>
            <input
              type="file"
              accept=".mp3,.m4a,.mp4,audio/mpeg,audio/mp4,audio/x-m4a,video/mp4"
              onChange={handleAudioFileChange}
              className="w-full text-sm text-tg-text file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-tg-button file:text-tg-button-text hover:file:opacity-90"
            />
            {uploadedAudioPath && !audioFile && (
              <p className="text-xs text-tg-hint mt-1">Текущий файл: {uploadedAudioPath}</p>
            )}
            {audioFile && (
              <p className="text-xs text-tg-accent mt-1">
                Выбран: {audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {isExtractingCover && (
              <p className="text-xs text-tg-accent mt-1 animate-pulse">⏳ Извлечение обложки из файла...</p>
            )}
          </div>

          {/* Cover file with preview */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">
              Обложка (JPG/PNG) 
              <span className="text-xs text-tg-hint ml-2">Извлекается автоматически из аудиофайла</span>
            </label>
            
            {/* Cover preview */}
            {coverPreview && (
              <div className="mb-2 relative inline-block">
                <img 
                  src={coverPreview} 
                  alt="Обложка" 
                  className="w-24 h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null)
                    setCoverPreview(null)
                    setUploadedCoverPath('')
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-tg-destructive text-white rounded-full flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>
            )}
            
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/*"
              onChange={handleCoverFileChange}
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

          {/* Upload Status */}
          {uploadStatus && (
            <div className="bg-tg-secondary-bg rounded-lg p-3">
              <p className="text-sm text-tg-text flex items-center gap-2">
                {(isUploading || createMutation.isPending || updateMutation.isPending) && (
                  <span className="animate-spin">⏳</span>
                )}
                {uploadStatus}
              </p>
            </div>
          )}

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
