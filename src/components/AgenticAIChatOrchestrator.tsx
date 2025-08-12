import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain,
  Zap,
  ArrowLeft,
  ArrowRight,
  Minimize2,
  Maximize2,
  Activity,
  Database,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Target,
  TrendingUp,
  Settings
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConversationService, ConversationMessage } from '../services/ConversationService';
import { DocumentService, UserDocument } from '../services/DocumentService';
import { useSSEConnection } from '../hooks/useSSEConnection';
import toast from 'react-hot-toast';

interface AgenticAIChatOrchestratorProps {
  isOpen: boolean;
  onToggle: () => void;
  position: 'left' | 'right';
  onPositionChange: (position: 'left' | 'right') => void;
}

export default function AgenticAIChatOrchestrator({ 
  isOpen, 
  onToggle, 
  position, 
  onPositionChange 
}: AgenticAIChatOrchestratorProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'working' | 'error' | 'no-key'>('unknown');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // SSE connection for real-time orchestration updates
  const sseState = useSSEConnection(user?.id);

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current && !loading && isOpen && !isMinimized) {
      inputRef.current.focus();
    }
  }, [loading, isOpen, isMinimized]);

  const initializeChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      await Promise.all([
        loadMessages(user.id),
        loadDocuments(user.id),
        checkAIStatus(user.id)
      ]);
    }
  };

  const loadMessages = async (userId: string) => {
    try {
      const messagesData = await ConversationService.getConversationHistory(userId, 30);
      setMessages(messagesData);
      
      if (messagesData.length === 0) {
        const welcomeMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
          user_id: userId,
          content: "Hello! I'm your AI assistant with advanced orchestration capabilities. I can help you analyze your business data, update documents, create strategic initiatives, and provide intelligent insights. What would you like to work on?",
          sender: 'ai',
          document_updates: [],
          context_confidence: 0
        };
        
        const saved = await ConversationService.saveMessage(welcomeMessage);
        setMessages([saved]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadDocuments = async (userId: string) => {
    try {
      const documentsData = await DocumentService.getUserDocuments(userId);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const checkAIStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data?.gemini_api_key && !import.meta.env.VITE_GEMINI_API) {
        setAiStatus('no-key');
      } else {
        setAiStatus('unknown');
      }
    } catch (error) {
      setAiStatus('error');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || loading || !user) return;

    setLoading(true);
    
    try {
      // Save user message
      const userMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: currentMessage,
        sender: 'user',
        document_updates: [],
        context_confidence: 0
      };

      const savedUserMessage = await ConversationService.saveMessage(userMessage);
      setMessages(prev => [...prev, savedUserMessage]);

      const messageContent = currentMessage;
      setCurrentMessage('');

      // Use enhanced orchestration
      const orchestrationResult = await ConversationService.processUserMessage(
        user.id, 
        messageContent, 
        documents,
        messages
      );

      // Update AI status based on result
      if (aiStatus === 'unknown') {
        setAiStatus(orchestrationResult.confidence > 0.5 ? 'working' : 'no-key');
      }

      // Save AI response
      const aiMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: orchestrationResult.response,
        sender: 'ai',
        document_updates: orchestrationResult.documentUpdates,
        context_confidence: orchestrationResult.confidence
      };

      const savedAiMessage = await ConversationService.saveMessage(aiMessage);
      setMessages(prev => [...prev, savedAiMessage]);

      // Refresh documents if any were updated
      if (orchestrationResult.documentUpdates.length > 0) {
        await loadDocuments(user.id);
        toast.success(`Updated ${orchestrationResult.documentUpdates.length} document(s)`);
      }

      // Show strategic actions if any were taken
      if (orchestrationResult.strategicActions) {
        const { initiativesCreated, swotItemsCreated } = orchestrationResult.strategicActions;
        if (initiativesCreated > 0 || swotItemsCreated > 0) {
          toast.success(`AI created ${initiativesCreated} initiative(s) and ${swotItemsCreated} SWOT item(s)`);
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      setAiStatus('error');
      toast.error('Failed to process message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getAIStatusIndicator = () => {
    switch (aiStatus) {
      case 'working':
        return (
          <div className="flex items-center gap-1 text-green-600">
            <Brain className="w-4 h-4" />
            <span className="text-sm font-medium">Agentic AI</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">AI Error</span>
          </div>
        );
      case 'no-key':
        return (
          <div className="flex items-center gap-1 text-yellow-600">
            <Settings className="w-4 h-4" />
            <span className="text-sm">Setup Required</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-purple-600">
            <Zap className="w-4 h-4" />
            <span className="text-sm">AI Orchestrator</span>
          </div>
        );
    }
  };

  const userColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500'
  ];

  const getUserColor = (userId: string): string => {
    const index = userId.charCodeAt(0) % userColors.length;
    return userColors[index];
  };

  const sidebarVariants = {
    open: { 
      x: 0,
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    },
    closed: { 
      x: position === 'left' ? '-100%' : '100%',
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onToggle}
          className={`fixed ${position === 'left' ? 'left-4' : 'right-4'} bottom-6 z-30 
            p-4 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-2xl shadow-xl 
            hover:from-emerald-700 hover:to-blue-700 transition-all duration-300 
            transform hover:scale-105`}
        >
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6" />
            <div className="text-left">
              <div className="text-sm font-semibold">Agentic AI</div>
              <div className="text-xs opacity-90">Chat & Orchestrate</div>
            </div>
          </div>
        </motion.button>
      )}

      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Unified Agentic Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={sidebarVariants}
            initial="closed"
            animate="open"
            exit="closed"
            className={`fixed top-0 ${position === 'left' ? 'left-0' : 'right-0'} 
              h-full w-80 bg-white shadow-2xl z-50 flex flex-col overflow-hidden`}
          >
            {/* Enhanced Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 via-blue-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Agentic AI</h3>
                      <div className="flex items-center gap-3">
                        {getAIStatusIndicator()}
                        {sseState.connected && (
                          <div className="flex items-center gap-1 text-sm text-blue-600">
                            <Activity className="w-4 h-4 animate-pulse" />
                            <span>Live Orchestration</span>
                          </div>
                        )}
                        {sseState.activeActions.length > 0 && (
                          <div className="flex items-center gap-1 text-sm text-purple-600">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{sseState.activeActions.length} active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Position Toggle */}
                    <button
                      onClick={() => onPositionChange(position === 'left' ? 'right' : 'left')}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                      title="Switch sidebar position"
                    >
                      {position === 'left' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    </button>
                    
                    {/* Minimize Toggle */}
                    <button
                      onClick={() => setIsMinimized(!isMinimized)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-all"
                      title={isMinimized ? "Expand chat" : "Minimize chat"}
                    >
                      {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                    </button>
                    
                    {/* Close Button */}
                    <button
                      onClick={onToggle}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all rounded"
                      title="Close agentic AI"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {aiStatus === 'no-key' && !isMinimized && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-yellow-600" />
                      <div className="text-xs">
                        <span className="text-yellow-800 font-medium">Enhanced AI features require setup. </span>
                        <a href="/settings" className="text-yellow-700 underline hover:text-yellow-800">
                          Add your Gemini API key
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!isMinimized && (
                <>
                  {/* Messages with Enhanced Styling */}
                  <div className="flex-1 overflow-auto p-3 space-y-4 bg-gray-50">
                    {messages.map(message => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] px-3 py-2.5 rounded-2xl shadow-sm ${
                          message.sender === 'user'
                            ? 'bg-gradient-to-br from-emerald-500 to-blue-500 text-white ml-8'
                            : 'bg-white border border-gray-200 text-gray-800 mr-8'
                        }`}>
                          <div className="flex items-start gap-2">
                            {message.sender === 'ai' && (
                              <div className="p-1.5 bg-emerald-100 rounded-full flex-shrink-0 mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
                              
                              {/* Enhanced Message Metadata */}
                              <div className="mt-2.5 space-y-1.5">
                                {/* Context clips retrieved inline */}
                                {message.sender === 'ai' && sseState.retrievedClips.length > 0 && (
                                  <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                                    <div className="flex items-center gap-2 text-xs text-purple-700">
                                      <Database className="w-3 h-3" />
                                      <span className="font-medium">Retrieved {sseState.retrievedClips.length} context clip(s)</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* Active actions inline */}
                                {message.sender === 'ai' && sseState.activeActions.length > 0 && (
                                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 text-xs text-blue-700">
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      <span className="font-medium">AI {sseState.activeActions.join(', ').replace(/_/g, ' ')}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {message.document_updates && message.document_updates.length > 0 && (
                                  <div className={`flex items-center gap-2 text-xs p-1.5 rounded ${
                                    message.sender === 'user' ? 'text-white/80' : 'text-emerald-600'
                                  }`}>
                                    <FileText className="w-3 h-3" />
                                    <span className="font-medium">Updated: {message.document_updates.join(', ')}</span>
                                  </div>
                                )}
                                
                                {/* Recent document updates inline */}
                                {message.sender === 'ai' && sseState.updatedDocs.length > 0 && (
                                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <div className="flex items-center gap-2 text-xs text-emerald-700">
                                      <CheckCircle className="w-3 h-3" />
                                      <span className="font-medium">Updated: {sseState.updatedDocs.slice(0, 2).join(', ')}</span>
                                    </div>
                                  </div>
                                )}
                                
                                {message.sender === 'ai' && message.context_confidence > 0 && (
                                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                                    <Brain className="w-3 h-3" />
                                    <span>Confidence: {Math.round(message.context_confidence * 100)}%</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {loading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                      >
                        <div className="bg-white border border-gray-200 px-3 py-2.5 rounded-2xl shadow-sm mr-8 max-w-[85%]">
                          <div className="flex items-center gap-3">
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                            <div>
                              <div className="text-sm text-gray-700 font-medium">
                                {sseState.activeActions.length > 0 
                                  ? `AI ${sseState.activeActions[0].replace('_', ' ')}...` 
                                  : 'AI orchestrating your request...'}
                              </div>
                              {sseState.retrievedClips.length > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Found {sseState.retrievedClips.length} relevant context(s)
                                </div>
                              )}
                              {sseState.events.length > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5">
                                  Latest: {sseState.events[0]?.type?.replace('_', ' ')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Enhanced Chat Input */}
                  <div className="p-4 border-t border-gray-200 bg-white">
                    {/* Quick Context Summary - only show when relevant */}
                    {(sseState.retrievedClips.length > 0 || sseState.updatedDocs.length > 0 || sseState.activeActions.length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-3 p-2.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200"
                      >
                        <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            {sseState.activeActions.length > 0 && (
                              <div className="flex items-center gap-1 text-blue-700">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span className="font-medium">{sseState.activeActions.length} action(s)</span>
                              </div>
                            )}
                            {sseState.retrievedClips.length > 0 && (
                              <div className="flex items-center gap-1 text-purple-700">
                                <Database className="w-3 h-3" />
                                <span className="font-medium">{sseState.retrievedClips.length} clips</span>
                              </div>
                            )}
                            {sseState.updatedDocs.length > 0 && (
                              <div className="flex items-center gap-1 text-emerald-700">
                                <CheckCircle className="w-3 h-3" />
                                <span className="font-medium">{sseState.updatedDocs.length} docs</span>
                              </div>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 flex-shrink-0 ${sseState.connected ? 'text-green-600' : 'text-red-600'}`}>
                            <div className={`w-2 h-2 rounded-full ${sseState.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-xs font-medium">{sseState.connected ? 'Live' : 'Off'}</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <input
                          ref={inputRef}
                          type="text"
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          onKeyPress={handleKeyPress}
                          placeholder={
                            aiStatus === 'working' 
                              ? "Ask about business, analyze data..." 
                              : "Message AI orchestrator..."
                          }
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-xl 
                            focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
                            text-sm shadow-sm"
                          disabled={loading}
                        />
                        <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500">
                          <span>Enter to send</span>
                          {currentMessage.length > 0 && (
                            <span>{currentMessage.length} characters</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleSendMessage}
                        disabled={!currentMessage.trim() || loading}
                        className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-blue-600 text-white 
                          rounded-xl hover:from-emerald-700 hover:to-blue-700 
                          disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                          shadow-sm hover:shadow-md transform hover:scale-105 flex-shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Minimized State */}
              {isMinimized && (
                <div className="p-3 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-blue-50">
                  <div className="flex items-center gap-3">
                    <Brain className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800">Agentic AI</div>
                      <div className="text-xs text-gray-500">Minimized</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sseState.activeActions.length > 0 && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-600">{messages.length}</span>
                    </div>
                  </div>
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}