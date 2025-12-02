"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { usePostApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"
import { useVideoManager } from "@/components/video-manager"

interface EditRepostModalProps {
  repost: {
    _id: string
    repostComment?: string
    comment?: string
    originalPost: {
      _id: string
      content: string
      author: {
        username: string
        firstName?: string
        lastName?: string
        profileImageUrl?: string
      }
      media?: Array<{
        type: 'image' | 'video'
        url: string
        thumbnailUrl?: string
      }>
    }
  }
  isOpen: boolean
  onClose: () => void
  onRepostUpdated: () => void
}

export function EditRepostModal({ repost, isOpen, onClose, onRepostUpdated }: EditRepostModalProps) {
  const initialComment = repost.repostComment || repost.comment || ""
  const [comment, setComment] = useState(initialComment)
  const [isUpdating, setIsUpdating] = useState(false)
  const { updateRepost } = usePostApi()
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

  useEffect(() => {
    if (isOpen) {
      const currentComment = repost.repostComment || repost.comment || ""
      console.log('EditRepostModal: Modal opened with repost data:', repost)
      console.log('EditRepostModal: Current comment:', currentComment)
      setComment(currentComment)
    }
  }, [isOpen, repost.repostComment, repost.comment])

  const handleUpdate = async () => {
    if (comment.length > 1500) {
      toast({
        title: "Error",
        description: "Repost comment cannot exceed 1500 characters",
        variant: "destructive"
      })
      return
    }

    console.log('EditRepostModal: Starting update for repost:', repost._id)
    console.log('EditRepostModal: Comment to update:', comment)

    setIsUpdating(true)
    try {
      const result = await updateRepost(repost._id, comment.trim() || undefined)
      console.log('EditRepostModal: Update successful:', result)

      toast({
        title: "Success",
        description: "Repost updated successfully!"
      })

      onRepostUpdated()
      onClose()
    } catch (error: any) {
      console.error('EditRepostModal: Update failed:', error)
      const errorMessage = error?.message || "Failed to update repost"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const characterLimit = 1500
  const remainingChars = characterLimit - comment.length
  const isOverLimit = remainingChars < 0

  if (!isOpen) return null

  const originalAuthorName = repost.originalPost.author.firstName && repost.originalPost.author.lastName 
    ? `${repost.originalPost.author.firstName} ${repost.originalPost.author.lastName}`
    : repost.originalPost.author.username

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg mx-4 mb-20 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Repost</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <div className="space-y-3">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add your thoughts..."
              className="min-h-[80px] resize-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 rounded-lg"
              maxLength={1500}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {comment.length}/1500
              </span>
            </div>
          </div>
        </div>

        {/* Original post preview */}
        <div className="px-6 py-4">
          <div className="flex gap-4">
            <img
              src={repost.originalPost.author.profileImageUrl || "/placeholder-user.jpg"}
              alt="Original author"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {originalAuthorName}
                </span>
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  @{repost.originalPost.author.username}
                </span>
              </div>
              <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                {repost.originalPost.content}
              </p>
              {repost.originalPost.media && repost.originalPost.media.length > 0 && (
                <div className="mt-3 rounded-lg overflow-hidden">
                  {repost.originalPost.media[0].type === 'video' ? (
                    <div className="relative w-full bg-black rounded-lg overflow-hidden">
                      <video
                        ref={videoRef}
                        src={repost.originalPost.media[0].url}
                        controls
                        preload="metadata"
                        className="w-full h-auto object-contain rounded-lg"
                        playsInline
                      />
                    </div>
                  ) : (
                    <Image
                      src={repost.originalPost.media[0].url}
                      alt="Post media"
                      className="w-full h-auto object-cover rounded-lg"
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

        {/* Action buttons */}
        <div className="px-6 py-4 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 rounded-full"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={isOverLimit || isUpdating}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors"
          >
            {isUpdating ? "Updating..." : "Update"}
          </Button>
        </div>
      </div>
    </div>
  )
} 