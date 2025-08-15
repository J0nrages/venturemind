# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Architecture Documentation

**IMPORTANT**: Always read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) first when working on this project. It contains:
- Complete documentation index for all project docs
- Full system architecture details
- Directory structures for frontend and backend
- Component relationships and patterns
- Current issues and solutions

## Commands

### Development
- **Install dependencies**: `bun install`
- **Start development server**: `bun run dev`
- **Build for production**: `bun run build`
- **Run ESLint**: `bun run lint`
- **Preview production build**: `bun run preview`

## Architecture Overview

This is a React + TypeScript business intelligence dashboard application built with Vite and Supabase.

For detailed architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)

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

## MCP (Model Context Protocol) Servers

This project includes configuration for MCP servers to enhance AI assistance capabilities.

### Installed MCP Packages
- **@supabase/mcp-server-supabase@0.4.5** - Direct Supabase integration for database operations
- **@upstash/context7-mcp@1.0.14** - Up-to-date documentation fetching for libraries
- **@testsprite/testsprite-mcp@0.0.11** - Automated testing integration

### Configuration
MCP servers are configured in `.mcp.json` at the project root. This file is checked into version control for team sharing.

#### Required Environment Variables
For Supabase MCP:
- `SUPABASE_ACCESS_TOKEN` - Personal access token from Supabase dashboard
- Replace `YOUR_PROJECT_REF` in `.mcp.json` with your actual Supabase project ID

For TestSprite MCP:
- `API_KEY` - Your TestSprite API key

### Usage in Claude Code
- Run `/mcp` to check configured servers
- Context7: Add "use context7" to prompts for current documentation
- Supabase: Interact with database, auth, and storage directly
- TestSprite: Generate and run automated tests

### Troubleshooting
If `/mcp` shows no servers:
1. Ensure `.mcp.json` exists in project root
2. Check JSON syntax is valid
3. Try restarting Claude Code or reloading the project
4. Run `/doctor` for diagnostics