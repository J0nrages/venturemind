/**
 * Chat Feature - Public API
 * Export all public components and utilities
 */

// Components
export { default as MessageList } from './MessageList';
export { default as Composer } from './Composer';
export { default as Panels } from './Panels';
export { default as Omnibox } from './Omnibox';
export { default as Mentions } from './Mentions';

// Hooks
export { useOmnibox } from './useOmnibox';
export { useChatStore, chatSelectors, subscribeToChatState } from './chat.state';

// Utilities
export { parsePrefix, replacePrefixWith, shouldOpenOmnibox, getPrefixModeLabel, getPrefixModeIcon } from './prefix.parse';
export { commandManifest } from './command.manifest';
export { commandRouter } from './command.router';
export { chatActions } from './actions';
export { motion, variants, transitions, keyframes, animationUtils } from './motion';
export { theme, colors, themeUtils } from './theme';

// Types
export type { 
  PrefixMode, 
  ParsedPrefix 
} from './prefix.parse';

export type { 
  Command, 
  CommandParameter, 
  CommandManifest 
} from './command.manifest';

export type { 
  CommandExecutionContext, 
  CommandResult, 
  CommandTelemetry 
} from './command.router';

export type { 
  ChatPanel, 
  ChatUIPreferences, 
  ChatSelection, 
  ChatState 
} from './chat.state';

export type { 
  ActionType, 
  Action, 
  SendMessagePayload, 
  ExecuteCommandPayload, 
  OpenPanelPayload, 
  BranchWorkspacePayload 
} from './actions';

export type { 
  MentionPill 
} from './Mentions';

export type { 
  UseOmniboxOptions, 
  UseOmniboxReturn 
} from './useOmnibox';

export type {
  ComposerProps
} from './Composer';

export type {
  MessageListProps
} from './MessageList';

export type {
  OmniboxProps
} from './Omnibox';

export type {
  PanelsProps
} from './Panels';

export type {
  MentionsProps
} from './Mentions';