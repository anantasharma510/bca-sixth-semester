'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Monitor, 
  MonitorOff, 
  MessageCircle, 
  Send, 
  PhoneOff,
  Eye,
  Users,
  Clock,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { toast } from '@/hooks/use-toast';
import { useSocket } from './socket-provider';
import { useLiveStreamApi } from '@/lib/api';

interface SimpleLiveStreamProps {
  streamId: string;
  channelName: string;
  token: string;
  uid: number;
  isHost: boolean;
  streamTitle: string;
  hostName: string;
  hostAvatar?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  avatar?: string;
}

const SimpleLiveStream: React.FC<SimpleLiveStreamProps> = ({
  streamId,
  channelName,
  token,
  uid,
  isHost,
  streamTitle,
  hostName,
  hostAvatar
}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const { socket } = useSocket();
  const { endLiveStream } = useLiveStreamApi();

  // Agora SDK state
  const [AgoraRTC, setAgoraRTC] = useState<any>(null);
  const [agoraClient, setAgoraClient] = useState<any>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  // Video/Audio tracks
  const [localCameraTrack, setLocalCameraTrack] = useState<any>(null);
  const [localMicTrack, setLocalMicTrack] = useState<any>(null);
  const [localScreenTrack, setLocalScreenTrack] = useState<any>(null);
  
  // State management
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(isHost);
  const [isMicOn, setIsMicOn] = useState(isHost);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [streamEnded, setStreamEnded] = useState(false);
  const [streamDuration, setStreamDuration] = useState<number | null>(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Video container refs
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  // Load Agora SDK dynamically with better error handling
  useEffect(() => {
    const loadAgoraSDK = async () => {
      try {
        console.log('🔄 Loading Agora SDK...');
        console.log('🌐 Environment:', {
          isDev: process.env.NODE_ENV === 'development',
          url: window.location.href,
          protocol: window.location.protocol
        });
        
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          console.log('❌ Not in browser environment');
          return;
        }

        const AgoraRTCModule = await import('agora-rtc-sdk-ng');
        const SDK = AgoraRTCModule.default || AgoraRTCModule;
        setAgoraRTC(SDK);
        
        // 🔧 FIX: Use 'live' mode for Interactive Live Streaming with host/audience roles
        const client = SDK.createClient({ mode: 'live', codec: 'vp8' });
        setAgoraClient(client);
        setIsSDKLoaded(true);
        
        console.log('✅ Agora SDK loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load Agora SDK:', error);
        toast({
          title: "Loading failed",
          description: "Could not load streaming SDK",
          variant: "destructive"
        });
      }
    };

    loadAgoraSDK();
  }, []);

  // Initialize Agora and join channel
  useEffect(() => {
    if (!isSDKLoaded || !agoraClient || !AgoraRTC) return;

    const initializeAgora = async () => {
      try {
        // Define event handlers inside useEffect to avoid dependency issues
        const handleUserPublished = async (user: any, mediaType: 'video' | 'audio') => {
          console.log('📺 User published:', user.uid, mediaType);
          
          try {
            await agoraClient.subscribe(user, mediaType);
            console.log(`✅ Subscribed to ${mediaType} from user ${user.uid}`);
            
            if (mediaType === 'video') {
              setRemoteUsers(prev => {
                const existing = prev.find(u => u.uid === user.uid);
                if (existing) {
                  return prev.map(u => u.uid === user.uid ? { ...u, videoTrack: user.videoTrack } : u);
                } else {
                  return [...prev, { uid: user.uid, videoTrack: user.videoTrack, audioTrack: user.audioTrack }];
                }
              });

              // Play video in container with error handling
              if (remoteVideoRef.current && user.videoTrack) {
                console.log('🎥 Playing remote video...');
                user.videoTrack.play(remoteVideoRef.current);
                console.log('✅ Remote video is now playing');
              } else {
                console.warn('⚠️ Remote video container not found or no video track');
              }
            }

            if (mediaType === 'audio' && user.audioTrack) {
              console.log('🔊 Playing remote audio...');
              user.audioTrack.play();
              console.log('✅ Remote audio is now playing');
            }
          } catch (error) {
            console.error(`❌ Failed to subscribe to ${mediaType}:`, error);
          }
        };

        const handleUserUnpublished = (user: any, mediaType: 'video' | 'audio') => {
          console.log('📺 User unpublished:', user.uid, mediaType);
          
          if (mediaType === 'video') {
            setRemoteUsers(prev => prev.map(u => 
              u.uid === user.uid ? { ...u, videoTrack: null } : u
            ));
          }
        };

        const handleUserJoined = (user: any) => {
          console.log('👤 User joined:', user.uid, 'isHost:', isHost);
          setRemoteUsers(prev => {
            const existing = prev.find(u => u.uid === user.uid);
            if (!existing) {
              console.log('➕ Adding new remote user:', user.uid);
              return [...prev, { uid: user.uid, videoTrack: null, audioTrack: null }];
            }
            return prev;
          });
          setViewerCount(prev => prev + 1);
        };

        const handleUserLeft = (user: any) => {
          console.log('👤 User left:', user.uid);
          setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
          setViewerCount(prev => Math.max(0, prev - 1));
        };

        // Set up event listeners
        agoraClient.on('user-published', handleUserPublished);
        agoraClient.on('user-unpublished', handleUserUnpublished);
        agoraClient.on('user-joined', handleUserJoined);
        agoraClient.on('user-left', handleUserLeft);

        // Get Agora App ID
        const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
        if (!agoraAppId) {
          throw new Error('NEXT_PUBLIC_AGORA_APP_ID is not set');
        }

        // 🔍 DEBUG: Log exact App ID and compare with backend
        console.log('🆔 Frontend App ID Debug:', {
          appId: agoraAppId,
          appIdLength: agoraAppId.length,
          appIdType: typeof agoraAppId,
          expectedBackend: 'c9566a2bf24941dcb82d39fea282a290',
          matches: agoraAppId === 'c9566a2bf24941dcb82d39fea282a290'
        });

        let finalToken = token;
        let finalUid = uid;

        // 🔧 FIX: For viewers, get a viewer-specific token from backend
        if (!isHost) {
          console.log('👀 Generating viewer-specific token...');
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
            const response = await fetch(`${apiUrl}/api/live-streams/${streamId}/join`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${await (window as any).Clerk?.session?.getToken()}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const viewerData = await response.json();
              finalToken = viewerData.token;
              finalUid = viewerData.uid;
              console.log('✅ Got viewer-specific token:', {
                uid: finalUid,
                tokenLength: finalToken.length
              });
            } else {
              console.error('❌ Failed to get viewer token:', response.status);
              throw new Error('Failed to get viewer token from server');
            }
          } catch (error) {
            console.error('❌ Error getting viewer token:', error);
            throw new Error('Could not authenticate as viewer. Please refresh and try again.');
          }
        }

        // Validate token before joining
        if (!finalToken || finalToken === 'undefined') {
          console.error('❌ No valid token available. Token:', finalToken);
          throw new Error('No valid Agora token available. Please refresh and try again.');
        }

        console.log('🎯 Joining with:', {
          channel: channelName,
          uid: finalUid,
          tokenLength: finalToken ? finalToken.length : 0,
          isHost,
          agoraAppId: agoraAppId
        });

        // Debug: Log exact values being sent to Agora
        console.log('🔍 Agora Join Debug:', {
          appId: agoraAppId,
          channel: channelName,
          token: finalToken?.substring(0, 50) + '...',
          uid: finalUid,
          tokenType: typeof finalToken,
          channelType: typeof channelName,
          uidType: typeof finalUid,
          tokenLength: finalToken?.length,
          isHost: isHost,
          tokenStartsWith: finalToken?.substring(0, 10)
        });

        // 🔍 CRITICAL DEBUG: Test token validity format
        if (finalToken) {
          console.log('🔬 Token Analysis:', {
            isString: typeof finalToken === 'string',
            length: finalToken.length,
            startsWithZero: finalToken.startsWith('007'),
            hasValidChars: /^[A-Za-z0-9+/=]+$/.test(finalToken),
            firstTenChars: finalToken.substring(0, 10),
            lastTenChars: finalToken.substring(finalToken.length - 10)
          });
        }

        // 🔧 FIX: Set client role before joining (CRITICAL for Interactive Live Streaming)
        if (isHost) {
          await agoraClient.setClientRole('host');
          console.log('🎭 Set client role to: HOST');
        } else {
          await agoraClient.setClientRole('audience');
          console.log('🎭 Set client role to: AUDIENCE');
        }

        // Join the channel with timeout
        const joinPromise = agoraClient.join(agoraAppId, channelName, finalToken, finalUid);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000)
        );

        await Promise.race([joinPromise, timeoutPromise]);

        console.log('✅ Joined Agora channel:', channelName, 'as', isHost ? 'HOST' : 'VIEWER', 'with UID:', finalUid);
        setIsJoined(true);

        // If host, create and publish tracks
        if (isHost) {
          console.log('🎥 Host starting local tracks...');
          await startLocalVideo();
          await startLocalAudio();
        } else {
          console.log('👀 Viewer joined, waiting for host tracks...');
        }

        toast({
          title: "Joined stream",
          description: isHost ? "You're now live!" : "You've joined the stream",
        });

      } catch (error: any) {
        console.error('❌ Failed to join Agora channel:', error);
        toast({
          title: "Failed to join",
          description: error?.message || "Could not connect to the stream",
          variant: "destructive"
        });
      }
    };

    initializeAgora();

    // Cleanup on unmount
    return () => {
      leaveChannel();
    };
  }, [isSDKLoaded, agoraClient, AgoraRTC]);

  // Load chat messages
  useEffect(() => {
    const loadChatMessages = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/live-streams/${streamId}/chat`);
        if (response.ok) {
          const data = await response.json();
          setChatMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Failed to load chat messages:', error);
      }
    };

    loadChatMessages();
  }, [streamId]);

  // Socket.IO for chat and real-time updates
  useEffect(() => {
    if (!socket) return;

    socket.emit('joinStream', streamId);

    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
    };

    const handleViewerCountUpdate = (data: { viewerCount: number }) => {
      setViewerCount(data.viewerCount);
    };

    const handleStreamEnded = (data: { streamId: string; hostId: string; duration?: number }) => {
      console.log('🔴 Stream ended:', data);
      setStreamEnded(true);
      if (data.duration) {
        setStreamDuration(data.duration);
      }
      
      // Leave Agora channel gracefully for viewers
      if (!isHost) {
        leaveChannel();
      }
      
      toast({
        title: "Stream ended",
        description: "The host has ended this stream",
        variant: "default"
      });
    };

    socket.on('chatMessage', handleChatMessage);
    socket.on('viewerCountUpdate', handleViewerCountUpdate);
    socket.on('streamEnded', handleStreamEnded);

    return () => {
      socket.emit('leaveStream', streamId);
      socket.off('chatMessage', handleChatMessage);
      socket.off('viewerCountUpdate', handleViewerCountUpdate);
      socket.off('streamEnded', handleStreamEnded);
    };
  }, [socket, streamId]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Event handlers are now defined inside the useEffect to fix dependency issues

  // Local video/audio management
  const startLocalVideo = async () => {
    if (!AgoraRTC || !agoraClient) return;
    
    try {
      console.log('📹 Starting camera...');
      const cameraTrack = await AgoraRTC.createCameraVideoTrack();
      setLocalCameraTrack(cameraTrack);
      
      if (localVideoRef.current) {
        cameraTrack.play(localVideoRef.current);
      }
      
      await agoraClient.publish([cameraTrack]);
      setIsCameraOn(true);
      console.log('✅ Camera started and published');
    } catch (error) {
      console.error('❌ Failed to start camera:', error);
    }
  };

  const startLocalAudio = async () => {
    if (!AgoraRTC || !agoraClient) return;
    
    try {
      console.log('🎤 Starting microphone...');
      const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalMicTrack(micTrack);
      await agoraClient.publish([micTrack]);
      setIsMicOn(true);
      console.log('✅ Microphone started and published');
    } catch (error) {
      console.error('❌ Failed to start microphone:', error);
    }
  };

  const toggleCamera = async () => {
    if (!isHost || !agoraClient || !isJoined) {
      console.log('❌ Cannot toggle camera: Not joined yet');
      return;
    }

    try {
      if (isCameraOn && localCameraTrack) {
        console.log('📹 Turning off camera...');
        await agoraClient.unpublish([localCameraTrack]);
        localCameraTrack.stop();
        localCameraTrack.close();
        setLocalCameraTrack(null);
        setIsCameraOn(false);
      } else {
        console.log('📹 Turning on camera...');
        await startLocalVideo();
      }
    } catch (error) {
      console.error('❌ Failed to toggle camera:', error);
    }
  };

  const toggleMicrophone = async () => {
    if (!isHost || !agoraClient || !isJoined) {
      console.log('❌ Cannot toggle microphone: Not joined yet');
      return;
    }

    try {
      if (isMicOn && localMicTrack) {
        console.log('🎤 Turning off microphone...');
        await agoraClient.unpublish([localMicTrack]);
        localMicTrack.stop();
        localMicTrack.close();
        setLocalMicTrack(null);
        setIsMicOn(false);
      } else {
        console.log('🎤 Turning on microphone...');
        await startLocalAudio();
      }
    } catch (error) {
      console.error('❌ Failed to toggle microphone:', error);
    }
  };

  const toggleScreenShare = async () => {
    if (!isHost || !AgoraRTC || !agoraClient) {
      console.log('❌ Screen share not available:', {
        isHost,
        hasAgoraRTC: !!AgoraRTC,
        hasClient: !!agoraClient
      });
      toast({
        title: "Screen sharing not available",
        description: "Please wait for the stream to initialize",
        variant: "destructive"
      });
      return;
    }

    if (!isJoined) {
      console.log('❌ Cannot screen share: not joined yet');
      toast({
        title: "Please wait",
        description: "Connecting to stream...",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isScreenSharing && localScreenTrack) {
        // Stop screen sharing
        console.log('🖥️ Stopping screen share...');
        await agoraClient.unpublish([localScreenTrack]);
        localScreenTrack.stop();
        localScreenTrack.close();
        setLocalScreenTrack(null);
        setIsScreenSharing(false);

        // Restart camera if it was on before
        if (isCameraOn) {
          console.log('📹 Restarting camera after screen share...');
          await startLocalVideo();
        }

        toast({
          title: "Screen sharing stopped",
          description: "Switched back to camera",
        });
      } else {
        // Start screen sharing
        console.log('🖥️ Starting screen share...');
        
        // Stop and unpublish camera first
        if (localCameraTrack) {
          console.log('📹 Stopping camera for screen share...');
          await agoraClient.unpublish([localCameraTrack]);
          localCameraTrack.stop();
          localCameraTrack.close();
          setLocalCameraTrack(null);
        }

        // Create and publish screen track
        const screenTrack = await AgoraRTC.createScreenVideoTrack();
        setLocalScreenTrack(screenTrack);

        // Play screen share in local video container
        if (localVideoRef.current) {
          screenTrack.play(localVideoRef.current);
        }

        // Publish the screen track
        await agoraClient.publish([screenTrack]);
        setIsScreenSharing(true);

        console.log('✅ Screen sharing started successfully');
        toast({
          title: "Screen sharing started",
          description: "You're now sharing your screen",
        });
      }
    } catch (error) {
      console.error('❌ Failed to toggle screen share:', error);
      toast({
        title: "Screen share failed",
        description: `Could not start screen sharing: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const endStream = async () => {
    if (!isHost) return;

    try {
      console.log('🔴 Ending stream:', streamId);
      
      // Show loading state
      toast({
        title: "Ending stream...",
        description: "Please wait while we end your stream",
      });

      // Call backend API to end the stream
      await endLiveStream(streamId);
      
      console.log('✅ Stream ended successfully on backend');
      
      // Leave the Agora channel
      await leaveChannel();
      
      toast({
        title: "Stream ended",
        description: "Your stream has been ended successfully",
      });

      // Redirect back to live streams page
      window.location.href = '/live';
    } catch (error) {
      console.error('❌ Failed to end stream:', error);
      toast({
        title: "Failed to end stream",
        description: `Could not end stream: ${(error as any)?.message || 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };

  const leaveChannel = async () => {
    try {
      // Stop all local tracks
      if (localCameraTrack) {
        localCameraTrack.stop();
        localCameraTrack.close();
      }
      if (localMicTrack) {
        localMicTrack.stop();
        localMicTrack.close();
      }
      if (localScreenTrack) {
        localScreenTrack.stop();
        localScreenTrack.close();
      }

      // Leave the channel
      await agoraClient.leave();
      setIsJoined(false);
      console.log('✅ Left Agora channel');
    } catch (error) {
      console.error('❌ Failed to leave channel:', error);
    }
  };

  // Chat functions
  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    socket.emit('streamChatMessage', {
      streamId,
      message: newMessage.trim()
    });

    setNewMessage('');
  };

  const formatTimestamp = (timestamp: any): string => {
    try {
      if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString();
      }
      if (typeof timestamp === 'string' || typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleTimeString();
      }
      return new Date().toLocaleTimeString();
    } catch (error) {
      return new Date().toLocaleTimeString();
    }
  };

  // Show loading state while SDK is loading
  if (!isSDKLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white bg-black">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 border-b-2 border-white rounded-full animate-spin"></div>
          <h2 className="mb-2 text-xl font-semibold">Loading Stream...</h2>
          <p className="text-gray-400">Initializing video streaming</p>
        </div>
      </div>
    );
  }

  // Show stream ended UI
  if (streamEnded) {
    const formatDuration = (seconds: number) => {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
      } else if (mins > 0) {
        return `${mins}m ${secs}s`;
      } else {
        return `${secs}s`;
      }
    };

    return (
      <div className="min-h-screen text-white bg-black">
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-2xl mx-4 text-center">
            <div className="p-8 bg-gray-900 rounded-lg shadow-2xl">
              {/* Stream Ended Icon */}
              <div className="flex items-center justify-center w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full">
                <PhoneOff className="w-10 h-10 text-red-600" />
              </div>
              
              {/* Main Message */}
              <h1 className="mb-4 text-3xl font-bold">Stream Ended</h1>
              <p className="mb-6 text-lg text-gray-400">
                {isHost ? "You have ended your stream" : `${hostName} has ended this stream`}
              </p>
              
              {/* Stream Info */}
              <div className="p-4 mb-6 bg-gray-800 rounded-lg">
                <h3 className="mb-2 text-xl font-semibold">{streamTitle}</h3>
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                  {streamDuration && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Duration: {formatDuration(streamDuration)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>Peak viewers: {viewerCount}</span>
                  </div>
                </div>
              </div>

              {/* Host Avatar & Name */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={hostAvatar} />
                  <AvatarFallback>{hostName[0]}</AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-semibold">{hostName}</p>
                  <p className="text-sm text-gray-400">Stream Host</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button 
                  onClick={() => window.location.href = '/live'}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Browse Other Streams
                </Button>
                
                {isHost && (
                  <Button 
                    onClick={() => window.location.href = '/live/my-streams'}
                    variant="outline"
                    className="px-6 py-3 text-gray-300 border-gray-600 hover:bg-gray-800"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    My Streams
                  </Button>
                )}
              </div>

              {/* Thank You Message */}
              <div className="pt-6 mt-6 border-t border-gray-800">
                <p className="text-sm text-gray-500">
                  {isHost 
                    ? "Thank you for streaming! Check your stream analytics in your dashboard." 
                    : "Thanks for watching! Follow the host to get notified of future streams."
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-black">
      <div className="flex flex-col h-screen lg:flex-row">
        {/* Video Area */}
        <div className="relative flex-1 bg-gray-900">
          {/* Stream Header */}
          <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/70 to-transparent">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-red-500">
                  <AvatarImage src={hostAvatar} />
                  <AvatarFallback>{hostName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-bold">{streamTitle}</h1>
                  <p className="text-gray-300">{hostName}</p>
                </div>
                <Badge variant="destructive" className="animate-pulse">LIVE</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-black/50">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">{viewerCount}</span>
                </div>
                
                {/* Connection Status */}
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs ${
                  isJoined ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isJoined ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                  }`}></div>
                  <span>{isJoined ? 'Connected' : 'Connecting...'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Video Content */}
          <div className="flex items-center justify-center h-full">
            {isHost ? (
              // Host view - show local video/screen
              <div ref={localVideoRef} className="flex items-center justify-center w-full h-full bg-gray-800">
                {!isCameraOn && !isScreenSharing && (
                  <div className="text-center">
                    <VideoOff className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-400">Camera is off</p>
                  </div>
                )}
              </div>
            ) : (
              // Viewer view - show remote video
              <div className="w-full h-full">
                {/* 🔧 FIX: Always render video container */}
                <div className="relative w-full h-full bg-gray-800">
                  <div ref={remoteVideoRef} className="w-full h-full">
                    {/* Remote video will be played here */}
                  </div>
                  {remoteUsers.length > 0 && remoteUsers.some(user => user.videoTrack) ? (
                    <div className="absolute px-3 py-1 rounded top-4 left-4 bg-black/50">
                      <span className="text-sm text-white">
                        Host is live • {remoteUsers.length} connected
                      </span>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg text-gray-400">Waiting for the host to start...</p>
                      <p className="mt-2 text-sm text-gray-500">
                        Connected users: {remoteUsers.length} • 
                        {isJoined ? ' You are connected' : ' Connecting...'}
                      </p>
                      <p className="mt-1 text-xs text-gray-600">
                        Debug: Channel={channelName.slice(-8)}, UID={uid}, IsHost={isHost ? 'Yes' : 'No'}
                      </p>
                      {remoteUsers.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm text-yellow-400">
                            Host is online but camera/screen share is off
                          </p>
                          <p className="text-xs text-gray-600">
                            Remote UIDs: {remoteUsers.map(u => u.uid).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Control Bar */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
            <div className="flex justify-center gap-3">
              {isHost && (
                <>
                  <Button
                    variant={isMicOn ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleMicrophone}
                    disabled={!isJoined}
                    title={!isJoined ? "Connecting to stream..." : "Toggle microphone"}
                  >
                    {isMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant={isCameraOn ? "secondary" : "destructive"}
                    size="sm"
                    onClick={toggleCamera}
                    disabled={!isJoined}
                    title={!isJoined ? "Connecting to stream..." : "Toggle camera"}
                  >
                    {isCameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant={isScreenSharing ? "destructive" : "secondary"}
                    size="sm"
                    onClick={toggleScreenShare}
                    disabled={!isJoined}
                    title={!isJoined ? "Connecting to stream..." : "Toggle screen share"}
                  >
                    {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={endStream}
                  >
                    <PhoneOff className="w-4 h-4" />
                    End Stream
                  </Button>
                </>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChat(!showChat)}
                className="lg:hidden"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </Button>
            </div>
          </div>
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="flex flex-col w-full bg-gray-900 border-l border-gray-700 lg:w-80">
            <div className="p-4 border-b border-gray-700">
              <h3 className="flex items-center gap-2 font-semibold">
                <MessageCircle className="w-5 h-5" />
                Live Chat
                <Badge variant="outline" className="ml-auto">
                  {chatMessages.length}
                </Badge>
              </h3>
            </div>
            
            <div className="flex flex-col flex-1">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                <div className="space-y-3">
                  {chatMessages.map((msg, index) => (
                    <div key={msg.id || `msg-${index}-${msg.timestamp}`} className="flex gap-2">
                      <Avatar className="flex-shrink-0 w-6 h-6">
                        <AvatarImage src={msg.avatar} alt={msg.username} />
                        <AvatarFallback className="text-xs font-semibold">
                          {msg.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-blue-400">
                            {msg.username}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(msg.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 break-words">
                          {msg.message}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800 border-gray-600"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    size="sm" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleLiveStream;

