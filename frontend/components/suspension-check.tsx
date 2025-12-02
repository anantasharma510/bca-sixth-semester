"use client"

import { useSuspensionCheck } from "@/hooks/use-suspension-check";

export function SuspensionCheck() {
  useSuspensionCheck();
  return null; // This component doesn't render anything
} 