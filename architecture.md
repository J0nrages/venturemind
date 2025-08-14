# Syna Architecture Documentation

## Executive Summary

Syna is a sophisticated AI-powered business intelligence platform built with a modern, service-oriented architecture. The system features a React/TypeScript frontend with a Python FastAPI backend, centered around a multi-agent AI system for intelligent task orchestration and real-time collaboration.

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Supabase      │
│   (React/TS)    │◄──►│   (FastAPI)     │◄──►│   (DB/Auth)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Modern UI Layer │    │ Agent Engine    │    │ Edge Functions  │
│ Glass-morphism  │    │ LangChain/Graph │    │ WebSocket/SSE   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Frontend Architecture (`/src`)

### Core Structure
```
src/
├── pages/           # Route components
├── components/      # Reusable UI components
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── services/        # Business logic & API calls
├── lib/             # Utilities & configurations
└── utils/           # Helper functions
```

### Pages (`/src/pages`)
The application is organized around distinct business modules:

#### Authentication & Setup
- **`Auth.tsx`** - Authentication flow with Supabase integration
- **`BusinessSetup.tsx`** - Initial business configuration and onboarding

#### Business Intelligence Dashboard
- **`ModernDashboard.tsx`** - Main dashboard with real-time metrics and KPIs
- **`Dashboard.tsx`** - Legacy dashboard (being phased out)
- **`Metrics.tsx`** - Detailed analytics and performance metrics

#### Strategic Planning
- **`BusinessPlan.tsx`** - Comprehensive business planning interface
- **`Strategy.tsx`** - Strategic planning with SWOT analysis integration
- **`SwotAnalysis.tsx`** - Interactive SWOT analysis tool

#### Financial Management
- **`ProformaPage.tsx`** - Financial projections and modeling
- **`Revenue.tsx`** - Revenue tracking and forecasting
- **`Plans.tsx`** - Subscription and pricing plans

#### AI & Automation
- **`AIProcessing.tsx`** - AI processing status and management
- **`DocumentMemory.tsx`** - Collaborative document editing with AI chat

#### Data Management
- **`Documents.tsx`** - Document library and management
- **`Company.tsx`** - Company profile and settings
- **`Customers.tsx`** - Customer relationship management
- **`Integrations.tsx`** - Third-party integrations management
- **`Settings.tsx`** - Application configuration

### Components (`/src/components`)

#### Core UI Components
- **`ModernChatSidebar.tsx`** - Advanced chat interface with threading, branching, SSE
- **`PageLayout.tsx`** - Standard page wrapper with navigation
- **`Sidebar.tsx`** / **`SimpleSidebar.tsx`** - Navigation sidebars
- **`AuthGuard.tsx`** - Route protection component

#### Specialized Components  
- **`AgenticAIChatOrchestrator.tsx`** - AI agent coordination interface
- **`CollaborativeEditor.tsx`** - Real-time collaborative text editor
- **`ThreadedChatMessage.tsx`** - Threaded conversation component
- **`BranchModal.tsx`** - Conversation branching interface
- **`ReplyModal.tsx`** - Reply and response management

#### Business Logic Components
- **`ConversationalSetup.tsx`** - AI-guided business setup
- **`OnboardingCheck.tsx`** - User onboarding validation
- **`MetricCard.tsx`** - Reusable metric display component

#### UI Foundation (`/src/components/ui`)
Shadcn/ui component library implementation:
- Form controls: `input.tsx`, `button.tsx`, `select.tsx`, `textarea.tsx`
- Layout: `card.tsx`, `sheet.tsx`, `separator.tsx`, `tabs.tsx`
- Feedback: `badge.tsx`, `progress.tsx`, `skeleton.tsx`, `tooltip.tsx`
- Interaction: `dialog.tsx`, `dropdown-menu.tsx`

#### Specialized Modules (`/src/components/proforma`)
Financial modeling components:
- **`ProformaAssumptions.tsx`** - Financial assumption inputs
- **`ProformaFinancials.tsx`** - Financial statement generation
- **`ProformaMetrics.tsx`** - Key financial metrics display
- **`ProformaScenarios.tsx`** - Scenario planning interface

