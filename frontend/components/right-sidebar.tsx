"use client"

import type React from "react"

import { Search } from "lucide-react"
import { WhoToFollow } from "./who-to-follow"
import { TrendingTopics } from "./trending-topics"
import { useState } from "react"
import { useRouter } from "next/navigation"

export function RightSidebar() {
  const [search, setSearch] = useState("")
  const router = useRouter()

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <div className="sticky top-0 hidden h-screen p-3 xs:p-4 lg:p-6 overflow-y-auto border-l border-gray-200 xl:block w-72 lg:w-80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md dark:border-gray-800">
      <form className="relative mb-3 xs:mb-4 lg:mb-6" onSubmit={handleSearch}>
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 xs:w-5 xs:h-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full py-2.5 xs:py-3 pl-9 xs:pl-10 pr-3 xs:pr-4 text-sm text-gray-900 transition-all duration-200 bg-gray-100 border-none rounded-full shadow-sm dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-700 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:shadow-md hover:shadow-sm"
          placeholder="Search"
        />
      </form>

      <div className="space-y-3 xs:space-y-4 lg:space-y-6">
        <WhoToFollow />
        <TrendingTopics />
      </div>
    </div>
  )
}
