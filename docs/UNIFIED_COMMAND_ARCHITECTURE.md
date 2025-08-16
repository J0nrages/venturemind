# Syna Unified Command & Action Architecture

**Version:** 1.0  
**Status:** Implementation Guide  
**Stack:** React + FastAPI + Typesense + Supabase  
**Alignment:** README.md v3.0 + OMNIBOX_AND_MENTIONS.md v1.1

---

## Executive Summary

This document unifies Syna's command and action system architecture, combining:
- **Command execution pipeline** using CQRS pattern and event sourcing
- **FastAPI backend** with high-performance async processing
- **Typesense search** for instant, typo-tolerant command palette
- **Supabase** for real-time data sync and persistence
- **cmdk UI library** for keyboard-driven interfaces

The system enables users to invoke commands through natural language, prefixes (`@`, `/`, `#`, `>`), and keyboard shortcuts, with all actions tracked in the Ledger for complete observability.

---

## 1. System Architecture Overview

### 1.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ UnifiedInput │  │ Command Bar  │  │   Surfaces    │  │
│  │   (MainChat) │  │  (Cmd/Ctrl+K)│  │  (Documents)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            ▼                             │
│                    ┌──────────────┐                      │
│                    │     cmdk     │                      │
│                    │   Library    │                      │
│                    └──────┬───────┘                      │
└────────────────────────────┼────────────────────────────┘
                             │ WebSocket/HTTP
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    FastAPI Backend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Command    │  │   Command    │  │    Event     │  │
│  │   Parser     │──│   Executor   │──│    Store     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         ▼                  ▼                  ▼          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Typesense Search Engine             │   │
│  │  • Commands  • Mentions  • Workspaces  • Docs    │   │
│  └──────────────────────────────────────────────────┘   │
│                            │                             │
│                            ▼                             │
│  ┌──────────────────────────────────────────────────┐   │
│  │                Supabase Database                  │   │
│  │  • Command Registry  • Mention Entities          │   │
│  │  • Execution Logs   • Context Objects            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Core Design Patterns

#### CQRS (Command-Query Responsibility Segregation)
- **Commands**: User intents that modify state
- **Queries**: Optimized read models for UI
- **Event Sourcing**: Complete audit trail in Ledger

#### Event-Driven Architecture
- All actions produce events
- Events stored for undo/redo capability
- Real-time sync via WebSocket/SSE

---

## 2. Prefix Grammar & Command System

### 2.1 Unified Prefix Grammar (from OMNIBOX_AND_MENTIONS.md)

| Prefix | Purpose | Handler | Examples |
|--------|---------|---------|----------|
| `@` | Mention agents/users/surfaces | `MentionResolver` | `@Engineer`, `@maria`, `@"PRD.doc"` |
| `/` | Slash commands | `SlashCommandExecutor` | `/summarize`, `/create task` |
| `#` | Project/Workspace navigation | `WorkspaceSwitcher` | `#fundraising`, `#product` |
| `>` | Power commands (Raycast-style) | `PowerCommandExecutor` | `> open surface: revenue` |
| `//` | Global search | `SearchExecutor` | `// revenue projections` |
| `?` | Help system | `HelpProvider` | `? keyboard shortcuts` |
| `!` | Quick actions | `QuickActionExecutor` | `!approve`, `!assign @maria` |
| `^` | Document references | `DocumentResolver` | `^Q3 planning doc` |

### 2.2 Command Manifest Schema

```typescript
interface CommandManifest {
  // Identity
  id: string;           // UUID for stable reference
  name: string;         // Display name
  description: string;  // Help text
  
  // Classification
  category: 'agent' | 'action' | 'navigation' | 'search' | 'custom';
  visibility: 'private' | 'workspace' | 'public';
  
  // Triggers
  triggers: {
    prefix?: string;        // '/', '>', etc.
    keywords?: string[];    // Natural language triggers
    shortcuts?: string[];   // Keyboard shortcuts (e.g., 'cmd+shift+p')
    mention?: string;       // @mention trigger
  };
  
  // Parameters
  params: ParamDefinition[];
  
  // Execution
  handler: string;            // Handler function name
  permissions?: string[];     // Required permissions
  rateLimit?: RateLimitConfig;
  requiresConfirmation?: boolean;
  
  // UI
  icon?: string;
  color?: string;
  preview?: boolean;  // Show preview before execution
}

interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'entity' | 'file' | 'mention';
  required: boolean;
  description: string;
  default?: any;
  validator?: string;  // Validation function
  autocomplete?: string;  // Autocomplete provider
}
```

---

## 3. Database Schema (Supabase)

### 3.1 Core Tables

