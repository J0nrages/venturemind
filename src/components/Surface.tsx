import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Context, SurfaceConfig } from '../types/context';
import { FileText, Activity, Loader2 } from 'lucide-react';

interface SurfaceProps {
  type: 'document' | 'agent' | 'custom';
  context: Context;
  surface: SurfaceConfig;
  className?: string;
  children?: React.ReactNode;
}

export default function Surface({
  type,
  context,
  surface,
  className,
  children
}: SurfaceProps) {
  const [isLoading, setIsLoading] = useState(false);

  // Simulate agent manipulation of surfaces
  useEffect(() => {
    if (surface.agentManipulated) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [surface.agentManipulated]);

  const surfaceVariants = {
    hidden: {
      width: 0,
      opacity: 0,
      transition: { duration: 0.4, ease: 'easeInOut' }
    },
    visible: {
      width: type === 'document' ? 'min(400px, 40vw)' : 'min(200px, 20vw)',
      opacity: 1,
      transition: { duration: 0.4, ease: 'easeInOut' }
    }
  };

  const contentVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { delay: 0.2, duration: 0.3 }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {surface.visible && (
        <motion.div
          variants={surfaceVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={cn(
            "bg-gray-50 overflow-hidden flex flex-col flex-shrink-0",
            className
          )}
        >
          <motion.div
            variants={contentVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="h-full flex flex-col"
          >
            {/* Surface Header */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {surface.title}
                  </h3>
                  {surface.status && (
                    <div className="flex items-center gap-2 mt-1">
                      <Activity className="w-3 h-3 text-blue-500" />
                      <span className="text-sm text-blue-600 font-medium">
                        {surface.status}
                      </span>
                    </div>
                  )}
                </div>
                {isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
              </div>
            </div>

            {/* Surface Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {children || (
                <div className="space-y-4">
                  {surface.content?.sections?.map((section, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                    >
                      <h4 className="font-medium text-gray-900 mb-2">
                        {section.title}
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {section.content}
                      </p>
                      {section.metadata && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {section.metadata.map((meta, metaIndex) => (
                            <span
                              key={metaIndex}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                            >
                              {meta}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Default content for empty surfaces */}
                  {!surface.content?.sections?.length && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8">
                      <FileText className="w-12 h-12 text-gray-400 mb-4" />
                      <h4 className="text-lg font-medium text-gray-600 mb-2">
                        {type === 'document' ? 'No Document Active' : 'Surface Ready'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {type === 'document' 
                          ? 'Start a conversation to generate documents'
                          : 'This surface will show contextual information'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Agent Manipulation Indicator */}
            {surface.agentManipulated && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-3 bg-blue-50 border-t border-blue-200"
              >
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>Agent updating content...</span>
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}