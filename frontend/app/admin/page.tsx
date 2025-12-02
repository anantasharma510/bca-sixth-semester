'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, MessageSquare, TrendingUp, Activity, Heart } from "lucide-react"
import { useEffect, useState } from "react"
import { useAdminApi } from "@/lib/api"
import { saveAs } from 'file-saver'

interface AnalyticsData {
  userCount: number
  postCount: number
  commentCount: number
  trendingHashtags: { topic: string; postCount: number }[]
  recentSignups: { _id: string; username: string; createdAt: string; profileImageUrl?: string }[]
}

export default function AdminDashboard() {
  const { getAnalytics } = useAdminApi()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  console.log('🔍 AdminDashboard: Component rendered')

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      setError(null)
      try {
        console.log('🔍 AdminPage: Fetching analytics...')
        const json = await getAnalytics()
        console.log('🔍 AdminPage: Analytics data received:', json)
        setData(json)
      } catch (err: any) {
        console.error('🔍 AdminPage: Analytics fetch error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [getAnalytics])

  // Add a function to export analytics data as CSV
  function exportAnalyticsToCSV(data: AnalyticsData) {
    const rows = [
      ['Metric', 'Value'],
      ['Total Users', data.userCount],
      ['Total Posts', data.postCount],
      ['Total Comments', data.commentCount],
      ['Trending Hashtags', data.trendingHashtags.length],
    ];
    const csvContent = rows.map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'analytics.csv');
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome to the AIRWIG admin panel</p>
        </div>
        {data && (
          <button
            onClick={() => exportAnalyticsToCSV(data)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Export Data
          </button>
        )}
      </div>
      

      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="text-lg">Loading dashboard...</div>
        </div>
      ) : error ? (
        <div className="space-y-6">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Analytics Error</h3>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-blue-800 dark:text-blue-200 font-medium">Admin Panel Access</h3>
            <p className="text-blue-600 dark:text-blue-300 text-sm mt-1">
              You have successfully accessed the admin panel! The analytics data failed to load, but you can still access other admin features.
            </p>
            <div className="mt-4 space-y-2">
              <a href="/admin/users" className="block text-blue-600 dark:text-blue-400 hover:underline">Manage Users</a>
              <a href="/admin/posts" className="block text-blue-600 dark:text-blue-400 hover:underline">Manage Posts</a>
              <a href="/admin/settings" className="block text-blue-600 dark:text-blue-400 hover:underline">Admin Settings</a>
            </div>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Total Users", value: data.userCount, icon: Users, color: "text-blue-600" },
              { title: "Total Posts", value: data.postCount, icon: MessageSquare, color: "text-green-600" },
              { title: "Total Comments", value: data.commentCount, icon: Heart, color: "text-purple-600" },
              { title: "Trending Hashtags", value: data.trendingHashtags.length, icon: TrendingUp, color: "text-orange-600" },
            ].map((stat, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.title}</CardTitle>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Recent Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.recentSignups.length === 0 ? (
                    <div className="text-gray-500">No recent signups</div>
                  ) : (
                    data.recentSignups.slice(0, 4).map((user, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        {user.profileImageUrl ? (
                          <img
                            src={user.profileImageUrl}
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white font-medium">{user.username.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(user.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Trending Hashtags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.trendingHashtags.length === 0 ? (
                    <div className="text-gray-500">No trending hashtags</div>
                  ) : (
                    data.trendingHashtags.slice(0, 4).map((h, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="font-medium">#{h.topic}</span>
                        <span className="text-gray-500">{h.postCount} posts</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Visualization: Simple Bar Chart */}
          <div className="my-8">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Platform Growth</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Simple SVG Bar Chart as a placeholder for user, post, comment counts */}
                <svg width="100%" height="120" viewBox="0 0 300 120">
                  <rect x="30" y={120 - data.userCount / 10} width="40" height={data.userCount / 10} fill="#2563eb" />
                  <rect x="100" y={120 - data.postCount / 10} width="40" height={data.postCount / 10} fill="#22c55e" />
                  <rect x="170" y={120 - data.commentCount / 10} width="40" height={data.commentCount / 10} fill="#a21caf" />
                  <text x="30" y="115" fontSize="12" fill="#2563eb">Users</text>
                  <text x="100" y="115" fontSize="12" fill="#22c55e">Posts</text>
                  <text x="170" y="115" fontSize="12" fill="#a21caf">Comments</text>
                </svg>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}