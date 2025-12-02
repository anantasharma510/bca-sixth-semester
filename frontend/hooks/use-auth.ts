import { useEffect, useState } from "react"
import { authClient } from "@/lib/auth-client"
import type { AuthSession, AuthUser } from "@/lib/auth-client"

type AuthState = {
  session: AuthSession | null
  user: AuthUser | null
  isLoaded: boolean
  isSignedIn: boolean
}

const subscribers = new Set<(state: AuthState) => void>()

const authState: AuthState = {
  session: null,
  user: null,
  isLoaded: false,
  isSignedIn: false,
}

const POLL_INTERVAL_MS = 10000
let pollTimer: ReturnType<typeof setInterval> | null = null
let isFetching = false

const notifySubscribers = () => {
  subscribers.forEach(subscriber => subscriber({ ...authState }))
}

const updateState = (partial: Partial<AuthState>) => {
  Object.assign(authState, partial)
  notifySubscribers()
}

const fetchSession = async () => {
  if (isFetching) return
  isFetching = true
  try {
    const result = await authClient.getSession()
    if (result?.data?.session) {
      updateState({
        session: result.data.session,
        user: result.data.user,
        isSignedIn: true,
        isLoaded: true,
      })
    } else {
      updateState({
        session: null,
        user: null,
        isSignedIn: false,
        isLoaded: true,
      })
    }
  } catch {
    updateState({
      session: null,
      user: null,
      isSignedIn: false,
      isLoaded: true,
    })
  } finally {
    isFetching = false
  }
}

export const refreshAuthSession = async () => {
  await fetchSession()
}

const startPolling = () => {
  if (pollTimer) return
  void fetchSession()
  pollTimer = setInterval(fetchSession, POLL_INTERVAL_MS)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const subscribe = (listener: (state: AuthState) => void) => {
  subscribers.add(listener)
  listener({ ...authState })
  startPolling()
  return () => {
    subscribers.delete(listener)
    if (subscribers.size === 0) {
      stopPolling()
    }
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ ...authState })

  useEffect(() => subscribe(setState), [])

  return state
}

