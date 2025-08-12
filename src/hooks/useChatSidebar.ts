import { useState, useEffect } from 'react';

export function useChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'left' | 'right'>('right');

  // Load user preferences from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem('chatSidebarPosition');
    const savedOpen = localStorage.getItem('chatSidebarOpen');
    
    if (savedPosition === 'left' || savedPosition === 'right') {
      setPosition(savedPosition);
    }
    
    if (savedOpen === 'true') {
      setIsOpen(true);
    }
  }, []);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('chatSidebarPosition', position);
  }, [position]);

  useEffect(() => {
    localStorage.setItem('chatSidebarOpen', isOpen.toString());
  }, [isOpen]);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  const changePosition = (newPosition: 'left' | 'right') => {
    setPosition(newPosition);
  };

  return {
    isOpen,
    position,
    toggleSidebar,
    changePosition
  };
}