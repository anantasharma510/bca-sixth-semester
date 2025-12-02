"use client"

import { useState, useEffect, useCallback } from "react"
import { Shield, ShieldOff, Loader2, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBlockApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useSocket } from "@/components/socket-provider"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { toast } from "@/hooks/use-toast"

interface BlockButtonProps {
  userId: string
  initialIsBlocked?: boolean
  onBlockChange?: (isBlocked: boolean) => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  renderLabel?: (isBlocked: boolean, isLoading: boolean) => React.ReactNode
}

export function BlockButton({ 
  userId, 
  initialIsBlocked = false, 
  onBlockChange,
  variant = "outline",
  size = "default",
  className = "",
  renderLabel
}: BlockButtonProps) {
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)
  const [isLoading, setIsLoading] = useState(false)
  const [blockStatus, setBlockStatus] = useState({ userBlockedOther: false, otherBlockedUser: false, isMutualBlock: false })
  const { blockUser, unblockUser, checkBlockStatus, checkMutualBlockStatus } = useBlockApi()
  const { user } = useAuth()
  const currentUserId = user?.id
  const { socket } = useSocket()
  const { guardInteraction } = useInteractionGuard()

  // Don't show block button for own profile
  if (currentUserId === userId) {
    return null
  }

  // Check block status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [blockResponse, mutualBlockResponse] = await Promise.all([
          checkBlockStatus(userId),
          checkMutualBlockStatus(userId)
        ])
        setIsBlocked(blockResponse.isBlocked)
        setBlockStatus(mutualBlockResponse)
      } catch (error) {
        console.error('Error checking block status:', error)
      }
    }

    checkStatus()
  }, [userId, checkBlockStatus, checkMutualBlockStatus])

  const handleToggleBlock = useCallback(async () => {
    if (isLoading) return

    // Guard the block interaction for non-authenticated users
    const canProceed = guardInteraction("block this user", () => {})
    if (!canProceed) return

    setIsLoading(true)
    try {
      if (isBlocked) {
        await unblockUser(userId)
        setIsBlocked(false)
        setBlockStatus(prev => ({ ...prev, userBlockedOther: false, isMutualBlock: prev.otherBlockedUser }))
        
        // Emit Socket.IO event for real-time updates
        if (socket) {
          socket.emit('userUnblocked', { unblockedUserId: userId });
        }
        
        toast({
          title: "User Unblocked",
          description: "You can now see their posts and interact with them.",
        })
      } else {
        await blockUser(userId)
        setIsBlocked(true)
        setBlockStatus(prev => ({ ...prev, userBlockedOther: true, isMutualBlock: true }))
        
        // Emit Socket.IO event for real-time updates
        if (socket) {
          socket.emit('userBlocked', { blockedUserId: userId });
        }
        
        toast({
          title: "User Blocked",
          description: "You will no longer see their posts and they cannot see yours.",
        })
      }
      
      // Notify parent component
      onBlockChange?.(!isBlocked)
    } catch (error: any) {
      console.error('Error toggling block:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update block status",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [isBlocked, isLoading, userId, blockUser, unblockUser, onBlockChange, socket, guardInteraction])

  // If the other user blocked us, show a different state
  if (blockStatus.otherBlockedUser && !blockStatus.userBlockedOther) {
    return (
      <Button 
        variant="outline" 
        size={size} 
        disabled 
        className={`min-w-[48px] xs:min-w-[64px] sm:min-w-[90px] px-1.5 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-[11px] xs:text-xs sm:text-sm rounded-full flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 font-semibold transition-all duration-150 h-10 xs:h-10 sm:h-11 w-full max-w-full whitespace-nowrap bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 ${className}`}
      >
        <UserX className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2" />
        <span className="truncate">Blocked by User</span>
      </Button>
    )
  }

  if (isLoading) {
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
      onClick={handleToggleBlock}
      disabled={isLoading}
      variant={isBlocked ? "default" : variant}
      size={size}
      className={`min-w-[48px] xs:min-w-[64px] sm:min-w-[90px] px-1.5 xs:px-2 sm:px-4 py-1.5 xs:py-2 text-[11px] xs:text-xs sm:text-sm rounded-full flex items-center justify-center gap-0.5 xs:gap-1 sm:gap-2 font-semibold transition-all duration-150 h-10 xs:h-10 sm:h-11 w-full max-w-full whitespace-nowrap
        ${isBlocked ? 'bg-red-600 hover:bg-red-700 text-white hover:text-white' : 'bg-blue-500 hover:bg-blue-600 text-white hover:text-white'}
        ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}
        ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2 animate-spin" />
      ) : renderLabel ? (
        renderLabel(isBlocked, isLoading)
      ) : isBlocked ? (
        <ShieldOff className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2" />
      ) : (
        <Shield className="w-4 h-4 xs:w-5 xs:h-5 sm:w-5 sm:h-5 mr-1 xs:mr-2" />
      )}
      {renderLabel ? null : (
        <span className="truncate whitespace-nowrap">{isBlocked ? 'Unblock' : 'Block'}</span>
      )}
    </Button>
  )
} 