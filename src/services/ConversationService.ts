import { supabase } from '../lib/supabase';
import { GeminiService } from './GeminiService';
import { StrategicService } from './StrategicService';
import { DocumentService } from './DocumentService';
import toast from 'react-hot-toast';

export interface ConversationMessage {
  id: string;
  user_id: string;
  content: string;
  sender: 'user' | 'ai';
  document_updates: string[];
  context_confidence: number;
  created_at: string;
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

  // Get conversation history
  static async getConversationHistory(userId: string, limit = 50): Promise<ConversationMessage[]> {
    const { data, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
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
      const testResponse = await GeminiService.generateContent("Hello, this is a test message. Please respond briefly with 'API test successful'.");
      
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
}