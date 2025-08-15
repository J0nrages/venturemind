# Syna Architecture Documentation

## Documentation Index

This document serves as the primary architecture reference. All other documentation files are listed here:

### Core Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - This document - Complete system architecture (CRITICAL - READ FIRST)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Deployment strategies for self-hosted and cloud environments
- **[../CLAUDE.md](../CLAUDE.md)** - Claude Code guidance and quick reference
- **[../README.md](../README.md)** - Project overview and getting started

### Implementation & Reports
- **[SYNA_UNIFIED_IMPLEMENTATION_PLAN.md](./SYNA_UNIFIED_IMPLEMENTATION_PLAN.md)** - Unified implementation roadmap
- **[SYNA_UI_ALIGNMENT_REPORT.md](./SYNA_UI_ALIGNMENT_REPORT.md)** - UI alignment and design system report
- **[SYNA_UI_TRANSFORMATION_REPORT.md](./SYNA_UI_TRANSFORMATION_REPORT.md)** - UI transformation progress report
- **[LLM_OBSERVABILITY_ANALYSIS.md](./LLM_OBSERVABILITY_ANALYSIS.md)** - LLM observability and monitoring analysis

### Backend Documentation
- **[../backend/README.md](../backend/README.md)** - Backend-specific setup and configuration

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

## Project Structure Overview

```
syna/
├── src/                    # Frontend React/TypeScript application
├── backend/                # Python FastAPI backend with AI agents
├── supabase/              # Database, auth, and edge functions
├── public/                # Static assets and favicon
├── *.md                   # Documentation files
├── *.json                 # Configuration files
└── *.config.*             # Build and development configuration
```

## Frontend Architecture (`/src`)

### Complete Directory Structure

