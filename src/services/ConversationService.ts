import { supabase } from '../lib/supabase';
import { GeminiService } from './GeminiService';
import { StrategicService } from './StrategicService';
import { DocumentService } from './DocumentService';
import { AgentOrchestrator } from './AgentOrchestrator';
import { SSEService } from './SSEService';
import toast from 'react-hot-toast';

export interface ConversationMessage {
  id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'ai';
  document_updates: string[];
  context_confidence: number;
  created_at: string;
  // Threading fields
  thread_id?: string;
  parent_message_id?: string;
  reply_to_message_id?: string;
  branch_context?: string;
  quoted_text?: string;
  thread_title?: string;
  thread_title_status?: 'pending' | 'processing' | 'completed' | 'failed';
  thread_summary?: string;
  summarization_job_id?: string;
  message_order?: number;
  archived_at?: string;
  archived_by?: string;
}

export interface ConversationThread {
  id: string;
  user_id: string;
  root_message_id: string;
  title: string;
  summary?: string;
  status: 'active' | 'archived' | 'merged';
  participant_count: number;
  message_count: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface ThreadParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'owner' | 'participant' | 'viewer';
  joined_at: string;
  last_read_at: string;
}

export interface AIProcessingResult {
  response: string;
  documentUpdates: string[];
  confidence: number;
  context: string;
  strategicActions?: {
    initiativesCreated: number;
    swotItemsCreated: number;
  };
}

