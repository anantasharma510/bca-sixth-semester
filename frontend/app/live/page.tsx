'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/mobile-navigation";
import { Header } from "@/components/header";

import { LiveStreamCard } from "@/components/live-stream-card";
import { CreateLiveStreamModal } from "@/components/create-live-stream-modal";
import StreamingGuide from "@/components/streaming-guide";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Search, 
  Radio, 
  Clock, 
  Archive, 
  Settings, 
  Play,
  Users,
  Zap,
  Eye,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { useLiveStreamApi } from "@/lib/api";
import { useSmartToast } from "@/hooks/use-toast";
import { useSocket } from "@/components/socket-provider";

const categories = [
  "Gaming", "Music", "Talk Show", "Educational", "Sports", "Entertainment", 
  "Technology", "Art", "Cooking", "Fitness", "News", "Other"
];

export default function LiveStreamsPage() {
  const { user, isLoaded } = useAuth();
  const userId = user?._id ?? user?.id ?? user?.userId;
  const router = useRouter();
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("live");
  const [showGuide, setShowGuide] = useState(false);
  
  const { getLiveStreams } = useLiveStreamApi();
  const { toast } = useSmartToast();
  const { socket } = useSocket();

  const fetchStreams = async () => {
    try {
      setLoading(true);
      const response = await getLiveStreams({
        status: activeTab as any,
        category: selectedCategory && selectedCategory !== "all" ? selectedCategory : undefined,
        limit: 20
      });
      // Backend returns { streams }, not { liveStreams }
      setStreams(response.streams || response.liveStreams || []);
    } catch (error: any) {
      console.error('Error fetching streams:', error);
      toast({
        title: "Failed to load streams",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [activeTab, selectedCategory]);

  // Listen for stream updates via socket
  useEffect(() => {
    if (!socket) return;

    const handleStreamUpdated = (data: { streamId: string; stream: any }) => {
      console.log('📡 Stream updated event received:', data);
      // Update the stream in the list if it exists
      setStreams(prev => {
        const index = prev.findIndex(s => s._id === data.streamId || s.id === data.streamId);
        if (index >= 0) {
          // Update existing stream
          const updated = [...prev];
          updated[index] = { ...updated[index], ...data.stream };
          return updated;
        } else if (data.stream.status === activeTab) {
          // Add new stream if it matches the current tab
          return [data.stream, ...prev];
        }
        return prev;
      });
    };

    socket.on('stream-updated', handleStreamUpdated);

    return () => {
      socket.off('stream-updated', handleStreamUpdated);
    };
  }, [socket, activeTab]);

  const filteredStreams = streams.filter(stream =>
    stream.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    stream.hostId.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStreamCreated = (newStream: any) => {
    if (newStream.status === activeTab) {
      setStreams(prev => [newStream, ...prev]);
    }
    toast({
      title: "Stream created successfully!",
      description: newStream.status === 'live' ? "Redirecting to your stream..." : "Your stream has been scheduled.",
    });
    
    // Redirect to the streaming interface immediately after creation
    if (newStream._id || newStream.id) {
      const streamId = newStream._id || newStream.id;
      setTimeout(() => {
        router.push(`/live/${streamId}`);
      }, 1000); // Small delay to show the toast
    }
  };

  // Get stats for different tabs
  const liveCount = streams.filter(s => s.status === 'live').length;
  const scheduledCount = streams.filter(s => s.status === 'scheduled').length;
  const endedCount = streams.filter(s => s.status === 'ended').length;
  const totalViewers = streams.filter(s => s.status === 'live').reduce((sum, stream) => sum + (stream.viewerCount || 0), 0);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-32 h-32 border-b-2 rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f6f6] dark:bg-gray-900">
      <Sidebar />
      <MobileNavigation />

      {/* Main content area - positioned to account for fixed sidebar */}
      <div className="flex flex-col min-h-screen pb-16 lg:ml-64 lg:pb-0">
        <Header />

        <div className="flex flex-1">
          {/* Main content - full width without right sidebar */}
          <div className="flex flex-col flex-1">
            <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
              <div className="container px-4 py-4 mx-auto space-y-6 max-w-7xl sm:py-8 sm:space-y-8">
        
        {/* Hero Section - Mobile Optimized */}
        <div className="space-y-4 text-center sm:space-y-6">
          <div className="space-y-2 sm:space-y-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl md:text-4xl lg:text-5xl">
              Live Streams
            </h1>
            <p className="max-w-xl mx-auto text-sm text-gray-600 dark:text-gray-400 sm:text-base lg:text-lg px-4">
              Watch live content from creators around the world or start your own stream
            </p>
          </div>

          {/* Mobile Optimized Action Buttons */}
          <div className="flex flex-col items-center justify-center gap-2 px-4 sm:flex-row sm:gap-3">
            {userId ? (
              <>
                <CreateLiveStreamModal 
                  onStreamCreated={handleStreamCreated}
                  trigger={
                    <Button size="lg" className="gap-2 px-6 text-white bg-blue-600 hover:bg-blue-700 w-full sm:w-auto sm:px-8">
                      <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
                      Start Streaming
                    </Button>
                  }
                />
                
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/live/my-streams')}
                  className="gap-2 px-6 text-gray-700 border-gray-300 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 w-full sm:w-auto sm:px-8"
                >
                  <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  My Streams
                </Button>
              </>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-gray-500">Sign in to start streaming</p>
                <Button 
                  size="lg" 
                  onClick={() => router.push('/sign-in')}
                  className="gap-2 px-8"
                >
                  <Users className="w-5 h-5" />
                  Sign In
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Stats Dashboard - Mobile Optimized */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
          <Card className="transition-shadow bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-md">
            <CardContent className="p-4 text-center sm:p-6 lg:p-8">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full dark:bg-red-900/30 sm:w-14 sm:h-14 lg:w-16 lg:h-16 sm:mb-4">
                <Radio className="w-6 h-6 text-red-600 dark:text-red-400 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              </div>
              <div className="mb-1 text-2xl font-bold text-red-700 dark:text-red-400 sm:text-3xl">{liveCount}</div>
              <div className="text-sm font-medium text-red-600 dark:text-red-400 sm:text-base">Live Now</div>
              {liveCount > 0 && (
                <div className="mt-2 text-xs text-red-500 dark:text-red-400">Click any stream to watch!</div>
              )}
            </CardContent>
          </Card>

          <Card className="transition-shadow bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-md">
            <CardContent className="p-4 text-center sm:p-6 lg:p-8">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-blue-100 rounded-full dark:bg-blue-900/30 sm:w-14 sm:h-14 lg:w-16 lg:h-16 sm:mb-4">
                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              </div>
              <div className="mb-1 text-2xl font-bold text-blue-700 dark:text-blue-400 sm:text-3xl">{totalViewers}</div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400 sm:text-base">People Watching</div>
              {totalViewers > 0 && (
                <div className="mt-2 text-xs text-blue-500 dark:text-blue-400">Join them now!</div>
              )}
            </CardContent>
          </Card>

          <Card className="transition-shadow bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:shadow-md sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 text-center sm:p-6 lg:p-8">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full dark:bg-green-900/30 sm:w-14 sm:h-14 lg:w-16 lg:h-16 sm:mb-4">
                <Camera className="w-6 h-6 text-green-600 dark:text-green-400 sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
              </div>
              <div className="mb-1 text-2xl font-bold text-green-700 dark:text-green-400 sm:text-3xl">Start</div>
              <div className="text-sm font-medium text-green-600 dark:text-green-400 sm:text-base">Your Stream</div>
              <div className="mt-3">
                <CreateLiveStreamModal 
                  onStreamCreated={handleStreamCreated}
                  trigger={
                    <Button size="sm" className="text-white bg-green-600 hover:bg-green-700 w-full sm:w-auto">
                      Go Live
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Commented out scheduled stats */}
          {/* <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 bg-blue-200 rounded-full">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-blue-700">{scheduledCount}</div>
              <div className="text-sm text-blue-600">Scheduled</div>
            </CardContent>
          </Card> */}
        </div>

        {/* Search and Navigation - Mobile Optimized */}
        <Card className="bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 dark:text-gray-500 left-3 top-1/2 sm:w-5 sm:h-5" />
                <Input
                  placeholder="Search streams, creators..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10 text-base text-gray-900 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:bg-white dark:focus:bg-gray-600 dark:text-white sm:h-12 sm:pl-12 sm:text-lg"
                />
              </div>
              
              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                {["all", ...categories.slice(0, 4)].map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className={`h-8 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm ${
                      selectedCategory === category 
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {category === "all" ? "All" : category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stream Tabs - Mobile Optimized */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 h-12 sm:h-14">
            <TabsTrigger 
              value="live" 
              className="flex items-center justify-center gap-1 text-sm data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-900/30 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 text-gray-600 dark:text-gray-400 sm:gap-2 sm:text-base"
            >
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse sm:w-2 sm:h-2"></div>
                <Radio className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Live Now ({liveCount})</span>
                <span className="sm:hidden">Live ({liveCount})</span>
              </div>
            </TabsTrigger>
            
            {/* Commented out scheduled for now */}
            {/* <TabsTrigger 
              value="scheduled" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700"
            >
              <Clock className="w-4 h-4" />
              Upcoming ({scheduledCount})
            </TabsTrigger> */}
            
            <TabsTrigger 
              value="ended" 
              className="flex items-center gap-2 text-base data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
            >
              <Archive className="w-4 h-4" />
              Recent Streams ({endedCount})
            </TabsTrigger>
          </TabsList>

          {/* Live Streams */}
          <TabsContent value="live" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-t-lg aspect-video" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="w-2/3 h-3 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredStreams.length > 0 ? (
              <>
                <div className="mb-8 text-center">
                  <h2 className="flex items-center justify-center gap-3 mb-2 text-3xl font-bold">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    Live Now
                  </h2>
                  <p className="mb-4 text-gray-600">Click any stream to watch live video and chat</p>
                  <Badge variant="destructive" className="gap-1 px-4 py-2 text-base">
                    <Zap className="w-4 h-4" />
                    {filteredStreams.length} people streaming
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredStreams.map((stream) => (
                    <div key={stream._id} className="transition-all transform cursor-pointer group hover:scale-105">
                      <LiveStreamCard 
                        stream={stream}
                      />
                      <div className="mt-2 text-center transition-opacity opacity-0 group-hover:opacity-100">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Play className="w-3 h-3" />
                          Watch Live
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <Card className="border-2 border-gray-300 border-dashed">
                <CardContent className="p-12 space-y-4 text-center">
                  <div className="flex items-center justify-center w-20 h-20 mx-auto bg-red-100 rounded-full">
                    <Radio className="w-10 h-10 text-red-600" />
                  </div>
                  <h3 className="text-2xl font-bold">No Live Streams</h3>
                  <p className="max-w-md mx-auto text-gray-600">
                    {searchQuery ? "No streams match your search. Try different keywords." : "Be the first to go live and share your content!"}
                  </p>
                  {userId && !searchQuery && (
                    <CreateLiveStreamModal 
                      onStreamCreated={handleStreamCreated}
                      trigger={
                        <Button size="lg" className="gap-2 mt-4">
                          <Camera className="w-5 h-5" />
                          Start Your First Stream
                        </Button>
                      }
                    />
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

                      {/* Scheduled Streams - Commented out for now */}
            {/* <TabsContent value="scheduled" className="space-y-6">
              {loading ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <div className="bg-gray-200 rounded-t-lg aspect-video" />
                      <CardContent className="p-4 space-y-2">
                        <div className="h-4 bg-gray-200 rounded" />
                        <div className="w-2/3 h-3 bg-gray-200 rounded" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredStreams.length > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Upcoming Streams</h2>
                    <Badge variant="outline" className="gap-1 px-3 py-1">
                      <Clock className="w-3 h-3" />
                      {filteredStreams.length} scheduled
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredStreams.map((stream) => (
                      <LiveStreamCard 
                        key={stream._id} 
                        stream={stream}
                        onClick={() => router.push(`/live/${stream._id}`)}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <Card className="border-2 border-gray-300 border-dashed">
                  <CardContent className="p-12 space-y-4 text-center">
                    <div className="flex items-center justify-center w-20 h-20 mx-auto bg-blue-100 rounded-full">
                      <Clock className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-2xl font-bold">No Scheduled Streams</h3>
                    <p className="text-gray-600">Check back later for upcoming streams</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent> */}

          {/* Past Streams */}
          <TabsContent value="ended" className="space-y-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="bg-gray-200 rounded-t-lg aspect-video" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="w-2/3 h-3 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredStreams.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Stream Replays</h2>
                  <Badge variant="outline" className="gap-1 px-3 py-1">
                    <Archive className="w-3 h-3" />
                    {filteredStreams.length} available
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredStreams.map((stream) => (
                    <LiveStreamCard 
                      key={stream._id} 
                      stream={stream}
                    />
                  ))}
                </div>
              </>
            ) : (
              <Card className="border-2 border-gray-300 border-dashed">
                <CardContent className="p-12 space-y-4 text-center">
                  <div className="flex items-center justify-center w-20 h-20 mx-auto bg-purple-100 rounded-full">
                    <Archive className="w-10 h-10 text-purple-600" />
                  </div>
                  <h3 className="text-2xl font-bold">No Past Streams</h3>
                  <p className="text-gray-600">Past streams and replays will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* How to Stream Guide */}
        {userId && (
          <Card className="text-white border-0 bg-gradient-to-r from-blue-600 to-purple-600">
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Ready to Stream?</h3>
                  <p className="text-blue-100">
                    Create amazing live content and connect with your audience in real-time
                  </p>
                </div>
                              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowGuide(true)}
                  className="gap-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  How to Stream
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/live/my-streams')}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Stream Manager
                </Button>
                <CreateLiveStreamModal 
                  onStreamCreated={handleStreamCreated}
                  trigger={
                    <Button variant="secondary" className="gap-2 text-blue-600 bg-white hover:bg-gray-100">
                      <Radio className="w-4 h-4" />
                      Go Live
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  }
                />
              </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Streaming Guide Modal */}
        <StreamingGuide 
          isOpen={showGuide} 
          onClose={() => setShowGuide(false)} 
        />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}