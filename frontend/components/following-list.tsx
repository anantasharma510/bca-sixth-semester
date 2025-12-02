"use client"

import { useState, useEffect } from "react"
import { User, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FollowButton } from "@/components/follow-button"
import { useFollowApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

interface FollowingListProps {
  userId: string
  onClose: () => void
}

interface Following {
  _id: string
  username: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
  bio?: string
}

export function FollowingList({ userId, onClose }: FollowingListProps) {
  const [following, setFollowing] = useState<Following[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { getFollowing } = useFollowApi()

  const fetchFollowing = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const response = await getFollowing(userId, pageNum, 20)
      
      if (append) {
        setFollowing(prev => [...prev, ...response.following])
      } else {
        setFollowing(response.following)
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
    fetchFollowing(1, false)
  }, [userId])

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchFollowing(nextPage, true)
    }
  }

  const handleFollowChange = (followingId: string, isFollowing: boolean) => {
    // Remove from following list if unfollowed
    if (!isFollowing) {
      setFollowing(prev => prev.filter(f => f._id !== followingId))
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading following...</span>
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
          <h2 className="text-base xs:text-lg font-semibold text-gray-900 dark:text-white">Following</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-lg">×</Button>
        </div>

        {/* Following List */}
        <div className="flex-1 overflow-y-auto">
          {following.length > 0 ? (
            <div>
              {following.map((followed) => {
                // Skip rendering if followed is null
                if (!followed || !followed._id) {
                  return null;
                }
                
                return (
                  <div key={followed._id} className="px-3 xs:px-4 py-2 xs:py-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors">
                    <div className="flex items-center gap-2 xs:gap-3 justify-between">
                      <Link href={`/profile/${followed._id}`} className="flex items-center gap-2 xs:gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0">
                          {followed.profileImageUrl ? (
                            <img
                              src={followed.profileImageUrl}
                              alt={followed.username}
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
                            {followed.firstName && followed.lastName 
                              ? `${followed.firstName} ${followed.lastName}`
                              : followed.username
                            }
                          </p>
                          <p className="text-[11px] xs:text-xs text-gray-500 dark:text-gray-400 truncate">
                            @{followed.username}
                          </p>
                          {followed.bio && (
                            <p className="text-[11px] xs:text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5 xs:mt-1">
                              {followed.bio}
                            </p>
                          )}
                        </div>
                      </Link>
                      <div className="flex-shrink-0 ml-2 xs:ml-3">
                        <FollowButton
                          userId={followed._id}
                          onFollowChange={(isFollowing) => handleFollowChange(followed._id, isFollowing)}
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
              <p className="text-xs xs:text-sm">Not following anyone yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 