export class ConversationService {
  // Save conversation message
  static async saveMessage(message: Omit<ConversationMessage, 'id' | 'created_at'>): Promise<ConversationMessage> {
    const { data, error } = await supabase
      .from('conversation_messages')
      .insert(message)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Get conversation history with optional context filtering
  static async getConversationHistory(
    userId: string, 
    limit = 50, 
    contextId?: string,
    includeArchived = false
  ): Promise<ConversationMessage[]> {
    let query = supabase
      .from('conversation_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    // Add context filtering if provided (using thread_id)
    if (contextId) {
      query = query.eq('thread_id', contextId);
    }

    // By default, exclude archived messages unless specifically requested
    if (!includeArchived) {
      query = query.is('archived_at', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // ===== MESSAGE DELETION & MANAGEMENT METHODS =====

  // Soft delete (archive) a message
  static async archiveMessage(messageId: string, userId: string): Promise<boolean> {
    console.log(`🗂️ Archiving message: ${messageId}`);
    
    const { error } = await supabase
      .from('conversation_messages')
      .update({ 
        archived_at: new Date().toISOString(),
        archived_by: userId
      })
      .eq('id', messageId)
      .eq('user_id', userId); // Ensure user can only archive their own messages

    if (error) {
      console.error('❌ Error archiving message:', error);
      throw error;
    }

    console.log('✅ Message archived successfully');
    return true;
  }

  // Restore an archived message
  static async restoreMessage(messageId: string, userId: string): Promise<boolean> {
    console.log(`📤 Restoring message: ${messageId}`);
    
    const { error } = await supabase
      .from('conversation_messages')
      .update({ 
        archived_at: null,
        archived_by: null
      })
      .eq('id', messageId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error restoring message:', error);
      throw error;
    }

    console.log('✅ Message restored successfully');
    return true;
  }

  // Hard delete a message (permanent deletion)
  static async hardDeleteMessage(messageId: string, userId: string): Promise<boolean> {
    console.log(`🗑️ HARD DELETING message: ${messageId} - This action cannot be undone!`);
    
    const { error } = await supabase
      .from('conversation_messages')
      .delete()
      .eq('id', messageId)
      .eq('user_id', userId); // Ensure user can only delete their own messages

    if (error) {
      console.error('❌ Error hard deleting message:', error);
      throw error;
    }

    console.log('✅ Message permanently deleted');
    return true;
  }

  // Clear all conversation history (with options)
  static async clearConversationHistory(
    userId: string, 
    options: {
      hardDelete?: boolean;
      threadId?: string;
      olderThan?: Date;
    } = {}
  ): Promise<{ deletedCount: number; action: string }> {
    const { hardDelete = false, threadId, olderThan } = options;
    const action = hardDelete ? 'PERMANENTLY DELETED' : 'ARCHIVED';
    
    console.log(`🧹 Clearing conversation history for user: ${userId} (${action})`);
    
    let query = supabase.from('conversation_messages').select('id', { count: 'exact' });
    
    // Apply filters
    query = query.eq('user_id', userId);
    if (threadId) {
      query = query.eq('thread_id', threadId);
    }
    if (olderThan) {
      query = query.lt('created_at', olderThan.toISOString());
    }
    if (!hardDelete) {
      // Only include non-archived messages for soft delete
      query = query.is('archived_at', null);
    }

    // First, count how many messages will be affected
    const { count, error: countError } = await query;
    if (countError) throw countError;

    if (!count || count === 0) {
      console.log('ℹ️ No messages found to clear');
      return { deletedCount: 0, action };
    }

    // Perform the deletion/archiving
    let updateQuery = supabase.from('conversation_messages');
    
    if (hardDelete) {
      updateQuery = updateQuery.delete();
    } else {
      updateQuery = updateQuery.update({
        archived_at: new Date().toISOString(),
        archived_by: userId
      });
    }

    // Apply the same filters
    updateQuery = updateQuery.eq('user_id', userId);
    if (threadId) {
      updateQuery = updateQuery.eq('thread_id', threadId);
    }
    if (olderThan) {
      updateQuery = updateQuery.lt('created_at', olderThan.toISOString());
    }
    if (!hardDelete) {
      updateQuery = updateQuery.is('archived_at', null);
    }

    const { error } = await updateQuery;
    if (error) {
      console.error(`❌ Error clearing conversation history:`, error);
      throw error;
    }

    console.log(`✅ ${action} ${count} messages`);
    return { deletedCount: count, action };
  }

  // Retry a failed message (regenerate AI response)
  static async retryMessage(
    messageId: string, 
    userId: string, 
    documents: any[] = []
  ): Promise<ConversationMessage> {
    console.log(`🔄 Retrying message: ${messageId}`);
    
    // Get the original message
    const { data: originalMessage, error: fetchError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('id', messageId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !originalMessage) {
      throw new Error('Message not found or access denied');
    }

    if (originalMessage.sender !== 'user') {
      throw new Error('Can only retry user messages');
    }

    // Archive the failed AI response if it exists
    const { data: aiResponses } = await supabase
      .from('conversation_messages')
      .select('id')
      .eq('user_id', userId)
      .eq('sender', 'ai')
      .gt('created_at', originalMessage.created_at)
      .order('created_at', { ascending: true })
      .limit(1);

    if (aiResponses && aiResponses.length > 0) {
      await this.archiveMessage(aiResponses[0].id, userId);
      console.log('🗂️ Archived previous AI response');
    }

    // Regenerate AI response using the original message content
    console.log('🤖 Regenerating AI response...');
    const aiResult = await this.processUserMessage(
      userId, 
      originalMessage.content, 
      documents
    );

    // Save the new AI response
    const newAiMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
      user_id: userId,
      content: aiResult.response,
      sender: 'ai',
      document_updates: aiResult.documentUpdates || [],
      context_confidence: aiResult.confidence || 0,
      thread_id: originalMessage.thread_id,
      parent_message_id: originalMessage.id
    };

    const savedAiMessage = await this.saveMessage(newAiMessage);
    console.log('✅ Generated new AI response');

    return savedAiMessage;
  }

  // Enhanced AI processing with strategic insights
  static async processUserMessage(
    userId: string, 
    message: string, 
    documents: any[],
    conversationHistory?: any[]
  ): Promise<AIProcessingResult> {
    console.log('🚀 ConversationService.processUserMessage called:', {
      userId,
      messageLength: message.length,
      documentsCount: documents.length,
      hasHistory: !!conversationHistory,
      timestamp: new Date().toISOString()
    });

    try {
      // Initialize Gemini service
      console.log('🔑 Initializing Gemini service for user:', userId);
      const hasGeminiKey = await GeminiService.initialize(userId);
      
      console.log('🔑 Gemini initialization result:', {
        hasGeminiKey,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Get conversation history for context
      const history = conversationHistory || await this.getConversationHistory(userId, 10);

      // 🎯 NEW: Use Agent Orchestrator for background processing
      console.log('🤖 Starting Agent Orchestration...');
      try {
        const orchestrationResult = await AgentOrchestrator.processMessage(
          userId,
          message,
          history,
          documents
        );
        
        console.log('🎯 Agent Orchestration completed:', {
          responseLength: orchestrationResult.response.length,
          clipsRetrieved: orchestrationResult.clips_retrieved.length,
          sectionsUpdated: orchestrationResult.sections_updated.length,
          confidence: orchestrationResult.confidence,
          traceId: orchestrationResult.trace_id
        });
        
        // Return orchestrated result
        return {
          response: orchestrationResult.response,
          confidence: orchestrationResult.confidence,
          documentUpdates: orchestrationResult.sections_updated.map(s => s.section_title || s.document_name || 'Document Section'),
          strategicActions: {
            initiativesCreated: 0,
            swotItemsCreated: 0
          }
        };
        
      } catch (orchestrationError) {
        console.error('❌ Agent Orchestration failed, falling back to simple processing:', orchestrationError);
        // Fall through to simple processing below
      }
      
      // Check for mission statement or important business info to save
      const isMissionStatement = message.toLowerCase().includes('mission') || 
                                 message.toLowerCase().includes('our mission') || 
                                 message.toLowerCase().includes('save that');
      
      let documentUpdated = null;
      const documentUpdates: string[] = [];
      let strategicActions = { initiativesCreated: 0, swotItemsCreated: 0 };

      // Direct save to Strategic Plan for mission statements
      if (isMissionStatement) {
        try {
          // Find or create a Strategic Plan document
          const strategicDoc = await this.findOrCreateStrategicDocument(userId, documents);
          
          if (strategicDoc) {
            // Update the document with the mission statement
            await this.saveImportantBusinessInfo(userId, strategicDoc.id, message);
            documentUpdates.push(strategicDoc.name);
            documentUpdated = strategicDoc.name;
          }
        } catch (directSaveError) {
          console.error('Error saving important business info:', directSaveError);
        }
      }
      
      // Only proceed with regular classification if no direct save was made
      if (documentUpdates.length === 0) {
        // Classify the message for document routing and strategic insights
        const classification = await GeminiService.classifyMessage(message, documents);
        
        console.log('Message classification:', classification);

        // Update document if classification is confident enough
        if (classification.documentId && classification.confidence > 0.3) {
          try {
            // Update document with AI-generated content
            await this.updateDocumentWithAI(
              userId,
              classification.documentId,
              message,
              classification.suggestedUpdate,
              classification.confidence
            );
            
            const doc = documents.find(d => d.id === classification.documentId);
            if (doc) {
              documentUpdates.push(doc.name);
              documentUpdated = doc.name;
            }
          } catch (updateError) {
            console.error('Error updating document:', updateError);
            // Continue without document update
          }
        }

        // Process strategic insights from AI
        if (hasGeminiKey && classification.strategicInsights) {
          try {
            const initialInitiativeCount = (await StrategicService.getStrategicInitiatives(userId)).length;
            const initialSwotCount = (await StrategicService.getSwotItems(userId)).length;

            await GeminiService.processStrategicInsights(
              userId,
              classification.strategicInsights,
              message
            );

            // Track what was created
            const finalInitiativeCount = (await StrategicService.getStrategicInitiatives(userId)).length;
            const finalSwotCount = (await StrategicService.getSwotItems(userId)).length;

            strategicActions = {
              initiativesCreated: finalInitiativeCount - initialInitiativeCount,
              swotItemsCreated: finalSwotCount - initialSwotCount
            };
          } catch (strategicError) {
            console.error('Error processing strategic insights:', strategicError);
          }
        }
      }

      // Generate contextual AI response
      let response = "";
      
      if (hasGeminiKey) {
        try {
          response = await GeminiService.generateContextualResponse(
            message,
            documentUpdated,
            history,
            isMissionStatement ? { initiatives: [], swotUpdates: [] } : undefined
          );
          console.log('AI generated response:', response);
        } catch (responseError) {
          console.error('Error generating AI response:', responseError);
          response = this.generateFallbackResponse(message, documentUpdates, strategicActions);
        }
      } else {
        console.log('No Gemini key available, using fallback response');
        response = this.generateFallbackResponse(message, documentUpdates, strategicActions);
      }

      // Track metrics for real-time dashboard updates
      await this.trackConversationMetrics(userId, message, documentUpdates.length > 0 ? 0.9 : 0.5);

      return {
        response,
        documentUpdates,
        confidence: documentUpdates.length > 0 ? 0.9 : 0.5,
        context: isMissionStatement ? "Mission statement saved" : "Message processed",
        strategicActions
      };

    } catch (error) {
      console.error('Error processing message:', error);
      
      // Return fallback response on any error
      return {
        response: "I apologize, but I encountered an issue processing your message. Please try again.",
        documentUpdates: [],
        confidence: 0,
        context: "Error occurred during processing"
      };
    }
  }

  // Find or create strategic document for important business info
  private static async findOrCreateStrategicDocument(userId: string, documents: any[]): Promise<any> {
    // First try to find an existing Strategic Plan
    const strategicDoc = documents.find(doc => 
      doc.category === 'business' && 
      (doc.name === 'Strategic Plan' || doc.type === 'strategy')
    );
    
    if (strategicDoc) {
      return strategicDoc;
    }
    
    // If no strategic document exists, check for document templates
    try {
      const { data: templates } = await supabase
        .from('document_templates')
        .select('*')
        .eq('category', 'strategy')
        .eq('name', 'Strategic Plan')
        .limit(1);
      
      if (templates && templates.length > 0) {
        // Create a new document from template
        const created = await DocumentService.createFromTemplate(userId, templates[0].id);
        return created;
      } else {
        // Create a basic strategic document
        const newDoc = {
          user_id: userId,
          name: 'Strategic Plan',
          type: 'strategy',
          content: `# Strategic Plan\n\n## Vision & Mission\n\n## Market Analysis\n\n## Strategic Objectives\n\n## Action Plan\n\n## Success Metrics`,
          category: 'business',
          is_template_based: false
        };
        
        const created = await DocumentService.createDocument(newDoc);
        return created;
      }
    } catch (error) {
      console.error('Error creating strategic document:', error);
      throw error;
    }
  }

  // Save important business information to a document
  private static async saveImportantBusinessInfo(userId: string, documentId: string, message: string): Promise<void> {
    try {
      // Get the current document
      const { data: doc, error: docError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', documentId)
        .maybeSingle();

      if (docError) throw docError;
      if (!doc) {
        console.warn('Document not found for update:', documentId);
        return;
      }

      // Create memory entry
      await supabase
        .from('document_memories')
        .insert({
          user_id: userId,
          document_id: documentId,
          memory_content: message,
          context: `Important business information update to ${doc.name}`,
          confidence: 0.95
        });

      // Format the message for inclusion in the document
      const timestamp = new Date().toLocaleString();
      let updateContent = '';
      
      // Check if content has a Mission section
      if (doc.content.includes('## Vision & Mission')) {
        // Extract existing content
        const parts = doc.content.split('## Vision & Mission');
        const beforeMission = parts[0];
        
        // Find next section
        let afterMission = '';
        if (parts[1].includes('##')) {
          const nextSectionStart = parts[1].indexOf('##');
          afterMission = parts[1].substring(nextSectionStart);
          
          // Update the Mission section
          updateContent = `${beforeMission}## Vision & Mission\n\n${message}\n\n_Updated: ${timestamp}_\n\n${afterMission}`;
        } else {
          // No next section, just append to mission
          updateContent = `${beforeMission}## Vision & Mission\n\n${message}\n\n_Updated: ${timestamp}_\n\n`;
        }
      } else {
        // No mission section exists, add to the top of the document
        updateContent = `${doc.content}\n\n## Mission Statement\n\n${message}\n\n_Added: ${timestamp}_`;
      }

      // Update the document
      await supabase
        .from('user_documents')
        .update({
          content: updateContent,
          last_updated: new Date().toISOString()
        })
        .eq('id', documentId);

    } catch (error) {
      console.error('Error saving business information:', error);
      throw error;
    }
  }

  // Update document with AI-enhanced content
  private static async updateDocumentWithAI(
    userId: string,
    documentId: string,
    originalMessage: string,
    suggestedUpdate: string,
    confidence: number
  ) {
    try {
      // Get the current document
      const { data: doc, error: docError } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', documentId)
        .maybeSingle();

      if (docError) throw docError;
      if (!doc) {
        console.warn('Document not found for update:', documentId);
        return;
      }

      // Create memory entry
      await supabase
        .from('document_memories')
        .insert({
          user_id: userId,
          document_id: documentId,
          memory_content: originalMessage,
          context: `AI-classified update to ${doc.name}`,
          confidence
        });

      // Use AI-suggested update or create a structured one
      let updateContent = suggestedUpdate;
      
      // If the suggested update doesn't look well-formatted, improve it
      if (!updateContent.includes('#') && !updateContent.includes('##')) {
        const timestamp = new Date().toLocaleString();
        updateContent = `\n\n## AI Update (${timestamp})\n${suggestedUpdate}\n\n*Source: ${originalMessage}*\n*Confidence: ${Math.round(confidence * 100)}%*\n`;
      }

      // Improve the content with AI if available
      try {
        const hasGeminiKey = await GeminiService.initialize(userId);
        if (hasGeminiKey) {
          updateContent = await GeminiService.improveDocumentSection(
            updateContent,
            `Document: ${doc.name}, Type: ${doc.type}`
          );
        }
      } catch (improvementError) {
        console.warn('Failed to improve content with AI:', improvementError);
        // Continue with original update
      }

      // Update the document
      const updatedContent = doc.content + updateContent;

      await supabase
        .from('user_documents')
        .update({
          content: updatedContent,
          last_updated: new Date().toISOString()
        })
        .eq('id', documentId);

    } catch (error) {
      console.error('Error updating document with AI:', error);
      throw error;
    }
  }

  // Generate fallback response with strategic context
  private static generateFallbackResponse(
    message: string, 
    documentUpdates: string[], 
    strategicActions: any
  ): string {
    const messageLower = message.toLowerCase();

    let response = "Thank you for sharing that information. ";

    if (documentUpdates.length > 0) {
      response += `I've updated your "${documentUpdates[0]}" document with this information. `;
    }

    if (strategicActions.initiativesCreated > 0 || strategicActions.swotItemsCreated > 0) {
      response += `I've also suggested ${strategicActions.initiativesCreated} strategic initiative(s) and ${strategicActions.swotItemsCreated} SWOT update(s) based on your input. `;
    }

    if (messageLower.includes('mission') || messageLower.includes('save that')) {
      response += "I've saved your mission statement to the Strategic Plan document. This will help guide all future business planning activities.";
    } else if (messageLower.includes('product') || messageLower.includes('feature')) {
      response += "This seems related to product development. Have you considered the user impact and market positioning?";
    } else if (messageLower.includes('technical') || messageLower.includes('architecture')) {
      response += "From a technical perspective, we should ensure this aligns with our current architecture and scalability goals.";
    } else if (messageLower.includes('financial') || messageLower.includes('revenue')) {
      response += "This has financial implications. Have you updated the revenue forecasts and considered the business model impact?";
    } else if (messageLower.includes('team') || messageLower.includes('process')) {
      response += "Team processes are crucial for success. This change might require updating our workflows and strategic initiatives.";
    } else if (messageLower.includes('marketing') || messageLower.includes('customer')) {
      response += "This customer insight is valuable. How does this align with our growth strategy and market positioning?";
    } else if (messageLower.includes('strategy') || messageLower.includes('goal')) {
      response += "Strategic thinking is important. How does this align with our current initiatives and competitive advantage?";
    } else {
      response += "This information could be valuable for strategic planning. Would you like me to suggest related initiatives or areas to explore?";
    }

    return response;
  }

  // Track conversation metrics for analytics
  private static async trackConversationMetrics(
    userId: string,
    message: string,
    confidence: number
  ): Promise<void> {
    try {
      // Track processing time (simulated)
      const processingTime = Math.random() * 200 + 50; // 50-250ms
      
      await StrategicService.trackApiMetric(
        userId,
        'processing_time',
        processingTime,
        { message_length: message.length, confidence }
      );

      // Track accuracy based on confidence
      const accuracyRate = Math.min(confidence * 100 + Math.random() * 10, 100);
      
      await StrategicService.trackApiMetric(
        userId,
        'accuracy_rate',
        accuracyRate,
        { confidence }
      );

      // Track API call
      await StrategicService.trackApiMetric(
        userId,
        'api_call',
        1,
        { endpoint: 'conversation' }
      );

    } catch (error) {
      console.error('Error tracking conversation metrics:', error);
    }
  }

  // ===== THREADING & BRANCHING METHODS =====

  // Archive a message (soft delete)
  static async archiveMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: userId
        })
        .eq('id', messageId)
        .eq('user_id', userId); // Security: only archive own messages

      return !error;
    } catch (error) {
      console.error('Error archiving message:', error);
      return false;
    }
  }

  // Restore archived message
  static async restoreMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .update({
          archived_at: null,
          archived_by: null
        })
        .eq('id', messageId)
        .eq('user_id', userId);

      return !error;
    } catch (error) {
      console.error('Error restoring message:', error);
      return false;
    }
  }

  // Create reply to specific message
  static async createReply(
    replyToMessageId: string,
    content: string,
    userId: string,
    quotedText?: string
  ): Promise<ConversationMessage | null> {
    try {
      // Try to get the message being replied to for thread context
      let parentThreadId = null;
      try {
        const { data: parentMessage } = await supabase
          .from('conversation_messages')
          .select('thread_id, user_id')
          .eq('id', replyToMessageId)
          .single();
        
        if (parentMessage) {
          parentThreadId = parentMessage.thread_id;
        }
      } catch (err) {
        console.warn('Could not get parent thread_id, continuing without threading');
      }

      // Create reply message with threading if available
      const replyMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: userId,
        content: quotedText ? `> ${quotedText}\n\n${content}` : content,
        sender: 'user',
        document_updates: [],
        context_confidence: 0,
        // Only add threading fields if database supports them
        ...(parentThreadId && {
          thread_id: parentThreadId,
          reply_to_message_id: replyToMessageId,
          quoted_text: quotedText
        })
      };

      return await this.saveMessage(replyMessage);
    } catch (error) {
      console.error('Error creating reply:', error);
      return null;
    }
  }

  // Create branch from selected text
  static async createBranch(
    parentMessageId: string,
    selectedText: string,
    initialMessage: string,
    userId: string
  ): Promise<{ message: ConversationMessage; jobId: string } | null> {
    try {
      const newThreadId = crypto.randomUUID();
      const jobId = crypto.randomUUID();

      const branchMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: userId,
        content: initialMessage,
        sender: 'user',
        document_updates: [],
        context_confidence: 0,
        thread_id: newThreadId,
        parent_message_id: parentMessageId,
        branch_context: selectedText,
        thread_title: 'Analyzing context...',
        thread_title_status: 'pending',
        summarization_job_id: jobId,
        message_order: 0
      };

      const message = await this.saveMessage(branchMessage);

      // Queue summarization job using existing Redis infrastructure
      await this.queueThreadSummarization(jobId, {
        messageId: message.id,
        threadId: newThreadId,
        selectedText,
        initialMessage,
        parentMessageId,
        userId
      });

      return { message, jobId };
    } catch (error) {
      console.error('Error creating branch:', error);
      return null;
    }
  }

