"use client"

import { useState, useEffect } from "react"
import { useFollowApi } from "@/lib/api"
import { useBlockApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { FollowButton } from "./follow-button"
import { BlockButton } from "./block-button"
import Link from "next/link"
import { toast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Button } from "./ui/button"
import { RefreshCw, Users, Sparkles, X, ChevronRight } from "lucide-react"

interface SuggestionUser {
  _id: string
  username: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
  followerCount: number
  displayName: string
  bio?: string
}

interface WhoToFollowProps {
  variant?: "sidebar" | "inline" | "mobile"
  maxSuggestions?: number
  showHeader?: boolean
  onDismiss?: () => void
}

export function WhoToFollow({ 
  variant = "sidebar", 
  maxSuggestions = 5, 
  showHeader = true,
  onDismiss 
}: WhoToFollowProps) {
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const { getFollowSuggestions } = useFollowApi()
  const { getBlockedUsers } = useBlockApi()
  const { user, isSignedIn, isLoaded } = useAuth()
  const currentUserId = user?.id
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Wait for auth to load and check if user is authenticated before making API calls
        if (!isLoaded) {
          return // Wait for auth to finish loading
        }
        
        if (!isSignedIn || !currentUserId) {
          console.log('User not authenticated, skipping suggestions fetch')
          setSuggestions([])
          return
        }
        
        // Fetch both follow suggestions and blocked users
        const [suggestionsResponse, blockedResponse] = await Promise.all([
          getFollowSuggestions(10),
          getBlockedUsers(1, 100) // Get all blocked users
        ])

        // Extract blocked user IDs from the response
        const blockedIds = blockedResponse.blockedUsers.map((user: any) => user._id)
        setBlockedUserIds(blockedIds)

        // Filter out blocked users from suggestions
        const filteredSuggestions = suggestionsResponse.suggestions.filter(
          (user: any) => !blockedIds.includes(user._id)
        )

        setSuggestions(filteredSuggestions)
      } catch (error: any) {
        // Handle authentication errors (401) gracefully - don't log as error
        if (error?.isAuthError || error?.statusCode === 401 || error.message?.includes('Unauthorized') || error.message?.includes('No Better Auth session')) {
          console.log('Authentication required for suggestions - skipping silently')
          setSuggestions([])
        } else if (error.message?.includes('No Clerk token found') || error.message?.includes('authentication')) {
          console.log('Authentication required for suggestions')
          setSuggestions([])
        } else {
          // For other errors, log and show empty state
          console.error('Error fetching suggestions:', error)
          setSuggestions([])
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [getFollowSuggestions, getBlockedUsers, currentUserId, isSignedIn, isLoaded])

  const handleFollowChange = (userId: string) => (isFollowing: boolean) => {
    // Remove the user from suggestions when followed
    if (isFollowing) {
      setSuggestions(prev => prev.filter(user => user._id !== userId))
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      setIsLoading(true)
      
      // Check if user is authenticated before making API calls
      if (!isSignedIn || !currentUserId) {
        console.log('User not authenticated, skipping suggestions refresh')
        setSuggestions([])
        return
      }
      
      // Fetch both follow suggestions and blocked users
      const [suggestionsResponse, blockedResponse] = await Promise.all([
        getFollowSuggestions(10),
        getBlockedUsers(1, 100) // Get all blocked users
      ])

      // Extract blocked user IDs from the response
      const blockedIds = blockedResponse.blockedUsers.map((user: any) => user._id)
      setBlockedUserIds(blockedIds)

      // Filter out blocked users from suggestions
      const filteredSuggestions = suggestionsResponse.suggestions.filter(
        (user: any) => !blockedIds.includes(user._id)
      )

      setSuggestions(filteredSuggestions)
    } catch (error: any) {
      // Handle authentication errors (401) gracefully - don't log as error
      if (error?.isAuthError || error?.statusCode === 401 || error.message?.includes('Unauthorized') || error.message?.includes('No Better Auth session')) {
        console.log('Authentication required for suggestions refresh - skipping silently')
        setSuggestions([])
      } else if (error.message?.includes('No Clerk token found') || error.message?.includes('authentication')) {
        console.log('Authentication required for suggestions refresh')
        setSuggestions([])
      } else {
        // For other errors, log and show empty state
        console.error('Error fetching suggestions:', error)
        setSuggestions([])
      }
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Mobile inline variant - Twitter-style
  if (variant === "inline") {
    if (isLoading) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-4 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (suggestions.length === 0) {
      // For inline variant, don't show anything when no suggestions (including when not authenticated)
      return null
    }

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Who to follow</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing}
                  className="w-6 h-6 p-0 rounded-full text-gray-500 hover:text-[#ff7300] hover:bg-[#ff7300]/10 dark:hover:bg-[#ff7300]/20"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          {suggestions.slice(0, maxSuggestions).map((user) => (
            <div key={user._id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group">
              <Link href={`/profile/${user._id}`} className="flex items-center space-x-3 flex-1 min-w-0 group-hover:scale-[1.02] transition-transform duration-200">
                <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-transparent group-hover:ring-[#ff7300]/20 transition-all duration-200">
                  <AvatarImage src={user.profileImageUrl} alt={user.username} />
                  <AvatarFallback className="text-xs font-medium bg-[#ff7300] text-white">
                    {user.firstName && user.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username[0]?.toUpperCase() || 'U'
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username
                      }
                    </p>
                    {user.followerCount > 1000 && (
                      <span className="text-[10px] text-[#ff7300] dark:text-[#ff7300] font-medium bg-[#ff7300]/10 dark:bg-[#ff7300]/20 px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="text-gray-600 dark:text-gray-300 text-xs truncate mt-1 leading-tight">
                      {user.bio}
                    </p>
                  )}
                  {user.followerCount > 0 && (
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {user.followerCount > 1000 
                        ? `${(user.followerCount / 1000).toFixed(1)}K followers`
                        : `${user.followerCount} followers`
                      }
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex-shrink-0 ml-2">
                <FollowButton
                  userId={user._id}
                  size="sm"
                  variant="default"
                  className="min-w-[60px] h-6 text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-200 hover:scale-105 !bg-[#ff7300] !hover:bg-[#ff7300]/90 !text-white"
                  onFollowChange={handleFollowChange(user._id)}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/explore"
            className="text-[#ff7300] hover:text-[#ff7300]/90 text-xs font-semibold hover:underline transition-colors flex items-center gap-1 group"
          >
            Show more
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    )
  }

  // Mobile-specific variant - even more compact
  if (variant === "mobile") {
    if (isLoading) {
      return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 mb-3 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
                <div className="w-12 h-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (suggestions.length === 0) {
      // For mobile variant, don't show anything when no suggestions (including when not authenticated)
      return null
    }

    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <h3 className="font-bold text-gray-900 dark:text-white text-xs">Who to follow</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              disabled={refreshing}
              className="w-5 h-5 p-0 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {onDismiss && (
              <Button
                onClick={onDismiss}
                variant="ghost"
                size="sm"
                className="w-5 h-5 p-0 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-2.5 h-2.5" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="space-y-2">
          {suggestions.slice(0, 2).map((user) => (
            <div key={user._id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group">
              <Link href={`/profile/${user._id}`} className="flex items-center space-x-2 flex-1 min-w-0 group-hover:scale-[1.02] transition-transform duration-200">
                <Avatar className="w-8 h-8 flex-shrink-0 ring-1 ring-transparent group-hover:ring-blue-500/20 transition-all duration-200">
                  <AvatarImage src={user.profileImageUrl} alt={user.username} />
                  <AvatarFallback className="text-xs font-medium bg-[#ff7300] text-white">
                    {user.firstName && user.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username[0]?.toUpperCase() || 'U'
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username
                    }
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                    @{user.username}
                  </p>
                </div>
              </Link>
              <div className="flex-shrink-0 ml-1">
                <FollowButton
                  userId={user._id}
                  size="sm"
                  variant="default"
                  className="min-w-[50px] h-5 text-xs px-1.5 py-0.5 rounded-full font-medium transition-all duration-200 hover:scale-105"
                  onFollowChange={handleFollowChange(user._id)}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/explore"
            className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline transition-colors flex items-center gap-1 group"
          >
            Show more
            <ChevronRight className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    )
  }

  // Original sidebar variant
  if (isLoading) {
    return (
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Who to follow
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-7 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Who to follow
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            {!currentUserId ? (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                  Sign in to see suggestions
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-3">
                  Get personalized recommendations when you're signed in
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-3">
                  No suggestions available
                </p>
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  disabled={refreshing}
                  className="text-xs px-3 py-1.5 rounded-full border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <RefreshCw className={`w-3 h-3 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-gray-200 dark:border-gray-800 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            Who to follow
          </CardTitle>
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            disabled={refreshing}
            className="w-8 h-8 p-0 rounded-full text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {suggestions.slice(0, maxSuggestions).map((user) => (
            <div key={user._id} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-200 group">
              <Link href={`/profile/${user._id}`} className="flex items-center space-x-3 flex-1 min-w-0 group-hover:scale-[1.02] transition-transform duration-200">
                <Avatar className="w-9 h-9 flex-shrink-0 ring-2 ring-transparent group-hover:ring-blue-500/20 transition-all duration-200">
                  <AvatarImage src={user.profileImageUrl} alt={user.username} />
                  <AvatarFallback className="text-xs font-medium bg-[#ff7300] text-white">
                    {user.firstName && user.lastName 
                      ? `${user.firstName[0]}${user.lastName[0]}`
                      : user.username[0]?.toUpperCase() || 'U'
                    }
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="font-semibold text-xs text-gray-900 dark:text-white truncate">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username
                      }
                    </p>
                    {user.followerCount > 1000 && (
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                    @{user.username}
                  </p>
                  {user.bio && (
                    <p className="text-gray-600 dark:text-gray-300 text-xs truncate mt-1 leading-tight">
                      {user.bio}
                    </p>
                  )}
                  {user.followerCount > 0 && (
                    <p className="text-gray-400 dark:text-gray-500 text-xs mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {user.followerCount > 1000 
                        ? `${(user.followerCount / 1000).toFixed(1)}K followers`
                        : `${user.followerCount} followers`
                      }
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex-shrink-0 ml-2">
                <FollowButton
                  userId={user._id}
                  size="sm"
                  variant="default"
                  className="min-w-[60px] h-6 text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-200 hover:scale-105"
                  onFollowChange={handleFollowChange(user._id)}
                />
              </div>
            </div>
          ))}
        </div>
        
        <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-800">
          <Link
            href="/explore"
            className="text-blue-600 hover:text-blue-700 text-xs font-semibold hover:underline transition-colors flex items-center gap-1 group"
          >
            Show more
            <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
