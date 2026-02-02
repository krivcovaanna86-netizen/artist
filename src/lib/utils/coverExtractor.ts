/**
 * Утилита для извлечения обложки (artwork) из аудио/видео файлов
 * Поддерживает MP3 (ID3), MP4/M4A (через video thumbnail), и другие форматы
 */

// Извлечь первый кадр из видео файла как обложку
export async function extractThumbnailFromVideo(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    
    const objectUrl = URL.createObjectURL(file)
    video.src = objectUrl
    
    video.onloadedmetadata = () => {
      // Перемотать на 1 секунду или на начало если видео короче
      video.currentTime = Math.min(1, video.duration / 2)
    }
    
    video.onseeked = () => {
      // Установить размер canvas
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      // Нарисовать кадр
      ctx?.drawImage(video, 0, 0)
      
      // Конвертировать в blob
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl)
        resolve(blob)
      }, 'image/jpeg', 0.9)
    }
    
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
    
    // Timeout на случай если видео не загружается
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }, 10000)
  })
}

// Извлечь обложку из ID3 тегов MP3 файла
export async function extractCoverFromMP3(file: File): Promise<Blob | null> {
  try {
    const buffer = await file.arrayBuffer()
    const view = new DataView(buffer)
    
    // Проверить ID3v2 header
    const id3Header = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2))
    if (id3Header !== 'ID3') {
      return null
    }
    
    // Размер ID3 тега (syncsafe integer)
    const size = (view.getUint8(6) << 21) | (view.getUint8(7) << 14) | (view.getUint8(8) << 7) | view.getUint8(9)
    
    // Поиск APIC frame (обложка альбома)
    let offset = 10
    while (offset < size + 10) {
      const frameId = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      )
      
      const frameSize = (view.getUint8(offset + 4) << 24) | 
                        (view.getUint8(offset + 5) << 16) | 
                        (view.getUint8(offset + 6) << 8) | 
                        view.getUint8(offset + 7)
      
      if (frameId === 'APIC') {
        // Найден фрейм с обложкой
        const frameData = new Uint8Array(buffer, offset + 10, frameSize)
        
        // Пропустить encoding byte
        let dataOffset = 1
        
        // Пропустить MIME type (null-terminated string)
        while (frameData[dataOffset] !== 0 && dataOffset < frameSize) {
          dataOffset++
        }
        dataOffset++ // skip null
        
        // Пропустить picture type byte
        dataOffset++
        
        // Пропустить description (null-terminated string)
        while (frameData[dataOffset] !== 0 && dataOffset < frameSize) {
          dataOffset++
        }
        dataOffset++ // skip null
        
        // Остаток - данные изображения
        const imageData = frameData.slice(dataOffset)
        
        // Определить MIME type по magic bytes
        let mimeType = 'image/jpeg'
        if (imageData[0] === 0x89 && imageData[1] === 0x50) {
          mimeType = 'image/png'
        }
        
        return new Blob([imageData], { type: mimeType })
      }
      
      offset += 10 + frameSize
      if (frameSize === 0) break
    }
    
    return null
  } catch (error) {
    console.error('Error extracting cover from MP3:', error)
    return null
  }
}

// Извлечь обложку из M4A/MP4 файла (через iTunes-style metadata)
export async function extractCoverFromM4A(file: File): Promise<Blob | null> {
  try {
    const buffer = await file.arrayBuffer()
    const view = new DataView(buffer)
    
    // Ищем 'covr' atom в iTunes metadata
    const searchStr = 'covr'
    const bytes = new Uint8Array(buffer)
    
    for (let i = 0; i < bytes.length - 20; i++) {
      if (
        bytes[i] === 0x63 && // 'c'
        bytes[i + 1] === 0x6f && // 'o'  
        bytes[i + 2] === 0x76 && // 'v'
        bytes[i + 3] === 0x72    // 'r'
      ) {
        // Найден covr atom, размер находится в предыдущих 4 байтах
        const atomSize = view.getUint32(i - 4, false) - 8
        
        // Ищем data atom внутри covr
        for (let j = i + 4; j < i + atomSize; j++) {
          if (
            bytes[j] === 0x64 && // 'd'
            bytes[j + 1] === 0x61 && // 'a'
            bytes[j + 2] === 0x74 && // 't'
            bytes[j + 3] === 0x61    // 'a'
          ) {
            const dataSize = view.getUint32(j - 4, false)
            // Пропускаем data header (8 bytes: size + type) и flags (8 bytes)
            const imageStart = j + 12
            const imageData = bytes.slice(imageStart, j - 4 + dataSize)
            
            // Определить MIME type
            let mimeType = 'image/jpeg'
            if (imageData[0] === 0x89 && imageData[1] === 0x50) {
              mimeType = 'image/png'
            }
            
            return new Blob([imageData], { type: mimeType })
          }
        }
      }
    }
    
    return null
  } catch (error) {
    console.error('Error extracting cover from M4A:', error)
    return null
  }
}

// Основная функция - автоматически определяет тип файла
export async function extractCoverFromAudioFile(file: File): Promise<Blob | null> {
  const fileName = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()
  
  // MP3 файлы
  if (fileName.endsWith('.mp3') || fileType === 'audio/mpeg') {
    const cover = await extractCoverFromMP3(file)
    if (cover) return cover
  }
  
  // M4A/MP4 аудио файлы
  if (fileName.endsWith('.m4a') || fileName.endsWith('.mp4') || 
      fileType === 'audio/mp4' || fileType === 'audio/x-m4a') {
    const cover = await extractCoverFromM4A(file)
    if (cover) return cover
  }
  
  // Видео файлы - извлекаем thumbnail
  if (fileType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.webm')) {
    return await extractThumbnailFromVideo(file)
  }
  
  return null
}

// Конвертировать Blob в File для загрузки
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type })
}

// Создать Data URL из Blob для превью
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