```
src/
├── App.tsx                           # Main application component
├── main.tsx                          # Application entry point
├── index.css                         # Global styles
├── vite-env.d.ts                     # Vite type definitions
├── types.ts                          # Global type definitions
├── components/                       # UI Components
│   ├── AgenticAIChatOrchestrator.tsx # AI agent coordination interface
│   ├── AgentRail.tsx                 # Visual agent status display
│   ├── AuthGuard.tsx                 # Route protection component
│   ├── BackButton.tsx                # Navigation back button
│   ├── BranchModal.tsx               # Conversation branching interface
│   ├── CollaborativeEditor.tsx       # Real-time document editor
│   ├── ContextCard.tsx               # Individual context/workspace card
│   ├── ContextMenu.tsx               # Context management menu
│   ├── ContextSwitcher.tsx           # Multi-context navigation interface
│   ├── ConversationalSetup.tsx       # AI-guided business setup
│   ├── ConversationSpine.tsx         # Core chat interface per context
│   ├── Dialog.tsx                    # Modal dialog component
│   ├── ErrorBoundary.tsx             # Error handling boundary
│   ├── MetricCard.tsx                # Reusable metric display
│   ├── ModernChatSidebar.tsx         # Floating chat sidebar with threading
│   ├── OnboardingCheck.tsx           # User onboarding validation
│   ├── PageHeader.tsx                # Standard page header
│   ├── PageLayout.tsx                # Standard page layout wrapper
│   ├── PageSurface.tsx               # Context surface for documents/data
│   ├── PresenceIndicator.tsx         # Real-time user presence
│   ├── ReplyModal.tsx                # Message reply interface
│   ├── Sidebar.tsx                   # Main navigation sidebar
│   ├── SimpleSidebar.tsx             # Simplified navigation
│   ├── Surface.tsx                   # Generic surface component
│   ├── SynaApp.tsx                   # Main SYNA interface wrapper
│   ├── ThemeToggle.tsx               # Theme switching component
│   ├── ThreadedChatMessage.tsx       # Individual chat message with threading
│   ├── ThreadSidebar.tsx             # Thread management sidebar
│   ├── proforma/                     # Financial modeling components
│   │   ├── ProformaAssumptions.tsx   # Financial assumption inputs
│   │   ├── ProformaFinancials.tsx    # Financial statement generation
│   │   ├── ProformaMetrics.tsx       # Key financial metrics display
│   │   └── ProformaScenarios.tsx     # Scenario planning interface
│   └── ui/                           # Shadcn/ui component library
│       ├── badge.tsx                 # Badge component
│       ├── button.tsx                # Button component
│       ├── card.tsx                  # Card layout component
│       ├── checkbox.tsx              # Checkbox input
│       ├── dialog.tsx                # Dialog/modal component
│       ├── dropdown-menu.tsx         # Dropdown menu component
│       ├── input.tsx                 # Text input component
│       ├── label.tsx                 # Form label component
│       ├── progress.tsx              # Progress bar component
│       ├── radio-group.tsx           # Radio button group
│       ├── select.tsx                # Select dropdown component
│       ├── separator.tsx             # Visual separator component
│       ├── sheet.tsx                 # Slide-out panel component
│       ├── sidebar.tsx               # Sidebar layout component
│       ├── skeleton.tsx              # Loading skeleton component
│       ├── tabs.tsx                  # Tab navigation component
│       ├── textarea.tsx              # Multi-line text input
│       └── tooltip.tsx               # Tooltip component
├── contexts/                         # React Context Providers
│   ├── ChatContext.tsx               # Global chat state management
│   ├── ContextProvider.tsx           # SYNA context/workspace management
│   ├── DialogContext.tsx             # Modal and dialog state
│   └── ThemeContext.tsx              # Theme and appearance settings
├── hooks/                            # Custom React Hooks
│   ├── useBusinessData.ts            # Business data fetching and caching
│   ├── useChatSidebar.ts             # Chat sidebar state management
│   ├── use-mobile.tsx                # Mobile responsiveness detection
│   ├── usePageTitle.ts               # Dynamic page title updates
│   ├── useScrollVisibility.ts        # Scroll-based UI behavior
│   ├── useSSEConnection.ts           # Server-sent events connection
│   ├── useStrategicData.ts           # Strategic planning data management
│   ├── useThreading.ts               # Conversation threading logic
│   ├── useWebSocketChat.ts           # WebSocket-based chat functionality
│   └── useWebSocket.ts               # Generic WebSocket connection
├── lib/                              # Utility Libraries
│   ├── api.ts                        # API client configuration
│   ├── proforma.ts                   # Financial modeling utilities
│   ├── supabase.ts                   # Supabase client configuration
│   ├── types.ts                      # Common type definitions
│   └── utils.ts                      # General utility functions
├── pages/                            # Route Components (Pages)
│   ├── AIProcessing.tsx              # AI processing status and management
│   ├── Auth.tsx                      # Authentication flow
│   ├── BusinessPlan.tsx              # Comprehensive business planning
│   ├── BusinessSetup.tsx             # Initial business configuration
│   ├── Company.tsx                   # Company profile and settings
│   ├── Customers.tsx                 # Customer relationship management
│   ├── Dashboard.tsx                 # Legacy dashboard (being phased out)
│   ├── DocumentMemory.tsx            # AI document management with chat
│   ├── Documents.tsx                 # Document library and management
│   ├── Integrations.tsx              # Third-party integrations
│   ├── Metrics.tsx                   # Detailed analytics and metrics
│   ├── ModernDashboard.tsx           # Main dashboard with real-time data
│   ├── Plans.tsx                     # Subscription and pricing plans
│   ├── ProformaPage.tsx              # Financial projections and modeling
│   ├── Revenue.tsx                   # Revenue tracking and forecasting
│   ├── Settings.tsx                  # Application configuration
│   ├── Strategy.tsx                  # Strategic planning with SWOT
│   └── SwotAnalysis.tsx              # Interactive SWOT analysis tool
├── services/                         # Business Logic Layer
│   ├── AgentOrchestrationService.ts  # High-level agent coordination
│   ├── AgentOrchestrator.ts          # Multi-agent task orchestration
│   ├── BusinessService.ts            # Business data operations
│   ├── CollaborativeDocumentService.ts # Real-time document collaboration
│   ├── ConversationService.ts        # Chat and messaging operations
│   ├── DocumentService.ts            # Document CRUD operations
│   ├── GeminiService.ts              # Google Gemini AI integration
│   ├── IntegrationService.ts         # Third-party API integrations
│   ├── MetricsService.ts             # Analytics and performance tracking
│   ├── OrchestrationService.ts       # Workflow management and execution
│   ├── ProformaService.ts            # Financial modeling and projections
│   ├── SSEService.ts                 # Server-sent events for real-time updates
│   ├── StrategicService.ts           # Strategic planning and SWOT analysis
│   ├── UserSettingsService.ts        # User preferences and settings
│   └── WebSocketService.ts           # WebSocket connection management
├── types/                            # Type Definitions
│   ├── context.ts                    # SYNA context and workspace types
│   └── page-mapping.ts               # Page routing type definitions
└── utils/                            # Utility Functions
    └── jsonParser.ts                 # JSON parsing utilities
```

