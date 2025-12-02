"use client"

import React, { useRef, useEffect } from "react"

import { useState } from "react"
import {
  MessageCircle,
  Repeat2,
  Heart,
  Share,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  Plus,
  Download,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon,
  Video,
  Flag,
} from "lucide-react"
import { usePostApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { InlineCommentSection } from "./inline-comment-section"
import { RepostModal } from "./repost-modal"
import { FollowButton } from "./follow-button"
import { ReportModal } from "./report-modal"
import Link from "next/link"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useCommentEvents } from "@/hooks/use-comment-events"
import { usePostRealTimeUpdates } from "@/hooks/use-real-time-updates"
import Image from 'next/image'
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { useVideoControl, useVideoManager } from "@/components/video-manager"

interface PostProps {
  post: {
    _id: string
    author: {
      _id: string
      username: string
      firstName?: string
      lastName?: string
      profileImageUrl?: string
    }
    content: string
    media?: Array<{
      type: "image" | "video"
      url: string
      thumbnailUrl?: string
    }>
    likeCount: number
    commentCount: number
    repostCount: number
    createdAt: string
    isLiked?: boolean
    isReposted?: boolean
  }
  onPostUpdate?: (updatedPost?: any) => void
  onPostDelete?: (deletedPostId?: string) => void
}

const isMobile = () => typeof window !== "undefined" && window.innerWidth < 640

const CarouselDots = ({
  count,
  current,
  onDotClick,
}: { count: number; current: number; onDotClick: (index: number) => void }) => (
  <div className="flex justify-center gap-2 mt-3">
    {Array.from({ length: count }).map((_, idx) => (
      <button
        key={idx}
        onClick={() => onDotClick(idx)}
        className={`w-2 h-2 rounded-full transition-all duration-200 ${
          idx === current
            ? "bg-blue-500 scale-110"
            : "bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
        }`}
      />
    ))}
  </div>
)

