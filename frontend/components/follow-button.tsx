"use client"

import { useState, useEffect, useCallback } from "react"
import { UserPlus, UserMinus, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useFollowApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { toast } from "@/hooks/use-toast"

interface FollowButtonProps {
  userId: string
  initialIsFollowing?: boolean
  onFollowChange?: (isFollowing: boolean) => void
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "lg"
  className?: string
  renderLabel?: (isFollowing: boolean, isLoading: boolean, isFollowBack: boolean) => React.ReactNode
}

export function FollowButton({ 
  userId, 
  initialIsFollowing = false, 
  onFollowChange,
  variant = "default",
  size = "sm",
  className = "",
  renderLabel
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isFollowedBy, setIsFollowedBy] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const { followUser, unfollowUser, checkFollowingStatus, checkFollowedByStatus } = useFollowApi()
  const { user } = useAuth()
  const currentUserId = user?.id
  const { guardInteraction } = useInteractionGuard()

  // Don't show follow button for own profile
  if (currentUserId === userId) {
    return null
  }

  // Calculate if this is a "Follow Back" scenario
  const isFollowBack = !isFollowing && isFollowedBy

  // Memoize the check status function
  const checkStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true)
      // Check both following statuses in parallel
      const [followingResponse, followedByResponse] = await Promise.all([
        checkFollowingStatus(userId),
        checkFollowedByStatus(userId)
      ])
      setIsFollowing(followingResponse.isFollowing)
      setIsFollowedBy(followedByResponse.isFollowedBy)
    } catch (error) {
      console.error('Error checking following status:', error)
      // Keep the initial state if there's an error
    } finally {
      setIsCheckingStatus(false)
    }
  }, [userId, checkFollowingStatus, checkFollowedByStatus])

  // Check following status on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  const handleFollowToggle = async () => {
    // Guard the follow interaction for non-authenticated users
    const canProceed = guardInteraction("follow this user", () => {})
    if (!canProceed) return

    if (isLoading) return

    setIsLoading(true)
    try {
      if (isFollowing) {
        await unfollowUser(userId)
        setIsFollowing(false)
      } else {
        await followUser(userId)
        setIsFollowing(true)
      }
      
      // Notify parent component
      onFollowChange?.(!isFollowing)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update follow status",
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
        className={`min-w-[48px] xs:min-w-[64px] sm:min-w-[90px] px-1.5 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-[11px] xs:text-xs sm:text-sm rounded-full flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 font-semibold transition-all duration-150 h-10 xs:h-10 sm:h-11 w-full max-w-full whitespace-nowrap ${className}`}
      >
        <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2 animate-spin" />
        <span className="truncate">Loading...</span>
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleFollowToggle}
      disabled={isLoading}
      className={`min-w-[48px] xs:min-w-[64px] sm:min-w-[90px] px-1.5 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-[11px] xs:text-xs sm:text-sm rounded-full flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 font-semibold transition-all duration-150 h-10 xs:h-10 sm:h-11 w-full max-w-full whitespace-nowrap
        ${isFollowing
          ? 'bg-white border border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600'
          : 'bg-[#ff7300] hover:bg-[#ff7300]/90 text-white'}
        ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
        ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2 animate-spin" />
      ) : renderLabel ? (
        renderLabel(isFollowing, isLoading, isFollowBack)
      ) : isFollowing ? (
        <UserMinus className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2" />
      ) : isFollowBack ? (
        <RotateCcw className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2" />
      ) : (
        <UserPlus className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2" />
      )}
      {renderLabel ? null : (
        <span className="truncate whitespace-nowrap">
          {isFollowing 
            ? 'Following' 
            : isFollowBack 
              ? 'Follow Back' 
              : 'Follow'}
        </span>
      )}
    </Button>
  )
} 