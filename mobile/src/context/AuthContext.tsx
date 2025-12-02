import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { apiClient } from '../services/api/client';
import type { Session } from '../lib/auth-client';
import type { User } from '../types/api';

interface AuthContextValue {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: (User & { id?: string }) | any | null;
  backendUser: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clerkUser: (User & { id?: string }) | any | null;
  userId?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sessionQuery = authClient.useSession?.({
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const sessionInfo = useMemo(() => {
    const data = sessionQuery?.data as any;
    if (!data) {
      return { session: null as Session | null, user: null as any };
    }

    const session =
      data?.session ||
      data?.data?.session ||
      (data?.data ? data.data : null);

    const user =
      data?.user ||
      data?.data?.user ||
      session?.user ||
      null;

    return {
      session: session || null,
      user: user || null,
    };
  }, [sessionQuery?.data]);

  const [backendUser, setBackendUser] = useState<User | null>(null);

  const fetchBackendUser = useCallback(async () => {
    try {
      if (!sessionInfo.user) {
        setBackendUser(null);
        return;
      }

      const response = await apiClient.get<{ user: User }>('/protected');
      setBackendUser(response.user);
    } catch (error) {
      console.error('Failed to fetch backend user:', error);
    }
  }, [sessionInfo.user?.id]);

  useEffect(() => {
    fetchBackendUser();
  }, [fetchBackendUser]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
      await sessionQuery?.refetch?.();
      setBackendUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }, [sessionQuery]);

  const refreshUser = useCallback(async () => {
    try {
      await sessionQuery?.refetch?.();
    } catch (error) {
      console.error('Failed to refresh session:', error);
    }
    await fetchBackendUser();
  }, [sessionQuery, fetchBackendUser]);

  const errorMessage =
    sessionQuery?.error instanceof Error
      ? sessionQuery.error.message
      : null;

  const derivedUser = backendUser || sessionInfo.user || null;

  const value = useMemo<AuthContextValue>(() => ({
    isSignedIn: Boolean(derivedUser),
    isLoaded: !sessionQuery?.isPending,
    user: derivedUser,
    backendUser,
    session: sessionInfo.session,
    isLoading: Boolean(sessionQuery?.isPending),
    error: errorMessage,
    signOut,
    refreshUser,
    clerkUser: derivedUser,
    userId: derivedUser?.id,
  }), [
    derivedUser,
    backendUser,
    sessionInfo.session,
    sessionQuery?.isPending,
    errorMessage,
    signOut,
    refreshUser,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

