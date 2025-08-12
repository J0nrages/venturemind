import { supabase } from '../lib/supabase';

export interface WebSocketMessage {
  type: 'join_document' | 'leave_document' | 'document_edit' | 'cursor_move' | 'presence_update' | 'ai_action' | 'tool_call' | 'document_sync';
  payload: any;
  timestamp: string;
  user_id: string;
  document_id?: string;
  session_id: string;
  trace_id?: string;
}

export interface DocumentPresence {
  user_id: string;
  user_info: {
    email: string;
    name?: string;
    avatar?: string;
  };
  status: 'viewing' | 'editing' | 'idle';
  cursor_position: any;
  selection_range: any;
  session_id: string;
  last_seen_at: string;
}

export interface CollaborationState {
  document_id: string;
  active_users: DocumentPresence[];
  current_version: number;
  last_edit_at: string;
  pending_operations: any[];
}

export class WebSocketService {
  private static connections = new Map<string, {
    socket: any; // WebSocket or mock object
    user_id: string;
    document_id?: string;
    session_id: string;
    last_ping: number;
  }>();
  
  private static documentSubscriptions = new Map<string, Set<string>>(); // document_id -> Set of connection_ids
  private static userConnections = new Map<string, Set<string>>(); // user_id -> Set of connection_ids

  // Initialize connection from edge function
  static initializeConnection(userId: string, sessionId: string, socket: any) {
    const connectionId = `${userId}_${sessionId}`;
    
    this.connections.set(connectionId, {
      socket,
      user_id: userId,
      session_id: sessionId,
      last_ping: Date.now()
    });
    
    // Add to user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);
  }

  // Handle message from edge function
  static async handleMessage(userId: string, sessionId: string, message: any) {
    const connectionId = `${userId}_${sessionId}`;
    await this.handleIncomingMessage(connectionId, message);
  }

