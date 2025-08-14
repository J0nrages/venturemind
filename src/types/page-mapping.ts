import { ContextType } from './context';

// Import all existing pages
import BusinessPlan from '../pages/BusinessPlan';
import Strategy from '../pages/Strategy';
import SwotAnalysis from '../pages/SwotAnalysis';
import Dashboard from '../pages/Dashboard';
import ModernDashboard from '../pages/ModernDashboard';
import Metrics from '../pages/Metrics';
import ProformaPage from '../pages/ProformaPage';
import Revenue from '../pages/Revenue';
import DocumentMemory from '../pages/DocumentMemory';
import Documents from '../pages/Documents';
import AIProcessing from '../pages/AIProcessing';
import Integrations from '../pages/Integrations';
import Settings from '../pages/Settings';
import Customers from '../pages/Customers';

export interface PageMapping {
  component: React.ComponentType<any>;
  title: string;
  description: string;
  category: 'primary' | 'secondary' | 'utility';
  requiresProps?: boolean;
}

export interface ContextPageMapping {
  [key: string]: PageMapping;
}

// Map existing pages to SYNA contexts
export const CONTEXT_PAGE_MAPPINGS: Record<ContextType, ContextPageMapping> = {
  engineering: {
    'technical-docs': {
      component: Documents,
      title: 'Technical Documentation',
      description: 'Code documentation and technical specifications',
      category: 'primary'
    },
    'ai-processing': {
      component: AIProcessing,
      title: 'AI Code Assistant',
      description: 'AI-powered code analysis and generation',
      category: 'primary'
    },
    'integrations': {
      component: Integrations,
      title: 'API Integrations',
      description: 'External service integrations and APIs',
      category: 'secondary'
    },
    'settings': {
      component: Settings,
      title: 'Development Settings',
      description: 'Configuration and development tools',
      category: 'utility'
    }
  },
  
  fundraising: {
    'business-plan': {
      component: BusinessPlan,
      title: 'Business Plan',
      description: 'Core business strategy and planning',
      category: 'primary'
    },
    'proforma': {
      component: ProformaPage,
      title: 'Financial Projections',
      description: 'Revenue models and financial forecasting',
      category: 'primary'
    },
    'metrics': {
      component: Metrics,
      title: 'Key Metrics',
      description: 'Business performance indicators',
      category: 'primary'
    },
    'revenue': {
      component: Revenue,
      title: 'Revenue Analysis',
      description: 'Revenue streams and growth analysis',
      category: 'secondary'
    },
    'customers': {
      component: Customers,
      title: 'Customer Insights',
      description: 'Customer data and market analysis',
      category: 'secondary'
    },
    'dashboard': {
      component: Dashboard,
      title: 'Executive Dashboard',
      description: 'High-level business overview',
      category: 'utility'
    }
  },
  
  product: {
    'strategy': {
      component: Strategy,
      title: 'Product Strategy',
      description: 'Product roadmap and strategic planning',
      category: 'primary'
    },
    'swot': {
      component: SwotAnalysis,
      title: 'SWOT Analysis',
      description: 'Strengths, weaknesses, opportunities, threats',
      category: 'primary',
      requiresProps: true
    },
    'modern-dashboard': {
      component: ModernDashboard,
      title: 'Product Analytics',
      description: 'Product performance and user analytics',
      category: 'secondary'
    },
    'document-memory': {
      component: DocumentMemory,
      title: 'Product Documentation',
      description: 'Product requirements and specifications',
      category: 'secondary'
    },
    'ai-processing': {
      component: AIProcessing,
      title: 'AI Product Insights',
      description: 'AI-powered product analysis',
      category: 'utility'
    }
  },
  
  operations: {
    'dashboard': {
      component: Dashboard,
      title: 'Operations Dashboard',
      description: 'Operational metrics and monitoring',
      category: 'primary'
    },
    'integrations': {
      component: Integrations,
      title: 'System Integrations',
      description: 'Operational tool integrations',
      category: 'primary'
    },
    'settings': {
      component: Settings,
      title: 'System Settings',
      description: 'Configuration and system management',
      category: 'secondary'
    }
  },
  
  marketing: {
    'customers': {
      component: Customers,
      title: 'Customer Research',
      description: 'Customer insights and market research',
      category: 'primary'
    },
    'metrics': {
      component: Metrics,
      title: 'Marketing Metrics',
      description: 'Marketing performance indicators',
      category: 'primary'
    },
    'documents': {
      component: Documents,
      title: 'Marketing Materials',
      description: 'Marketing content and campaigns',
      category: 'secondary'
    }
  }
};

// Helper function to get pages for a specific context
export function getPagesForContext(contextType: ContextType): ContextPageMapping {
  return CONTEXT_PAGE_MAPPINGS[contextType] || {};
}

// Helper function to get primary pages for a context
export function getPrimaryPagesForContext(contextType: ContextType): ContextPageMapping {
  const allPages = getPagesForContext(contextType);
  return Object.fromEntries(
    Object.entries(allPages).filter(([_, mapping]) => mapping.category === 'primary')
  );
}

// Helper function to get page component by context and page id
export function getPageComponent(contextType: ContextType, pageId: string): PageMapping | null {
  const contextPages = getPagesForContext(contextType);
  return contextPages[pageId] || null;
}