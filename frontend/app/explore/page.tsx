"use client"

import { useEffect, useState } from "react"
import { Search, TrendingUp, Hash } from "lucide-react"
import { Post } from "@/components/post"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { usePostApi } from "@/lib/api"

export default function ExplorePage() {
  const { getTrendingHashtags, getExplorePosts } = usePostApi()
  const [trendingTopics, setTrendingTopics] = useState<any[]>([])
  const [explorePosts, setExplorePosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      getTrendingHashtags(9),
      getExplorePosts(20)
    ])
      .then(([hashtagsRes, postsRes]) => {
        setTrendingTopics(hashtagsRes.hashtags || [])
        setExplorePosts(postsRes.posts || [])
      })
      .catch((err) => {
        setError(err.message || "Failed to load explore data")
      })
      .finally(() => setLoading(false))
  }, [getTrendingHashtags, getExplorePosts])

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        <div className="flex-1">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 px-3 py-3 sm:px-4 sm:py-4">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">Explore</h1>

            {/* Search Bar - Commented out for now */}
            {/* <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Search for topics, people, or posts..."
                className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 text-sm sm:text-base"
              />
            </div> */}
          </div>

          {/* Trending Section */}
          <div className="px-3 py-4 sm:px-4 sm:py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Trending Now
            </h2>
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">Loading trending topics...</p>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-3 sm:py-4 text-sm sm:text-base">{error}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                {trendingTopics.map((trend, index) => (
                  <div
                    key={trend.topic || index}
                    className="p-2.5 sm:p-3 lg:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center mb-1.5 sm:mb-2">
                      <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 mr-1" />
                      <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm lg:text-base truncate">#{trend.topic || trend._id}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{trend.postCount} posts</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Explore Posts */}
          <div>
            <div className="px-3 py-3 sm:px-4 sm:py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Discover</h2>
              <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm lg:text-base mt-1">Posts you might be interested in</p>
            </div>
            {loading ? (
              <div className="text-center py-6 sm:py-8">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-500 dark:text-gray-400 text-sm sm:text-base">Loading posts...</p>
              </div>
            ) : error ? (
              <div className="text-red-500 text-center py-3 sm:py-4 text-sm sm:text-base">{error}</div>
            ) : (
              explorePosts.length === 0 ? (
                <div className="px-3 py-6 sm:px-4 sm:py-8 text-center text-gray-500 dark:text-gray-400 text-sm sm:text-base">No posts to show.</div>
              ) : (
                explorePosts.map((post: any) => (
                  <Post key={post._id} post={post} />
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