## Backend Architecture (`/backend`)

### Complete Directory Structure

```
backend/
├── main.py                           # Application entry point
├── pyproject.toml                    # Python project configuration
├── uv.lock                           # Dependency lock file
├── docker-compose.yml                # Docker services configuration
├── Makefile                          # Build and deployment scripts
├── README.md                         # Backend documentation
├── app/                              # Main application package
│   ├── __init__.py                   # Package initialization
│   ├── main.py                       # FastAPI application factory
│   ├── config.py                     # Application configuration
│   ├── agents/                       # AI Agent System
│   │   ├── __init__.py               # Agent package initialization
│   │   ├── marketplace.py            # Agent marketplace functionality
│   │   ├── definitions/              # Agent Configuration Files
│   │   │   ├── analyst.yaml          # Data analyst agent configuration
│   │   │   ├── critic.yaml           # Quality assurance agent config
│   │   │   ├── engineer.yaml         # Software engineer agent config
│   │   │   ├── ops.yaml              # Operations agent configuration
│   │   │   ├── planner.yaml          # Task planning agent config
│   │   │   ├── researcher.yaml       # Research agent configuration
│   │   │   ├── scheduler.yaml        # Scheduling agent configuration
│   │   │   └── writer.yaml           # Content writing agent config
│   │   ├── engine/                   # Agent Implementation
│   │   │   ├── analyst.py            # Data analysis and insights agent
│   │   │   ├── base.py               # Abstract base agent class
│   │   │   ├── critic.py             # Code/content review agent
│   │   │   ├── engineer.py           # Software development agent
│   │   │   ├── ops.py                # System operations agent
│   │   │   ├── planner.py            # Task decomposition agent
│   │   │   ├── registry.py           # Agent discovery and management
│   │   │   ├── researcher.py         # Information gathering agent
│   │   │   ├── scheduler.py          # Time management agent
│   │   │   └── writer.py             # Content creation agent
│   │   ├── prompts/                  # Agent Prompt Templates
│   │   └── tools/                    # Agent Tools
│   │       └── base_tools.py         # Common tools for agents
│   ├── api/                          # REST API Layer
│   │   ├── __init__.py               # API package initialization
│   │   ├── events.py                 # Server-sent events endpoint
│   │   └── v1/                       # API Version 1
│   │       ├── __init__.py           # V1 API initialization
│   │       ├── agents.py             # Agent management endpoints
│   │       ├── auth.py               # Authentication endpoints
│   │       ├── conversations.py      # Chat/conversation endpoints
│   │       ├── marketplace.py        # Agent marketplace API
│   │       ├── tasks.py              # Task management endpoints
│   │       ├── threading.py          # Conversation threading API
│   │       └── websocket.py          # WebSocket connection handling
│   ├── core/                         # Core Infrastructure
│   │   ├── __init__.py               # Core package initialization
│   │   ├── atomic_operations.py      # Database transaction management
│   │   ├── auth.py                   # Authentication and authorization
│   │   ├── middleware.py             # Request/response processing
│   │   ├── redis_manager.py          # Caching and session management
│   │   └── websocket_manager.py      # Multi-agent coordination, real-time
│   ├── db/                           # Database Layer
│   │   ├── migrations/               # Database migration scripts
│   │   └── repositories/             # Data access layer
│   ├── integrations/                 # External Integration Layer
│   ├── models/                       # Data Models
│   │   └── __init__.py               # Models package initialization
│   ├── orchestration/                # Workflow Orchestration
│   │   ├── graphs/                   # LangGraph workflow definitions
│   │   └── supervisor.py             # High-level workflow coordination
│   ├── services/                     # Business Services
│   │   ├── __init__.py               # Services package initialization
│   │   ├── gemini_service.py         # Google Gemini AI integration
│   │   └── thread_summarization.py   # Conversation summarization
│   └── utils/                        # Utility Functions
├── scripts/                          # Deployment and Build Scripts
└── tests/                            # Test Suites
    ├── e2e/                          # End-to-end tests
    ├── integration/                  # Integration tests
    └── unit/                         # Unit tests
```

