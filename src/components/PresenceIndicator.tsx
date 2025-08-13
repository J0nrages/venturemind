import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Edit3, Clock, User } from 'lucide-react';
import { DocumentPresence } from '../services/WebSocketService';

interface PresenceIndicatorProps {
  presence: DocumentPresence[];
  className?: string;
  maxVisible?: number;
  showDetails?: boolean;
}

const userColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-yellow-500'
];

const statusIcons = {
  viewing: Eye,
  editing: Edit3,
  idle: Clock
};

const statusColors = {
  viewing: 'bg-blue-500',
  editing: 'bg-green-500',
  idle: 'bg-gray-400'
};

export default function PresenceIndicator({ 
  presence, 
  className = '', 
  maxVisible = 5,
  showDetails = false 
}: PresenceIndicatorProps) {
  const getUserColor = (userId: string): string => {
    const index = userId.charCodeAt(0) % userColors.length;
    return userColors[index];
  };

  const visibleUsers = presence.slice(0, maxVisible);
  const hiddenCount = Math.max(0, presence.length - maxVisible);

  if (presence.length === 0) {
    return (
      <div className={`flex items-center gap-2 text-muted-foreground text-sm ${className}`}>
        <User className="w-4 h-4" />
        <span>No active collaborators</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* User Avatars */}
      <div className="flex items-center gap-1">
        <AnimatePresence>
          {visibleUsers.map((user) => {
            const StatusIcon = statusIcons[user.status];
            
            return (
              <motion.div
                key={`${user.user_id}-${user.session_id}`}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="relative"
                title={`${user.user_info.name || user.user_info.email} - ${user.status}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium ${getUserColor(user.user_id)}`}>
                  {user.user_info.name?.[0] || user.user_info.email?.[0] || '?'}
                </div>
                
                {/* Status Indicator */}
                <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center ${statusColors[user.status]}`}>
                  <StatusIcon className="w-1.5 h-1.5 text-white" />
                </div>
                
                {/* Typing Animation */}
                {user.status === 'editing' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"
                  />
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {/* Hidden Users Count */}
        {hiddenCount > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600 font-medium"
            title={`${hiddenCount} more collaborator(s)`}
          >
            +{hiddenCount}
          </motion.div>
        )}
      </div>

      {/* Detailed Status */}
      {showDetails && (
        <div className="text-sm text-muted-foreground">
          <span>{presence.length} active</span>
          {presence.some(u => u.status === 'editing') && (
            <span className="ml-2 text-green-600">
              • {presence.filter(u => u.status === 'editing').length} editing
            </span>
          )}
        </div>
      )}

      {/* Status Summary */}
      {!showDetails && presence.length > 0 && (
        <div className="text-xs text-muted-foreground">
          {presence.length} active
        </div>
      )}
    </div>
  );
}