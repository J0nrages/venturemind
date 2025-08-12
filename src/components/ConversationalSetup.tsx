import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  CheckCircle, 
  ArrowRight,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { useBusinessData } from '../hooks/useBusinessData';
import { GeminiService } from '../services/GeminiService';
import { supabase } from '../lib/supabase';
import { cleanAndParseJSON, safeJsonParse } from '../utils/jsonParser';
import toast from 'react-hot-toast';

interface SetupMessage {
  id: string;
  type: 'bot' | 'user' | 'system';
  content: string;
}

const BUSINESS_SETUP_PROMPT = `
You are an expert business setup assistant helping users create their business profile. Your goal is to collect the following information through natural conversation:

REQUIRED INFORMATION TO COLLECT:
1. company_name (string) - The business/company name
2. industry (string) - Industry type (SaaS, E-commerce, Healthcare, Financial Services, Education, Manufacturing, Consulting, Marketing Agency, Other)
3. size (string) - Company size (Just me (Solo), Small team (2-10), Growing team (11-50), Medium company (51-200), Large company (201+))
4. revenue_model (string) - How they make money (Subscription (SaaS), One-time sales, Marketplace/Commission, Advertising, Freemium, Usage-based, Hybrid model)
5. billing_cycle (string) - For recurring models: Monthly, Annual, Quarterly, Custom
6. start_date (date string YYYY-MM-DD) - When the business started
7. customer_segments (array of strings) - Target customers: Enterprise, Small-Medium Business, Consumers, Government, Education, Healthcare, Startups, Freelancers

OPTIONAL INFORMATION:
8. marketing_budget (number) - Monthly marketing budget in dollars

CONVERSATION GUIDELINES:
- Be friendly, professional, and conversational
- Ask questions naturally, not like a form
- Ask follow-up questions to clarify if needed
- Keep responses concise (2-3 sentences max)
- When you have collected ALL required information, use the COMPLETE_SETUP action

RESPONSE FORMAT:
Always respond with a JSON object containing:
{
  "message": "Your conversational response to the user",
  "action": "CONTINUE" | "COMPLETE_SETUP",
  "collected_data": {
    // Include any information you've collected or confirmed so far
    // Only include fields where you have definitive answers
  },
  "missing_fields": ["field1", "field2"] // Array of fields still needed
}

EXAMPLE RESPONSES:
{
  "message": "Hi! I'm here to help set up your business profile. Let's start with the basics - what's your company name?",
  "action": "CONTINUE",
  "collected_data": {},
  "missing_fields": ["company_name", "industry", "size", "revenue_model", "billing_cycle", "start_date", "customer_segments"]
}

{
  "message": "Perfect! TechCorp sounds great. What industry are you in? Are you more of a SaaS company, e-commerce, consulting, or something else?",
  "action": "CONTINUE", 
  "collected_data": {"company_name": "TechCorp"},
  "missing_fields": ["industry", "size", "revenue_model", "billing_cycle", "start_date", "customer_segments"]
}
`;

