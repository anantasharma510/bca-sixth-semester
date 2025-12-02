import { Bookmark, Search, Filter, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Post } from "@/components/post"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"

const bookmarkedPosts = [
  {
    id: 1,
    author: {
      name: "Tech Insider",
      username: "techinsider",
      avatar: "/placeholder.svg?height=48&width=48",
    },
    content:
      "10 Essential Tips for Remote Work Productivity: 1. Create a dedicated workspace 2. Set clear boundaries 3. Take regular breaks 4. Use productivity tools 5. Stay connected with your team... #RemoteWork #Productivity",
    timestamp: "2d",
    stats: { comments: 45, retweets: 123, likes: 289 },
    bookmarkedAt: "2 days ago",
  },
  {
    id: 2,
    author: {
      name: "Design Guru",
      username: "designguru",
      avatar: "/placeholder.svg?height=48&width=48",
    },
    content:
      "The psychology of color in UI design: How different colors affect user behavior and emotions. Blue builds trust, red creates urgency, green suggests growth. Choose wisely! #UIDesign #Psychology",
    image: "/placeholder.svg?height=400&width=600",
    timestamp: "3d",
    stats: { comments: 67, retweets: 234, likes: 456 },
    bookmarkedAt: "3 days ago",
  },
  {
    id: 3,
    author: {
      name: "Startup Mentor",
      username: "startupmentor",
      avatar: "/placeholder.svg?height=48&width=48",
    },
    content:
      "Key lessons from 10 years of startup investing: 1. Team matters more than idea 2. Market timing is crucial 3. Customer validation is everything 4. Execution beats perfection 5. Persistence pays off #Startup #Investing",
    timestamp: "1w",
    stats: { comments: 89, retweets: 345, likes: 678 },
    bookmarkedAt: "1 week ago",
  },
  {
    id: 4,
    author: {
      name: "AI Research",
      username: "airesearch",
      avatar: "/placeholder.svg?height=48&width=48",
    },
    content:
      "Breakthrough in natural language processing: New model achieves 95% accuracy in understanding context and nuance. This could revolutionize how we interact with AI systems. #AI #NLP #Research",
    image: "/placeholder.svg?height=400&width=600",
    timestamp: "1w",
    stats: { comments: 156, retweets: 567, likes: 1234 },
    bookmarkedAt: "1 week ago",
  },
]

export default function BookmarksPage() {
  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <div className="flex-1 flex">
          <div className="flex-1 border-r border-gray-200 dark:border-gray-800">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Bookmark className="w-6 h-6 text-blue-600" />
                  <div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white">Bookmarks</h1>
                    <p className="text-gray-600 dark:text-gray-400">Your saved posts</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
              </div>

              {/* Search and Filter */}
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search bookmarks..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-800">
              <div className="flex">
                <button className="flex-1 px-4 py-3 text-sm font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
                  All Bookmarks
                </button>
                <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Articles
                </button>
                <button className="flex-1 px-4 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Media
                </button>
              </div>
            </div>

            {/* Bookmarked Posts */}
            <div>
              {bookmarkedPosts.length > 0 ? (
                bookmarkedPosts.map((post) => (
                  <div key={post.id} className="relative">
                    <Post post={post} />
                    <div className="absolute top-4 right-4">
                      <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                        Saved {post.bookmarkedAt}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <Bookmark className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No bookmarks yet</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    When you bookmark posts, they'll appear here so you can easily find them later.
                  </p>
                </div>
              )}
            </div>

            {/* Load More */}
            {bookmarkedPosts.length > 0 && (
              <div className="p-4 text-center border-t border-gray-200 dark:border-gray-800">
                <Button variant="outline" className="w-full">
                  Load More Bookmarks
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
