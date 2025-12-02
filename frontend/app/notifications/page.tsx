'use client';

import { Bell, Heart, MessageCircle, Repeat2, UserPlus, Settings, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sidebar } from "@/components/sidebar"
import { MobileNavigation } from "@/components/mobile-navigation"
import { Header } from "@/components/header"
import { useNotifications } from "@/components/notification-provider"
import { useState } from "react"
import { useRouter } from "next/navigation"

// Import the Notification type from the provider
type Notification = {
  _id: string;
  type: 'like' | 'comment' | 'repost' | 'follow' | 'mention';
  sender: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  post?: {
    _id: string;
    content: string;
  };
  comment?: {
    _id: string;
    content: string;
  };
  isRead: boolean;
  createdAt: string;
  timeAgo: string;
};

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "like":
      return <Heart className="w-5 h-5 text-red-500" />
    case "comment":
      return <MessageCircle className="w-5 h-5 text-blue-500" />
    case "repost":
      return <Repeat2 className="w-5 h-5 text-green-500" />
    case "follow":
      return <UserPlus className="w-5 h-5 text-purple-500" />
    default:
      return <Bell className="w-5 h-5 text-gray-500" />
  }
}

const getNotificationText = (type: string) => {
  switch (type) {
    case "like":
      return "liked your post";
    case "comment":
      return "commented on your post";
    case "repost":
      return "reposted your post";
    case "follow":
      return "started following you";
    case "mention":
      return "mentioned you in a post";
    default:
      return "interacted with your content";
  }
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadMoreNotifications,
    hasMoreNotifications
  } = useNotifications();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    // Navigate to the relevant content based on notification type
    switch (notification.type) {
      case 'like':
      case 'comment':
      case 'repost':
        if (notification.post) {
          // Navigate to the post
          router.push(`/post/${notification.post._id}`);
        }
        break;
      case 'follow':
        // Navigate to the sender's profile
        if (notification.sender) {
          router.push(`/profile/${notification.sender._id}`);
        }
        break;
      case 'mention':
        if (notification.post) {
          // Navigate to the post where they were mentioned
          router.push(`/post/${notification.post._id}`);
        }
        break;
      default:
        // For other types, navigate to the sender's profile
        if (notification.sender) {
          router.push(`/profile/${notification.sender._id}`);
        }
        break;
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    setDeletingId(notificationId);
    try {
      await deleteNotification(notificationId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <Header />

        <main className="flex-1 flex flex-col">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800 p-3 xs:p-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg xs:text-xl font-bold text-gray-900 dark:text-white">Notifications</h1>
                <p className="text-xs xs:text-sm text-gray-600 dark:text-gray-400">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
                </p>
              </div>
              <div className="flex items-center space-x-1 xs:space-x-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={markAllAsRead}
                    disabled={isLoading}
                    className="text-xs xs:text-sm"
                  >
                    Mark all as read
                  </Button>
                )}
                {/* <Button variant="ghost" size="sm" className="text-xs xs:text-sm">
                  <Settings className="w-5 h-5" />
                </Button> */}
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex">
              <button className="flex-1 px-2 xs:px-4 py-2 xs:py-3 text-xs xs:text-sm font-medium text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20">
                Notifications
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1">
            {isLoading && notifications.length === 0 ? (
              <div className="p-4 xs:p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 xs:h-8 xs:w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-xs xs:text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 xs:p-8 text-center">
                <Bell className="w-8 h-8 xs:w-12 xs:h-12 text-gray-400 mx-auto mb-3 xs:mb-4" />
                <h3 className="text-base xs:text-lg font-medium text-gray-900 dark:text-white mb-1 xs:mb-2">No notifications yet</h3>
                <p className="text-xs xs:text-sm text-gray-500 dark:text-gray-400">When you get notifications, they'll show up here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-2 xs:p-3 sm:p-4 border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors duration-100 ${
                    !notification.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex space-x-2 xs:space-x-3">
                    <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-shrink-0">
                      <img
                        src={notification.sender?.profileImageUrl || "/placeholder-user.jpg"}
                        alt={notification.sender?.username || "User"}
                        className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-1 xs:gap-x-2">
                        <span className="font-semibold text-xs xs:text-sm sm:text-base text-gray-900 dark:text-white truncate max-w-[120px] xs:max-w-[160px] sm:max-w-[200px]">
                          {notification.sender ? (
                            notification.sender.firstName && notification.sender.lastName
                              ? `${notification.sender.firstName} ${notification.sender.lastName}`
                              : notification.sender.username
                          ) : "Unknown User"}
                        </span>
                        <span className="text-xs xs:text-sm text-gray-600 dark:text-gray-400 truncate max-w-[100px] xs:max-w-[140px] sm:max-w-[180px]">
                          {getNotificationText(notification.type)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 text-[10px] xs:text-xs">·</span>
                        <span className="text-gray-500 dark:text-gray-500 text-[10px] xs:text-xs sm:text-sm truncate">{notification.timeAgo}</span>
                      </div>

                      {notification.post && (
                        <p className="mt-1 text-xs xs:text-sm text-gray-600 dark:text-gray-300 truncate break-all">
                          "{notification.post.content}"
                        </p>
                      )}

                      {notification.comment && (
                        <p className="mt-1 text-xs xs:text-sm text-gray-600 dark:text-gray-300 truncate break-all">
                          "{notification.comment.content}"
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex items-center space-x-1 xs:space-x-2">
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification._id);
                        }}
                        disabled={deletingId === notification._id}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Load More */}
          {hasMoreNotifications && (
            <div className="p-3 xs:p-4 text-center">
              <Button 
                variant="outline" 
                className="w-full text-xs xs:text-sm"
                onClick={loadMoreNotifications}
                disabled={isLoading}
              >
                {isLoading ? 'Loading...' : 'Load More Notifications'}
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
