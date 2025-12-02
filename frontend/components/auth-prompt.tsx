"use client"

import Link from "next/link"
import { Button } from "./ui/button"
import { pacifico } from "@/lib/fonts"

export function AuthPrompt() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto text-center space-y-8">
        {/* Logo */}
        <div className="relative h-20 flex items-center justify-center mx-auto">
          <img 
            src="https://static.readdy.ai/image/fda35afe367e72a938f227a10c9e9d75/1936403cd74bef40835e18df381af70d.png" 
            alt="AIRWIG" 
            className="absolute h-20 w-auto opacity-30"
          />
          <span className={`relative z-10 text-3xl text-blue-500 ${pacifico.className}`}>AIRWIG</span>
        </div>

        {/* Welcome Content */}
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to AIRWIG
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-400 leading-relaxed">
              Sign up or log in to connect with friends, share your thoughts, and discover amazing content from around the world.
            </p>
          </div>

          {/* Feature Preview */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Share posts</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Follow friends</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Real-time chat</span>
            </div>
            <div className="flex items-center space-x-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Discover content</span>
            </div>
          </div>
        </div>

        {/* Auth Button */}
        <div className="pt-6 space-y-3">
          <Link href="/sign-up">
            <Button 
              className="w-full py-4 text-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition-all duration-200 hover:shadow-xl"
            >
              Sign Up
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button 
              variant="outline"
              className="w-full py-4 text-lg font-semibold rounded-xl"
            >
              Log In
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="pt-8">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Join millions of users worldwide
          </p>
        </div>
      </div>
    </div>
  )
} 