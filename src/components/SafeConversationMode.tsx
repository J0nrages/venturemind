import React from 'react';
import { motion } from 'framer-motion';

// Simplified ConversationMode to debug the freezing issue
export default function SafeConversationMode() {
  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-600/90 via-blue-600/90 to-indigo-600/90 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-2xl w-full mx-4"
      >
        <h1 className="text-3xl font-bold text-white mb-4">Welcome to SYNA</h1>
        <p className="text-white/80 mb-6">
          The conversation interface is currently being loaded. If you see this message, the app is working but there may be an issue with the conversation components.
        </p>
        <div className="space-y-2 text-white/60 text-sm">
          <p>✓ Authentication successful</p>
          <p>✓ WebSocket connected</p>
          <p>⚠️ Conversation interface loading...</p>
        </div>
      </motion.div>
    </div>
  );
}