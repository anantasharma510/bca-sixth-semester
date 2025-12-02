"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { FollowButton } from "@/components/follow-button"
import { BlockButton } from "@/components/block-button"
import { MessageButton } from "@/components/message-button"
import { Post } from "@/components/post"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { useFollowApi, useBlockApi, useProtectedApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { FollowersList } from "@/components/followers-list"
import { FollowingList } from "@/components/following-list"
import { BlockedUsersList } from "@/components/blocked-users-list"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, MapPin, Link as LinkIcon, Users, Shield } from "lucide-react"
import { useBlockStatusListener } from "@/hooks/use-block-status-listener"
import { useAuth } from "@/hooks/use-auth"

interface User {
  _id: string
  username: string
  firstName?: string
  lastName?: string
  email: string
  profileImageUrl?: string
  coverImageUrl?: string
  bio?: string
  location?: string
  website?: string
  createdAt: string
  followerCount: number
  followingCount: number
  postCount: number
}

interface Post {
  _id: string
  author: {
    _id: string
    username: string
    firstName?: string
    lastName?: string
    profileImageUrl?: string
  }
  content: string
  media?: Array<{
    type: 'image' | 'video'
    url: string
    thumbnailUrl?: string
  }>
  likeCount: number
  commentCount: number
  repostCount: number
  createdAt: string
  isLiked?: boolean
}

