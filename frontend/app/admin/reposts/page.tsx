"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertCircle,
  Search,
  Filter,
  Trash2,
  Calendar,
  Repeat2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  User,
  CheckSquare,
  Square,
} from "lucide-react"
import { useAdminApi } from "@/lib/api"
import { toast } from "@/components/ui/use-toast"

interface Repost {
  _id: string
  comment?: string
  createdAt: string
  user: {
    _id: string
    username: string
    firstName?: string
    lastName?: string
    profileImageUrl?: string
  }
  originalPost: {
    _id: string
    content: string
    author: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminReposts() {
  const { getAdminReposts, deleteAdminRepost } = useAdminApi()
  const [reposts, setReposts] = useState<Repost[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  async function fetchReposts() {
    setLoading(true)
    setError(null)
    try {
      const json = await getAdminReposts(page, search)
      setReposts(json.reposts)
      setPagination(json.pagination)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReposts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search])

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this repost?")) return
    setDeleting(id)
    try {
      await deleteAdminRepost(id)
      toast({ title: "Repost deleted" })
      await fetchReposts()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  function handleSelect(id: string) {
    setSelected((sel) => (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]))
  }

  function handleSelectAll() {
    if (selected.length === reposts.length) {
      setSelected([])
    } else {
      setSelected(reposts.map((repost) => repost._id))
    }
  }

  async function handleBulkDelete() {
    if (selected.length === 0) return
    if (!window.confirm(`Delete ${selected.length} repost(s)?`)) return
    setDeleting("bulk")
    try {
      await deleteAdminRepost(selected)
      toast({ title: "Reposts deleted" })
      setSelected([])
      await fetchReposts()
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" })
    } finally {
      setDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    const hours = String(date.getHours()).padStart(2, "0")
    const minutes = String(date.getMinutes()).padStart(2, "0")

    return `${month}/${day}/${year} ${hours}:${minutes}`
  }

  const getInitials = (username: string, firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    return username.slice(0, 2).toUpperCase()
  }

  const truncateContent = (content: string, maxLength = 120) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + "..."
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Header Section */}
        <div className="text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Reposts Management
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
                View, search, and moderate all reposts across the platform
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs sm:text-sm">
                <Repeat2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                {pagination?.total || 0} Total Reposts
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Actions Section */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search reposts by comment..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value)
                      setPage(1)
                    }}
                    className="pl-10 h-11 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                </div>
                <Button variant="outline" className="h-11 px-4 sm:px-6 border-slate-200 dark:border-slate-700">
                  <Filter className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                </Button>
              </div>

              {/* Bulk Actions */}
              {reposts.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-8 px-2 text-slate-600 dark:text-slate-400"
                    >
                      {selected.length === reposts.length ? (
                        <CheckSquare className="w-4 h-4 mr-2" />
                      ) : (
                        <Square className="w-4 h-4 mr-2" />
                      )}
                      <span className="text-sm">
                        {selected.length === reposts.length ? "Deselect All" : "Select All"}
                      </span>
                    </Button>
                    {selected.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selected.length} selected
                      </Badge>
                    )}
                  </div>
                  {selected.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                      disabled={deleting === "bulk"}
                      className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {deleting === "bulk" ? "Deleting..." : `Delete Selected (${selected.length})`}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Section */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <Skeleton className="h-9 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-0 shadow-lg bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error Loading Reposts</h3>
                  <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {reposts.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-8 sm:p-12 text-center">
                  <div className="p-4 bg-slate-100 dark:bg-slate-700 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <Repeat2 className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No Reposts Found</h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {search ? "Try adjusting your search terms" : "No reposts have been created yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {reposts.map((repost) => (
                  <Card
                    key={repost._id}
                    className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 group"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Checkbox
                            checked={selected.includes(repost._id)}
                            onCheckedChange={() => handleSelect(repost._id)}
                            className="mt-1"
                          />
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-slate-200 dark:ring-slate-700">
                            <AvatarImage
                              src={repost.user?.profileImageUrl || "/placeholder.svg"}
                              alt={repost.user?.username}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-600 text-white font-semibold">
                              {getInitials(repost.user?.username, repost.user?.firstName, repost.user?.lastName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                {repost.user?.firstName && repost.user?.lastName
                                  ? `${repost.user.firstName} ${repost.user.lastName}`
                                  : repost.user?.username || "Unknown User"}
                              </h3>
                              <Badge variant="secondary" className="text-xs w-fit">
                                @{repost.user?.username || "unknown"}
                              </Badge>
                              <Badge variant="outline" className="text-xs w-fit">
                                <Repeat2 className="w-3 h-3 mr-1" />
                                Repost
                              </Badge>
                            </div>
                            <div className="flex items-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                              <Calendar className="w-3 h-3 mr-1" />
                              {isClient ? formatDate(repost.createdAt) : "Loading..."}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-4">
                        {/* Original Post */}
                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border-l-4 border-blue-500">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Original Post
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                            {repost.originalPost?.content ? truncateContent(repost.originalPost.content) : "[deleted]"}
                          </p>
                        </div>

                        {/* Repost Comment */}
                        {repost.comment && (
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Repost Comment
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                              {repost.comment}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deleting === repost._id}
                            onClick={() => handleDelete(repost._id)}
                            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {deleting === repost._id ? "Deleting..." : "Delete Repost"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Enhanced Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-slate-600 dark:text-slate-400 order-2 sm:order-1">
                      Showing page {pagination.page} of {pagination.totalPages}
                      <span className="hidden sm:inline"> ({pagination.total} total reposts)</span>
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="border-slate-200 dark:border-slate-700"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Previous</span>
                        <span className="sm:hidden">Prev</span>
                      </Button>

                      <div className="flex items-center gap-1">
                        {/* Show page numbers for larger screens */}
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            const pageNum = i + 1
                            return (
                              <Button
                                key={pageNum}
                                variant={page === pageNum ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            )
                          })}
                        </div>

                        {/* Show current page for mobile */}
                        <div className="sm:hidden px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded text-sm font-medium">
                          {page}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === pagination.totalPages}
                        onClick={() => setPage(page + 1)}
                        className="border-slate-200 dark:border-slate-700"
                      >
                        <span className="hidden sm:inline">Next</span>
                        <span className="sm:hidden">Next</span>
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
