/**
 * Gemini Tool Service - Extends GeminiService with tool calling capabilities
 * For Gemini 2.5 Flash function calling
 */

import { GeminiService } from './GeminiService';
import { apiClient } from '../lib/api';
import { ToolExecutor, ToolCall } from './ToolExecutor';
import toolsConfig from '../config/tools.json';

export interface GeminiToolResponse {
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: any[];
  confidence: number;
}

export class GeminiToolService extends GeminiService {
  
  /**
   * Generate content with tool calling support
   * Gemini 2.5 Flash supports native function calling
   */
  static async generateWithTools(
    message: string,
    context: any,
    userId: string,
    availableTools?: any[]
  ): Promise<GeminiToolResponse> {
    try {
      // First, check if the message might need a tool
      const toolIntent = ToolExecutor.parseIntent(message);
      
      // Get user's model configuration (defaults to gemini-2.5-flash)
      const modelConfig = await this.getUserModelConfig(userId);
      
      // Prepare the prompt with tool awareness
      const systemPrompt = `You are SYNA, an AI assistant that can interact with the user's workspace.
You have access to tools that can:
- Open surfaces (documents, dashboards, metrics) when the user asks to see something
- Create new documents and content
- Summon specialized agents to help with tasks
- Analyze data and metrics

When the user asks to see, show, or open something, use the attach_surface tool.
When they ask to create something new, use the create_document tool.
When they need specialized help, use the summon_agent tool.

Available surfaces you can open:
- business-plan: Business planning and strategy
- proforma: Financial projections and models
- metrics: Key business metrics and KPIs
- revenue: Revenue analysis and forecasting
- strategy: Strategic planning and initiatives
- swot-analysis: SWOT analysis
- customers: Customer data and insights
- documents: Document management
- settings: Application settings

Current context: ${context.type} workspace
Active surfaces: ${Object.keys(context.surfaces).filter(s => context.surfaces[s]?.visible).join(', ') || 'none'}`;

      // Build the request with tools
      const requestBody = {
        prompt: message,
        system: systemPrompt,
        model: modelConfig.model_name || 'gemini-2.5-flash',
        config: {
          temperature: modelConfig.temperature || 0.7,
          topK: modelConfig.top_k || 40,
          topP: modelConfig.top_p || 0.95,
          maxOutputTokens: modelConfig.max_output_tokens || 1024,
        },
        tools: toolsConfig.tools // Include tool definitions
      };

      console.log('🔧 Calling Gemini 2.5 Flash with tools:', {
        model: requestBody.model,
        hasTools: !!requestBody.tools,
        toolCount: requestBody.tools?.[0]?.functionDeclarations?.length
      });

      // Make the API call
      const response = await apiClient.post<{
        content: string;
        functionCall?: {
          name: string;
          args: any;
        };
        confidence: number;
      }>('/api/v1/agents/generate-with-tools', requestBody);

      if (response.error) {
        throw new Error(`API Error: ${response.error}`);
      }

      // Handle function call if present
      let toolResults;
      if (response.data?.functionCall) {
        console.log('🔧 Gemini requested tool call:', response.data.functionCall);
        
        const toolCall: ToolCall = {
          name: response.data.functionCall.name,
          args: response.data.functionCall.args
        };

        // Execute the tool
        const executor = ToolExecutor.getInstance();
        const result = await executor.execute(toolCall);
        
        toolResults = [result];

        // If tool execution was successful, we might want to generate a follow-up response
        if (result.success) {
          // Add tool result to the response content
          const enhancedContent = `${response.data.content}\n\n✅ ${result.message}`;
          return {
            content: enhancedContent,
            toolCalls: [toolCall],
            toolResults,
            confidence: response.data.confidence || 0.8
          };
        }
      }

      // Return response with or without tool calls
      return {
        content: response.data?.content || 'I can help you with that. What would you like to see?',
        toolCalls: response.data?.functionCall ? [{
          name: response.data.functionCall.name,
          args: response.data.functionCall.args
        }] : undefined,
        toolResults,
        confidence: response.data?.confidence || 0.5
      };

    } catch (error) {
      console.error('Error in generateWithTools:', error);
      
      // Fallback to intent-based tool execution
      const toolIntent = ToolExecutor.parseIntent(message);
      if (toolIntent) {
        const executor = ToolExecutor.getInstance();
        const result = await executor.execute(toolIntent);
        
        if (result.success) {
          return {
            content: result.message || 'Action completed successfully',
            toolCalls: [toolIntent],
            toolResults: [result],
            confidence: 0.7
          };
        }
      }

      // Final fallback
      return {
        content: 'I understand you want to interact with the workspace. Try asking me to "show" or "open" specific surfaces like the business plan, metrics, or financial projections.',
        confidence: 0.3
      };
    }
  }

  /**
   * Parse tool calls from Gemini response
   * Gemini 2.5 Flash returns function calls in a specific format
   */
  static parseToolCalls(response: any): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // Check for function_call in response (Gemini format)
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.functionCall) {
          toolCalls.push({
            name: part.functionCall.name,
            args: part.functionCall.args
          });
        }
      }
    }

    // Also check for our custom format
    if (response.functionCall) {
      toolCalls.push({
        name: response.functionCall.name,
        args: response.functionCall.args
      });
    }

    return toolCalls;
  }
}