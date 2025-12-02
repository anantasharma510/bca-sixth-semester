import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { authClient } from '../lib/auth-client';
import { io, Socket } from 'socket.io-client';
import { AppState } from 'react-native';
import { resolveApiBaseUrl, resolveBackendBaseUrl } from '../config/env';

const API_BASE_URL = resolveApiBaseUrl();
const SOCKET_BASE_URL = resolveBackendBaseUrl();

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinPost: (postId: string) => void;
  leavePost: (postId: string) => void;
  joinConversations: (conversationIds: string[]) => void;
  leaveConversations: (conversationIds: string[]) => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

// Singleton socket service
class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();
  private joinedPosts: Set<string> = new Set();
  private joinedConversations: Set<string> = new Set();
  private lastCookies: string | null = null;
  private appStateListener: any = null;
  private connectionBlocked = false;
  private backoffTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  private constructor() {
    // Listen for app state changes
    this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  private handleAppStateChange(nextAppState: string): void {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      console.log('App going to background, pausing socket');
      this.pauseConnection();
    } else if (nextAppState === 'active' && this.lastCookies && !this.connectionBlocked) {
      console.log('App coming to foreground, resuming socket');
      this.resumeConnection();
    }
  }

  private pauseConnection(): void {
    if (this.socket && this.socket.connected) {
      this.socket.disconnect();
    }
  }

  private async resumeConnection(): Promise<void> {
    // Don't resume if connection is blocked (e.g., due to auth failure)
    if (this.connectionBlocked) {
      console.log('📱 Connection blocked, not resuming');
      return;
    }
    
    if (this.lastCookies && !this.isConnected && !this.connectionBlocked) {
      try {
        const cookies = this.lastCookies;
        await this._connect(() => Promise.resolve(cookies));
      } catch (error: any) {
        console.error('Failed to resume socket connection:', error);
        // If it's an auth error, block further attempts
        if (error?.message?.includes('Authentication failed') || 
            error?.message?.includes('No cookies provided')) {
          this.connectionBlocked = true;
          this.lastCookies = null;
        }
      }
    }
  }

  public async connect(getCookies: () => Promise<string | null>): Promise<void> {
    if (this.connectionPromise || this.connectionBlocked) {
      return this.connectionPromise || Promise.resolve();
    }

    this.connectionPromise = this._connect(getCookies);
    return this.connectionPromise;
  }

  private async _connect(getCookies: () => Promise<string | null>): Promise<void> {
    try {
      const cookies = await getCookies();
      if (!cookies) {
        throw new Error('No cookies available');
      }

      // If we have an existing socket with different cookies, disconnect it
      if (this.socket && this.lastCookies !== cookies) {
        this.socket.disconnect();
        this.socket = null;
        this.isConnected = false;
      }

      // If we already have a connected socket with the same cookies, don't create a new one
      if (this.socket && this.socket.connected && this.lastCookies === cookies) {
        return;
      }

      this.lastCookies = cookies;

      this.socket = io(SOCKET_BASE_URL, {
        extraHeaders: {
          Cookie: cookies,
        },
        withCredentials: true,
        transports: ['polling', 'websocket'],
        upgrade: true,
        reconnection: false, // Disable automatic reconnection to prevent spam
        timeout: 60000, // 60 seconds - increased for media uploads
        forceNew: true,
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.connectionBlocked = false;
        this.reconnectAttempts = 0;
        this.notifyConnectionListeners(true);
        console.log('📱 Mobile socket connected');
        
        // 🔧 CRITICAL FIX: Auto-rejoin all tracked conversations after reconnection
        // This prevents the messaging real-time issue when socket reconnects during/after media uploads
        if (this.joinedConversations.size > 0 && this.socket) {
          const conversationIds = Array.from(this.joinedConversations);
          console.log('📱 Auto-rejoining conversations after reconnect:', conversationIds);
          this.socket.emit('joinConversations', conversationIds);
        }
        
        // 🔧 FIX: Auto-rejoin all tracked posts after reconnection
        if (this.joinedPosts.size > 0 && this.socket) {
          console.log('📱 Auto-rejoining posts after reconnect:', Array.from(this.joinedPosts));
          this.joinedPosts.forEach(postId => {
            this.socket!.emit('joinPost', postId);
          });
        }
        
        // Clear any existing backoff
        if (this.backoffTimeout) {
          clearTimeout(this.backoffTimeout);
          this.backoffTimeout = null;
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        console.log('📱 Mobile socket disconnected:', reason);
        
        // Only attempt reconnection for network issues, not server disconnects
        if ((reason === 'transport close' || reason === 'ping timeout') && !this.connectionBlocked) {
          this.scheduleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        this.isConnected = false;
        this.notifyConnectionListeners(false);
        console.error('📱 Mobile socket connection error:', error);
        
        // Check if it's an authentication error
        const isAuthError = error.message.includes('Authentication failed') || 
                           error.message.includes('No cookies provided') ||
                           error.message.includes('Session expired') ||
                           error.message.includes('Invalid session');
        
        if (isAuthError) {
          console.log('📱 Authentication failed - stopping reconnection attempts');
          this.connectionBlocked = true;
          this.reconnectAttempts = this.maxReconnectAttempts; // Stop retrying
          // Clear the last cookies since they're invalid
          this.lastCookies = null;
          return; // Don't attempt to reconnect with invalid cookies
        }
        
        if (error.message.includes('Maximum connections exceeded')) {
          console.log('📱 Connection limit reached, implementing backoff');
          this.connectionBlocked = true;
          
          // Extract retry time from error if available
          const retryAfter = (error as any).retryAfter || 30;
          
          // Implement backoff before allowing next connection attempt
          this.backoffTimeout = setTimeout(() => {
            this.connectionBlocked = false;
            console.log('📱 Connection backoff period ended');
          }, retryAfter * 1000);
          
          return; // Don't attempt to reconnect
        }
        
        // For other errors (network issues), schedule reconnect with backoff
        if (!this.connectionBlocked) {
          this.scheduleReconnect();
        }
      });

      // Wait for connection
      return new Promise<void>((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket not initialized'));

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 60000); // 60 seconds - match socket timeout

        this.socket.on('connect', () => {
          clearTimeout(timeout);
          resolve(undefined);
        });

        this.socket.on('connect_error', (error) => {
          clearTimeout(timeout);
          // Don't reject on connection limit errors, just resolve
          if (error.message.includes('Maximum connections exceeded')) {
            resolve(undefined);
          } else if (error.message.includes('Authentication failed') || 
                     error.message.includes('No cookies provided') ||
                     error.message.includes('Session expired') ||
                     error.message.includes('Invalid session')) {
            // For auth errors, reject and stop trying
            this.connectionBlocked = true;
            this.lastCookies = null;
            reject(error);
          } else {
            reject(error);
          }
        });
      });
    } catch (error) {
      console.error('Failed to connect socket:', error);
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.connectionBlocked) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('📱 Max reconnect attempts reached, stopping reconnection');
      }
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`📱 Scheduling reconnect attempt ${this.reconnectAttempts} in ${backoffMs}ms`);
    
    // Don't schedule reconnect if we don't have a token
    if (!this.lastCookies) {
      console.log('📱 No cookies available, stopping reconnection');
      this.connectionBlocked = true;
      return;
    }
    
    setTimeout(() => {
      if (!this.isConnected && !this.connectionBlocked && this.lastCookies) {
        // Only reconnect if we still have valid cookies
        this._connect(() => Promise.resolve(this.lastCookies));
      }
    }, backoffMs);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.joinedPosts.clear();
    this.joinedConversations.clear();
    this.lastCookies = null;
    this.notifyConnectionListeners(false);
  }

  public resetConnectionBlock(): void {
    // Reset connection block when user re-authenticates
    this.connectionBlocked = false;
    this.reconnectAttempts = 0;
    console.log('📱 Connection block reset - ready to reconnect');
  }

  public cleanup(): void {
    this.disconnect();
    if (this.appStateListener) {
      this.appStateListener?.remove();
      this.appStateListener = null;
    }
    this.connectionListeners.clear();
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  public off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  public joinPost(postId: string): void {
    if (!this.socket || !this.isConnected) return;
    if (!this.joinedPosts.has(postId)) {
      this.socket.emit('joinPost', postId);
      this.joinedPosts.add(postId);
    }
  }

  public leavePost(postId: string): void {
    if (!this.socket || !this.isConnected) return;
    if (this.joinedPosts.has(postId)) {
      this.socket.emit('leavePost', postId);
      this.joinedPosts.delete(postId);
    }
  }

  public joinConversations(conversationIds: string[]): void {
    if (!this.socket || !this.isConnected) return;
    
    const newConversations = conversationIds.filter(id => !this.joinedConversations.has(id));
    if (newConversations.length > 0) {
      this.socket.emit('joinConversations', newConversations);
      newConversations.forEach(id => this.joinedConversations.add(id));
    }
  }

  public leaveConversations(conversationIds: string[]): void {
    if (!this.socket || !this.isConnected) return;
    
    const conversationsToLeave = conversationIds.filter(id => this.joinedConversations.has(id));
    if (conversationsToLeave.length > 0) {
      // Note: Backend doesn't have a leaveConversations event, so we just remove from tracking
      // The socket will automatically leave rooms when it disconnects
      conversationsToLeave.forEach(id => this.joinedConversations.delete(id));
    }
  }

  public leaveAllConversations(): void {
    if (!this.socket || !this.isConnected) return;
    
    // Clear all tracked conversations
    this.joinedConversations.clear();
  }

  public addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.add(listener);
  }

  public removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.delete(listener);
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => listener(connected));
  }
}