  // Handle disconnection from edge function  
  static handleDisconnection(userId: string, sessionId: string) {
    const connectionId = `${userId}_${sessionId}`;
    this.handleDisconnection(connectionId);
  }
  // Create WebSocket connection
  static createWebSocketConnection(userId: string, sessionId: string): WebSocket {
    const ws = new WebSocket(`wss://your-websocket-endpoint.com/ws?user_id=${userId}&session_id=${sessionId}`);
    
    const connectionId = `${userId}_${sessionId}`;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      this.connections.set(connectionId, {
        socket: ws,
        user_id: userId,
        session_id: sessionId,
        last_ping: Date.now()
      });
      
      // Add to user connections
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);
    };

    ws.onmessage = (event) => {
      this.handleIncomingMessage(connectionId, JSON.parse(event.data));
    };

    ws.onclose = () => {
      this.handleDisconnection(connectionId);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.handleDisconnection(connectionId);
    };

    return ws;
  }

  // Handle incoming WebSocket messages
  private static async handleIncomingMessage(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      switch (message.type) {
        case 'join_document':
          await this.handleJoinDocument(connectionId, message);
          break;
        case 'leave_document':
          await this.handleLeaveDocument(connectionId, message);
          break;
        case 'document_edit':
          await this.handleDocumentEdit(connectionId, message);
          break;
        case 'cursor_move':
          await this.handleCursorMove(connectionId, message);
          break;
        case 'presence_update':
          await this.handlePresenceUpdate(connectionId, message);
          break;
        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      this.sendToConnection(connectionId, {
        type: 'error',
        payload: { message: 'Failed to process message' },
        timestamp: new Date().toISOString(),
        user_id: connection.user_id,
        session_id: connection.session_id
      });
    }
  }

  // Handle user joining a document
  private static async handleJoinDocument(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const { document_id } = message.payload;
    
    // Update connection with document ID
    connection.document_id = document_id;
    this.connections.set(connectionId, connection);

    // Add to document subscriptions
    if (!this.documentSubscriptions.has(document_id)) {
      this.documentSubscriptions.set(document_id, new Set());
    }
    this.documentSubscriptions.get(document_id)!.add(connectionId);

    // Create document session
    await supabase
      .from('document_sessions')
      .insert({
        document_id,
        user_id: connection.user_id,
        session_id: connection.session_id,
        status: 'active'
      });

    // Get user info for presence
    const { data: userData } = await supabase.auth.admin.getUserById(connection.user_id);
    
    // Create presence record
    await supabase
      .from('document_presence')
      .upsert({
        document_id,
        user_id: connection.user_id,
        session_id: connection.session_id,
        status: 'viewing',
        user_info: {
          email: userData.user?.email || 'Unknown',
          name: userData.user?.user_metadata?.name || userData.user?.email?.split('@')[0]
        }
      });

    // Broadcast join event to other users in the document
    await this.broadcastToDocument(document_id, {
      type: 'user_joined',
      payload: {
        user_id: connection.user_id,
        user_info: {
          email: userData.user?.email,
          name: userData.user?.user_metadata?.name || userData.user?.email?.split('@')[0]
        },
        session_id: connection.session_id
      },
      timestamp: new Date().toISOString(),
      user_id: connection.user_id,
      document_id,
      session_id: connection.session_id
    }, connectionId); // Exclude sender

    // Send current document state to the joining user
    const collaborationState = await this.getCollaborationState(document_id);
    this.sendToConnection(connectionId, {
      type: 'document_state',
      payload: collaborationState,
      timestamp: new Date().toISOString(),
      user_id: connection.user_id,
      document_id,
      session_id: connection.session_id
    });

    // Log collaboration event
    await supabase
      .from('collaboration_events')
      .insert({
        document_id,
        user_id: connection.user_id,
        event_type: 'join',
        event_data: { session_id: connection.session_id }
      });
  }

  // Handle document editing operations
  private static async handleDocumentEdit(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.document_id) return;

    const { operation, version, checksum } = message.payload;
    
    // Store operation for conflict resolution
    await supabase
      .from('document_operations')
      .insert({
        document_id: connection.document_id,
        user_id: connection.user_id,
        session_id: connection.session_id,
        operation_type: operation.type,
        operation_data: operation,
        position_start: operation.position || 0,
        position_end: (operation.position || 0) + (operation.length || 0),
        version_before: version - 1,
        version_after: version,
        checksum
      });

    // Update document version and last editor
    await supabase
      .from('user_documents')
      .update({
        version,
        last_editor_id: connection.user_id,
        last_updated: new Date().toISOString()
      })
      .eq('id', connection.document_id);

    // Broadcast operation to other users
    await this.broadcastToDocument(connection.document_id, {
      type: 'document_operation',
      payload: {
        operation,
        version,
        checksum,
        user_id: connection.user_id
      },
      timestamp: new Date().toISOString(),
      user_id: connection.user_id,
      document_id: connection.document_id,
      session_id: connection.session_id
    }, connectionId);

    // Update presence to editing
    await this.updatePresenceStatus(connection.user_id, connection.document_id, connection.session_id, 'editing');

    // Log collaboration event
    await supabase
      .from('collaboration_events')
      .insert({
        document_id: connection.document_id,
        user_id: connection.user_id,
        event_type: 'edit',
        event_data: { operation_type: operation.type, version }
      });
  }

  // Handle cursor movement
  private static async handleCursorMove(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.document_id) return;

    const { cursor_position, selection_range } = message.payload;

    // Update presence with cursor position
    await supabase
      .from('document_presence')
      .update({
        cursor_position,
        selection_range,
        last_seen_at: new Date().toISOString()
      })
      .eq('document_id', connection.document_id)
      .eq('user_id', connection.user_id)
      .eq('session_id', connection.session_id);

    // Broadcast cursor position to other users
    await this.broadcastToDocument(connection.document_id, {
      type: 'cursor_update',
      payload: {
        user_id: connection.user_id,
        cursor_position,
        selection_range
      },
      timestamp: new Date().toISOString(),
      user_id: connection.user_id,
      document_id: connection.document_id,
      session_id: connection.session_id
    }, connectionId);
  }

  // Get current collaboration state for a document
  private static async getCollaborationState(documentId: string): Promise<CollaborationState> {
    const [documentData, presenceData, operationsData] = await Promise.all([
      supabase
        .from('user_documents')
        .select('version, last_updated')
        .eq('id', documentId)
        .single(),
      
      supabase
        .from('document_presence')
        .select('*')
        .eq('document_id', documentId)
        .gte('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()), // Active in last 5 minutes
      
      supabase
        .from('document_operations')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    return {
      document_id: documentId,
      active_users: presenceData.data || [],
      current_version: documentData.data?.version || 1,
      last_edit_at: documentData.data?.last_updated || new Date().toISOString(),
      pending_operations: operationsData.data || []
    };
  }

  // Broadcast message to all users in a document
  private static async broadcastToDocument(
    documentId: string, 
    message: WebSocketMessage, 
    excludeConnectionId?: string
  ) {
    const documentConnections = this.documentSubscriptions.get(documentId);
    if (!documentConnections) return;

    for (const connectionId of documentConnections) {
      if (connectionId === excludeConnectionId) continue;
      this.sendToConnection(connectionId, message);
    }
  }

  // Send message to specific connection
  private static sendToConnection(connectionId: string, message: WebSocketMessage) {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) return;

    try {
      connection.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
      this.handleDisconnection(connectionId);
    }
  }

  // Handle user disconnection
  private static async handleDisconnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Remove from document subscriptions
    if (connection.document_id) {
      const docConnections = this.documentSubscriptions.get(connection.document_id);
      if (docConnections) {
        docConnections.delete(connectionId);
        if (docConnections.size === 0) {
          this.documentSubscriptions.delete(connection.document_id);
        }
      }

      // Update session status
      await supabase
        .from('document_sessions')
        .update({
          status: 'disconnected',
          ended_at: new Date().toISOString()
        })
        .eq('user_id', connection.user_id)
        .eq('session_id', connection.session_id);

      // Remove presence
      await supabase
        .from('document_presence')
        .delete()
        .eq('user_id', connection.user_id)
        .eq('session_id', connection.session_id);

      // Broadcast leave event
      await this.broadcastToDocument(connection.document_id, {
        type: 'user_left',
        payload: {
          user_id: connection.user_id,
          session_id: connection.session_id
        },
        timestamp: new Date().toISOString(),
        user_id: connection.user_id,
        document_id: connection.document_id,
        session_id: connection.session_id
      });

      // Log collaboration event
      await supabase
        .from('collaboration_events')
        .insert({
          document_id: connection.document_id,
          user_id: connection.user_id,
          event_type: 'leave',
          event_data: { session_id: connection.session_id }
        });
    }

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.user_id);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.user_id);
      }
    }

    // Remove connection
    this.connections.delete(connectionId);
  }

  // Update presence status
  private static async updatePresenceStatus(
    userId: string, 
    documentId: string, 
    sessionId: string, 
    status: 'viewing' | 'editing' | 'idle'
  ) {
    await supabase
      .from('document_presence')
      .update({
        status,
        last_seen_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('session_id', sessionId);
  }

  // Send AI action updates to relevant users
  static async broadcastAIAction(
    userId: string,
    documentId: string,
    action: {
      type: string;
      status: 'starting' | 'progress' | 'completed' | 'failed';
      data: any;
      trace_id: string;
    }
  ) {
    const message: WebSocketMessage = {
      type: 'ai_action',
      payload: action,
      timestamp: new Date().toISOString(),
      user_id: userId,
      document_id: documentId,
      session_id: 'ai_system',
      trace_id: action.trace_id
    };

    // Broadcast to all users watching this document
    await this.broadcastToDocument(documentId, message);
  }

  // Send tool call updates
  static async broadcastToolCall(
    userId: string,
    documentId: string,
    toolCall: {
      tool_name: string;
      status: 'starting' | 'running' | 'completed' | 'failed';
      input: any;
      output?: any;
      trace_id: string;
    }
  ) {
    const message: WebSocketMessage = {
      type: 'tool_call',
      payload: toolCall,
      timestamp: new Date().toISOString(),
      user_id: userId,
      document_id: documentId,
      session_id: 'ai_system',
      trace_id: toolCall.trace_id
    };

    await this.broadcastToDocument(documentId, message);
  }

  // Sync document state across all users
  static async syncDocumentState(documentId: string) {
    const collaborationState = await this.getCollaborationState(documentId);
    
    const message: WebSocketMessage = {
      type: 'document_sync',
      payload: collaborationState,
      timestamp: new Date().toISOString(),
      user_id: 'system',
      document_id: documentId,
      session_id: 'system'
    };

    await this.broadcastToDocument(documentId, message);
  }

  // Get active connections count
  static getActiveConnections(): number {
    return this.connections.size;
  }

  // Get connections for a specific document
  static getDocumentConnections(documentId: string): number {
    return this.documentSubscriptions.get(documentId)?.size || 0;
  }

  // Cleanup inactive connections
  static cleanupInactiveConnections() {
    const now = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes

    for (const [connectionId, connection] of this.connections.entries()) {
      if (now - connection.last_ping > timeout) {
        this.handleDisconnection(connectionId);
      }
    }
  }

  // Handle ping/pong for connection health
  static handlePing(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.last_ping = Date.now();
      this.connections.set(connectionId, connection);
    }
  }
}