import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "./use-toast"

export function useInteractionGuard() {
  const { isSignedIn } = useAuth()
  const router = useRouter()

  const guardInteraction = (action: string, callback?: () => void) => {
    if (!isSignedIn) {
      toast({
        title: "Sign in required",
        description: `Please sign in to ${action}`,
        variant: "default",
      })
      
      // Redirect to sign-in page
      router.push("/sign-in")
      
      return false
    }
    
    // If authenticated, execute the callback
    if (callback) {
      callback()
    }
    
    return true
  }

  return { guardInteraction, isSignedIn }
} 