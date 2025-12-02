"use client"

import { useState, useEffect } from "react"
import { User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FollowButton } from "@/components/follow-button"
import { useFollowApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface FollowersListProps {
  userId: string
  onClose: () => void
}

interface Follower {
  _id: string
  username: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
  bio?: string
}

export function FollowersList({ userId, onClose }: FollowersListProps) {
  const [followers, setFollowers] = useState<Follower[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { getFollowers } = useFollowApi()

  const fetchFollowers = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const response = await getFollowers(userId, pageNum, 20)
      
      if (append) {
        setFollowers(prev => [...prev, ...response.followers])
      } else {
        setFollowers(response.followers)
      }
      
      setHasMore(response.pagination.hasNextPage)
    } catch (error) {
      // Removed error toast - not critical for normal users
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchFollowers(1, false)
  }, [userId])

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchFollowers(nextPage, true)
    }
  }

  const handleFollowChange = (followerId: string, isFollowing: boolean) => {
    // Remove from followers list if unfollowed
    if (!isFollowing) {
      setFollowers(prev => prev.filter(f => f._id !== followerId))
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading followers...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full mx-2 xs:mx-4 max-h-[80vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-3 xs:p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-base xs:text-lg font-semibold text-gray-900 dark:text-white">Followers</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-lg">×</Button>
        </div>

        {/* Followers List */}
        <div className="flex-1 overflow-y-auto">
          {followers.length > 0 ? (
            <div>
              {followers.map((follower) => {
                // Skip rendering if follower is null
                if (!follower || !follower._id) {
                  return null;
                }
                
                return (
                  <div key={follower._id} className="px-3 xs:px-4 py-2 xs:py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
                    <div className="flex items-center gap-2 xs:gap-3 justify-between">
                      <Link href={`/profile/${follower._id}`} className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {follower.profileImageUrl ? (
                            <img
                              src={follower.profileImageUrl}
                              alt={follower.username}
                              className="w-8 h-8 xs:w-10 xs:h-10 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                            />
                          ) : (
                            <div className="w-8 h-8 xs:w-10 xs:h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                              <User className="w-4 h-4 xs:w-5 xs:h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs xs:text-sm font-medium text-gray-900 dark:text-white truncate">
                            {follower.firstName && follower.lastName 
                              ? `${follower.firstName} ${follower.lastName}`
                              : follower.username
                            }
                          </p>
                          <p className="text-[11px] xs:text-xs text-gray-500 dark:text-gray-400 truncate">
                            @{follower.username}
                          </p>
                          {follower.bio && (
                            <p className="text-[11px] xs:text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5 xs:mt-1">
                              {follower.bio}
                            </p>
                          )}
                        </div>
                      </Link>
                      <div className="flex-shrink-0 ml-2 xs:ml-3">
                        <FollowButton
                          userId={follower._id}
                          onFollowChange={(isFollowing) => handleFollowChange(follower._id, isFollowing)}
                          size="sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {hasMore && (
                <div className="p-3 xs:p-4 text-center">
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    size="sm"
                    className="w-full text-xs xs:text-sm"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 xs:p-8 text-center text-gray-500 dark:text-gray-400">
              <User className="w-8 h-8 xs:w-12 xs:h-12 mx-auto mb-3 xs:mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-xs xs:text-sm">No followers yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 