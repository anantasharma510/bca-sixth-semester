"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFollowApi } from "@/lib/api"
import { useMessagingApi } from "@/lib/messaging-api"
import { useAuth } from "@/hooks/use-auth"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface MessageButtonProps {
  userId: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "lg"
  className?: string
  renderLabel?: (canMessage: boolean, isLoading: boolean) => React.ReactNode
}

export function MessageButton({ 
  userId, 
  variant = "default",
  size = "sm",
  className = "",
  renderLabel
}: MessageButtonProps) {
  const [canMessage, setCanMessage] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const { checkFollowingStatus, checkFollowedByStatus } = useFollowApi()
  const { createConversation } = useMessagingApi()
  const { user } = useAuth()
  const currentUserId = user?.id
  const { guardInteraction } = useInteractionGuard()
  const router = useRouter()

  // Don't show message button for own profile
  if (currentUserId === userId) {
    return null
  }

  // Memoize the check status function
  const checkStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true)
      // Check both following statuses in parallel
      const [followingResponse, followedByResponse] = await Promise.all([
        checkFollowingStatus(userId),
        checkFollowedByStatus(userId)
      ])
      // Can only message if both users follow each other
      setCanMessage(followingResponse.isFollowing && followedByResponse.isFollowedBy)
    } catch (error) {
      console.error('Error checking following status:', error)
      setCanMessage(false)
    } finally {
      setIsCheckingStatus(false)
    }
  }, [userId, checkFollowingStatus, checkFollowedByStatus])

  // Check following status on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleStartConversation = async () => {
    if (isLoading || !canMessage) return

    // Guard the messaging interaction for non-authenticated users
    const canProceed = guardInteraction("start a conversation", () => {})
    if (!canProceed) return

    setIsLoading(true)
    try {
      await createConversation(userId)
      toast({
        title: "Success",
        description: "Conversation started! Redirecting to messages...",
      })
      // Redirect to messages page
      router.push('/messages')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCheckingStatus) {
    return (
      <Button 
        variant={variant} 
        size={size} 
        disabled 
        className={className}
      >
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Loading...
      </Button>
    )
  }

  // Don't render if user can't message
  if (!canMessage) {
    return null
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartConversation}
      disabled={isLoading}
      className={`bg-green-600 hover:bg-green-700 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : renderLabel ? (
        renderLabel(canMessage, isLoading)
      ) : (
        <MessageCircle className="w-4 h-4 mr-2" />
      )}
      {renderLabel ? null : 'Message'}
    </Button>
  )
} 