```sql
-- Command registry (source of truth for all commands)
CREATE TABLE commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT CHECK (category IN ('agent', 'action', 'navigation', 'search', 'custom')),
  visibility TEXT CHECK (visibility IN ('private', 'workspace', 'public')),
  prefix TEXT,
  keywords TEXT[],
  shortcuts TEXT[],
  params JSONB DEFAULT '[]',
  handler TEXT NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  rate_limit JSONB,
  requires_confirmation BOOLEAN DEFAULT false,
  icon TEXT,
  color TEXT,
  created_by UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mention entities (agents, users, surfaces, documents)
CREATE TABLE mention_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT CHECK (type IN ('agent', 'user', 'surface', 'document', 'workspace')),
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  metadata JSONB DEFAULT '{}',
  search_keywords TEXT[],
  capabilities TEXT[],
  status TEXT CHECK (status IN ('online', 'offline', 'busy', 'archived')),
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Command execution log (feeds into Ledger)
CREATE TABLE command_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id UUID REFERENCES commands(id),
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  input TEXT NOT NULL,
  parsed_params JSONB,
  result JSONB,
  status TEXT CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  execution_time_ms INTEGER,
  revertable BOOLEAN DEFAULT false,
  reverted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Context objects for versioned concept tracking
CREATE TABLE context_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,           -- e.g., "product-color"
  version INTEGER NOT NULL,
  value JSONB NOT NULL,
  previous_version_id UUID REFERENCES context_objects(id),
  workspace_id UUID REFERENCES workspaces(id),
  changed_by UUID REFERENCES auth.users(id),
  change_source TEXT,           -- 'command', 'direct_edit', 'agent'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ledger entries (universal activity stream)
CREATE TABLE ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_type TEXT CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id TEXT NOT NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  target_name TEXT,
  diff JSONB,
  metadata JSONB,
  revertable BOOLEAN DEFAULT false,
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  
  -- Link to command execution if applicable
  command_execution_id UUID REFERENCES command_executions(id)
);

-- User command preferences (frecency, custom shortcuts)
CREATE TABLE user_command_preferences (
  user_id UUID REFERENCES auth.users(id),
  command_id UUID REFERENCES commands(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  custom_shortcut TEXT,
  custom_params JSONB,
  pinned BOOLEAN DEFAULT false,
  PRIMARY KEY (user_id, command_id)
);
```

### 3.2 Real-time Sync Triggers

```sql
-- Install required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to sync changes to Typesense
CREATE OR REPLACE FUNCTION sync_to_typesense()
RETURNS TRIGGER AS $$
DECLARE
  record_json JSON;
  collection_name TEXT;
  typesense_url TEXT;
  typesense_key TEXT;
BEGIN
  -- Determine collection based on table
  CASE TG_TABLE_NAME
    WHEN 'commands' THEN collection_name := 'commands';
    WHEN 'mention_entities' THEN collection_name := 'mentions';
    ELSE RETURN NEW;
  END CASE;
  
  -- Get Typesense config from vault
  typesense_url := current_setting('app.typesense_url');
  typesense_key := current_setting('app.typesense_key');
  
  -- Prepare record with proper structure
  IF TG_TABLE_NAME = 'commands' THEN
    record_json := json_build_object(
      'id', NEW.id,
      'name', NEW.name,
      'description', COALESCE(NEW.description, ''),
      'category', NEW.category,
      'prefix', COALESCE(NEW.prefix, ''),
      'keywords', COALESCE(NEW.keywords, ARRAY[]::TEXT[]),
      'shortcuts', COALESCE(NEW.shortcuts, ARRAY[]::TEXT[]),
      'permissions', COALESCE(NEW.permissions, ARRAY[]::TEXT[]),
      'icon', NEW.icon,
      'color', NEW.color,
      'usage_count', 0
    );
  ELSIF TG_TABLE_NAME = 'mention_entities' THEN
    record_json := json_build_object(
      'id', NEW.id,
      'type', NEW.type,
      'display_name', NEW.display_name,
      'avatar_url', NEW.avatar_url,
      'search_keywords', COALESCE(NEW.search_keywords, ARRAY[]::TEXT[]),
      'capabilities', COALESCE(NEW.capabilities, ARRAY[]::TEXT[]),
      'status', COALESCE(NEW.status, 'offline')
    );
  END IF;
  
  -- Async HTTP request to Typesense
  PERFORM net.http_post(
    url := typesense_url || '/collections/' || collection_name || '/documents',
    headers := jsonb_build_object(
      'X-TYPESENSE-API-KEY', typesense_key,
      'Content-Type', 'application/json'
    ),
    body := record_json::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER sync_commands_to_typesense
  AFTER INSERT OR UPDATE ON commands
  FOR EACH ROW EXECUTE FUNCTION sync_to_typesense();

CREATE TRIGGER sync_mentions_to_typesense
  AFTER INSERT OR UPDATE ON mention_entities
  FOR EACH ROW EXECUTE FUNCTION sync_to_typesense();

-- Function to log to ledger
CREATE OR REPLACE FUNCTION log_to_ledger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ledger_entries (
    actor_type,
    actor_id,
    action,
    target_type,
    target_id,
    diff,
    workspace_id,
    command_execution_id
  ) VALUES (
    'system',
    'database_trigger',
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)),
    NEW.workspace_id,
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Typesense Configuration

### 4.1 Collection Schemas

```python
# backend/app/services/typesense_service.py
import typesense
from typing import Dict, Any, List
from fastapi import Depends
from ..config import settings

