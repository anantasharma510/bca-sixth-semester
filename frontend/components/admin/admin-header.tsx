"use client"

import { Bell, Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

export function AdminHeader() {
  const { user } = useAuth();
  const fullName = user?.name || "Admin User";
  const email = user?.email || "admin@airwig.com";
  
  console.log('🔍 AdminHeader: Rendering header, user:', user?.id)

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            {/* <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" /> */}
            {/* <input
              type="text"
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            /> */}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs"></span>
          </Button> */}

          <div className="flex items-center space-x-3">
            {user?.image ? (
              <img
                src={user.image}
                alt={fullName}
                className="w-8 h-8 rounded-full object-cover border border-gray-300 dark:border-gray-700"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