### Services Layer (`/src/services`)
Business logic abstracted into service classes:

#### Core Services
- **`BusinessService.ts`** - Business data operations and validation
- **`StrategicService.ts`** - Strategic planning and SWOT analysis
- **`ProformaService.ts`** - Financial modeling and projections
- **`MetricsService.ts`** - Analytics and performance tracking

#### AI & Orchestration
- **`AgentOrchestrator.ts`** - Multi-agent task coordination
- **`OrchestrationService.ts`** - Workflow management and execution
- **`GeminiService.ts`** - Google Gemini AI integration

#### Real-time Communication
- **`WebSocketService.ts`** - WebSocket connection management
- **`SSEService.ts`** - Server-sent events for real-time updates
- **`ConversationService.ts`** - Chat and messaging operations

#### Document & Integration
- **`DocumentService.ts`** - Document CRUD operations
- **`CollaborativeDocumentService.ts`** - Real-time document collaboration
- **`IntegrationService.ts`** - Third-party API integrations

### Custom Hooks (`/src/hooks`)
React hooks for state management and side effects:

#### Business Logic Hooks
- **`useBusinessData.ts`** - Business data fetching and caching
- **`useStrategicData.ts`** - Strategic planning data management

#### Real-time Communication
- **`useWebSocket.ts`** - WebSocket connection hook
- **`useWebSocketChat.ts`** - WebSocket-based chat functionality
- **`useSSEConnection.ts`** - Server-sent events connection

#### UI State Management
- **`useChatSidebar.ts`** - Chat sidebar state and interactions
- **`useThreading.ts`** - Conversation threading logic
- **`useScrollVisibility.ts`** - Scroll-based UI behavior
- **`usePageTitle.ts`** - Dynamic page title updates
- **`use-mobile.tsx`** - Mobile responsiveness detection

### Context Providers (`/src/contexts`)
- **`ChatContext.tsx`** - Global chat state management
- **`DialogContext.tsx`** - Modal and dialog management
- **`ThemeContext.tsx`** - Theme and appearance settings

## Backend Architecture (`/backend`)

### Core Structure
```
backend/
├── app/
│   ├── agents/          # AI agent system
│   ├── api/             # REST API endpoints
│   ├── core/            # Core infrastructure
│   ├── db/              # Database layer
│   ├── services/        # Business services
│   ├── models/          # Data models
│   ├── orchestration/   # Workflow orchestration
│   ├── integrations/    # External integrations
│   └── utils/           # Utility functions
├── tests/               # Test suites
└── scripts/             # Deployment scripts
```

### Agent System (`/backend/app/agents`)

#### Agent Engine (`/backend/app/agents/engine`)
Production-ready LangChain/LangGraph implementation:

- **`base.py`** - Abstract base agent with events, status, capabilities
- **`planner.py`** - Task decomposition with dependency graphs  
- **`writer.py`** - Content creation with multiple styles
- **`engineer.py`** - Code development and technical implementation
- **`researcher.py`** - Information gathering and analysis
- **`analyst.py`** - Data analysis and insights generation
- **`ops.py`** - System operations and deployments
- **`scheduler.py`** - Time management and task scheduling
- **`critic.py`** - Review and quality assurance
- **`registry.py`** - Agent discovery and orchestration

#### Agent Definitions (`/backend/app/agents/definitions`)
YAML configuration for each agent:
- Agent capabilities, tools, and behavioral parameters
- Prompt templates and instruction sets

#### Agent Tools (`/backend/app/agents/tools`)
- **`base_tools.py`** - Common tools available to agents

### API Layer (`/backend/app/api`)

#### Core API (`/backend/app/api/v1`)
- **`agents.py`** - Agent management endpoints
- **`conversations.py`** - Conversation CRUD operations
- **`threading.py`** - Conversation threading API
- **`tasks.py`** - Task management endpoints
- **`websocket.py`** - WebSocket connection handling
- **`auth.py`** - Authentication endpoints
- **`marketplace.py`** - Agent marketplace functionality

#### Event Streaming (`/backend/app/api`)
- **`events.py`** - Server-sent events implementation

