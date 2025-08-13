import React, { createContext, useContext, useState } from 'react';

interface ChatContextType {
  isOpen: boolean;
  position: 'left' | 'right';
  toggleChat: () => void;
  setPosition: (position: 'left' | 'right') => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'left' | 'right'>('right');

  const toggleChat = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <ChatContext.Provider value={{ isOpen, position, toggleChat, setPosition }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}