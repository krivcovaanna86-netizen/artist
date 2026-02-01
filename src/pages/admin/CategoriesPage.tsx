import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type AdminCategory,
} from '../../lib/api/admin'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/ui/EmptyState'
import { useTelegramWebApp } from '../../lib/hooks/useTelegramWebApp'
import { slugify } from '../../lib/utils/format'

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient()
  const { showAlert, showConfirm, hapticFeedback } = useTelegramWebApp()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    sortOrder: 0,
  })

  // Query
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: getAdminCategories,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      closeModal()
      hapticFeedback('success')
    },
    onError: () => {
      showAlert('Ошибка при создании категории')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      closeModal()
      hapticFeedback('success')
    },
    onError: () => {
      showAlert('Ошибка при обновлении категории')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      hapticFeedback('success')
    },
    onError: (error: any) => {
      showAlert(error.response?.data?.error || 'Ошибка при удалении категории')
    },
  })

  const openModal = (category?: AdminCategory) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        icon: category.icon || '',
        sortOrder: category.sortOrder,
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        icon: '',
        sortOrder: categories.length,
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
  }

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingCategory ? formData.slug : slugify(name),
    })
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.slug) {
      showAlert('Заполните название и slug')
      return
    }

    const categoryData = {
      name: formData.name,
      slug: formData.slug,
      icon: formData.icon || undefined,
      sortOrder: formData.sortOrder,
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: categoryData })
    } else {
      createMutation.mutate(categoryData)
    }
  }

  const handleDelete = async (category: AdminCategory) => {
    if (category.trackCount > 0) {
      showAlert(`Нельзя удалить категорию с ${category.trackCount} треками`)
      return
    }

    const confirmed = await showConfirm(`Удалить категорию "${category.name}"?`)
    if (confirmed) {
      deleteMutation.mutate(category.id)
    }
  }

  const commonEmojis = ['🎵', '🎸', '🎹', '🎤', '🎧', '💿', '🎺', '🥁', '🎻', '🪕', '🎷', '🎼']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-tg-text">Категории</h2>
        <Button onClick={() => openModal()}>+ Добавить</Button>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <div className="bg-tg-bg rounded-xl p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton width={40} height={40} className="rounded-lg" />
              <Skeleton width="60%" height={20} />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          title="Нет категорий"
          description="Создайте первую категорию"
          action={<Button onClick={() => openModal()}>Создать категорию</Button>}
        />
      ) : (
        <div className="bg-tg-bg rounded-xl divide-y divide-tg-secondary-bg overflow-hidden">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center gap-3 p-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-lg bg-tg-secondary-bg flex items-center justify-center text-xl">
                {category.icon || '🎵'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-tg-text">{category.name}</p>
                <p className="text-xs text-tg-hint">
                  {category.slug} • {category.trackCount} треков
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openModal(category)}
                  className="p-2 rounded-lg hover:bg-tg-secondary-bg transition-colors"
                >
                  <svg className="w-5 h-5 text-tg-hint" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(category)}
                  className="p-2 rounded-lg hover:bg-red-100 transition-colors"
                  disabled={category.trackCount > 0}
                >
                  <svg
                    className={`w-5 h-5 ${category.trackCount > 0 ? 'text-tg-hint' : 'text-tg-destructive'}`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
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
        title={editingCategory ? 'Редактировать категорию' : 'Новая категория'}
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Название категории"
          />

          <Input
            label="Slug (URL)"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="slug-kategorii"
          />

          {/* Icon picker */}
          <div>
            <label className="block text-sm font-medium text-tg-text mb-1">Иконка</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {commonEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    formData.icon === emoji
                      ? 'bg-tg-button text-tg-button-text'
                      : 'bg-tg-secondary-bg hover:bg-tg-hint/20'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <Input
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Или введите свой эмодзи"
            />
          </div>

          <Input
            label="Порядок сортировки"
            type="number"
            value={String(formData.sortOrder)}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          />

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={closeModal} fullWidth>
              Отмена
            </Button>
            <Button
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
              fullWidth
            >
              {editingCategory ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