### Core Infrastructure (`/backend/app/core`)
- **`websocket_manager.py`** - Multi-agent coordination, document locks, real-time presence
- **`redis_manager.py`** - Caching and session management
- **`auth.py`** - Authentication and authorization
- **`middleware.py`** - Request/response processing
- **`atomic_operations.py`** - Database transaction management

### Orchestration Layer (`/backend/app/orchestration`)
- **`supervisor.py`** - High-level workflow coordination
- **`graphs/`** - LangGraph workflow definitions

### Services (`/backend/app/services`)
- **`gemini_service.py`** - Google Gemini AI integration
- **`thread_summarization.py`** - Conversation summarization

### Database Layer (`/backend/app/db`)
- **`repositories/`** - Data access layer
- **`migrations/`** - Database schema evolution

## Supabase Integration (`/supabase`)

### Database
- PostgreSQL with Row Level Security (RLS)
- Migrations in `/supabase/migrations/`
- Real-time subscriptions for live updates

### Edge Functions (`/supabase/functions`)
- **`events/index.ts`** - Server-sent events endpoint
- **`websocket/index.ts`** - WebSocket connections

### Authentication
- Supabase Auth integration
- JWT-based session management
- Social login providers

## Key Architectural Patterns

### 1. Service-Oriented Architecture
- Clear separation of concerns between UI, business logic, and data access
- Services handle complex business operations
- Custom hooks provide clean React integration

### 2. Multi-Agent AI System
- Specialized agents for different domains (planning, writing, engineering, etc.)
- Event-driven communication between agents
- Task decomposition with dependency management

### 3. Real-time Communication
- WebSocket connections for instant updates
- Server-sent events for streaming responses
- Collaborative editing with conflict resolution

### 4. Context-Aware UI
- React Context for global state management
- Custom hooks for complex state logic
- Component composition for reusability

### 5. Glass-morphism Design System
- Modern UI with backdrop-blur effects
- Framer Motion for smooth animations
- Responsive design with Tailwind CSS

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn/ui
- **Animations**: Framer Motion  
- **Charts**: Tremor React
- **State**: React Context + Custom Hooks

### Backend
- **Framework**: FastAPI (Python)
- **AI/ML**: LangChain + LangGraph
- **Database**: PostgreSQL (Supabase)
- **Caching**: Redis
- **Real-time**: WebSocket + SSE

### Infrastructure
- **Database**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Deployment**: Docker containers
- **Environment**: Development/staging/production separation

## Real-time Architecture

### WebSocket Flow
```
Frontend ◄──► WebSocketService ◄──► Backend WebSocketManager ◄──► Agent Engine
    │                                          │
    └────► SSEService ◄──────────────────────┘
```

### Agent Communication
```
User Request → Planner Agent → Task Decomposition → Multi-Agent Execution → Coordinated Response
```

## Security & Performance

### Security
- JWT authentication with Supabase
- Row Level Security (RLS) on database
- CORS configuration for API access
- Input validation and sanitization

### Performance
- Component lazy loading
- Service worker caching
- Database query optimization
- Real-time connection pooling

## Development Workflow

### Environment Setup
```bash
# Frontend
bun install
bun run dev

# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Database
supabase start
supabase db reset
```

### Testing Strategy
- **Unit Tests**: `/backend/tests/unit`
- **Integration Tests**: `/backend/tests/integration`
- **E2E Tests**: `/backend/tests/e2e`

## Future Architecture Considerations

### SYNA Vision Alignment
The current architecture is 90% ready for SYNA transformation:

1. **Context Switching**: 3D card interface for instant context changes
2. **Surface Protocol**: Live, editable artifacts within conversation
3. **Agent Rail**: Visual display of active agents
4. **Conversation Spine**: Chat as central OS interface

### Scalability
- Microservices decomposition for agent specialization
- Event sourcing for complex workflow tracking
- Horizontal scaling for agent execution
- CDN integration for static assets

---

**Last Updated**: January 2025  
**Architecture Version**: 2.0  
**Status**: Production Ready with SYNA Extensions Planned