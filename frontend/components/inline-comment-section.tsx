"use client"

import { useState, useEffect, useRef } from "react"
import { Send, MessageCircle, Users, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { usePostApi } from "@/lib/api"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { Comment } from "./comment"
import { RepliesSection } from "./replies-section"
import { useCommentEvents } from "@/hooks/use-comment-events"

interface InlineCommentSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  commentCount: number
  onCommentSuccess?: () => void
  onCommentDeleted?: () => void
  onReplyCreated?: () => void
}

export function InlineCommentSection({ 
  postId, 
  isOpen, 
  onClose, 
  commentCount, 
  onCommentSuccess, 
  onCommentDeleted, 
  onReplyCreated 
}: InlineCommentSectionProps) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useAuth()
  const { getComments, createComment } = usePostApi()
  const { guardInteraction } = useInteractionGuard()

  useEffect(() => {
    if (isOpen && postId) {
      console.log('Frontend: Inline section opened, fetching comments for post:', postId);
      fetchComments()
    }
  }, [isOpen, postId])

  // Debug: Log comments state changes
  useEffect(() => {
    console.log('Frontend: Inline comments state updated:', comments.length, 'comments');
    comments.forEach((comment, index) => {
      console.log(`Frontend: Inline Comment ${index + 1}:`, {
        _id: comment._id,
        content: comment.content,
        replyCount: comment.replyCount,
        parentComment: comment.parentComment
      });
    });
  }, [comments]);

  const fetchComments = async () => {
    console.log('Frontend: Starting to fetch comments for post (inline):', postId);
    setLoading(true)
    try {
      const response = await getComments(postId)
      console.log('Frontend: Received comments in inline component:', response.comments?.length || 0);
      setComments(response.comments || [])
    } catch (error) {
      console.error('Failed to fetch comments:', error)
      toast({
        title: "Error",
        description: "Failed to load comments. Please try again.",
        variant: "destructive"
      })
      setComments([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return

    // Guard the comment interaction for non-authenticated users
    const canProceed = guardInteraction("comment on this post", () => {})
    if (!canProceed) return

    setSubmitting(true)
    try {
      await createComment(postId, commentText.trim())
      setCommentText("")
      
      // No need to refresh comments - real-time update will handle it
      // The new comment will be added via Socket.IO event
      
      toast({
        title: "Success",
        description: "Comment posted successfully!"
      })
      // Real-time events handle count updates, no need to call onCommentSuccess
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || "Failed to post comment"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCommentDelete = (commentId: string) => {
    setComments(prev => prev.filter(comment => comment._id !== commentId))
    // Real-time events handle count updates, no need to call onCommentDeleted
  }

  const handleCommentUpdate = (updatedComment: any) => {
    setComments(prev => prev.map(comment => 
      comment._id === updatedComment._id ? updatedComment : comment
    ))
  }

  const handleCommentLikeUpdate = async () => {
    try {
      const response = await getComments(postId)
      setComments(response.comments || [])
    } catch (error) {
      console.error('Failed to refresh comments after like update:', error)
    }
  }

  const handleReplyCreated = (reply: any) => {
    // Real-time events handle count updates, no need to call onReplyCreated
    toast({
      title: "Success",
      description: "Reply posted successfully!"
    })
  }

  // Real-time comment event handlers
  const handleNewComment = (comment: any) => {
    console.log('💬 Adding new comment to inline state:', comment);
    setComments(prev => [comment, ...prev]);
    // Real-time events handle count updates, no need to call onCommentSuccess
  };

  const handleNewReply = (reply: any, parentCommentId: string) => {
    console.log('💬 Adding new reply to inline state:', reply, 'parent:', parentCommentId);
    setComments(prev => prev.map(comment => {
      if (comment._id === parentCommentId) {
        return { ...comment, replyCount: (comment.replyCount || 0) + 1 };
      }
      return comment;
    }));
    // Real-time events handle count updates, no need to call onReplyCreated
  };

  const handleCommentLiked = (commentId: string, liked: boolean, likeCount: number) => {
    console.log('👍 Updating inline comment like status:', commentId, liked, likeCount);
    setComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        return { ...comment, isLiked: liked, likeCount };
      }
      return comment;
    }));
  };

  const handleCommentDeleted = (commentId: string) => {
    console.log('🗑️ Removing deleted comment from inline state:', commentId);
    setComments(prev => prev.filter(comment => comment._id !== commentId));
    // Real-time events handle count updates, no need to call onCommentDeleted
  };

  const handleCommentUpdated = (commentId: string, content: string, updatedAt: string) => {
    console.log('✏️ Updating inline comment content:', commentId, content);
    setComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        return { ...comment, content, updatedAt };
      }
      return comment;
    }));
  };

  // Set up real-time comment events
  useCommentEvents({
    postId,
    onNewComment: handleNewComment,
    onNewReply: handleNewReply,
    onCommentLiked: handleCommentLiked,
    onCommentDeleted: handleCommentDeleted,
    onCommentUpdated: handleCommentUpdated
  });

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment()
    }
  }

  // Early return moved after all hooks
  if (!isOpen) return null

  return (
    <div className="border-t border-gray-200/60 dark:border-gray-800/60 bg-gradient-to-b from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 backdrop-blur-sm">
      {/* Enhanced Comment Input Section */}
      <div className="px-3 xs:px-4 sm:px-6 py-2.5 xs:py-3 sm:py-4 border-b border-gray-100/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex gap-2.5 xs:gap-3 sm:gap-4">
          <div className="relative">
            <img
              src={user?.imageUrl || "/placeholder-user.jpg"}
              alt="Profile"
              className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-gray-800 shadow-sm"
            />
            <div className="absolute -bottom-0.5 -right-0.5 xs:-bottom-1 xs:-right-1 w-2.5 h-2.5 xs:w-3 xs:h-3 sm:w-4 sm:h-4 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
          </div>
          <div className="flex-1 space-y-1.5 xs:space-y-2 sm:space-y-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyPress={handleKeyPress}
                maxLength={280}
                className="w-full p-2.5 xs:p-3 sm:p-4 text-xs sm:text-sm border border-gray-200/80 rounded-lg xs:rounded-xl sm:rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 dark:bg-gray-800/80 dark:border-gray-700/80 dark:text-white min-h-[50px] xs:min-h-[60px] sm:min-h-[70px] max-h-[100px] xs:max-h-[120px] sm:max-h-[140px] transition-all duration-200 shadow-sm hover:shadow-md"
                placeholder="Share your thoughts..."
              />
              <div className="absolute bottom-1.5 xs:bottom-2 sm:bottom-3 right-1.5 xs:right-2 sm:right-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 bg-white/80 dark:bg-gray-800/80 px-1 xs:px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                  {commentText.length}/280
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400">
                <MessageCircle className="w-3 h-3" />
                <span className="hidden xs:inline">Share your perspective</span>
                <span className="xs:hidden">Share</span>
              </div>
              <Button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                size="sm"
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 xs:px-4 sm:px-6 py-1 xs:py-1.5 sm:py-2 rounded-full transition-all duration-200 text-xs sm:text-sm font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                {submitting ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Comment Count Display */}
      {commentCount > 0 && (
        <div className="px-3 xs:px-4 sm:px-6 py-2 xs:py-2.5 sm:py-3 border-b border-gray-100/80 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-semibold">
                {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Clock className="w-3 h-3" />
              <span className="hidden xs:inline">Recent activity</span>
              <span className="xs:hidden">Recent</span>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Comments List */}
      {isOpen && (
        <div className="max-h-[350px] xs:max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-6 xs:py-8 sm:py-12 space-y-2.5 xs:space-y-3 sm:space-y-4">
              <div className="relative">
                <div className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 border-2 border-transparent border-t-blue-500/20 rounded-full animate-ping"></div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Loading comments</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Gathering thoughts...</p>
              </div>
            </div>
          ) : (() => {
            console.log('Frontend: Rendering inline comments section. Comments array:', comments.length);
            console.log('Frontend: Filtered inline comments:', comments.filter(comment => comment.author).length);
            
            return comments.filter(comment => comment.author).length > 0 ? (
              <div className="divide-y divide-gray-100/60 dark:divide-gray-800/60">
                {comments
                  .filter(comment => comment.author)
                  .map((comment, index) => {
                    console.log(`Frontend: Rendering inline comment ${index + 1}:`, comment._id, comment.content);
                    return (
                      <div 
                        key={comment._id} 
                        className="px-3 xs:px-4 sm:px-6 py-2.5 xs:py-3 sm:py-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all duration-200 group"
                      >
                        <div className="animate-in slide-in-from-bottom-2 duration-300">
                          <Comment
                            comment={comment}
                            onCommentUpdate={handleCommentUpdate}
                            onCommentDelete={() => handleCommentDelete(comment._id)}
                            onCommentLikeUpdate={handleCommentLikeUpdate}
                            onReplyCreated={handleReplyCreated}
                          />
                          <RepliesSection
                            commentId={comment._id}
                            replyCount={comment.replyCount || 0}
                            postId={postId}
                            onReplyCreated={handleReplyCreated}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="py-8 xs:py-12 sm:py-16 text-center space-y-2.5 xs:space-y-3 sm:space-y-4">
                <div className="w-10 h-10 xs:w-12 xs:h-12 sm:w-16 sm:h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 xs:w-6 xs:h-6 sm:w-8 sm:h-8 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="space-y-1.5 xs:space-y-2">
                  <p className="text-sm xs:text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">No comments yet</p>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto px-2">
                    Be the first to share your thoughts and start the conversation!
                  </p>
                </div>
                <div className="pt-1.5 xs:pt-2">
                  <div className="inline-flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 xs:px-2.5 sm:px-3 py-1 rounded-full">
                    <Users className="w-3 h-3" />
                    <span>Join the discussion</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  )
} 