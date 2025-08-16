/**
 * Panels - Sidebar panels for Now/Clips/Tasks/Docs
 * Simple tab-based panel switching
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  Bookmark, 
  CheckSquare, 
  FileText,
  X,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatPanel, useChatStore } from './chat.state';

export interface PanelsProps {
  className?: string;
  onClose?: () => void;
}

interface PanelTab {
  id: ChatPanel;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const PANEL_TABS: PanelTab[] = [
  { id: 'now', label: 'Now', icon: <Clock className="w-4 h-4" /> },
  { id: 'clips', label: 'Clips', icon: <Bookmark className="w-4 h-4" /> },
  { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
  { id: 'docs', label: 'Docs', icon: <FileText className="w-4 h-4" /> }
];

export default function Panels({ className, onClose }: PanelsProps) {
  const { activePanel, setActivePanel } = useChatStore();
  const [searchQuery, setSearchQuery] = React.useState('');

  if (activePanel === 'none') return null;

  const handleTabClick = (panel: ChatPanel) => {
    if (panel === activePanel) {
      // Close if clicking active tab
      setActivePanel('none');
      onClose?.();
    } else {
      setActivePanel(panel);
    }
  };

  const handleClose = () => {
    setActivePanel('none');
    onClose?.();
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: 'spring', damping: 20 }}
      className={cn(
        'fixed right-0 top-0 h-full w-80 bg-background border-l border-border shadow-xl z-40',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {PANEL_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={activePanel === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabClick(tab.id)}
              className="gap-1.5"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/20 rounded-full">
                  {tab.badge}
                </span>
              )}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activePanel}...`}
            className="pl-9 pr-9"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
          >
            <Filter className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {activePanel === 'now' && <NowPanel key="now" searchQuery={searchQuery} />}
          {activePanel === 'clips' && <ClipsPanel key="clips" searchQuery={searchQuery} />}
          {activePanel === 'tasks' && <TasksPanel key="tasks" searchQuery={searchQuery} />}
          {activePanel === 'docs' && <DocsPanel key="docs" searchQuery={searchQuery} />}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/**
 * Now Panel - Current context and active items
 */
function NowPanel({ searchQuery }: { searchQuery: string }) {
  const items = [
    { id: '1', title: 'Current Workspace', subtitle: 'Product Development', time: 'Active' },
    { id: '2', title: 'Recent Message', subtitle: 'Discussion about API design', time: '2m ago' },
    { id: '3', title: 'Active Agent', subtitle: 'Code Assistant', time: 'Online' }
  ];

  const filtered = items.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {filtered.map((item) => (
        <div
          key={item.id}
          className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
            </div>
            <span className="text-xs text-muted-foreground">{item.time}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Clips Panel - Saved snippets and bookmarks
 */
function ClipsPanel({ searchQuery }: { searchQuery: string }) {
  const clips = [
    { id: '1', title: 'API Endpoint Template', content: 'POST /api/v1/...', tags: ['api', 'template'] },
    { id: '2', title: 'React Hook Pattern', content: 'const useCustomHook = () => {...', tags: ['react', 'hooks'] }
  ];

  const filtered = clips.filter(clip =>
    clip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clip.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <Button className="w-full gap-2" variant="outline" size="sm">
        <Plus className="w-4 h-4" />
        New Clip
      </Button>
      
      {filtered.map((clip) => (
        <div
          key={clip.id}
          className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <p className="font-medium text-sm mb-1">{clip.title}</p>
          <code className="text-xs text-muted-foreground block truncate">
            {clip.content}
          </code>
          <div className="flex gap-1 mt-2">
            {clip.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 bg-primary/10 text-primary text-xs rounded">
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Tasks Panel - Todo items and action items
 */
function TasksPanel({ searchQuery }: { searchQuery: string }) {
  const tasks = [
    { id: '1', title: 'Review PR #123', completed: false, due: 'Today' },
    { id: '2', title: 'Update documentation', completed: false, due: 'Tomorrow' },
    { id: '3', title: 'Fix login bug', completed: true, due: 'Yesterday' }
  ];

  const filtered = tasks.filter(task =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <Button className="w-full gap-2" variant="outline" size="sm">
        <Plus className="w-4 h-4" />
        New Task
      </Button>
      
      {filtered.map((task) => (
        <div
          key={task.id}
          className={cn(
            "p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer",
            task.completed && "opacity-50"
          )}
        >
          <div className="flex items-center gap-2">
            <CheckSquare className={cn(
              "w-4 h-4",
              task.completed ? "text-primary" : "text-muted-foreground"
            )} />
            <p className={cn(
              "font-medium text-sm flex-1",
              task.completed && "line-through"
            )}>
              {task.title}
            </p>
            <span className="text-xs text-muted-foreground">{task.due}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}

/**
 * Docs Panel - Documents and references
 */
function DocsPanel({ searchQuery }: { searchQuery: string }) {
  const docs = [
    { id: '1', title: 'Project README', type: 'markdown', updated: '2 hours ago' },
    { id: '2', title: 'API Documentation', type: 'swagger', updated: 'Yesterday' },
    { id: '3', title: 'Meeting Notes', type: 'document', updated: '3 days ago' }
  ];

  const filtered = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      <Button className="w-full gap-2" variant="outline" size="sm">
        <Plus className="w-4 h-4" />
        New Document
      </Button>
      
      {filtered.map((doc) => (
        <div
          key={doc.id}
          className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{doc.title}</p>
                <p className="text-xs text-muted-foreground">{doc.type}</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground">{doc.updated}</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}