export const useSocket = (): SocketContextType => {
  const { isSignedIn } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketService = useRef(SocketService.getInstance());
  const connectionListenerRef = useRef<((connected: boolean) => void) | null>(null);

  useEffect(() => {
    const connectSocket = async () => {
      try {
        // Reset connection block when user signs in (in case it was blocked from previous session)
        socketService.current.resetConnectionBlock();
        
        // Get cookies from Better Auth
        const getCookies = async (): Promise<string | null> => {
          try {
            return authClient.getCookie() || null;
          } catch (error) {
            console.error('Failed to get cookies:', error);
            return null;
          }
        };
        
        const cookies = await getCookies();
        if (!cookies) {
          console.log('📱 No cookies available, skipping socket connection');
          return;
        }
        await socketService.current.connect(getCookies);
      } catch (error: any) {
        console.error('Failed to connect socket:', error);
        // If it's an auth error, don't keep retrying
        if (error?.message?.includes('Authentication failed') || 
            error?.message?.includes('No cookies provided') ||
            error?.message?.includes('Session expired')) {
          console.log('📱 Authentication error - will not retry until user re-authenticates');
        }
      }
    };

    // Create connection listener
    connectionListenerRef.current = (connected: boolean) => {
      setIsConnected(connected);
    };

    // Add listener and get current state
    socketService.current.addConnectionListener(connectionListenerRef.current);
    setIsConnected(socketService.current.getIsConnected());

    // Connect if signed in and not already connected
    if (isSignedIn && !socketService.current.getIsConnected()) {
      connectSocket();
    } else if (!isSignedIn) {
      // Disconnect when user signs out
      socketService.current.disconnect();
    }

    return () => {
      // Remove listener on cleanup
      if (connectionListenerRef.current) {
        socketService.current.removeConnectionListener(connectionListenerRef.current);
      }
    };
  }, [isSignedIn]);

  // Cleanup on unmount or when app is terminated
  useEffect(() => {
    return () => {
      if (connectionListenerRef.current) {
        socketService.current.removeConnectionListener(connectionListenerRef.current);
      }
    };
  }, []);

  const joinPost = useCallback((postId: string) => {
    socketService.current.joinPost(postId);
  }, []);

  const leavePost = useCallback((postId: string) => {
    socketService.current.leavePost(postId);
  }, []);

  const joinConversations = useCallback((conversationIds: string[]) => {
    socketService.current.joinConversations(conversationIds);
  }, []);

  const leaveConversations = useCallback((conversationIds: string[]) => {
    socketService.current.leaveConversations(conversationIds);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketService.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketService.current.on(event, callback);
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    socketService.current.off(event, callback);
  }, []);

  return {
    socket: socketService.current.getSocket(),
    isConnected,
    joinPost,
    leavePost,
    joinConversations,
    leaveConversations,
    emit,
    on,
    off,
  };
};