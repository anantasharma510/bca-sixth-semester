import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProtectedApi } from "@/lib/api";
import { toast } from "./use-toast";

export function useSyncUserWithBackend() {
  const { isSignedIn } = useAuth();
  const { callProtectedApi } = useProtectedApi();
  const hasSynced = useRef(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      setSyncStatus('loading');
      callProtectedApi("/api/protected")
        .then((res) => {
          setSyncStatus('success');
          toast({ title: "Account synced with backend!" });
        })
        .catch((err) => {
          // Suppress error toast for 401/403 errors (user not yet provisioned)
          if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
            setSyncStatus('idle'); // Don't show error status
          } else {
            setSyncStatus('error');
            console.error("Failed to sync user with backend", err);
            toast({ title: "Failed to sync user with backend" });
          }
        });
    }
  }, [isSignedIn, callProtectedApi]);

  return { syncStatus };
}