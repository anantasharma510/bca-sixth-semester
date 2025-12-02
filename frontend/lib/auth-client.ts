import { createAuthClient } from "better-auth/react";

// When using Next.js rewrite rule, baseURL should point to frontend in browser
// The rewrite rule proxies /api/auth/* to the backend, so cookies are set on frontend domain
// In browser: use frontend URL (or undefined for relative)
// On server: use backend URL, plugin will forward cookies
const getBaseURL = () => {
  // In browser, Better Auth will make requests to /api/auth/* which gets rewritten to backend
  // This ensures cookies are set on the frontend domain
  if (typeof window !== "undefined") {
    // Use current origin (frontend) so cookies are set correctly
    return window.location.origin;
  }
  // On server, use backend URL - the plugin will forward cookies from next/headers
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
};

// Create Better Auth client with Next.js plugin for server-side cookie forwarding
export const authClient = createAuthClient({
  baseURL: getBaseURL(), // Frontend URL in browser, backend URL on server
  plugins: [
    {
      id: "next-cookies-request",
      fetchPlugins: [
        {
          id: "next-cookies-request-plugin",
          name: "next-cookies-request-plugin",
          hooks: {
            async onRequest(ctx) {
              // Only add cookies on server-side (not in browser)
              if (typeof window === "undefined") {
                try {
                  const { cookies } = await import("next/headers");
                  const cookieStore = await cookies();
                  const cookieString = cookieStore.toString();
                  
                  if (cookieString) {
                    ctx.headers.set("cookie", cookieString);
                  }
                } catch (error) {
                  // If cookies() fails (e.g., in middleware), continue without cookies
                  console.warn("Failed to get cookies in server context:", error);
                }
              }
            },
          },
        },
      ],
    },
  ],
});

// Export types for TypeScript
export type AuthSession = typeof authClient.$Infer.Session.session;
export type AuthUser = typeof authClient.$Infer.Session.user;