export default function UserProfilePage() {
  const params = useParams()
  const userId = params.id as string
  const { user: authUser } = useAuth()
  const currentUserId = authUser?._id ?? authUser?.id ?? authUser?.userId ?? null
  const { getFollowCounts } = useFollowApi()
  const { getBlockCounts, checkMutualBlockStatus } = useBlockApi()
  const { callProtectedApi } = useProtectedApi()
  
  const [user, setUser] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 })
  const [blockCounts, setBlockCounts] = useState({ blockedUsers: 0, blockedBy: 0 })
  const [showFollowers, setShowFollowers] = useState(false)
  const [showFollowing, setShowFollowing] = useState(false)
  const [showBlockedUsers, setShowBlockedUsers] = useState(false)
  const [blockStatus, setBlockStatus] = useState({ userBlockedOther: false, otherBlockedUser: false, isMutualBlock: false })

  // Handle block status changes
  const handleBlockStatusChange = (event: any) => {
    if (event.type === 'blockedByUser' || event.type === 'userBlocked') {
      // User was blocked, redirect to home
      window.location.href = '/';
    } else if (event.type === 'unblockedByUser' || event.type === 'userUnblocked') {
      // User was unblocked, refresh the page
      fetchUserProfile();
    }
  };

  // Listen for block status changes
  useBlockStatusListener(userId, handleBlockStatusChange);

  useEffect(() => {
    if (userId) {
      fetchUserProfile()
      setIsOwnProfile(currentUserId === userId)
    }
  }, [userId, currentUserId])

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true)

      // Check block status first
      if (currentUserId && currentUserId !== userId) {
        try {
          const blockStatusResponse = await checkMutualBlockStatus(userId)
          setBlockStatus(blockStatusResponse)
          
          // If there's a mutual block, don't fetch user data
          if (blockStatusResponse.isMutualBlock) {
            setUser(null)
            setIsLoading(false)
            return
          }
        } catch (error) {
          console.error('Error checking block status:', error)
        }
      }
      
      // Fetch user data
      const userData = await callProtectedApi(`/api/protected/users/${userId}`)
      setUser(userData)
      
      // Set follow counts from user data
      setFollowCounts({
        followers: userData.followerCount || 0,
        following: userData.followingCount || 0
      })
      
      // Fetch user's posts
      const postsResponse = await callProtectedApi(`/api/posts/user/${userId}`)
      setPosts(postsResponse.posts || [])
      
      // Fetch block counts (only for own profile)
      if (currentUserId === userId) {
        try {
          const blockCountsResponse = await getBlockCounts()
          setBlockCounts({
            blockedUsers: blockCountsResponse.blockedUsersCount || 0,
            blockedBy: blockCountsResponse.blockedByCount || 0
          })
        } catch (error) {
          console.error('Error fetching block counts:', error)
          // Set default values if API call fails
          setBlockCounts({
            blockedUsers: 0,
            blockedBy: 0
          })
        }
      }
      
    } catch (error) {
      console.error('Error fetching user profile:', error)
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleFollowChange = (isFollowing: boolean) => {
    if (user) {
      setFollowCounts(prev => ({
        ...prev,
        followers: prev.followers + (isFollowing ? 1 : -1)
      }))
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    })
  }

  if (isLoading) {
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
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">User Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400">The user you're looking for doesn't exist.</p>
          </div>
        </div>
      </div>
    )
  }

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
            {/* Cover Photo */}
            {user?.coverImageUrl && (
              <div className="w-full h-48 sm:h-64 bg-gray-200 dark:bg-gray-800 relative">
                <img
                  src={user.coverImageUrl}
                  alt="Cover"
                  className="w-full h-full object-cover object-center"
                  style={{ maxHeight: '16rem' }}
                />
              </div>
            )}

            {/* Profile Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-4 sm:space-y-0">
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <img
                      src={user.profileImageUrl || "/placeholder-user.jpg"}
                      alt="Profile"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover mx-auto sm:mx-0"
                    />
                    <div className="text-center sm:text-left">
                      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                        {displayName}
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
                      {user.bio && (
                        <p className="text-gray-700 dark:text-gray-300 mt-2 text-sm sm:text-base">{user.bio}</p>
                      )}
                    </div>
                  </div>
                  
                  {!isOwnProfile && !blockStatus.isMutualBlock && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <FollowButton
                        userId={user._id}
                        onFollowChange={handleFollowChange}
                        size="sm"
                        className="w-full sm:w-auto min-w-[90px] xs:min-w-[110px] sm:min-w-[120px]"
                      />
                      <MessageButton
                        userId={user._id}
                        size="sm"
                        className="w-full sm:w-auto min-w-[90px] xs:min-w-[110px] sm:min-w-[120px]"
                      />
                      <BlockButton
                        userId={user._id}
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto min-w-[90px] xs:min-w-[110px] sm:min-w-[120px]"
                      />
                    </div>
                  )}
                  
                  {!isOwnProfile && blockStatus.isMutualBlock && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                      <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {blockStatus.userBlockedOther ? "You blocked this user" : "This user blocked you"}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="space-y-2 mb-4">
                  {user.location && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{user.location}</span>
                    </div>
                  )}
                  {user.website && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                      <LinkIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      <a 
                        href={user.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline truncate"
                      >
                        {user.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>Joined {formatDate(user.createdAt)}</span>
                  </div>
                </div>

                {/* Follow Stats */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm sm:text-base">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {posts.length || 0}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">Posts</span>
                  </div>
                  
                  <button
                    onClick={() => setShowFollowers(true)}
                    className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {followCounts.followers || 0}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">Followers</span>
                  </button>
                  
                  <button
                    onClick={() => setShowFollowing(true)}
                    className="flex items-center space-x-1 hover:text-blue-500 cursor-pointer"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {followCounts.following || 0}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">Following</span>
                  </button>
                  
                  {isOwnProfile && (blockCounts.blockedUsers || 0) > 0 && (
                    <button
                      onClick={() => setShowBlockedUsers(true)}
                      className="flex items-center space-x-1 hover:text-red-500 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {blockCounts.blockedUsers || 0}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">Blocked</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Posts */}
            <div className="bg-white dark:bg-gray-800">
              {posts.length === 0 ? (
                <div className="p-4 sm:p-6 text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                    {isOwnProfile ? "You haven't posted anything yet." : "This user hasn't posted anything yet."}
                  </p>
                </div>
              ) : (
                <div className="pb-20 lg:pb-4">
                  {posts.map((post) => (
                    <Post
                      key={post._id}
                      post={post}
                      onPostUpdate={fetchUserProfile}
                      onPostDelete={fetchUserProfile}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Followers Modal */}
      <Dialog open={showFollowers} onOpenChange={setShowFollowers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Followers</DialogTitle>
          </DialogHeader>
          <FollowersList userId={user._id} onClose={() => setShowFollowers(false)} />
        </DialogContent>
      </Dialog>

      {/* Following Modal */}
      <Dialog open={showFollowing} onOpenChange={setShowFollowing}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Following</DialogTitle>
          </DialogHeader>
          <FollowingList userId={user._id} onClose={() => setShowFollowing(false)} />
        </DialogContent>
      </Dialog>

      {/* Blocked Users Modal */}
      <Dialog open={showBlockedUsers} onOpenChange={setShowBlockedUsers}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Blocked Users</DialogTitle>
          </DialogHeader>
          <BlockedUsersList />
        </DialogContent>
      </Dialog>
    </div>
  )
} 