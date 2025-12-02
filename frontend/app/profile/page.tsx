"use client"

import { useState, useEffect } from "react"
import { Calendar, MapPin, LinkIcon, MoreHorizontal, MessageCircle, UserPlus, Edit, Share } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Post } from "@/components/post"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { FollowButton } from "@/components/follow-button"
import { FollowersList } from "@/components/followers-list"
import { FollowingList } from "@/components/following-list"
import { useProtectedApi } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [userPosts, setUserPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const { callProtectedApi } = useProtectedApi()
  const { user: authUser } = useAuth()

  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      const response = await callProtectedApi('/api/protected')
      setUser(response.user)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch user posts
  const fetchUserPosts = async (pageNum: number = 1, append: boolean = false) => {
    try {
      setPostsLoading(true)
      const response = await callProtectedApi(`/api/posts/user/${user?._id}?page=${pageNum}&limit=10`)
      
      if (append) {
        setUserPosts(prev => [...prev, ...response.posts])
      } else {
        setUserPosts(response.posts)
      }
      
      setHasMore(response.pagination.hasNextPage)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive"
      })
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserProfile()
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserPosts(1, false)
    }
  }, [user])

  const loadMore = () => {
    if (!postsLoading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchUserPosts(nextPage, true)
    }
  }

  const handlePostDelete = () => {
    // Refresh posts when a post is deleted
    fetchUserPosts(1, false)
  }

  const handlePostUpdate = () => {
    // Refresh posts when a post is updated
    fetchUserPosts(1, false)
  }

  const handleFollowChange = (isFollowing: boolean) => {
    // Update the user's follower count when follow status changes
    if (user) {
      setUser((prev: any) => ({
        ...prev,
        followerCount: isFollowing ? prev.followerCount + 1 : prev.followerCount - 1
      }))
    }
  }

  const handleShare = async () => {
    try {
      const profileUrl = `${window.location.origin}/profile/${user._id}`
      await navigator.clipboard.writeText(profileUrl)
      toast({
        title: "Success",
        description: "Profile link copied to clipboard!",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy profile link",
        variant: "destructive"
      })
    }
  }

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex bg-[#f7f6f6] dark:bg-gray-900">
        <Sidebar />
        <MobileNavigation />
        <div className="flex items-center justify-center flex-1 lg:ml-64">
          <div className="w-8 h-8 border-b-2 border-blue-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex bg-[#f7f6f6] dark:bg-gray-900">
        <Sidebar />
        <MobileNavigation />
        <div className="flex items-center justify-center flex-1 lg:ml-64">
          <div className="text-center">
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Profile Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400">Unable to load profile information.</p>
          </div>
        </div>
      </div>
    )
  }

  const currentUserId = authUser?._id ?? authUser?.id ?? authUser?.userId
  const isOwnProfile = currentUserId === user._id
  const displayName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user.username

  return (
    <div className="min-h-screen flex bg-[#f7f6f6] dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">
        <Header />

        <div className="flex flex-1">
          <div className="flex-1 border-r border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="sticky top-0 z-10 p-4 bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h1>
                  <p className="text-gray-600 dark:text-gray-400">{user.postCount} posts</p>
                </div>
                {isOwnProfile && (
                  <Link href="/profile/settings">
                    <Button variant="ghost" size="sm">
                      <Edit className="w-5 h-5" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Profile Header */}
            <div className="relative">
              {/* Cover Photo */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-r from-blue-400 to-purple-500">
                {user.coverImageUrl && (
                  <img
                    src={user.coverImageUrl}
                    alt="Cover"
                    className="object-cover w-full h-full"
                  />
                )}
              </div>

              {/* Profile Info */}
              <div className="px-4 pb-4">
                {/* Avatar */}
                <div className="relative mb-4 -mt-16">
                  <img
                    src={user.profileImageUrl || "/placeholder-user.jpg"}
                    alt={displayName}
                    className="object-cover w-32 h-32 border-4 border-white rounded-full dark:border-gray-900"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end mb-4 space-x-2">
                  {!isOwnProfile && (
                    <>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                      <FollowButton 
                        userId={user._id}
                        onFollowChange={handleFollowChange}
                        size="sm"
                      />
                    </>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </div>

                {/* User Info */}
                <div className="space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                    <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                  </div>

                  {user.bio && (
                    <p className="text-gray-900 dark:text-white">{user.bio}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-400">
                    {user.location && (
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{user.location}</span>
                      </div>
                    )}
                    {user.website && (
                      <div className="flex items-center">
                        <LinkIcon className="w-4 h-4 mr-1" />
                        <a href={user.website} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                          {user.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>Joined {formatJoinDate(user.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-6 text-gray-900 dark:text-white">
                    <button
                      onClick={() => setShowFollowing(true)}
                      className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <span className="font-bold">{user.followingCount || 0}</span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">Following</span>
                    </button>
                    <button
                      onClick={() => setShowFollowers(true)}
                      className="transition-colors hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      <span className="font-bold">{user.followerCount || 0}</span>
                      <span className="ml-1 text-gray-600 dark:text-gray-400">Followers</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800">
              <div className="flex">
                <button className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
                  Posts
                </button>
              </div>
            </div>

            {/* User Posts */}
            <div className="pb-20 lg:pb-4">
              {postsLoading && userPosts.length === 0 ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-8 h-8 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                </div>
              ) : userPosts.length > 0 ? (
                <div>
                  {userPosts.map((post) => (
                    <Post
                      key={post._id}
                      post={post}
                      onPostDelete={handlePostDelete}
                      onPostUpdate={handlePostUpdate}
                    />
                  ))}
                  {hasMore && (
                    <div className="p-4 text-center">
                      <button
                        onClick={loadMore}
                        disabled={postsLoading}
                        className="px-4 py-2 text-white bg-blue-500 rounded-full hover:bg-blue-600 disabled:opacity-50"
                      >
                        {postsLoading ? "Loading..." : "Load More"}
                      </button>
                    </div>
                  )}
                  {!hasMore && userPosts.length > 0 && (
                    <div className="p-4 text-center text-gray-500">
                      No more posts to load
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No posts yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Followers List Modal */}
      {showFollowers && (
        <FollowersList
          userId={user._id}
          onClose={() => setShowFollowers(false)}
        />
      )}

      {/* Following List Modal */}
      {showFollowing && (
        <FollowingList
          userId={user._id}
          onClose={() => setShowFollowing(false)}
        />
      )}
    </div>
  )
}
