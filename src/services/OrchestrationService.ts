import { supabase } from '../lib/supabase';
import { GeminiService } from './GeminiService';

export interface Clip {
  id: string;
  user_id: string;
  content: string;
  topic?: string;
  entities: string[];
  embedding?: number[];
  confidence: number;
  source_type: 'conversation' | 'document' | 'external' | 'system';
  source_id?: string;
  provenance: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DocSection {
  id: string;
  user_id: string;
  document_id: string;
  section_type: 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'quote';
  section_title?: string;
  section_content: string;
  section_order: number;
  start_position?: number;
  end_position?: number;
  embedding?: number[];
  is_targetable: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ActionLogEntry {
  id: string;
  user_id: string;
  conversation_message_id?: string;
  action_type: 'retrieve_context' | 'suggest_actions' | 'update_doc_section' | 'create_document' | 'orchestrate' | 'plan' | 'tool_call' | 'observe';
  tool_name?: string;
  input_data: any;
  output_data: any;
  status: 'pending' | 'running' | 'completed' | 'failed';
  error_message?: string;
  execution_time_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  trace_id?: string;
  parent_action_id?: string;
  metadata: any;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface OrchestrationResult {
  response: string;
  actions: ActionLogEntry[];
  clips_retrieved: Clip[];
  sections_updated: DocSection[];
  confidence: number;
  trace_id: string;
}

export class OrchestrationService {
  // Create and manage clips for conversation memory
  static async createClip(clip: Omit<Clip, 'id' | 'created_at' | 'updated_at'>): Promise<Clip> {
    const { data, error } = await supabase
      .from('clips')
      .insert(clip)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getClips(userId: string, limit = 50): Promise<Clip[]> {
    const { data, error } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Semantic search for relevant clips
  static async searchClips(userId: string, query: string, limit = 10): Promise<Clip[]> {
    console.log(`🔍 [PLACEHOLDER] Semantic search for clips: "${query}"`);
    console.log('🔍 Real implementation would:');
    console.log('  - Generate embeddings using OpenAI/Gemini embedding models');
    console.log('  - Search pgvector database for similar content');
    console.log('  - Return ranked clips by semantic similarity');
    console.log('  - Consider user context and conversation history');
    
    try {
      // [PLACEHOLDER] Generate embedding for query
      console.log('🧠 [SIMULATED] Generating embeddings...');
      const embedding = await this.generateEmbedding(query);
      
      // [PLACEHOLDER] Use pgvector similarity search
      console.log('🗄️ [SIMULATED] Searching vector database...');
      const { data, error } = await supabase.rpc('search_clips', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit,
        user_id: userId
      });

      if (error) {
        console.log('⚠️ [EXPECTED] Vector search function not implemented in Supabase');
        return [];
      }
      return data || [];
    } catch (error) {
      console.log('⚠️ [EXPECTED] Semantic search not fully implemented:', error.message);
      return [];
    }
  }

  // Document section management
  static async createDocSection(section: Omit<DocSection, 'id' | 'created_at' | 'updated_at'>): Promise<DocSection> {
    const { data, error } = await supabase
      .from('doc_sections')
      .insert(section)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getDocSections(documentId: string): Promise<DocSection[]> {
    const { data, error } = await supabase
      .from('doc_sections')
      .select('*')
      .eq('document_id', documentId)
      .eq('is_targetable', true)
      .order('section_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async updateDocSection(sectionId: string, updates: Partial<DocSection>): Promise<DocSection> {
    const { data, error } = await supabase
      .from('doc_sections')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Action logging for observability
  static async logAction(action: Omit<ActionLogEntry, 'id' | 'created_at'>): Promise<ActionLogEntry> {
    const { data, error } = await supabase
      .from('action_log')
      .insert(action)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateActionLog(actionId: string, updates: Partial<ActionLogEntry>): Promise<ActionLogEntry> {
    const { data, error } = await supabase
      .from('action_log')
      .update(updates)
      .eq('id', actionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getActionLog(userId: string, limit = 100): Promise<ActionLogEntry[]> {
    const { data, error } = await supabase
      .from('action_log')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Core orchestration method - the main entry point
  static async orchestrateConversation(
    userId: string,
    message: string,
    conversationHistory: any[],
    documents: any[]
  ): Promise<OrchestrationResult> {
    const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // Log orchestration start
    const orchestrateAction = await this.logAction({
      user_id: userId,
      action_type: 'orchestrate',
      input_data: { message, documents_count: documents.length },
      output_data: {},
      status: 'running',
      trace_id: traceId,
      started_at: new Date().toISOString()
    });

    try {
      // Step 1: Retrieve relevant context
      const contextClips = await this.retrieveContext(userId, message, traceId, orchestrateAction.id);
      
      // Step 2: Plan actions based on context and message
      const plannedActions = await this.planActions(userId, message, contextClips, documents, traceId, orchestrateAction.id);
      
      // Step 3: Execute planned actions
      const executionResults = await this.executeActions(userId, plannedActions, traceId, orchestrateAction.id);
      
      // Step 4: Generate response based on execution results
      const response = await this.generateResponse(userId, message, executionResults, traceId, orchestrateAction.id);
      
      // Step 5: Create clip for this conversation
      await this.createConversationClip(userId, message, response, contextClips, traceId);
      
      // Update orchestration action
      const executionTime = Date.now() - startTime;
      await this.updateActionLog(orchestrateAction.id, {
        status: 'completed',
        output_data: {
          clips_retrieved: contextClips.length,
          actions_executed: executionResults.length,
          response_length: response.length
        },
        execution_time_ms: executionTime,
        completed_at: new Date().toISOString()
      });

      return {
        response,
        actions: [orchestrateAction, ...executionResults],
        clips_retrieved: contextClips,
        sections_updated: executionResults
          .filter(r => r.action_type === 'update_doc_section')
          .map(r => r.output_data.section)
          .filter(Boolean),
        confidence: contextClips.length > 0 ? 0.8 : 0.5,
        trace_id: traceId
      };

    } catch (error) {
      // Log orchestration failure
      await this.updateActionLog(orchestrateAction.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString()
      });

      throw error;
    }
  }

  // Step 1: Retrieve relevant context
  private static async retrieveContext(
    userId: string, 
    message: string, 
    traceId: string, 
    parentActionId: string
  ): Promise<Clip[]> {
    const action = await this.logAction({
      user_id: userId,
      action_type: 'retrieve_context',
      tool_name: 'semantic_search',
      input_data: { query: message },
      output_data: {},
      status: 'running',
      trace_id: traceId,
      parent_action_id: parentActionId,
      started_at: new Date().toISOString()
    });

    try {
      const startTime = Date.now();
      const clips = await this.searchClips(userId, message, 10);
      
      await this.updateActionLog(action.id, {
        status: 'completed',
        output_data: { clips_found: clips.length, clips: clips.map(c => c.id) },
        execution_time_ms: Date.now() - startTime,
        completed_at: new Date().toISOString()
      });

      return clips;
    } catch (error) {
      await this.updateActionLog(action.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        execution_time_ms: Date.now() - Date.now(),
        completed_at: new Date().toISOString()
      });
      
      return [];
    }
  }

  // Step 2: Plan actions based on context
  private static async planActions(
    userId: string,
    message: string,
    contextClips: Clip[],
    documents: any[],
    traceId: string,
    parentActionId: string
  ): Promise<any[]> {
    const action = await this.logAction({
      user_id: userId,
      action_type: 'plan',
      tool_name: 'action_planner',
      input_data: { 
        message, 
        context_clips: contextClips.length, 
        documents_available: documents.length 
      },
      output_data: {},
      status: 'running',
      trace_id: traceId,
      parent_action_id: parentActionId,
      started_at: new Date().toISOString()
    });

    try {
      // Use AI to plan what actions to take
      const hasGeminiKey = await GeminiService.initialize(userId);
      let plannedActions = [];

      if (hasGeminiKey) {
        const contextText = contextClips.map(clip => clip.content).join('\n\n');
        const documentsList = documents.map(doc => `- ${doc.name} (${doc.type})`).join('\n');
        
        const planningPrompt = `
You are an AI action planner. Based on the user message and available context, suggest specific actions to take.

User Message: "${message}"

Available Context:
${contextText}

Available Documents:
${documentsList}

Suggest actions as JSON array:
[
  {
    "action_type": "retrieve_context|suggest_actions|update_doc_section|create_document",
    "target": "document_name or section_id",
    "reasoning": "why this action is needed",
    "priority": 1-5
  }
]

Focus on actionable, specific suggestions. If the message relates to existing context or documents, suggest updates.
`;

        try {
          const response = await GeminiService.generateContent(planningPrompt);
          plannedActions = JSON.parse(response.content);
        } catch (planError) {
          console.error('Error parsing planned actions:', planError);
          plannedActions = this.fallbackActionPlanning(message, documents);
        }
      } else {
        plannedActions = this.fallbackActionPlanning(message, documents);
      }

      await this.updateActionLog(action.id, {
        status: 'completed',
        output_data: { planned_actions: plannedActions },
        execution_time_ms: Date.now() - Date.now(),
        completed_at: new Date().toISOString()
      });

      return plannedActions;
    } catch (error) {
      await this.updateActionLog(action.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });
      
      return this.fallbackActionPlanning(message, documents);
    }
  }

  // Step 3: Execute planned actions
  private static async executeActions(
    userId: string,
    plannedActions: any[],
    traceId: string,
    parentActionId: string
  ): Promise<ActionLogEntry[]> {
    const executionResults: ActionLogEntry[] = [];

    for (const plannedAction of plannedActions) {
      const action = await this.logAction({
        user_id: userId,
        action_type: plannedAction.action_type,
        tool_name: plannedAction.tool_name || plannedAction.action_type,
        input_data: plannedAction,
        output_data: {},
        status: 'running',
        trace_id: traceId,
        parent_action_id: parentActionId,
        started_at: new Date().toISOString()
      });

      try {
        let result = {};
        
        switch (plannedAction.action_type) {
          case 'update_doc_section':
            result = await this.executeDocumentUpdate(userId, plannedAction);
            break;
          case 'create_document':
            result = await this.executeDocumentCreation(userId, plannedAction);
            break;
          case 'suggest_actions':
            result = await this.executeSuggestions(userId, plannedAction);
            break;
          default:
            result = { message: 'Action executed successfully' };
        }

        await this.updateActionLog(action.id, {
          status: 'completed',
          output_data: result,
          execution_time_ms: Date.now() - new Date(action.started_at).getTime(),
          completed_at: new Date().toISOString()
        });

        executionResults.push(action);
      } catch (error) {
        await this.updateActionLog(action.id, {
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          execution_time_ms: Date.now() - new Date(action.started_at).getTime(),
          completed_at: new Date().toISOString()
        });

        executionResults.push(action);
      }
    }

    return executionResults;
  }

  // Step 4: Generate response based on execution results
  private static async generateResponse(
    userId: string,
    originalMessage: string,
    executionResults: ActionLogEntry[],
    traceId: string,
    parentActionId: string
  ): Promise<string> {
    const action = await this.logAction({
      user_id: userId,
      action_type: 'observe',
      tool_name: 'response_generator',
      input_data: { 
        original_message: originalMessage,
        execution_results: executionResults.length
      },
      output_data: {},
      status: 'running',
      trace_id: traceId,
      parent_action_id: parentActionId,
      started_at: new Date().toISOString()
    });

    try {
      const hasGeminiKey = await GeminiService.initialize(userId);
      let response = '';

      if (hasGeminiKey) {
        const executionSummary = executionResults
          .map(result => `${result.action_type}: ${result.status}`)
          .join(', ');

        const responsePrompt = `
Based on the user's message and the actions taken, generate a helpful response.

User Message: "${originalMessage}"
Actions Executed: ${executionSummary}

Generate a conversational response that:
1. Acknowledges what was done
2. Provides helpful insights
3. Suggests next steps if appropriate
4. Maintains a professional but friendly tone

Keep it concise (2-3 sentences).
`;

        const geminiResponse = await GeminiService.generateContent(responsePrompt);
        response = geminiResponse.content;
      } else {
        const completedActions = executionResults.filter(r => r.status === 'completed').length;
        response = `I've processed your message and completed ${completedActions} action(s). The information has been organized in your documents for future reference.`;
      }

      await this.updateActionLog(action.id, {
        status: 'completed',
        output_data: { response },
        execution_time_ms: Date.now() - new Date(action.started_at).getTime(),
        completed_at: new Date().toISOString()
      });

      return response;
    } catch (error) {
      await this.updateActionLog(action.id, {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      });

      return "I've processed your message and organized the information in your documents.";
    }
  }

  // Create conversation clip for memory
  private static async createConversationClip(
    userId: string,
    message: string,
    response: string,
    contextClips: Clip[],
    traceId: string
  ): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(message);
      
      await this.createClip({
        user_id: userId,
        content: `User: ${message}\nAI: ${response}`,
        topic: this.extractTopic(message),
        entities: this.extractEntities(message),
        embedding,
        confidence: contextClips.length > 0 ? 0.8 : 0.6,
        source_type: 'conversation',
        source_id: traceId,
        provenance: {
          context_clips_used: contextClips.map(c => c.id),
          trace_id: traceId
        },
        metadata: {
          message_length: message.length,
          response_length: response.length
        }
      });
    } catch (error) {
      console.error('Error creating conversation clip:', error);
    }
  }

  // Helper methods
  private static async generateEmbedding(text: string): Promise<number[]> {
    console.log(`🧠 [PLACEHOLDER] Generating embedding for text: "${text.slice(0, 50)}..."`);
    console.log('🧠 Real implementation would:');
    console.log('  - Use OpenAI text-embedding-ada-002 or similar');
    console.log('  - Cache embeddings to reduce API calls');
    console.log('  - Handle rate limiting and retries');
    console.log('  - Normalize and validate embedding vectors');
    
    // [SIMULATED] Return a mock embedding (1536 dimensions for OpenAI compatibility)
    return new Array(1536).fill(0).map(() => Math.random() - 0.5);
  }

  private static extractTopic(message: string): string {
    const messageLower = message.toLowerCase();
    
    if (messageLower.includes('revenue') || messageLower.includes('financial')) return 'finance';
    if (messageLower.includes('product') || messageLower.includes('feature')) return 'product';
    if (messageLower.includes('technical') || messageLower.includes('architecture')) return 'technical';
    if (messageLower.includes('strategy') || messageLower.includes('planning')) return 'strategy';
    if (messageLower.includes('team') || messageLower.includes('process')) return 'operations';
    if (messageLower.includes('marketing') || messageLower.includes('customer')) return 'marketing';
    
    return 'general';
  }

  private static extractEntities(message: string): string[] {
    const entities: string[] = [];
    const messageLower = message.toLowerCase();
    
    // Simple entity extraction - in production, use NER models
    const businessTerms = ['revenue', 'customers', 'product', 'feature', 'strategy', 'team', 'process'];
    businessTerms.forEach(term => {
      if (messageLower.includes(term)) {
        entities.push(term);
      }
    });
    
    return entities;
  }

  private static fallbackActionPlanning(message: string, documents: any[]): any[] {
    const messageLower = message.toLowerCase();
    const actions = [];

    // Simple keyword-based action planning
    if (messageLower.includes('save') || messageLower.includes('remember')) {
      actions.push({
        action_type: 'update_doc_section',
        target: 'Strategic Plan',
        reasoning: 'User wants to save information',
        priority: 1
      });
    }

    if (messageLower.includes('product') || messageLower.includes('feature')) {
      const productDoc = documents.find(d => d.name.includes('Product') || d.type === 'product');
      if (productDoc) {
        actions.push({
          action_type: 'update_doc_section',
          target: productDoc.name,
          reasoning: 'Product-related content',
          priority: 2
        });
      }
    }

    return actions;
  }

  private static async executeDocumentUpdate(userId: string, plannedAction: any): Promise<any> {
    // This would implement the actual document update logic
    return {
      message: `Updated ${plannedAction.target}`,
      section_id: `section_${Date.now()}`
    };
  }

  private static async executeDocumentCreation(userId: string, plannedAction: any): Promise<any> {
    // This would implement document creation logic
    return {
      message: `Created new document: ${plannedAction.target}`,
      document_id: `doc_${Date.now()}`
    };
  }

  private static async executeSuggestions(userId: string, plannedAction: any): Promise<any> {
    // This would implement suggestion logic
    return {
      message: 'Generated suggestions based on context',
      suggestions: []
    };
  }
}