class TypesenseService:
    def __init__(self):
        self.client = typesense.Client({
            'api_key': settings.TYPESENSE_API_KEY,
            'nodes': [{
                'host': settings.TYPESENSE_HOST,
                'port': settings.TYPESENSE_PORT,
                'protocol': 'http'
            }],
            'connection_timeout_seconds': 2
        })
    
    def create_collections(self):
        """Initialize all Typesense collections"""
        
        # Commands collection
        commands_schema = {
            'name': 'commands',
            'fields': [
                {'name': 'id', 'type': 'string'},
                {'name': 'name', 'type': 'string', 'facet': False},
                {'name': 'description', 'type': 'string', 'facet': False},
                {'name': 'category', 'type': 'string', 'facet': True},
                {'name': 'prefix', 'type': 'string', 'facet': True},
                {'name': 'keywords', 'type': 'string[]', 'facet': False},
                {'name': 'shortcuts', 'type': 'string[]', 'facet': False},
                {'name': 'permissions', 'type': 'string[]', 'facet': True},
                {'name': 'icon', 'type': 'string', 'optional': True},
                {'name': 'color', 'type': 'string', 'optional': True},
                {'name': 'usage_count', 'type': 'int32', 'facet': True},
                {'name': 'last_used', 'type': 'int64', 'facet': False, 'optional': True}
            ],
            'default_sorting_field': 'usage_count',
            'default_sorting_order': 'desc'
        }
        
        # Mentions collection (agents, users, surfaces)
        mentions_schema = {
            'name': 'mentions',
            'fields': [
                {'name': 'id', 'type': 'string'},
                {'name': 'type', 'type': 'string', 'facet': True},
                {'name': 'display_name', 'type': 'string', 'facet': False},
                {'name': 'avatar_url', 'type': 'string', 'optional': True},
                {'name': 'search_keywords', 'type': 'string[]', 'facet': False},
                {'name': 'capabilities', 'type': 'string[]', 'facet': True, 'optional': True},
                {'name': 'status', 'type': 'string', 'facet': True, 'optional': True},
                {'name': 'relevance_score', 'type': 'float', 'facet': False, 'optional': True}
            ]
        }
        
        # Workspaces collection
        workspaces_schema = {
            'name': 'workspaces',
            'fields': [
                {'name': 'id', 'type': 'string'},
                {'name': 'name', 'type': 'string', 'facet': False},
                {'name': 'project_id', 'type': 'string', 'facet': True},
                {'name': 'description', 'type': 'string', 'facet': False, 'optional': True},
                {'name': 'tags', 'type': 'string[]', 'facet': True, 'optional': True},
                {'name': 'last_accessed', 'type': 'int64', 'facet': False},
                {'name': 'created_at', 'type': 'int64', 'facet': False}
            ]
        }
        
        # Context objects collection
        context_objects_schema = {
            'name': 'context_objects',
            'fields': [
                {'name': 'id', 'type': 'string'},
                {'name': 'key', 'type': 'string', 'facet': True},
                {'name': 'version', 'type': 'int32', 'facet': True},
                {'name': 'value', 'type': 'string', 'facet': False},
                {'name': 'workspace_id', 'type': 'string', 'facet': True},
                {'name': 'updated_at', 'type': 'int64', 'facet': False}
            ]
        }
        
        # Create all collections
        for schema in [commands_schema, mentions_schema, workspaces_schema, context_objects_schema]:
            try:
                self.client.collections.create(schema)
                print(f"Created collection: {schema['name']}")
            except Exception as e:
                if 'already exists' in str(e):
                    print(f"Collection {schema['name']} already exists")
                else:
                    raise e
    
    async def search_unified(
        self,
        query: str,
        context: Dict[str, Any],
        limit: int = 20
    ) -> Dict[str, List[Any]]:
        """Unified search across all collections"""
        
        # Multi-search configuration
        multi_search = {
            'searches': [
                {
                    'collection': 'commands',
                    'q': query,
                    'query_by': 'name,description,keywords',
                    'filter_by': self._build_permission_filter(context),
                    'limit': limit // 3,
                    'typo_tokens_threshold': 2,
                    'num_typos': 2
                },
                {
                    'collection': 'mentions',
                    'q': query,
                    'query_by': 'display_name,search_keywords',
                    'filter_by': f"status:!=[archived]",
                    'limit': limit // 3,
                    'typo_tokens_threshold': 1,
                    'num_typos': 2
                },
                {
                    'collection': 'workspaces',
                    'q': query,
                    'query_by': 'name,description,tags',
                    'filter_by': f"project_id:={context.get('project_id', '')}",
                    'limit': limit // 3
                }
            ]
        }
        
        results = self.client.multi_search.perform(multi_search)
        
        # Combine and rank results
        combined = self._combine_search_results(results, context)
        
        return {
            'commands': combined.get('commands', []),
            'mentions': combined.get('mentions', []),
            'workspaces': combined.get('workspaces', []),
            'context_objects': []  # Add if needed
        }
    
    def _build_permission_filter(self, context: Dict) -> str:
        """Build permission filter based on user context"""
        user_roles = context.get('user_roles', [])
        workspace_id = context.get('workspace_id')
        
        filters = []
        if user_roles:
            role_filter = f"permissions:=[{','.join(user_roles)}]"
            filters.append(role_filter)
        
        if workspace_id:
            visibility_filter = f"visibility:=[public,workspace]"
            filters.append(visibility_filter)
        
        return ' && '.join(filters) if filters else ''
    
    def _combine_search_results(
        self,
        results: Dict,
        context: Dict
    ) -> Dict[str, List]:
        """Combine and intelligently rank search results"""
        
        combined = {
            'commands': [],
            'mentions': [],
            'workspaces': []
        }
        
        for result_set in results['results']:
            collection_name = self._detect_collection(result_set)
            
            for hit in result_set.get('hits', []):
                item = hit['document']
                item['_score'] = hit.get('text_match_info', {}).get('score', 0)
                
                # Apply context boost
                if collection_name == 'commands':
                    # Boost recently used commands
                    if item.get('usage_count', 0) > 10:
                        item['_score'] *= 1.2
                elif collection_name == 'mentions':
                    # Boost online agents
                    if item.get('status') == 'online':
                        item['_score'] *= 1.3
                
                combined[collection_name].append(item)
        
        # Sort each category by score
        for category in combined:
            combined[category].sort(key=lambda x: x.get('_score', 0), reverse=True)
        
        return combined
    
    def _detect_collection(self, result_set: Dict) -> str:
        """Detect collection from result set"""
        # Implementation would inspect result structure
        # to determine source collection
        return 'commands'  # Simplified
