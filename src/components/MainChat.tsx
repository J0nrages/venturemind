import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  User, 
  Loader2, 
  Activity,
  Sparkles,
  AlertCircle,
  MoreHorizontal,
  Brain,
  ChevronDown,
  Search,
  Paperclip,
  Clock,
  Hash,
  Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConversationService, ConversationMessage } from '../services/ChatService';
import { DocumentService, UserDocument } from '../services/DocumentService';
import { useSSEConnection } from '../hooks/useSSEConnection';
import { useThreading } from '../hooks/useMessageReplies';
import { useContexts } from '../contexts/WorkspaceProvider';
import { AgentOrchestrator, PrefetchData } from '../services/AgentOrchestrator';
import { Context } from '../types/context';
import { AgentOrchestrationService } from '../services/AgentOrchestrationService';
import { UserSettingsService, type ModelConfiguration, type UserModelPreferences } from '../services/UserSettingsService';
import { GeminiService } from '../services/GeminiService';
import MessageWithReplies from './MessageWithReplies';
import ReplyModal from './ReplyModal';
import BranchModal from './BranchModal';
import ContextMenu from './ContextMenu';
import UnifiedChatInput from './UnifiedChatInput';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

interface ConversationSpineProps {
  context: Context;
  isActive: boolean;
  className?: string;
  unbounded?: boolean;
  onNavigate?: (page: 'settings' | 'projects' | 'workflows' | 'ledger') => void;
}

