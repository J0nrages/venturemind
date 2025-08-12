import { supabase } from '../lib/supabase';

export interface SSEEvent {
  type: 'action_start' | 'action_progress' | 'action_complete' | 'clip_retrieved' | 'doc_updated' | 'response_chunk';
  data: any;
  timestamp: string;
  trace_id?: string;
}

export class SSEService {
  private static connections = new Map<string, WritableStreamDefaultWriter>();

  // Create SSE connection for real-time updates
  static createSSEResponse(userId: string): Response {
    const stream = new ReadableStream({
      start(controller) {
        // Store the controller for this user
        const encoder = new TextEncoder();
        const writer = controller;
        
        // Send initial connection event
        const initialEvent: SSEEvent = {
          type: 'action_start',
          data: { message: 'Connected to AI processing stream' },
          timestamp: new Date().toISOString()
        };
        
        writer.enqueue(encoder.encode(`data: ${JSON.stringify(initialEvent)}\n\n`));
        
        // Store connection
        this.connections.set(userId, writer as any);
        
        // Set up cleanup
        const cleanup = () => {
          this.connections.delete(userId);
          try {
            controller.close();
          } catch (e) {
            // Connection already closed
          }
        };

        // Clean up on disconnect (simplified)
        setTimeout(cleanup, 30 * 60 * 1000); // 30 minutes timeout
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  // Send event to specific user
  static async sendEvent(userId: string, event: SSEEvent): Promise<void> {
    const writer = this.connections.get(userId);
    if (!writer) return;

    try {
      const encoder = new TextEncoder();
      const eventData = `data: ${JSON.stringify(event)}\n\n`;
      await writer.write(encoder.encode(eventData));
    } catch (error) {
      console.error('Error sending SSE event:', error);
      // Remove broken connection
      this.connections.delete(userId);
    }
  }

  // Send action start event
  static async sendActionStart(userId: string, actionType: string, traceId: string): Promise<void> {
    await this.sendEvent(userId, {
      type: 'action_start',
      data: { action_type: actionType, status: 'starting' },
      timestamp: new Date().toISOString(),
      trace_id: traceId
    });
  }

  // Send action progress event
  static async sendActionProgress(userId: string, actionType: string, progress: any, traceId: string): Promise<void> {
    await this.sendEvent(userId, {
      type: 'action_progress',
      data: { action_type: actionType, progress },
      timestamp: new Date().toISOString(),
      trace_id: traceId
    });
  }

  // Send action complete event
  static async sendActionComplete(userId: string, actionType: string, result: any, traceId: string): Promise<void> {
    await this.sendEvent(userId, {
      type: 'action_complete',
      data: { action_type: actionType, result, status: 'completed' },
      timestamp: new Date().toISOString(),
      trace_id: traceId
    });
  }

  // Send clip retrieval event
  static async sendClipRetrieved(userId: string, clip: any, traceId: string): Promise<void> {
    await this.sendEvent(userId, {
      type: 'clip_retrieved',
      data: { clip_id: clip.id, content_preview: clip.content.substring(0, 100) },
      timestamp: new Date().toISOString(),
      trace_id: traceId
    });
  }

  // Send document update event
  static async sendDocumentUpdated(userId: string, documentName: string, sectionId: string, traceId: string): Promise<void> {
    await this.sendEvent(userId, {
      type: 'doc_updated',
      data: { document_name: documentName, section_id: sectionId },
      timestamp: new Date().toISOString(),
      trace_id: traceId
    });
  }

  // Send response chunk (for streaming responses)
  static async sendResponseChunk(userId: string, chunk: string, traceId: string): Promise<void> {
    await this.sendEvent(userId, {
      type: 'response_chunk',
      data: { chunk },
      timestamp: new Date().toISOString(),
      trace_id: traceId
    });
  }

  // Close connection for user
  static closeConnection(userId: string): void {
    const writer = this.connections.get(userId);
    if (writer) {
      try {
        (writer as any).close();
      } catch (e) {
        // Connection already closed
      }
      this.connections.delete(userId);
    }
  }

  // Get active connections count
  static getActiveConnections(): number {
    return this.connections.size;
  }
}