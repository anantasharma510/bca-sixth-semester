import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Route matchers
const isAdminRoute = (pathname: string) => pathname.startsWith("/admin")
const isProtectedRoute = (pathname: string) => 
  pathname.startsWith("/admin") || 
  pathname.startsWith("/messages") || 
  pathname.startsWith("/bookmarks")
const isSuspendedPage = (pathname: string) => pathname === "/suspended"
const isApiRoute = (pathname: string) => pathname.startsWith("/api") || pathname.startsWith("/trpc")
const isAuthRoute = (pathname: string) => pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up")

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // For API routes, skip middleware
  if (isApiRoute(pathname)) {
    return NextResponse.next()
  }

  // For suspended page, allow access
  if (isSuspendedPage(pathname)) {
    return NextResponse.next()
  }

  // Maintenance mode check
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    const maintenanceRes = await fetch(`${apiUrl}/api/protected/maintenance`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    })
    
    if (maintenanceRes.ok) {
      const maintenanceData = await maintenanceRes.json()
      if (maintenanceData.enabled) {
        // Check if user is admin by verifying session with backend
        try {
          const sessionRes = await fetch(`${apiUrl}/api/protected`, {
            headers: {
              cookie: request.headers.get("cookie") || "",
            },
          })
          
          if (sessionRes.ok) {
            const userData = await sessionRes.json()
            const role = userData.user?.role
            
            // Allow admins to access during maintenance
            if (role === "admin") {
              return NextResponse.next()
            }
          }
        } catch (e) {
          // If session check fails, treat as non-admin
        }
        
        // Non-admins see maintenance page
        return new NextResponse(
          `<!DOCTYPE html><html><head><title>Maintenance</title></head><body style='background:#fff;display:flex;align-items:center;justify-content:center;height:100vh;'><div style='text-align:center;'><h1>Maintenance</h1><p>${maintenanceData.message || "The website is under maintenance."}</p></div></body></html>`,
          {
            status: 503,
            headers: { "content-type": "text/html" },
          }
        )
      }
    }
  } catch (e) {
    // If maintenance check fails, allow access
    console.error('Maintenance check failed:', e)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