```

---

## 5. FastAPI Backend Implementation

### 5.1 Command Executor Service

```python
# backend/app/services/command_executor.py
from typing import Dict, Any, Optional, List
from fastapi import HTTPException
from pydantic import BaseModel
import asyncio
from enum import Enum
from supabase import Client
import typesense
from ..services.typesense_service import TypesenseService
from ..services.ledger_service import LedgerService
from ..services.context_object_service import ContextObjectService

class CommandType(str, Enum):
    MENTION = "mention"
    SLASH = "slash"
    WORKSPACE = "workspace"
    POWER = "power"
    SEARCH = "search"
    HELP = "help"
    QUICK = "quick"
    DOCUMENT = "document"
    NATURAL = "natural"

class CommandInput(BaseModel):
    text: str
    workspace_id: str
    project_id: Optional[str]
    user_id: str
    context: Dict[str, Any]
    selection: Optional[str] = None  # Selected text if any

class CommandResult(BaseModel):
    success: bool
    command_type: CommandType
    data: Optional[Any]
    error: Optional[str]
    execution_time_ms: int
    revertable: bool = False
    execution_id: Optional[str] = None

class CommandExecutor:
    def __init__(
        self,
        supabase: Client,
        typesense_service: TypesenseService,
        ledger_service: LedgerService,
        context_service: ContextObjectService
    ):
        self.supabase = supabase
        self.typesense = typesense_service
        self.ledger = ledger_service
        self.context_objects = context_service
        self.handlers = self._register_handlers()
    
    def _register_handlers(self) -> Dict[str, callable]:
        """Register all command handlers"""
        return {
            # Agent handlers
            'spawn_agent': self.spawn_agent_handler,
            'dismiss_agent': self.dismiss_agent_handler,
            
            # Workspace handlers
            'switch_workspace': self.switch_workspace_handler,
            'create_workspace': self.create_workspace_handler,
            'branch_workspace': self.branch_workspace_handler,
            'thread_workspace': self.thread_workspace_handler,
            
            # Surface handlers
            'attach_surface': self.attach_surface_handler,
            'create_surface': self.create_surface_handler,
            
            # Action handlers
            'summarize': self.summarize_handler,
            'create_task': self.create_task_handler,
            'share': self.share_handler,
            
            # Search handler
            'search': self.search_handler,
            
            # Custom command handler
            'custom': self.custom_command_handler
        }
    
    async def execute(self, input: CommandInput) -> CommandResult:
        """Main execution pipeline following CQRS pattern"""
        start_time = asyncio.get_event_loop().time()
        execution_id = None
        
        try:
            # 1. Parse command and detect type
            command_type, parsed = await self.parse_command(input.text)
            
            # 2. Resolve command from registry
            command = await self.resolve_command(parsed, command_type)
            
            # 3. Validate permissions
            if not await self.validate_permissions(command, input):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            
            # 4. Collect and validate parameters
            params = await self.collect_parameters(command, parsed, input)
            
            # 5. Show preview if required
            if command.get('requires_confirmation'):
                preview = await self.generate_preview(command, params)
                # In real implementation, would send preview to frontend
                # and wait for confirmation
            
            # 6. Log execution start
            execution_id = await self.log_execution_start(command, input, params)
            
            # 7. Execute handler
            handler = self.handlers.get(command['handler'])
            if not handler:
                raise ValueError(f"Unknown handler: {command['handler']}")
            
            result = await handler(params, input.context)
            
            # 8. Update context objects if needed
            if 'context_updates' in result:
                await self.context_objects.update_multiple(
                    result['context_updates'],
                    input.workspace_id,
                    input.user_id
                )
            
            # 9. Log to ledger
            await self.ledger.log_command(
                command=command,
                input=input,
                result=result,
                execution_id=execution_id
            )
            
            # 10. Update execution status
            execution_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
            await self.log_execution_complete(execution_id, result, execution_time)
            
            # 11. Update user preferences (frecency)
            await self.update_user_preferences(command['id'], input.user_id)
            
            return CommandResult(
                success=True,
                command_type=command_type,
                data=result,
                execution_time_ms=execution_time,
                revertable=result.get('revertable', False),
                execution_id=execution_id
            )
            
        except Exception as e:
            execution_time = int((asyncio.get_event_loop().time() - start_time) * 1000)
            
            # Log failure
            if execution_id:
                await self.log_execution_failed(execution_id, str(e))
            
            return CommandResult(
                success=False,
                command_type=CommandType.NATURAL,
                error=str(e),
                execution_time_ms=execution_time,
                execution_id=execution_id
            )
    
    async def parse_command(self, text: str) -> tuple[CommandType, Dict]:
        """Parse command text and detect type based on prefix"""
        text = text.strip()
        
        # Check for prefix patterns
        if text.startswith('@'):
            return CommandType.MENTION, await self.parse_mention(text)
        elif text.startswith('/'):
            if text.startswith('//'):
                return CommandType.SEARCH, {'query': text[2:].strip()}
            else:
                return CommandType.SLASH, await self.parse_slash_command(text)
        elif text.startswith('#'):
            return CommandType.WORKSPACE, {'workspace': text[1:].strip()}
        elif text.startswith('>'):
            return CommandType.POWER, await self.parse_power_command(text)
        elif text.startswith('?'):
            return CommandType.HELP, {'topic': text[1:].strip()}
        elif text.startswith('!'):
            return CommandType.QUICK, await self.parse_quick_action(text)
        elif text.startswith('^'):
            return CommandType.DOCUMENT, {'document': text[1:].strip()}
        else:
            # Natural language - use AI to parse intent
            return CommandType.NATURAL, await self.parse_natural_language(text)
    
    async def parse_mention(self, text: str) -> Dict:
        """Parse @mention and resolve to entity"""
        mention_text = text[1:].split()[0]
        remaining = text[len(mention_text) + 1:].strip()
        
        # Search for entity in Typesense
        search_params = {
            'q': mention_text,
            'query_by': 'display_name,search_keywords',
            'typo_tokens_threshold': 2,
            'num_typos': 2,
            'limit': 1
        }
        
        results = self.typesense.client.collections['mentions'].documents.search(search_params)
        
        if results['found'] > 0:
            entity = results['hits'][0]['document']
            return {
                'entity': entity,
                'message': remaining,
                'action': f"spawn_{entity['type']}"
            }
        
        raise ValueError(f"Unknown mention: {mention_text}")
    
    async def parse_slash_command(self, text: str) -> Dict:
        """Parse /command with parameters"""
        parts = text[1:].split(maxsplit=1)
        command_name = parts[0]
        args = parts[1] if len(parts) > 1 else ''
        
        return {
            'command': command_name,
            'args': args,
            'parsed_args': self._parse_command_args(args)
        }
    
    async def parse_power_command(self, text: str) -> Dict:
        """Parse > power command"""
        command_text = text[1:].strip()
        
        # Parse structure like "> open surface: revenue"
        if ':' in command_text:
            action, target = command_text.split(':', 1)
            return {
                'action': action.strip(),
                'target': target.strip()
            }
        
        return {'action': command_text}
    
    async def parse_natural_language(self, text: str) -> Dict:
        """Use AI to parse natural language intent"""
        # This would call an AI service to understand intent
        # For now, return a simplified structure
        return {
            'intent': 'unknown',
            'text': text,
            'entities': []
        }
    
    # Handler implementations
    
    async def spawn_agent_handler(self, params: Dict, context: Dict) -> Dict:
        """Spawn an agent in the current workspace"""
        agent = params['entity']
        workspace_id = context['workspace_id']
        
        # Create agent context in database
        result = self.supabase.table('agent_contexts').insert({
            'agent_id': agent['id'],
            'workspace_id': workspace_id,
            'status': 'active',
            'metadata': {
                'spawned_from': 'command',
                'initial_message': params.get('message', '')
            }
        }).execute()
        
        # Notify via WebSocket
        await self.notify_workspace('agent_spawned', {
            'agent': agent,
            'context_id': result.data[0]['id'],
            'workspace_id': workspace_id
        })
        
        return {
            'agent_spawned': True,
            'agent': agent,
            'context_id': result.data[0]['id'],
            'revertable': True
        }
    
    async def switch_workspace_handler(self, params: Dict, context: Dict) -> Dict:
        """Switch to a different workspace"""
        workspace_name = params.get('workspace')
        
        # Search for workspace
        results = await self.typesense.search_unified(
            workspace_name,
            context,
            limit=1
        )
        
        if results['workspaces']:
            workspace = results['workspaces'][0]
            return {
                'action': 'switch_workspace',
                'workspace_id': workspace['id'],
                'workspace_name': workspace['name']
            }
        
        # Offer to create new workspace
        return {
            'action': 'create_workspace_prompt',
            'suggested_name': workspace_name
        }
    
    async def branch_workspace_handler(self, params: Dict, context: Dict) -> Dict:
        """Create a new workspace branch WITH parent context"""
        parent_workspace_id = context['workspace_id']
        selection = params.get('selection', '')
        
        # Get parent workspace data
        parent = self.supabase.table('workspaces').select('*').eq(
            'id', parent_workspace_id
        ).single().execute()
        
        # Create new branched workspace
        new_workspace = self.supabase.table('workspaces').insert({
            'name': f"{parent.data['name']} - Branch",
            'project_id': parent.data['project_id'],
            'parent_workspace_id': parent_workspace_id,
            'branch_context': selection,
            'type': 'branch'
        }).execute()
        
        # Copy relevant context objects
        await self.context_objects.copy_to_workspace(
            from_workspace=parent_workspace_id,
            to_workspace=new_workspace.data[0]['id']
        )
        
        return {
            'action': 'workspace_branched',
            'new_workspace_id': new_workspace.data[0]['id'],
            'parent_workspace_id': parent_workspace_id,
            'context': selection
        }
    
    async def thread_workspace_handler(self, params: Dict, context: Dict) -> Dict:
        """Create a new workspace thread WITHOUT parent context"""
        project_id = context['project_id']
        
        # Create fresh workspace
        new_workspace = self.supabase.table('workspaces').insert({
            'name': f"Thread - {params.get('topic', 'New')}",
            'project_id': project_id,
            'type': 'thread'
        }).execute()
        
        return {
            'action': 'workspace_thread_created',
            'new_workspace_id': new_workspace.data[0]['id']
        }
    
    async def search_handler(self, params: Dict, context: Dict) -> Dict:
        """Execute global search"""
        query = params.get('query', '')
        
        results = await self.typesense.search_unified(
            query,
            context,
            limit=50
        )
        
        return {
            'action': 'search_results',
            'query': query,
            'results': results
        }
    
    # Helper methods
    
    async def validate_permissions(
        self,
        command: Dict,
        input: CommandInput
    ) -> bool:
        """Check if user has permission to execute command"""
        required_permissions = command.get('permissions', [])
        if not required_permissions:
            return True
        
        # Get user roles
        user = self.supabase.table('users').select('roles').eq(
            'id', input.user_id
        ).single().execute()
        
        user_roles = user.data.get('roles', [])
        
        # Check if user has any required permission
        return any(perm in user_roles for perm in required_permissions)
    
    async def update_user_preferences(self, command_id: str, user_id: str):
        """Update frecency for personalized ranking"""
        self.supabase.rpc('increment_command_usage', {
            'p_command_id': command_id,
            'p_user_id': user_id
        }).execute()
