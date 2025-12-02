"use client"

import { useBlockEvents } from "@/hooks/use-block-events";

export function BlockEventsHandler() {
  useBlockEvents();
  
  // This component doesn't render anything, it just handles events
  return null;
} 