export default function ConversationalSetup({ onComplete }: { onComplete?: () => void }) {
  const [messages, setMessages] = useState<SetupMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [collectedData, setCollectedData] = useState<any>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [aiInitialized, setAiInitialized] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { createProfile } = useBusinessData();

  useEffect(() => {
    initializeSetup();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current && !loading && conversationStarted) {
      inputRef.current.focus();
    }
  }, [messages, loading, conversationStarted]);

  const initializeSetup = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      // Initialize Gemini AI
      const hasAI = await GeminiService.initialize(user.id);
      setAiInitialized(hasAI);
    }
  };

  const startConversation = async () => {
    if (!aiInitialized) {
      toast.error('AI assistant not available. Please check your API key in Settings.');
      return;
    }

    setConversationStarted(true);
    setLoading(true);

    try {
      // Send the initial prompt to start the conversation
      const response = await GeminiService.generateContent(BUSINESS_SETUP_PROMPT);
      
      let aiResponse;
      try {
        aiResponse = cleanAndParseJSON(response.content);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Original response content:', response.content);
        // Fallback if JSON parsing fails
        aiResponse = {
          message: "Hi! I'm here to help set up your business profile. Let's start with the basics - what's your company name?",
          action: "CONTINUE",
          collected_data: {},
          missing_fields: ["company_name", "industry", "size", "revenue_model", "billing_cycle", "start_date", "customer_segments"]
        };
      }

      setMessages([{
        id: '1',
        type: 'bot',
        content: aiResponse.message
      }]);

      setCollectedData(aiResponse.collected_data || {});
      setMissingFields(aiResponse.missing_fields || []);

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start setup assistant. Please try again.');
      
      // Fallback to manual start
      setMessages([{
        id: '1',
        type: 'bot',
        content: "Hi! I'm here to help set up your business profile. Let's start with the basics - what's your company name?"
      }]);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || loading || !user) return;

    const userMessage: SetupMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentMessage
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = currentMessage;
    setCurrentMessage('');
    setLoading(true);

    try {
      // Build conversation context
      const conversationHistory = messages
        .concat([userMessage])
        .map(msg => `${msg.type === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');

      const contextualPrompt = `
${BUSINESS_SETUP_PROMPT}

CONVERSATION SO FAR:
${conversationHistory}

CURRENTLY COLLECTED DATA:
${JSON.stringify(collectedData, null, 2)}

MISSING FIELDS: ${missingFields.join(', ')}

Continue the conversation based on the user's latest message. Update collected_data with any new information you can extract from their response.
`;

      const response = await GeminiService.generateContent(contextualPrompt);
      
      let aiResponse;
      try {
        aiResponse = cleanAndParseJSON(response.content);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Original response content:', response.content);
        // Create a fallback response
        aiResponse = {
          message: "I understand. Could you provide a bit more detail about that?",
          action: "CONTINUE",
          collected_data: collectedData,
          missing_fields: missingFields
        };
      }

      // Update state with new collected data
      const newCollectedData = { ...collectedData, ...aiResponse.collected_data };
      setCollectedData(newCollectedData);
      setMissingFields(aiResponse.missing_fields || []);

      // Add AI response to messages
      const botMessage: SetupMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        content: aiResponse.message
      };

      setMessages(prev => [...prev, botMessage]);

      // Check if setup is complete
      if (aiResponse.action === 'COMPLETE_SETUP') {
        await completeSetup(newCollectedData);
      }

    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: SetupMessage = {
        id: `error-${Date.now()}`,
        type: 'bot',
        content: "I'm sorry, I encountered an issue. Could you please repeat that?"
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const completeSetup = async (finalData: any) => {
    if (!user) return;

    setLoading(true);
    
    const completionMessage: SetupMessage = {
      id: 'completing',
      type: 'system',
      content: "Perfect! I have all the information I need. Setting up your business profile now... ⚙️"
    };

    setMessages(prev => [...prev, completionMessage]);

    try {
      // Validate required fields
      const required = ['company_name', 'industry', 'size', 'revenue_model', 'start_date', 'customer_segments'];
      const missing = required.filter(field => !finalData[field]);
      
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Ensure customer_segments is an array
      let customerSegments = finalData.customer_segments;
      if (typeof customerSegments === 'string') {
        customerSegments = [customerSegments];
      }

      // Create business profile
      const profileData = {
        user_id: user.id,
        company_name: finalData.company_name,
        industry: finalData.industry,
        size: finalData.size,
        revenue_model: finalData.revenue_model,
        billing_cycle: finalData.billing_cycle || 'Monthly',
        start_date: finalData.start_date,
        marketing_budget: finalData.marketing_budget || null,
        customer_segments: customerSegments
      };

      await createProfile(profileData);

      const successMessage: SetupMessage = {
        id: 'success',
        type: 'system',
        content: `🎉 Welcome to your business dashboard, ${finalData.company_name}! Your profile is now complete and you have access to all features.`
      };

      setMessages(prev => [...prev, successMessage]);
      setIsComplete(true);

      // Log completion event
      await supabase
        .from('customer_events')
        .insert({
          user_id: user.id,
          event_type: 'setup_completed',
          metadata: profileData
        });

      setTimeout(() => {
        if (onComplete) {
          onComplete();
        } else {
          window.location.reload();
        }
      }, 2000);

    } catch (error) {
      console.error('Setup error:', error);
      const errorMessage: SetupMessage = {
        id: 'error',
        type: 'bot',
        content: "I encountered an issue setting up your profile. Let me ask for any missing information..."
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Continue conversation to get missing info
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!conversationStarted) {
        startConversation();
      } else {
        handleSendMessage();
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Business Setup Assistant</h1>
              <p className="text-emerald-100">Let's get your business profile configured</p>
            </div>
          </div>
          
          {/* Progress indicator */}
          {conversationStarted && missingFields.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-sm text-emerald-100 mb-2">
                <span>Progress</span>
                <span>{8 - missingFields.length}/8 fields collected</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ 
                    width: `${((8 - missingFields.length) / 8) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="h-96 overflow-auto p-6 space-y-4">
          {!conversationStarted ? (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Ready to get started?</h2>
              <p className="text-gray-600 mb-6">
                I'll help you set up your business profile through a quick conversation. 
                This should only take 2-3 minutes.
              </p>
              {!aiInitialized && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">
                      AI assistant not available. Please add your Gemini API key in Settings for the best experience.
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={startConversation}
                disabled={!aiInitialized}
                className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Let's Get Started!
                <ArrowRight className="w-4 h-4" />
              </button>
              {!aiInitialized && (
                <p className="text-sm text-gray-500 mt-2">
                  <a href="/settings" className="text-emerald-600 hover:text-emerald-700 underline">
                    Go to Settings to add your API key
                  </a>
                </p>
              )}
            </div>
          ) : (
            <AnimatePresence>
              {messages.map(message => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-emerald-600 text-white'
                      : message.type === 'system'
                      ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <div className="flex items-start gap-2">
                      {message.type === 'bot' && (
                        <Bot className="w-4 h-4 mt-1 text-emerald-600" />
                      )}
                      {message.type === 'user' && (
                        <User className="w-4 h-4 mt-1" />
                      )}
                      {message.type === 'system' && (
                        <Sparkles className="w-4 h-4 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{message.content}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {loading && conversationStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm text-gray-600">
                    {isComplete ? 'Setting up your profile...' : 'Thinking...'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {conversationStarted && !isComplete && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={loading || !currentMessage.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
        
        {isComplete && (
          <div className="p-6 border-t border-gray-200 bg-gradient-to-r from-emerald-50 to-blue-50">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-800">Setup Complete!</p>
              <p className="text-sm text-gray-600">Redirecting to your dashboard...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}