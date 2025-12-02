'use client';

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { Header } from "@/components/header";
import { RightSidebar } from "@/components/right-sidebar";
import { Post } from "@/components/post";
import { usePostApi } from "@/lib/api";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function PostPage() {
  const params = useParams();
  const router = useRouter();
  const { getPost } = usePostApi();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const postId = params.id as string;

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId) return;
      
      try {
        setLoading(true);
        const response = await getPost(postId);
        setPost(response.post);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching post:', err);
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId, getPost]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <MobileNavigation />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <Header />
          <div className="flex-1 flex">
            <div className="flex-1 border-r border-gray-200 dark:border-gray-800">
              <div className="p-3 xs:p-4 sm:p-6">
                <Button 
                  variant="ghost" 
                  onClick={handleBack}
                  className="mb-3 xs:mb-4 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4 xs:w-5 xs:h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="text-sm xs:text-base">Back</span>
                </Button>
                <div className="flex items-center justify-center h-48 xs:h-64 sm:h-80">
                  <div className="flex flex-col items-center space-y-3 xs:space-y-4">
                    <Loader2 className="w-6 h-6 xs:w-8 xs:h-8 animate-spin text-blue-500" />
                    <p className="text-sm xs:text-base text-gray-600 dark:text-gray-400">Loading post...</p>
                  </div>
                </div>
              </div>
            </div>
            <RightSidebar />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <MobileNavigation />
        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <Header />
          <div className="flex-1 flex">
            <div className="flex-1 border-r border-gray-200 dark:border-gray-800">
              <div className="p-3 xs:p-4 sm:p-6">
                <Button 
                  variant="ghost" 
                  onClick={handleBack}
                  className="mb-3 xs:mb-4 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4 xs:w-5 xs:h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                  <span className="text-sm xs:text-base">Back</span>
                </Button>
                <div className="flex items-center justify-center h-48 xs:h-64 sm:h-80">
                  <div className="text-center max-w-sm mx-auto">
                    <div className="flex justify-center mb-3 xs:mb-4">
                      <div className="w-12 h-12 xs:w-16 xs:h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 xs:w-8 xs:h-8 text-red-500" />
                      </div>
                    </div>
                    <h2 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2 xs:mb-3">
                      Post Not Found
                    </h2>
                    <p className="text-sm xs:text-base text-gray-600 dark:text-gray-400 mb-4 xs:mb-6 leading-relaxed">
                      {error}
                    </p>
                    <div className="flex flex-col xs:flex-row gap-2 xs:gap-3 justify-center">
                      <Button 
                        onClick={handleBack}
                        variant="outline"
                        className="text-sm xs:text-base"
                      >
                        Go Back
                      </Button>
                      <Button 
                        onClick={() => router.push('/')}
                        className="text-sm xs:text-base"
                      >
                        Go Home
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <RightSidebar />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header />
        <div className="flex-1 flex">
          <div className="flex-1 border-r border-gray-200 dark:border-gray-800">
            <div className="p-3 xs:p-4 sm:p-6">
              <Button 
                variant="ghost" 
                onClick={handleBack}
                className="mb-3 xs:mb-4 group hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 xs:w-5 xs:h-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" />
                <span className="text-sm xs:text-base">Back</span>
              </Button>
              
              {post && (
                <div className="max-w-2xl mx-auto">
                  <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <Post 
                      post={post}
                      onPostUpdate={(updatedPost) => setPost(updatedPost)}
                      onPostDelete={() => router.push('/')}
                    />
                  </div>
                  
                  {/* Related Posts Section - Placeholder for future enhancement */}
                  <div className="mt-6 xs:mt-8 sm:mt-10">
                    <div className="text-center">
                      <h3 className="text-lg xs:text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        More Posts
                      </h3>
                      <p className="text-sm xs:text-base text-gray-600 dark:text-gray-400">
                        Related posts and conversations will appear here
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
} 