## Supabase Integration (`/supabase`)

### Directory Structure

```
supabase/
├── config.toml                       # Supabase configuration
├── functions/                        # Edge Functions
│   ├── events/                       # Server-Sent Events
│   │   └── index.ts                  # SSE endpoint implementation
│   └── websocket/                    # WebSocket Connections
│       └── index.ts                  # WebSocket handling
└── migrations/                       # Database Migrations
    ├── 20250316052725_red_island.sql # Initial schema setup
    ├── 20250316061433_winter_sun.sql # User management
    ├── 20250316061609_peaceful_brook.sql # Business data tables
    ├── 20250316062046_muddy_sea.sql   # Document management
    ├── 20250316063226_fading_cake.sql # Strategic planning
    ├── 20250316063356_green_snowflake.sql # Financial modeling
    ├── 20250316063700_damp_disk.sql   # Integration settings
    ├── 20250316065046_cold_water.sql  # User preferences
    ├── 20250316065114_precious_spark.sql # Metrics tracking
    ├── 20250317040211_maroon_grove.sql # Advanced features
    ├── 20250317044415_summer_rice.sql # Performance optimizations
    ├── 20250630035949_bronze_violet.sql # Extended functionality
    ├── 20250630041232_shy_fountain.sql # Security enhancements
    ├── 20250630141831_dawn_haze.sql   # Real-time features
    ├── 20250630161515_tight_spark.sql # Agent integration
    ├── 20250718031004_light_term.sql  # Workflow management
    ├── 20250810150541_azure_bread.sql # Advanced AI features
    ├── 20250810153232_super_tree.sql  # Multi-agent support
    ├── 20250813000001_enhanced_chat_threading.sql # Chat threading
    └── 20250814000001_add_user_context_preferences.sql # Context prefs
```

## Key Component Relationships and Terminology

### SYNA Interface Architecture

```
                    Syna Application
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Traditional  │ │SYNA Context │ │Floating     │
│Dashboard    │ │Interface    │ │Chat         │
│(/pages/*)   │ │(SynaApp)    │ │(Sidebar)    │
└─────────────┘ └─────────────┘ └─────────────┘
        │                │                │
        ▼                ▼                ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│DocumentMemory│ │ContextCard  │ │ModernChat   │
│ModernDashboard│ │ConversationSpine│ │Sidebar    │
│BusinessPlan  │ │AgentRail    │ │ThreadedChat │
└─────────────┘ └─────────────┘ └─────────────┘
```