```

### 5.2 API Endpoints

```python
# backend/app/api/v1/commands.py
from fastapi import APIRouter, Depends, WebSocket, Query, BackgroundTasks
from typing import List, Optional, Dict, Any
from ...services.command_executor import CommandExecutor, CommandInput, CommandResult
from ...services.typesense_service import TypesenseService
from ...services.websocket_manager import WebSocketManager
from ...dependencies import get_current_user, get_command_executor

router = APIRouter(prefix="/api/v1/commands")

@router.post("/execute")
async def execute_command(
    input: CommandInput,
    background_tasks: BackgroundTasks,
    executor: CommandExecutor = Depends(get_command_executor),
    current_user = Depends(get_current_user)
) -> CommandResult:
    """Execute a command with full CQRS pipeline"""
    
    # Ensure user context
    input.user_id = current_user.id
    
    # Execute command
    result = await executor.execute(input)
    
    # Queue background tasks if needed
    if result.success and result.revertable:
        background_tasks.add_task(
            schedule_revert_window,
            result.execution_id,
            30  # 30 second revert window
        )
    
    return result

@router.get("/search")
async def search_commands(
    q: str = Query(..., description="Search query"),
    workspace_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(20, le=100),
    typesense: TypesenseService = Depends(get_typesense_service),
    current_user = Depends(get_current_user)
) -> Dict[str, List]:
    """Search for commands, mentions, and workspaces"""
    
    context = {
        'user_id': current_user.id,
        'user_roles': current_user.roles,
        'workspace_id': workspace_id
    }
    
    # Add category filter if specified
    if category:
        context['category'] = category
    
    results = await typesense.search_unified(q, context, limit)
    
    return results

