"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { pacifico } from "@/lib/fonts"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "next-themes"
import { Moon, Sun, Bell } from "lucide-react"
import { Button } from "./ui/button"
import { useNotifications } from "./notification-provider"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"
import { UserDropdown } from "./user-dropdown"

export function Header() {
  const { isSignedIn } = useAuth()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { guardInteraction } = useInteractionGuard()
  
  // Get notification count with error handling
  let unreadCount = 0
  try {
    const notifications = useNotifications()
    unreadCount = notifications.unreadCount
  } catch (error) {
    // Notification provider not available, use default value
    console.log('Notification provider not available, using default count')
  }
  
  const isDark = theme === "dark"

  const handleNotificationsClick = (e: React.MouseEvent) => {
    if (!isSignedIn) {
      e.preventDefault()
      guardInteraction("access notifications")
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md dark:border-gray-800">
      <div className="relative flex items-center px-4 py-3 lg:px-6">
        {/* Mobile Logo - Only visible on mobile/tablet */}
        <div className="flex items-center flex-1 lg:flex-initial lg:hidden">
          <Link href="/" className="block">
            <div className="flex items-center space-x-2">
              <span className={`text-xl font-bold text-[#ff7300] ${pacifico.className}`}>AIRWIG</span>
            </div>
          </Link>
        </div>

        {/* Desktop Title - centered */}
        <div className="absolute inset-x-0 justify-center hidden pointer-events-none lg:flex">
          <h1 className="text-xl font-bold text-gray-900 pointer-events-auto dark:text-white">Home</h1>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center justify-end flex-1 space-x-2">
          {isSignedIn ? (
            <>
              {/* Notifications */}
              <Link href="/notifications" onClick={handleNotificationsClick}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative p-0 transition-colors duration-200 rounded-full w-9 h-9 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  {unreadCount > 0 && (
                    <span className="absolute flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-red-500 rounded-full shadow-lg -top-1 -right-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="p-0 transition-colors duration-200 rounded-full w-9 h-9 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {isDark ? (
                  <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                )}
              </Button>

              {/* User Dropdown */}
              <div className="ml-2">
                <UserDropdown />
              </div>
            </>
          ) : (
            <Button 
              onClick={() => router.push("/sign-in")}
              className="px-4 py-2 text-sm font-medium text-white transition-colors duration-200 bg-[#ff7300] rounded-full shadow-lg hover:bg-[#ff7300]/90 hover:shadow-xl xs:px-6 xs:text-base"
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}