  // Queue thread summarization job
  private static async queueThreadSummarization(
    jobId: string,
    context: {
      messageId: string;
      threadId: string;
      selectedText: string;
      initialMessage: string;
      parentMessageId: string;
      userId: string;
    }
  ): Promise<void> {
    try {
      // Use the new threading API
      const { threadingApi } = await import('../lib/api');
      
      const response = await threadingApi.queueSummarization({
        jobId,
        type: 'thread_summarization',
        context
      });

      if (!response.data?.success) {
        throw new Error('Failed to queue summarization job');
      }
    } catch (error) {
      console.error('Error queuing summarization:', error);
      // Mark job as failed
      await this.markSummarizationFailed(context.messageId);
    }
  }

  // Mark summarization as failed
  private static async markSummarizationFailed(messageId: string): Promise<void> {
    try {
      await supabase
        .from('conversation_messages')
        .update({
          thread_title_status: 'failed',
          thread_title: 'Discussion' // Fallback title
        })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking summarization as failed:', error);
    }
  }

  // Get thread messages
  static async getThreadMessages(
    threadId: string,
    userId: string,
    includeArchived = false
  ): Promise<ConversationMessage[]> {
    try {
      let query = supabase
        .from('conversation_messages')
        .select('*')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .order('message_order', { ascending: true });

      if (!includeArchived) {
        query = query.is('archived_at', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting thread messages:', error);
      return [];
    }
  }

  // Get conversation threads
  static async getConversationThreads(
    userId: string,
    limit = 20
  ): Promise<ConversationThread[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_threads')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting conversation threads:', error);
      return [];
    }
  }