@router.post("/revert/{execution_id}")
async def revert_command(
    execution_id: str,
    executor: CommandExecutor = Depends(get_command_executor),
    current_user = Depends(get_current_user)
) -> Dict:
    """Revert a previously executed command"""
    
    # Get execution record
    execution = executor.supabase.table('command_executions').select('*').eq(
        'id', execution_id
    ).single().execute()
    
    if not execution.data:
        raise HTTPException(404, "Execution not found")
    
    if execution.data['user_id'] != current_user.id:
        raise HTTPException(403, "Cannot revert another user's command")
    
    if execution.data['reverted_at']:
        raise HTTPException(400, "Command already reverted")
    
    # Execute revert
    result = await executor.revert_execution(execution_id)
    
    return result

@router.websocket("/autocomplete")
async def autocomplete_websocket(
    websocket: WebSocket,
    typesense: TypesenseService = Depends(get_typesense_service),
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """WebSocket endpoint for real-time autocomplete"""
    
    await websocket.accept()
    user_id = await ws_manager.authenticate_websocket(websocket)
    
    try:
        while True:
            # Receive query from frontend
            data = await websocket.receive_json()
            
            query = data.get('query', '')
            context = data.get('context', {})
            context['user_id'] = user_id
            
            # Search with extreme speed optimization
            search_params = {
                'q': query,
                'query_by': 'name,display_name',  # Only essential fields
                'query_by_weights': '2,1',
                'typo_tokens_threshold': 1,  # Start typo tolerance early
                'num_typos': 1,  # Less typos for speed
                'limit': 10,  # Limit results
                'exclude_fields': 'permissions,metadata',  # Exclude heavy fields
                'highlight_full_fields': 'name,display_name',
                'snippet_threshold': 20  # Short snippets
            }
            
            # Perform multi-search
            results = await typesense.search_unified(
                query,
                context,
                limit=10
            )
            
            # Send results back immediately
            await websocket.send_json({
                'results': results,
                'query': query,
                'timestamp': asyncio.get_event_loop().time()
            })
            
    except Exception as e:
        await websocket.close(code=1000, reason=str(e))

@router.get("/manifest")
async def get_command_manifest(
    category: Optional[str] = None,
    current_user = Depends(get_current_user)
) -> List[Dict]:
    """Get command manifest for the current user"""
    
    query = supabase.table('commands').select('*')
    
    # Filter by category if specified
    if category:
        query = query.eq('category', category)
    
    # Filter by permissions
    query = query.contains('permissions', current_user.roles)
    
    commands = query.execute()
    
    return commands.data

@router.post("/register")
async def register_custom_command(
    command: Dict[str, Any],
    current_user = Depends(get_current_user)
) -> Dict:
    """Register a custom user command"""
    
    # Validate command structure
    # ... validation logic ...
    
    # Insert command
    command['created_by'] = current_user.id
    command['visibility'] = 'private'  # User commands start private
    
    result = supabase.table('commands').insert(command).execute()
    
    return {'command_id': result.data[0]['id']}
```

---

## 6. Frontend Implementation

### 6.1 Command Palette with cmdk

```tsx
// src/components/CommandPalette.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useCommandPalette } from '../hooks/useCommandPalette';
import { useWorkspace } from '../hooks/useWorkspace';
import { Bot, Hash, FileText, Search, ChevronRight, Zap } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { results, executeCommand, loading } = useCommandPalette(search);
  const { currentWorkspace, switchWorkspace } = useWorkspace();
  
  // Global keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const handleSelect = useCallback(async (value: string) => {
    const [type, id] = value.split(':');
    
    switch (type) {
      case 'command':
        const command = results.commands.find(c => c.id === id);
        if (command) {
          await executeCommand(command);
        }
        break;
      
      case 'mention':
        const mention = results.mentions.find(m => m.id === id);
        if (mention) {
          await executeCommand({
            text: `@${mention.display_name}`,
            type: 'mention'
          });
        }
        break;
      
      case 'workspace':
        await switchWorkspace(id);
        break;
      
      case 'search':
        // Execute search
        break;
    }
    
    setOpen(false);
    setSearch('');
  }, [results, executeCommand, switchWorkspace]);
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'agent': return <Bot className="w-4 h-4" />;
      case 'workspace': return <Hash className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'search': return <Search className="w-4 h-4" />;
      default: return <ChevronRight className="w-4 h-4" />;
    }
  };
  
  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-popover rounded-lg shadow-2xl border"
    >
      <div className="flex items-center border-b px-3">
        <Search className="w-4 h-4 shrink-0 opacity-50" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Type a command or search..."
          className="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      
      <Command.List className="max-h-[500px] overflow-y-auto p-2">
        {loading && (
          <Command.Loading>
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              Searching...
            </div>
          </Command.Loading>
        )}
        
        <Command.Empty>
          <div className="flex flex-col items-center justify-center py-6 text-sm text-muted-foreground">
            <p>No results found</p>
            <p className="text-xs mt-2">Try a different search or press ? for help</p>
          </div>
        </Command.Empty>
        
        {/* Recent commands */}
        {results.recent && results.recent.length > 0 && (
          <Command.Group heading="Recent">
            {results.recent.map((item) => (
              <Command.Item
                key={`recent:${item.id}`}
                value={`command:${item.id}`}
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
              >
                {getIcon(item.category)}
                <span className="flex-1">{item.name}</span>
                {item.shortcut && (
                  <kbd className="text-xs bg-muted px-1 rounded">
                    {item.shortcut}
                  </kbd>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        
        {/* Commands */}
        {results.commands && results.commands.length > 0 && (
          <Command.Group heading="Commands">
            {results.commands.map((command) => (
              <Command.Item
                key={`command:${command.id}`}
                value={`command:${command.id}`}
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
              >
                {command.icon ? (
                  <span>{command.icon}</span>
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <div className="flex-1">
                  <div className="font-medium">{command.name}</div>
                  {command.description && (
                    <div className="text-xs text-muted-foreground">
                      {command.description}
                    </div>
                  )}
                </div>
                {command.prefix && (
                  <kbd className="text-xs bg-muted px-1 rounded">
                    {command.prefix}
                  </kbd>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        
        {/* Mentions (Agents, Users, Surfaces) */}
        {results.mentions && results.mentions.length > 0 && (
          <Command.Group heading="Mention">
            {results.mentions.map((mention) => (
              <Command.Item
                key={`mention:${mention.id}`}
                value={`mention:${mention.id}`}
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
              >
                {mention.avatar_url ? (
                  <img
                    src={mention.avatar_url}
                    alt={mention.display_name}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  getIcon(mention.type)
                )}
                <div className="flex-1">
                  <div className="font-medium">@{mention.display_name}</div>
                  {mention.status && (
                    <div className="text-xs text-muted-foreground">
                      {mention.status}
                    </div>
                  )}
                </div>
                {mention.type === 'agent' && mention.capabilities && (
                  <div className="flex gap-1">
                    {mention.capabilities.slice(0, 2).map((cap, i) => (
                      <span key={i} className="text-xs bg-muted px-1 rounded">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}
        
        {/* Workspaces */}
        {results.workspaces && results.workspaces.length > 0 && (
          <Command.Group heading="Workspaces">
            {results.workspaces.map((workspace) => (
              <Command.Item
                key={`workspace:${workspace.id}`}
                value={`workspace:${workspace.id}`}
                onSelect={handleSelect}
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
              >
                <Hash className="w-4 h-4" />
                <div className="flex-1">
                  <div className="font-medium">{workspace.name}</div>
                  {workspace.description && (
                    <div className="text-xs text-muted-foreground">
                      {workspace.description}
                    </div>
                  )}
                </div>
                {workspace.id === currentWorkspace?.id && (
                  <span className="text-xs bg-primary text-primary-foreground px-1 rounded">
                    Current
                  </span>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        )}
      </Command.List>
      
      <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
        <div className="flex gap-4">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>⌘K Close</span>
        </div>
        <div className="flex gap-4">
          <span>? Help</span>
          <span>@ Mention</span>
          <span>/ Command</span>
        </div>
      </div>
    </Command.Dialog>
  );
}
```

### 6.2 Unified Chat Input Hook

```tsx
// src/hooks/useCommandPalette.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from 'use-debounce';
import { supabase } from '../lib/supabase';

interface CommandResult {
  commands: any[];
  mentions: any[];
  workspaces: any[];
  recent: any[];
}

export function useCommandPalette(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query, 150);
  const [results, setResults] = useState<CommandResult>({
    commands: [],
    mentions: [],
    workspaces: [],
    recent: []
  });
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Initialize WebSocket for autocomplete
  useEffect(() => {
    const ws = new WebSocket(
      `${import.meta.env.VITE_WS_URL}/api/v1/commands/autocomplete`
    );
    
    ws.onopen = () => {
      console.log('Command palette WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setResults(data.results);
      setLoading(false);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setLoading(false);
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, []);
  
  // Send search query via WebSocket
  useEffect(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      setLoading(true);
      
      // Get current context
      const context = {
        workspace_id: getCurrentWorkspaceId(),
        project_id: getCurrentProjectId(),
        user_roles: getUserRoles()
      };
      
      wsRef.current.send(JSON.stringify({
        query: debouncedQuery,
        context
      }));
    }
  }, [debouncedQuery]);
  
  // Load recent commands on mount
  useEffect(() => {
    loadRecentCommands();
  }, []);
  
  const loadRecentCommands = async () => {
    try {
      const { data } = await supabase
        .from('user_command_preferences')
        .select(`
          command_id,
          commands!inner(*)
        `)
        .order('last_used_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setResults(prev => ({
          ...prev,
          recent: data.map(d => d.commands)
        }));
      }
    } catch (error) {
      console.error('Failed to load recent commands:', error);
    }
  };
  
  const executeCommand = useCallback(async (command: any) => {
    const response = await fetch('/api/v1/commands/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: command.text || buildCommandText(command),
        workspace_id: getCurrentWorkspaceId(),
        project_id: getCurrentProjectId(),
        user_id: getCurrentUserId(),
        context: {
          source: 'command_palette',
          timestamp: Date.now()
        }
      })
    });
    
    const result = await response.json();
    
    // Handle result based on action type
    if (result.data?.action === 'switch_workspace') {
      // Trigger workspace switch
      window.dispatchEvent(new CustomEvent('workspace:switch', {
        detail: { workspace_id: result.data.workspace_id }
      }));
    } else if (result.data?.agent_spawned) {
      // Show agent cursor
      window.dispatchEvent(new CustomEvent('agent:spawned', {
        detail: result.data
      }));
    }
    
    // Refresh recent commands
    await loadRecentCommands();
    
    return result;
  }, []);
  
  const buildCommandText = (command: any) => {
    if (command.prefix) {
      return `${command.prefix}${command.name}`;
    }
    return command.name;
  };
  
  // Helper functions (would be imported from context)
  const getCurrentWorkspaceId = () => {
    // Get from WorkspaceContext
    return localStorage.getItem('current_workspace_id') || '';
  };
  
  const getCurrentProjectId = () => {
    // Get from ProjectContext
    return localStorage.getItem('current_project_id') || '';
  };
  
  const getCurrentUserId = () => {
    // Get from AuthContext
    return supabase.auth.getUser()?.id || '';
  };
  
  const getUserRoles = () => {
    // Get from user session
    return ['user'];  // Default role
  };
  
  return {
    query,
    setQuery,
    results,
    loading,
    executeCommand
  };
}
```

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Design unified architecture
- [ ] Set up Typesense with Docker
- [ ] Create Supabase schema and triggers
- [ ] Initialize FastAPI project structure
- [ ] Set up command registry system

### Phase 2: Core Backend (Week 2)
- [ ] Implement CommandExecutor service
- [ ] Create TypesenseService with collections
- [ ] Build command parsing pipeline
- [ ] Add WebSocket autocomplete endpoint
- [ ] Implement Ledger service

### Phase 3: Frontend Integration (Week 3)
- [ ] Install and configure cmdk
- [ ] Create CommandPalette component
- [ ] Build useCommandPalette hook
- [ ] Update UnifiedChatInput with prefix handling
- [ ] Add keyboard shortcuts

### Phase 4: Agent & Workspace Commands (Week 4)
- [ ] Implement agent spawn/dismiss handlers
- [ ] Add workspace switching logic
- [ ] Create branch/thread handlers
- [ ] Build surface attachment system
- [ ] Add ContextObject tracking

### Phase 5: Testing & Optimization (Week 5)
- [ ] Load test with 10k+ commands
- [ ] Optimize Typesense queries
- [ ] Implement caching layer
- [ ] Add telemetry and analytics
- [ ] Create comprehensive test suite

### Phase 6: Advanced Features (Week 6)
- [ ] Custom user commands
- [ ] Natural language parsing
- [ ] Command composition
- [ ] Undo/redo system
- [ ] Help system

---

## 8. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Autocomplete latency | <50ms | P95 response time |
| Command execution | <200ms | P95 for simple commands |
| Workspace switch | <500ms | Full context load |
| Search results | <100ms | First 10 results |
| WebSocket connection | <1s | Initial handshake |
| Typesense indexing | <100ms | Per document |

---

## 9. Security & Permissions

### Permission Model
```python
class CommandPermission:
    READ = "command.read"
    EXECUTE = "command.execute"
    CREATE = "command.create"
    DELETE = "command.delete"
    SHARE = "command.share"

class WorkspacePermission:
    VIEW = "workspace.view"
    EDIT = "workspace.edit"
    INVITE = "workspace.invite"
    DELETE = "workspace.delete"
```

### Rate Limiting
```python
RATE_LIMITS = {
    'autocomplete': '100/minute',
    'execute': '30/minute',
    'search': '60/minute',
    'custom_command': '10/hour'
}
```

---

## 10. Monitoring & Analytics

### Key Metrics to Track
- Command usage by type and user
- Autocomplete accuracy (selected vs shown)
- Error rates by command category
- Performance metrics (latency percentiles)
- User preference patterns (frecency)

### Telemetry Events
```typescript
enum TelemetryEvent {
  COMMAND_EXECUTED = 'command.executed',
  COMMAND_FAILED = 'command.failed',
  COMMAND_REVERTED = 'command.reverted',
  AUTOCOMPLETE_SHOWN = 'autocomplete.shown',
  AUTOCOMPLETE_SELECTED = 'autocomplete.selected',
  WORKSPACE_SWITCHED = 'workspace.switched',
  AGENT_SPAWNED = 'agent.spawned'
}
```

---

## Conclusion

This unified architecture provides:
- **Instant, typo-tolerant search** via Typesense
- **Scalable command execution** with FastAPI
- **Real-time sync** between Supabase and Typesense
- **Keyboard-first UX** with cmdk
- **Complete observability** via Ledger
- **Extensible command system** supporting custom commands

The system is designed to scale to millions of commands while maintaining sub-50ms search latency and providing a seamless, keyboard-driven experience aligned with Syna's vision of conversation-native work.

---

**Document Status:** Complete  
**Next Steps:** Begin Phase 1 implementation  
**Dependencies:** Typesense deployment, Supabase configuration, FastAPI setup