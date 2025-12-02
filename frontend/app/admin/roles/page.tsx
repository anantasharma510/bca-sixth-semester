"use client"

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useProtectedApi } from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, User, Crown, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

interface User {
  _id: string;
  username: string;
  email?: string;
  role: string;
  profileImageUrl?: string;
}

export default function AdminRolesPage() {
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

  // Only allow admin to update roles
  const isAdmin = user?.role === "admin";

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdating(userId);
    try {
      const response = await callProtectedApi(`/api/protected/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u))
      );
      
      // Show appropriate toast based on response
      if (response.clerkUpdated) {
        toast({ 
          title: "Role updated successfully", 
          description: "Role updated in both database and Clerk."
        });
      } else {
        toast({ 
          title: "Role updated with warning", 
          description: response.warning || "Role updated in database but failed to update in Clerk.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast({ 
        title: "Failed to update role",
        description: "Please try again or contact support if the issue persists.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default';
      case 'user':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'user':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Role Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage user roles and permissions</p>
        </div>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h3 className="font-semibold">Access Denied</h3>
                <p className="text-sm text-red-500 dark:text-red-400">Only administrators can access this page.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Role Management</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage user roles and permissions across the platform</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Administrators</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <User className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Regular Users</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {users.filter(u => u.role === 'user').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Management</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {updating ? '1' : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <User className="h-5 w-5 text-blue-600" />
            <span>User Roles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="text-gray-600 dark:text-gray-400">Loading users...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop Table */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {u.profileImageUrl ? (
                            <img
                              src={u.profileImageUrl}
                              alt={u.username}
                              className="h-8 w-8 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{u.email || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <Badge variant={getRoleBadgeVariant(u.role)} className={getRoleColor(u.role)}>
                          {getRoleIcon(u.role)}
                          <span className="ml-1 capitalize">{u.role}</span>
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Select
                          value={u.role}
                          disabled={updating === u._id || u._id === user?.id}
                          onValueChange={(value) => handleRoleChange(u._id, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">
                              <div className="flex items-center space-x-2">
                                <User className="h-4 w-4" />
                                <span>User</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center space-x-2">
                                <Crown className="h-4 w-4" />
                                <span>Admin</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {updating === u._id && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600 ml-2" />
                        )}
                        {u._id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">You</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-4">
                {users.map((u) => (
                  <Card key={u._id} className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600">
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {u.profileImageUrl ? (
                              <img
                                src={u.profileImageUrl}
                                alt={u.username}
                                className="h-10 w-10 rounded-full object-cover border border-gray-300 dark:border-gray-700"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                                <User className="h-4 w-4 text-white" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{u.username}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{u.email || 'No email'}</p>
                            </div>
                          </div>
                          {u._id === user?.id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Role:</span>
                            <Badge variant={getRoleBadgeVariant(u.role)} className={getRoleColor(u.role)}>
                              {getRoleIcon(u.role)}
                              <span className="ml-1 capitalize">{u.role}</span>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Select
                              value={u.role}
                              disabled={updating === u._id || u._id === user?.id}
                              onValueChange={(value) => handleRoleChange(u._id, value)}
                            >
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            {updating === u._id && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 