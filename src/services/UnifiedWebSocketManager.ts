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
  private messageQueue: WebSocketMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private useDirectDevEndpoint = true;
  private sessionId: string | null = null;
  private userId: string | null = null;
  private token: string | null = null;
  private statusListeners: Set<(status: { connected: boolean; sessionId: string | null; subscriptions: number; queuedMessages: number; }) => void> = new Set();
  private debug: boolean = import.meta.env.VITE_DEBUG_WS === 'true';

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
    // Prevent multiple connections
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WSManager] Already connected');
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
    // Deduplicate identical subscriptions
    for (const [existingId, sub] of this.subscriptions.entries()) {
      if (sub.channel === channel && sub.contextId === contextId && sub.callback === callback) {
        console.log(`[WSManager] Reusing existing subscription ${existingId} for ${channel}`);
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
    
    // Notify backend about subscription (only once per unique channel/context)
    if (this.isConnected) {
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
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      
      // Notify backend about unsubscription
      if (this.isConnected) {
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
    this.notifyStatus();
  }

  /**
   * Send message through WebSocket
   */
  public send(message: Omit<WebSocketMessage, 'userId'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      userId: this.userId || undefined,
      timestamp: message.timestamp || new Date().toISOString()
    };

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
      if (this.debug) console.log(`[WSManager] Sent message: ${message.type} on ${message.channel}`);
    } else {
      // Queue message if not connected
      this.messageQueue.push(fullMessage);
      if (this.debug) console.log(`[WSManager] Queued message: ${message.type}`);
    }
  }

  /**
   * Send conversation message
   */
  public sendConversationMessage(
    content: string, 
    contextId: string,
    metadata?: any
  ): void {
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
   * Send agent control message
   */
  public sendAgentControl(
    agentId: string,
    action: 'pause' | 'resume' | 'stop',
    contextId?: string
  ): void {
    this.send({
      id: crypto.randomUUID(),
      channel: 'agent',
      type: `agent_${action}`,
      payload: { agentId, action },
      agentId,
      contextId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send document collaboration message
   */
  public sendDocumentEdit(
    documentId: string,
    operation: any,
    contextId?: string
  ): void {
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
   * Request agent prefetch analysis
   */
  public requestPrefetch(
    agentId: string,
    message: string,
    contextId: string
  ): void {
    this.send({
      id: crypto.randomUUID(),
      channel: 'prefetch',
      type: 'analyze_for_prefetch',
      payload: { message },
      agentId,
      contextId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Disconnect WebSocket
   */
  public disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.ws = null;
    }

    this.isConnected = false;
    this.messageQueue = [];
    this.subscriptions.clear();
    
    if (this.debug) console.log('[WSManager] Disconnected');
  }

  /**
   * Get connection status
   */
  public getStatus(): {
    connected: boolean;
    sessionId: string | null;
    subscriptions: number;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected,
      sessionId: this.sessionId,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length
    };
  }

  // Private methods

  private notifyStatus(): void {
    const status = this.getStatus();
    this.statusListeners.forEach((listener) => {
      try { listener(status); } catch {}
    });
  }

  public addStatusListener(listener: (status: { connected: boolean; sessionId: string | null; subscriptions: number; queuedMessages: number; }) => void): () => void {
    this.statusListeners.add(listener);
    // Emit current status immediately
    try { listener(this.getStatus()); } catch {}
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  private async loadToken(): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        // URL-safe token for query param usage
        this.token = encodeURIComponent(session.access_token);
        console.log('[WSManager] Using Supabase token');
      } else {
        this.token = 'anonymous';
        console.log('[WSManager] Using anonymous token');
      }
    } catch (error) {
      console.warn('[WSManager] Failed to get token:', error);
      this.token = 'anonymous';
    }
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
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Send authentication
      this.send({
        id: crypto.randomUUID(),
        channel: 'system',
        type: 'authenticate',
        payload: { token: this.token, userId: this.userId },
        timestamp: new Date().toISOString()
      });

      // Re-subscribe all channels
      // Re-subscribe unique channel/context pairs only once
      const uniqueKeys = new Set<string>();
      this.subscriptions.forEach((sub) => {
        const key = `${sub.channel}:${sub.contextId || 'global'}`;
        if (uniqueKeys.has(key)) return;
        uniqueKeys.add(key);
        this.send({
          id: crypto.randomUUID(),
          channel: 'system',
          type: 'subscribe',
          payload: { channel: sub.channel, contextId: sub.contextId },
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
        console.error('[WSManager] Failed to parse message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[WSManager] Error:', error);
    };

    this.ws.onclose = (event) => {
      console.log(`[WSManager] Closed: ${event.code} - ${event.reason}`);
      this.isConnected = false;
      this.isConnecting = false;
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // Auto-reconnect if not intentional close
      if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
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
      // Match channel and optional context
      if (subscription.channel === message.channel) {
        if (!subscription.contextId || subscription.contextId === message.contextId) {
          subscription.callback(message);
        }
      }
    });
  }

  private handleSystemMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'pong':
        // Heartbeat response
        break;
      case 'authenticated':
        if (this.debug) console.log('[WSManager] Authenticated successfully');
        break;
      case 'error':
        console.error('[WSManager] Server error:', message.payload);
        break;
      default:
        if (this.debug) console.log('[WSManager] System message:', message.type);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
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
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
    this.notifyStatus();
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    if (this.debug) console.log(`[WSManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    // After a couple of failed attempts in dev, try direct backend endpoint
    if (import.meta.env.DEV && this.reconnectAttempts >= 2) {
      this.useDirectDevEndpoint = true;
    }
    
    setTimeout(() => {
      if (this.userId) {
        this.connect(this.userId);
      }
    }, delay);
  }
}

// Export singleton instance
export const wsManager = UnifiedWebSocketManager.getInstance();