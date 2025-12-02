"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { ComposePost } from "@/components/compose-post"
import { PostFeed, PublicPostFeed } from "@/components/post-feed"
import { RightSidebar } from "@/components/right-sidebar"
import { SignOutHandler } from "@/components/sign-out-handler"

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [authTimeout, setAuthTimeout] = useState(false)

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setAuthTimeout(true)
    }, 5000) // 5 second timeout

    return () => clearTimeout(timeoutId)
  }, [])

  // Show main app interface for everyone (authenticated and non-authenticated)
  return (
    <SignOutHandler>
      <div className="min-h-screen bg-[#f7f6f6] dark:bg-gray-900">
        <Sidebar />
        <MobileNavigation />

        {/* Main content area - positioned to account for fixed sidebar */}
        <div className="flex flex-col min-h-screen lg:ml-64 pb-16 lg:pb-0">
          <Header />

          <div className="flex flex-1">
            {/* Main content */}
            <div className="flex-1 border-r border-gray-200 dark:border-gray-800 flex flex-col">
              {/* Show compose post only for authenticated users */}
              {isSignedIn && <ComposePost />}
              <div className="flex-1 overflow-y-auto">
                {/* Show appropriate feed based on authentication */}
                {isSignedIn ? <PostFeed /> : <PublicPostFeed />}
              </div>
            </div>

            {/* Right sidebar - hidden on mobile and small tablets */}
            <div className="hidden xl:block">
              <RightSidebar />
            </div>
          </div>
        </div>
      </div>
    </SignOutHandler>
  )
}