// Full-screen media viewer component
const MediaViewer = ({
  media,
  initialIndex,
  isOpen,
  onClose,
}: {
  media: Array<{ url: string; type: string }>
  initialIndex: number
  isOpen: boolean
  onClose: () => void
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { registerVideo, unregisterVideo } = useVideoManager()

  // Register video with manager (no auto-play for full-screen viewer)
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      registerVideo(video, false) // No auto-play for full-screen viewer
      return () => {
        unregisterVideo(video)
      }
    }
  }, [registerVideo, unregisterVideo])

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length)
  }

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    const currentTouch = e.touches[0].clientX
    const diff = touchStart - currentTouch

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextMedia()
      } else {
        prevMedia()
      }
      setTouchStart(null)
    }
  }

  const onTouchEnd = () => {
    setTouchStart(null)
  }

  // Detect video dimensions when video loads
  const handleVideoLoad = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget
    setVideoDimensions({
      width: video.videoWidth,
      height: video.videoHeight
    })
  }

  // Reset dimensions when media changes
  useEffect(() => {
    setVideoDimensions(null)
  }, [currentIndex])

  const getMediaStyle = () => {
    const currentItem = media[currentIndex]
    if (currentItem.type === 'video') {
      return {
        maxWidth: '100%',
        maxHeight: '100%',
        width: 'auto',
        height: 'auto',
        objectFit: 'contain' as const,
      }
    }
    return {
      width: '100%',
      height: '100%',
      objectFit: 'contain' as const,
    }
  }

  const getVideoContainerStyle = () => {
    if (!videoDimensions) {
      return {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }
    }

    const { width, height } = videoDimensions
    const aspectRatio = width / height
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxWidth = viewportWidth * 0.9
    const maxHeight = viewportHeight * 0.8

    let videoWidth = width
    let videoHeight = height

    // Scale down if video is too large
    if (videoWidth > maxWidth) {
      videoWidth = maxWidth
      videoHeight = videoWidth / aspectRatio
    }

    if (videoHeight > maxHeight) {
      videoHeight = maxHeight
      videoWidth = videoHeight * aspectRatio
    }

    return {
      width: `${videoWidth}px`,
      height: `${videoHeight}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }

  const downloadMedia = async () => {
    const currentItem = media[currentIndex]
    try {
      const response = await fetch(currentItem.url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `media-${Date.now()}.${currentItem.type === 'video' ? 'mp4' : 'jpg'}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error downloading media:', error)
    }
  }

  useEffect(() => {
    setCurrentIndex(initialIndex)
  }, [initialIndex])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'Escape':
          onClose()
          break
        case 'ArrowRight':
          nextMedia()
          break
        case 'ArrowLeft':
          prevMedia()
          break
        case 'd':
          downloadMedia()
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentIndex, onClose])

  if (!isOpen) return null

  const currentItem = media[currentIndex]

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen p-0 border-none max-w-none bg-black/95">
        <div className="relative flex items-center justify-center w-full h-full">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute z-50 flex items-center justify-center w-10 h-10 text-white transition-all duration-200 rounded-full top-4 right-4 bg-black/50 hover:bg-black/70"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Download button */}
          <button
            onClick={downloadMedia}
            className="absolute z-50 flex items-center justify-center w-10 h-10 text-white transition-all duration-200 rounded-full top-4 right-16 bg-black/50 hover:bg-black/70"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Media container */}
          <div 
            className="relative flex items-center justify-center w-full h-full"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {currentItem.type === 'video' ? (
              <div style={getVideoContainerStyle()}>
                <video
                  ref={videoRef}
                  src={currentItem.url}
                  controls
                  autoPlay
                  preload="metadata"
                  style={getMediaStyle()}
                  className="object-contain"
                  playsInline
                  onLoadedMetadata={handleVideoLoad}
                  onError={(e) => {
                    console.log('Video auto-play failed:', e)
                  }}
                />
              </div>
            ) : (
              <img
                src={currentItem.url}
                alt="Full size"
                style={getMediaStyle()}
                className="max-w-full max-h-full"
              />
            )}
          </div>

          {/* Navigation arrows */}
          {media.length > 1 && (
            <>
              <button
                onClick={prevMedia}
                className="absolute flex items-center justify-center w-12 h-12 text-white transition-all duration-200 -translate-y-1/2 rounded-full left-4 top-1/2 bg-black/50 hover:bg-black/70"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextMedia}
                className="absolute flex items-center justify-center w-12 h-12 text-white transition-all duration-200 -translate-y-1/2 rounded-full right-4 top-1/2 bg-black/50 hover:bg-black/70"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Media counter */}
          {media.length > 1 && (
            <div className="absolute px-3 py-1 text-sm text-white -translate-x-1/2 rounded-full bottom-4 left-1/2 bg-black/50">
              {currentIndex + 1} / {media.length}
            </div>
          )}

          {/* Dot indicators */}
          {media.length > 1 && (
            <div className="absolute flex space-x-2 -translate-x-1/2 bottom-4 left-1/2">
              {Array.from({ length: media.length }).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentIndex
                      ? "bg-white scale-125"
                      : "bg-white/50 hover:bg-white/75"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}



export const Post = React.memo(function Post({ post, onPostUpdate, onPostDelete }: PostProps) {
  const { user } = useAuth()
  const userId = user?.id
  const { guardInteraction } = useInteractionGuard()

  // Handle both original posts and reposts
  const isRepost = (post as any).isRepost
  const actualPost = isRepost ? (post as any).originalPost : post
  const actualAuthor = isRepost ? (post as any).repostUser : post.author
  const originalAuthor = isRepost ? (post as any).originalPost?.author : null
  const isOwnPost = userId === actualAuthor?._id

  // Create video refs for all possible videos (max 4 total media)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const { registerVideo, unregisterVideo } = useVideoManager()

  // Initialize video refs array
  useEffect(() => {
    videoRefs.current = Array(4).fill(null)
  }, [])

  // Track registered videos to avoid duplicates
  const registeredVideos = useRef<Set<HTMLVideoElement>>(new Set())

  // Cleanup registered videos when component unmounts
  useEffect(() => {
    return () => {
      console.log(`🎬 Post ${post._id}: Cleaning up ${registeredVideos.current.size} registered videos`)
      registeredVideos.current.forEach((videoRef) => {
        console.log(`🎬 Unregistering video: ${videoRef.src}`)
        unregisterVideo(videoRef)
      })
      registeredVideos.current.clear()
    }
  }, [unregisterVideo, post._id])

  // Helper function to get video ref
  const getVideoRef = (index: number, autoPlay: boolean = true) => {
    return (el: HTMLVideoElement | null) => {
      const currentRef = videoRefs.current[index]
      
      if (el && el !== currentRef) {
        console.log(`🎬 Setting video ref ${index}: ${el.src}`)
        videoRefs.current[index] = el
        // IMMEDIATELY register the video when ref is set
        if (!registeredVideos.current.has(el)) {
          console.log(`🎬 Immediately registering video ${index}: ${el.src}`)
          registerVideo(el, true) // Auto-play for feed videos
          registeredVideos.current.add(el)
        }
      } else if (!el && currentRef) {
        console.log(`🎬 Clearing video ref ${index}`)
        videoRefs.current[index] = null
        // Unregister when ref is cleared
        if (registeredVideos.current.has(currentRef)) {
          console.log(`🎬 Immediately unregistering video ${index}: ${currentRef.src}`)
          unregisterVideo(currentRef)
          registeredVideos.current.delete(currentRef)
        }
      }
    }
  }

  // Initialize state with proper values for both posts and reposts
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [repostCount, setRepostCount] = useState(0)
  const [isReposted, setIsReposted] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [isRepostModalOpen, setIsRepostModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const { likePost, deletePost, updatePost, repost: repostApi, deleteRepost, updateRepost } = usePostApi()
  const [isLiking, setIsLiking] = useState(false)

  // Inline editing state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedImages, setSelectedImages] = useState<File[]>([])
  const [selectedVideos, setSelectedVideos] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoPreviews, setVideoPreviews] = useState<string[]>([])
  const [removedImageIndices, setRemovedImageIndices] = useState<number[]>([])

  // Image viewer state
  const [imageViewerOpen, setImageViewerOpen] = useState(false)
  const [imageViewerIndex, setImageViewerIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  // Inline repost state
  const [showRepostPopover, setShowRepostPopover] = useState(false)
  const [repostComment, setRepostComment] = useState("")
  const [isReposting, setIsReposting] = useState(false)

  // For reposts, use the original post's like status and count
  const [repostLikeState, setRepostLikeState] = useState({
    isLiked: false,
    likeCount: 0,
  })

  // Carousel state for post media
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [mobile, setMobile] = useState(false)
  const [carouselApi, setCarouselApi] = useState<any>(null)

  // Check if original author is blocked
  const isOriginalAuthorBlocked = isRepost && (post as any).isOriginalAuthorBlocked
  const isOriginalAuthorBlocking = isRepost && (post as any).isOriginalAuthorBlocking
  const isOriginalPostDeleted = isRepost && (post as any).isOriginalPostDeleted

  // Track last initialized post ID to avoid type comparison issues
  const [lastInitializedPostId, setLastInitializedPostId] = useState<string | null>(null)

  // Synchronize state with prop changes
  useEffect(() => {
    if (isRepost) {
      setRepostLikeState({
        isLiked: (post as any).originalPost?.isLiked || false,
        likeCount: (post as any).originalPost?.likeCount || 0,
      })
      // Update repost count from original post with validation
      const originalRepostCount = (post as any).originalPost?.repostCount
      const validRepostCount =
        typeof originalRepostCount === "number" && !isNaN(originalRepostCount) ? originalRepostCount : 0
      setRepostCount(validRepostCount)
      // Set comment count from original post for reposts
      const originalCommentCount = (post as any).originalPost?.commentCount
      const validCommentCount =
        typeof originalCommentCount === "number" && !isNaN(originalCommentCount) ? originalCommentCount : 0
      setCommentCount(validCommentCount)
    } else {
      const validRepostCount = typeof post.repostCount === "number" && !isNaN(post.repostCount) ? post.repostCount : 0
      const validCommentCount = typeof post.commentCount === "number" && !isNaN(post.commentCount) ? post.commentCount : 0
      setIsReposted(post.isReposted || false)
      setRepostCount(validRepostCount)
      setCommentCount(validCommentCount)
      // Only initialize like state if post._id changes
      if (lastInitializedPostId !== post._id) {
        setIsLiked(post.isLiked || false)
        setLikeCount(post.likeCount || 0)
        setLastInitializedPostId(post._id)
      }
    }
  }, [post._id, isRepost])

  // Carousel effects
  useEffect(() => {
    setMobile(isMobile())
    const handleResize = () => setMobile(isMobile())
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    if (!carouselApi) return

    const handleSelect = () => {
      setCarouselIndex(carouselApi.selectedScrollSnap())
    }

    carouselApi.on("select", handleSelect)
    return () => carouselApi.off("select", handleSelect)
  }, [carouselApi])

  // Cleanup image previews on unmount
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview)
        }
      })
    }
  }, [])

  // Real-time comment event handlers for cross-user updates
  const handleRealTimeNewComment = (comment: any) => {
    if (comment.postId === actualPost?._id) {
      setCommentCount(prev => prev + 1);
    }
  };

  const handleRealTimeNewReply = (reply: any, parentCommentId: string) => {
    // Comment count is updated by the parent comment component
  };

  const handleRealTimeCommentDeleted = (commentId: string) => {
    // Comment count is updated by the parent comment component
  };

  const handleRealTimeRepostCountUpdate = (data: any) => {
    if (data.postId === actualPost?._id) {
      setRepostCount(data.repostCount)
    }
  }

  const handleRealTimeCommentCountUpdate = (data: any) => {
    if (data.postId === actualPost?._id) {
      setCommentCount(data.commentCount)
    }
  }

  // Real-time update handlers
  const handleRealTimeLikeCountUpdate = (data: { postId: string, likeCount: number }) => {
    if (data.postId === actualPost?._id) {
      if (isRepost) {
        setRepostLikeState((prev) => ({ ...prev, likeCount: data.likeCount }))
      } else {
        setLikeCount(data.likeCount)
      }
    }
  }

  // Use real-time update hook - must be before early returns
  // Only call if we have a valid post ID
  const postIdForUpdates = actualPost?._id || post?._id || ''
  usePostRealTimeUpdates(
    postIdForUpdates,
    undefined, // no isLiked update from real-time
    handleRealTimeRepostCountUpdate,
    handleRealTimeCommentCountUpdate,
    handleRealTimeLikeCountUpdate // for all users
  )

  const repostPopoverRef = useRef<HTMLDivElement>(null)
  const postRef = useRef<HTMLDivElement>(null)

  // Add scroll listener to close popover on scroll - must be before early returns
  useEffect(() => {
    if (!showRepostPopover) return;
    const handleScroll = () => setShowRepostPopover(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showRepostPopover]);

  // Safety check for invalid post data - moved after all hooks
  if (!post) {
    return (
      <div className="p-6 border-b border-gray-200 dark:border-gray-800">
        <p className="text-gray-500 dark:text-gray-400">Post not available</p>
      </div>
    )
  }

  // Helper function for timestamp formatting
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "now"
    if (diffInMinutes < 60) return `${diffInMinutes}m`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d`

    return date.toLocaleDateString()
  }

  const formatTimestampDetailed = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "JUST NOW"
    if (diffInMinutes < 60) {
      const value = diffInMinutes
      return `${value} MIN${value === 1 ? "" : "S"} AGO`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      const value = diffInHours
      return `${value} HOUR${value === 1 ? "" : "S"} AGO`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) {
      const value = diffInDays
      return `${value} DAY${value === 1 ? "" : "S"} AGO`
    }

    const diffInWeeks = Math.floor(diffInDays / 7)
    if (diffInWeeks < 5) {
      const value = diffInWeeks
      return `${value} WEEK${value === 1 ? "" : "S"} AGO`
    }

    return date
      .toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
      })
      .toUpperCase()
  }

  // Safety check for orphaned posts (null/undefined author)
  if (!actualAuthor || !actualAuthor._id) {
    return (
      <div className="p-3 border-b border-gray-200 xs:p-4 sm:p-6 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="flex gap-3 xs:gap-4">
          <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full xs:w-10 xs:h-10 dark:bg-gray-600">
            <span className="text-xs text-gray-500 dark:text-gray-400">?</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm italic text-gray-500 dark:text-gray-400">
                {isRepost ? "Repost from deleted user" : "Post from deleted user"}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatTimestamp(actualPost?.createdAt || new Date().toISOString())}
              </span>
            </div>
            {actualPost?.content && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {actualPost.content}
              </p>
            )}
            {actualPost?.media && actualPost.media.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Media content from deleted user
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const authorName =
    actualAuthor?.firstName && actualAuthor?.lastName
      ? `${actualAuthor.firstName} ${actualAuthor.lastName}`
      : actualAuthor?.username || "Unknown User"

  // Helper function to safely display repost count
  const getSafeRepostCount = (count: number) => {
    if (count === null || count === undefined || isNaN(count)) {
      return 0
    }
    return count
  }

  const handleLike = async () => {
    // Guard the like interaction for non-authenticated users
    const canProceed = guardInteraction("like this post", () => {})
    if (!canProceed) return

    if (isLiking) return // Prevent spamming
    setIsLiking(true)
    const prevIsLiked = isRepost ? repostLikeState.isLiked : isLiked
    const prevLikeCount = isRepost ? repostLikeState.likeCount : likeCount

    // Optimistic update
    if (isRepost) {
      setRepostLikeState({
        isLiked: !prevIsLiked,
        likeCount: prevIsLiked ? prevLikeCount - 1 : prevLikeCount + 1,
      })
    } else {
      setIsLiked(!prevIsLiked)
      setLikeCount(prevIsLiked ? prevLikeCount - 1 : prevLikeCount + 1)
    }

    try {
      const response = await likePost(actualPost._id)
      // Only update isLiked from API response
      if (isRepost) {
        setRepostLikeState((prev) => ({ ...prev, isLiked: response.liked }))
      } else {
        setIsLiked(response.liked)
      }
      // likeCount will be updated by real-time event
    } catch (error) {
      // Revert optimistic update
      if (isRepost) {
        setRepostLikeState({
          isLiked: prevIsLiked,
          likeCount: prevLikeCount,
        })
      } else {
        setIsLiked(prevIsLiked)
        setLikeCount(prevLikeCount)
      }
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await deletePost(actualPost._id)
      onPostDelete?.(actualPost._id)
      // Removed success toast - visual feedback is enough
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteRepost = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await deleteRepost(post._id)
      onPostDelete?.(post._id)
      // Removed success toast - visual feedback is enough
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete repost",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    if (isRepost) {
      // For reposts, edit the repost comment
      const repostComment = (post as any).repostComment || ""
      setEditContent(repostComment)
    } else {
      // For regular posts, edit the post content
      setEditContent(actualPost.content)
    }
    setSelectedImages([])
    setSelectedVideos([])
    setImagePreviews([])
    setVideoPreviews([])
    setRemovedImageIndices([])
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (isRepost) {
      // For reposts, reset to the repost comment
      const repostComment = (post as any).repostComment || ""
      setEditContent(repostComment)
    } else {
      // For regular posts, reset to the post content
      setEditContent(actualPost.content)
    }
    setSelectedImages([])
    setSelectedVideos([])
    setImagePreviews([])
    setVideoPreviews([])
    setRemovedImageIndices([])
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    const currentMediaCount = (actualPost.media?.length || 0) - removedImageIndices.length + selectedImages.length
    if (currentMediaCount + files.length > 4) {
      toast({
        title: "Error",
        description: "You can only upload up to 4 media files total",
        variant: "destructive",
      })
      return
    }

    const newImages = [...selectedImages, ...files]
    setSelectedImages(newImages)

    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file))
    setImagePreviews((prev) => [...prev, ...newPreviews])
  }

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])

    const currentMediaCount = (actualPost.media?.length || 0) - removedImageIndices.length + selectedImages.length
    if (currentMediaCount + files.length > 4) {
      toast({
        title: "Error",
        description: "You can only upload up to 4 media files total",
        variant: "destructive",
      })
      return
    }

    // Check video count limit
    const existingVideos = (actualPost.media?.filter((item: any) => item.type === 'video').length || 0)
    const newVideoCount = files.length
    if (existingVideos + newVideoCount > 2) {
      toast({
        title: "Error",
        description: "You can only upload up to 2 videos per post",
        variant: "destructive",
      })
      return
    }

    // Validate video files
    const validFiles: File[] = []
    const invalidFiles: string[] = []
    
    files.forEach(file => {
      const maxSize = 500 * 1024 * 1024; // 500MB
      const allowedTypes = [
        'video/mp4', 
        'video/webm', 
        'video/ogg', 
        'video/quicktime', 
        'video/x-msvideo',
        'video/x-ms-wmv',
        'video/x-matroska',
        'video/3gpp',
        'video/3gpp2',
        'video/x-flv',
        'video/x-f4v',
        'video/x-f4p',
        'video/x-f4a',
        'video/x-f4b'
      ];
      
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name}: File size must be less than 500MB`)
      } else if (!allowedTypes.includes(file.type)) {
        invalidFiles.push(`${file.name}: Only MP4, WebM, OGG, MOV, AVI, WMV, MKV, 3GP, and FLV formats are supported`)
      } else {
        validFiles.push(file)
      }
    })

    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid Videos",
        description: invalidFiles.join(', '),
        variant: "destructive"
      })
    }

    if (validFiles.length === 0) return

    const updatedVideos = [...selectedVideos, ...validFiles]
    setSelectedVideos(updatedVideos)

    // Create video previews
    const newPreviews = validFiles.map((file) => URL.createObjectURL(file))
    setVideoPreviews((prev) => [...prev, ...newPreviews])
  }

  const removeExistingImage = (originalIndex: number) => {
    setRemovedImageIndices((prev) => [...prev, originalIndex])
  }

  const removeNewImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => {
      const newPreviews = prev.filter((_, i) => i !== index)
      return newPreviews
    })
  }

  const removeNewVideo = (index: number) => {
    setSelectedVideos((prev) => prev.filter((_, i) => i !== index))
    setVideoPreviews((prev) => {
      const newPreviews = prev.filter((_, i) => i !== index)
      // Clean up the blob URL
      const removedPreview = prev[index]
      if (removedPreview) {
        URL.revokeObjectURL(removedPreview)
      }
      return newPreviews
    })
  }

  const handleSaveEdit = async () => {
    if (editContent.length > 1500) {
      toast({
        title: "Error",
        description: "Content cannot exceed 1500 characters",
        variant: "destructive",
      })
      return
    }

          setIsUpdating(true)
      try {
        let updatedPost = null

        if (isRepost) {
          // For reposts, update the repost comment
          await updateRepost(post._id, editContent.trim())
          updatedPost = actualPost // For reposts, use the existing post data
        } else {
          // For regular posts, update the post content and media
          if (!editContent.trim()) {
            toast({
              title: "Error",
              description: "Post content cannot be empty",
              variant: "destructive",
            })
            return
          }

          const formData = new FormData()
          formData.append("content", editContent.trim())

          if (removedImageIndices.length > 0) {
            formData.append("removeImages", JSON.stringify(removedImageIndices))
          }

          if (selectedImages.length > 0) {
            selectedImages.forEach((file) => {
              formData.append("media", file)
            })
          }

          if (selectedVideos.length > 0) {
            selectedVideos.forEach((file) => {
              formData.append("media", file)
            })
          }

          const response = await updatePost(actualPost._id, formData)
          updatedPost = response.post // Use the fresh data from API response
        }

        setIsEditing(false)
        // Use the updated post data
        onPostUpdate?.(updatedPost)
    } catch (error) {
      toast({
        title: "Error",
        description: isRepost ? "Failed to update repost" : "Failed to update post",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePostUpdated = () => {
    onPostUpdate?.(actualPost)
  }

  const handleCommentSuccess = () => {
    // Real-time events will handle comment count updates
    // No need to manually increment here
  }

  const handleCommentDeleted = () => {
    // Real-time events will handle comment count updates
    // No need to manually decrement here
  }

  const handleReplyCreated = () => {
    // Real-time events will handle comment count updates
    // No need to manually increment here
  }

  const handleRepostSuccess = () => {
    setIsReposted(true)
    setRepostCount((prev) => prev + 1)
    onPostUpdate?.(actualPost)
  }

  const handleShare = async () => {
    try {
      const postUrl = `${window.location.origin}/post/${actualPost._id}`
      await navigator.clipboard.writeText(postUrl)
      toast({
        title: "Success",
        description: "Post link copied to clipboard!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy post link",
        variant: "destructive",
      })
    }
  }

  const openImageViewer = (index: number) => {
    setImageViewerIndex(index)
    setImageViewerOpen(true)
  }

  // Helper to render the main post content (used for both original and repost)
  const renderPostContent = (p: any, options: { showCaption?: boolean } = {}) => {
    const { showCaption = true } = options
    const handleDotClick = (index: number) => {
      if (carouselApi) {
        carouselApi.scrollTo(index)
      }
    }

    // Function to render media in grid layout
    const renderMediaGrid = (media: any[]) => {
      if (!media || media.length === 0) return null

      const mediaCount = media.length
      
      // Single media - preserve aspect ratio
      if (mediaCount === 1) {
        const item = media[0]
        return (
          <div className="relative mt-2 overflow-hidden rounded-2xl xs:mt-3 group">
            {item.type === 'video' ? (
              <div className="relative w-full overflow-hidden bg-black rounded-2xl">
                <video
                  ref={getVideoRef(0)}
                  src={item.url || "/placeholder.svg"}
                  controls
                  preload="metadata"
                  muted
                  className="w-full h-auto max-h-[500px] object-contain rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                  onClick={() => openImageViewer(0)}
                  playsInline
                />
              </div>
            ) : (
              <Image
                src={item.url || "/placeholder.svg"}
                alt="Post image"
                className="w-full max-h-[500px] object-contain rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                draggable={false}
                loading="lazy"
                width={800}
                height={500}
                onClick={() => openImageViewer(0)}
                style={{ width: '100%', height: 'auto' }}
              />
            )}
          </div>
        )
      }

      // Multiple media - show only first media with overlay
      const currentItem = media[currentImageIndex]
      return (
        <div className="relative mt-2 overflow-hidden rounded-2xl xs:mt-3">
          {currentItem.type === 'video' ? (
            <div className="relative w-full overflow-hidden bg-black rounded-2xl">
              <video
                ref={getVideoRef(currentImageIndex)}
                src={currentItem.url || "/placeholder.svg"}
                controls
                muted
                className="w-full h-auto max-h-[500px] object-contain rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
                onClick={() => openImageViewer(currentImageIndex)}
                playsInline
              />
            </div>
          ) : (
            <Image
              src={currentItem.url || "/placeholder.svg"}
              alt="Post image"
              className="w-full max-h-[500px] object-contain rounded-2xl cursor-pointer transition-transform duration-200 hover:scale-[1.02]"
              draggable={false}
              loading="lazy"
              width={800}
              height={500}
              onClick={() => openImageViewer(currentImageIndex)}
              style={{ width: '100%', height: 'auto' }}
            />
          )}
          
          {/* Media count overlay */}
          <div className="absolute px-2 py-1 text-xs font-medium text-white rounded-full top-2 right-2 bg-black/70">
            {mediaCount} {mediaCount === 1 ? 'media' : 'media'}
          </div>
          
          {/* Desktop arrows - always visible on desktop */}
          <div className="hidden sm:block">
            <button
              onClick={(e) => {
                e.stopPropagation()
                const prevIndex = (currentImageIndex - 1 + mediaCount) % mediaCount
                setCurrentImageIndex(prevIndex)
              }}
              className="absolute flex items-center justify-center w-8 h-8 text-white transition-all duration-200 -translate-y-1/2 rounded-full left-2 top-1/2 bg-black/50 hover:bg-black/70 hover:scale-110"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                const nextIndex = (currentImageIndex + 1) % mediaCount
                setCurrentImageIndex(nextIndex)
              }}
              className="absolute flex items-center justify-center w-8 h-8 text-white transition-all duration-200 -translate-y-1/2 rounded-full right-2 top-1/2 bg-black/50 hover:bg-black/70 hover:scale-110"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {/* Dot indicators below media */}
          <div className="absolute flex space-x-1 -translate-x-1/2 bottom-2 left-1/2">
            {Array.from({ length: mediaCount }).map((_, index) => (
              <div
                key={index}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                  index === currentImageIndex
                    ? "bg-white scale-125"
                    : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className={`space-y-2`}>
        {showCaption && (
          <p
            className="text-sm leading-relaxed text-gray-900 break-words dark:text-white xs:text-base sm:text-lg"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {p.content}
          </p>
        )}
        {p.media && p.media.length > 0 && renderMediaGrid(p.media)}

        {/* Image Viewer */}
        {p.media && p.media.length > 0 && (
          <MediaViewer
            media={p.media}
            initialIndex={imageViewerIndex}
            isOpen={imageViewerOpen}
            onClose={() => setImageViewerOpen(false)}
          />
        )}
      </div>
    )
  }

  // Render inline edit form
  const renderEditForm = () => {
    const currentMedia =
      actualPost.media?.filter((_: any, index: number) => !removedImageIndices.includes(index)) || []
    const characterLimit = 1500
    const remainingChars = characterLimit - editContent.length
    const isOverLimit = remainingChars < 0

    return (
      <div className="space-y-2 xs:space-y-3 sm:space-y-4">
        <Textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          placeholder="What's happening?"
          className="min-h-[80px] xs:min-h-[100px] sm:min-h-[120px] resize-none text-sm xs:text-base sm:text-lg border-gray-200 dark:border-gray-700 focus:ring-blue-500 break-words rounded-2xl"
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          maxLength={1500}
        />

        {/* Existing Media */}
        {currentMedia.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const mediaCount = currentMedia.length
              
              // Single media - preserve aspect ratio
              if (mediaCount === 1) {
                const media = currentMedia[0]
                return (
                  <div className="relative group">
                    {media.type === 'video' ? (
                      <div className="relative w-full overflow-hidden bg-black rounded-xl">
                        <video
                          ref={getVideoRef(0, false)}
                          src={media.url || "/placeholder.svg"}
                          controls
                          muted
                          className="w-full h-auto max-h-[300px] object-contain rounded-xl"
                          playsInline
                        />
                      </div>
                    ) : (
                      <Image
                        src={media.url || "/placeholder.svg"}
                        alt="Post media"
                        className="w-full max-h-[300px] object-contain rounded-xl"
                        width={600}
                        height={300}
                        style={{ width: '100%', height: 'auto' }}
                      />
                    )}
                    <button
                      onClick={() => removeExistingImage(0)}
                      className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full top-2 right-2 bg-black/60 hover:bg-black/80 hover:scale-110"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              }

              // Multiple media - grid layout
              const getGridClass = () => {
                switch (mediaCount) {
                  case 2:
                    return "grid-cols-2 gap-2"
                  case 3:
                    return "grid-cols-2 gap-2"
                  case 4:
                    return "grid-cols-2 gap-2"
                  default:
                    return "grid-cols-3 gap-2"
                }
              }

              const getMediaClass = (index: number) => {
                if (mediaCount === 2) {
                  return "aspect-square object-cover h-32"
                }
                if (mediaCount === 3) {
                  return index === 2 ? "col-span-2 aspect-[2/1] object-cover h-32" : "aspect-square object-cover h-32"
                }
                if (mediaCount === 4) {
                  return "aspect-square object-cover h-32"
                }
                return "aspect-square object-cover h-24"
              }

              return (
                <div className={`grid ${getGridClass()}`}>
                  {currentMedia.map((media: any, displayIndex: number) => {
                    const originalIndex = actualPost.media?.findIndex((item: any) => item.url === media.url) ?? 0
                    
                    return (
                      <div key={`existing-${originalIndex}`} className="relative group">
                        {media.type === 'video' ? (
                          <div className="relative w-full overflow-hidden bg-black rounded-xl">
                            <video
                              ref={getVideoRef(originalIndex, false)}
                              src={media.url || "/placeholder.svg"}
                              controls
                              muted
                              className={`w-full h-auto ${getMediaClass(displayIndex)} rounded-xl transition-transform duration-200 group-hover:scale-[1.02]`}
                              playsInline
                            />
                          </div>
                        ) : (
                          <Image
                            src={media.url || "/placeholder.svg"}
                            alt="Post media"
                            className={`w-full ${getMediaClass(displayIndex)} rounded-xl transition-transform duration-200 group-hover:scale-[1.02]`}
                            width={300}
                            height={300}
                            style={{ width: '100%', height: 'auto' }}
                          />
                        )}
                        <button
                          onClick={() => removeExistingImage(originalIndex)}
                          className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full top-2 right-2 bg-black/60 hover:bg-black/80 hover:scale-110"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* New Media */}
        {/* New Images */}
        {imagePreviews.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const mediaCount = imagePreviews.length
              
              // Single media - preserve aspect ratio
              if (mediaCount === 1) {
                return (
                  <div className="relative group">
                    <Image
                      src={imagePreviews[0] || "/placeholder.svg"}
                      alt="New image"
                      className="w-full max-h-[300px] object-contain rounded-xl"
                      width={600}
                      height={300}
                      style={{ width: '100%', height: 'auto' }}
                    />
                    <button
                      onClick={() => removeNewImage(0)}
                      className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full top-2 right-2 bg-black/60 hover:bg-black/80 hover:scale-110"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              }

              // Multiple media - grid layout
              const getGridClass = () => {
                switch (mediaCount) {
                  case 2:
                    return "grid-cols-2 gap-2"
                  case 3:
                    return "grid-cols-2 gap-2"
                  case 4:
                    return "grid-cols-2 gap-2"
                  default:
                    return "grid-cols-3 gap-2"
                }
              }

              const getMediaClass = (index: number) => {
                if (mediaCount === 2) {
                  return "aspect-square object-cover h-32"
                }
                if (mediaCount === 3) {
                  return index === 2 ? "col-span-2 aspect-[2/1] object-cover h-32" : "aspect-square object-cover h-32"
                }
                if (mediaCount === 4) {
                  return "aspect-square object-cover h-32"
                }
                return "aspect-square object-cover h-24"
              }

              return (
                <div className={`grid ${getGridClass()}`}>
                  {imagePreviews.map((preview: string, index: number) => (
                    <div key={`new-${index}`} className="relative group">
                      <Image
                        src={preview || "/placeholder.svg"}
                        alt="New image"
                        className={`w-full ${getMediaClass(index)} rounded-xl transition-transform duration-200 group-hover:scale-[1.02]`}
                        width={300}
                        height={300}
                        style={{ width: '100%', height: 'auto' }}
                      />
                      <button
                        onClick={() => removeNewImage(index)}
                        className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full top-2 right-2 bg-black/60 hover:bg-black/80 hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        {/* New Videos */}
        {videoPreviews.length > 0 && (
          <div className="space-y-2">
            {(() => {
              const mediaCount = videoPreviews.length
              
              // Single video - preserve aspect ratio
              if (mediaCount === 1) {
                return (
                  <div className="relative group">
                    <div className="relative w-full overflow-hidden bg-black rounded-xl">
                      <video
                        src={videoPreviews[0] || "/placeholder.svg"}
                        controls
                        muted
                        className="w-full h-auto max-h-[300px] object-contain rounded-xl"
                        playsInline
                      />
                    </div>
                    <button
                      onClick={() => removeNewVideo(0)}
                      className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full top-2 right-2 bg-black/60 hover:bg-black/80 hover:scale-110"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              }

              // Multiple videos - grid layout
              const getGridClass = () => {
                switch (mediaCount) {
                  case 2:
                    return "grid-cols-2 gap-2"
                  case 3:
                    return "grid-cols-2 gap-2"
                  case 4:
                    return "grid-cols-2 gap-2"
                  default:
                    return "grid-cols-3 gap-2"
                }
              }

              const getMediaClass = (index: number) => {
                if (mediaCount === 2) {
                  return "aspect-square object-cover h-32"
                }
                if (mediaCount === 3) {
                  return index === 2 ? "col-span-2 aspect-[2/1] object-cover h-32" : "aspect-square object-cover h-32"
                }
                if (mediaCount === 4) {
                  return "aspect-square object-cover h-32"
                }
                return "aspect-square object-cover h-24"
              }

              return (
                <div className={`grid ${getGridClass()}`}>
                  {videoPreviews.map((preview: string, index: number) => (
                    <div key={`new-video-${index}`} className="relative group">
                      <div className="relative w-full overflow-hidden bg-black rounded-xl">
                        <video
                          src={preview || "/placeholder.svg"}
                          controls
                          muted
                          className={`w-full h-auto ${getMediaClass(index)} rounded-xl transition-transform duration-200 group-hover:scale-[1.02]`}
                          playsInline
                        />
                      </div>
                      <button
                        onClick={() => removeNewVideo(index)}
                        className="absolute flex items-center justify-center w-6 h-6 text-white transition-all duration-200 rounded-full top-2 right-2 bg-black/60 hover:bg-black/80 hover:scale-110"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-blue-500">
            <label className="flex items-center justify-center transition-colors duration-200 rounded-full cursor-pointer w-7 h-7 xs:w-8 xs:h-8 hover:bg-blue-50 dark:hover:bg-blue-900/20">
              <ImageIcon className="w-4 h-4 xs:w-5 xs:h-5" />
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
            </label>
            <label className="flex items-center justify-center transition-colors duration-200 rounded-full cursor-pointer w-7 h-7 xs:w-8 xs:h-8 hover:bg-green-50 dark:hover:bg-green-900/20">
              <Video className="w-4 h-4 xs:w-5 xs:h-5" />
              <input type="file" accept="video/*" multiple onChange={handleVideoUpload} className="hidden" />
            </label>
          </div>

          <div className="flex items-center space-x-2 xs:space-x-3">
            <div className="flex items-center space-x-2">
              <div
                className={`text-xs xs:text-sm font-medium ${isOverLimit ? "text-red-500" : remainingChars <= 20 ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"}`}
              >
                {remainingChars}
              </div>
            </div>

            <div className="flex space-x-1.5 xs:space-x-2">
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                size="sm"
                disabled={isUpdating}
                className="text-xs xs:text-sm px-3 xs:px-4 py-1.5 xs:py-2 rounded-full border-gray-300 hover:bg-gray-50 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editContent.trim() || isOverLimit || isUpdating}
                size="sm"
                className="bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 text-xs xs:text-sm px-3 xs:px-4 py-1.5 xs:py-2 rounded-full"
              >
                {isUpdating ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleDotClick = (index: number) => {
    if (carouselApi) {
      carouselApi.scrollTo(index)
    }
  }

  // Define original post for reposts (needed outside the if block)
  const original = isRepost ? (post as any).originalPost : null

  if (isRepost) {
    // Repost rendering
    const repost = post as any
    const repostUser = repost.repostUser
    const repostCreatedAt = repost.repostCreatedAt

    // Add null checks for repost user
    const repostUserName =
      repostUser?.firstName && repostUser?.lastName
        ? `${repostUser.firstName} ${repostUser.lastName}`
        : repostUser?.username || "Unknown User"

    // Add null checks for original post author
    const originalAuthor = original?.author
    const originalAuthorName =
      originalAuthor?.firstName && originalAuthor?.lastName
        ? `${originalAuthor.firstName} ${originalAuthor.lastName}`
        : originalAuthor?.username || "Unknown User"

    const isOwnRepost = userId === repostUser?._id

    return (
      <div ref={postRef} className="p-3 transition-all duration-200 border-b border-gray-200 xs:p-4 sm:p-6 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
        {/* Twitter-style repost header */}
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Repeat2 className="w-3 h-3 text-gray-400" />
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {actualAuthor?.firstName} {actualAuthor?.lastName} reposted
            </span>
          </div>
          <span className="text-gray-400">·</span>
          <span className="text-gray-400">Reposted {formatTimestamp(repostCreatedAt)}</span>
          {isOriginalAuthorBlocked && (
            <>
              <span className="text-gray-400">·</span>
              <span className="font-medium text-red-500">Blocked</span>
            </>
          )}
          {isOriginalAuthorBlocking && (
            <>
              <span className="text-gray-400">·</span>
              <span className="font-medium text-orange-500">Blocked you</span>
            </>
          )}
        </div>

        <div className="flex gap-3 xs:gap-4">
          {/* Reposter's profile image */}
          <Link href={`/profile/${repostUser?._id}`}>
            <Image
              src={repostUser?.profileImageUrl || "/placeholder-user.jpg"}
              alt="Profile"
              className="object-cover w-8 h-8 transition-all duration-200 rounded-full xs:w-10 xs:h-10 ring-2 ring-transparent hover:ring-blue-500/20"
              width={40}
              height={40}
            />
          </Link>
          
          <div className="flex-1 min-w-0">
            {/* Reposter's header */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center min-w-0">
                  <Link href={`/profile/${actualAuthor._id}`} className="min-w-0 hover:underline">
                    <span className="text-sm font-bold text-gray-900 break-all truncate dark:text-white xs:text-base">
                      {authorName}
                    </span>
                  </Link>
                  <span className="flex-shrink-0 ml-2 text-xs text-gray-500 xs:text-sm dark:text-gray-400 xs:ml-3">
                    {/* <span className="font-normal text-gray-400">Original:</span> {formatTimestamp(actualPost.createdAt)} */}
                  </span>
                </div>
                <span className="text-xs text-gray-500 break-all truncate xs:text-sm dark:text-gray-400">
                  @{actualPost.author.username}
                </span>
              </div>
              
              {/* Repost dropdown menu */}
              {isOwnRepost && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 transition-all duration-200 rounded-full w-7 h-7 xs:w-8 xs:h-8 hover:bg-gray-100 dark:hover:bg-gray-800 hover:scale-105 active:scale-95 focus:bg-gray-100 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20"
                    >
                      <MoreHorizontal className="w-3 h-3 xs:w-4 xs:h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-60 rounded-[22px] border border-gray-100/80 bg-white/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-900/90"
                  >
                    <div className="px-2 pt-1 pb-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                        Manage Repost
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <DropdownMenuItem
                        onClick={handleEdit}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="flex items-center justify-center w-10 h-10 text-gray-700 transition bg-gray-100 rounded-2xl group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                          <Edit className="w-4 h-4" />
                        </span>
                        <div>
                          <p>Edit Repost</p>
                          <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            Update your commentary anytime.
                          </p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDeleteRepost}
                        disabled={isDeleting}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <span className="flex items-center justify-center w-10 h-10 text-red-600 transition rounded-2xl bg-red-50 group-hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </span>
                        <div>
                          <p>{isDeleting ? "Deleting..." : "Delete Repost"}</p>
                          <p className="text-xs font-normal text-red-400 dark:text-red-300">
                            This action can’t be undone.
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Repost content */}
            {isEditing ? (
              <div className="space-y-3 xs:space-y-4">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Add a comment to your repost..."
                  className="min-h-[80px] xs:min-h-[100px] resize-none text-sm xs:text-base border-gray-200 dark:border-gray-700 focus:ring-blue-500 rounded-2xl"
                  maxLength={1500}
                />
                <div className="flex items-center justify-between">
                  <div
                    className={`text-xs xs:text-sm font-medium ${editContent.length > 1500 ? "text-red-500" : editContent.length > 1480 ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"}`}
                  >
                    {1500 - editContent.length}
                  </div>
                  <div className="flex space-x-1.5 xs:space-x-2">
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                      className="text-xs xs:text-sm px-3 xs:px-4 py-1.5 xs:py-2 rounded-full bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim() || editContent.length > 1500 || isUpdating}
                      size="sm"
                      className="bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 text-xs xs:text-sm px-3 xs:px-4 py-1.5 xs:py-2 rounded-full"
                    >
                      {isUpdating ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                {/* Repost comment */}
                {(repost as any).repostComment && (
                  <p
                    className="mb-3 text-sm leading-relaxed text-gray-900 break-words xs:text-base dark:text-white"
                    style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                  >
                    {(repost as any).repostComment}
                  </p>
                )}

                {/* Twitter-style original post card */}
                <div className="overflow-hidden transition-colors duration-200 bg-white border border-gray-200 dark:border-gray-700 rounded-2xl dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  {/* Original post header */}
                  <div className="flex items-center gap-2 p-3 border-b border-gray-100 xs:p-4 dark:border-gray-800">
                    <Link href={`/profile/${originalAuthor?._id}`}>
                      <Image
                        src={originalAuthor?.profileImageUrl || "/placeholder-user.jpg"}
                        alt="Original author"
                        className="w-6 h-6 rounded-full xs:w-8 xs:h-8"
                        width={32}
                        height={32}
                      />
                    </Link>
                    <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 flex-1">
                      <span className="text-sm font-bold text-gray-900 truncate dark:text-white xs:text-base">
                        {originalAuthorName}
                      </span>
                      <span className="text-xs text-gray-500 truncate xs:text-sm dark:text-gray-400">
                        @{originalAuthor?.username || "unknown"}
                      </span>
                      {original?.createdAt && (
                        <>
                          <span className="text-xs text-gray-400 xs:text-sm">·</span>
                          <span className="text-xs text-gray-400 xs:text-sm">{formatTimestamp(original.createdAt)}</span>
                        </>
                      )}
                    </div>
                    {(isOriginalAuthorBlocked || isOriginalAuthorBlocking) && !isOriginalPostDeleted && (
                      <span className="px-1.5 xs:px-2 py-0.5 xs:py-1 text-xs text-red-500 bg-red-100 rounded-full dark:bg-red-900/20">
                        {isOriginalAuthorBlocked ? "You blocked" : "Blocked you"}
                      </span>
                    )}
                  </div>
                  
                  {/* Original post content */}
                  <div className="p-3 xs:p-4">
                    {isOriginalPostDeleted ? (
                      <div className="text-sm italic text-gray-500 xs:text-base">This post has been deleted</div>
                    ) : (
                      renderPostContent(original)
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-between max-w-full mt-3 overflow-x-auto text-gray-500 xs:mt-4 dark:text-gray-400">
              <div
                className={`flex items-center space-x-1.5 xs:space-x-2 ${isOriginalPostDeleted ? "opacity-50 cursor-not-allowed" : "hover:text-blue-500 cursor-pointer group"}`}
                onClick={() => !isOriginalPostDeleted && setIsCommentModalOpen(!isCommentModalOpen)}
              >
                <div
                  className={`w-7 h-7 xs:w-8 xs:h-8 flex items-center justify-center rounded-full transition-all duration-200 ${!isOriginalPostDeleted ? "group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20" : ""}`}
                >
                  <MessageCircle className="w-4 h-4 transition-transform duration-200 xs:w-5 xs:h-5 group-hover:scale-110" />
                </div>
                <span className="text-xs font-medium xs:text-sm">{original?.commentCount || 0}</span>
              </div>

              <div
                className={`flex items-center space-x-1.5 xs:space-x-2 ${isOriginalPostDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer group"} ${isReposted ? "text-green-500" : "hover:text-green-500"}`}
              >
                <Popover open={showRepostPopover} onOpenChange={setShowRepostPopover}>
                  <PopoverTrigger asChild>
                    <div
                      ref={repostPopoverRef}
                      onClick={() => !isOriginalPostDeleted && setShowRepostPopover(true)}
                      className={`w-7 h-7 xs:w-8 xs:h-8 flex items-center justify-center rounded-full transition-all duration-200 ${!isOriginalPostDeleted ? "group-hover:bg-green-50 dark:group-hover:bg-green-900/20" : ""}`}
                    >
                      <Repeat2 className="w-4 h-4 transition-transform duration-200 xs:w-5 xs:h-5 group-hover:scale-110" />
                    </div>
                  </PopoverTrigger>
                  <PopoverContent
                    align="center"
                    sideOffset={8}
                    className="w-48 p-0 z-[9999]"
                    onOpenAutoFocus={e => e.preventDefault()}
                    onPointerDownOutside={() => setShowRepostPopover(false)}
                    onEscapeKeyDown={() => setShowRepostPopover(false)}
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
                  >
                    <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                      <button
                        className="w-full px-4 py-3 text-base font-medium text-left transition-colors hover:bg-green-50 dark:hover:bg-green-900/30"
                        disabled={isReposting}
                        onClick={async () => {
                          console.log('Repost button clicked')
                          console.log('repost function available:', typeof repostApi)
                          console.log('actualPost._id:', actualPost._id)
                          console.log('isReposting:', isReposting)
                          
                          setShowRepostPopover(false)
                          setIsReposting(true)
                          try {
                            console.log('Calling repost API...')
                            await repostApi(actualPost._id, undefined)
                            console.log('Repost API call successful')
                            toast({
                              title: "Success",
                              description: "Post reposted successfully!"
                            })
                            setIsReposted(true)
                          } catch (error: any) {
                            console.error('Repost API call failed:', error)
                            toast({
                              title: "Error",
                              description: error?.message || "Failed to repost",
                              variant: "destructive"
                            })
                          } finally {
                            setIsReposting(false)
                          }
                        }}
                      >
                        Repost
                      </button>
                      <button
                        className="w-full px-4 py-3 text-base font-medium text-left transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        onClick={() => {
                          console.log('Quote button clicked')
                          console.log('isRepostModalOpen before:', isRepostModalOpen)
                          console.log('postRef.current:', postRef.current)
                          
                          setShowRepostPopover(false)
                          // Reset modal state first to ensure clean state
                          setIsRepostModalOpen(false)
                          
                          if (postRef.current) {
                            postRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
                          }
                          setTimeout(() => {
                            console.log('Setting isRepostModalOpen to true')
                            setIsRepostModalOpen(true)
                          }, 300)
                        }}
                      >
                        Quote
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
                <span className="text-xs font-medium xs:text-sm">{getSafeRepostCount(repostCount)}</span>
              </div>

              <div
                className={`flex items-center space-x-1.5 xs:space-x-2 ${isOriginalPostDeleted ? "opacity-50 cursor-not-allowed" : "cursor-pointer group"} ${
                  repostLikeState.isLiked ? "text-red-500" : "hover:text-red-500"
                }`}
                onClick={() => !isOriginalPostDeleted && handleLike()}
                style={isLiking || isOriginalPostDeleted ? { pointerEvents: "none", opacity: 0.6 } : {}}
                aria-disabled={isLiking || isOriginalPostDeleted}
              >
                <div
                  className={`w-7 h-7 xs:w-8 xs:h-8 flex items-center justify-center rounded-full transition-all duration-200 ${!isOriginalPostDeleted ? "group-hover:bg-red-50 dark:group-hover:bg-red-900/20" : ""}`}
                >
                  <Heart
                    className={`w-4 h-4 xs:w-5 xs:h-5 transition-transform duration-200 ${repostLikeState.isLiked ? "fill-current scale-110" : "group-hover:scale-110"}`}
                  />
                </div>
                <span className="text-xs font-medium xs:text-sm">{repostLikeState.likeCount}</span>
              </div>

              <div
                className={`flex items-center space-x-1.5 xs:space-x-2 ${isOriginalPostDeleted ? "opacity-50 cursor-not-allowed" : "hover:text-blue-500 cursor-pointer group"}`}
                onClick={() => !isOriginalPostDeleted && handleShare()}
              >
                <div
                  className={`w-7 h-7 xs:w-8 xs:h-8 flex items-center justify-center rounded-full transition-all duration-200 ${!isOriginalPostDeleted ? "group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20" : ""}`}
                >
                  <Share className="w-4 h-4 transition-transform duration-200 xs:w-5 xs:h-5 group-hover:scale-110" />
                </div>
              </div>

              {/* Report Button for Reposts - Only show if not own post */}
              {original?.author?._id !== userId && !isOriginalPostDeleted && (
                <div
                  className="flex items-center space-x-1.5 xs:space-x-2 hover:text-red-500 cursor-pointer group"
                  onClick={() => setIsReportModalOpen(true)}
                >
                  <div className="flex items-center justify-center transition-all duration-200 rounded-full w-7 h-7 xs:w-8 xs:h-8 group-hover:bg-red-50 dark:group-hover:bg-red-900/20">
                    <Flag className="w-4 h-4 transition-transform duration-200 xs:w-5 xs:h-5 group-hover:scale-110" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <InlineCommentSection
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          postId={original?._id || ""}
          onCommentSuccess={handleCommentSuccess}
          onCommentDeleted={handleCommentDeleted}
          onReplyCreated={handleReplyCreated}
          commentCount={original?.commentCount || 0}
        />

        <RepostModal
          isOpen={isRepostModalOpen}
          onClose={() => setIsRepostModalOpen(false)}
          post={{
            _id: original?._id || "",
            author: original?.author || { username: "Unknown" },
            content: original?.content || "",
            media: original?.media || [],
          }}
          onRepostSuccess={() => {
            setIsRepostModalOpen(false)
            if (typeof handleRepostSuccess === 'function') handleRepostSuccess()
          }}
        />
      </div>
    )
  }

  const postMediaContent = !isEditing ? renderPostContent(actualPost, { showCaption: false }) : null
  const likeLabel = likeCount === 1 ? "1 like" : `${likeCount} likes`
  const commentCtaLabel =
    commentCount === 0 ? "Add a comment" : commentCount === 1 ? "View 1 comment" : `View all ${commentCount} comments`
  const detailedTimestamp = formatTimestampDetailed(actualPost.createdAt)
  const hasMedia = Array.isArray(actualPost.media) && actualPost.media.length > 0
  const postCaption = actualPost.content?.trim()

  return (
    <>
      <article
        ref={postRef}
        className="mb-8 overflow-hidden transition-colors bg-white/95 border border-gray-200 shadow-sm rounded-2xl dark:border-gray-700 dark:bg-slate-900/70"
      >
        <header className="flex items-center px-4 py-3">
          <Link href={`/profile/${actualAuthor._id}`} className="flex-shrink-0">
            <Image
              src={actualPost.author.profileImageUrl || "/placeholder-user.jpg"}
              alt={`${authorName}'s profile picture`}
              className="object-cover w-10 h-10 rounded-full"
              width={40}
              height={40}
            />
          </Link>
          <div className="flex items-center justify-between flex-1 min-w-0 ml-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${actualAuthor._id}`} className="min-w-0">
                  <span className="text-sm font-semibold text-gray-900 truncate hover:underline dark:text-gray-100">
                    {actualAuthor.username || authorName}
                  </span>
                </Link>
                <span className="text-[11px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  {formatTimestamp(actualPost.createdAt)}
                </span>
              </div>
              {authorName !== actualAuthor.username && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{authorName}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!isOwnPost && (
                <FollowButton
                  userId={actualPost.author._id}
                  size="sm"
                  variant="outline"
                  className="px-4 text-xs font-semibold tracking-wide border border-gray-200 rounded-full hover:border-gray-300 dark:border-gray-700"
                  renderLabel={(isFollowing, isLoading, isFollowBack) =>
                    isLoading ? (
                      <span>Loading...</span>
                    ) : isFollowing ? (
                      <span>Following</span>
                    ) : isFollowBack ? (
                      <span>Follow Back</span>
                    ) : (
                      <span>Follow</span>
                    )
                  }
                />
              )}

              {isOwnPost && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 text-gray-500 rounded-full hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-60 rounded-[22px] border border-gray-100/80 bg-white/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-md dark:border-gray-800/80 dark:bg-gray-900/90"
                  >
                    <div className="px-2 pt-1 pb-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
                        Post Options
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <DropdownMenuItem
                        onClick={handleEdit}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 focus:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                      >
                        <span className="flex items-center justify-center w-10 h-10 text-gray-700 transition bg-gray-100 rounded-2xl group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300">
                          <Edit className="w-4 h-4" />
                        </span>
                        <div>
                          <p>Edit Post</p>
                          <p className="text-xs font-normal text-gray-500 dark:text-gray-400">
                            Fix typos or refresh your caption.
                          </p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      >
                        <span className="flex items-center justify-center w-10 h-10 text-red-600 transition rounded-2xl bg-red-50 group-hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </span>
                        <div>
                          <p>{isDeleting ? "Deleting..." : "Delete Post"}</p>
                          <p className="text-xs font-normal text-red-400 dark:text-red-300">
                            Permanently remove this post.
                          </p>
                        </div>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {isEditing ? (
          <div className="px-4 pb-4">{renderEditForm()}</div>
        ) : (
          <>
            {hasMedia && (
              <div className="relative w-full bg-black/5 dark:bg-black">{postMediaContent}</div>
            )}
            {!hasMedia && postCaption && (
              <div className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-gray-900 dark:text-gray-100">{postCaption}</p>
              </div>
            )}
          </>
        )}

        {!isEditing && (
          <>
            <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => !isOriginalPostDeleted && setIsCommentModalOpen(true)}
                    disabled={isOriginalPostDeleted}
                    className={`group flex items-center gap-2 text-gray-500 transition-colors ${
                      isOriginalPostDeleted ? "cursor-not-allowed opacity-40" : "hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    <MessageCircle className="w-6 h-6 transition-transform group-hover:scale-110" />
                    <span className="text-sm font-medium">{commentCount}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Popover open={showRepostPopover} onOpenChange={setShowRepostPopover}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={() => !isOriginalPostDeleted && setShowRepostPopover(true)}
                          disabled={isOriginalPostDeleted}
                          className={`flex items-center transition-transform ${
                            isOriginalPostDeleted
                              ? "cursor-not-allowed opacity-40"
                              : isReposted
                                ? "text-green-500"
                                : "text-gray-500 hover:text-green-500"
                          }`}
                        >
                          <Repeat2 className="w-6 h-6" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        sideOffset={12}
                        className="w-48 p-0"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onPointerDownOutside={() => setShowRepostPopover(false)}
                        onEscapeKeyDown={() => setShowRepostPopover(false)}
                        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}
                      >
                        <div className="flex flex-col divide-y divide-gray-200 dark:divide-gray-800">
                          <button
                            className="w-full px-4 py-3 text-sm font-medium text-left hover:bg-green-50 dark:hover:bg-green-900/30"
                            disabled={isReposting}
                            onClick={async () => {
                              setShowRepostPopover(false)
                              setIsReposting(true)
                              try {
                                await repostApi(actualPost._id, undefined)
                                toast({
                                  title: "Success",
                                  description: "Post reposted successfully!",
                                })
                                setIsReposted(true)
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error?.message || "Failed to repost",
                                  variant: "destructive",
                                })
                              } finally {
                                setIsReposting(false)
                              }
                            }}
                          >
                            Share to followers
                          </button>
                          <button
                            className="w-full px-4 py-3 text-sm font-medium text-left hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            onClick={() => {
                              setShowRepostPopover(false)
                              setIsRepostModalOpen(false)
                              if (postRef.current) {
                                postRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
                              }
                              setTimeout(() => {
                                setIsRepostModalOpen(true)
                              }, 200)
                            }}
                          >
                            Quote post
                          </button>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {getSafeRepostCount(repostCount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => !isOriginalPostDeleted && handleLike()}
                    disabled={isLiking || isOriginalPostDeleted}
                    className={`group flex items-center gap-2 transition-colors ${
                      isOriginalPostDeleted
                        ? "cursor-not-allowed opacity-40"
                        : isLiked
                          ? "text-red-500"
                          : "text-gray-500 hover:text-red-500"
                    }`}
                  >
                    <Heart
                      className={`h-6 w-6 transition-transform ${
                        isLiked ? "scale-110 fill-current" : "group-hover:scale-110"
                      }`}
                    />
                    <span className="text-sm font-medium">{likeCount}</span>
                  </button>
                </div>

                <div className="flex items-center gap-5">
                  <button
                    type="button"
                    onClick={() => !isOriginalPostDeleted && handleShare()}
                    disabled={isOriginalPostDeleted}
                    className={`text-gray-500 transition-colors ${
                      isOriginalPostDeleted ? "cursor-not-allowed opacity-40" : "hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    <Share className="w-6 h-6" />
                  </button>

                  {actualPost.author._id !== userId && (
                    <button
                      type="button"
                      onClick={() => setIsReportModalOpen(true)}
                      className="text-gray-500 transition-colors hover:text-red-500"
                    >
                      <Flag className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 space-y-2 text-sm">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{likeLabel}</div>
              {postCaption && (
                <div className="leading-relaxed text-gray-900 dark:text-gray-100">
                  <Link href={`/profile/${actualAuthor._id}`} className="mr-2 font-semibold hover:underline">
                    {actualAuthor.username || authorName}
                  </Link>
                  <span className="text-gray-700 dark:text-gray-300">{postCaption}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsCommentModalOpen(true)}
                className="text-sm font-medium text-left text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {commentCtaLabel}
              </button>
              <time className="block text-xs uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                {detailedTimestamp}
              </time>
            </div>
          </>
        )}
      </article>

      <InlineCommentSection
        postId={actualPost._id}
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        commentCount={commentCount}
        onCommentSuccess={handleCommentSuccess}
        onCommentDeleted={handleCommentDeleted}
        onReplyCreated={handleReplyCreated}
      />

      <RepostModal
        isOpen={isRepostModalOpen}
        onClose={() => setIsRepostModalOpen(false)}
        post={{
          _id: actualPost._id,
          author: actualPost.author,
          content: actualPost.content,
          media: actualPost.media,
        }}
        onRepostSuccess={() => {
          setIsRepostModalOpen(false)
          if (typeof handleRepostSuccess === "function") handleRepostSuccess()
        }}
      />

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        reportedPostId={isRepost ? original?._id : actualPost._id}
        reporterUsername={isRepost ? original?.author?.username : actualPost.author.username}
        reportedContent={isRepost ? original?.content : actualPost.content}
      />
    </>
  )
})
