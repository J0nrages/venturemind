import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Eye, 
  Edit3, 
  Save, 
  RefreshCw, 
  Lock, 
  Unlock,
  Circle,
  CheckCircle,
  AlertCircle,
  Clock,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { CollaborativeDocumentService, DocumentOperation } from '../services/CollaborativeDocumentService';
import { DocumentPresence } from '../services/WebSocketService';
import toast from 'react-hot-toast';

interface CollaborativeEditorProps {
  document: any;
  onDocumentUpdate: (updatedDocument: any) => void;
  className?: string;
}

const userColors = [
  'bg-blue-500',
  'bg-green-500', 
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500'
];

export default function CollaborativeEditor({ 
  document, 
  onDocumentUpdate, 
  className = '' 
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(document?.content || '');
  const [version, setVersion] = useState(document?.version || 1);
  const [isEditing, setIsEditing] = useState(false);
  const [pendingOperations, setPendingOperations] = useState<DocumentOperation[]>([]);
  const [conflictCount, setConflictCount] = useState(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState<any[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastContentRef = useRef(content);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    connected,
    connecting,
    error,
    documentState,
    activeUsers,
    aiActions,
    toolCalls,
    joinDocument,
    leaveDocument,
    sendDocumentEdit,
    sendCursorMove,
    updatePresence
  } = useWebSocket(document?.user_id, `editor_${Date.now()}`);

  useEffect(() => {
    if (document?.id) {
      joinDocument(document.id);
      loadEditHistory();
    }

    return () => {
      leaveDocument();
    };
  }, [document?.id, joinDocument, leaveDocument]);

  useEffect(() => {
    if (documentState) {
      setVersion(documentState.current_version);
      
      // Update active users list with presence info
      if (documentState.active_users) {
        // Users are managed through the WebSocket hook
      }
    }
  }, [documentState]);

  const loadEditHistory = async () => {
    if (!document?.id) return;

    try {
      const history = await CollaborativeDocumentService.getDocumentHistory(document.id, 20);
      setEditHistory(history);
    } catch (error) {
      console.error('Error loading edit history:', error);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (!isEditing) {
      setIsEditing(true);
      updatePresence('editing');
    }

    // Calculate operation from content diff
    const operation = calculateOperation(lastContentRef.current, newContent);
    if (operation) {
      setPendingOperations(prev => [...prev, operation]);
      
      // Debounce sending operations
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      debounceTimerRef.current = setTimeout(() => {
        sendDocumentOperations();
      }, 300);
    }

    lastContentRef.current = newContent;
  };

  const calculateOperation = (oldContent: string, newContent: string): DocumentOperation | null => {
    // Simple diff calculation - in production you'd use a proper diff algorithm
    if (oldContent === newContent) return null;

    // Find the first difference
    let position = 0;
    while (position < Math.min(oldContent.length, newContent.length) && 
           oldContent[position] === newContent[position]) {
      position++;
    }

    const oldLength = oldContent.length - position;
    const newLength = newContent.length - position;

    if (newLength > oldLength) {
      // Insertion
      return {
        type: 'insert',
        position,
        content: newContent.slice(position, position + (newLength - oldLength)),
        timestamp: new Date().toISOString(),
        user_id: document?.user_id || '',
        version: version + 1
      };
    } else if (newLength < oldLength) {
      // Deletion
      return {
        type: 'delete',
        position,
        length: oldLength - newLength,
        timestamp: new Date().toISOString(),
        user_id: document?.user_id || '',
        version: version + 1
      };
    }

    return null;
  };

  const sendDocumentOperations = async () => {
    if (pendingOperations.length === 0) return;

    try {
      for (const operation of pendingOperations) {
        const checksum = await calculateChecksum(content);
        const success = sendDocumentEdit(operation, version + 1, checksum);
        
        if (success) {
          setVersion(prev => prev + 1);
        }
      }
      
      setPendingOperations([]);
    } catch (error) {
      console.error('Error sending document operations:', error);
      toast.error('Failed to sync document changes');
    }
  };

  const calculateChecksum = async (content: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart;
    const selectionEnd = textareaRef.current.selectionEnd;
    
    sendCursorMove(
      { position: cursorPosition },
      cursorPosition !== selectionEnd ? { start: cursorPosition, end: selectionEnd } : undefined
    );
  };

  const handleBlur = () => {
    setIsEditing(false);
    updatePresence('viewing');
    
    // Send any pending operations
    if (pendingOperations.length > 0) {
      sendDocumentOperations();
    }
  };

  const saveDocument = async () => {
    if (!document?.id) return;

    try {
      await CollaborativeDocumentService.synchronizeDocument(document.id, pendingOperations);
      onDocumentUpdate({ ...document, content, version });
      setPendingOperations([]);
      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const getUserColor = (userId: string): string => {
    const index = userId.charCodeAt(0) % userColors.length;
    return userColors[index];
  };

  const getConnectionStatus = () => {
    if (connecting) return { icon: RefreshCw, text: 'Connecting...', className: 'text-yellow-600 animate-spin' };
    if (connected) return { icon: Wifi, text: 'Connected', className: 'text-green-600' };
    if (error) return { icon: WifiOff, text: 'Error', className: 'text-red-600' };
    return { icon: Circle, text: 'Offline', className: 'text-gray-400' };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <div className={`bg-card/80 backdrop-blur-xl rounded-xl shadow-sm border border-border/50 ${className}`}>
      {/* Collaboration Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Edit3 className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-gray-800">{document?.name || 'Untitled Document'}</h3>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <connectionStatus.icon className={`w-3 h-3 ${connectionStatus.className}`} />
                <span>{connectionStatus.text}</span>
                <span>•</span>
                <span>v{version}</span>
                {pendingOperations.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="text-yellow-600">{pendingOperations.length} pending</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Users */}
            <div className="flex items-center gap-1">
              {activeUsers.slice(0, 5).map((user, index) => (
                <div
                  key={`${user.user_id}-${user.session_id}`}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getUserColor(user.user_id)}`}
                  title={`${user.user_info.name || user.user_info.email} (${user.status})`}
                >
                  {user.user_info.name?.[0] || user.user_info.email?.[0] || '?'}
                  <div className={`absolute w-3 h-3 rounded-full border-2 border-white -bottom-0.5 -right-0.5 ${
                    user.status === 'editing' ? 'bg-green-500' :
                    user.status === 'viewing' ? 'bg-blue-500' : 'bg-gray-400'
                  }`} />
                </div>
              ))}
              
              {activeUsers.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                  +{activeUsers.length - 5}
                </div>
              )}
              
              {activeUsers.length === 0 && (
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Solo editing</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="View edit history"
              >
                <Clock className="w-4 h-4" />
              </button>
              
              <button
                onClick={saveDocument}
                disabled={pendingOperations.length === 0}
                className="p-1 text-gray-400 hover:text-emerald-600 disabled:opacity-50 transition-colors"
                title="Save document"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active AI Actions */}
        {aiActions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
            <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-800">
              AI is {aiActions[0]?.type}: {aiActions[0]?.status}
            </span>
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onBlur={handleBlur}
          onMouseUp={handleCursorMove}
          onKeyUp={handleCursorMove}
          className="w-full h-96 p-4 border-none resize-none focus:outline-none font-mono text-sm"
          placeholder="Start typing your document content..."
        />

        {/* Cursor indicators for other users */}
        <div className="absolute inset-0 pointer-events-none">
          {activeUsers.map((user) => {
            if (!user.cursor_position?.position) return null;
            
            // Calculate cursor position in pixels (simplified)
            const lines = content.split('\n');
            const position = user.cursor_position.position;
            let currentPos = 0;
            let line = 0;
            let column = 0;
            
            for (let i = 0; i < lines.length; i++) {
              if (currentPos + lines[i].length >= position) {
                line = i;
                column = position - currentPos;
                break;
              }
              currentPos += lines[i].length + 1; // +1 for newline
            }
            
            const top = line * 20 + 16; // Approximate line height
            const left = column * 7.5 + 16; // Approximate character width
            
            return (
              <motion.div
                key={`${user.user_id}-cursor`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute pointer-events-none"
                style={{ top: `${top}px`, left: `${left}px` }}
              >
                <div className={`w-0.5 h-5 ${getUserColor(user.user_id)} relative`}>
                  <div className={`absolute -top-6 -left-1 px-2 py-1 text-xs text-white rounded ${getUserColor(user.user_id)} whitespace-nowrap`}>
                    {user.user_info.name || user.user_info.email?.split('@')[0]}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Collaboration Status Bar */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <connectionStatus.icon className={`w-3 h-3 ${connectionStatus.className}`} />
              <span>{connectionStatus.text}</span>
            </div>
            
            {conflictCount > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertCircle className="w-3 h-3" />
                <span>{conflictCount} conflict(s)</span>
              </div>
            )}
            
            {pendingOperations.length > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>{pendingOperations.length} syncing</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                autoSaveEnabled 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Auto-save {autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
            
            <span className="text-gray-500">
              Last saved: {new Date(document?.last_updated || Date.now()).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Edit History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200"
          >
            <div className="p-4 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-800 mb-3">Recent Changes</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {editHistory.map((change, index) => (
                  <div 
                    key={change.id} 
                    className="flex items-center gap-2 p-2 bg-card/80 backdrop-blur-xl border border-border/50 rounded text-xs"
                  >
                    <div className={`w-2 h-2 rounded-full ${getUserColor(change.user_id)}`} />
                    <span className="font-medium">
                      {change.user?.email?.split('@')[0] || 'Unknown'}
                    </span>
                    <span className="text-gray-500">
                      {change.operation_type}
                    </span>
                    <span className="text-gray-400">
                      {new Date(change.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                
                {editHistory.length === 0 && (
                  <div className="text-center py-2 text-gray-500">
                    No edit history available
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

}