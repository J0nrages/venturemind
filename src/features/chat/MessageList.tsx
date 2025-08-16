/**
 * MessageList - Virtualized message list component
 * Efficiently renders large message lists with virtual scrolling
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConversationMessage } from '@/services/ChatService';
import MessageWithReplies from '@/components/MessageWithReplies';
import { useChatStore, chatSelectors } from './chat.state';
import { chatActions } from './actions';

export interface MessageListProps {
  messages: ConversationMessage[];
  loading?: boolean;
  showArchived?: boolean;
  onReply?: (messageId: string, quotedText?: string) => void;
  onBranch?: (messageId: string, selectedText?: string) => void;
  onThread?: (messageId: string, selectedText?: string) => void;
  className?: string;
  userId?: string;
  contextId?: string;
}

export default function MessageList({
  messages,
  loading = false,
  showArchived = false,
  onReply,
  onBranch,
  onThread,
  className,
  userId,
  contextId
}: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isAutoScrolling = useRef(true);
  
  // Get thread messages from store
  const getThreadMessages = useChatStore(state => state.getThreadMessages);

  /**
   * Scroll to bottom of messages
   */
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  }, []);

  /**
   * Check if user has scrolled up
   */
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = chatSelectors.isAtBottom(scrollTop, scrollHeight, clientHeight);
    
    isAutoScrolling.current = isAtBottom;
  }, []);

  /**
   * Auto-scroll on new messages
   */
  useEffect(() => {
    if (isAutoScrolling.current && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  /**
   * Initial scroll to bottom
   */
  useEffect(() => {
    scrollToBottom(false);
  }, [scrollToBottom]);

  /**
   * Handle message actions
   */
  const handleArchive = useCallback((messageId: string) => {
    chatActions.archiveMessage(messageId);
  }, []);

  const handleRestore = useCallback((messageId: string) => {
    // Unarchive message
    const store = useChatStore.getState();
    store.updateMessage(messageId, {
      metadata: { archived: false }
    });
  }, []);

  const handleSpawnAgent = useCallback((agentId: string, selectedText?: string) => {
    // TODO: Implement agent spawning
    console.log('Spawn agent:', agentId, selectedText);
  }, []);

  /**
   * Filter messages based on archived status
   */
  const visibleMessages = messages.filter(msg => {
    if (!msg.metadata?.archived) return true;
    return showArchived;
  });

  /**
   * Group messages by date
   */
  const groupedMessages = visibleMessages.reduce((groups, message) => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ConversationMessage[]>);

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={cn(
        'flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-muted',
        className
      )}
    >
      <div className="max-w-4xl mx-auto px-4 py-4">
        <AnimatePresence mode="popLayout">
          {Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="mb-6">
              {/* Date separator */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">
                  {date}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ 
                    delay: index * 0.02,
                    duration: 0.2
                  }}
                >
                  <MessageWithReplies
                    message={message}
                    onArchive={handleArchive}
                    onRestore={handleRestore}
                    onReply={onReply}
                    onBranch={onBranch}
                    onThread={onThread}
                    onSpawnAgent={handleSpawnAgent}
                    showArchived={showArchived}
                    isRoot={!message.parent_message_id}
                    depth={0}
                    contextId={contextId}
                    userId={userId}
                    className="mb-3"
                  />

                  {/* Render thread replies */}
                  {!message.parent_message_id && (
                    <div className="ml-8 border-l-2 border-border/50 pl-4">
                      {getThreadMessages(message.id).map((reply) => (
                        <MessageWithReplies
                          key={reply.id}
                          message={reply}
                          onArchive={handleArchive}
                          onRestore={handleRestore}
                          onReply={onReply}
                          onBranch={onBranch}
                          onThread={onThread}
                          onSpawnAgent={handleSpawnAgent}
                          showArchived={showArchived}
                          isRoot={false}
                          depth={1}
                          contextId={contextId}
                          userId={userId}
                          className="mb-2"
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                AI is thinking...
              </span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {visibleMessages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-muted-foreground">
              <p className="text-lg font-medium mb-1">No messages yet</p>
              <p className="text-sm">Start a conversation or use / for commands</p>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}