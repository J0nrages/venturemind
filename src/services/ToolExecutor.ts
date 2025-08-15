/**
 * Tool Executor for SYNA AI System
 * Handles execution of tool calls from Gemini 2.5 Flash
 */

import { useContexts } from '../contexts/WorkspaceProvider';
import { DocumentService } from './DocumentService';
import { AgentOrchestrationService } from './AgentOrchestrationService';
import toast from 'react-hot-toast';
import toolsConfig from '../config/tools.json';

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export class ToolExecutor {
  private static instance: ToolExecutor;
  private workspaceContext: any;

  static getInstance(): ToolExecutor {
    if (!this.instance) {
      this.instance = new ToolExecutor();
    }
    return this.instance;
  }

  setWorkspaceContext(context: any) {
    this.workspaceContext = context;
  }

  /**
   * Execute a tool call from the AI
   */
  async execute(toolCall: ToolCall): Promise<ToolResult> {
    console.log('🔧 Executing tool:', toolCall);

    try {
      switch (toolCall.name) {
        case 'attach_surface':
          return await this.attachSurface(toolCall.args);
        
        case 'detach_surface':
          return await this.detachSurface(toolCall.args);
        
        case 'create_document':
          return await this.createDocument(toolCall.args);
        
        case 'summon_agent':
          return await this.summonAgent(toolCall.args);
        
        case 'analyze_metrics':
          return await this.analyzeMetrics(toolCall.args);
        
        default:
          return {
            success: false,
            error: `Unknown tool: ${toolCall.name}`
          };
      }
    } catch (error) {
      console.error('Tool execution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed'
      };
    }
  }

  /**
   * Attach a surface to the current workspace
   */
  private async attachSurface(args: any): Promise<ToolResult> {
    const { surfaceType, surfaceId, reason } = args;
    
    if (!this.workspaceContext) {
      return {
        success: false,
        error: 'Workspace context not available'
      };
    }

    try {
      // Update the workspace to show the surface
      this.workspaceContext.updateContextSurface(
        this.workspaceContext.contexts[this.workspaceContext.currentContextIndex].id,
        'document',
        {
          visible: true,
          title: surfaceId,
          selectedPage: surfaceId
        }
      );

      toast.success(`Opened ${surfaceId}${reason ? `: ${reason}` : ''}`);

      return {
        success: true,
        message: `Successfully opened ${surfaceId} surface`,
        data: { surfaceType, surfaceId }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to attach surface: ${error}`
      };
    }
  }

  /**
   * Detach a surface from the current workspace
   */
  private async detachSurface(args: any): Promise<ToolResult> {
    const { surfaceType } = args;
    
    if (!this.workspaceContext) {
      return {
        success: false,
        error: 'Workspace context not available'
      };
    }

    try {
      this.workspaceContext.updateContextSurface(
        this.workspaceContext.contexts[this.workspaceContext.currentContextIndex].id,
        surfaceType === 'document' ? 'document' : 'agents',
        {
          visible: false
        }
      );

      toast.success(`Closed ${surfaceType} surface`);

      return {
        success: true,
        message: `Successfully closed ${surfaceType} surface`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to detach surface: ${error}`
      };
    }
  }

  /**
   * Create a new document
   */
  private async createDocument(args: any): Promise<ToolResult> {
    const { title, category, content } = args;

    try {
      const document = await DocumentService.createDocument({
        name: title,
        category,
        content: content || '',
        type: 'custom',
        status: 'draft'
      });

      toast.success(`Created document: ${title}`);

      return {
        success: true,
        message: `Successfully created document "${title}"`,
        data: { documentId: document.id }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create document: ${error}`
      };
    }
  }

  /**
   * Summon an agent to help with a task
   */
  private async summonAgent(args: any): Promise<ToolResult> {
    const { agentType, task } = args;

    try {
      // Add agent to context
      if (this.workspaceContext) {
        const agentId = `${agentType}_${Date.now()}`;
        this.workspaceContext.addAgentToContext(
          this.workspaceContext.contexts[this.workspaceContext.currentContextIndex].id,
          agentId
        );
      }

      toast.success(`${agentType} agent joined to help with: ${task}`);

      return {
        success: true,
        message: `${agentType} agent is now helping with: ${task}`,
        data: { agentType, task }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to summon agent: ${error}`
      };
    }
  }

  /**
   * Analyze business metrics
   */
  private async analyzeMetrics(args: any): Promise<ToolResult> {
    const { metricType, timeframe } = args;

    try {
      // In a real implementation, this would fetch and analyze actual metrics
      const mockAnalysis = {
        metricType,
        timeframe: timeframe || 'monthly',
        insights: [
          `${metricType} shows positive trend`,
          `Key driver: increased user engagement`,
          `Recommendation: focus on retention`
        ]
      };

      // Open the metrics surface to show the analysis
      if (this.workspaceContext) {
        this.workspaceContext.updateContextSurface(
          this.workspaceContext.contexts[this.workspaceContext.currentContextIndex].id,
          'document',
          {
            visible: true,
            title: 'Metrics Analysis',
            selectedPage: 'metrics'
          }
        );
      }

      return {
        success: true,
        message: `Analysis complete for ${metricType}`,
        data: mockAnalysis
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze metrics: ${error}`
      };
    }
  }

  /**
   * Get available tools configuration
   */
  static getToolsConfig() {
    return toolsConfig.tools;
  }

  /**
   * Parse natural language to detect tool intent
   */
  static parseIntent(message: string): ToolCall | null {
    const lower = message.toLowerCase();
    
    // Surface attachment patterns
    if (lower.match(/(?:show|open|display|pull up|bring up|let me see|can i see|I want to see)/)) {
      // Extract what to show
      const surfaceMap: Record<string, string> = {
        'financial': 'proforma',
        'projection': 'proforma',
        'metrics': 'metrics',
        'dashboard': 'dashboard',
        'business plan': 'business-plan',
        'strategy': 'strategy',
        'swot': 'swot-analysis',
        'revenue': 'revenue',
        'customer': 'customers',
        'document': 'documents',
        'setting': 'settings'
      };

      for (const [key, value] of Object.entries(surfaceMap)) {
        if (lower.includes(key)) {
          return {
            name: 'attach_surface',
            args: {
              surfaceType: 'document',
              surfaceId: value,
              reason: `User requested to see ${key}`
            }
          };
        }
      }
    }

    // Document creation patterns
    if (lower.match(/(?:create|make|draft|write|start)\s+(?:a\s+)?(?:new\s+)?(?:document|doc|report)/)) {
      return {
        name: 'create_document',
        args: {
          title: 'New Document',
          category: 'strategic'
        }
      };
    }

    // Agent summoning patterns
    if (lower.match(/(?:get|summon|call|bring|need)\s+(?:the\s+)?(\w+)\s+(?:agent|help)/)) {
      const match = lower.match(/(?:get|summon|call|bring|need)\s+(?:the\s+)?(\w+)\s+(?:agent|help)/);
      if (match) {
        return {
          name: 'summon_agent',
          args: {
            agentType: match[1],
            task: message
          }
        };
      }
    }

    return null;
  }
}