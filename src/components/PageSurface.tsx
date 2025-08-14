import React, { useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Context } from '../types/context';
import { getPagesForContext, getPrimaryPagesForContext, PageMapping } from '../types/page-mapping';
import { 
  FileText, 
  Activity, 
  Loader2, 
  ChevronRight, 
  Grid3X3, 
  Maximize2, 
  Minimize2,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageSurfaceProps {
  context: Context;
  isVisible: boolean;
  className?: string;
}

export default function PageSurface({ context, isVisible, className }: PageSurfaceProps) {
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const contextPages = getPagesForContext(context.type);
  const primaryPages = getPrimaryPagesForContext(context.type);
  
  // Auto-select first primary page if none selected
  React.useEffect(() => {
    if (!selectedPageId && Object.keys(primaryPages).length > 0) {
      setSelectedPageId(Object.keys(primaryPages)[0]);
    }
  }, [selectedPageId, primaryPages]);

  const selectedPage = selectedPageId ? contextPages[selectedPageId] : null;
  const PageComponent = selectedPage?.component;

  const surfaceVariants = {
    hidden: {
      width: 0,
      opacity: 0,
      transition: { duration: 0.4, ease: 'easeInOut' }
    },
    visible: {
      width: isExpanded ? 'min(800px, 60vw)' : 'min(400px, 40vw)',
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

  const pageCategories = {
    primary: Object.entries(contextPages).filter(([_, page]) => page.category === 'primary'),
    secondary: Object.entries(contextPages).filter(([_, page]) => page.category === 'secondary'),
    utility: Object.entries(contextPages).filter(([_, page]) => page.category === 'utility'),
  };

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          variants={surfaceVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={cn(
            "bg-white border-l border-gray-200 overflow-hidden flex flex-col flex-shrink-0 shadow-lg",
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
            <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ 
                      backgroundColor: context.color.secondary,
                      color: context.color.primary 
                    }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {selectedPage?.title || 'Select Page'}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {selectedPage?.description || `${context.title} workspace`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isExpanded ? (
                      <Minimize2 className="h-3 w-3" />
                    ) : (
                      <Maximize2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Page Navigation */}
              <div className="space-y-2">
                {Object.entries(pageCategories).map(([category, pages]) => {
                  if (pages.length === 0) return null;
                  
                  return (
                    <div key={category}>
                      {category === 'primary' && (
                        <div className="grid grid-cols-1 gap-1">
                          {pages.map(([pageId, page]) => (
                            <button
                              key={pageId}
                              onClick={() => setSelectedPageId(pageId)}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg text-left transition-all text-sm",
                                selectedPageId === pageId
                                  ? "bg-white shadow-sm border border-gray-200"
                                  : "hover:bg-gray-100"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="font-medium truncate">{page.title}</span>
                              </div>
                              <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Secondary & Utility Pages (collapsed by default) */}
                {(pageCategories.secondary.length > 0 || pageCategories.utility.length > 0) && (
                  <details className="group">
                    <summary className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors">
                      <ChevronRight className="w-3 h-3 group-open:rotate-90 transition-transform" />
                      More Pages ({pageCategories.secondary.length + pageCategories.utility.length})
                    </summary>
                    <div className="mt-2 space-y-1 pl-4">
                      {[...pageCategories.secondary, ...pageCategories.utility].map(([pageId, page]) => (
                        <button
                          key={pageId}
                          onClick={() => setSelectedPageId(pageId)}
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded text-xs hover:bg-gray-100 transition-colors w-full text-left",
                            selectedPageId === pageId && "bg-gray-100"
                          )}
                        >
                          <div 
                            className={cn(
                              "w-1.5 h-1.5 rounded-full flex-shrink-0",
                              page.category === 'secondary' ? "bg-blue-500" : "bg-gray-400"
                            )} 
                          />
                          <span className="truncate">{page.title}</span>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>

            {/* Page Content */}
            <div className="flex-1 overflow-hidden">
              {PageComponent ? (
                <div className="h-full overflow-y-auto bg-gray-50">
                  <Suspense 
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        <div className="flex items-center gap-2 text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Loading {selectedPage?.title}...</span>
                        </div>
                      </div>
                    }
                  >
                    {/* Wrap page component to ensure proper styling */}
                    <div className="min-h-full">
                      {selectedPage?.requiresProps ? (
                        <PageComponent type="strengths" />
                      ) : (
                        <PageComponent />
                      )}
                    </div>
                  </Suspense>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Grid3X3 className="w-12 h-12 text-gray-400 mb-4" />
                  <h4 className="text-lg font-medium text-gray-600 mb-2">
                    No Page Selected
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Select a page from the navigation above to view its content
                  </p>
                  {Object.keys(primaryPages).length > 0 && (
                    <Button
                      onClick={() => setSelectedPageId(Object.keys(primaryPages)[0])}
                      variant="outline"
                      size="sm"
                    >
                      Open {Object.values(primaryPages)[0].title}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Context Badge */}
            <div className="p-3 border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center justify-between">
                <span 
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{
                    backgroundColor: context.color.secondary,
                    color: context.color.accent
                  }}
                >
                  {context.badge} • {Object.keys(contextPages).length} pages
                </span>
                <div className="flex items-center gap-2">
                  {selectedPageId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => {
                        // Could open page in traditional mode or new tab
                        console.log('Open in traditional mode:', selectedPageId);
                      }}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Full View
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}