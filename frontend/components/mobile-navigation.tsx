'use client'

import Link from "next/link"
import { 
  Home, 
  Compass, 
  Bell, 
  MessageCircle, 
  UserCircle, 
  Settings,
  Radio
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useInteractionGuard } from "@/hooks/use-interaction-guard"

export function MobileNavigation() {
  const { isSignedIn } = useAuth()
  const { guardInteraction } = useInteractionGuard()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 flex justify-around py-3 bg-white border-t border-gray-200 dark:bg-gray-900 dark:border-gray-800 lg:hidden">
      <Link href="/" className="flex items-center justify-center w-10 h-10 text-blue-500">
        <Home className="w-6 h-6" />
      </Link>
      
      {isSignedIn ? (
        <Link href="/explore" className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400">
          <Compass className="w-6 h-6" />
        </Link>
      ) : (
        <button 
          onClick={() => guardInteraction("access search")}
          className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500"
        >
          <Compass className="w-6 h-6" />
        </button>
      )}
      
      {isSignedIn ? (
        <Link href="/notifications" className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400">
          <Bell className="w-6 h-6" />
        </Link>
      ) : (
        <button
          onClick={() => guardInteraction("access notifications")}
          className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500"
        >
          <Bell className="w-6 h-6" />
        </button>
      )}
      
      {isSignedIn ? (
        <Link href="/messages" className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400">
          <MessageCircle className="w-6 h-6" />
        </Link>
      ) : (
        <button 
          onClick={() => guardInteraction("access messages")}
          className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
      
      {isSignedIn ? (
        <Link href="/live" className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400">
          <Radio className="w-6 h-6" />
        </Link>
      ) : (
        <button 
          onClick={() => guardInteraction("access live streaming")}
          className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500"
        >
          <Radio className="w-6 h-6" />
        </button>
      )}
      
      {isSignedIn ? (
        <Link href="/profile" className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400">
          <UserCircle className="w-6 h-6" />
        </Link>
      ) : (
        <button 
          onClick={() => guardInteraction("access profile")}
          className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500"
        >
          <UserCircle className="w-6 h-6" />
        </button>
      )}
      
      {isSignedIn ? (
        <Link href="/settings" className="flex items-center justify-center w-10 h-10 text-gray-500 dark:text-gray-400">
          <Settings className="w-6 h-6" />
        </Link>
      ) : (
        <button 
          onClick={() => guardInteraction("access settings")}
          className="flex items-center justify-center w-10 h-10 text-gray-400 dark:text-gray-500"
        >
          <Settings className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
