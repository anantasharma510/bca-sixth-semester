"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import type { ReactNode } from "react"
import { useProtectedApi } from "@/lib/api"

export function ClientAdminGuard({ children }: { children: ReactNode }) {
  const { user, isLoaded } = useAuth()
  const router = useRouter()
  const [checkState, setCheckState] = useState<'checking' | 'authorized' | 'unauthorized'>('checking')
  const { callProtectedApi } = useProtectedApi()

  const checkAuthorization = useCallback(async () => {
    try {
      console.log('🔍 AdminGuard: Starting authorization check')
      
      // Wait for auth to load
      if (!isLoaded) {
        console.log('🔍 AdminGuard: Auth not loaded yet')
        return
      }

      // Check if user is signed in
      if (!user) {
        console.log('🔍 AdminGuard: No user, redirecting to sign-in')
        setCheckState('unauthorized')
        router.replace("/sign-in")
        return
      }

      // Check database admin role
      try {
        console.log('🔍 AdminGuard: Checking database role for user:', user.id)
        const data = await callProtectedApi("/api/protected")
        console.log('🔍 AdminGuard: API response:', data)
        
        const isDbAdmin = data.user?.role === "admin"
        console.log('🔍 AdminGuard: DB admin status:', isDbAdmin)
        
        if (!isDbAdmin) {
          console.log('🔍 AdminGuard: User is not DB admin')
          setCheckState('unauthorized')
          router.replace("/")
        } else {
          console.log('🔍 AdminGuard: User is authorized as admin')
          setCheckState('authorized')
        }
      } catch (error) {
        console.error('🔍 AdminGuard: Error checking authorization:', error)
        // Don't redirect on API error - let user retry
        console.log('🔍 AdminGuard: Treating API error as unauthorized')
        setCheckState('unauthorized')
        router.replace("/")
      }
    } catch (error) {
      console.error('🔍 AdminGuard: Unexpected error:', error)
      setCheckState('unauthorized')
    }
  }, [user, isLoaded, router, callProtectedApi])

  useEffect(() => {
    // Only run the check when in 'checking' state
    if (checkState === 'checking') {
      checkAuthorization()
    }
  }, [checkState, checkAuthorization])

  // Log current state
  console.log('🔍 AdminGuard: Current render state:', {
    checkState,
    isLoaded,
    userId: user?.id
  })

  // Show loading while checking
  if (checkState === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <span className="text-lg">Verifying admin access...</span>
        </div>
      </div>
    )
  }

  // Show redirect message if unauthorized
  if (checkState === 'unauthorized') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <span className="text-lg">Redirecting...</span>
        </div>
      </div>
    )
  }

  // Only render children if authorized
  console.log('🔍 AdminGuard: Rendering admin content - authorized')
  return <>{children}</>
}