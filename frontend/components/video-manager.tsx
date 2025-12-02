"use client"

import { createContext, useContext, useEffect, useRef, useCallback } from 'react'

interface VideoManagerContextType {
  registerVideo: (videoRef: HTMLVideoElement, autoPlay?: boolean) => void
  unregisterVideo: (videoRef: HTMLVideoElement) => void
  pauseAllVideos: () => void
  playVideo: (videoRef: HTMLVideoElement) => void
  pauseVideo: (videoRef: HTMLVideoElement) => void
}

const VideoManagerContext = createContext<VideoManagerContextType | null>(null)

export function VideoManagerProvider({ children }: { children: React.ReactNode }) {
  const videoRefs = useRef<Set<HTMLVideoElement>>(new Set())
  const videoStates = useRef<Map<HTMLVideoElement, { autoPlay: boolean; isVisible: boolean }>>(new Map())
  const observerRef = useRef<IntersectionObserver | null>(null)
  const eventHandlers = useRef<Map<HTMLVideoElement, (event: Event) => void>>(new Map())

  const registerVideo = useCallback((videoRef: HTMLVideoElement, autoPlay: boolean = false) => {
    videoRefs.current.add(videoRef)
    videoStates.current.set(videoRef, { autoPlay, isVisible: false })
    
    console.log(`🎬 Video registered: ${videoRef.src}, autoPlay: ${autoPlay}, total videos: ${videoRefs.current.size}`)
    
    // Add event listener immediately
    const handlePlay = (event: Event) => {
      const playingVideo = event.target as HTMLVideoElement
      console.log(`▶️ Video started playing: ${playingVideo.src}`)
      
      // Pause ALL other videos immediately
      videoRefs.current.forEach(video => {
        if (video !== playingVideo && !video.paused) {
          console.log(`⏸️ Pausing other video: ${video.src}`)
          video.pause()
        }
      })
    }
    
    // Also handle user interaction events
    const handleUserInteraction = (event: Event) => {
      const video = event.target as HTMLVideoElement
      console.log(`👆 User interacted with video: ${video.src}`)
      // This ensures the video is properly registered for auto-play
    }
    
    // Store the handler references for proper removal
    eventHandlers.current.set(videoRef, { handlePlay, handleUserInteraction })
    videoRef.addEventListener('play', handlePlay)
    videoRef.addEventListener('click', handleUserInteraction)
    videoRef.addEventListener('touchstart', handleUserInteraction)
    
    // Observe with intersection observer
    if (observerRef.current) {
      observerRef.current.observe(videoRef)
    }
  }, [])

  const unregisterVideo = useCallback((videoRef: HTMLVideoElement) => {
    videoRefs.current.delete(videoRef)
    videoStates.current.delete(videoRef)
    
    console.log(`🎬 Video unregistered: ${videoRef.src}, total videos: ${videoRefs.current.size}`)
    
    // Remove event listeners using stored handlers
    const handlers = eventHandlers.current.get(videoRef)
    if (handlers) {
      videoRef.removeEventListener('play', handlers.handlePlay)
      videoRef.removeEventListener('click', handlers.handleUserInteraction)
      videoRef.removeEventListener('touchstart', handlers.handleUserInteraction)
      eventHandlers.current.delete(videoRef)
    }
    
    // Stop observing
    if (observerRef.current) {
      observerRef.current.unobserve(videoRef)
    }
  }, [])

  const pauseAllVideos = useCallback(() => {
    videoRefs.current.forEach(video => {
      if (video && !video.paused) {
        video.pause()
      }
    })
  }, [])

  const playVideo = useCallback((videoRef: HTMLVideoElement) => {
    // Pause all other videos first
    videoRefs.current.forEach(video => {
      if (video !== videoRef && !video.paused) {
        console.log(`⏸️ Pausing other video before playing: ${video.src}`)
        video.pause()
      }
    })
    // Then play the target video with error handling
    if (videoRef && videoRef.paused) {
      console.log(`▶️ Attempting to play video: ${videoRef.src}`)
      videoRef.play().catch((error) => {
        // Silently handle auto-play failures (browser blocks without user interaction)
        console.log(`❌ Auto-play blocked for video: ${videoRef.src}, error:`, error)
      })
    }
  }, [])

  const pauseVideo = useCallback((videoRef: HTMLVideoElement) => {
    if (videoRef && !videoRef.paused) {
      videoRef.pause()
    }
  }, [])

  // Set up Intersection Observer once
  useEffect(() => {
    console.log(`🎬 Setting up Intersection Observer`)
    observerRef.current = new IntersectionObserver(
      (entries) => {
        console.log(`👁️ Intersection Observer callback called with ${entries.length} entries`)
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement
          const state = videoStates.current.get(video)
          
          if (state) {
            const wasVisible = state.isVisible
            state.isVisible = entry.isIntersecting
            
            console.log(`👁️ Video visibility changed: ${video.src}, isIntersecting: ${entry.isIntersecting}, wasVisible: ${wasVisible}, autoPlay: ${state.autoPlay}, paused: ${video.paused}`)
            
            if (entry.isIntersecting && state.autoPlay && video.paused) {
              // Auto-play when video comes into view
              console.log(`▶️ Auto-playing video: ${video.src}`)
              // Pause all other videos first, then play this one
              videoRefs.current.forEach(otherVideo => {
                if (otherVideo !== video && !otherVideo.paused) {
                  console.log(`⏸️ Pausing other video before auto-play: ${otherVideo.src}`)
                  otherVideo.pause()
                }
              })
              // Then play the target video
              video.play().catch((error) => {
                console.log(`❌ Auto-play blocked for video: ${video.src}, error:`, error)
              })
            } else if (!entry.isIntersecting && !video.paused) {
              // Pause when video goes out of view
              console.log(`⏸️ Auto-pausing video: ${video.src}`)
              pauseVideo(video)
            }
          } else {
            console.log(`⚠️ No state found for video: ${video.src}`)
          }
        })
      },
      {
        threshold: 0.5, // 50% of video must be visible
        rootMargin: '0px 0px -100px 0px' // Start playing slightly before fully visible
      }
    )

    return () => {
      console.log(`🎬 Disconnecting Intersection Observer`)
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [playVideo, pauseVideo])

  return (
    <VideoManagerContext.Provider value={{ registerVideo, unregisterVideo, pauseAllVideos, playVideo, pauseVideo }}>
      {children}
    </VideoManagerContext.Provider>
  )
}

export function useVideoManager() {
  const context = useContext(VideoManagerContext)
  if (!context) {
    throw new Error('useVideoManager must be used within a VideoManagerProvider')
  }
  return context
}

// Hook for individual video components with auto-play support
export function useVideoControl(videoRef: React.RefObject<HTMLVideoElement>, autoPlay: boolean = false) {
  const { registerVideo, unregisterVideo } = useVideoManager()

  useEffect(() => {
    const video = videoRef.current
    if (video) {
      registerVideo(video, autoPlay)
      return () => {
        unregisterVideo(video)
      }
    }
  }, [videoRef, registerVideo, unregisterVideo, autoPlay])
} 