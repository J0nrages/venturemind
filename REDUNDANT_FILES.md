# Redundant Files Analysis

## Files to Remove

### Backend Files

1. **`/backend/app/api/v1/websocket.py`**
   - Status: REDUNDANT - Old WebSocket implementation
   - Replaced by: `unified_websocket.py`
   - Not imported anywhere in the codebase
   - Can be safely deleted

### Frontend Files

All legacy WebSocket files have been successfully removed:
- ✅ `WebSocketService.ts` - Already removed
- ✅ `useWebSocket.ts` - Already removed  
- ✅ `useWebSocketChat.ts` - Already removed

### Test Files

1. **`/test_websocket.html`**
   - Status: TEST FILE - Created during debugging
   - Can be removed after testing is complete

## Architecture Documentation Discrepancies

### ARCHITECTURE.md Lists Files That Don't Exist
The following files are mentioned in ARCHITECTURE.md but don't exist in the actual codebase:

1. **Frontend Services**
   - `WebSocketService.ts` - Listed on line 174 but has been replaced by `UnifiedWebSocketManager.ts`

2. **Frontend Hooks**  
   - `useWebSocket.ts` - Listed on line 133 but has been replaced by `useUnifiedWebSocket.ts`
   - `useWebSocketChat.ts` - Listed on line 132 but functionality merged into `useUnifiedWebSocket.ts`

## Recommendations

### Immediate Actions

1. **Delete redundant backend file:**
   ```bash
   rm /home/jon/Projects/syna/backend/app/api/v1/websocket.py
   ```

2. **Delete test file (after confirming no longer needed):**
   ```bash
   rm /home/jon/Projects/syna/test_websocket.html
   ```

3. **Update ARCHITECTURE.md to reflect current state:**
   - Line 174: Change `WebSocketService.ts` to `UnifiedWebSocketManager.ts`
   - Line 133: Change `useWebSocket.ts` to `useUnifiedWebSocket.ts`
   - Line 132: Remove `useWebSocketChat.ts` or note it's merged into `useUnifiedWebSocket.ts`

### Future Considerations

1. **Agent Orchestration Services**
   - `AgentOrchestrationService.ts` and `AgentOrchestrator.ts` appear to have overlapping responsibilities
   - Consider consolidating or clearly differentiating their roles

2. **Orchestration Services**  
   - `OrchestrationService.ts` and `AgentOrchestrationService.ts` may have overlapping functionality
   - Review and potentially consolidate

## Summary

- **1 redundant backend file** needs to be removed
- **1 test file** can be removed  
- **3 documentation updates** needed in ARCHITECTURE.md
- All legacy frontend WebSocket files have already been successfully removed