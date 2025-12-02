"use client"

import { useState } from "react"
import { X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { usePostApi } from "@/lib/api"

interface EditCommentModalProps {
  comment: {
    _id: string
    content: string
    author: {
      _id: string
      username: string
      firstName?: string
      lastName?: string
      profileImageUrl?: string
    }
  }
  isOpen: boolean
  onClose: () => void
  onCommentUpdated: (updatedComment: any) => void
}

export function EditCommentModal({ comment, isOpen, onClose, onCommentUpdated }: EditCommentModalProps) {
  const [commentText, setCommentText] = useState(comment.content)
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const { updateComment } = usePostApi()

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!commentText.trim() || commentText.trim() === comment.content) {
      onClose()
      return
    }

    setSubmitting(true)
    try {
      const response = await updateComment(comment._id, commentText.trim())
      toast({
        title: "Success",
        description: "Comment updated successfully!"
      })
      onCommentUpdated(response.comment)
      onClose()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || "Failed to update comment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    setCommentText(comment.content)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg mx-4 mb-20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Edit Comment
          </h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <div className="px-6 py-4">
          <div className="flex gap-4">
            <img
              src={user?.imageUrl || "/placeholder-user.jpg"}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 space-y-3">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                maxLength={280}
                className="w-full p-3 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="Edit your comment..."
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {commentText.length}/280
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                    className="px-4 py-2 rounded-full transition-colors"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!commentText.trim() || commentText.trim() === comment.content || submitting}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {submitting ? "Updating..." : "Update"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 