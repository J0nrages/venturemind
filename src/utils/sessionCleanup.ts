/**
 * Session cleanup utility
 * Clears old session data with invalid context IDs
 * Ensures all new contexts use proper UUIDs
 */

export function cleanupInvalidSessions(): void {
  try {
    // Check session storage for old context data
    const sessionData = sessionStorage.getItem('syna_session_state');
    
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      
      // Check if any contexts have invalid IDs (not UUIDs)
      let hasInvalidIds = false;
      
      if (parsed.contexts && Array.isArray(parsed.contexts)) {
        parsed.contexts.forEach((context: any) => {
          if (context.id && !isValidUUID(context.id)) {
            console.warn(`Found invalid context ID: ${context.id}`);
            hasInvalidIds = true;
          }
        });
      }
      
      // Clear session if invalid IDs found
      if (hasInvalidIds) {
        console.log('Clearing session storage due to invalid context IDs');
        sessionStorage.removeItem('syna_session_state');
        
        // Also clear any related localStorage items
        const keysToCheck = [
          'syna_active_context',
          'syna_context_history',
          'syna_workspace_state'
        ];
        
        keysToCheck.forEach(key => {
          const data = localStorage.getItem(key);
          if (data && data.includes('context-')) {
            console.log(`Clearing localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        });
      }
    }
  } catch (error) {
    console.error('Error during session cleanup:', error);
  }
}

export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

export function ensureValidContextId(id: string): string {
  if (isValidUUID(id)) {
    return id;
  }
  
  // Generate new UUID if invalid
  console.warn(`Invalid context ID "${id}" - generating new UUID`);
  return crypto.randomUUID();
}

export function migrateOldContextData(): void {
  try {
    const sessionData = sessionStorage.getItem('syna_session_state');
    
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      
      // Migrate contexts to use proper UUIDs
      if (parsed.contexts && Array.isArray(parsed.contexts)) {
        let modified = false;
        
        parsed.contexts = parsed.contexts.map((context: any) => {
          if (context.id && !isValidUUID(context.id)) {
            const newId = crypto.randomUUID();
            console.log(`Migrating context ID from ${context.id} to ${newId}`);
            modified = true;
            
            return {
              ...context,
              id: newId,
              // Update any references to old ID
              conversationHistory: (context.conversationHistory || []).map((msg: any) => ({
                ...msg,
                contextId: newId
              }))
            };
          }
          return context;
        });
        
        if (modified) {
          // Save migrated data
          sessionStorage.setItem('syna_session_state', JSON.stringify(parsed));
          console.log('Context IDs migrated successfully');
        }
      }
    }
  } catch (error) {
    console.error('Error during context migration:', error);
  }
}

// Auto-run cleanup on module load
if (typeof window !== 'undefined') {
  cleanupInvalidSessions();
}