export function MainChat({ 
  context, 
  isActive, 
  className,
  unbounded = false,
  onNavigate
}: ConversationSpineProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'working' | 'error' | 'no-key'>('unknown');
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [agentSuggestions, setAgentSuggestions] = useState<any[]>([]);
  
  // Model selector and chat features state
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<Record<string, ModelConfiguration>>({});
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [messageStats, setMessageStats] = useState<{
    lastLatency?: number;
    lastTokens?: number;
    lastSpeed?: number;
  }>({});
  
  // Settings for stats display
  const { userSettings } = useContexts();
  const showStats = userSettings?.ui_preferences?.show_message_stats ?? false;
  
  const { addAgentToContext, threadContext, spawnAgentWorkstream } = useContexts();
  
  // Modal states for threading
  const [replyModal, setReplyModal] = useState<{
    isOpen: boolean;
    messageId: string;
    quotedText?: string;
    parentMessage?: string;
  }>({
    isOpen: false,
    messageId: '',
    quotedText: undefined,
    parentMessage: undefined
  });
  
  const [branchModal, setBranchModal] = useState<{
    isOpen: boolean;
    messageId: string;
    selectedText?: string;
    parentMessage?: string;
  }>({
    isOpen: false,
    messageId: '',
    selectedText: undefined,
    parentMessage: undefined
  });
  
  const [threadModal, setThreadModal] = useState<{
    isOpen: boolean;
    messageId: string;
    selectedText?: string;
    parentMessage?: string;
  }>({
    isOpen: false,
    messageId: '',
    selectedText: undefined,
    parentMessage: undefined
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  
  // SSE connection for real-time orchestration updates
  const sseState = useSSEConnection(user?.id);
  
  // Threading functionality
  const threading = useThreading(user?.id);

  // Initialize chat when active
  useEffect(() => {
    if (isActive) {
      initializeChat();
    }
  }, [isActive, context.id]);

  // Load user model preferences
  useEffect(() => {
    if (user?.id) {
      loadUserModelPreferences();
    }
  }, [user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Note: Input focus is now handled within UnifiedChatInput component

  // Click outside handler for model dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };

    if (showModelDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModelDropdown]);

  // Load context-specific conversation history
  useEffect(() => {
    if (context.conversationHistory.length > 0) {
      const contextMessages = context.conversationHistory.map(msg => ({
        id: msg.id,
        user_id: user?.id || '',
        content: msg.content,
        sender: msg.sender,
        created_at: msg.timestamp.toISOString(),
        document_updates: [],
        context_confidence: 0,
        parent_message_id: undefined
      }));
      setMessages(contextMessages);
    }
  }, [context.conversationHistory, user?.id]);

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
      // Load context-specific messages
      const messagesData = await ConversationService.getConversationHistory(userId, 30, context.id);
      setMessages(messagesData);
      
      // Don't create any default messages
      // if (messagesData.length === 0) {
      //   const welcomeMessage = getContextWelcomeMessage(userId);
      //   await ConversationService.saveMessage(welcomeMessage);
      //   setMessages([{ ...welcomeMessage, id: '1', created_at: new Date().toISOString() } as ConversationMessage]);
      // }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadDocuments = async (userId: string) => {
    try {
      const docs = await DocumentService.getUserDocuments(userId);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const checkAIStatus = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', userId)
        .single();
      
      setAiStatus(data?.gemini_api_key ? 'working' : 'no-key');
    } catch (error) {
      setAiStatus('no-key');
    }
  };

  const loadUserModelPreferences = async () => {
    if (!user?.id) return;
    
    try {
      const settings = await UserSettingsService.loadUserSettings(user.id);
      setAvailableModels(settings.model_preferences.models);
      setSelectedModel(settings.model_preferences.default_model);
    } catch (error) {
      console.error('Error loading model preferences:', error);
      setAvailableModels(UserSettingsService.DEFAULT_MODEL_PREFERENCES.models);
      setSelectedModel('gemini-2.5-flash');
    }
  };

  // Removed hardcoded welcome message function

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || loading || !user) return;
    
    setLoading(true);
    const userMessage = currentMessage;
    setCurrentMessage('');
    const startTime = Date.now();
    
    try {
      // Clear model config cache to ensure we use latest settings
      GeminiService.clearModelConfigCache(user.id);
      // Check for agent suggestions before sending
      const suggestions = AgentOrchestrationService.suggestAgents(userMessage, context.activeAgents);
      if (suggestions.length > 0) {
        setAgentSuggestions(suggestions);
      }

      // Auto-activate highly relevant agents
      for (const suggestion of suggestions) {
        if (suggestion.confidence > 30) {
          addAgentToContext(context.id, suggestion.agent.id);
          toast.success(`${suggestion.agent.name} joined the conversation`);
        }
      }
      
      // Save user message with context
      const userMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: userMessage,
        sender: 'user',
        document_updates: [],
        context_confidence: 0,
        thread_id: context.id
      };
      
      await ConversationService.saveMessage(userMsg);
      setMessages(prev => [...prev, { ...userMsg, id: Date.now().toString(), created_at: new Date().toISOString() } as ConversationMessage]);
      
      // Process with context-aware AI
      const response = await ConversationService.processWithContextualAI(
        userMessage, 
        user.id, 
        documents,
        context
      );
      
      // Save AI response
      const aiMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: response.response,
        sender: 'ai',
        document_updates: response.updatedDocuments || [],
        context_confidence: response.contextConfidence || 0,
        thread_id: context.id
      };
      
      await ConversationService.saveMessage(aiMsg);
      setMessages(prev => [...prev, { ...aiMsg, id: (Date.now() + 1).toString(), created_at: new Date().toISOString() } as ConversationMessage]);
      
      // Calculate message stats
      const endTime = Date.now();
      const latency = endTime - startTime;
      const estimatedTokens = Math.ceil((userMessage.length + response.response.length) / 4); // Rough estimate
      const tokensPerSecond = Math.round((estimatedTokens / latency) * 1000);
      
      setMessageStats({
        lastLatency: latency,
        lastTokens: estimatedTokens,
        lastSpeed: tokensPerSecond
      });
      
      // Reload documents if any were updated
      if (response.updatedDocuments?.length > 0) {
        await loadDocuments(user.id);
        toast.success(`Updated ${response.updatedDocuments.length} document(s)`);
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const getAIStatusIndicator = () => {
    switch(aiStatus) {
      case 'working':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-green-600 font-medium">AI Active</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">AI Limited</span>
          </div>
        );
      case 'no-key':
        return (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Setup Required</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Context Header with Management Options - Hidden in unbounded mode */}
      {!unbounded && (
        <div className="p-4 border-b border-border bg-gradient-to-br from-secondary/30 to-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl backdrop-blur-sm"
              style={{ backgroundColor: context.color.secondary }}
            >
              <Brain className="w-5 h-5" style={{ color: context.color.primary }} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">{context.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {getAIStatusIndicator()}
                {sseState.connected && (
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                    <span className="text-xs text-blue-600">Live</span>
                  </div>
                )}
                {context.activeAgents.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {context.activeAgents.length} agent{context.activeAgents.length > 1 ? 's' : ''} active
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Context Management */}
          <div className="flex items-center gap-2">
            {context.activeAgents.map(agent => (
              <div 
                key={agent.id}
                className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
                title={`${agent.name} - ${agent.status}`}
              >
                {agent.name}
              </div>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowContextMenu(true)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      )}

      {/* Messages Area with Context-Aware Styling */}
      <div ref={messagesScrollRef} className={cn(
        "flex-1 overflow-y-auto scrollbar-safari",
        unbounded ? "" : "px-4 pt-4 pb-8"  // No bottom padding in unbounded mode - let it extend to bottom
      )}>
        <div className={cn(
          "mx-auto w-full",
          unbounded ? "max-w-4xl px-4 sm:px-6" : "max-w-5xl px-2 sm:px-4"
        )}>
          <div className="flex flex-col gap-3">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <MessageWithReplies
                  message={message}
                  onArchive={(messageId) => threading.archiveMessage(messageId)}
                  onRestore={(messageId) => threading.restoreMessage(messageId)}
                  onReply={(messageId, quotedText) => {
                    const parentMessage = messages.find(m => m.id === messageId);
                    setReplyModal({
                      isOpen: true,
                      messageId,
                      quotedText,
                      parentMessage: parentMessage?.content
                    });
                  }}
                  onBranch={(messageId, selectedText) => {
                    const parentMessage = messages.find(m => m.id === messageId);
                    setBranchModal({
                      isOpen: true,
                      messageId,
                      selectedText,
                      parentMessage: parentMessage?.content
                    });
                  }}
                  onThread={(messageId, selectedText) => {
                    const parentMessage = messages.find(m => m.id === messageId);
                    setThreadModal({
                      isOpen: true,
                      messageId,
                      selectedText,
                      parentMessage: parentMessage?.content
                    });
                  }}
                  onSpawnAgent={(agentId, selectedText) => {
                    const prefetchData = AgentOrchestrator.getPrefetchedData(agentId, context.id);
                    const newContextId = spawnAgentWorkstream(agentId, context.id, prefetchData, `${agentId} - ${selectedText.substring(0, 30)}...`);
                    toast.success(`Spawned ${agentId} workstream`);
                  }}
                  showArchived={threading.showArchived}
                  isRoot={!message.parent_message_id}
                  depth={0}
                  contextId={context.id}
                  userId={user?.id}
                  className="mb-2"
                />
              </motion.div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-card/80 backdrop-blur-sm border border-border p-3 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      {context.title} AI is thinking...
                    </span>
                  </div>
                  {sseState.activeActions.length > 0 && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {sseState.activeActions[0].replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            {/* Spacer to account for floating input - matches bottom-24 position plus input height */}
            {unbounded && <div className="h-40" />}
          </div>
        </div>
      </div>

      {/* Enhanced ChatGPT-style Input Area - Hidden in unbounded mode */}
      {!unbounded && (
        <div className="relative p-4 bg-background/50 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
        {/* Message Stats */}
        {showStats && messageStats.lastLatency && (
          <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{(messageStats.lastLatency / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span>{messageStats.lastTokens} tokens</span>
            </div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>{messageStats.lastSpeed} tok/sec</span>
            </div>
          </div>
        )}
        
        {/* Model Selector and Controls */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          {/* Model Selector */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
              disabled={loading}
            >
              <Brain className="w-4 h-4" />
              <span className="font-medium">{selectedModel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showModelDropdown && (
              <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-48 z-10">
                {Object.entries(availableModels).map(([modelName, config]) => (
                  <button
                    key={modelName}
                    onClick={() => {
                      setSelectedModel(modelName);
                      setShowModelDropdown(false);
                      // Update user preference immediately
                      if (user?.id) {
                        UserSettingsService.loadUserSettings(user.id).then(settings => {
                          UserSettingsService.saveUserSettings(user.id, {
                            ...settings,
                            model_preferences: {
                              ...settings.model_preferences,
                              default_model: modelName
                            }
                          });
                        });
                      }
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-secondary transition-colors ${
                      selectedModel === modelName ? 'bg-primary/10 text-primary' : 'text-foreground'
                    }`}
                  >
                    <div className="font-medium">{modelName}</div>
                    <div className="text-xs text-muted-foreground">
                      Max: {config.max_output_tokens} tokens • Temp: {config.temperature}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hide input controls in unbounded mode */}
          {!unbounded && (
            <>
              {/* Web Search Toggle */}
              <button
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                  webSearchEnabled 
                    ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title={webSearchEnabled ? 'Web search enabled' : 'Web search disabled'}
              >
                <Search className="w-4 h-4" />
                <span className="text-xs font-medium">Search</span>
              </button>

              {/* Attachment placeholder */}
              <button
                className="flex items-center gap-1 px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                title="Attach files (coming soon)"
                disabled
              >
                <Paperclip className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        
        {!unbounded && aiStatus === 'no-key' && (
          <div className="mt-2 p-2 bg-amber-50 backdrop-blur-sm border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700">
              Enhanced AI features require setup.{' '}
              <a href="/settings" className="underline hover:text-amber-800">
                Add your API key
              </a>
            </p>
          </div>
        )}

        {/* Agent Suggestions */}
        {agentSuggestions.length > 0 && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-2">Suggested agents for this conversation:</div>
            <div className="flex flex-wrap gap-2">
              {agentSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => {
                    addAgentToContext(context.id, suggestion.agent.id);
                    setAgentSuggestions(prev => prev.filter((_, i) => i !== index));
                    toast.success(`${suggestion.agent.name} added to conversation`);
                  }}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1"
                  title={suggestion.reason}
                >
                  {suggestion.agent.name}
                  <span className="text-blue-500">({Math.round(suggestion.confidence)}%)</span>
                </button>
              ))}
              <button
                onClick={() => setAgentSuggestions([])}
                className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-full hover:bg-secondary/80 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
      )}

      {/* Floating Input for Unbounded Mode */}
      {unbounded && (
        <UnifiedChatInput
          value={currentMessage}
          onChange={setCurrentMessage}
          onSend={sendMessage}
          loading={loading}
          placeholder="Type your message here..."
          floating={true}
          showStats={showStats}
          stats={messageStats}
          modelOptions={availableModels}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={setWebSearchEnabled}
          userId={user?.id}
          onNavigate={onNavigate || ((page) => {
            switch(page) {
              case 'settings':
                navigate('/settings');
                break;
              case 'projects':
                navigate('/business-plan');
                break;
              case 'workflows':
                navigate('/strategy');
                break;
              case 'ledger':
                navigate('/document-memory');
                break;
            }
          })}
        />
      )}
      
      {/* Modals */}
      <ReplyModal
        isOpen={replyModal.isOpen}
        onClose={() => setReplyModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={(content) => {
          threading.createReply(replyModal.messageId, content, replyModal.quotedText);
        }}
        quotedText={replyModal.quotedText}
        parentMessage={replyModal.parentMessage}
      />
      
      <BranchModal
        isOpen={branchModal.isOpen}
        onClose={() => setBranchModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={(content) => {
          threading.createBranch(branchModal.messageId, branchModal.selectedText || '', content);
        }}
        selectedText={branchModal.selectedText}
        parentMessage={branchModal.parentMessage}
      />
      
      {/* Thread Modal - using BranchModal as placeholder until dedicated component is created */}
      <BranchModal
        isOpen={threadModal.isOpen}
        onClose={() => setThreadModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={(content) => {
          // Create a thread context instead of a branch
          const newThreadId = threadContext(context.id, `Thread: ${threadModal.selectedText?.substring(0, 30)}...`, threadModal.selectedText || '');
          toast.success('New thread created');
        }}
        selectedText={threadModal.selectedText}
        parentMessage={threadModal.parentMessage}
      />

      {/* Context Menu */}
      <ContextMenu
        contextId={context.id}
        isOpen={showContextMenu}
        onClose={() => setShowContextMenu(false)}
      />
    </div>
  );
}

export default MainChat;