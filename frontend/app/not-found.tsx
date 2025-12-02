"use client"

import Link from "next/link"
import { pacifico } from "@/lib/fonts"
import { Home, ArrowLeft, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-md mx-auto">
        {/* Logo */}
        <div className="relative h-20 flex items-center justify-center mx-auto">
          <img 
            src="https://static.readdy.ai/image/fda35afe367e72a938f227a10c9e9d75/1936403cd74bef40835e18df381af70d.png" 
            alt="AIRWIG" 
            className="absolute h-20 w-auto opacity-30"
          />
          <span className={`relative z-10 text-3xl text-blue-500 ${pacifico.className}`}>AIRWIG</span>
        </div>

        {/* 404 Content */}
        <div className="space-y-6">
          {/* 404 Number */}
          <div className="space-y-2">
            <h1 className="text-8xl font-bold text-gray-200 dark:text-gray-700">404</h1>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Page Not Found
            </h2>
          </div>

          {/* Message */}
          <div className="space-y-3">
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Oops! The page you're looking for doesn't exist.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm">
              It might have been moved, deleted, or you entered the wrong URL.
            </p>
          </div>

          {/* Illustration */}
          <div className="flex justify-center">
            <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Search className="w-16 h-16 text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 pt-6">
          <Link href="/">
            <Button className="w-full py-3 font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl">
              <Home className="w-5 h-5 mr-2" />
              Go to Home
            </Button>
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full py-3 font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5 mr-2 inline" />
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="pt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Try these popular pages:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link 
              href="/explore"
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Explore
            </Link>
            <Link 
              href="/notifications"
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Notifications
            </Link>
            <Link 
              href="/messages"
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Messages
            </Link>
            <Link 
              href="/profile"
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              Profile
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-8">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            If you believe this is an error, please contact support
          </p>
        </div>
      </div>
    </div>
  )
} 