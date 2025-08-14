import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Archive, 
  GitBranch, 
  Edit3, 
  Users, 
  MoreHorizontal,
  X,
  FileText,
  MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useContexts } from '../contexts/ContextProvider';
import { AVAILABLE_AGENTS } from '../types/context';

interface ContextMenuProps {
  contextId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContextMenu({ contextId, isOpen, onClose }: ContextMenuProps) {
  const {
    contexts,
    createNewContext,
    archiveContext,
    branchContext,
    renameContext,
    addAgentToContext,
    removeAgentFromContext
  } = useContexts();

  const [showNewContextInput, setShowNewContextInput] = useState(false);
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [newContextTitle, setNewContextTitle] = useState('');
  const [branchTitle, setBranchTitle] = useState('');
  const [renameTitle, setRenameTitle] = useState('');

  const currentContext = contexts.find(ctx => ctx.id === contextId);
  if (!currentContext) return null;

  const handleCreateNewContext = () => {
    if (newContextTitle.trim()) {
      createNewContext(newContextTitle.trim());
      setNewContextTitle('');
      setShowNewContextInput(false);
      onClose();
    }
  };

  const handleBranchContext = () => {
    if (branchTitle.trim()) {
      branchContext(contextId, branchTitle.trim());
      setBranchTitle('');
      setShowBranchInput(false);
      onClose();
    }
  };

  const handleRenameContext = () => {
    if (renameTitle.trim()) {
      renameContext(contextId, renameTitle.trim());
      setRenameTitle('');
      setShowRenameInput(false);
      onClose();
    }
  };

  const handleArchiveContext = () => {
    archiveContext(contextId);
    onClose();
  };

  const toggleAgent = (agentId: string) => {
    const isActive = currentContext.activeAgents.some(a => a.id === agentId);
    if (isActive) {
      removeAgentFromContext(contextId, agentId);
    } else {
      addAgentToContext(contextId, agentId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Menu */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-2xl p-6 z-50 max-w-md w-full mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Manage Context</h3>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              {/* New Context */}
              <div>
                {!showNewContextInput ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowNewContextInput(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Context
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={newContextTitle}
                      onChange={(e) => setNewContextTitle(e.target.value)}
                      placeholder="Context title..."
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateNewContext()}
                      autoFocus
                    />
                    <Button onClick={handleCreateNewContext} disabled={!newContextTitle.trim()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setShowNewContextInput(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Branch Context */}
              <div>
                {!showBranchInput ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowBranchInput(true)}
                  >
                    <GitBranch className="w-4 h-4 mr-2" />
                    Branch Context
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={branchTitle}
                      onChange={(e) => setBranchTitle(e.target.value)}
                      placeholder="Branch title..."
                      onKeyDown={(e) => e.key === 'Enter' && handleBranchContext()}
                      autoFocus
                    />
                    <Button onClick={handleBranchContext} disabled={!branchTitle.trim()}>
                      <GitBranch className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setShowBranchInput(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rename Context */}
              <div>
                {!showRenameInput ? (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setRenameTitle(currentContext.title);
                      setShowRenameInput(true);
                    }}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Rename Context
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={renameTitle}
                      onChange={(e) => setRenameTitle(e.target.value)}
                      placeholder="New title..."
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameContext()}
                      autoFocus
                    />
                    <Button onClick={handleRenameContext} disabled={!renameTitle.trim()}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" onClick={() => setShowRenameInput(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Agent Management */}
              <div>
                <Button
                  variant="outline"
                  className="w-full justify-start mb-2"
                  onClick={() => setShowAgentSelector(!showAgentSelector)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Agents ({currentContext.activeAgents.length})
                </Button>
                
                {showAgentSelector && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    {AVAILABLE_AGENTS.map(agent => {
                      const isActive = currentContext.activeAgents.some(a => a.id === agent.id);
                      return (
                        <Button
                          key={agent.id}
                          variant={isActive ? "default" : "ghost"}
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => toggleAgent(agent.id)}
                        >
                          {agent.name}
                          {isActive && <span className="ml-auto text-xs">Active</span>}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Archive Context */}
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={handleArchiveContext}
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive Context
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}