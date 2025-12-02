"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useUserApi, usePostApi } from "@/lib/api"
import Link from "next/link"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { Post } from "@/components/post"
import { WhoToFollow } from "@/components/who-to-follow"
import { 
  Search, 
  Users, 
  UserPlus, 
  UserCheck, 
  Calendar, 
  MapPin, 
  Globe, 
  TrendingUp, 
  Hash,
  Compass,
  Sparkles
} from "lucide-react"

function SearchContent() {
  const searchParams = useSearchParams()
  const q = searchParams.get("q") || ""
  const { searchUsers } = useUserApi()
  const { getTrendingHashtags, getExplorePosts } = usePostApi()
  const [users, setUsers] = useState<any[]>([])
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingTrending, setLoadingTrending] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load trending topics and explore posts on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingTrending(true)
        const [hashtagsRes, postsRes] = await Promise.all([
          getTrendingHashtags(6),
          getExplorePosts(10)
        ])
        setTrendingTopics(hashtagsRes.hashtags || [])
        setExplorePosts(postsRes.posts || [])
      } catch (err) {
        console.error('Failed to load initial data:', err)
      } finally {
        setLoadingTrending(false)
      }
    }

    loadInitialData()
  }, [getTrendingHashtags, getExplorePosts])

  // Search users when query changes
  useEffect(() => {
    if (!q.trim()) {
      setUsers([])
      return
    }
    
    setLoading(true)
    setError(null)
    
    searchUsers(q)
      .then(res => setUsers(res.users || []))
      .catch(err => setError(err.message || "Failed to search users"))
      .finally(() => setLoading(false))
  }, [q, searchUsers])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) return "Today"
    if (diffDays === 2) return "Yesterday"
    if (diffDays < 7) return `${diffDays - 1} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
      <Header />

      <div className="flex-1">
        {/* Search Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 px-3 py-3 sm:px-4 sm:py-4">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
              <Compass className="w-5 h-5 mr-2 text-blue-500" />
              Search & Discover
            </h1>
            
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search for users, topics, or posts..."
                defaultValue={q}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.trim()) {
                    const url = new URL(window.location.href)
                    url.searchParams.set('q', value)
                    window.history.pushState({}, '', url.toString())
                  } else {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('q')
                    window.history.pushState({}, '', url.toString())
                  }
                }}
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm sm:text-base"
              />
            </div>

            {/* Search Stats */}
            {!loading && q.trim() && (
              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{users.length} user{users.length !== 1 ? 's' : ''} found</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Search Results */}
            {q.trim() && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <Search className="w-5 h-5 mr-2 text-blue-500" />
                  Search Results
                </h2>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-500 dark:text-gray-400">Searching users...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-12">
                    <div className="text-red-500 mb-2">Search failed</div>
                    <p className="text-gray-500 dark:text-gray-400">{error}</p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No users found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try different keywords or check your spelling</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map(user => (
                      <Card key={user._id} className="hover:shadow-md transition-all duration-200 hover:scale-[1.01]">
                        <CardContent className="p-4 sm:p-6">
                          <Link href={`/profile/${user._id}`} className="block">
                            <div className="flex items-start space-x-4">
                              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
                                <AvatarImage src={user.profileImageUrl} alt={user.username} />
                                <AvatarFallback className="text-sm sm:text-base font-semibold">
                                  {user.firstName?.[0] || user.username?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg group-hover:text-blue-600 transition-colors">
                                    {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                                  </div>
                                  {user.role === 'admin' && (
                                    <Badge variant="default" className="text-xs">Admin</Badge>
                                  )}
                                </div>
                                
                                <div className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-2">
                                  @{user.username}
                                </div>
                                
                                {user.bio && (
                                  <div className="text-gray-600 dark:text-gray-300 text-sm sm:text-base mb-3 line-clamp-2">
                                    {user.bio}
                                  </div>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                  {user.location && (
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span>{user.location}</span>
                                    </div>
                                  )}
                                  
                                  {user.website && (
                                    <div className="flex items-center space-x-1">
                                      <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span className="truncate max-w-32">{user.website}</span>
                                    </div>
                                  )}
                                  
                                  {user.createdAt && (
                                    <div className="flex items-center space-x-1">
                                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                                      <span>Joined {formatDate(user.createdAt)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-shrink-0">
                                <Button variant="outline" size="sm" className="hidden sm:flex">
                                  <UserPlus className="w-4 h-4 mr-1" />
                                  View Profile
                                </Button>
                                <Button variant="outline" size="sm" className="sm:hidden">
                                  <UserCheck className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Trending Topics */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                Trending Topics
              </h2>
              {loadingTrending ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Loading trending topics...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {trendingTopics.map((trend, index) => (
                    <div
                      key={trend.topic || index}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center mb-2">
                        <Hash className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                          #{trend.topic || trend._id}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{trend.postCount} posts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Who to Follow */}
            <div className="mb-8">
              <WhoToFollow variant="inline" maxSuggestions={3} />
            </div>

            {/* Discover Posts */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Sparkles className="w-5 h-5 mr-2 text-purple-500" />
                Discover Posts
              </h2>
              {loadingTrending ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Loading posts...</p>
                </div>
              ) : explorePosts.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No posts to show.
                </div>
              ) : (
                <div className="space-y-4">
                  {explorePosts.map((post: any) => (
                    <Post key={post._id} post={post} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />
      <Suspense fallback={
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      }>
        <SearchContent />
      </Suspense>
    </div>
  )
} 