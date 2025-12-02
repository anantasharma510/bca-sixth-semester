"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useProtectedApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { refreshAuthSession } from "@/hooks/use-auth"

type ResetStep = "email" | "code" | "password"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const postJson = async (path: string, payload: unknown) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    // ignore
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Request failed")
  }

  return data
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { callProtectedApi } = useProtectedApi()

  const [rememberMe, setRememberMe] = useState(true)

  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetStep, setResetStep] = useState<ResetStep>("email")
  const [resetEmail, setResetEmail] = useState("")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [resetToken, setResetToken] = useState("")
  const [resetError, setResetError] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  // Check if user is already signed in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await authClient.getSession()
        if (session?.data?.session) {
          setIsChecking(true)
          // Check suspension status
          try {
            const response = await callProtectedApi("/api/protected/check-suspension")
            if (response.suspended) {
              toast({
                title: "Account Suspended",
                description: "Your account has been suspended by an administrator.",
                variant: "destructive",
              })
              router.push("/suspended")
              return
            }
            router.push("/")
          } catch (error: any) {
            if (error.message === "Account suspended") {
              router.push("/suspended")
              return
            }
            // For other errors, allow access
            router.push("/")
          }
        }
      } catch {
        // No session, stay on sign-in page
      }
    }
    void checkSession()
  }, [router, callProtectedApi])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      })

      if (result.error) {
        throw new Error(result.error.message || "Invalid email or password. Please try again.")
      }

      await refreshAuthSession()

      // Success - check suspension and redirect
      setIsChecking(true)
      try {
        const response = await callProtectedApi("/api/protected/check-suspension")
        if (response.suspended) {
          toast({
            title: "Account Suspended",
            description: "Your account has been suspended by an administrator.",
            variant: "destructive",
          })
          await authClient.signOut()
          router.push("/suspended")
          return
        }
        
        toast({
          title: "Welcome back!",
          description: "Redirecting to your feed...",
        })
        router.push("/")
      } catch (error: any) {
        if (error.message === "Account suspended") {
          await authClient.signOut()
          router.push("/suspended")
          return
        }
        // For other errors, still redirect
        router.push("/")
      }
    } catch (error: any) {
      console.error("Sign in error:", error)
      const description = error.message || "An unexpected error occurred. Please try again."
      toast({
        title: "Sign in failed",
        description,
        variant: "destructive",
      })
      setFormError(description)
      setIsLoading(false)
      setIsChecking(false)
    }
  }

  const resetFlowDefaults = () => {
    setResetStep("email")
    setResetEmail("")
    setResetCode("")
    setNewPassword("")
    setResetToken("")
    setResetError(null)
    setIsResetting(false)
    setResendTimer(0)
  }

  const handleResetDialogChange = (open: boolean) => {
    setResetDialogOpen(open)
    if (open) {
      setResetEmail((prev) => prev || email)
      setResetStep("email")
      setResetError(null)
    } else {
      resetFlowDefaults()
    }
  }

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value)

  const sendPasswordResetCode = async () => {
    if (!isValidEmail(resetEmail.trim())) {
      setResetError("Enter a valid email address.")
      return
    }
    setIsResetting(true)
    setResetError(null)
    try {
      await postJson("/api/otp/send-password-reset", { email: resetEmail.trim() })
      toast({
        title: "Check your inbox",
        description: `We sent a verification code to ${resetEmail.trim()}`,
      })
      setResetStep("code")
      setResendTimer(45)
    } catch (error: any) {
      setResetError(error.message || "Unable to send verification code.")
    } finally {
      setIsResetting(false)
    }
  }

  const verifyResetCode = async () => {
    if (resetCode.trim().length !== 6) {
      setResetError("Enter the 6-digit verification code.")
      return
    }
    setIsResetting(true)
    setResetError(null)
    try {
      const data = await postJson("/api/otp/verify-password-reset", {
        email: resetEmail.trim(),
        code: resetCode.trim(),
      })
      if (!data?.token) {
        throw new Error("Verification token missing. Try sending a new code.")
      }
      setResetToken(data.token)
      setResetStep("password")
      toast({
        title: "Code verified",
        description: "Create a new password to finish resetting your account.",
      })
    } catch (error: any) {
      setResetError(error.message || "Invalid verification code. Please try again.")
    } finally {
      setIsResetting(false)
    }
  }

  const completePasswordReset = async () => {
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long.")
      return
    }
    if (!resetToken) {
      setResetError("Verification token missing. Please restart the process.")
      return
    }
    setIsResetting(true)
    setResetError(null)
    try {
      await postJson("/api/otp/reset-password", {
        email: resetEmail.trim(),
        token: resetToken,
        newPassword,
      })
      toast({
        title: "Password updated",
        description: "You can now sign in with your new password.",
      })
      handleResetDialogChange(false)
      setPassword("")
    } catch (error: any) {
      setResetError(error.message || "Unable to reset password. Please try again.")
    } finally {
      setIsResetting(false)
    }
  }

  const handleForgotPassword = () => {
    setResetEmail(email)
    handleResetDialogChange(true)
  }

  const handleResendResetCode = async () => {
    if (resendTimer > 0 || isResetting) return
    await sendPasswordResetCode()
  }

  const handleResetNavigation = () => {
    if (resetStep === "email") {
      handleResetDialogChange(false)
    } else if (resetStep === "code") {
      setResetStep("email")
      setResetCode("")
      setResetToken("")
      setResendTimer(0)
    } else {
      setResetStep("code")
      setNewPassword("")
    }
    setResetError(null)
  }

  const handleResetPrimaryAction = () => {
    if (resetStep === "email") {
      void sendPasswordResetCode()
    } else if (resetStep === "code") {
      void verifyResetCode()
    } else {
      void completePasswordReset()
    }
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">Checking account status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AIRWIG
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <label className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                  className="rounded"
                />
                Keep me signed in
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Forgot password?
              </button>
            </div>
            {formError && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
                {formError}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <div className="text-sm text-center text-gray-600 dark:text-gray-400">
              Don't have an account?{" "}
              <Link
                href="/sign-up"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={resetDialogOpen} onOpenChange={handleResetDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {resetStep === "email" && "Reset your password"}
              {resetStep === "code" && "Enter verification code"}
              {resetStep === "password" && "Create a new password"}
            </DialogTitle>
            <DialogDescription>
              {resetStep === "email" &&
                "We'll send a 6-digit code to your email so you can securely reset your password."}
              {resetStep === "code" &&
                `Enter the code we sent to ${resetEmail.trim() || "your email address"}.`}
              {resetStep === "password" && "Choose a strong password to protect your account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {resetStep === "email" && (
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            )}
            {resetStep === "code" && (
              <div className="space-y-2">
                <Label htmlFor="reset-code">Verification code</Label>
                <Input
                  id="reset-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ""))}
                  className="tracking-[0.5em] text-center text-lg"
                />
              </div>
            )}
            {resetStep === "password" && (
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}
            {resetError && (
              <p className="text-sm text-red-600 dark:text-red-300">{resetError}</p>
            )}
            {resetStep === "code" && (
              <button
                type="button"
                onClick={handleResendResetCode}
                disabled={isResetting || resendTimer > 0}
                className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {isResetting
                  ? "Sending..."
                  : resendTimer > 0
                    ? `Resend code in ${resendTimer}s`
                    : "Resend code"}
              </button>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={handleResetNavigation}
              disabled={isResetting}
            >
              {resetStep === "email" ? "Cancel" : "Back"}
            </Button>
            <Button
              type="button"
              onClick={handleResetPrimaryAction}
              disabled={
                isResetting ||
                (resetStep === "email" && !resetEmail.trim()) ||
                (resetStep === "code" && resetCode.trim().length !== 6) ||
                (resetStep === "password" && newPassword.length < 8)
              }
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Working...
                </>
              ) : resetStep === "email" ? (
                "Send code"
              ) : resetStep === "code" ? (
                "Verify code"
              ) : (
                "Reset password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
