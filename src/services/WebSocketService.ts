/**
 * Enhanced WebSocket Service for multi-agent orchestration
 */

export interface WebSocketMessage {
  type: string;
  content?: any;
  agent_id?: string;
  document_id?: string;
  metadata?: Record<string, any>;
  timestamp?: string;
  // Threading specific
  message_id?: string;
  thread_id?: string;
  user_id?: string;
}

// Extended message types for threading
export interface ThreadingWebSocketMessage extends WebSocketMessage {
  type: 
    | 'thread_title_updated'
    | 'message_archived'
    | 'message_restored'
    | 'branch_created' 
    | 'reply_created'
    | 'thread_updated'
    | 'summarization_started'
    | 'summarization_completed'
    | 'summarization_failed';
}

export interface AgentState {
  id: string;
  status: 'connected' | 'disconnected' | 'paused' | 'active';
  current_task?: string;
  last_message?: string;
}

// Browser-compatible EventEmitter replacement
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    this.events.get(event)?.delete(handler);
  }

  emit(event: string, ...args: any[]): void {
    this.events.get(event)?.forEach(handler => handler(...args));
  }
}

export class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isConnected = false;
  private sessionId: string | null = null;
  private token: string | null = null;
  private agentStates: Map<string, AgentState> = new Map();

  constructor() {
    super();
    this.loadToken();
  }

  private async loadToken(): Promise<void> {
    try {
      // Try to get current Supabase session
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        this.token = session.access_token;
        console.log('🔑 Using Supabase access token for WebSocket auth');
        return;
      }
    } catch (e) {
      console.warn('Could not get Supabase session:', e);
    }
    
    // Fallback to anonymous token
    this.token = 'anonymous';
    console.log('🔑 Using anonymous token for WebSocket connection');
  }

  /**
   * Connect to WebSocket server
   */
  async connect(sessionId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    // Load fresh token before connecting
    await this.loadToken();

    this.sessionId = sessionId;
    const wsUrl = this.buildWebSocketUrl(sessionId);

    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);

    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private buildWebSocketUrl(sessionId: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // If VITE_API_URL is set and we're not in dev mode, use it for the WebSocket connection
    // Otherwise, use the current host (works for both Vite dev proxy and same-origin production)
    if (import.meta.env.VITE_API_URL && !import.meta.env.DEV) {
      const apiHost = import.meta.env.VITE_API_URL.replace(/^https?:\/\//, '');
      return `${protocol}//${apiHost}/ws/conversation/${sessionId}?token=${this.token}`;
    }
    
    // Default: use current host (works for Vite proxy in dev, and same-origin in production)
    return `${protocol}//${window.location.host}/ws/conversation/${sessionId}?token=${this.token}`;
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected');
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Send queued messages
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.emit('disconnected', { code: event.code, reason: event.reason });
      
      // Attempt reconnection if not intentional close
      if (event.code !== 1000) {
        this.scheduleReconnect();
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('Received message:', message);

    switch (message.type) {
      case 'agent_message':
        this.handleAgentMessage(message);
        break;
      
      case 'agent_status':
        this.handleAgentStatus(message);
        break;
      
      case 'document_update':
        this.handleDocumentUpdate(message);
        break;
      
      case 'connection_joined':
      case 'connection_left':
        this.handleConnectionChange(message);
        break;
      
      case 'agent_paused':
      case 'agent_resumed':
        this.handleAgentControl(message);
        break;
      
      case 'edit_conflict':
        this.handleEditConflict(message);
        break;
      
      case 'thread_title_updated':
        this.handleThreadTitleUpdate(message);
        break;
      
      case 'message_archived':
        this.handleMessageArchived(message);
        break;
      
      case 'message_restored':
        this.handleMessageRestored(message);
        break;
      
      case 'branch_created':
        this.handleBranchCreated(message);
        break;
      
      case 'reply_created':
        this.handleReplyCreated(message);
        break;
      
      case 'thread_updated':
        this.handleThreadUpdated(message);
        break;
      
      case 'summarization_started':
      case 'summarization_completed':
      case 'summarization_failed':
        this.handleSummarizationUpdate(message);
        break;
      
      case 'error':
        this.handleError(message);
        break;
      
      case 'pong':
        // Heartbeat response
        break;
      
      default:
        this.emit('message', message);
    }
  }

  private handleAgentMessage(message: WebSocketMessage): void {
    // Update agent state
    if (message.agent_id) {
      const state = this.agentStates.get(message.agent_id) || {
        id: message.agent_id,
        status: 'active'
      };
      state.last_message = message.content;
      this.agentStates.set(message.agent_id, state);
    }

    this.emit('agent:message', {
      agentId: message.agent_id,
      content: message.content,
      metadata: message.metadata
    });
  }

  private handleAgentStatus(message: WebSocketMessage): void {
    if (message.agent_id) {
      const state = this.agentStates.get(message.agent_id) || {
        id: message.agent_id,
        status: 'disconnected'
      };
      state.status = message.content as any;
      this.agentStates.set(message.agent_id, state);

      this.emit('agent:status', {
        agentId: message.agent_id,
        status: message.content
      });
    }
  }

  private handleDocumentUpdate(message: WebSocketMessage): void {
    this.emit('document:update', {
      documentId: message.document_id,
      edit: message.content,
      userId: message.metadata?.user_id
    });
  }

  private handleConnectionChange(message: WebSocketMessage): void {
    this.emit('connection:change', message);
  }

  private handleAgentControl(message: WebSocketMessage): void {
    if (message.agent_id) {
      const state = this.agentStates.get(message.agent_id);
      if (state) {
        state.status = message.type === 'agent_paused' ? 'paused' : 'active';
        this.agentStates.set(message.agent_id, state);
      }
    }

    this.emit('agent:control', {
      agentId: message.agent_id,
      action: message.type
    });
  }

  private handleEditConflict(message: WebSocketMessage): void {
    this.emit('document:conflict', {
      documentId: message.document_id,
      message: message.content
    });
  }

  private handleError(message: WebSocketMessage): void {
    console.error('Server error:', message.content);
    this.emit('server:error', message.content);
  }

  // ===== THREADING MESSAGE HANDLERS =====

  private handleThreadTitleUpdate(message: WebSocketMessage): void {
    this.emit('thread:title_updated', {
      messageId: message.message_id,
      threadId: message.thread_id,
      title: message.content.title,
      summary: message.content.summary,
      status: message.content.status
    });
  }

  private handleMessageArchived(message: WebSocketMessage): void {
    this.emit('message:archived', {
      messageId: message.message_id,
      threadId: message.thread_id,
      archivedBy: message.content.archived_by,
      timestamp: message.timestamp
    });
  }

  private handleMessageRestored(message: WebSocketMessage): void {
    this.emit('message:restored', {
      messageId: message.message_id,
      threadId: message.thread_id,
      restoredBy: message.content.restored_by,
      timestamp: message.timestamp
    });
  }

  private handleBranchCreated(message: WebSocketMessage): void {
    this.emit('thread:branch_created', {
      newThreadId: message.content.new_thread_id,
      parentMessageId: message.content.parent_message_id,
      branchContext: message.content.branch_context,
      createdBy: message.content.created_by,
      initialMessage: message.content.initial_message
    });
  }

  private handleReplyCreated(message: WebSocketMessage): void {
    this.emit('message:reply_created', {
      replyId: message.message_id,
      threadId: message.thread_id,
      replyToMessageId: message.content.reply_to_message_id,
      quotedText: message.content.quoted_text,
      content: message.content.content,
      sender: message.content.sender
    });
  }

  private handleThreadUpdated(message: WebSocketMessage): void {
    this.emit('thread:updated', {
      threadId: message.thread_id,
      updates: message.content.updates,
      timestamp: message.timestamp
    });
  }

  private handleSummarizationUpdate(message: WebSocketMessage): void {
    this.emit('summarization:update', {
      messageId: message.message_id,
      threadId: message.thread_id,
      status: message.type.replace('summarization_', ''),
      title: message.content.title,
      summary: message.content.summary,
      error: message.content.error
    });
  }

  /**
   * Send message to server
   */
  send(message: WebSocketMessage): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      console.log('Message queued, WebSocket not connected');
    }
  }

  /**
   * Send user message
   */
  sendMessage(content: string, context?: Record<string, any>): void {
    this.send({
      type: 'message',
      content,
      metadata: { context }
    });
  }

  /**
   * Pause an agent
   */
  pauseAgent(agentId: string): void {
    this.send({
      type: 'pause_agent',
      agent_id: agentId
    });
  }

  /**
   * Resume an agent
   */
  resumeAgent(agentId: string): void {
    this.send({
      type: 'resume_agent',
      agent_id: agentId
    });
  }

  /**
   * Send document edit
   */
  sendDocumentEdit(documentId: string, edit: any): void {
    this.send({
      type: 'document_edit',
      document_id: documentId,
      content: edit
    });
  }

  /**
   * Sync context across agents
   */
  syncContext(context: Record<string, any>): void {
    this.send({
      type: 'context_sync',
      content: context
    });
  }

  /**
   * Get agent states
   */
  getAgentStates(): Map<string, AgentState> {
    return new Map(this.agentStates);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.messageQueue = [];
    this.agentStates.clear();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect:failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.sessionId) {
        this.connect(this.sessionId);
      }
    }, delay);
  }

  /**
   * Check if connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();