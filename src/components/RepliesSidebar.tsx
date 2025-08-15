import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  GitBranch, 
  Clock, 
  Archive, 
  Filter,
  Search,
  Plus,
  ChevronRight,
  Users,
  Loader2
} from 'lucide-react';
import { ConversationThread } from '../services/ChatService';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface ThreadSidebarProps {
  threads: ConversationThread[];
  activeThreadId?: string;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
  showArchived: boolean;
  onToggleArchived: () => void;
  loading?: boolean;
}

export default function ThreadSidebar({
  threads,
  activeThreadId,
  onThreadSelect,
  onNewThread,
  showArchived,
  onToggleArchived,
  loading = false
}: ThreadSidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');

  // Filter threads based on search and status
  const filteredThreads = threads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && thread.status === 'active') ||
                         (filterStatus === 'archived' && thread.status === 'archived');
    
    return matchesSearch && matchesStatus;
  });

  // Group threads by time
  const groupThreadsByTime = (threads: ConversationThread[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const groups = {
      today: [] as ConversationThread[],
      yesterday: [] as ConversationThread[],
      thisWeek: [] as ConversationThread[],
      older: [] as ConversationThread[]
    };

    threads.forEach(thread => {
      const threadDate = new Date(thread.last_activity_at);
      
      if (threadDate >= today) {
        groups.today.push(thread);
      } else if (threadDate >= yesterday) {
        groups.yesterday.push(thread);
      } else if (threadDate >= thisWeek) {
        groups.thisWeek.push(thread);
      } else {
        groups.older.push(thread);
      }
    });

    return groups;
  };

  const threadGroups = groupThreadsByTime(filteredThreads);

  const ThreadItem = ({ thread }: { thread: ConversationThread }) => {
    const isActive = thread.id === activeThreadId;
    const lastActivity = new Date(thread.last_activity_at);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ x: 4 }}
        className="group"
      >
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            isActive ? 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'hover:bg-accent/50'
          } ${thread.status === 'archived' ? 'opacity-60' : ''}`}
          onClick={() => onThreadSelect(thread.id)}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-sm truncate flex-1 pr-2">
                {thread.title}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                {thread.participant_count > 1 && (
                  <Badge variant="secondary" className="text-xs px-1">
                    <Users className="w-3 h-3 mr-1" />
                    {thread.participant_count}
                  </Badge>
                )}
              </div>
            </div>
            
            {thread.summary && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {thread.summary}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-3 h-3" />
                <span>{thread.message_count}</span>
                
                {thread.status === 'archived' && (
                  <>
                    <Archive className="w-3 h-3" />
                    <span>Archived</span>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span title={lastActivity.toLocaleString()}>
                  {lastActivity.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const ThreadGroup = ({ title, threads }: { title: string; threads: ConversationThread[] }) => {
    if (threads.length === 0) return null;
    
    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-2">
          {title}
        </h3>
        <div className="space-y-2">
          {threads.map(thread => (
            <ThreadItem key={thread.id} thread={thread} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col bg-card/80 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-emerald-600" />
            Threads
          </CardTitle>
          
          <Button
            onClick={onNewThread}
            size="sm"
            className="h-8 w-8 p-0"
            title="New Thread"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search threads..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-border/50 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-card/60 backdrop-blur-sm"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border/50 p-1">
            {(['all', 'active', 'archived'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                  filterStatus === status 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
          
          <Button
            onClick={onToggleArchived}
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            title={showArchived ? 'Hide archived' : 'Show archived'}
          >
            <Archive className={`w-4 h-4 ${showArchived ? 'text-emerald-600' : 'text-muted-foreground'}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto px-3 pb-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">
              {searchTerm ? 'No threads match your search' : 'No threads yet'}
            </p>
            {!searchTerm && (
              <Button 
                onClick={onNewThread}
                variant="ghost" 
                size="sm" 
                className="mt-2"
              >
                Start your first conversation
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <ThreadGroup title="Today" threads={threadGroups.today} />
            <ThreadGroup title="Yesterday" threads={threadGroups.yesterday} />
            <ThreadGroup title="This Week" threads={threadGroups.thisWeek} />
            <ThreadGroup title="Older" threads={threadGroups.older} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}