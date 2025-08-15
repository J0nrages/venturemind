# Tool Calling Integration Guide for MainChat

## Overview
This guide explains how to integrate the new tool calling capabilities into MainChat to enable natural language surface control.

## Files Created
1. `/src/config/tools.json` - Tool definitions in Gemini 2.5 Flash format
2. `/src/services/ToolExecutor.ts` - Executes tool calls and manages workspace
3. `/src/services/GeminiToolService.ts` - Extends GeminiService with tool support

## Integration Steps

### 1. Update MainChat Component

In `/src/components/MainChat.tsx`, make these changes:

```typescript
// Add imports at the top
import { GeminiToolService } from '../services/GeminiToolService';
import { ToolExecutor } from '../services/ToolExecutor';

// In the MainChat component, update the sendMessage function:

const sendMessage = async () => {
  if (!currentMessage.trim() || loading || !user) return;
  
  setLoading(true);
  const userMessage = currentMessage;
  setCurrentMessage('');
  const startTime = Date.now();
  
  try {
    // Initialize ToolExecutor with workspace context
    const executor = ToolExecutor.getInstance();
    executor.setWorkspaceContext({
      contexts,
      currentContextIndex,
      updateContextSurface,
      addAgentToContext
    });

    // Check for slash commands first
    if (userMessage.startsWith('/')) {
      const parts = userMessage.split(' ');
      const command = parts[0].substring(1).toLowerCase();
      
      if (command === 'attach' || command === 'open' || command === 'show') {
        const surfaceId = parts[1];
        await executor.execute({
          name: 'attach_surface',
          args: {
            surfaceType: 'document',
            surfaceId: surfaceId,
            reason: `User command: ${userMessage}`
          }
        });
        return;
      }
    }

    // Use GeminiToolService instead of regular GeminiService
    const response = await GeminiToolService.generateWithTools(
      userMessage,
      context,
      user.id,
      undefined // Will use default tools from config
    );

    // Save user message
    const userMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
      user_id: user.id,
      content: userMessage,
      sender: 'user',
      document_updates: [],
      context_confidence: 0,
      thread_id: context.id
    };
    
    await ConversationService.saveMessage(userMsg);
    setMessages(prev => [...prev, { 
      ...userMsg, 
      id: Date.now().toString(), 
      created_at: new Date().toISOString() 
    } as ConversationMessage]);
    
    // Save AI response with tool call info
    const aiMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
      user_id: user.id,
      content: response.content,
      sender: 'ai',
      document_updates: [],
      context_confidence: response.confidence,
      thread_id: context.id,
      // Store tool calls in metadata
      metadata: response.toolCalls ? {
        toolCalls: response.toolCalls,
        toolResults: response.toolResults
      } : undefined
    };
    
    await ConversationService.saveMessage(aiMsg);
    setMessages(prev => [...prev, { 
      ...aiMsg, 
      id: (Date.now() + 1).toString(), 
      created_at: new Date().toISOString() 
    } as ConversationMessage]);

    // Update stats
    const endTime = Date.now();
    setMessageStats({
      lastLatency: endTime - startTime,
      lastTokens: Math.ceil((userMessage.length + response.content.length) / 4),
      lastSpeed: Math.round((Math.ceil((userMessage.length + response.content.length) / 4) / (endTime - startTime)) * 1000)
    });

  } catch (error) {
    toast.error('Failed to send message');
  } finally {
    setLoading(false);
  }
};
```

### 2. Update Backend API (if needed)

The backend needs to support the `/api/v1/agents/generate-with-tools` endpoint. This should:
1. Accept tool definitions in the request
2. Pass them to Gemini 2.5 Flash API
3. Return function calls in the response

### 3. Example Natural Language Commands

Once integrated, users can:

- **"Show me the financial projections"** → Opens proforma surface
- **"Open the business plan"** → Opens business-plan surface  
- **"Let me see our metrics"** → Opens metrics dashboard
- **"Create a new strategic document"** → Creates new document
- **"Get the analyst agent to help"** → Summons analyst agent
- **"Close the dashboard"** → Detaches dashboard surface
- **"Analyze our revenue growth"** → Runs metrics analysis

### 4. Testing Commands

```bash
# Test slash commands
/attach proforma
/open metrics
/show business-plan

# Test natural language
"Can you show me the financial projections?"
"I want to see our business metrics"
"Pull up the strategic plan"
"Open the customer insights dashboard"
```

## How It Works

1. **User sends message** in MainChat
2. **GeminiToolService** checks if message needs tools
3. **Gemini 2.5 Flash** returns function call if needed
4. **ToolExecutor** executes the function (e.g., opens surface)
5. **Workspace updates** to show requested surface
6. **User sees result** with surface attached to workspace

## Benefits

- **Natural interaction**: Users don't need to learn commands
- **Context-aware**: AI understands what surfaces are relevant
- **Seamless workflow**: Surfaces appear as part of conversation
- **Tool chaining**: AI can execute multiple tools in sequence
- **Fallback support**: Works even if API doesn't return tool calls

## Next Steps

1. Test with various natural language patterns
2. Add more tool types (data analysis, document creation, etc.)
3. Implement tool confirmation for sensitive operations
4. Add visual feedback when tools are executing
5. Create tool usage analytics

## Troubleshooting

If tools aren't working:
1. Check browser console for error messages
2. Verify tools.json is loaded correctly
3. Ensure ToolExecutor has workspace context
4. Check API endpoint supports tool calling
5. Verify Gemini API key has function calling enabled