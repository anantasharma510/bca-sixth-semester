"use client"

import { useState, useEffect } from "react"
import { useBlockApi } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { toast } from "@/hooks/use-toast"
import { UserX, Unlock } from "lucide-react"

export function BlockedUsersList() {
  const [blockedUsers, setBlockedUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unblocking, setUnblocking] = useState<string | null>(null)
  const { getBlockedUsers, unblockUser } = useBlockApi()

  useEffect(() => {
    loadBlockedUsers()
  }, [])

  const loadBlockedUsers = async () => {
    try {
      setLoading(true)
      const response = await getBlockedUsers(1, 100) // Get all blocked users
      setBlockedUsers(response.blockedUsers || [])
    } catch (error) {
      console.error('Error loading blocked users:', error)
      toast({
        title: "Error",
        description: "Failed to load blocked users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (userId: string) => {
    try {
      setUnblocking(userId)
      await unblockUser(userId)
      
      // Remove from local state
      setBlockedUsers(prev => prev.filter(user => user._id !== userId))
      
      toast({
        title: "User Unblocked",
        description: "The user can now see your posts and interact with you."
      })
    } catch (error: any) {
      console.error('Error unblocking user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to unblock user",
        variant: "destructive"
      })
    } finally {
      setUnblocking(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-3 p-4 border rounded-lg animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/4"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (blockedUsers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <UserX className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No blocked users
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center">
            You haven't blocked any users yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {blockedUsers.map((user) => (
        <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={user.profileImageUrl} alt={user.username} />
              <AvatarFallback>
                {user.firstName && user.lastName 
                  ? `${user.firstName[0]}${user.lastName[0]}`
                  : user.username[0]?.toUpperCase() || 'U'
                }
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {user.firstName && user.lastName 
                  ? `${user.firstName} ${user.lastName}`
                  : user.username
                }
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{user.username}
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleUnblock(user._id)}
            disabled={unblocking === user._id}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Unlock className="w-4 h-4" />
            <span>{unblocking === user._id ? 'Unblocking...' : 'Unblock'}</span>
          </Button>
        </div>
      ))}
    </div>
  )
} 