/**
 * Unified WebSocket Manager for SYNA
 * Single source of truth for all WebSocket connections
 * 
 * Architecture:
 * - Singleton pattern ensures only ONE WebSocket connection
 * - Channel-based multiplexing for multiple contexts/agents
 * - Event-driven architecture for component communication
 * - Automatic reconnection with exponential backoff
 * - Message queueing during disconnection
 */

import { supabase } from '../lib/supabase';

// Message types for different channels
export type ChannelType = 
  | 'conversation'  // User-AI conversation
  | 'agent'        // Agent communication
  | 'document'     // Document collaboration
  | 'system'       // System notifications
  | 'prefetch';    // Agent prefetch analysis

export interface WebSocketMessage {
  id: string;
  channel: ChannelType;
  type: string;
  payload: any;
  contextId?: string;
  agentId?: string;
  userId?: string;
  timestamp: string;
}

export interface ChannelSubscription {
  channel: ChannelType;
  contextId?: string;
  callback: (message: WebSocketMessage) => void;
}

class UnifiedWebSocketManager {
  private static instance: UnifiedWebSocketManager;
  private ws: WebSocket | null = null;
  private subscriptions: Map<string, ChannelSubscription> = new Map();
  private subscribedChannels: Set<string> = new Set(); // Track what we've already subscribed to
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Increased from 5 to 10
  private reconnectDelay = 2000; // Start with 2 seconds
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private hasFailed = false; // Track if we've exhausted retries
  private useDirectDevEndpoint = true;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private statusListeners: Set<(status: { connected: boolean; sessionId: string | null; subscriptions: number; queuedMessages: number; failed: boolean; }) => void> = new Set();
  private debug: boolean = import.meta.env.VITE_DEBUG_WS === 'true';
  private lastError: string | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance) {
      UnifiedWebSocketManager.instance = new UnifiedWebSocketManager();
    }
    return UnifiedWebSocketManager.instance;
  }

  /**
   * Initialize WebSocket connection with authentication
   */
  public async connect(userId: string): Promise<void> {
    // Reset failure state if attempting to reconnect manually
    if (this.hasFailed) {
      this.hasFailed = false;
      this.reconnectAttempts = 0;
    }

    // Prevent multiple connections
    if (this.ws?.readyState === WebSocket.OPEN) {
      if (this.debug) console.log('[WSManager] Already connected');
      return;
    }
    if (this.isConnecting) {
      if (this.debug) console.log('[WSManager] Connection in progress');
      return;
    }

    // Close existing connection if any
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.userId = userId;
    // Generate a unique session ID - backend will add "unified_" prefix
    this.sessionId = crypto.randomUUID();

    // Get authentication token
    await this.loadToken();

    const wsUrl = this.buildWebSocketUrl();
    if (this.debug) console.log(`[WSManager] Connecting to: ${wsUrl}`);

    try {
      this.isConnecting = true;
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('[WSManager] Connection failed:', error);
      this.lastError = error instanceof Error ? error.message : 'Unknown connection error';
      this.scheduleReconnect();
    }
  }

  /**
   * Subscribe to a channel with optional context filtering
   */
  public subscribe(
    channel: ChannelType, 
    callback: (message: WebSocketMessage) => void,
    contextId?: string
  ): string {
    // Create unique key for tracking backend subscriptions
    const channelKey = `${channel}:${contextId || 'global'}`;
    
    // Deduplicate identical subscriptions
    for (const [existingId, sub] of this.subscriptions.entries()) {
      if (sub.channel === channel && sub.contextId === contextId && sub.callback === callback) {
        if (this.debug) console.log(`[WSManager] Reusing existing subscription ${existingId}`);
        return existingId;
      }
    }

    const subscriptionId = `${channel}_${contextId || 'global'}_${Date.now()}`;
    
    this.subscriptions.set(subscriptionId, {
      channel,
      contextId,
      callback
    });

    if (this.debug) console.log(`[WSManager] Subscribed to ${channel} (${subscriptionId})`);
    
    // Only send subscribe message if we haven't already subscribed to this channel/context combo
    if (this.isConnected && !this.subscribedChannels.has(channelKey)) {
      this.subscribedChannels.add(channelKey);
      this.send({
        id: crypto.randomUUID(),
        channel: 'system',
        type: 'subscribe',
        payload: { channel, contextId },
        timestamp: new Date().toISOString()
      });
    }

    return subscriptionId;
  }

  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    const channelKey = `${subscription.channel}:${subscription.contextId || 'global'}`;
    
    this.subscriptions.delete(subscriptionId);
    if (this.debug) console.log(`[WSManager] Unsubscribed from ${subscriptionId}`);

    // Check if any other subscriptions exist for this channel/context
    let hasOtherSubscriptions = false;
    for (const [, sub] of this.subscriptions) {
      if (sub.channel === subscription.channel && sub.contextId === subscription.contextId) {
        hasOtherSubscriptions = true;
        break;
      }
    }

    // Only unsubscribe from backend if no other subscriptions exist
    if (this.isConnected && !hasOtherSubscriptions) {
      this.subscribedChannels.delete(channelKey);
      this.send({
        id: crypto.randomUUID(),
        channel: 'system',
        type: 'unsubscribe',
        payload: { 
          channel: subscription.channel, 
          contextId: subscription.contextId 
        },
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send message through WebSocket
   */
  public send(message: Omit<WebSocketMessage, 'userId'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      userId: this.userId || undefined
    };

    // Send immediately if connected
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(fullMessage));
        if (this.debug) console.log('[WSManager] Sent:', fullMessage.type, 'on', fullMessage.channel);
      } catch (error) {
        console.error('[WSManager] Send failed:', error);
        this.messageQueue.push(fullMessage);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(fullMessage);
      if (this.debug) console.log('[WSManager] Queued message');
    }
  }

  /**
   * Add status listener
   */
  public onStatusChange(callback: (status: { connected: boolean; sessionId: string | null; subscriptions: number; queuedMessages: number; failed: boolean; }) => void): () => void {
    this.statusListeners.add(callback);
    // Immediately notify of current status
    callback({
      connected: this.isConnected,
      sessionId: this.sessionId,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      failed: this.hasFailed
    });
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  public getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      sessionId: this.sessionId,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
      failed: this.hasFailed,
      lastError: this.lastError
    };
  }

  /**
   * Get subscriptions count by channel
   */
  public getSubscriptionStats() {
    const stats: Record<ChannelType, number> = {
      conversation: 0,
      agent: 0,
      document: 0,
      system: 0,
      prefetch: 0
    };

    this.subscriptions.forEach(sub => {
      stats[sub.channel]++;
    });

    return stats;
  }

  /**
   * Convenience: send a conversation message from the user
   */
  public sendConversationMessage(content: string, contextId: string, metadata?: any): void {
    this.send({
      id: crypto.randomUUID(),
      channel: 'conversation',
      type: 'user_message',
      payload: { content, metadata },
      contextId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Convenience: control an agent (pause/resume/stop)
   */
  public sendAgentControl(
    agentId: string,
    action: 'pause' | 'resume' | 'stop',
    contextId?: string
  ): void {
    const type =
      action === 'pause' ? 'agent_pause' : action === 'resume' ? 'agent_resume' : 'agent_stop';
    this.send({
      id: crypto.randomUUID(),
      channel: 'agent',
      type,
      payload: { agentId, action },
      agentId,
      contextId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Convenience: broadcast a document edit operation
   */
  public sendDocumentEdit(documentId: string, operation: any, contextId?: string): void {
    this.send({
      id: crypto.randomUUID(),
      channel: 'document',
      type: 'document_edit',
      payload: { documentId, operation },
      contextId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Convenience: ask backend to analyze a prompt for agent prefetching
   */
  public requestPrefetch(agentId: string, message: string, contextId: string): void {
    this.send({
      id: crypto.randomUUID(),
      channel: 'prefetch',
      type: 'analyze_for_prefetch',
      payload: { agentId, message },
      agentId,
      contextId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.subscribedChannels.clear();
    this.reconnectAttempts = 0;
    this.hasFailed = false;
    this.notifyStatus();
  }

  /**
   * Force reconnect
   */
  public async reconnect(): Promise<void> {
    this.disconnect();
    if (this.userId) {
      await this.connect(this.userId);
    }
  }

  /**
   * Clean up resources
   */
  public cleanup(): void {
    this.disconnect();
    this.subscriptions.clear();
    this.subscribedChannels.clear();
    this.messageQueue = [];
    this.statusListeners.clear();
  }

  private async loadToken(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    this.token = session?.access_token || null;
  }

  private buildWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (import.meta.env.DEV) {
      // Development: Connect directly to backend to avoid dev-proxy WS quirks
      const apiHost = '127.0.0.1:8000';
      return `${protocol}//${apiHost}/ws/unified/${this.sessionId}?token=${this.token}`;
    } else if (import.meta.env.VITE_API_URL) {
      // Production with separate API
      const apiHost = import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '');
      return `${protocol}//${apiHost}/ws/unified/${this.sessionId}?token=${this.token}`;
    } else {
      // Production same-origin
      return `${protocol}//${window.location.host}/ws/unified/${this.sessionId}?token=${this.token}`;
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      if (this.debug) console.log('[WSManager] Connected');
      console.log('[WSManager] WebSocket connected successfully');
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 2000; // Reset delay
      this.lastError = null;
      
      // Send authentication
      this.send({
        id: crypto.randomUUID(),
        channel: 'system',
        type: 'authenticate',
        payload: { token: this.token, userId: this.userId },
        timestamp: new Date().toISOString()
      });

      // Re-subscribe to unique channels only
      this.subscribedChannels.clear();
      const uniqueChannels = new Map<string, { channel: ChannelType; contextId?: string }>();
      
      this.subscriptions.forEach((sub) => {
        const key = `${sub.channel}:${sub.contextId || 'global'}`;
        if (!uniqueChannels.has(key)) {
          uniqueChannels.set(key, { channel: sub.channel, contextId: sub.contextId });
        }
      });

      // Send subscribe messages for unique channels
      uniqueChannels.forEach((value, key) => {
        this.subscribedChannels.add(key);
        this.send({
          id: crypto.randomUUID(),
          channel: 'system',
          type: 'subscribe',
          payload: { channel: value.channel, contextId: value.contextId },
          timestamp: new Date().toISOString()
        });
      });

      // Start heartbeat
      this.startHeartbeat();
      
      // Flush queued messages
      this.flushMessageQueue();

      // Broadcast status
      this.notifyStatus();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        if (this.debug) console.error('[WSManager] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WSManager] WebSocket error occurred');
      this.lastError = 'WebSocket connection error';
      if (this.debug) console.error('[WSManager] Error details:', error);
    };

    this.ws.onclose = (event) => {
      const wasConnected = this.isConnected;
      this.isConnected = false;
      this.isConnecting = false;
      this.subscribedChannels.clear();
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (event.code === 1000) {
        // Normal closure
        console.log('[WSManager] WebSocket closed normally');
      } else {
        // Abnormal closure
        console.error(`[WSManager] WebSocket closed abnormally: ${event.code} - ${event.reason || 'No reason provided'}`);
        this.lastError = `Connection closed: ${event.reason || 'Unknown reason'}`;
        
        // Auto-reconnect if not intentional close and haven't exceeded max attempts
        if (wasConnected && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[WSManager] Max reconnection attempts reached. WebSocket will not reconnect automatically.');
          this.hasFailed = true;
        }
      }

      // Broadcast status
      this.notifyStatus();
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // System messages
    if (message.channel === 'system') {
      this.handleSystemMessage(message);
      return;
    }

    // Route to subscribers
    this.subscriptions.forEach((subscription) => {
      // Check channel match
      if (subscription.channel !== message.channel) return;
      
      // Check context match (if specified)
      if (subscription.contextId && subscription.contextId !== message.contextId) return;
      
      // Deliver message
      try {
        subscription.callback(message);
      } catch (error) {
        console.error('[WSManager] Subscriber error:', error);
      }
    });
  }

  private handleSystemMessage(message: WebSocketMessage): void {
    if (this.debug) console.log('[WSManager] System message:', message.type);
    
    switch (message.type) {
      case 'welcome':
        if (this.debug) console.log('[WSManager] Server welcomed connection');
        break;
      case 'error':
        console.error('[WSManager] Server error:', message.payload);
        this.lastError = message.payload?.message || 'Server error';
        break;
      case 'pong':
        // Heartbeat response
        break;
      default:
        if (this.debug) console.log('[WSManager] Unknown system message:', message.type);
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          id: crypto.randomUUID(),
          channel: 'system',
          type: 'ping',
          payload: {},
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Every 30 seconds
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;
    
    if (this.debug) console.log(`[WSManager] Flushing ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(msg => this.send(msg));
  }

  private scheduleReconnect(): void {
    if (this.hasFailed) {
      console.log('[WSManager] Connection failed permanently. Manual reconnection required.');
      return;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectAttempts++;
    
    // Calculate delay with exponential backoff
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), this.maxReconnectDelay);
    
    console.log(`[WSManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(async () => {
      if (this.userId) {
        await this.connect(this.userId);
      }
    }, delay);
  }

  private notifyStatus(): void {
    const status = {
      connected: this.isConnected,
      sessionId: this.sessionId,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      failed: this.hasFailed
    };
    
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
        console.error('[WSManager] Status listener error:', error);
      }
    });
  }
}

// Export singleton instance
export const wsManager = UnifiedWebSocketManager.getInstance();