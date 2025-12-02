'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/sidebar';
import { MobileNavigation } from '@/components/mobile-navigation';
import { Header } from '@/components/header';
import { RightSidebar } from '@/components/right-sidebar';
import { BlockedUsersList } from '@/components/blocked-users-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserX, Settings as SettingsIcon, HelpCircle, Trash2, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useProtectedApi } from '@/lib/api';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { callProtectedApi } = useProtectedApi();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone. All your posts, comments, messages, and data will be permanently deleted.'
    );
    
    if (!confirmed) return;

    const finalConfirm = window.confirm(
      'Final confirmation: Are you absolutely sure you want to delete your account? This action is permanent and cannot be undone.'
    );
    
    if (!finalConfirm) return;

    setIsDeleting(true);
    try {
      // Debug logging
      console.log('🔍 Debug: API URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('🔍 Debug: Full URL will be:', `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/protected/account`);
      
      const response = await callProtectedApi('/api/protected/account', {
        method: 'DELETE',
      });
      
      console.log('🔍 Debug: API Response:', response);
      
      if (response.success) {
        alert('Your account has been successfully deleted. You will be signed out automatically.');
        await authClient.signOut();
        router.push('/sign-in');
      }
    } catch (error: any) {
      console.error('❌ Failed to delete account:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      });
      alert(error.message || 'Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />

        <div className="flex-1 flex">
          <div className="flex-1 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center space-x-3 mb-6">
                <SettingsIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Settings
                </h1>
              </div>

              <div className="space-y-6">
                {/* Support Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <HelpCircle className="w-5 h-5" />
                      <span>Support & Help</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                      Need help or have questions? We're here to assist you.
                    </p>
                    <Link 
                      href="/support"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Contact Support
                    </Link>
                  </CardContent>
                </Card>

                {/* Blocked Users Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <UserX className="w-5 h-5" />
                      <span>Blocked Users</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                      Manage users you have blocked. Blocked users cannot see your posts or interact with you.
                    </p>
                    <BlockedUsersList />
                  </CardContent>
                </Card>

                {/* Legal Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                      <FileText className="w-5 h-5" />
                      <span>Legal</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <a
                        href="/terms-of-service"
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Terms of Service</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">View our terms and conditions</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </a>
                      <a
                        href="/privacy-policy"
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Privacy Policy</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Learn how we protect your data</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </a>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Deletion Section */}
                <Card className="border-red-200 dark:border-red-800">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl text-red-600 dark:text-red-400">
                      <Trash2 className="w-5 h-5" />
                      <span>Danger Zone</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {isDeleting ? 'Deleting...' : 'Delete Account'}
                    </button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
} 