The application has **two main UI paradigms**:

#### 1. **Traditional Business Dashboard** (`/pages/*`)
- **DocumentMemory.tsx** - AI-powered document management with integrated chat
- **ModernDashboard.tsx** - Primary business intelligence dashboard
- **BusinessPlan.tsx**, **Strategy.tsx**, etc. - Specialized business modules
- **ModernChatSidebar.tsx** - Floating chat interface that appears across pages

#### 2. **SYNA Context Interface** (`SynaApp.tsx`)
- **ContextSwitcher.tsx** - Multi-context navigation (card-based interface)
- **ContextCard.tsx** - Individual workspace/conversation containers
- **ConversationSpine.tsx** - Chat interface within each context
- **AgentRail.tsx** - Visual agent status and management
- **Surface.tsx**/**PageSurface.tsx** - Live document/data surfaces

### Chat and Conversation Architecture

```
                    Chat System Architecture
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │DocumentMemory│ │SYNA Context │ │Floating     │
    │   Chat      │ │   Chat      │ │  Sidebar    │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ThreadedChat │ │Conversation │ │ModernChat   │
    │Message      │ │Spine        │ │Sidebar      │
    └─────────────┘ └─────────────┘ └─────────────┘
           │               │               │
           └───────────────┼───────────────┘
                           ▼
                   ┌─────────────┐
                   │Threading    │
                   │Logic        │
                   │(useThreading)│
                   └─────────────┘
```

```
ThreadedChatMessage Features:
┌─────────────────────────────────────────┐
│ Individual Message Component            │
├─────────────────────────────────────────┤
│ • Archive/Restore ←→ Database           │
│ • Reply Threading ←→ Parent Messages    │
│ • Branch Creation ←→ New Conversations  │
│ • Retry Failed   ←→ ConversationService │
│ • Text Selection ←→ Branch/Quote Menus  │
└─────────────────────────────────────────┘
```

The system supports **multiple conversation patterns**:

1. **ThreadedChatMessage.tsx** - Individual message component with:
   - Archive/restore functionality
   - Reply/branch threading
   - Retry functionality for failed messages
   - Text selection for conversation branching

2. **ConversationSpine.tsx** - Main chat interface within SYNA contexts
3. **ModernChatSidebar.tsx** - Floating chat accessible across traditional pages
4. **Chat Threading Logic** (useThreading.ts) - Manages conversation branching

### Agent System Integration

```
                    Multi-Agent Architecture
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│Frontend     │     │Backend      │     │Real-time    │
│Orchestration│◄───►│Agent Engine │◄───►│Communication│
└─────────────┘     └─────────────┘     └─────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│AgentOrch-   │     │Specialized  │     │WebSocket/   │
│estrator.ts  │     │Agents:      │     │SSE Events   │
│             │     │• Planner    │     │             │
│AgenticAI    │     │• Writer     │     │Event        │
│ChatOrch-    │     │• Engineer   │     │Streaming    │
│estrator.tsx │     │• Analyst    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
```

```
Agent Workflow:
User Request → Planner Agent → Task Decomposition → Multi-Agent Execution → Coordinated Response
      │              │                │                      │                    │
      ▼              ▼                ▼                      ▼                    ▼
┌──────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ ┌──────────────┐
│Frontend  │ │Task Planning │ │Agent         │ │Parallel Execution: │ │Response      │
│Chat UI   │ │& Analysis    │ │Assignment    │ │• Writer creates    │ │Coordination  │
│          │ │              │ │              │ │• Engineer codes    │ │& Delivery    │
│          │ │              │ │              │ │• Analyst reviews   │ │              │
└──────────┘ └──────────────┘ └──────────────┘ └────────────────────┘ └──────────────┘
```

Components:
- **AgentOrchestrator.ts** - Frontend orchestration service
- **AgenticAIChatOrchestrator.tsx** - UI for agent coordination
- **Backend Agent Engine** - Specialized AI agents (planner, writer, engineer, etc.)
- **WebSocket/SSE** - Real-time communication between frontend and agents

### Document and Context Management

- **DocumentService.ts** - Document CRUD operations
- **CollaborativeDocumentService.ts** - Real-time collaborative editing
- **ContextProvider.tsx** - Manages SYNA workspaces/contexts
- **UserSettingsService.ts** - User preferences and context settings

## Architecture Patterns

### 1. Service-Oriented Architecture
- Clear separation between UI components and business logic
- Services handle complex operations and API communication
- Custom hooks provide clean React integration

### 2. Multi-Agent AI System
- Specialized agents for different domains (planning, writing, analysis, etc.)
- Event-driven communication via WebSocket/SSE
- Task decomposition with dependency management

### 3. Real-time Communication
- WebSocket connections for instant updates and agent communication
- Server-sent events for streaming AI responses
- Collaborative editing with conflict resolution

### 4. Context-Aware Design
- SYNA contexts represent distinct workspaces/conversations
- Each context can have multiple agents and documents
- Context switching provides instant workspace changes

### 5. Threading and Conversation Management
- Conversation branching from text selection
- Reply threading for complex discussions
- Archive/restore functionality for message management
- Retry capability for failed AI interactions

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn/ui components
- **Animations**: Framer Motion
- **Charts**: Tremor React
- **State Management**: React Context + Custom Hooks
- **Real-time**: WebSocket + Server-Sent Events

### Backend
- **Framework**: FastAPI (Python)
- **AI/ML**: LangChain + LangGraph for agent orchestration
- **Database**: PostgreSQL via Supabase
- **Caching**: Redis
- **Real-time**: WebSocket + SSE
- **Authentication**: Supabase Auth (JWT)

### Infrastructure
- **Database & Auth**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Deployment**: Docker containers
- **Development**: Local Supabase + FastAPI + Vite

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

## Current Threading/Context Issues

### Problem Diagram
```
                    Current Issue: Multiple Auto-Created Contexts
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │Context 1    │     │Context 2    │     │Context 3    │
            │(Auto-loaded)│     │(Auto-loaded)│     │(Auto-loaded)│
            └─────────────┘     └─────────────┘     └─────────────┘
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │Conversation │     │Conversation │     │Conversation │
            │Spine #1     │     │Spine #2     │     │Spine #3     │
            └─────────────┘     └─────────────┘     └─────────────┘
```

### Expected Behavior Diagram
```
                    Expected: Single Default Context + Explicit Creation
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │Single       │     │Text         │     │Agent        │
            │Default      │     │Selection    │     │Workstream   │
            │Context      │     │→ Branch     │     │→ New Context│
            └─────────────┘     └─────────────┘     └─────────────┘
                    │                   │                   │
                    ▼                   ▼                   ▼
            ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
            │Main         │     │Branched     │     │Agent        │
            │Conversation │     │Conversation │     │Conversation │
            └─────────────┘     └─────────────┘     └─────────────┘
```

**Issue Identified**: Multiple contexts are auto-loaded from the database, causing multiple conversation windows to appear in the SYNA interface. 

**Root Cause**: `ContextProvider.tsx` loads all saved user contexts on initialization, and each context renders its own `ConversationSpine` chat interface.

**Expected Behavior**: 
- New contexts/threads should only be created when:
  1. User explicitly selects text and creates a branch
  2. An AI agent spins up its own workstream
  3. User manually creates a new context

**Solution Areas**:
- Modify context loading logic to start with single default context
- Add explicit user controls for context/thread creation
- Review agent workstream creation to prevent auto-context generation

---

**Last Updated**: August 2025  
**Architecture Version**: 3.0  
**Status**: Production Ready with Active Development