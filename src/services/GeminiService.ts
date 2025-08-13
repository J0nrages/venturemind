import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api';
import { StrategicService } from './StrategicService';
import { cleanAndParseJSON, safeJsonParse } from '../utils/jsonParser';

export interface GeminiResponse {
  content: string;
  confidence: number;
  reasoning: string;
}

export interface DocumentClassification {
  documentId: string | null;
  documentName: string;
  confidence: number;
  reasoning: string;
  suggestedUpdate: string;
  strategicInsights?: {
    initiatives: string[];
    swotUpdates: string[];
  };
}

export class GeminiService {
  // Generate content with Gemini through backend API
  static async generateContent(prompt: string, context?: string): Promise<GeminiResponse> {
    console.log('🔄 GeminiService.generateContent called with:', {
      prompt: prompt.substring(0, 100) + '...',
      hasContext: !!context,
      timestamp: new Date().toISOString()
    });

    try {
      const fullPrompt = context ? `${context}\n\n${prompt}` : prompt;

      console.log('📡 Making API call to /api/v1/agents/generate...');
      const response = await apiClient.post<{
        content: string;
        confidence: number;
        reasoning: string;
      }>('/api/v1/agents/generate', {
        prompt: fullPrompt,
        model: 'gemini-2.5-flash',
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });

      console.log('📡 API Response:', {
        status: response.status,
        hasData: !!response.data,
        hasError: !!response.error,
        error: response.error,
        dataKeys: response.data ? Object.keys(response.data) : []
      });

      if (response.error) {
        console.error('❌ API returned error:', response.error);
        throw new Error(`API Error: ${response.error}`);
      }

      if (!response.data) {
        console.warn('⚠️ API returned no data');
        return {
          content: 'No response generated - API returned empty data',
          confidence: 0.1,
          reasoning: 'API call succeeded but returned no data'
        };
      }

      console.log('✅ Successful response:', {
        contentLength: response.data.content?.length || 0,
        confidence: response.data.confidence,
        reasoning: response.data.reasoning
      });

      return response.data;
    } catch (error) {
      console.error('❌ Gemini API call failed:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      throw new Error(`Gemini API failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Enhanced message classification with strategic insights
  static async classifyMessage(message: string, documents: any[]): Promise<DocumentClassification> {
    try {
      // Create document context for classification
      const documentContext = documents
        .filter(doc => doc.category === 'business')
        .map(doc => `- ${doc.name}: ${doc.type} (${doc.template_id ? 'template-based' : 'custom'})`)
        .join('\n');

      const classificationPrompt = `
You are an intelligent business assistant that routes messages to documents AND suggests strategic actions.

Available Documents:
${documentContext}

User Message: "${message}"

Analyze the message and respond with a JSON object containing:
{
  "documentName": "exact name of the best matching document or null",
  "confidence": number between 0-1,
  "reasoning": "brief explanation of why this document was chosen",
  "suggestedUpdate": "a well-formatted addition to the document that incorporates the user's message",
  "strategicInsights": {
    "initiatives": ["suggested strategic initiative titles based on the message"],
    "swotUpdates": ["SWOT items that could be added/updated based on this insight"]
  }
}

Guidelines:
- Only route to documents that are clearly relevant (confidence > 0.3)
- If no document is clearly relevant, return documentName as null
- Always provide strategic insights even if no document match
- Suggest 1-3 strategic initiatives that could emerge from this message
- Identify potential SWOT updates (format as "category: item")
- Be precise and actionable
`;

      const response = await this.generateContent(classificationPrompt);
      
      try {
        // Parse JSON response with markdown cleanup
        const parsed = cleanAndParseJSON(response.content);
        
        // Find the actual document
        const targetDoc = documents.find(doc => doc.name === parsed.documentName);
        
        return {
          documentId: targetDoc?.id || null,
          documentName: parsed.documentName || 'None',
          confidence: Math.min(Math.max(parsed.confidence || 0, 0), 1),
          reasoning: parsed.reasoning || 'AI classification',
          suggestedUpdate: parsed.suggestedUpdate || message,
          strategicInsights: parsed.strategicInsights || { initiatives: [], swotUpdates: [] }
        };
      } catch (parseError) {
        console.error('Failed to parse Gemini classification response:', parseError);
        console.error('Original response content:', response.content);
        return this.fallbackClassification(message, documents);
      }
    } catch (error) {
      console.error('Gemini classification failed:', error);
      return this.fallbackClassification(message, documents);
    }
  }

  // Generate contextual AI response with strategic suggestions
  static async generateContextualResponse(
    message: string, 
    documentUpdated: string | null,
    conversationHistory: any[] = [],
    strategicInsights?: any
  ): Promise<string> {
    try {
      // Build conversation context
      const recentHistory = conversationHistory
        .slice(-5) // Last 5 messages
        .map(msg => `${msg.sender}: ${msg.content}`)
        .join('\n');

      const strategicContext = strategicInsights ? `
Strategic Opportunities Identified:
- Initiatives: ${strategicInsights.initiatives?.join(', ') || 'None'}
- SWOT Updates: ${strategicInsights.swotUpdates?.join(', ') || 'None'}
` : '';

      const responsePrompt = `
You are a strategic business assistant that provides insights and actionable recommendations.

Recent conversation:
${recentHistory}

User's latest message: "${message}"
${documentUpdated ? `Document updated: ${documentUpdated}` : 'No document was updated'}

${strategicContext}

Respond as a strategic business advisor who:
1. Acknowledges the user's input thoughtfully
2. ${documentUpdated ? `Confirms the document update and explains why it was relevant` : `Provides strategic insights based on the message`}
3. Suggests actionable next steps or strategic considerations
4. Asks engaging follow-up questions when appropriate
5. Maintains a professional but friendly tone
6. Keeps responses concise (2-3 sentences max)

Generate a helpful strategic response:
`;

      const response = await this.generateContent(responsePrompt);
      return response.content;
    } catch (error) {
      console.error('Failed to generate contextual response:', error);
      return this.fallbackResponse(message, documentUpdated);
    }
  }

  // AI-powered strategic initiative generation
  static async generateStrategicInitiatives(
    userId: string,
    context: string,
    businessData: any
  ): Promise<any[]> {
    try {
      const businessContext = `
Business Profile:
- Company: ${businessData.profile?.company_name || 'Unknown'}
- Industry: ${businessData.profile?.industry || 'Unknown'}
- Size: ${businessData.profile?.size || 'Unknown'}
- Revenue Model: ${businessData.profile?.revenue_model || 'Unknown'}

Current Metrics:
- Revenue: $${businessData.liveMetrics?.revenue.current?.toLocaleString() || '0'}
- Customers: ${businessData.liveMetrics?.customers.total?.toLocaleString() || '0'}
- Growth Rate: ${businessData.liveMetrics?.revenue.change || 0}%
`;

      const initiativePrompt = `
You are a strategic business consultant. Based on the business context and user message, suggest 2-3 strategic initiatives.

${businessContext}

User Context: "${context}"

Generate strategic initiatives as JSON array:
[
  {
    "title": "Initiative title (keep concise)",
    "description": "Brief description of the initiative",
    "category": "product|technical|marketing|business|general",
    "priority": 1-5,
    "reasoning": "Why this initiative makes sense"
  }
]

Guidelines:
- Focus on high-impact, actionable initiatives
- Consider the business stage and industry
- Align with growth opportunities
- Be specific and measurable where possible
`;

      const response = await this.generateContent(initiativePrompt);
      
      try {
        const initiatives = cleanAndParseJSON(response.content);
        return Array.isArray(initiatives) ? initiatives : [];
      } catch (parseError) {
        console.error('Failed to parse AI initiatives:', parseError);
        console.error('Original response content:', response.content);
        return this.fallbackInitiatives(context);
      }
    } catch (error) {
      console.error('Failed to generate AI initiatives:', error);
      return this.fallbackInitiatives(context);
    }
  }

  // Process strategic insights and create database records
  static async processStrategicInsights(
    userId: string,
    insights: any,
    context: string
  ): Promise<void> {
    try {
      // Create strategic initiatives from AI suggestions
      if (insights.initiatives && insights.initiatives.length > 0) {
        for (const initiativeTitle of insights.initiatives) {
          try {
            await StrategicService.createStrategicInitiative({
              user_id: userId,
              title: initiativeTitle,
              description: `Generated from: ${context}`,
              category: 'general',
              status: 'planned',
              priority: 2,
              created_by: 'ai',
              metadata: { source: 'ai_analysis', context }
            });
          } catch (error) {
            console.error('Error creating AI initiative:', error);
          }
        }
      }

      // Process SWOT updates
      if (insights.swotUpdates && insights.swotUpdates.length > 0) {
        for (const swotUpdate of insights.swotUpdates) {
          try {
            // Parse format "category: item"
            const [category, title] = swotUpdate.split(':').map(s => s.trim());
            
            if (['strengths', 'weaknesses', 'opportunities', 'threats'].includes(category)) {
              await StrategicService.createSwotItem({
                user_id: userId,
                category: category as any,
                title,
                description: `Generated from: ${context}`,
                priority: 2,
                source: 'ai',
                metadata: { source: 'ai_analysis', context },
                is_active: true
              });
            }
          } catch (error) {
            console.error('Error creating AI SWOT item:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error processing strategic insights:', error);
    }
  }

  // Improve document content with AI
  static async improveDocumentSection(content: string, context: string): Promise<string> {
    try {
      const improvementPrompt = `
You are a professional business document editor. Improve the following content while maintaining its core meaning and information.

Context: ${context}

Original Content:
${content}

Please:
1. Improve clarity and professional tone
2. Better organize the information
3. Add relevant structure with appropriate headers if needed
4. Maintain all original information
5. Use proper business document formatting

Return only the improved content:
`;

      const response = await this.generateContent(improvementPrompt);
      return response.content;
    } catch (error) {
      console.error('Failed to improve document content:', error);
      return content; // Return original on error
    }
  }

  // Fallback methods for when AI is not available
  private static fallbackClassification(message: string, documents: any[]): DocumentClassification {
    const contentLower = message.toLowerCase();
    let bestMatch = { documentId: null as string | null, confidence: 0, name: 'None' };

    const patterns = {
      'Product Requirements Document': ['product', 'feature', 'requirement', 'user story', 'specification', 'roadmap'],
      'Technical Specification': ['technical', 'architecture', 'api', 'database', 'performance', 'security'],
      'Financial Model': ['financial', 'revenue', 'cost', 'funding', 'investment', 'budget'],
      'Strategic Plan': ['strategy', 'vision', 'mission', 'market', 'competition', 'objectives'],
      'Team Documentation': ['team', 'organization', 'process', 'workflow', 'communication'],
      'Marketing Plan': ['marketing', 'campaign', 'audience', 'brand', 'content', 'social']
    };

    documents.forEach(doc => {
      if (doc.category === 'business' && patterns[doc.name as keyof typeof patterns]) {
        const keywords = patterns[doc.name as keyof typeof patterns];
        const matchCount = keywords.filter(keyword => contentLower.includes(keyword)).length;
        const confidence = matchCount / keywords.length;
        
        if (confidence > bestMatch.confidence && confidence > 0.2) {
          bestMatch = { documentId: doc.id, confidence, name: doc.name };
        }
      }
    });

    return {
      documentId: bestMatch.documentId,
      documentName: bestMatch.name,
      confidence: bestMatch.confidence,
      reasoning: 'Keyword-based classification (fallback)',
      suggestedUpdate: `\n\n## Update (${new Date().toLocaleString()})\n${message}\n`,
      strategicInsights: { initiatives: [], swotUpdates: [] }
    };
  }

  private static fallbackResponse(message: string, documentUpdated: string | null): string {
    if (documentUpdated) {
      return `I've updated your "${documentUpdated}" document with this information. Based on this input, you might consider reviewing your strategic initiatives to align with these insights.`;
    } else {
      return "I understand your message. This information could be valuable for strategic planning. Have you considered how this might impact your current business objectives?";
    }
  }

  private static fallbackInitiatives(context: string): any[] {
    const contextLower = context.toLowerCase();
    const initiatives = [];

    if (contextLower.includes('growth') || contextLower.includes('scale')) {
      initiatives.push({
        title: 'Implement customer referral program',
        description: 'Create a referral system to leverage existing customers for growth',
        category: 'marketing',
        priority: 2,
        reasoning: 'Growth focus detected in context'
      });
    }

    if (contextLower.includes('technical') || contextLower.includes('ai') || contextLower.includes('product')) {
      initiatives.push({
        title: 'Enhance product capabilities',
        description: 'Improve core product features based on user feedback',
        category: 'product',
        priority: 1,
        reasoning: 'Technical/product focus detected'
      });
    }

    if (contextLower.includes('market') || contextLower.includes('competition')) {
      initiatives.push({
        title: 'Conduct competitive analysis',
        description: 'Analyze market positioning and competitive landscape',
        category: 'business',
        priority: 2,
        reasoning: 'Market/competitive focus detected'
      });
    }

    return initiatives.slice(0, 3); // Return max 3 initiatives
  }
}