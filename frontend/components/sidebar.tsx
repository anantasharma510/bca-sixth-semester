"use client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Home, Search, Bell, Mail, Bookmark, User, Settings, Edit, Radio } from "lucide-react"
import { pacifico } from "@/lib/fonts"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { useProtectedApi } from "@/lib/api"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"

export function Sidebar() {
  const { user, isSignedIn } = useAuth()
  const { callProtectedApi } = useProtectedApi()
  const { guardInteraction } = useInteractionGuard()
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user data from our backend
  const fetchUserData = async () => {
    if (!user) return

    try {
      setLoading(true)
      const response = await callProtectedApi("/api/protected")
      setUserData(response.user)
    } catch (error) {
      console.error("Failed to fetch user data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isSignedIn) {
      fetchUserData()
    } else {
      setLoading(false)
    }
  }, [user, isSignedIn])

  const displayName =
    userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`
      : userData?.username || user?.name || "User"

  const username = userData?.username || user?.email?.split('@')[0] || "user"
  const profileImage = userData?.profileImageUrl || user?.image || "/placeholder-user.jpg"

  const handleNavigationClick = (route: string, path: string) => {
    if (!isSignedIn) {
      guardInteraction(`access ${route}`)
    } else {
      router.push(path)
    }
  }

  return (
    <div className="fixed top-0 left-0 z-40 flex-col hidden w-64 h-screen bg-white border-r border-gray-200 dark:border-gray-800 dark:bg-gray-900 lg:flex">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <Link href="/" className="block">
          <div className="flex items-center justify-center">
            <div className="relative flex items-center justify-center h-12">
              {/* <img 
                src="/logo.png" 
                alt="AIRWIG" 
                className="absolute w-auto h-12 opacity-30 dark:opacity-100 dark:brightness-0 dark:invert"
              /> */}
              <span className={`relative z-10 text-2xl font-bold text-blue-500 dark:text-white ${pacifico.className}`}>AIRWIG</span>
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        <Link
          href="/"
          className="flex items-center p-3 space-x-4 font-semibold text-blue-500 transition-colors duration-200 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <Home className="w-6 h-6" />
          <span className="text-lg">Home</span>
        </Link>
        
        {isSignedIn ? (
          <Link
            href="/explore"
            className="flex items-center p-3 space-x-4 font-medium text-gray-700 transition-colors duration-200 rounded-xl dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Search className="w-6 h-6" />
            <span className="text-lg">Explore</span>
          </Link>
        ) : (
          <button
            onClick={() => guardInteraction("access explore")}
            className="flex items-center w-full p-3 space-x-4 font-medium text-left text-gray-400 transition-colors duration-200 cursor-not-allowed rounded-xl dark:text-gray-500"
          >
            <Search className="w-6 h-6" />
            <span className="text-lg">Explore</span>
          </button>
        )}
        
        {isSignedIn ? (
          <Link
            href="/notifications"
            className="flex items-center p-3 space-x-4 font-medium text-gray-700 transition-colors duration-200 rounded-xl dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Bell className="w-6 h-6" />
            <span className="text-lg">Notifications</span>
          </Link>
        ) : (
          <button
            onClick={() => guardInteraction("access notifications")}
            className="flex items-center w-full p-3 space-x-4 font-medium text-left text-gray-400 transition-colors duration-200 cursor-not-allowed rounded-xl dark:text-gray-500"
          >
            <Bell className="w-6 h-6" />
            <span className="text-lg">Notifications</span>
          </button>
        )}
        
        {isSignedIn ? (
          <Link
            href="/messages"
            className="flex items-center p-3 space-x-4 font-medium text-gray-700 transition-colors duration-200 rounded-xl dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Mail className="w-6 h-6" />
            <span className="text-lg">Messages</span>
          </Link>
        ) : (
          <button
            onClick={() => guardInteraction("access messages")}
            className="flex items-center w-full p-3 space-x-4 font-medium text-left text-gray-400 transition-colors duration-200 cursor-not-allowed rounded-xl dark:text-gray-500"
          >
            <Mail className="w-6 h-6" />
            <span className="text-lg">Messages</span>
          </button>
        )}
        
        {isSignedIn ? (
          <Link
            href="/profile"
            className="flex items-center p-3 space-x-4 font-medium text-gray-700 transition-colors duration-200 rounded-xl dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <User className="w-6 h-6" />
            <span className="text-lg">Profile</span>
          </Link>
        ) : (
          <button
            onClick={() => guardInteraction("access profile")}
            className="flex items-center w-full p-3 space-x-4 font-medium text-left text-gray-400 transition-colors duration-200 cursor-not-allowed rounded-xl dark:text-gray-500"
          >
            <User className="w-6 h-6" />
            <span className="text-lg">Profile</span>
          </button>
        )}
        
        {isSignedIn ? (
          <Link
            href="/live"
            className="flex items-center p-3 space-x-4 font-medium text-gray-700 transition-colors duration-200 rounded-xl dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Radio className="w-6 h-6" />
            <span className="text-lg">Go Live</span>
          </Link>
        ) : (
          <button
            onClick={() => guardInteraction("access live streaming")}
            className="flex items-center w-full p-3 space-x-4 font-medium text-left text-gray-400 transition-colors duration-200 cursor-not-allowed rounded-xl dark:text-gray-500"
          >
            <Radio className="w-6 h-6" />
            <span className="text-lg">Go Live</span>
          </button>
        )}
        
        {isSignedIn ? (
          <Link
            href="/settings"
            className="flex items-center p-3 space-x-4 font-medium text-gray-700 transition-colors duration-200 rounded-xl dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="w-6 h-6" />
            <span className="text-lg">Settings</span>
          </Link>
        ) : (
          <button
            onClick={() => guardInteraction("access settings")}
            className="flex items-center w-full p-3 space-x-4 font-medium text-left text-gray-400 transition-colors duration-200 cursor-not-allowed rounded-xl dark:text-gray-500"
          >
            <Settings className="w-6 h-6" />
            <span className="text-lg">Settings</span>
          </button>
        )}
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        {isSignedIn ? (
          <Link href="/profile" className="block">
            <div className="flex items-center p-3 transition-colors duration-200 cursor-pointer rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
              <div className="relative">
                <img
                  src={profileImage || "/placeholder.svg"}
                  alt="Profile"
                  className="object-cover w-12 h-12 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
                />
                <div className="absolute w-4 h-4 bg-green-500 border-2 border-white rounded-full -bottom-1 -right-1 dark:border-gray-900"></div>
              </div>
              <div className="flex-1 min-w-0 ml-3">
                <p className="text-sm font-semibold text-gray-900 truncate dark:text-gray-100">
                  {loading ? "Loading..." : displayName}
                </p>
                <p className="text-sm text-gray-500 truncate dark:text-gray-400">{loading ? "..." : `@${username}`}</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="p-3 text-center">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Sign in to access your profile</p>
            <button
              onClick={() => guardInteraction("access your profile")}
              className="w-full px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
