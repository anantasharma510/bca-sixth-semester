"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Clock, Users, Play } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

interface LiveStreamCardProps {
  stream: {
    _id: string;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    status: 'scheduled' | 'live' | 'ended' | 'cancelled';
    scheduledAt?: string;
    startedAt?: string;
    viewerCount: number;
    category?: string;
    tags?: string[];
    hostId: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      profileImageUrl?: string;
    };
  };
}

export function LiveStreamCard({ stream }: LiveStreamCardProps) {
  const isLive = stream.status === 'live';
  const isScheduled = stream.status === 'scheduled';
  
  const getStatusColor = () => {
    switch (stream.status) {
      case 'live': return 'bg-error-500';
      case 'scheduled': return 'bg-primary-500';
      case 'ended': return 'bg-neutral-500';
      default: return 'bg-neutral-500';
    }
  };

  const getStatusText = () => {
    switch (stream.status) {
      case 'live': return 'LIVE';
      case 'scheduled': return 'SCHEDULED';
      case 'ended': return 'ENDED';
      default: return stream.status.toUpperCase();
    }
  };

  const formatTime = () => {
    if (isScheduled && stream.scheduledAt) {
      return `Starts ${formatDistanceToNow(new Date(stream.scheduledAt), { addSuffix: true })}`;
    }
    if (isLive && stream.startedAt) {
      return `Started ${formatDistanceToNow(new Date(stream.startedAt), { addSuffix: true })}`;
    }
    return '';
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* Thumbnail */}
        <div className="aspect-video bg-neutral-200 relative overflow-hidden">
          {stream.thumbnailUrl ? (
            <img 
              src={stream.thumbnailUrl} 
              alt={stream.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200">
              <Play className="w-12 h-12 text-neutral-400" />
            </div>
          )}
          
          {/* Status badge */}
          <Badge 
            className={`absolute top-2 left-2 text-white ${getStatusColor()}`}
          >
            {getStatusText()}
          </Badge>
          
          {/* Viewer count for live streams */}
          {isLive && (
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {stream.viewerCount.toLocaleString()}
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={stream.hostId?.profileImageUrl || '/placeholder-user.jpg'} />
              <AvatarFallback>
                {stream.hostId?.firstName?.[0] || stream.hostId?.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                {stream.title}
              </h3>
              
              <p className="text-sm text-neutral-600 mb-1">
                {stream.hostId?.firstName && stream.hostId?.lastName 
                  ? `${stream.hostId.firstName} ${stream.hostId.lastName}`
                  : stream.hostId?.username || 'Unknown User'
                }
              </p>
              
              {formatTime() && (
                <div className="flex items-center gap-1 text-xs text-neutral-500">
                  <Clock className="w-3 h-3" />
                  {formatTime()}
                </div>
              )}
            </div>
          </div>

          {stream.description && (
            <p className="text-sm text-neutral-600 mt-2 line-clamp-2">
              {stream.description}
            </p>
          )}

          {/* Tags */}
          {stream.tags && stream.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {stream.tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {stream.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{stream.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <Link href={`/live/${stream._id}`} className="w-full">
            <Button 
              className="w-full" 
              variant={isLive ? "default" : "outline"}
              disabled={stream.status === 'ended' || stream.status === 'cancelled'}
            >
              {isLive && (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Watch Live
                </>
              )}
              {isScheduled && (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  View Details
                </>
              )}
              {stream.status === 'ended' && 'Stream Ended'}
              {stream.status === 'cancelled' && 'Stream Cancelled'}
            </Button>
          </Link>
        </CardFooter>
      </div>
    </Card>
  );
}
