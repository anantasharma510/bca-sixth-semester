import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"
import { ThemeProvider } from "@/lib/theme-context"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { ClientAdminGuard } from "@/components/admin/client-admin-guard"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "AIRWIG - Social Media Platform",
  description: "A modern social media platform",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  console.log('🔍 AdminLayout: Rendering admin layout')
  
  return (
    <ClientAdminGuard>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <AdminHeader />
          <main className="flex-1 p-4 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </ClientAdminGuard>
  )
}