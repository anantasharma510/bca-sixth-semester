"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Sidebar } from '@/components/sidebar';
import { MobileNavigation } from '@/components/mobile-navigation';
import { Header } from '@/components/header';
import { useLiveStreamApi } from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import StreamManagementControls from '@/components/stream-management-controls';
import { CreateLiveStreamModal } from '@/components/create-live-stream-modal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Radio, 
  Calendar, 
  Archive, 
  Plus,
  Video
} from 'lucide-react';

export default function MyStreamsPage() {
  const { user } = useAuth();
  const userId = user?._id ?? user?.id ?? user?.userId;
  const { getUserStreams } = useLiveStreamApi();
  
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchUserStreams();
  }, [userId]);

  const fetchUserStreams = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await getUserStreams(userId);
      console.log('API Response:', response); // Debug log
      
      // Handle the response structure - backend returns { streams: [], pagination: {} }
      const userStreams = response.streams || response || [];
      setStreams(Array.isArray(userStreams) ? userStreams : []);
    } catch (error: any) {
      console.error('Error fetching user streams:', error);
      toast({
        title: "Failed to load streams",
        description: "Could not fetch your streams",
        variant: "destructive"
      });
      setStreams([]); // Ensure streams is always an array
    } finally {
      setLoading(false);
    }
  };

  const handleStreamCreated = (newStream: any) => {
    setStreams(prev => [newStream, ...prev]);
    toast({
      title: "Stream created!",
      description: newStream.scheduledAt ? "Your stream has been scheduled." : "Redirecting to your stream...",
    });
    
    // Redirect to the streaming interface if it's a live stream
    if (!newStream.scheduledAt && (newStream._id || newStream.id)) {
      const streamId = newStream._id || newStream.id;
      setTimeout(() => {
        window.location.href = `/live/${streamId}`;
      }, 1000); // Small delay to show the toast
    }
  };

  const handleStreamUpdated = (updatedStream: any) => {
    setStreams(prev => prev.map(stream => 
      stream._id === updatedStream._id ? updatedStream : stream
    ));
  };

  const handleStreamDeleted = (streamId: string) => {
    setStreams(prev => prev.filter(stream => stream._id !== streamId));
  };

  const filterStreams = (status?: string) => {
    // Safety check to ensure streams is always an array
    if (!Array.isArray(streams)) {
      console.warn('Streams is not an array:', streams);
      return [];
    }
    
    if (!status || status === 'all') return streams;
    return streams.filter(stream => stream.status === status);
  };

  const liveStreams = filterStreams('live');
  const scheduledStreams = filterStreams('scheduled');
  const endedStreams = filterStreams('ended');

  const getTabCounts = () => ({
    all: streams.length,
    live: liveStreams.length,
    scheduled: scheduledStreams.length,
    ended: endedStreams.length
  });

  const tabCounts = getTabCounts();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f6] dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      {/* Main content area - positioned to account for fixed sidebar */}
      <div className="flex flex-col min-h-screen lg:ml-64 pb-16 lg:pb-0">
        <Header />

        <div className="flex flex-1">
          {/* Main content - full width */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
              <div className="container mx-auto px-4 py-4 max-w-7xl space-y-6 sm:py-8 sm:space-y-8">
        {/* Header - Mobile Optimized */}
        <div className="text-center space-y-3 sm:space-y-4">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center sm:w-12 sm:h-12">
              <Video className="w-5 h-5 text-white sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl lg:text-4xl">
              Stream Manager
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto px-4 sm:text-base lg:text-lg">
            Create, manage, and monitor all your live streams in one place
          </p>
          
          <div className="flex justify-center">
            <CreateLiveStreamModal 
              onStreamCreated={handleStreamCreated}
              trigger={
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6 w-full sm:w-auto sm:px-8">
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Create New Stream
                </Button>
              }
            />
          </div>
        </div>

        {/* Stats Dashboard - Mobile Optimized */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 sm:text-sm">Live Now</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400 sm:text-2xl lg:text-3xl">{tabCounts.live}</p>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full sm:p-3">
                <Radio className="w-4 h-4 text-red-600 dark:text-red-400 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            {tabCounts.live > 0 && (
              <div className="mt-2 flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-500 dark:bg-red-400 rounded-full animate-pulse sm:w-2 sm:h-2"></div>
                <span className="text-xs text-red-600 dark:text-red-400">Broadcasting</span>
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 sm:text-sm">Scheduled</p>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-400 sm:text-2xl lg:text-3xl">{tabCounts.scheduled}</p>
              </div>
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full sm:p-3">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            {tabCounts.scheduled > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Upcoming streams</p>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 dark:text-purple-400 sm:text-sm">Completed</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-400 sm:text-2xl lg:text-3xl">{tabCounts.ended}</p>
              </div>
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full sm:p-3">
                <Archive className="w-4 h-4 text-purple-600 dark:text-purple-400 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            {tabCounts.ended > 0 && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">Available replays</p>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow sm:p-6 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 sm:text-sm">Total Streams</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400 sm:text-2xl lg:text-3xl">{tabCounts.all}</p>
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full sm:p-3">
                <Camera className="w-4 h-4 text-green-600 dark:text-green-400 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
              </div>
            </div>
            {tabCounts.all > 0 && (
              <p className="text-xs text-green-600 mt-2">All time</p>
            )}
          </div>
        </div>

        {/* Stream Management Tabs - Simplified */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-white border shadow-sm">
            <TabsTrigger 
              value="all" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-gray-100"
            >
              All My Streams
              {tabCounts.all > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tabCounts.all}
                </Badge>
              )}
            </TabsTrigger>
            
            <TabsTrigger 
              value="live" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-red-100 data-[state=active]:text-red-700"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <Radio className="w-4 h-4" />
                Live Now
              </div>
              {tabCounts.live > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {tabCounts.live}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Commented out scheduled for now */}
            {/* <TabsTrigger 
              value="scheduled" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
            >
              <Calendar className="w-4 h-4" />
              Scheduled
              {tabCounts.scheduled > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {tabCounts.scheduled}
                </Badge>
              )}
            </TabsTrigger> */}
            
            <TabsTrigger 
              value="ended" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <Archive className="w-4 h-4" />
              Past Streams
              {tabCounts.ended > 0 && (
                <Badge variant="outline" className="ml-1">
                  {tabCounts.ended}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* All Streams */}
          <TabsContent value="all" className="space-y-6">
            {streams.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Video className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">No streams yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  Start your streaming journey! Create your first live stream and connect with your audience.
                </p>
                <CreateLiveStreamModal 
                  onStreamCreated={handleStreamCreated}
                  trigger={
                    <Button size="lg" className="gap-2">
                      <Plus className="w-5 h-5" />
                      Create Your First Stream
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="space-y-4">
                {streams.map(stream => (
                  <StreamManagementControls
                    key={stream._id}
                    stream={stream}
                    isHost={true}
                    onStreamUpdated={handleStreamUpdated}
                    onStreamDeleted={() => handleStreamDeleted(stream._id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

        {/* Live Streams */}
        <TabsContent value="live" className="space-y-4">
          {liveStreams.length === 0 ? (
            <div className="text-center py-12 bg-red-50 rounded-lg">
              <Radio className="w-16 h-16 mx-auto text-red-400 mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">No live streams</h3>
              <p className="text-red-500">You don't have any active live streams</p>
            </div>
          ) : (
            liveStreams.map(stream => (
              <StreamManagementControls
                key={stream._id}
                stream={stream}
                isHost={true}
                onStreamUpdated={handleStreamUpdated}
                onStreamDeleted={() => handleStreamDeleted(stream._id)}
              />
            ))
          )}
        </TabsContent>

        {/* Scheduled Streams - Commented out for now */}
        {/* <TabsContent value="scheduled" className="space-y-4">
          {scheduledStreams.length === 0 ? (
            <div className="text-center py-12 bg-blue-50 rounded-lg">
              <Calendar className="w-16 h-16 mx-auto text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold text-blue-600 mb-2">No scheduled streams</h3>
              <p className="text-blue-500">Schedule a stream for later</p>
            </div>
          ) : (
            scheduledStreams.map(stream => (
              <StreamManagementControls
                key={stream._id}
                stream={stream}
                isHost={true}
                onStreamUpdated={handleStreamUpdated}
                onStreamDeleted={() => handleStreamDeleted(stream._id)}
              />
            ))
          )}
        </TabsContent> */}

        {/* Ended Streams */}
        <TabsContent value="ended" className="space-y-4">
          {endedStreams.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Archive className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No past streams</h3>
              <p className="text-gray-500">Your completed streams will appear here</p>
            </div>
          ) : (
            endedStreams.map(stream => (
              <StreamManagementControls
                key={stream._id}
                stream={stream}
                isHost={true}
                onStreamUpdated={handleStreamUpdated}
                onStreamDeleted={() => handleStreamDeleted(stream._id)}
              />
            ))
          )}
        </TabsContent>
        </Tabs>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
