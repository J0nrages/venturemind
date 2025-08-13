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

  private loadToken(): void {
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Connect to WebSocket server
   */
  connect(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.sessionId = sessionId;
    const wsUrl = this.buildWebSocketUrl(sessionId);

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
    const host = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '') || 'localhost:8000';
    return `${protocol}//${host}/ws/conversation/${sessionId}?token=${this.token}`;
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