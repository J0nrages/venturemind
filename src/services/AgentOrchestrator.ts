import { supabase } from '../lib/supabase';
import { OrchestrationService, OrchestrationResult } from './OrchestrationService';
import { SSEService } from './SSEService';
import { GeminiService } from './GeminiService';
import { DocumentService } from './DocumentService';

export interface AgentState {
  userId: string;
  message: string;
  conversationHistory: any[];
  documents: any[];
  retrievedClips: any[];
  plannedActions: any[];
  executedActions: any[];
  currentResponse: string;
  traceId: string;
  step: 'initializing' | 'retrieving' | 'planning' | 'executing' | 'responding' | 'complete';
}

export class AgentOrchestrator {
  // Main orchestration entry point with real-time streaming
  static async processMessage(
    userId: string,
    message: string,
    conversationHistory: any[],
    documents: any[]
  ): Promise<OrchestrationResult> {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const initialState: AgentState = {
      userId,
      message,
      conversationHistory,
      documents,
      retrievedClips: [],
      plannedActions: [],
      executedActions: [],
      currentResponse: '',
      traceId,
      step: 'initializing'
    };

    try {
      // Initialize AI services
      await GeminiService.initialize(userId);
      
      // Stream initial state
      await SSEService.sendActionStart(userId, 'orchestrate', traceId);
      
      // Execute the orchestration pipeline
      const result = await this.runOrchestrationPipeline(initialState);
      
      // Stream completion
      await SSEService.sendActionComplete(userId, 'orchestrate', {
        clips_retrieved: result.clips_retrieved.length,
        sections_updated: result.sections_updated.length,
        response_length: result.response.length
      }, traceId);
      
      return result;
      
    } catch (error) {
      console.error('Orchestration failed:', error);
      
      // Stream error
      await SSEService.sendEvent(userId, {
        type: 'action_complete',
        data: { 
          action_type: 'orchestrate', 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        },
        timestamp: new Date().toISOString(),
        trace_id: traceId
      });
      
      throw error;
    }
  }

  // Core orchestration pipeline using state machine pattern
  private static async runOrchestrationPipeline(state: AgentState): Promise<OrchestrationResult> {
    const pipeline = [
      this.retrieveStep,
      this.planStep,
      this.executeStep,
      this.respondStep
    ];

    let currentState = { ...state };
    
    for (const step of pipeline) {
      currentState = await step.call(this, currentState);
      
      // Stream progress update
      await SSEService.sendActionProgress(currentState.userId, 'orchestrate', {
        step: currentState.step,
        clips_retrieved: currentState.retrievedClips.length,
        actions_planned: currentState.plannedActions.length,
        actions_executed: currentState.executedActions.length
      }, currentState.traceId);
    }

    return {
      response: currentState.currentResponse,
      actions: currentState.executedActions,
      clips_retrieved: currentState.retrievedClips,
      sections_updated: [], // This would be populated by actual executions
      confidence: currentState.retrievedClips.length > 0 ? 0.8 : 0.5,
      trace_id: currentState.traceId
    };
  }

  // Step 1: Retrieve relevant context
  private static async retrieveStep(state: AgentState): Promise<AgentState> {
    const newState = { ...state, step: 'retrieving' as const };
    
    await SSEService.sendActionStart(state.userId, 'retrieve_context', state.traceId);
    
    try {
      // Search for relevant clips
      const clips = await OrchestrationService.searchClips(state.userId, state.message, 5);
      
      // Stream each retrieved clip
      for (const clip of clips) {
        await SSEService.sendClipRetrieved(state.userId, clip, state.traceId);
      }
      
      newState.retrievedClips = clips;
      
      await SSEService.sendActionComplete(state.userId, 'retrieve_context', {
        clips_found: clips.length
      }, state.traceId);
      
    } catch (error) {
      console.error('Retrieve step failed:', error);
      newState.retrievedClips = [];
    }
    
    return newState;
  }

