import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { useProtectedApi } from "@/lib/api";
import { toast } from "./use-toast";

export function useSuspensionCheck() {
  const { isSignedIn } = useAuth();
  const { callProtectedApi } = useProtectedApi();
  const checkInterval = useRef<NodeJS.Timeout | null>(null);
  const isChecking = useRef(false);

  useEffect(() => {
    if (!isSignedIn) {
      // Clear interval if user signs out
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
      return;
    }

    // Check suspension status immediately
    const checkSuspension = async () => {
      if (isChecking.current) return; // Prevent multiple simultaneous checks
      
      isChecking.current = true;
      try {
        const response = await callProtectedApi("/api/protected/check-suspension");
        if (response.suspended) {
          toast({ 
            title: "Account Suspended", 
            description: "Your account has been suspended by an administrator.",
            variant: "destructive"
          });
          await authClient.signOut();
        }
      } catch (error: any) {
        // If the error is about suspension, it's already handled by the API utility
        if (error.message === "Account suspended") {
          return;
        }
        
        // For other errors, log but don't show to user to avoid spam
        console.error('Failed to check suspension status:', error);
      } finally {
        isChecking.current = false;
      }
    };

    // Check immediately
    checkSuspension();

    // Set up periodic checks every 30 seconds
    checkInterval.current = setInterval(checkSuspension, 30000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, [isSignedIn, callProtectedApi]);
} 