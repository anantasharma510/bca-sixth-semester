"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLiveStreamApi } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import SimpleLiveStream from "@/components/simple-live-stream";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Clock, Video } from "lucide-react";

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const streamId = params.streamId as string;
  const [stream, setStream] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { getLiveStream } = useLiveStreamApi();
  const { user } = useAuth();
  const userId = user?._id ?? user?.id ?? user?.userId;

  useEffect(() => {
    const fetchStream = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getLiveStream(streamId);
        // Backend returns { stream }, not { liveStream }
        setStream(response.stream || response.liveStream);
      } catch (error: any) {
        console.error('Error fetching stream:', error);
        setError(error.message || 'Failed to load stream');
        toast({
          title: "Failed to load stream",
          description: "Stream not found or unavailable",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (streamId) {
      fetchStream();
    }
  }, [streamId, getLiveStream]);

  // Check if user is the host
  const isHost = stream && userId && (userId === stream.hostId?._id || userId === stream.hostId);
  const isLive = stream?.status === 'live';
  const isScheduled = stream?.status === 'scheduled';
  const isEnded = stream?.status === 'ended';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-white rounded-full animate-spin"></div>
          <p>Loading stream...</p>
        </div>
      </div>
    );
  }

  if (!stream || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center text-white">
          <h1 className="mb-4 text-2xl font-bold">Stream Not Found</h1>
          <p className="mb-6 text-gray-400">
            {error || "The stream you're looking for doesn't exist or has been removed."}
          </p>
          <Button 
            onClick={() => router.push('/live')}
            variant="outline"
          >
            Back to Live Streams
          </Button>
        </div>
      </div>
    );
  }

  // If stream is not live and not host, show preview
  if (!isLive && !isHost) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle>Stream Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              {stream.thumbnailUrl && (
                <img 
                  src={stream.thumbnailUrl} 
                  alt={stream.title}
                  className="object-cover w-full mb-4 rounded-lg aspect-video"
                />
              )}
              <h2 className="text-lg font-bold">{stream.title}</h2>
              <p className="text-gray-600">{stream.description}</p>
            </div>
            
            <div className="flex justify-center">
              <Badge variant={isScheduled ? "secondary" : "outline"}>
                {isScheduled ? "Scheduled" : isEnded ? "Ended" : "Not Live"}
              </Badge>
            </div>
            
            {isScheduled && stream.scheduledAt && (
              <div className="text-sm text-center text-gray-500">
                <Clock className="inline w-4 h-4 mr-1" />
                Starts {new Date(stream.scheduledAt).toLocaleString()}
              </div>
            )}
            
            <Button 
              onClick={() => router.push('/live')}
              className="w-full"
              variant="outline"
            >
              Back to Live Streams
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show full streaming interface for live streams or host
  if ((isLive || isHost) && stream.agoraChannelName && stream.agoraToken) {
    // Generate unique UID for each user
    const uniqueUid = isHost 
      ? stream.agoraUid || 0  // Host uses stream's UID
      : Math.floor(Math.random() * 1000000) + 100000; // Viewer gets random UID

    console.log('🎯 Stream UID assignment:', {
      isHost,
      streamUid: stream.agoraUid,
      assignedUid: uniqueUid,
      channelName: stream.agoraChannelName,
      tokenAvailable: !!stream.agoraToken,
      tokenLength: stream.agoraToken?.length || 0
    });

    // Debug: Log actual token value and type
    console.log('🔍 Token Debug:', {
      tokenType: typeof stream.agoraToken,
      tokenValue: stream.agoraToken?.substring(0, 50) + '...',
      isUndefined: stream.agoraToken === undefined,
      isNull: stream.agoraToken === null,
      isStringUndefined: stream.agoraToken === 'undefined'
    });

    // Validate required Agora fields
    if (!stream.agoraToken) {
      return (
        <div className="flex items-center justify-center min-h-screen text-white bg-black">
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
              <Video className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold">Stream Configuration Error</h2>
            <p className="max-w-md text-gray-400">
              This stream is missing required configuration. Please contact the host.
            </p>
            <Button onClick={() => router.push('/live')} variant="outline">
              Back to Streams
            </Button>
          </div>
        </div>
      );
    }

    return (
      <SimpleLiveStream
        streamId={streamId}
        channelName={stream.agoraChannelName}
        token={stream.agoraToken}
        uid={uniqueUid}
        isHost={isHost}
        streamTitle={stream.title || 'Untitled Stream'}
        hostName={
          stream.hostId?.firstName && stream.hostId?.lastName 
            ? `${stream.hostId.firstName} ${stream.hostId.lastName}`
            : stream.hostId?.username || 'Unknown Host'
        }
        hostAvatar={stream.hostId?.profileImageUrl}
      />
    );
  }

  // Fallback (should not reach here)
  return null;
}
