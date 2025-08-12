import { supabase } from '../lib/supabase';

export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  template_content: string;
  keywords: string[];
  icon: string;
  description?: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  name: string;
  type: string;
  content: string;
  category: 'personal' | 'business';
  subcategory?: string;
  template_id?: string;
  is_template_based: boolean;
  last_updated: string;
  created_at: string;
}

export interface DocumentMemory {
  id: string;
  user_id: string;
  document_id: string;
  memory_content: string;
  context: string;
  confidence: number;
  source_message_id?: string;
  created_at: string;
}

export interface PersonalCategory {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  created_at: string;
}

export class DocumentService {
  // Get all document templates
  static async getDocumentTemplates(): Promise<DocumentTemplate[]> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Get user's documents
  static async getUserDocuments(userId: string): Promise<UserDocument[]> {
    const { data, error } = await supabase
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('last_updated', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Create a new document
  static async createDocument(document: Omit<UserDocument, 'id' | 'created_at' | 'last_updated'>): Promise<UserDocument> {
    const { data, error } = await supabase
      .from('user_documents')
      .insert(document)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Update a document
  static async updateDocument(id: string, updates: Partial<UserDocument>): Promise<UserDocument> {
    const { data, error } = await supabase
      .from('user_documents')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete a document
  static async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase
      .from('user_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Create document from template
  static async createFromTemplate(userId: string, templateId: string, name?: string): Promise<UserDocument> {
    const template = await this.getDocumentTemplate(templateId);
    if (!template) throw new Error('Template not found');

    const document: Omit<UserDocument, 'id' | 'created_at' | 'last_updated'> = {
      user_id: userId,
      name: name || template.name,
      type: template.category,
      content: template.template_content,
      category: 'business',
      template_id: templateId,
      is_template_based: true
    };

    return this.createDocument(document);
  }

  // Get specific template
  static async getDocumentTemplate(id: string): Promise<DocumentTemplate | null> {
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  // Get personal categories
  static async getPersonalCategories(userId: string): Promise<PersonalCategory[]> {
    const { data, error } = await supabase
      .from('personal_categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // Create personal category
  static async createPersonalCategory(userId: string, name: string, description?: string): Promise<PersonalCategory> {
    const { data, error } = await supabase
      .from('personal_categories')
      .insert({
        user_id: userId,
        name,
        description
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete personal category
  static async deletePersonalCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('personal_categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Get document memories
  static async getDocumentMemories(documentId: string): Promise<DocumentMemory[]> {
    const { data, error } = await supabase
      .from('document_memories')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Create document memory
  static async createDocumentMemory(memory: Omit<DocumentMemory, 'id' | 'created_at'>): Promise<DocumentMemory> {
    const { data, error } = await supabase
      .from('document_memories')
      .insert(memory)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}