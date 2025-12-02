"use client"

import { pacifico } from "@/lib/fonts"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="text-center space-y-6">
        {/* Logo */}
        <div className="relative h-16 flex items-center justify-center mx-auto">
          <img 
            src="https://static.readdy.ai/image/fda35afe367e72a938f227a10c9e9d75/1936403cd74bef40835e18df381af70d.png" 
            alt="AIRWIG" 
            className="absolute h-16 w-auto opacity-30"
          />
          <span className={`relative z-10 text-2xl text-blue-500 ${pacifico.className}`}>AIRWIG</span>
        </div>

        {/* Loading Animation */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
          
          {/* Loading Text */}
          <div className="space-y-2">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">
              Loading...
            </p>
            
            {/* Subtle subtitle */}
            <p className="text-gray-400 dark:text-gray-500 text-xs">
              Connecting to AIRWIG
            </p>
          </div>
        </div>

        {/* Loading Dots */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
    </div>
  )
} 