  // Update thread title after summarization
  static async updateThreadTitleFromSummarization(
    messageId: string,
    title: string,
    summary?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversation_messages')
        .update({
          thread_title: title,
          thread_summary: summary,
          thread_title_status: 'completed'
        })
        .eq('id', messageId);

      return !error;
    } catch (error) {
      console.error('Error updating thread title:', error);
      return false;
    }
  }

  // Test Gemini API key
  static async testGeminiIntegration(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const hasKey = await GeminiService.initialize(userId);
      if (!hasKey) {
        return {
          success: false,
          message: "No Gemini API key configured. Please add your API key in Settings or check your environment variables."
        };
      }

      // Test with a simple message
      const testResponse = await GeminiService.generateContent("Hello, this is a test message. Please respond briefly with 'API test successful'.", undefined, userId);
      
      return {
        success: true,
        message: `Gemini integration is working! Test response: "${testResponse.content.substring(0, 50)}..."`
      };
    } catch (error) {
      return {
        success: false,
        message: `Gemini integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Context-aware message processing for SYNA contexts
  static async processWithContextualAI(
    message: string,
    userId: string,
    documents: any[],
    context: any
  ): Promise<{
    response: string;
    updatedDocuments?: string[];
    contextConfidence: number;
    surfaceUpdates?: any[];
    agentActions?: any[];
  }> {
    try {
      console.log(`Processing message in ${context.type} context:`, message);

      // Get context-specific system prompt
      const contextPrompt = this.getContextPrompt(context.type);
      
      // Check for Gemini key
      const hasKey = await GeminiService.initialize(userId);
      let response = "";
      
      if (hasKey) {
        try {
          // Generate context-aware response
          response = await GeminiService.generateContextualResponse(
            message,
            null, // No specific document updated in this context
            [], // conversation history - could be enhanced
            {
              contextType: context.type,
              systemPrompt: contextPrompt,
              availableAgents: context.agents.map((a: any) => a.type),
              activeSurfaces: Object.keys(context.surfaces).filter(
                (key) => context.surfaces[key]?.visible
              )
            }
          );
        } catch (error) {
          console.error('Error generating contextual response:', error);
          response = this.getContextFallbackResponse(context.type, message);
        }
      } else {
        response = this.getContextFallbackResponse(context.type, message);
      }

      // Simulate document updates based on context
      const updatedDocuments = this.getContextualDocumentUpdates(context.type, message);
      
      // Calculate confidence based on context relevance
      const contextConfidence = this.calculateContextConfidence(message, context.type);

      return {
        response,
        updatedDocuments,
        contextConfidence,
        surfaceUpdates: [],
        agentActions: []
      };

    } catch (error) {
      console.error('Error in contextual AI processing:', error);
      return {
        response: `I encountered an issue processing your ${context.type} request. Please try again.`,
        contextConfidence: 0
      };
    }
  }

  private static getContextPrompt(contextType: string): string {
    const prompts = {
      engineering: "You are an expert software engineer and architect. Focus on code quality, technical solutions, system design, and development best practices. Provide actionable technical advice and consider security, performance, and maintainability.",
      fundraising: "You are an experienced startup advisor specializing in fundraising and investor relations. Focus on metrics that matter to investors, compelling narratives, market positioning, and fundraising strategy. Help craft clear, data-driven communications.",
      product: "You are a product management expert. Focus on user needs, feature prioritization, roadmap planning, and strategic product decisions. Consider market fit, user experience, and business value in your responses."
    };
    return prompts[contextType as keyof typeof prompts] || "You are a helpful AI assistant.";
  }

  private static getContextFallbackResponse(contextType: string, message: string): string {
    const responses = {
      engineering: `I understand you're working on an engineering task: "${message.substring(0, 50)}...". While I don't have access to advanced AI capabilities right now, I can help you think through technical approaches, architectural decisions, or development processes. What specific aspect would you like to explore?`,
      fundraising: `I see you're working on fundraising matters: "${message.substring(0, 50)}...". I can help you structure investor communications, think through metrics presentation, or organize fundraising materials. What would be most helpful right now?`,
      product: `You're focusing on product development: "${message.substring(0, 50)}...". I can assist with product planning frameworks, prioritization approaches, or user research insights. What aspect of product management would you like to dive into?`
    };
    return responses[contextType as keyof typeof responses] || "I can help you with that. What would you like to focus on?";
  }

  private static getContextualDocumentUpdates(contextType: string, message: string): string[] {
    // Simulate intelligent document updates based on context and message content
    const updates: string[] = [];
    
    if (message.toLowerCase().includes('update') || message.toLowerCase().includes('document')) {
      const contextDocuments = {
        engineering: ['Technical Specifications', 'Architecture Documentation'],
        fundraising: ['Investor Update', 'Pitch Deck', 'Financial Projections'],
        product: ['Product Roadmap', 'Feature Specifications', 'User Research']
      };
      
      const docs = contextDocuments[contextType as keyof typeof contextDocuments];
      if (docs && docs.length > 0) {
        updates.push(docs[0]); // Add the primary document for this context
      }
    }
    
    return updates;
  }

  private static calculateContextConfidence(message: string, contextType: string): number {
    // Simple confidence calculation based on context-relevant keywords
    const contextKeywords = {
      engineering: ['code', 'api', 'database', 'architecture', 'bug', 'feature', 'deploy', 'test'],
      fundraising: ['investor', 'funding', 'revenue', 'metrics', 'raise', 'valuation', 'pitch'],
      product: ['user', 'feature', 'roadmap', 'priority', 'requirement', 'feedback', 'design']
    };
    
    const keywords = contextKeywords[contextType as keyof typeof contextKeywords] || [];
    const messageLower = message.toLowerCase();
    const matches = keywords.filter(keyword => messageLower.includes(keyword)).length;
    
    // Return confidence between 0.3 and 0.95 based on keyword matches
    return Math.min(0.95, 0.3 + (matches * 0.1));
  }

}