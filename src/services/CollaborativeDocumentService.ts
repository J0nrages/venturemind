import { supabase } from '../lib/supabase';
import { WebSocketService } from './WebSocketService';

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'retain' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: any;
  timestamp: string;
  user_id: string;
  version: number;
}

export interface DocumentState {
  id: string;
  content: string;
  version: number;
  checksum: string;
  last_updated: string;
  last_editor_id: string;
}

export interface ConflictResolution {
  resolved_operation: DocumentOperation;
  conflicts_detected: DocumentOperation[];
  resolution_strategy: 'ours' | 'theirs' | 'merge' | 'manual';
  merged_content?: string;
}

export class CollaborativeDocumentService {
  // Apply operation to document with conflict resolution
  static async applyOperation(
    documentId: string,
    operation: DocumentOperation,
    expectedVersion: number
  ): Promise<{
    success: boolean;
    new_version: number;
    conflicts?: DocumentOperation[];
    resolved_content?: string;
  }> {
    try {
      // Get current document state
      const { data: document, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      // Check for version conflicts
      if (document.version !== expectedVersion) {
        // Get conflicting operations
        const { data: conflictingOps } = await supabase
          .from('document_operations')
          .select('*')
          .eq('document_id', documentId)
          .gt('version_after', expectedVersion)
          .lte('version_after', document.version)
          .order('version_after', { ascending: true });

        // Resolve conflicts using operational transform
        const resolution = await this.resolveConflicts(operation, conflictingOps || []);
        
        // Apply resolved operation
        const newContent = await this.applyOperationToContent(document.content, resolution.resolved_operation);
        const newVersion = document.version + 1;
        const newChecksum = await this.calculateChecksum(newContent);

        // Update document
        await supabase
          .from('user_documents')
          .update({
            content: newContent,
            version: newVersion,
            last_editor_id: operation.user_id,
            last_updated: new Date().toISOString()
          })
          .eq('id', documentId);

        // Store the resolved operation
        await supabase
          .from('document_operations')
          .insert({
            document_id: documentId,
            user_id: operation.user_id,
            session_id: 'resolved',
            operation_type: resolution.resolved_operation.type,
            operation_data: resolution.resolved_operation,
            position_start: resolution.resolved_operation.position,
            position_end: resolution.resolved_operation.position + (resolution.resolved_operation.length || 0),
            version_before: document.version,
            version_after: newVersion,
            checksum: newChecksum
          });

        return {
          success: true,
          new_version: newVersion,
          conflicts: resolution.conflicts_detected,
          resolved_content: newContent
        };
      } else {
        // No conflicts, apply operation directly
        const newContent = await this.applyOperationToContent(document.content, operation);
        const newVersion = document.version + 1;
        const newChecksum = await this.calculateChecksum(newContent);

        // Update document
        await supabase
          .from('user_documents')
          .update({
            content: newContent,
            version: newVersion,
            last_editor_id: operation.user_id,
            last_updated: new Date().toISOString()
          })
          .eq('id', documentId);

        // Store operation
        await supabase
          .from('document_operations')
          .insert({
            document_id: documentId,
            user_id: operation.user_id,
            session_id: operation.user_id, // Use user_id as session for simplicity
            operation_type: operation.type,
            operation_data: operation,
            position_start: operation.position,
            position_end: operation.position + (operation.length || 0),
            version_before: document.version,
            version_after: newVersion,
            checksum: newChecksum
          });

        return {
          success: true,
          new_version: newVersion
        };
      }
    } catch (error) {
      console.error('Error applying operation:', error);
      return {
        success: false,
        new_version: -1
      };
    }
  }

  // Resolve conflicts using operational transformation
  private static async resolveConflicts(
    incomingOperation: DocumentOperation,
    conflictingOperations: any[]
  ): Promise<ConflictResolution> {
    // Simple conflict resolution strategy
    // In production, you'd want more sophisticated operational transform algorithms
    
    let resolvedOperation = { ...incomingOperation };
    const conflicts: DocumentOperation[] = [];

    for (const conflictOp of conflictingOperations) {
      const conflict = this.detectConflict(resolvedOperation, conflictOp.operation_data);
      
      if (conflict) {
        conflicts.push(conflictOp.operation_data);
        
        // Transform the operation based on the conflict
        resolvedOperation = this.transformOperation(resolvedOperation, conflictOp.operation_data);
      }
    }

    return {
      resolved_operation: resolvedOperation,
      conflicts_detected: conflicts,
      resolution_strategy: conflicts.length > 0 ? 'merge' : 'ours'
    };
  }

  // Detect if two operations conflict
  private static detectConflict(op1: DocumentOperation, op2: DocumentOperation): boolean {
    // Simple conflict detection - operations overlap in position
    const op1End = op1.position + (op1.length || 0);
    const op2End = op2.position + (op2.length || 0);
    
    return !(op1End <= op2.position || op2End <= op1.position);
  }

  // Transform operation based on conflicting operation
  private static transformOperation(operation: DocumentOperation, conflictingOp: DocumentOperation): DocumentOperation {
    const transformed = { ...operation };
    
    // Simple transformation - adjust position if conflicting operation was before
    if (conflictingOp.position <= operation.position) {
      if (conflictingOp.type === 'insert' && conflictingOp.content) {
        transformed.position += conflictingOp.content.length;
      } else if (conflictingOp.type === 'delete' && conflictingOp.length) {
        transformed.position -= conflictingOp.length;
      }
    }
    
    return transformed;
  }

  // Apply operation to document content
  private static async applyOperationToContent(content: string, operation: DocumentOperation): Promise<string> {
    switch (operation.type) {
      case 'insert':
        return content.slice(0, operation.position) + 
               (operation.content || '') + 
               content.slice(operation.position);
               
      case 'delete':
        return content.slice(0, operation.position) + 
               content.slice(operation.position + (operation.length || 0));
               
      case 'retain':
        return content; // No change for retain operations
        
      default:
        return content;
    }
  }

  // Calculate content checksum for conflict detection
  private static async calculateChecksum(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Get document edit history
  static async getDocumentHistory(documentId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('document_operations')
      .select(`
        *,
        user:auth.users(email)
      `)
      .eq('document_id', documentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  // Lock/unlock document sections for editing
  static async lockSection(sectionId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('doc_sections')
        .update({
          is_locked: true,
          locked_by: userId
        })
        .eq('id', sectionId)
        .eq('is_locked', false); // Only lock if not already locked

      return !error;
    } catch (error) {
      return false;
    }
  }

  static async unlockSection(sectionId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('doc_sections')
        .update({
          is_locked: false,
          locked_by: null
        })
        .eq('id', sectionId)
        .eq('locked_by', userId); // Only unlock if locked by this user

      return !error;
    } catch (error) {
      return false;
    }
  }

  // Get active collaborators for a document
  static async getActiveCollaborators(documentId: string): Promise<DocumentPresence[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('document_presence')
      .select('*')
      .eq('document_id', documentId)
      .gte('last_seen_at', fiveMinutesAgo)
      .order('last_seen_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Handle real-time document synchronization
  static async synchronizeDocument(documentId: string, operations: DocumentOperation[]): Promise<string> {
    // Get current document
    const { data: document } = await supabase
      .from('user_documents')
      .select('content, version')
      .eq('id', documentId)
      .single();

    if (!document) throw new Error('Document not found');

    let content = document.content;
    let version = document.version;

    // Apply operations in sequence
    for (const operation of operations) {
      content = await this.applyOperationToContent(content, operation);
      version++;

      // Store operation
      await supabase
        .from('document_operations')
        .insert({
          document_id: documentId,
          user_id: operation.user_id,
          session_id: 'sync',
          operation_type: operation.type,
          operation_data: operation,
          position_start: operation.position,
          position_end: operation.position + (operation.length || 0),
          version_before: version - 1,
          version_after: version,
          checksum: await this.calculateChecksum(content)
        });
    }

    // Update document
    await supabase
      .from('user_documents')
      .update({
        content,
        version,
        last_updated: new Date().toISOString()
      })
      .eq('id', documentId);

    // Broadcast sync to all users
    await WebSocketService.syncDocumentState(documentId);

    return content;
  }
}