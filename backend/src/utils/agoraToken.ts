// Use agora-access-token for better ES module compatibility
import * as AgoraToken from 'agora-access-token';

// RtcRole constants
const RtcRole = AgoraToken.RtcRole || {
  PUBLISHER: 1,
  SUBSCRIBER: 2
};

const RtcTokenBuilder = AgoraToken.RtcTokenBuilder;

// Agora configuration
const AGORA_APP_ID = process.env.AGORA_APP_ID;
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;

if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
  console.error('❌ Agora configuration missing. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE environment variables.');
}

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
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    console.error('❌ Agora configuration not set. Please check your environment variables:');
    console.error('   AGORA_APP_ID:', AGORA_APP_ID ? 'Set' : 'Missing');
    console.error('   AGORA_APP_CERTIFICATE:', AGORA_APP_CERTIFICATE ? 'Set' : 'Missing');
    throw new Error('Agora configuration not set');
  }

  try {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    console.log(`🎬 Generating Agora token for channel: ${channelName}, UID: ${uid}, Role: ${role}`);
    console.log(`📋 Token params: AppID: ${AGORA_APP_ID?.substring(0, 8)}..., Channel: ${channelName}, UID: ${uid}`);

    // agora-access-token uses 6 parameters (not 7 like agora-token)
    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs
    );

    console.log(`✅ Agora token generated successfully: ${token.substring(0, 20)}...`);
    console.log(`⏰ Token expires at: ${new Date(privilegeExpiredTs * 1000).toISOString()}`);
    return token;
  } catch (error) {
    console.error('❌ Error generating Agora token:', error);
    throw new Error(`Failed to generate Agora token: ${error}`);
  }
}

export function generateChannelName(hostId: string): string {
  // Agora channel name requirements:
  // - Max 64 bytes
  // - Only: a-z, A-Z, 0-9, space, !, #, $, %, &, (, ), +, -, :, ;, <, =, ., >, ?, @, [, ], ^, _, {, }, |, ~, ,
  
  // Use only the last 8 characters of hostId for brevity
  const shortHostId = hostId.slice(-8);
  
  // Generate a shorter timestamp (last 6 digits)
  const shortTimestamp = Date.now().toString().slice(-6);
  
  // Generate a short random ID (6 characters)
  const randomId = Math.random().toString(36).substring(2, 8);
  
  // Result format: "live_ABC12345_123456_xyz789" (max ~25 characters)
  return `live_${shortHostId}_${shortTimestamp}_${randomId}`;
}

export function generateRandomUid(): number {
  return Math.floor(Math.random() * 1000000) + 1;
}