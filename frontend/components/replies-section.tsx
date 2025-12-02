"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react"
import { Comment } from "./comment"
import { usePostApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { useCommentEvents } from "@/hooks/use-comment-events"

interface RepliesSectionProps {
  commentId: string
  replyCount: number
  postId: string
  onReplyCreated?: (reply: any) => void
}

// Separate component for nested replies to avoid circular import
function NestedRepliesSection({ commentId, replyCount, postId, onReplyCreated }: RepliesSectionProps) {
  const [replies, setReplies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const { getReplies } = usePostApi()

  const fetchReplies = async () => {
    if (hasFetched) return
    
    setLoading(true)
    try {
      const response = await getReplies(commentId)
      setReplies(response.replies || [])
      setHasFetched(true)
    } catch (error) {
      // Removed error toast - not critical for normal users
    } finally {
      setLoading(false)
    }
  }

  const handleToggleReplies = () => {
    if (!isExpanded && !hasFetched) {
      fetchReplies()
    }
    setIsExpanded(!isExpanded)
  }

  const handleReplyCreated = (reply: any) => {
    setReplies(prev => [reply, ...prev])
    onReplyCreated?.(reply)
  }

  const handleReplyUpdate = (updatedReply: any) => {
    setReplies(prev => prev.map(reply => 
      reply._id === updatedReply._id ? updatedReply : reply
    ))
  }

  const handleReplyDelete = (replyId: string) => {
    // Removed debug log - not needed for production
    setReplies(prev => prev.filter(reply => reply._id !== replyId))
  }

  const handleReplyLikeUpdate = async () => {
    // Real-time updates will handle like updates automatically
    // No need to refresh the entire list anymore
  }

  // Real-time event handlers for replies
  const handleNewReply = (reply: any, parentCommentId: string) => {
    if (parentCommentId === commentId) {
      // Removed debug log - not needed for production
      setReplies(prev => [reply, ...prev]);
      onReplyCreated?.(reply);
    }
  };

  const handleReplyLiked = (replyId: string, liked: boolean, likeCount: number) => {
    // Removed debug log - not needed for production
    setReplies(prev => prev.map(reply => {
      if (reply._id === replyId) {
        return { ...reply, isLiked: liked, likeCount };
      }
      return reply;
    }));
  };

  const handleReplyUpdated = (replyId: string, content: string, updatedAt: string) => {
    // Removed debug log - not needed for production
    setReplies(prev => prev.map(reply => {
      if (reply._id === replyId) {
        return { ...reply, content, updatedAt };
      }
      return reply;
    }));
  };

  // Set up real-time comment events for this comment's replies
  useCommentEvents({
    postId,
    onNewReply: handleNewReply,
    onCommentLiked: handleReplyLiked,
    onCommentDeleted: handleReplyDelete,
    onCommentUpdated: handleReplyUpdated
  });

  // Early return moved after all hooks
  if (replyCount === 0) return null

  return (
    <div className="mt-2.5 xs:mt-3 sm:mt-4">
      <button
        onClick={handleToggleReplies}
        className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-blue-500 transition-all duration-200 ml-6 xs:ml-8 sm:ml-12 md:ml-16 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
      >
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200" />
          )}
          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="font-medium text-xs sm:text-sm">
            {isExpanded ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
        </div>
        {!isExpanded && (
          <div className="ml-1 xs:ml-1.5 sm:ml-2 px-1.5 xs:px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
            {replyCount}
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2.5 xs:mt-3 sm:mt-4 ml-6 xs:ml-8 sm:ml-12 md:ml-16 relative">
          {/* Decorative line - white for better visibility */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-600"></div>
          
          <div className="pl-2.5 xs:pl-3 sm:pl-4 md:pl-6 space-y-2.5 xs:space-y-3 sm:space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-4 xs:py-6 sm:py-8 space-y-2 xs:space-y-2.5 sm:space-y-3">
                <div className="relative">
                  <div className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 border-2 border-transparent border-t-blue-500/20 rounded-full animate-ping"></div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Loading replies</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Fetching responses...</p>
                </div>
              </div>
            ) : replies.length > 0 ? (
              <div className="space-y-2.5 xs:space-y-3 sm:space-y-4">
                {replies.map((reply, index) => (
                  <div 
                    key={reply._id} 
                    className="animate-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Comment
                      comment={reply}
                      onCommentUpdate={handleReplyUpdate}
                      onCommentDelete={() => handleReplyDelete(reply._id)}
                      onCommentLikeUpdate={handleReplyLikeUpdate}
                      onReplyCreated={handleReplyCreated}
                    />
                    {/* Use nested replies for replies */}
                    {reply.replyCount > 0 && (
                      <NestedRepliesSection
                        commentId={reply._id}
                        replyCount={reply.replyCount || 0}
                        postId={postId}
                        onReplyCreated={handleReplyCreated}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 xs:py-6 sm:py-8 text-center space-y-2 xs:space-y-2.5 sm:space-y-3">
                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">No replies yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Be the first to respond!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function RepliesSection({ commentId, replyCount, postId, onReplyCreated }: RepliesSectionProps) {
  const [replies, setReplies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const { getReplies } = usePostApi()

  const fetchReplies = async () => {
    if (hasFetched) return
    
    setLoading(true)
    try {
      const response = await getReplies(commentId)
      setReplies(response.replies || [])
      setHasFetched(true)
    } catch (error) {
      // Removed error toast - not critical for normal users
    } finally {
      setLoading(false)
    }
  }

  const handleToggleReplies = () => {
    if (!isExpanded && !hasFetched) {
      fetchReplies()
    }
    setIsExpanded(!isExpanded)
  }

  const handleReplyCreated = (reply: any) => {
    setReplies(prev => [reply, ...prev])
    onReplyCreated?.(reply)
  }

  const handleReplyUpdate = (updatedReply: any) => {
    setReplies(prev => prev.map(reply => 
      reply._id === updatedReply._id ? updatedReply : reply
    ))
  }

  const handleReplyDelete = (replyId: string) => {
    // Removed debug log - not needed for production
    setReplies(prev => prev.filter(reply => reply._id !== replyId))
  }

  const handleReplyLikeUpdate = async () => {
    // Real-time updates will handle like updates automatically
    // No need to refresh the entire list anymore
  }

  // Real-time event handlers for replies
  const handleNewReply = (reply: any, parentCommentId: string) => {
    if (parentCommentId === commentId) {
      // Removed debug log - not needed for production
      setReplies(prev => [reply, ...prev]);
      onReplyCreated?.(reply);
    }
  };

  const handleReplyLiked = (replyId: string, liked: boolean, likeCount: number) => {
    // Removed debug log - not needed for production
    setReplies(prev => prev.map(reply => {
      if (reply._id === replyId) {
        return { ...reply, isLiked: liked, likeCount };
      }
      return reply;
    }));
  };

  const handleReplyUpdated = (replyId: string, content: string, updatedAt: string) => {
    // Removed debug log - not needed for production
    setReplies(prev => prev.map(reply => {
      if (reply._id === replyId) {
        return { ...reply, content, updatedAt };
      }
      return reply;
    }));
  };

  // Set up real-time comment events for this comment's replies
  useCommentEvents({
    postId,
    onNewReply: handleNewReply,
    onCommentLiked: handleReplyLiked,
    onCommentDeleted: handleReplyDelete,
    onCommentUpdated: handleReplyUpdated
  });

  // Early return moved after all hooks
  if (replyCount === 0) return null

  return (
    <div className="mt-2.5 xs:mt-3 sm:mt-4">
      <button
        onClick={handleToggleReplies}
        className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-500 hover:text-blue-500 transition-all duration-200 ml-6 xs:ml-8 sm:ml-12 md:ml-16 px-2 xs:px-2.5 sm:px-3 py-1.5 xs:py-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 group"
      >
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2">
          {isExpanded ? (
            <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 transition-transform duration-200" />
          )}
          <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="font-medium text-xs sm:text-sm">
            {isExpanded ? 'Hide' : 'Show'} {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
          </span>
        </div>
        {!isExpanded && (
          <div className="ml-1 xs:ml-1.5 sm:ml-2 px-1.5 xs:px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
            {replyCount}
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="mt-2.5 xs:mt-3 sm:mt-4 ml-6 xs:ml-8 sm:ml-12 md:ml-16 relative">
          {/* Decorative line - white for better visibility */}
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-600"></div>
          
          <div className="pl-2.5 xs:pl-3 sm:pl-4 md:pl-6 space-y-2.5 xs:space-y-3 sm:space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-4 xs:py-6 sm:py-8 space-y-2 xs:space-y-2.5 sm:space-y-3">
                <div className="relative">
                  <div className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 border-2 border-transparent border-t-blue-500/20 rounded-full animate-ping"></div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Loading replies</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Fetching responses...</p>
                </div>
              </div>
            ) : replies.length > 0 ? (
              <div className="space-y-2.5 xs:space-y-3 sm:space-y-4">
                {replies.map((reply, index) => (
                  <div 
                    key={reply._id} 
                    className="animate-in slide-in-from-left-2 duration-300"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <Comment
                      comment={reply}
                      onCommentUpdate={handleReplyUpdate}
                      onCommentDelete={() => handleReplyDelete(reply._id)}
                      onCommentLikeUpdate={handleReplyLikeUpdate}
                      onReplyCreated={handleReplyCreated}
                    />
                    {/* Use nested replies for replies */}
                    {reply.replyCount > 0 && (
                      <NestedRepliesSection
                        commentId={reply._id}
                        replyCount={reply.replyCount || 0}
                        postId={postId}
                        onReplyCreated={handleReplyCreated}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 xs:py-6 sm:py-8 text-center space-y-2 xs:space-y-2.5 sm:space-y-3">
                <div className="w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-gray-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">No replies yet</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Be the first to respond!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 