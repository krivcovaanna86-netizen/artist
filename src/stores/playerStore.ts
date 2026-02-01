import { create } from 'zustand'
import { Howl } from 'howler'
import { getStreamUrl, recordPlay, checkCanPlay, type Track, type PlayCheckResult } from '../lib/api/client'

interface PlayerState {
  // Current track
  currentTrack: Track | null
  streamUrl: string | null
  
  // Playback state
  isPlaying: boolean
  isLoading: boolean
  duration: number
  currentTime: number
  volume: number
  
  // Play permission
  playPermission: PlayCheckResult | null
  
  // Howler instance
  howl: Howl | null
  
  // Actions
  loadTrack: (track: Track) => Promise<boolean>
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  stop: () => void
  cleanup: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  streamUrl: null,
  isPlaying: false,
  isLoading: false,
  duration: 0,
  currentTime: 0,
  volume: 1,
  playPermission: null,
  howl: null,

  loadTrack: async (track: Track) => {
    const state = get()
    
    // If same track and already loaded, just return true
    if (state.currentTrack?.id === track.id && state.howl) {
      return true
    }
    
    // Cleanup previous track
    state.cleanup()
    
    set({ isLoading: true, currentTrack: track })
    
    try {
      // Check if user can play
      const permission = await checkCanPlay(track.id)
      set({ playPermission: permission })
      
      if (!permission.canPlay) {
        set({ isLoading: false })
        return false
      }
      
      // Record play attempt
      await recordPlay(track.id)
      
      // Get stream URL
      const { streamUrl } = await getStreamUrl(track.id)
      
      // Create Howl instance
      const howl = new Howl({
        src: [streamUrl],
        html5: true,
        volume: state.volume,
        onload: () => {
          set({ duration: howl.duration(), isLoading: false })
        },
        onplay: () => {
          set({ isPlaying: true })
          requestAnimationFrame(updateTime)
        },
        onpause: () => {
          set({ isPlaying: false })
        },
        onstop: () => {
          set({ isPlaying: false, currentTime: 0 })
        },
        onend: async () => {
          set({ isPlaying: false, currentTime: 0 })
          // Mark as completed
          try {
            await recordPlay(track.id, 'complete')
          } catch (e) {
            console.error('Failed to mark play as completed:', e)
          }
        },
        onloaderror: (id, error) => {
          console.error('Load error:', error)
          set({ isLoading: false })
        },
        onplayerror: (id, error) => {
          console.error('Play error:', error)
          set({ isPlaying: false, isLoading: false })
        },
      })
      
      const updateTime = () => {
        const state = get()
        if (state.howl && state.isPlaying) {
          set({ currentTime: state.howl.seek() as number })
          requestAnimationFrame(updateTime)
        }
      }
      
      set({ howl, streamUrl })
      return true
    } catch (error) {
      console.error('Failed to load track:', error)
      set({ isLoading: false })
      return false
    }
  },

  play: () => {
    const { howl } = get()
    if (howl) {
      howl.play()
    }
  },

  pause: () => {
    const { howl } = get()
    if (howl) {
      howl.pause()
    }
  },

  toggle: () => {
    const { isPlaying, play, pause } = get()
    if (isPlaying) {
      pause()
    } else {
      play()
    }
  },

  seek: (time: number) => {
    const { howl } = get()
    if (howl) {
      howl.seek(time)
      set({ currentTime: time })
    }
  },

  setVolume: (volume: number) => {
    const { howl } = get()
    const clampedVolume = Math.max(0, Math.min(1, volume))
    if (howl) {
      howl.volume(clampedVolume)
    }
    set({ volume: clampedVolume })
  },

  stop: () => {
    const { howl } = get()
    if (howl) {
      howl.stop()
    }
  },

  cleanup: () => {
    const { howl } = get()
    if (howl) {
      howl.unload()
    }
    set({
      howl: null,
      streamUrl: null,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
    })
  },
}))
