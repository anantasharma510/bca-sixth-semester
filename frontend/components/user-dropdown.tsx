"use client"

import { useAuth } from "@/hooks/use-auth";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { Moon, Sun, User, LogOut, Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useSyncUserWithBackend } from "@/hooks/use-sync-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

export function UserDropdown() {
  const { isSignedIn, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const { syncStatus } = useSyncUserWithBackend();

  if (!isSignedIn) return null;

  return (
    <div className="flex items-center space-x-4">
      {/* Show syncing status */}
      {syncStatus === 'loading' && (
        <span className="text-blue-500 text-xs animate-pulse">Syncing account...</span>
      )}
      {syncStatus === 'error' && (
        <span className="text-red-500 text-xs">Sync failed</span>
      )}
      {/* Dark mode toggle */}
      <button
        type="button"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        className="flex items-center space-x-2 focus:outline-none"
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? (
          <Moon className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        ) : (
          <Sun className="w-4 h-4 text-gray-700 dark:text-gray-200" />
        )}
        <span className="text-gray-700 dark:text-gray-200 text-sm">{isDark ? "Dark" : "Light"} mode</span>
      </button>
      <Switch checked={isDark} onCheckedChange={() => setTheme(isDark ? "light" : "dark")} />
      {/* Better Auth user dropdown */}
      {isSignedIn && user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.image || undefined} alt={user.name || user.email || "User"} />
                <AvatarFallback>
                  {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.name || "User"}</p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/profile" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
} 