import React from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-between w-full"
    >
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
      {children && (
        <div className="flex items-center gap-2 ml-4">
          {children}
        </div>
      )}
    </motion.div>
  );
}