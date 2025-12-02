'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Users, MessageSquare, Heart, Calendar, Activity, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react"
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

export default function AdminAnalytics() {
  const { getAnalytics } = useAdminApi()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true)
      setError(null)
      try {
        const json = await getAnalytics()
        setData(json)
      } catch (err: any) {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Platform performance and insights</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
              </CardHeader>
              <CardContent>
                <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Platform performance and insights</p>
        </div>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <Activity className="h-5 w-5" />
              <span className="font-medium">Error loading analytics</span>
            </div>
            <p className="text-red-500 dark:text-red-400 mt-2">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Platform performance and insights</p>
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

      {data && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { 
                title: "Total Users", 
                value: data.userCount.toLocaleString(), 
                icon: Users, 
                color: "text-blue-600",
                bgColor: "bg-blue-50 dark:bg-blue-900/20",
                trend: "+12%"
              },
              { 
                title: "Total Posts", 
                value: data.postCount.toLocaleString(), 
                icon: MessageSquare, 
                color: "text-green-600",
                bgColor: "bg-green-50 dark:bg-green-900/20",
                trend: "+8%"
              },
              { 
                title: "Total Comments", 
                value: data.commentCount.toLocaleString(), 
                icon: Heart, 
                color: "text-red-600",
                bgColor: "bg-red-50 dark:bg-red-900/20",
                trend: "+15%"
              },
              { 
                title: "Trending Topics", 
                value: data.trendingHashtags.length, 
                icon: TrendingUp, 
                color: "text-purple-600",
                bgColor: "bg-purple-50 dark:bg-purple-900/20",
                trend: "+5%"
              },
            ].map((metric, index) => (
              <Card key={index} className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`h-4 w-4 ${metric.color}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</div>
                  <div className="flex items-center space-x-1 text-sm">
                    <ArrowUpRight className="h-3 w-3 text-green-600" />
                    <span className="text-green-600 font-medium">{metric.trend}</span>
                    <span className="text-gray-500">from last month</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Trending Hashtags */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <span>Trending Hashtags</span>
                </CardTitle>
                <p className="text-sm text-gray-500">Last 7 days</p>
              </CardHeader>
              <CardContent>
                {data.trendingHashtags.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No trending hashtags yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.trendingHashtags.slice(0, 8).map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">#{i + 1}</span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">#{h.topic}</span>
                        </div>
                        <span className="text-sm text-gray-500 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
                          {h.postCount} posts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Signups */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span>Recent Signups</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentSignups.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recent signups yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.recentSignups.slice(0, 8).map((user, index) => (
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 lg:col-span-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span>Quick Stats</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg. Posts/Day</span>
                    <span className="text-lg font-bold text-blue-600">{(data.postCount / 30).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg. Comments/Post</span>
                    <span className="text-lg font-bold text-green-600">{(data.commentCount / data.postCount).toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Engagement Rate</span>
                    <span className="text-lg font-bold text-purple-600">{((data.commentCount / data.userCount) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>User Growth</span>
                </CardTitle>
                <p className="text-sm text-gray-500">Monthly user registration trends</p>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-dashed border-blue-200 dark:border-gray-600">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-blue-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Chart coming soon</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">User growth visualization</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-green-600" />
                  <span>Engagement Metrics</span>
                </CardTitle>
                <p className="text-sm text-gray-500">Posts, comments, and likes over time</p>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 border-dashed border-green-200 dark:border-gray-600">
                  <div className="text-center">
                    <Activity className="h-12 w-12 text-green-300 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Chart coming soon</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">Engagement analytics</p>
                  </div>
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
      )}
    </div>
  )
}
