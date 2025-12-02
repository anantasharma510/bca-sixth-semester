"use client"

import { useRealTimeUpdates } from "@/hooks/use-real-time-updates"

export function RealTimeUpdatesHandler() {
  // Initialize global real-time updates
  useRealTimeUpdates()
  
  // This component doesn't render anything, it just sets up the event listeners
  return null
} 