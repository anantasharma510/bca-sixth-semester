'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Hash } from 'lucide-react'
import Link from 'next/link'
import { usePostApi } from '@/lib/api'
import { useAuth } from '@/hooks/use-auth'

export function TrendingTopics() {
  const { getTrendingHashtags } = usePostApi()
  const { user } = useAuth()
  const currentUserId = user?.id
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrendingTopics = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Check if user is authenticated before making API calls
        if (!currentUserId) {
          console.log('User not authenticated, skipping trending topics fetch')
          setTopics([])
          return
        }
        
        const res = await getTrendingHashtags(8)
        setTopics(res.hashtags || [])
      } catch (err: any) {
        console.error('Error fetching trending topics:', err)
        
        // Handle authentication errors gracefully
        if (err.message?.includes('No Clerk token found') || err.message?.includes('authentication')) {
          console.log('Authentication required for trending topics')
          setTopics([])
        } else {
          // For other errors, show empty state
          setTopics([])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingTopics()
  }, [getTrendingHashtags, currentUserId])

  const formatPostCount = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-bold text-xl text-gray-900 dark:text-white">Trending now</h2>
      </div>
      {loading ? (
        <div className="p-4">Loading...</div>
      ) : topics.length === 0 ? (
        <div className="p-4 text-center">
          <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-gray-400" />
          </div>
          {!currentUserId ? (
            <>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                Sign in to see trending topics
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                Discover what's popular when you're signed in
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                No trending topics available
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs">
                Check back later for popular hashtags
              </p>
            </>
          )}
        </div>
      ) : (
        topics.map((trend, index) => (
          <div
            key={trend.topic || trend._id || index}
            className="p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
          >
            <p className="text-xs text-gray-500 dark:text-gray-400">Trending</p>
            <p className="font-bold text-gray-900 dark:text-white">#{trend.topic || trend._id}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{formatPostCount(trend.postCount)} posts</p>
          </div>
        ))
      )}
      <div className="p-4">
        <a href="/explore" className="text-blue-500 hover:underline">
          Show more
        </a>
      </div>
    </div>
  )
}
