/**
 * MainChat - Refactored with new architecture
 * Fully integrated with Omnibox, Composer, and modular chat components
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  User, 
  Loader2, 
  Activity,
  Sparkles,
  AlertCircle,
  Brain,
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
import { AgentOrchestrator } from '../services/AgentOrchestrator';
import { Context } from '../types/context';
import { AgentOrchestrationService } from '../services/AgentOrchestrationService';
import { UserSettingsService, type ModelConfiguration } from '../services/UserSettingsService';
import { GeminiService } from '../services/GeminiService';
import MessageWithReplies from './MessageWithReplies';
import ReplyModal from './ReplyModal';
import BranchModal from './BranchModal';
import ContextMenu from './ContextMenu';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';

// Import refactored components
import { 
  Composer, 
  Omnibox, 
  useOmnibox,
  Panels,
  useChatStore,
  chatActions,
  parsePrefix,
  shouldOpenOmnibox,
  commandRouter,
  type MentionPill
} from '@/features/chat';

interface MainChatProps {
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
}: MainChatProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'working' | 'error' | 'no-key'>('unknown');
  const [agentSuggestions, setAgentSuggestions] = useState<any[]>([]);
  
  // Model and settings state
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState<Record<string, ModelConfiguration>>({});
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [messageStats, setMessageStats] = useState<{
    lastLatency?: number;
    lastTokens?: number;
    lastSpeed?: number;
  }>({});
  
  // Settings from context
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  
  // SSE connection for real-time updates
  const sseState = useSSEConnection(user?.id);
  
  // Threading functionality
  const threading = useThreading(user?.id);
  
  // Omnibox hook
  const omnibox = useOmnibox({
    userId: user?.id,
    workspaceId: context.id,
    enabled: isActive,
    onExecute: async (command, result) => {
      console.log('Command executed:', command, result);
    }
  });

  // Sync with chat store
  const { setActivePanel } = useChatStore();

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
        parent_message_id: undefined,
        thread_id: context.id
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
      const messagesData = await ConversationService.getConversationHistory(userId, 30, context.id);
      setMessages(messagesData);
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  };

  const sendMessage = async (content: string, mentions?: MentionPill[]) => {
    if (!content.trim() || loading || !user) return;
    
    // Check for command prefix
    const parsed = parsePrefix(content, content.length);
    if (parsed && shouldOpenOmnibox(parsed.mode)) {
      // Execute as command
      const result = await commandRouter.route(parsed, {
        userId: user.id,
        workspaceId: context.id,
        documentId: undefined
      });
      
      if (!result.success) {
        toast.error(result.error || 'Command failed');
      }
      return;
    }
    
    setLoading(true);
    const startTime = Date.now();
    
    try {
      // Clear model config cache
      GeminiService.clearModelConfigCache(user.id);
      
      // Check for agent suggestions
      const suggestions = AgentOrchestrationService.suggestAgents(content, context.activeAgents);
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
      
      // Save user message
      const userMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content,
        sender: 'user',
        document_updates: [],
        context_confidence: 0,
        thread_id: context.id
      };
      
      await ConversationService.saveMessage(userMsg);
      const tempUserMsg = { 
        ...userMsg, 
        id: Date.now().toString(), 
        created_at: new Date().toISOString() 
      } as ConversationMessage;
      setMessages(prev => [...prev, tempUserMsg]);
      
      // Process with AI
      const response = await ConversationService.processWithContextualAI(
        content, 
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
      const tempAiMsg = { 
        ...aiMsg, 
        id: (Date.now() + 1).toString(), 
        created_at: new Date().toISOString() 
      } as ConversationMessage;
      setMessages(prev => [...prev, tempAiMsg]);
      
      // Calculate stats
      const endTime = Date.now();
      const latency = endTime - startTime;
      const estimatedTokens = Math.ceil((content.length + response.response.length) / 4);
      const tokensPerSecond = Math.round((estimatedTokens / latency) * 1000);
      
      setMessageStats({
        lastLatency: latency,
        lastTokens: estimatedTokens,
        lastSpeed: tokensPerSecond
      });
      
      // Reload documents if updated
      if (response.updatedDocuments?.length > 0) {
        await loadDocuments(user.id);
        toast.success(`Updated ${response.updatedDocuments.length} document(s)`);
      }
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Send message error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOmnibox = (mode: 'inline', query: string) => {
    omnibox.open(mode, query);
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
    <div className={cn("flex flex-col h-full relative", className)}>
      {/* Context Header - Hidden in unbounded mode */}
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
                onClick={() => setActivePanel('now')}
              >
                <Hash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div ref={messagesScrollRef} className={cn(
        "flex-1 overflow-y-auto scrollbar-safari",
        unbounded ? "" : "px-4 pt-4 pb-8"
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
                    const newThreadId = threadContext(
                      context.id, 
                      `Thread: ${selectedText?.substring(0, 30)}...`, 
                      selectedText || ''
                    );
                    toast.success('New thread created');
                  }}
                  onSpawnAgent={(agentId, selectedText) => {
                    const prefetchData = AgentOrchestrator.getPrefetchedData(agentId, context.id);
                    const newContextId = spawnAgentWorkstream(
                      agentId, 
                      context.id, 
                      prefetchData, 
                      `${agentId} - ${selectedText?.substring(0, 30)}...`
                    );
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
            {unbounded && <div className="h-40" />}
          </div>
        </div>
      </div>

      {/* Composer Input */}
      {unbounded ? (
        // Floating input for unbounded mode
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-2xl px-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-background/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 border border-border"
          >
            <Composer
              onSend={sendMessage}
              onOpenOmnibox={handleOpenOmnibox}
              loading={loading}
              autoFocus
            />
          </motion.div>
        </div>
      ) : (
        // Regular input
        <div className="relative p-4 bg-background/50 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto">
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
            
            <Composer
              onSend={sendMessage}
              onOpenOmnibox={handleOpenOmnibox}
              loading={loading}
              autoFocus
            />
            
            {aiStatus === 'no-key' && (
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
                <div className="text-xs text-muted-foreground mb-2">Suggested agents:</div>
                <div className="flex flex-wrap gap-2">
                  {agentSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        addAgentToContext(context.id, suggestion.agent.id);
                        setAgentSuggestions(prev => prev.filter((_, i) => i !== index));
                        toast.success(`${suggestion.agent.name} added`);
                      }}
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                      {suggestion.agent.name}
                      <span className="text-blue-500">({Math.round(suggestion.confidence)}%)</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setAgentSuggestions([])}
                    className="px-2 py-1 text-xs bg-secondary text-muted-foreground rounded-full hover:bg-secondary/80"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Side Panels */}
      <Panels />
      
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
      
      <ContextMenu
        contextId={context.id}
        isOpen={false}
        onClose={() => {}}
      />

      {/* Omnibox */}
      <Omnibox
        open={omnibox.isOpen}
        onOpenChange={(open) => open ? omnibox.open() : omnibox.close()}
        mode={omnibox.mode}
        initialQuery={omnibox.initialQuery}
        initialMode={omnibox.initialMode}
        onSelect={(value, type) => {
          if (type === 'command') {
            commandRouter.route(parsePrefix(value, value.length)!, {
              userId: user?.id,
              workspaceId: context.id
            });
          }
        }}
        position={omnibox.position}
        userId={user?.id}
        workspaceId={context.id}
      />
    </div>
  );
}

export default MainChat;