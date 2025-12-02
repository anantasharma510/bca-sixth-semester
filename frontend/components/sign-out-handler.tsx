"use client"

import { useAuth } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoadingScreen } from "./loading-screen"
import { AuthPrompt } from "./auth-prompt"
import { pacifico } from "@/lib/fonts"

interface SignOutHandlerProps {
  children: React.ReactNode
}

export function SignOutHandler({ children }: SignOutHandlerProps) {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [showSignOutTransition, setShowSignOutTransition] = useState(false)

  // Handle sign-out transition
  useEffect(() => {
    if (isLoaded && !isSignedIn && showSignOutTransition) {
      // Show brief loading screen during sign-out transition, then redirect to main page
      const timer = setTimeout(() => {
        setShowSignOutTransition(false)
        setIsSigningOut(false)
        // Redirect to main page to show AuthPrompt
        router.push('/')
      }, 1000) // 1 second transition

      return () => clearTimeout(timer)
    }
  }, [isLoaded, isSignedIn, showSignOutTransition, router])

  // Listen for sign-out events
  useEffect(() => {
    const handleSignOut = () => {
      setIsSigningOut(true)
      setShowSignOutTransition(true)
    }

    // Listen for Better Auth sign-out (we'll handle this via router events)
    // Better Auth doesn't have custom events like Clerk, so we rely on session polling
    return () => {
      // Cleanup if needed
    }
  }, [])

  // Show auth prompt for unauthenticated users
  if (isLoaded && !isSignedIn) {
    // For guests, just render the app interface (children)
    return <>{children}</>
  }

  // Show main app for authenticated users
  return <>{children}</>
} 