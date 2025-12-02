import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { SuspensionCheck } from "@/components/suspension-check"
import MaintenanceCheck from "@/components/maintenance-check"
import { SocketProvider } from "@/components/socket-provider"
import { NotificationProvider } from "@/components/notification-provider"
import { BlockEventsHandler } from "@/components/block-events-handler"
import { RealTimeUpdatesHandler } from "@/components/real-time-updates-handler"
import { VideoManagerProvider } from "@/components/video-manager"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AIRWIG - Social Media Platform",
  description: "Connect, share, and discover with AIRWIG",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground overflow-x-hidden`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MaintenanceCheck />
          <SuspensionCheck />
          <SocketProvider>
            <NotificationProvider>
              <BlockEventsHandler />
              <RealTimeUpdatesHandler />
              <VideoManagerProvider>
                <div className="flex flex-col">
                  {children}
                </div>
              </VideoManagerProvider>
            </NotificationProvider>
          </SocketProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
} 