  // Step 2: Plan actions based on context
  private static async planStep(state: AgentState): Promise<AgentState> {
    const newState = { ...state, step: 'planning' as const };
    
    await SSEService.sendActionStart(state.userId, 'plan', state.traceId);
    
    try {
      // Use AI to plan actions based on message and context
      const hasGeminiKey = await GeminiService.initialize(state.userId);
      let plannedActions = [];

      if (hasGeminiKey) {
        const contextText = state.retrievedClips.map(clip => clip.content).join('\n\n');
        const documentsList = state.documents.map(doc => `- ${doc.name} (${doc.type})`).join('\n');
        
        const planningPrompt = `
You are an AI action planner. Based on the user message and context, suggest specific actions.

User Message: "${state.message}"

Retrieved Context:
${contextText}

Available Documents:
${documentsList}

Plan actions as JSON array:
[
  {
    "action_type": "update_doc_section|create_document|suggest_actions",
    "target": "document_name or section_title",
    "reasoning": "why this action is needed",
    "priority": 1-5,
    "content": "specific content to add/update"
  }
]
`;

        try {
          const response = await GeminiService.generateContent(planningPrompt);
          plannedActions = JSON.parse(response.content);
        } catch (planError) {
          console.error('Error parsing planned actions:', planError);
          plannedActions = this.fallbackPlanning(state.message, state.documents);
        }
      } else {
        plannedActions = this.fallbackPlanning(state.message, state.documents);
      }

      newState.plannedActions = plannedActions;
      
      await SSEService.sendActionComplete(state.userId, 'plan', {
        actions_planned: plannedActions.length,
        actions: plannedActions.map(a => a.action_type)
      }, state.traceId);
      
    } catch (error) {
      console.error('Planning step failed:', error);
      newState.plannedActions = [];
    }
    
    return newState;
  }

  // Step 3: Execute planned actions
  private static async executeStep(state: AgentState): Promise<AgentState> {
    const newState = { ...state, step: 'executing' as const };
    
    for (const action of state.plannedActions) {
      await SSEService.sendActionStart(state.userId, action.action_type, state.traceId);
      
      try {
        // Execute the action (simplified for now)
        const result = await this.executeAction(state.userId, action, state.traceId);
        newState.executedActions.push(result);
        
        // Stream document updates
        if (action.action_type === 'update_doc_section' && action.target) {
          await SSEService.sendDocumentUpdated(state.userId, action.target, result.section_id, state.traceId);
        }
        
        await SSEService.sendActionComplete(state.userId, action.action_type, result, state.traceId);
        
      } catch (error) {
        console.error(`Action execution failed for ${action.action_type}:`, error);
      }
    }
    
    return newState;
  }

  // Step 4: Generate response
  private static async respondStep(state: AgentState): Promise<AgentState> {
    const newState = { ...state, step: 'responding' as const };
    
    await SSEService.sendActionStart(state.userId, 'respond', state.traceId);
    
    try {
      const hasGeminiKey = await GeminiService.initialize(state.userId);
      let response = '';

      if (hasGeminiKey) {
        const executionSummary = state.executedActions
          .map(action => `${action.action_type}: completed`)
          .join(', ');

        const responsePrompt = `
Based on the user's message and actions taken, generate a helpful response.

User Message: "${state.message}"
Actions Completed: ${executionSummary}
Context Retrieved: ${state.retrievedClips.length} relevant clips

Generate a concise, helpful response (2-3 sentences) that:
1. Acknowledges what was done
2. Provides insights if applicable
3. Suggests next steps if appropriate
`;

        const geminiResponse = await GeminiService.generateContent(responsePrompt);
        response = geminiResponse.content;
      } else {
        const actionsCount = state.executedActions.length;
        const clipsCount = state.retrievedClips.length;
        
        response = `I've processed your message with ${clipsCount} context reference(s) and completed ${actionsCount} action(s). The information has been organized in your documents.`;
      }

      newState.currentResponse = response;
      newState.step = 'complete';
      
      // Stream response chunks (simulate streaming)
      const words = response.split(' ');
      for (let i = 0; i < words.length; i += 3) {
        const chunk = words.slice(i, i + 3).join(' ') + ' ';
        await SSEService.sendResponseChunk(state.userId, chunk, state.traceId);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate typing delay
      }
      
      await SSEService.sendActionComplete(state.userId, 'respond', {
        response_length: response.length
      }, state.traceId);
      
    } catch (error) {
      console.error('Response step failed:', error);
      newState.currentResponse = "I've processed your message and organized the information.";
    }
    
    return newState;
  }

