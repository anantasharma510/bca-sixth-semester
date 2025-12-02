"use client"

import { useState, useEffect, useRef } from "react"
import { Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Comment } from "./comment"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import { usePostApi } from "@/lib/api"
import { RepliesSection } from "./replies-section"
import { useCommentEvents } from "@/hooks/use-comment-events"

interface CommentSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
  commentCount: number
  onCommentSuccess?: () => void
  onCommentDeleted?: () => void
  onReplyCreated?: () => void
}

export function CommentSection({ postId, isOpen, onClose, commentCount, onCommentSuccess, onCommentDeleted, onReplyCreated }: CommentSectionProps) {
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [commentText, setCommentText] = useState("")
  const { user } = useAuth()
  const { getComments, createComment } = usePostApi()

  // Fetch comments when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Frontend: Modal opened, fetching comments for post:', postId);
      
      const fetchComments = async () => {
        console.log('Frontend: Starting to fetch comments for post:', postId);
        setLoading(true)
        try {
          const response = await getComments(postId)
          console.log('Frontend: Received comments in component:', response.comments?.length || 0);
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

      fetchComments()
    }
  }, [isOpen, postId, getComments])

  // Debug: Log comments state changes
  useEffect(() => {
    console.log('Frontend: Comments state updated:', comments.length, 'comments');
    comments.forEach((comment, index) => {
      console.log(`Frontend: Comment ${index + 1}:`, {
        _id: comment._id,
        content: comment.content,
        replyCount: comment.replyCount,
        parentComment: comment.parentComment
      });
    });
  }, [comments]);

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return

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
    // Refresh comments to get updated like counts
    try {
      const response = await getComments(postId)
      setComments(response.comments || [])
    } catch (error) {
      console.error('Failed to refresh comments after like update:', error)
    }
  }

  const handleReplyCreated = (reply: any) => {
    // Real-time events handle count updates, no need to call onReplyCreated
    
    // Show success message
    toast({
      title: "Success",
      description: "Reply posted successfully!"
    })
  }

  // Real-time comment event handlers
  const handleNewComment = (comment: any) => {
    console.log('💬 Adding new comment to state:', comment);
    setComments(prev => [comment, ...prev]);
    // Real-time events handle count updates, no need to call onCommentSuccess
  };

  const handleNewReply = (reply: any, parentCommentId: string) => {
    console.log('💬 Adding new reply to state:', reply, 'parent:', parentCommentId);
    setComments(prev => prev.map(comment => {
      if (comment._id === parentCommentId) {
        return { ...comment, replyCount: (comment.replyCount || 0) + 1 };
      }
      return comment;
    }));
    // Real-time events handle count updates, no need to call onReplyCreated
  };

  const handleCommentLiked = (commentId: string, liked: boolean, likeCount: number) => {
    console.log('👍 Updating comment like status:', commentId, liked, likeCount);
    setComments(prev => prev.map(comment => {
      if (comment._id === commentId) {
        return { ...comment, isLiked: liked, likeCount };
      }
      return comment;
    }));
  };

  const handleCommentDeleted = (commentId: string) => {
    console.log('🗑️ Removing deleted comment from state:', commentId);
    setComments(prev => prev.filter(comment => comment._id !== commentId));
    // Real-time events handle count updates, no need to call onCommentDeleted
  };

  const handleCommentUpdated = (commentId: string, content: string, updatedAt: string) => {
    console.log('✏️ Updating comment content:', commentId, content);
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-lg mx-4 mb-20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Comments ({commentCount})
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment Form */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
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
                placeholder="Write a comment..."
              />
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {commentText.length}/280
                </div>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full transition-colors"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitting ? "Posting..." : "Post"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
            </div>
          ) : (() => {
            console.log('Frontend: Rendering comments section. Comments array:', comments.length);
            console.log('Frontend: Filtered comments:', comments.filter(comment => comment.author).length);
            
            return comments.filter(comment => comment.author).length > 0 ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {comments
                  .filter(comment => comment.author) // Filter out comments with missing author data
                  .map((comment, index) => {
                    console.log(`Frontend: Rendering comment ${index + 1}:`, comment._id, comment.content);
                    return (
                      <div key={comment._id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
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
                    );
                  })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No comments yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Be the first to share your thoughts!</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  )
}