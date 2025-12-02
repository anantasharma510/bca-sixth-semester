/* 
 * COMMENTED OUT - Live streaming API service disabled
 * This file contains API methods for interacting with live streams using Agora.io
 * To re-enable, uncomment this file and restore the backend routes
 */

// Placeholder exports to prevent import errors
export interface CreateLiveStreamParams {
  title: string;
  description?: string;
  isPrivate?: boolean;
  category?: string;
  tags?: string[];
  thumbnail?: {
    uri: string;
    type: string;
    name: string;
  };
}

export interface LiveStream {
  _id: string;
  hostId: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  agoraChannelName: string;
  agoraToken: string;
  agoraUid: number;
  agoraAppId?: string;
  viewerCount: number;
  startedAt?: string;
  createdAt: string;
}

export interface CreateLiveStreamResponse {
  message: string;
  liveStream: LiveStream;
  appId?: string;
}

export interface JoinStreamResponse {
  token: string;
  uid: number;
  channelName: string;
  appId: string;
}

class LiveStreamsAPI {
  async createLiveStream(token: string | undefined, params: CreateLiveStreamParams): Promise<CreateLiveStreamResponse> {
    throw new Error('Live streaming is disabled. API methods are not available.');
  }

  async getLiveStreams(token: string | undefined, page: number = 1, limit: number = 20, status: string = 'live') {
    throw new Error('Live streaming is disabled. API methods are not available.');
  }

  async getLiveStream(token: string | undefined, streamId: string) {
    throw new Error('Live streaming is disabled. API methods are not available.');
  }

  async joinLiveStream(token: string | undefined, streamId: string): Promise<JoinStreamResponse> {
    throw new Error('Live streaming is disabled. API methods are not available.');
  }

  async leaveLiveStream(token: string | undefined, streamId: string) {
    throw new Error('Live streaming is disabled. API methods are not available.');
  }

  async endLiveStream(token: string | undefined, streamId: string) {
    throw new Error('Live streaming is disabled. API methods are not available.');
  }
}

export const liveStreamsAPI = new LiveStreamsAPI();
