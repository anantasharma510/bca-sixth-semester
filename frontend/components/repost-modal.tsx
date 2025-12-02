"use client"

import { useState, useEffect, useRef } from "react"
import { X, Repeat2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { usePostApi } from "@/lib/api"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import ReactDOM from "react-dom"
import Image from "next/image"
import { useVideoManager } from "@/components/video-manager"

interface RepostModalProps {
  post: {
    _id: string
    author: {
      username: string
      firstName?: string
      lastName?: string
      profileImageUrl?: string
    }
    content: string
    media?: Array<{
      type: 'image' | 'video'
      url: string
      thumbnailUrl?: string
    }>
  }
  isOpen: boolean
  onClose: () => void
  onRepostSuccess?: () => void
}

export function RepostModal({ post, isOpen, onClose, onRepostSuccess }: RepostModalProps) {
  console.log('RepostModal rendered with props:', { isOpen, post: post?._id, postAuthor: post?.author?.username })
  
  const [comment, setComment] = useState("")
  const [isReposting, setIsReposting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { user } = useAuth()
  const { repost: repostApi } = usePostApi()
  const { guardInteraction } = useInteractionGuard()
  const { registerVideo, unregisterVideo } = useVideoManager()
  const videoRef = useRef<HTMLVideoElement>(null)

  // Register video with manager (no auto-play for modals)
  useEffect(() => {
    const video = videoRef.current
    if (video) {
      registerVideo(video, false) // No auto-play for modal videos
      return () => {
        unregisterVideo(video)
      }
    }
  }, [registerVideo, unregisterVideo])

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Scroll lock: disable background scroll when modal is open
  useEffect(() => {
    console.log('RepostModal useEffect - isOpen changed to:', isOpen)
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    }
  }, [isOpen]);

  // Reset comment when modal is opened
  useEffect(() => {
    if (isOpen) setComment("");
  }, [isOpen]);

  const handleRepost = async () => {
    // Guard the repost interaction for non-authenticated users
    const canProceed = guardInteraction("repost this content", () => {})
    if (!canProceed) return

    setIsReposting(true)
    try {
      await repostApi(post._id, comment.trim() || undefined)
      
      toast({
        title: "Success",
        description: "Post reposted successfully!"
      })
      
      onRepostSuccess?.()
      onClose()
    } catch (error: any) {
      // Extract error message from the API error structure
      const errorMessage = error?.message || "Failed to repost"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsReposting(false)
    }
  }

  const characterLimit = 1500
  const remainingChars = characterLimit - comment.length
  const isOverLimit = remainingChars < 0

  // Don't render anything if not mounted or not open
  if (!isMounted || !isOpen) return null

  console.log('RepostModal: Modal should be visible, isOpen:', isOpen)

  const originalAuthorName = post.author.firstName && post.author.lastName 
    ? `${post.author.firstName} ${post.author.lastName}`
    : post.author.username

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Twitter-style header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Repost</h2>
          </div>
        </div>

        {/* Repost comment section */}
        <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-3">
            <img
              src={user?.imageUrl || "/placeholder-user.jpg"}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 space-y-3">
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add your thoughts..."
                className="min-h-[80px] resize-none border-0 bg-transparent text-lg text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                maxLength={1500}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      <circle
                        cx="16"
                        cy="16"
                        r="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeDasharray={`${2 * Math.PI * 14}`}
                        strokeDashoffset={`${2 * Math.PI * 14 * (1 - Math.min(comment.length / characterLimit, 1))}`}
                        className={
                          isOverLimit ? "text-red-500" : remainingChars <= 20 ? "text-yellow-500" : "text-blue-500"
                        }
                      />
                    </svg>
                  </div>
                  <span className={`text-sm ${isOverLimit ? "text-red-500" : remainingChars <= 20 ? "text-yellow-500" : "text-gray-500 dark:text-gray-400"}`}>
                    {remainingChars}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Twitter-style original post preview */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
            {/* Original post header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-800">
              <img
                src={post.author.profileImageUrl || "/placeholder-user.jpg"}
                alt="Original author"
                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-bold text-gray-900 dark:text-white text-base">
                  {originalAuthorName}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm truncate">
                  @{post.author.username}
                </span>
              </div>
            </div>
            
            {/* Original post content */}
            <div className="p-4">
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-base leading-relaxed">
                {post.content}
              </p>
              {post.media && post.media.length > 0 && (
                <div className="mt-3 rounded-2xl overflow-hidden">
                  {post.media[0].type === 'video' ? (
                    <div className="relative w-full bg-black rounded-2xl overflow-hidden">
                      <video
                        ref={videoRef}
                        src={post.media[0].url}
                        controls
                        preload="metadata"
                        className="w-full h-auto object-contain rounded-2xl"
                        playsInline
                      />
                    </div>
                  ) : (
                    <Image
                      src={post.media[0].url}
                      alt="Post media"
                      className="w-full h-auto object-cover rounded-2xl"
                      width={400}
                      height={300}
                      style={{ width: '100%', height: 'auto' }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Twitter-style action buttons */}
        <div className="px-4 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isReposting}
            className="px-6 py-2 rounded-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRepost}
            disabled={isOverLimit || isReposting}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Repeat2 className="w-4 h-4 mr-2" />
            {isReposting ? "Reposting..." : "Repost"}
          </Button>
        </div>
      </div>
    </div>
  )

  console.log('RepostModal: Creating portal with modal content')
  
  // Only create portal if we're on the client side and document.body exists
  if (typeof window !== 'undefined' && document.body) {
    return ReactDOM.createPortal(modalContent, document.body)
  }
  
  // Fallback for SSR - render inline (though this shouldn't happen due to isMounted check)
  return null
} 