  // Execute individual actions
  private static async executeAction(userId: string, action: any, traceId: string): Promise<any> {
    const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Log action execution
    const logEntry = await OrchestrationService.logAction({
      user_id: userId,
      action_type: action.action_type,
      tool_name: action.action_type,
      input_data: action,
      output_data: {},
      status: 'running',
      trace_id: traceId,
      started_at: new Date().toISOString()
    });

    try {
      let result = {};
      
      switch (action.action_type) {
        case 'update_doc_section':
          console.log('📝 Executing document section update:', action.target);
          result = await this.updateDocumentSection(userId, action);
          break;
        case 'create_document':
          console.log('📄 Executing document creation:', action.target);
          result = await this.createDocument(userId, action);
          break;
        case 'suggest_actions':
          console.log('💡 Executing suggestions generation');
          result = await this.generateSuggestions(userId, action);
          break;
        default:
          console.log(`⚠️ Unimplemented action type: ${action.action_type}`);
          result = { 
            message: `[PLACEHOLDER] Action '${action.action_type}' not implemented yet`, 
            action_type: action.action_type,
            status: 'placeholder'
          };
      }

      // Update log entry
      await OrchestrationService.updateActionLog(logEntry.id, {
        status: 'completed',
        output_data: result,
        execution_time_ms: Date.now() - new Date(logEntry.started_at).getTime(),
        completed_at: new Date().toISOString()
      });

      return { ...result, log_id: logEntry.id, action_type: action.action_type };
      
    } catch (error) {
      // Update log entry with error
      await OrchestrationService.updateActionLog(logEntry.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - new Date(logEntry.started_at).getTime(),
        completed_at: new Date().toISOString()
      });

      throw error;
    }
  }

  // Action execution methods
  private static async updateDocumentSection(userId: string, action: any): Promise<any> {
    console.log(`📝 REAL IMPLEMENTATION: Document section update for: ${action.target}`);
    
    try {
      // Step 1: Find the target document
      const documents = await DocumentService.getUserDocuments(userId);
      const targetDoc = documents.find(doc => 
        doc.name.toLowerCase().includes(action.target.toLowerCase()) ||
        doc.category === action.target ||
        doc.subcategory === action.target
      );

      if (!targetDoc) {
        console.log(`📝 Document not found: ${action.target}, creating new section`);
        return {
          message: `Document "${action.target}" not found - would create new document`,
          section_id: `section_${Date.now()}`,
          content_added: action.content || 'Content would be added to new document',
          status: 'document_not_found'
        };
      }

      // Step 2: Update the document content
      const newContent = this.appendToDocumentContent(targetDoc.content, action.content);
      
      console.log(`📝 Updating document: ${targetDoc.name}`);
      const updatedDoc = await DocumentService.updateDocument(targetDoc.id, {
        content: newContent
      });

      // Step 3: Log the action
      console.log(`✅ Successfully updated document: ${targetDoc.name}`);
      
      return {
        message: `Successfully updated "${targetDoc.name}"`,
        section_id: targetDoc.id,
        content_added: action.content,
        document_name: targetDoc.name,
        status: 'completed'
      };

    } catch (error) {
      console.error(`❌ Error updating document section:`, error);
      return {
        message: `Failed to update document: ${error.message}`,
        section_id: null,
        content_added: action.content,
        status: 'error'
      };
    }
  }

  private static async createDocument(userId: string, action: any): Promise<any> {
    console.log(`📄 REAL IMPLEMENTATION: Document creation for: ${action.target}`);
    
    try {
      // Step 1: Determine document type and category
      const category = this.determineDocumentCategory(action.target);
      const timestamp = new Date().toLocaleString();
      
      // Step 2: Create initial content
      const initialContent = `# ${action.target}\n\nCreated: ${timestamp}\nAuto-generated by Agent Orchestrator\n\n${action.content || 'Document content will be added here.'}`;

      // Step 3: Create the document
      const newDocument = {
        user_id: userId,
        name: action.target,
        type: 'agent_generated' as any,
        content: initialContent,
        category: category,
        subcategory: action.subcategory || 'AI Generated',
        is_template_based: false
      };

      console.log(`📄 Creating new document: ${action.target}`);
      const createdDoc = await DocumentService.createDocument(newDocument);

      console.log(`✅ Successfully created document: ${createdDoc.name}`);
      
      return {
        message: `Successfully created "${createdDoc.name}"`,
        document_id: createdDoc.id,
        document_name: createdDoc.name,
        status: 'completed'
      };

    } catch (error) {
      console.error(`❌ Error creating document:`, error);
      return {
        message: `Failed to create document: ${error.message}`,
        document_id: null,
        document_name: action.target,
        status: 'error'
      };
    }
  }

  private static async generateSuggestions(userId: string, action: any): Promise<any> {
    console.log('💡 [PLACEHOLDER] Strategic suggestions generation');
    console.log('💡 Real implementation would:');
    console.log('  - Analyze conversation context and history');
    console.log('  - Use AI to generate personalized suggestions');
    console.log('  - Consider user\'s business domain and goals');
    console.log('  - Rank suggestions by relevance and impact');
    
    return {
      message: '[SIMULATED] Generated strategic suggestions',
      suggestions: [
        '[AI-Generated] Consider expanding to new market segments',
        '[AI-Generated] Evaluate current pricing strategy', 
        '[AI-Generated] Review operational efficiency metrics'
      ],
      status: 'placeholder'
    };
  }

  // Helper method to append content to document
  private static appendToDocumentContent(existingContent: string, newContent: string): string {
    const timestamp = new Date().toLocaleString();
    const separator = '\n\n---\n\n';
    
    // Create a structured update entry
    const updateEntry = `**Agent Update - ${timestamp}**\n\n${newContent}`;
    
    // Append to existing content
    return existingContent + separator + updateEntry;
  }

  // Helper method to determine document category
  private static determineDocumentCategory(documentName: string): string {
    const name = documentName.toLowerCase();
    
    if (name.includes('strategy') || name.includes('plan') || name.includes('roadmap')) {
      return 'business';
    } else if (name.includes('technical') || name.includes('architecture') || name.includes('code')) {
      return 'business'; // Still business category but technical focus
    } else if (name.includes('note') || name.includes('idea') || name.includes('thought')) {
      return 'personal';
    } else {
      return 'business'; // Default to business
    }
  }

  // Fallback planning when AI is not available
  private static fallbackPlanning(message: string, documents: any[]): any[] {
    const messageLower = message.toLowerCase();
    const actions = [];

    if (messageLower.includes('save') || messageLower.includes('remember')) {
      actions.push({
        action_type: 'update_doc_section',
        target: 'Strategic Plan',
        reasoning: 'User wants to save information',
        priority: 1,
        content: message
      });
    }

    if (messageLower.includes('product') || messageLower.includes('feature')) {
      const productDoc = documents.find(d => d.name.includes('Product') || d.type === 'product');
      if (productDoc) {
        actions.push({
          action_type: 'update_doc_section',
          target: productDoc.name,
          reasoning: 'Product-related content',
          priority: 2,
          content: message
        });
      }
    }

    if (messageLower.includes('strategy') || messageLower.includes('goal')) {
      actions.push({
        action_type: 'suggest_actions',
        target: 'strategic_suggestions',
        reasoning: 'Strategic planning request',
        priority: 2
      });
    }

    return actions;
  }
}