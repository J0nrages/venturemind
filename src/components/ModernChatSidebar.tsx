import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Brain,
  Activity,
  Database,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ConversationService, ConversationMessage } from '../services/ConversationService';
import { DocumentService, UserDocument } from '../services/DocumentService';
import { useSSEConnection } from '../hooks/useSSEConnection';
import { useThreading } from '../hooks/useThreading';
import { useScrollVisibility } from '../hooks/useScrollVisibility';
import ThreadedChatMessage from './ThreadedChatMessage';
import ReplyModal from './ReplyModal';
import BranchModal from './BranchModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface ModernChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  position: 'left' | 'right';
  onPositionChange: (position: 'left' | 'right') => void;
}

export default function ModernChatSidebar({ 
  isOpen, 
  onToggle, 
  position, 
  onPositionChange 
}: ModernChatSidebarProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'working' | 'error' | 'no-key'>('unknown');
  
  // Modal states
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
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Safari-style scrollbar visibility
  const messagesScroll = useScrollVisibility(messagesScrollRef.current);
  
  // SSE connection for real-time orchestration updates
  const sseState = useSSEConnection(user?.id);
  
  // Threading functionality
  const threading = useThreading(user?.id);

  useEffect(() => {
    if (isOpen) {
      initializeChat();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current && !loading && isOpen) {
      inputRef.current.focus();
    }
  }, [loading, isOpen]);

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
          content: "Hello! I'm your AI assistant. How can I help you with your business today?",
          sender: 'ai',
          document_updates: [],
          context_confidence: 0
        };
        await ConversationService.saveMessage(welcomeMessage);
        setMessages([{ ...welcomeMessage, id: '1', created_at: new Date().toISOString() } as ConversationMessage]);
      }
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end',
      inline: 'nearest'
    });
  };

  const retryMessage = async (messageId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Use the retry functionality from ConversationService
      const retriedMessage = await ConversationService.retryMessage(messageId, user.id, documents);
      
      // Add the new AI response to messages
      setMessages(prev => [...prev, retriedMessage]);
      
      // Reload documents in case any were updated
      await loadDocuments(user.id);
      
      toast.success('Message retried successfully');
    } catch (error) {
      console.error('Error retrying message:', error);
      toast.error('Failed to retry message');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || loading || !user) return;
    
    setLoading(true);
    const userMessage = currentMessage;
    setCurrentMessage('');
    
    try {
      // Save user message
      const userMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: userMessage,
        sender: 'user',
        document_updates: [],
        context_confidence: 0
      };
      
      await ConversationService.saveMessage(userMsg);
      setMessages(prev => [...prev, { ...userMsg, id: Date.now().toString(), created_at: new Date().toISOString() } as ConversationMessage]);
      
      // Process with AI
      const response = await ConversationService.processWithAI(userMessage, user.id, documents);
      
      // Save AI response
      const aiMsg: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: response.response,
        sender: 'ai',
        document_updates: response.updatedDocuments || [],
        context_confidence: response.contextConfidence || 0
      };
      
      await ConversationService.saveMessage(aiMsg);
      setMessages(prev => [...prev, { ...aiMsg, id: (Date.now() + 1).toString(), created_at: new Date().toISOString() } as ConversationMessage]);
      
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
            <AlertCircle className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Setup Required</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Modern Chat Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={onToggle}
            className={cn(
              "fixed bottom-6 z-50",
              "p-4 rounded-full",
              "bg-primary/90 backdrop-blur-lg",
              "shadow-lg shadow-primary/20",
              "hover:shadow-xl hover:shadow-primary/30",
              "transition-all duration-300",
              "group",
              position === 'right' ? 'right-6' : 'left-6'
            )}
          >
            <MessageCircle className="w-6 h-6 text-primary-foreground group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Glassmorphism Chat Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Chat Sidebar */}
            <motion.div
              initial={{ x: position === 'right' ? '100%' : '-100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: position === 'right' ? '100%' : '-100%', opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={cn(
                "fixed top-0 h-full w-96 z-50",
                "bg-background/80 backdrop-blur-xl",
                "border-l border-border/50",
                "shadow-2xl",
                position === 'right' ? 'right-0' : 'left-0'
              )}
            >
              <div className="flex flex-col h-full">
                {/* Glassmorphic Header */}
                <div className="p-4 border-b border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="p-2.5 bg-primary/10 rounded-xl backdrop-blur-sm">
                          <Brain className="w-5 h-5 text-primary" />
                        </div>
                        <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-primary animate-pulse" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm">Agentic AI</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          {getAIStatusIndicator()}
                          {sseState.connected && (
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                              <span className="text-xs text-blue-600">Live</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-accent/50"
                        onClick={() => onPositionChange(position === 'left' ? 'right' : 'left')}
                      >
                        {position === 'left' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                        onClick={onToggle}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Messages Area with Threading Support */}
                <div ref={messagesScrollRef} className="flex-1 overflow-y-auto scrollbar-safari chat-scroll p-4 space-y-2">
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ThreadedChatMessage
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
                        onRetry={retryMessage}
                        showArchived={threading.showArchived}
                        isRoot={!message.parent_message_id}
                        depth={0}
                      />
                    </motion.div>
                  ))}
                  
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-card/80 backdrop-blur-sm border border-border/50 p-3 rounded-2xl">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area with Glassmorphism */}
                <div className="p-4 border-t border-border/50 bg-background/50 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                      placeholder="Ask me anything..."
                      disabled={loading}
                      className="flex-1 bg-background/50 border-border/50 backdrop-blur-sm focus:bg-background/80 transition-colors"
                    />
                    <Button
                      onClick={sendMessage}
                      disabled={loading || !currentMessage.trim()}
                      size="icon"
                      className="rounded-lg bg-primary/90 hover:bg-primary backdrop-blur-sm"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  
                  {aiStatus === 'no-key' && (
                    <div className="mt-2 p-2 bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded-lg">
                      <p className="text-xs text-amber-600">
                        Enhanced AI features require setup.{' '}
                        <a href="/settings" className="underline hover:text-amber-700">
                          Add your API key
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
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
    </>
  );
}