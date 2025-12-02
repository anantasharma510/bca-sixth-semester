"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Post } from "./post"
import { Button } from "./ui/button"
import { usePostApi } from "@/lib/api"
import { useBlockApi } from "@/lib/api"
import { useSmartToast } from "@/hooks/use-toast"
import { ChevronUp } from "lucide-react"
import { WhoToFollow } from "./who-to-follow"
import { useAuth } from "@/hooks/use-auth"
import { MessageCircle } from "lucide-react"

interface PostFeedProps {
  initialPosts?: any[]
  userId?: string
}

export function PostFeed({ initialPosts = [], userId }: PostFeedProps) {
  const [posts, setPosts] = useState<any[]>(initialPosts)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(initialPosts.length === 0)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>([])
  const [showNewPostsBanner, setShowNewPostsBanner] = useState(false)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [dismissedWhoToFollow, setDismissedWhoToFollow] = useState<Set<number>>(new Set())
  const feedRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const { getPosts } = usePostApi()
  const { getBlockedUsers } = useBlockApi()
  const { toast } = useSmartToast()
  const { user } = useAuth()
  const currentUserId = user?._id ?? user?.id ?? user?.userId
  const [error, setError] = useState<string | null>(null)

  // Check if user is at the top of the feed
  const isAtTop = () => {
    if (!feedRef.current) return true
    return feedRef.current.scrollTop === 0
  }

  // Scroll to top function
  const scrollToTop = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Handle new posts banner click
  const handleNewPostsClick = () => {
    scrollToTop()
    setNewPostsCount(0)
    setShowNewPostsBanner(false)
  }

  // Load initial posts and blocked users
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsInitialLoading(true)

        // Load both posts and blocked users in parallel
        const [postsResponse, blockedResponse] = await Promise.all([getPosts(1, 20), getBlockedUsers(1, 100)])

        const blockedIds = blockedResponse.blockedUsers || []
        setBlockedUserIds(blockedIds)

        const initialPosts = postsResponse.posts || []
        setPosts(initialPosts)
        setHasMore(postsResponse.pagination?.hasNextPage || false)
        setPage(1)
      } catch (error: any) {
        console.error("Error loading initial data:", error)
        toast({
          title: "Error",
          description: error.message || "Failed to load posts",
          variant: "destructive",
        })
      } finally {
        setIsInitialLoading(false)
      }
    };

    loadInitialData()
  }, [])

  const loadMorePosts = async () => {
    if (isLoading || !hasMore) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await getPosts(page + 1, 20);
      
      if (response && response.posts && response.posts.length > 0) {
        const newPosts = response.posts;
        setPosts(prev => [...prev, ...newPosts]);
        setHasMore(response.pagination.hasNextPage);
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error: any) {
      console.error("Error loading posts:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load more posts",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false);
    }
  };

  // Set up Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoading && hasMore) {
            loadMorePosts();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [isLoading, hasMore, loadMorePosts]);

  // Backup scroll-based loading for better mobile experience
  useEffect(() => {
    const handleScroll = () => {
      if (isLoading || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = scrollTop / (scrollHeight - clientHeight);

      if (scrollPercentage > 0.8) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoading, hasMore, loadMorePosts]);

  // Listen for real-time post updates
  useEffect(() => {
    const handleNewPost = (event: CustomEvent) => {
      const newPost = event.detail
      
      // Check if post is from a blocked user
      const authorId = newPost.isRepost ? newPost.repostUser?._id : newPost.author?._id
      if (authorId && blockedUserIds.includes(authorId)) {
        return
      }
      
      // Check if post already exists to prevent duplicates
      setPosts(prev => {
        const postExists = prev.some(post => post._id === newPost._id)
        if (postExists) {
          return prev // Don't add if already exists
        }
        return [newPost, ...prev] // Add new post to the beginning
      })
      
      // Show new posts banner if user is not at the top
      if (!isAtTop()) {
        setNewPostsCount(prev => prev + 1)
        setShowNewPostsBanner(true)
      }
    }

    const handlePostDeleted = (event: CustomEvent) => {
      const { postId } = event.detail
      
      // Remove the deleted post from the feed
      setPosts(prev => prev.filter(post => post._id !== postId))
    }

    const handlePostUpdated = (event: CustomEvent) => {
      const updatedPost = event.detail
      
      // Update the post in the feed
      setPosts(prev => prev.map(post => post._id === updatedPost._id ? updatedPost : post))
    }

    const handleNewRepost = (event: CustomEvent) => {
      const newRepost = event.detail
      
      // Check if repost is from a blocked user
      const authorId = newRepost.repostUser?._id
      if (authorId && blockedUserIds.includes(authorId)) {
        return
      }
      
      // Check if repost already exists to prevent duplicates
      setPosts(prev => {
        const repostExists = prev.some(post => post._id === newRepost._id)
        if (repostExists) {
          return prev // Don't add if already exists
        }
        return [newRepost, ...prev] // Add new repost to the beginning
      })
      
      // Show new posts banner if user is not at the top
      if (!isAtTop()) {
        setNewPostsCount(prev => prev + 1)
        setShowNewPostsBanner(true)
      }
    }

    const handleRepostDeleted = (event: CustomEvent) => {
      const { repostId } = event.detail
      // Remove the repost from the feed
      setPosts((prev) => prev.filter((post) => post._id !== repostId))
    }

    const handleRealTimeCommentCountUpdate = (event: CustomEvent) => {
      const { postId, commentCount } = event.detail
      handleCommentCountUpdate(postId, commentCount)
    }

    // Add event listeners
    window.addEventListener('newPost', handleNewPost as EventListener)
    window.addEventListener('postDeleted', handlePostDeleted as EventListener)
    window.addEventListener('postUpdated', handlePostUpdated as EventListener)
    window.addEventListener('newRepost', handleNewRepost as EventListener)
    window.addEventListener('repostDeleted', handleRepostDeleted as EventListener)
    window.addEventListener('commentCountUpdate', handleRealTimeCommentCountUpdate as EventListener)

    // Cleanup event listeners
    return () => {
      window.removeEventListener('newPost', handleNewPost as EventListener)
      window.removeEventListener('postDeleted', handlePostDeleted as EventListener)
      window.removeEventListener('postUpdated', handlePostUpdated as EventListener)
      window.removeEventListener('newRepost', handleNewRepost as EventListener)
      window.removeEventListener('repostDeleted', handleRepostDeleted as EventListener)
      window.removeEventListener('commentCountUpdate', handleRealTimeCommentCountUpdate as EventListener)
    }
  }, [blockedUserIds])

  // Listen for scroll events to hide banner when user scrolls to top
  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    const handleScroll = () => {
      // Debounce scroll events
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (isAtTop() && showNewPostsBanner) {
          setShowNewPostsBanner(false)
          setNewPostsCount(0)
        }
      }, 100)
    }

    const feedElement = feedRef.current
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll, { passive: true })
    }

    return () => {
      if (feedElement) {
        feedElement.removeEventListener('scroll', handleScroll)
      }
      clearTimeout(timeoutId)
    }
  }, [showNewPostsBanner])

  // Filter out posts from blocked users
  const filteredPosts = posts.filter((post) => {
    // For reposts, check repostUser._id, for original posts check author._id
    const authorId = post.isRepost ? post.repostUser?._id : post.author?._id
    return authorId && !blockedUserIds.includes(authorId)
  })

  const handlePostUpdate = (updatedPost: any) => {
    setPosts((prev) => prev.map((post) => (post._id === updatedPost._id ? updatedPost : post)))
  }

  const handlePostDelete = (deletedPostId?: string) => {
    if (deletedPostId) {
      setPosts((prev) => prev.filter((post) => post._id !== deletedPostId))
    }
  }

  const handleCommentCountUpdate = (postId: string, newCommentCount: number) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post._id === postId) {
          return { ...post, commentCount: newCommentCount }
        }
        // Handle reposts
        if (post.isRepost && post.originalPost?._id === postId) {
          return {
            ...post,
            originalPost: { ...post.originalPost, commentCount: newCommentCount },
          }
        }
        return post
      }),
    )
  }

  const handleDismissWhoToFollow = (postIndex: number) => {
    setDismissedWhoToFollow(prev => new Set([...prev, postIndex]))
  }

  // Render posts with inline Who to Follow every 6 posts
  // This creates a Twitter-style experience where suggestions appear naturally in the feed
  // You can also use it standalone:
  // - <WhoToFollow variant="sidebar" /> - for sidebar (default)
  // - <WhoToFollow variant="inline" maxSuggestions={3} /> - for inline in feed
  // - <WhoToFollow variant="mobile" maxSuggestions={2} /> - for mobile-optimized
  const renderPostsWithSuggestions = () => {
    const elements: React.JSX.Element[] = []
    
    // Track used keys to ensure uniqueness
    const usedKeys = new Set<string>()
    filteredPosts.forEach((post, index) => {
      let postKey = '';
      if (post.isRepost && post._id) {
        postKey = `repost_${post._id}`;
      } else if (post._id) {
        postKey = `post_${post._id}`;
      } else {
        postKey = `unknown_${index}`;
      }
      // If the key is already used, append the index to guarantee uniqueness
      if (usedKeys.has(postKey)) {
        postKey = `${postKey}_${index}`;
      }
      usedKeys.add(postKey);
      elements.push(
        <Post 
          key={postKey} 
          post={post} 
          onPostUpdate={handlePostUpdate} 
          onPostDelete={handlePostDelete} 
        />
      )
      
      // Add Who to Follow every 6 posts
      const shouldShowWhoToFollow = (index + 1) % 6 === 0 && !dismissedWhoToFollow.has(index)
      
      if (shouldShowWhoToFollow) {
        elements.push(
          <div key={`who-to-follow-${index}`} className="border-t border-gray-200 dark:border-gray-800">
            <div className="md:hidden">
              <WhoToFollow 
                variant="mobile"
                maxSuggestions={2}
                onDismiss={() => handleDismissWhoToFollow(index)}
              />
            </div>
            <div className="hidden md:block">
              <WhoToFollow 
                variant="inline"
                maxSuggestions={3}
                onDismiss={() => handleDismissWhoToFollow(index)}
              />
            </div>
          </div>
        )
      }
    })
    
    return elements
  }

  if (isInitialLoading) {
    return (
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
        <div className="flex items-center justify-center p-2 xs:p-3 sm:p-4 md:p-12">
          <div className="flex flex-col items-center space-y-2 xs:space-y-3 sm:space-y-4 w-full max-w-full">
            <div className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <p className="text-xs xs:text-sm sm:text-base font-medium text-gray-600 dark:text-gray-400">Loading posts...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md max-w-full" ref={feedRef}>
      {/* New Posts Banner */}
      {showNewPostsBanner && (
        <div className="sticky top-0 z-10 p-1 xs:p-1.5 sm:p-2 md:p-3 bg-blue-500 text-white shadow-lg">
          <button
            onClick={handleNewPostsClick}
            className="flex items-center justify-center w-full px-2 xs:px-3 sm:px-4 py-1 xs:py-1.5 sm:py-2 text-xs xs:text-sm font-medium transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          >
            <ChevronUp className="w-3 h-3 xs:w-4 xs:h-4 mr-1.5 xs:mr-2" />
            {newPostsCount === 1 ? '1 new post' : `${newPostsCount} new posts`} - Click to view
          </button>
        </div>
      )}

      {/* Posts Container */}
      <div className="divide-y divide-gray-200 dark:divide-gray-800 max-w-full">
        {renderPostsWithSuggestions()}
      </div>

      {/* Infinite Scroll Trigger */}
      <div
        ref={loadMoreRef}
        className="h-32 w-full opacity-0 pointer-events-none"
        aria-hidden="true"
      />

      {/* Loading Indicator */}
      {isLoading && hasMore && (
        <div className="p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            <span className="text-sm text-gray-600 dark:text-gray-400">Loading more posts...</span>
          </div>
        </div>
      )}

      {/* Manual Load More Button (fallback) */}
      {!isLoading && hasMore && (
        <div className="p-4 sm:p-6 text-center">
          <Button 
            onClick={loadMorePosts}
            variant="outline"
            className="px-6 py-2"
          >
            Load More Posts
          </Button>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && posts.length > 0 && (
        <div className="p-4 sm:p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            You've reached the end of the feed
          </p>
        </div>
      )}

      {/* Empty State */}
      {filteredPosts.length === 0 && !isInitialLoading && (
        <div className="p-3 xs:p-4 sm:p-6 md:p-12">
          <div className="space-y-2 xs:space-y-3 sm:space-y-4 text-center">
            <div className="flex items-center justify-center w-8 h-8 xs:w-10 xs:h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto bg-gray-100 rounded-full dark:bg-gray-800">
              <svg className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="space-y-1 xs:space-y-2">
              <h3 className="text-sm xs:text-base sm:text-lg font-semibold text-gray-900 dark:text-white">No posts yet</h3>
              <p className="max-w-xs xs:max-w-sm mx-auto text-xs xs:text-sm sm:text-base text-gray-500 dark:text-gray-400">
                Be the first to share something with the community! Start a conversation and connect with others.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Public Post Feed for non-authenticated users
export function PublicPostFeed() {
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { getPublicPosts } = usePostApi()

  useEffect(() => {
    const loadPublicPosts = async () => {
      try {
        setIsLoading(true)
        const response = await getPublicPosts(3)
        setPosts(response.posts || [])
      } catch (error: any) {
        console.error("Error loading public posts:", error)
        setError(error.message || "Failed to load posts")
      } finally {
        setIsLoading(false)
      }
    }

    loadPublicPosts()
  }, [getPublicPosts])

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-4 p-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800 animate-pulse">
            <div className="flex items-start space-x-3">
              <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <MessageCircle className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No posts available</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Sign up to see more content and start sharing!
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-y-auto">
      {posts.map((post) => (
        <Post
          key={post._id}
          post={post}
          onPostUpdate={() => {}} // No updates for public posts
          onPostDelete={() => {}} // No deletes for public posts
        />
      ))}
    </div>
  )
}
