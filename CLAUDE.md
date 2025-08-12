# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- **Install dependencies**: `bun install`
- **Start development server**: `bun run dev`
- **Build for production**: `bun run build`
- **Run ESLint**: `bun run lint`
- **Preview production build**: `bun run preview`

## Architecture Overview

This is a React + TypeScript business intelligence dashboard application built with Vite and Supabase.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, Tremor React components
- **State Management**: React Context API with custom hooks
- **Backend**: Supabase (PostgreSQL database + Edge Functions)
- **AI/ML**: LangChain, LangGraph, Gemini Service integration
- **Real-time**: WebSocket and Server-Sent Events (SSE) support

### Key Architectural Patterns

#### Service Layer Architecture
The application uses a service-oriented architecture with dedicated services for different concerns:
- **Business Logic**: `BusinessService.ts`, `StrategicService.ts`, `ProformaService.ts`
- **AI/ML Orchestration**: `AgentOrchestrator.ts`, `OrchestrationService.ts`, `GeminiService.ts`
- **Real-time Communication**: `WebSocketService.ts`, `SSEService.ts`
- **Document Management**: `DocumentService.ts`, `CollaborativeDocumentService.ts`
- **External Integrations**: `IntegrationService.ts`

#### Custom Hooks Pattern
Business logic is abstracted into custom hooks in `/src/hooks/`:
- `useBusinessData.ts` - Business data management
- `useStrategicData.ts` - Strategic planning data
- `useWebSocket.ts` - WebSocket connections
- `useSSEConnection.ts` - Server-sent events

#### Routing Structure
Main pages are organized under `/src/pages/`:
- Authentication flow through `Auth.tsx` with `AuthGuard` protection
- Business planning modules: `BusinessPlan`, `Strategy`, `SwotAnalysis`
- Financial modules: `ProformaPage`, `Metrics`, `Revenue`
- Collaboration: `Documents`, `DocumentMemory`
- AI/ML: `AIProcessing`

### Supabase Integration

#### Database
- Migrations in `/supabase/migrations/` define the database schema
- Client initialized in `/src/lib/supabase.ts` using environment variables

#### Edge Functions
Located in `/supabase/functions/`:
- `events/` - SSE event streaming
- `websocket/` - WebSocket connections

#### Environment Variables Required
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Component Organization
- Shared components in `/src/components/`
- Feature-specific components in subdirectories (e.g., `/src/components/proforma/`)
- Context providers in `/src/contexts/`