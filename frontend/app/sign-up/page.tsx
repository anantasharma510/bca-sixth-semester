"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { refreshAuthSession } from "@/hooks/use-auth"
import { Eye, EyeOff, Loader2, MailCheck, ShieldCheck } from "lucide-react"

type SignupStep = "form" | "verify"

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

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<SignupStep>("form")

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const [pendingUser, setPendingUser] = useState<{
    email: string
    password: string
    displayName: string
  } | null>(null)

  useEffect(() => {
    if (resendTimer <= 0) return
    const timer = setInterval(() => {
      setResendTimer((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendTimer])

  const fullName = useMemo(() => {
    const parts = [firstName.trim(), lastName.trim()].filter(Boolean)
    return parts.length > 0 ? parts.join(" ") : username.trim()
  }, [firstName, lastName, username])

  const requiredFieldsFilled =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    username.trim() !== "" &&
    email.trim() !== "" &&
    password.length >= 8

  const handleDetailsSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!acceptedTerms) {
      toast({
        title: "Action required",
        description: "Please agree to the Terms of Service and Privacy Policy",
        variant: "destructive",
      })
      return
    }

    if (!requiredFieldsFilled) {
      toast({
        title: "Missing information",
        description: "Fill out all required fields before continuing.",
        variant: "destructive",
      })
      return
    }

    setIsSendingCode(true)
    try {
      await postJson("/api/otp/send-signup", { email: email.trim() })
      setPendingUser({
        email: email.trim(),
        password,
        displayName: fullName || email.trim(),
      })
      setVerificationCode("")
      setStep("verify")
      setResendTimer(45)

      toast({
        title: "Verification code sent",
        description: `Enter the 6-digit code we sent to ${email.trim()}`,
      })
    } catch (error: any) {
      console.error("Signup OTP error:", error)
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again in a moment.",
        variant: "destructive",
      })
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyAccount = async (event: FormEvent) => {
    event.preventDefault()
    if (!pendingUser) {
      setStep("form")
      return
    }

    if (verificationCode.trim().length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code.",
        variant: "destructive",
      })
      return
    }

    setIsVerifying(true)
    try {
      await postJson("/api/otp/verify-signup", {
        email: pendingUser.email,
        code: verificationCode.trim(),
      })

      const result = await authClient.signUp.email({
        email: pendingUser.email,
        password: pendingUser.password,
        name: pendingUser.displayName,
      })

      if (result.error) {
        throw new Error(result.error.message || "Unable to complete sign up")
      }

      await refreshAuthSession()

      toast({
        title: "Welcome to AIRWIG!",
        description: "Account created successfully. Redirecting...",
      })

      router.push("/")
    } catch (error: any) {
      console.error("Sign up verification error:", error)
      toast({
        title: "Verification failed",
        description: error.message || "Check your code and try again.",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    if (!pendingUser || resendTimer > 0) return
    setIsResending(true)
    try {
      await postJson("/api/otp/send-signup", { email: pendingUser.email })
      setResendTimer(45)
      toast({
        title: "Code resent",
        description: `We sent a new code to ${pendingUser.email}`,
      })
    } catch (error: any) {
      toast({
        title: "Unable to resend",
        description: error.message || "Please try again shortly.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  const handleEditDetails = () => {
    setStep("form")
    setPendingUser(null)
    setVerificationCode("")
    setIsResending(false)
    setResendTimer(0)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AIRWIG
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === "form" ? "Create your account" : "Verify your email"}
          </CardTitle>
          <CardDescription>
            {step === "form"
              ? "Join the AIRWIG community with the same secure flow as our mobile app."
              : "Enter the 6-digit code we sent to your inbox to finish signing up."}
          </CardDescription>
        </CardHeader>

        {step === "form" ? (
          <form onSubmit={handleDetailsSubmit}>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input
                    id="first-name"
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    disabled={isSendingCode}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input
                    id="last-name"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    disabled={isSendingCode}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Choose something unique"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={isSendingCode}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isSendingCode}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    disabled={isSendingCode}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    disabled={isSendingCode}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use at least 8 characters. Mixing letters, numbers, and symbols is encouraged.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(Boolean(checked))}
                  disabled={isSendingCode}
                />
                <Label htmlFor="terms" className="text-sm text-left text-gray-600 dark:text-gray-300 font-normal leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms-of-service" className="underline font-semibold">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" className="underline font-semibold">
                    Privacy Policy
                  </Link>
                  .
                </Label>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isSendingCode || !acceptedTerms || !requiredFieldsFilled}
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleVerifyAccount}>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-200">
                  <MailCheck className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Check your inbox
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We sent a 6-digit code to <span className="font-medium">{pendingUser?.email}</span>.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  disabled={isVerifying}
                  className="tracking-[0.5em] text-center text-lg"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isResending || resendTimer > 0}
                  className="inline-flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {isResending
                    ? "Sending..."
                    : resendTimer > 0
                      ? `Resend code in ${resendTimer}s`
                      : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={handleEditDetails}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Change email or details
                </button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isVerifying || verificationCode.trim().length !== 6}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Having trouble?{" "}
                <a href="mailto:support@airwig.ca" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                  Contact support
                </a>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}
