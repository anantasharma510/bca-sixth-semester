"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProtectedApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, User, Mail, Calendar } from "lucide-react";

interface User {
  _id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastActivityAt: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profileImageUrl?: string;
}

export default function AdminUsersPage() {
  const { callProtectedApi } = useProtectedApi();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch all users
  useEffect(() => {
    callProtectedApi("/api/protected/admin/users")
      .then((data) => {
        setUsers(data.users);
      })
      .catch((error) => {
        console.error('Failed to fetch users:', error);
        toast({ title: "Failed to fetch users" });
      })
      .finally(() => setLoading(false));
  }, [callProtectedApi]);

  // Only allow admin to manage users
  const isAdmin = user?.role === "admin";

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'suspended') => {
    setUpdating(userId);
    try {
      await callProtectedApi(`/api/protected/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
      );
      toast({ 
        title: `User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully` 
      });
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast({ title: "Failed to update user status" });
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="p-3 xs:p-4 sm:p-8">
        <div className="flex items-center space-x-2 text-red-500">
          <AlertTriangle className="w-4 h-4 xs:w-5 xs:h-5" />
          <span className="text-xs xs:text-sm">Access denied. Admins only.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 xs:p-4 sm:p-8">
      <div className="mb-4 xs:mb-6">
        <h1 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <p className="text-xs xs:text-sm text-gray-600 dark:text-gray-400 mt-1 xs:mt-2">
          Manage all users on the platform
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 xs:py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 xs:h-8 xs:w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-xs xs:text-sm text-gray-600 dark:text-gray-400">Loading users...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card Layout */}
          <div className="block sm:hidden space-y-3">
            {users.map((u) => (
              <div key={u._id} className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-3 xs:p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10">
                      {u.profileImageUrl ? (
                        <img
                          src={u.profileImageUrl}
                          alt={u.firstName || u.username}
                          className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.firstName && u.lastName 
                          ? `${u.firstName} ${u.lastName}` 
                          : u.username
                        }
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{u.username}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1">
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                      {u.role}
                    </Badge>
                    <Badge 
                      variant={u.status === 'active' ? 'default' : 'destructive'}
                      className="flex items-center space-x-1 text-xs"
                    >
                      {u.status === 'active' ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <AlertTriangle className="w-3 h-3" />
                      )}
                      <span className="capitalize">{u.status}</span>
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <Mail className="w-3 h-3 mr-2 text-gray-400" />
                    <span className="truncate">{u.email || 'No email'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                      <div className="font-medium text-gray-900 dark:text-white">{u.postCount}</div>
                      <div className="text-gray-500 dark:text-gray-400">Posts</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                      <div className="font-medium text-gray-900 dark:text-white">{u.followerCount}</div>
                      <div className="text-gray-500 dark:text-gray-400">Followers</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                      <div className="font-medium text-gray-900 dark:text-white">{u.followingCount}</div>
                      <div className="text-gray-500 dark:text-gray-400">Following</div>
                    </div>
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400">
                    <Calendar className="w-3 h-3 mr-2" />
                    <span className="text-xs">{formatDate(u.createdAt)}</span>
                  </div>
                </div>
                
                {u._id !== user?.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    {u.status === 'active' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(u._id, 'suspended')}
                        disabled={updating === u._id}
                        className="w-full text-red-600 border-red-600 hover:bg-red-50 text-xs"
                      >
                        {updating === u._id ? 'Suspending...' : 'Suspend User'}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(u._id, 'active')}
                        disabled={updating === u._id}
                        className="w-full text-green-600 border-green-600 hover:bg-green-50 text-xs"
                      >
                        {updating === u._id ? 'Activating...' : 'Activate User'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden sm:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Stats
                    </th>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 xs:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {u.profileImageUrl ? (
                              <img
                                src={u.profileImageUrl}
                                alt={u.firstName || u.username}
                                className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {u.firstName && u.lastName 
                                ? `${u.firstName} ${u.lastName}` 
                                : u.username
                              }
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{u.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900 dark:text-white">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          {u.email || 'No email'}
                        </div>
                      </td>
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap">
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={u.status === 'active' ? 'default' : 'destructive'}
                          className="flex items-center space-x-1"
                        >
                          {u.status === 'active' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          <span className="capitalize">{u.status}</span>
                        </Badge>
                      </td>
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="space-y-1">
                          <div>Posts: {u.postCount}</div>
                          <div>Followers: {u.followerCount}</div>
                          <div>Following: {u.followingCount}</div>
                        </div>
                      </td>
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2" />
                          {formatDate(u.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 xs:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {u._id !== user?.id && (
                          <div className="space-y-2">
                            {u.status === 'active' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(u._id, 'suspended')}
                                disabled={updating === u._id}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                {updating === u._id ? 'Suspending...' : 'Suspend'}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(u._id, 'active')}
                                disabled={updating === u._id}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                {updating === u._id ? 'Activating...' : 'Activate'}
                              </Button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-8 xs:py-12">
          <User className="mx-auto h-8 w-8 xs:h-12 xs:w-12 text-gray-400" />
          <h3 className="mt-2 text-sm xs:text-base font-medium text-gray-900 dark:text-white">No users found</h3>
          <p className="mt-1 text-xs xs:text-sm text-gray-500 dark:text-gray-400">
            There are no users in the system yet.
          </p>
        </div>
      )}
    </div>
  );
}
