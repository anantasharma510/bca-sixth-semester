/*
 * COMMENTED OUT - Agora token generation disabled
 * This file contains Agora.io token generation utilities
 * To re-enable live streaming, uncomment this file
 */
/*
import { RtcTokenBuilder } from 'agora-access-token';

// RtcRole constants (from agora-access-token package)
const RtcRole = {
  PUBLISHER: 1,
  SUBSCRIBER: 2
};

// Agora configuration - Hardcoded
const AGORA_APP_ID = '670301f1ef7f4cfaab9c716044a9748c';
const AGORA_APP_CERTIFICATE = '6f46e04b835e4d0c8ae57f37156ce792';

export interface AgoraTokenOptions {
  channelName: string;
  uid: number;
  role?: 'publisher' | 'subscriber';
  expirationTimeInSeconds?: number;
}

export function generateAgoraToken({
  channelName,
  uid,
  role = 'publisher',
  expirationTimeInSeconds = 3600
}: AgoraTokenOptions): string {
  // ... implementation commented out ...
}

export function generateChannelName(hostId: string): string {
  // ... implementation commented out ...
}

export function generateRandomUid(): number {
  return Math.floor(Math.random() * 1000000) + 1;
}
*/
// Placeholder exports to prevent import errors
export function generateAgoraToken(options) {
    throw new Error('Live streaming is disabled. Agora token generation is not available.');
}
export function generateChannelName(hostId) {
    throw new Error('Live streaming is disabled. Channel name generation is not available.');
}
export function generateRandomUid() {
    throw new Error('Live streaming is disabled. UID generation is not available.');
}
