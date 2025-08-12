import { WebSocketService } from '../../../src/services/WebSocketService.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, Connection, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol",
};

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  
  // Handle WebSocket upgrade
  if (req.headers.get("upgrade") === "websocket") {
    const userId = url.searchParams.get('user_id');
    const sessionId = url.searchParams.get('session_id');
    
    if (!userId || !sessionId) {
      return new Response("Missing user_id or session_id", { status: 400 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req, {
      protocol: "chat"
    });

    socket.onopen = () => {
      console.log(`WebSocket opened for user ${userId}, session ${sessionId}`);
      
      // Initialize connection in service
      WebSocketService.initializeConnection(userId, sessionId, socket);
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        await WebSocketService.handleMessage(userId, sessionId, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        socket.send(JSON.stringify({
          type: 'error',
          payload: { message: 'Invalid message format' },
          timestamp: new Date().toISOString()
        }));
      }
    };

    socket.onclose = () => {
      console.log(`WebSocket closed for user ${userId}, session ${sessionId}`);
      WebSocketService.handleUserDisconnection(userId, sessionId);
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      WebSocketService.handleUserDisconnection(userId, sessionId);
    };

    return response;
  }

  // Handle HTTP requests (health check, etc.)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method === "GET") {
    return new Response(JSON.stringify({
      status: "WebSocket server running",
      active_connections: WebSocketService.getActiveConnections(),
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  }

  return new Response("Method not allowed", { status: 405 });
});