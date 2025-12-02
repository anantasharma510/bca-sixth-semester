"use client"

import { useState, useEffect } from "react"
import { Heart, MoreHorizontal, Edit, Trash2, MessageCircle, Reply, Send, X, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { usePostApi } from "@/lib/api"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"

interface CommentProps {
  comment: {
    _id: string
    author: {
      _id: string
      username: string
      firstName?: string
      lastName?: string
      profileImageUrl?: string
    }
    content: string
    likeCount: number
    createdAt: string
    isLiked?: boolean
    parentComment?: string
    replies?: string[]
    replyCount: number
  }
  onCommentUpdate?: (updatedComment: any) => void
  onCommentDelete?: () => void
  onCommentLikeUpdate?: () => void
  onReplyCreated?: (reply: any) => void
}

export function Comment({ comment, onCommentUpdate, onCommentDelete, onCommentLikeUpdate, onReplyCreated }: CommentProps) {
  const [isLiked, setIsLiked] = useState(comment.isLiked || false)
  const [likeCount, setLikeCount] = useState(comment.likeCount)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [optimisticLikeCount, setOptimisticLikeCount] = useState(comment.likeCount)
  const [optimisticIsLiked, setOptimisticIsLiked] = useState(comment.isLiked || false)
  const [isEditing, setIsEditing] = useState(false)
  const [isReplying, setIsReplying] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [replyText, setReplyText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentContent, setCurrentContent] = useState(comment.content)
  const { user } = useAuth()
  const userId = user?.id
  const { likeComment, deleteComment, updateComment, createReply } = usePostApi()
  const { guardInteraction } = useInteractionGuard()

  const isOwnComment = userId === comment.author._id
  const authorName = comment.author.firstName && comment.author.lastName 
    ? `${comment.author.firstName} ${comment.author.lastName}`
    : comment.author.username

  // Sync optimistic state with actual state when comment prop changes
  useEffect(() => {
    setOptimisticIsLiked(comment.isLiked || false)
    setOptimisticLikeCount(comment.likeCount)
    setIsLiked(comment.isLiked || false)
    setLikeCount(comment.likeCount)
    setCurrentContent(comment.content)
  }, [comment.isLiked, comment.likeCount, comment.content])

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'now'
    if (diffInMinutes < 60) return `${diffInMinutes}m`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d`
    
    return date.toLocaleDateString()
  }

  const handleLike = async () => {
    if (isLiking) return // Prevent multiple clicks
    
    // Store original state for error recovery
    const originalIsLiked = optimisticIsLiked
    const originalLikeCount = optimisticLikeCount
    
    // Optimistic update - update UI immediately
    setIsLiking(true)
    setOptimisticIsLiked(!optimisticIsLiked)
    setOptimisticLikeCount(optimisticIsLiked ? optimisticLikeCount - 1 : optimisticLikeCount + 1)
    
    try {
      const response = await likeComment(comment._id)
      
      // Show success feedback
      toast({
        title: "Success",
        description: response.liked ? "Comment liked!" : "Comment unliked!",
        duration: 1000
      })
      
      // Real-time updates will handle the UI update automatically
      // No need to call onCommentLikeUpdate anymore
    } catch (error: any) {
      // Revert optimistic updates on error
      setOptimisticIsLiked(originalIsLiked)
      setOptimisticLikeCount(originalLikeCount)
      
      const errorMessage = error?.response?.data?.error || "Failed to like comment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLiking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this comment?")) return
    
    setIsDeleting(true)
    try {
      await deleteComment(comment._id)
      toast({
        title: "Success",
        description: "Comment deleted successfully"
      })
      onCommentDelete?.()
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || "Failed to delete comment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditText(currentContent)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditText(currentContent)
  }

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText.trim() === currentContent) {
      setIsEditing(false)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await updateComment(comment._id, editText.trim())
      setCurrentContent(editText.trim())
      toast({
        title: "Success",
        description: "Comment updated successfully!"
      })
      onCommentUpdate?.(response.comment)
      setIsEditing(false)
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || "Failed to update comment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = () => {
    setIsReplying(true)
    setReplyText("")
  }

  const handleCancelReply = () => {
    setIsReplying(false)
    setReplyText("")
  }

  const handleSubmitReply = async () => {
    if (!replyText.trim()) return

    // Guard the reply interaction for non-authenticated users
    const canProceed = guardInteraction("reply to this comment", () => {})
    if (!canProceed) return

    console.log('Frontend: Submitting reply to comment:', comment._id, 'content:', replyText.trim());
    setIsSubmitting(true)
    try {
      const response = await createReply(comment._id, replyText.trim())
      console.log('Frontend: Reply creation successful:', response);
      toast({
        title: "Success",
        description: "Reply posted successfully!"
      })
      onReplyCreated?.(response.comment)
      setIsReplying(false)
      setReplyText("")
    } catch (error: any) {
      console.error('Frontend: Reply creation failed:', error);
      const errorMessage = error?.response?.data?.error || "Failed to post reply"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent, type: 'edit' | 'reply') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (type === 'edit') {
        handleSaveEdit()
      } else {
        handleSubmitReply()
      }
    }
  }

  return (
    <>
      <div className="flex gap-2.5 xs:gap-3 sm:gap-4 group">
        <div className="relative flex-shrink-0">
          <img
            src={comment.author.profileImageUrl || "/placeholder-user.jpg"}
            alt={`${authorName}'s profile`}
            className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800 shadow-sm hover:ring-blue-200 dark:hover:ring-blue-800 transition-all duration-200"
          />
          <div className="absolute -bottom-0.5 -right-0.5 xs:-bottom-1 xs:-right-1 w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1.5 xs:mb-2">
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                {authorName}
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                @{comment.author.username}
              </span>
              <span className="text-gray-300 dark:text-gray-600 text-xs">•</span>
              <span className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimestamp(comment.createdAt)}
              </span>
            </div>
            
            {isOwnComment && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 p-0 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full hover:scale-105 active:scale-95 focus:bg-gray-100 dark:focus:bg-gray-800 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36 xs:w-40 sm:w-44">
                  <DropdownMenuItem onClick={handleEdit} className="cursor-pointer text-sm font-medium">
                    <Edit className="w-4 h-4 mr-3 text-blue-600 dark:text-blue-400" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 dark:text-red-400 cursor-pointer text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg xs:rounded-xl sm:rounded-2xl p-2.5 xs:p-3 sm:p-4 mb-2.5 xs:mb-3 border border-gray-100/80 dark:border-gray-700/80">
            <p className="text-gray-900 dark:text-white whitespace-pre-wrap text-xs sm:text-sm leading-relaxed">
              {currentContent}
            </p>
          </div>
          
          <div className="flex items-center gap-3 xs:gap-4 sm:gap-6">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className={`flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs sm:text-sm transition-all duration-200 rounded-full px-1.5 xs:px-2 sm:px-3 py-1 xs:py-1.5 ${
                optimisticIsLiked 
                  ? 'text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' 
                  : 'text-gray-500 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${optimisticIsLiked ? 'fill-current' : ''}`} />
              <span className="font-medium">{optimisticLikeCount}</span>
            </button>
            
            <button
              onClick={handleReply}
              className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 rounded-full px-1.5 xs:px-2 sm:px-3 py-1 xs:py-1.5"
            >
              <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Reply</span>
              {comment.replyCount > 0 && (
                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1 xs:px-1.5 sm:px-2 py-0.5 rounded-full">
                  {comment.replyCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Inline Edit Form */}
      {isEditing && (
        <div className="mt-2.5 xs:mt-3 sm:mt-4 p-2.5 xs:p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg xs:rounded-xl sm:rounded-2xl border border-blue-200/80 dark:border-blue-800/80">
          <div className="flex gap-2.5 xs:gap-3 sm:gap-4">
            <img
              src={user?.imageUrl || "/placeholder-user.jpg"}
              alt="Your profile"
              className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm"
            />
            <div className="flex-1 space-y-1.5 xs:space-y-2 sm:space-y-3">
              <div className="relative">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 'edit')}
                  maxLength={280}
                  className="w-full p-2.5 xs:p-3 sm:p-4 text-xs sm:text-sm border border-blue-200/80 rounded-lg xs:rounded-xl sm:rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:bg-gray-800/80 dark:border-blue-700/80 dark:text-white min-h-[50px] xs:min-h-[60px] sm:min-h-[70px] max-h-[100px] xs:max-h-[120px] sm:max-h-[140px] transition-all duration-200 shadow-sm"
                  placeholder="Edit your comment..."
                />
                <div className="absolute bottom-1.5 xs:bottom-2 sm:bottom-3 right-1.5 xs:right-2 sm:right-3">
                  <div className="text-xs text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-1 xs:px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    {editText.length}/280
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Edit className="w-3 h-3" />
                  <span className="hidden xs:inline">Editing comment</span>
                  <span className="xs:hidden">Editing</span>
                </div>
                <div className="flex gap-1 xs:gap-1.5 sm:gap-2">
                  <Button
                    onClick={handleCancelEdit}
                    variant="outline"
                    size="sm"
                    className="px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full transition-all duration-200 text-xs sm:text-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={!editText.trim() || editText.trim() === comment.content || isSubmitting}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Inline Reply Form */}
      {isReplying && (
        <div className="mt-2.5 xs:mt-3 sm:mt-4 p-2.5 xs:p-3 sm:p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg xs:rounded-xl sm:rounded-2xl border border-green-200/80 dark:border-green-800/80">
          <div className="flex gap-2.5 xs:gap-3 sm:gap-4">
            <img
              src={user?.imageUrl || "/placeholder-user.jpg"}
              alt="Your profile"
              className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm"
            />
            <div className="flex-1 space-y-1.5 xs:space-y-2 sm:space-y-3">
              <div className="relative">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => handleKeyPress(e, 'reply')}
                  maxLength={280}
                  className="w-full p-2.5 xs:p-3 sm:p-4 text-xs sm:text-sm border border-green-200/80 rounded-lg xs:rounded-xl sm:rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 dark:bg-gray-800/80 dark:border-green-700/80 dark:text-white min-h-[50px] xs:min-h-[60px] sm:min-h-[70px] max-h-[100px] xs:max-h-[120px] sm:max-h-[140px] transition-all duration-200 shadow-sm"
                  placeholder="Write a reply..."
                />
                <div className="absolute bottom-1.5 xs:bottom-2 sm:bottom-3 right-1.5 xs:right-2 sm:right-3">
                  <div className="text-xs text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-1 xs:px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    {replyText.length}/280
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Reply className="w-3 h-3" />
                  <span className="hidden xs:inline">Replying to comment</span>
                  <span className="xs:hidden">Replying</span>
                </div>
                <div className="flex gap-1 xs:gap-1.5 sm:gap-2">
                  <Button
                    onClick={handleCancelReply}
                    variant="outline"
                    size="sm"
                    className="px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full transition-all duration-200 text-xs sm:text-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!replyText.trim() || isSubmitting}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50"
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {isSubmitting ? "Posting..." : "Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
} 