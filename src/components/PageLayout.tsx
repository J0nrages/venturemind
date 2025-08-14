import React from 'react';
import { useChat } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export function PageLayout({ title, subtitle, headerActions, children }: PageLayoutProps) {
  const { position: chatPosition } = useChat();
  const navPosition = chatPosition === 'right' ? 'left' : 'right';

  return (
    <div className="min-h-screen bg-background">
      {/* Header that aligns with menu toggle */}
      <div className="h-14 flex items-center px-6 border-b border-border/10 sticky top-0 z-50 bg-background/95 backdrop-blur-xl shadow-sm">
        {/* Reserve space for menu toggle on left side only */}
        {navPosition === 'left' && <div className="w-11 flex-shrink-0"></div>}
        
        <div className="flex items-center justify-between w-full">
          <div className="flex-1">
            <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="text-muted-foreground text-sm lg:text-base mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 ml-4">
              {headerActions}
            </div>
          )}
        </div>
      </div>
      
      {/* Main content with proper padding */}
      <div className="px-6 py-6 space-y-6">
        {children}
      </div>
    </div>
  );
}