import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  FolderOpen, 
  Folder, 
  FileText, 
  Plus, 
  Brain, 
  Save, 
  Edit3, 
  Trash2,
  Users,
  Building,
  Target,
  DollarSign,
  Settings,
  Code,
  BarChart3,
  User,
  Bot,
  ChevronDown,
  ChevronRight,
  Zap,
  Loader2,
  Calendar,
  Megaphone,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DocumentService, UserDocument, DocumentTemplate, PersonalCategory } from '../services/DocumentService';
import { ConversationService, ConversationMessage } from '../services/ConversationService';
import { useWebSocket } from '../hooks/useWebSocket';
import CollaborativeEditor from '../components/CollaborativeEditor';
import PresenceIndicator from '../components/PresenceIndicator';
import toast from 'react-hot-toast';
import { useDialog } from '../contexts/DialogContext';

const iconMap: { [key: string]: React.ComponentType<any> } = {
  Target,
  Code,
  DollarSign,
  BarChart3,
  Users,
  Megaphone,
  FileText,
  Building,
  Settings
};

export default function DocumentMemory() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [personalCategories, setPersonalCategories] = useState<PersonalCategory[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<UserDocument | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<{[key: string]: boolean}>({
    personal: true,
    business: true,
    templates: true
  });
  const [user, setUser] = useState<any>(null);
  const [aiStatus, setAiStatus] = useState<'unknown' | 'working' | 'error' | 'no-key'>('unknown');
  const [testingAI, setTestingAI] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showNewTemplateMenu, setShowNewTemplateMenu] = useState(false);
  const [collaborativeMode, setCollaborativeMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const dialog = useDialog();

  const {
    connected: wsConnected,
    activeUsers,
    aiActions,
    joinDocument,
    leaveDocument
  } = useWebSocket(user?.id);

  useEffect(() => {
    initializeUser();
    loadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [loading]);

  const initializeUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      // Check AI integration status
      checkAIStatus(user.id);
    }
  };

  const checkAIStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (!data?.gemini_api_key) {
        setAiStatus('no-key');
      } else {
        setAiStatus('unknown'); // Will test on first use
      }
    } catch (error) {
      console.error('Error checking AI status:', error);
      setAiStatus('error');
    }
  };

  const testAIIntegration = async () => {
    if (!user) return;
    
    setTestingAI(true);
    try {
      const result = await ConversationService.testGeminiIntegration(user.id);
      setAiStatus(result.success ? 'working' : 'error');
      
      if (result.success) {
        toast.success('AI integration is working!');
      } else {
        toast.error(`AI test failed: ${result.message}`);
      }
    } catch (error) {
      setAiStatus('error');
      toast.error('Failed to test AI integration');
    } finally {
      setTestingAI(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load templates, documents, categories, and conversation history
      const [templatesData, documentsData, categoriesData, messagesData] = await Promise.all([
        DocumentService.getDocumentTemplates(),
        DocumentService.getUserDocuments(user.id),
        DocumentService.getPersonalCategories(user.id),
        ConversationService.getConversationHistory(user.id)
      ]);

      setTemplates(templatesData);
      setDocuments(documentsData);
      setPersonalCategories(categoriesData);
      setMessages(messagesData);

      // Initialize missing default categories
      await initializeDefaultCategories(user.id, categoriesData);

      // Initialize default business documents if none exist
      if (documentsData.filter(d => d.category === 'business').length === 0) {
        await initializeDefaultDocuments(user.id, templatesData);
      }

      // Add welcome message if no conversation history
      if (messagesData.length === 0) {
        await addWelcomeMessage(user.id);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    }
  };

  const initializeDefaultDocuments = async (userId: string, templates: DocumentTemplate[]) => {
    try {
      const defaultDocs = await Promise.all(
        templates.slice(0, 3).map(template => 
          DocumentService.createFromTemplate(userId, template.id, template.name)
        )
      );
      setDocuments(prev => [...prev, ...defaultDocs]);
    } catch (error) {
      console.error('Error initializing default documents:', error);
    }
  };

  const initializeDefaultCategories = async (userId: string, existingCategories: PersonalCategory[]) => {
    try {
      const defaultCategories = ['Goals', 'Ideas', 'Notes', 'Projects'];
      const existingCategoryNames = existingCategories.map(cat => cat.name);
      const missingCategories = defaultCategories.filter(name => !existingCategoryNames.includes(name));
      
      if (missingCategories.length > 0) {
        const createPromises = missingCategories.map(name => 
          DocumentService.createPersonalCategory(userId, name)
            .catch(error => {
              // If category already exists (duplicate key), skip it
              if (error.message && error.message.includes('duplicate key')) {
                console.log(`Category ${name} already exists, skipping...`);
                return null;
              }
              throw error;
            })
        );
        
        const createdCategories = await Promise.all(createPromises);
        const validCategories = createdCategories.filter(Boolean) as PersonalCategory[];
        if (validCategories.length > 0) {
          setPersonalCategories(prev => [...prev, ...validCategories]);
        }
      }
    } catch (error) {
      console.error('Error initializing default categories:', error);
      dialog.error('Failed to initialize default categories. Please try refreshing the page.');
    }
  };

  const addWelcomeMessage = async (userId: string) => {
    const welcomeMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
      user_id: userId,
      content: "Hello! I'm your AI document assistant. I can help you manage your personal and business documents by automatically routing our conversation topics to the right documents. Try talking about product features, technical implementations, financial planning, marketing strategies, or any other business topic!",
      sender: 'ai',
      document_updates: [],
      context_confidence: 0
    };

    const saved = await ConversationService.saveMessage(welcomeMessage);
    setMessages([saved]);
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || loading || !user) return;

    setLoading(true);
    
    try {
      // Save user message
      const userMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: currentMessage,
        sender: 'user',
        document_updates: [],
        context_confidence: 0
      };

      const savedUserMessage = await ConversationService.saveMessage(userMessage);
      setMessages(prev => [...prev, savedUserMessage]);

      const messageContent = currentMessage;
      setCurrentMessage('');

      // Process with AI and include business data for context
      const aiResult = await ConversationService.processUserMessage(user.id, messageContent, documents);

      // Update AI status based on result
      if (aiStatus === 'unknown') {
        setAiStatus(aiResult.confidence > 0.5 ? 'working' : 'no-key');
      }

      // Save AI response
      const aiMessage: Omit<ConversationMessage, 'id' | 'created_at'> = {
        user_id: user.id,
        content: aiResult.response,
        sender: 'ai',
        document_updates: aiResult.documentUpdates,
        context_confidence: aiResult.confidence
      };

      const savedAiMessage = await ConversationService.saveMessage(aiMessage);
      setMessages(prev => [...prev, savedAiMessage]);

      // Refresh documents if any were updated
      if (aiResult.documentUpdates.length > 0) {
        const updatedDocs = await DocumentService.getUserDocuments(user.id);
        setDocuments(updatedDocs);
        toast.success(`Updated ${aiResult.documentUpdates.length} document(s)`);
      }

      // Show strategic actions if any were taken
      if (aiResult.strategicActions) {
        const { initiativesCreated, swotItemsCreated } = aiResult.strategicActions;
        if (initiativesCreated > 0 || swotItemsCreated > 0) {
          toast.success(`AI created ${initiativesCreated} initiative(s) and ${swotItemsCreated} SWOT item(s) based on your message`);
        }
      }

    } catch (error) {
      console.error('Error processing message:', error);
      setAiStatus('error');
      toast.error('Failed to process message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const createPersonalDocument = async (categoryName: string) => {
    if (!user) return;

    try {
      const newDoc: Omit<UserDocument, 'id' | 'created_at' | 'last_updated'> = {
        user_id: user.id,
        name: `${categoryName} - ${new Date().toLocaleDateString()}`,
        type: 'personal_note',
        content: `# ${categoryName}\n\nCreated: ${new Date().toLocaleString()}\n\n`,
        category: 'personal',
        subcategory: categoryName,
        is_template_based: false
      };

      const created = await DocumentService.createDocument(newDoc);
      setDocuments(prev => [...prev, created]);
      setSelectedDoc(created);
      toast.success('Personal document created');
    } catch (error) {
      console.error('Error creating personal document:', error);
      toast.error('Failed to create document');
    }
  };

  const createFromTemplate = async (templateId: string, templateName: string) => {
    if (!user) return;

    try {
      const created = await DocumentService.createFromTemplate(user.id, templateId, templateName);
      setDocuments(prev => [...prev, created]);
      setSelectedDoc(created);
      setShowNewTemplateMenu(false);
      toast.success(`Created ${templateName}`);
    } catch (error) {
      console.error('Error creating from template:', error);
      toast.error('Failed to create document from template');
    }
  };

  const addPersonalCategory = async () => {
    if (!newCategoryName.trim() || !user) return;

    try {
      const category = await DocumentService.createPersonalCategory(user.id, newCategoryName.trim());
      setPersonalCategories(prev => [...prev, category]);
      setNewCategoryName('');
      toast.success('Category added');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const saveDocumentEdit = async () => {
    if (!selectedDoc) return;

    try {
      const updated = await DocumentService.updateDocument(selectedDoc.id, {
        content: editContent
      });
      
      setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? updated : d));
      setSelectedDoc(updated);
      setIsEditing(false);
      toast.success('Document saved');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const deleteDocument = async (doc: UserDocument) => {
    dialog.confirm(
      'Are you sure you want to delete this document?',
      async () => {
        try {
          await DocumentService.deleteDocument(doc.id);
          setDocuments(prev => prev.filter(d => d.id !== doc.id));
          if (selectedDoc?.id === doc.id) {
            setSelectedDoc(null);
          }
          toast.success('Document deleted');
        } catch (error) {
          console.error('Error deleting document:', error);
          toast.error('Failed to delete document');
        }
      }
    );
  };

  const getIconComponent = (iconName: string) => {
    return iconMap[iconName] || FileText;
  };

  // Filter documents based on search term and category
  const filteredBusinessDocs = documents
    .filter(d => d.category === 'business')
    .filter(d => searchTerm ? 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.content.toLowerCase().includes(searchTerm.toLowerCase()) 
      : true
    );

  const filteredPersonalDocs = documents
    .filter(d => d.category === 'personal')
    .filter(d => searchTerm ? 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.content.toLowerCase().includes(searchTerm.toLowerCase()) 
      : true
    );

  const filteredTemplates = templates
    .filter(t => selectedCategory === 'all' ? true : t.category === selectedCategory)
    .filter(t => searchTerm ? 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.keywords.some(k => k.toLowerCase().includes(searchTerm.toLowerCase()))
      : true
    );

  const getAIStatusIndicator = () => {
    switch (aiStatus) {
      case 'working':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">AI Active</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="w-4 h-4" />
            <span className="text-sm">AI Error</span>
          </div>
        );
      case 'no-key':
        return (
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">No AI Key</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 text-gray-600">
            <Zap className="w-4 h-4" />
            <span className="text-sm">Smart Routing</span>
          </div>
        );
    }
  };

  const documentCategories = ['all', 'product', 'engineering', 'finance', 'strategy', 'operations', 'marketing', 'technical', 'legal'];

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Brain className="w-6 h-6 text-emerald-600" />
            AI Document Memory
          </h1>
          
          {/* Search bar */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          
          {/* AI Status Indicator */}
          <div className="mt-3 flex items-center justify-between">
            {getAIStatusIndicator()}
            {aiStatus !== 'working' && (
              <button
                onClick={testAIIntegration}
                disabled={testingAI}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {testingAI ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Zap className="w-3 h-3" />
                )}
                Test AI
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {/* Template Library */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setExpandedFolders(prev => ({ ...prev, templates: !prev.templates }))}
                className="flex items-center gap-2 w-full text-left text-gray-700 hover:text-gray-900"
              >
                {expandedFolders.templates ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <FolderOpen className="w-5 h-5 text-emerald-600" />
                <span className="font-medium">Templates Library</span>
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowNewTemplateMenu(!showNewTemplateMenu)}
                  className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                  title="Create from template"
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                {showNewTemplateMenu && (
                  <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <div className="py-1 text-sm text-gray-700">
                      <div className="px-3 py-2 font-medium border-b border-gray-100">
                        Create from template
                      </div>
                      {templates.slice(0, 5).map(template => (
                        <button
                          key={template.id}
                          onClick={() => createFromTemplate(template.id, template.name)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100"
                        >
                          {template.name}
                        </button>
                      ))}
                      <div className="border-t border-gray-100 px-3 py-1">
                        <a 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setShowNewTemplateMenu(false);
                            setExpandedFolders(prev => ({ ...prev, templates: true }));
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-700"
                        >
                          View all templates
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {expandedFolders.templates && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {/* Category Filter */}
                  <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-2">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        selectedCategory === 'all' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      All
                    </button>
                    {documentCategories.slice(1).map(category => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-2 py-1 text-xs rounded capitalize whitespace-nowrap ${
                          selectedCategory === category ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  
                  {/* Template List */}
                  <div className="ml-6 space-y-1 max-h-40 overflow-y-auto">
                    {filteredTemplates.map(template => {
                      const IconComponent = getIconComponent(template.icon);
                      
                      return (
                        <div key={template.id} className="group">
                          <button
                            onClick={() => createFromTemplate(template.id, template.name)}
                            className="flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-gray-100 text-gray-600"
                            title={template.description || ''}
                          >
                            <IconComponent className="w-4 h-4 text-emerald-600" />
                            <div>
                              <span className="text-sm">{template.name}</span>
                              <div className="flex gap-1 mt-0.5">
                                {template.keywords.slice(0, 2).map((keyword, i) => (
                                  <span key={i} className="text-[10px] text-gray-500 px-1 bg-gray-50 rounded">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                createFromTemplate(template.id, template.name);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-emerald-100 rounded ml-auto"
                            >
                              <Plus className="w-3 h-3 text-emerald-600" />
                            </button>
                          </button>
                        </div>
                      );
                    })}
                    
                    {filteredTemplates.length === 0 && (
                      <div className="py-2 text-center text-gray-500 text-xs">
                        No matching templates found
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Business Documents */}
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={() => setExpandedFolders(prev => ({ ...prev, business: !prev.business }))}
              className="flex items-center gap-2 w-full text-left mb-3 text-gray-700 hover:text-gray-900"
            >
              {expandedFolders.business ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Building className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Business Documents</span>
            </button>

            <AnimatePresence>
              {expandedFolders.business && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 space-y-1"
                >
                  {filteredBusinessDocs.length === 0 ? (
                    <div className="py-2 text-center text-gray-500 text-xs">
                      No business documents found
                    </div>
                  ) : (
                    filteredBusinessDocs.map(doc => {
                      const template = templates.find(t => t.id === doc.template_id);
                      const IconComponent = template ? getIconComponent(template.icon) : FileText;
                      
                      return (
                        <div key={doc.id} className="group">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className={`flex items-center gap-2 w-full p-2 rounded-lg text-left hover:bg-gray-100 ${
                              selectedDoc?.id === doc.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600'
                            }`}
                          >
                            <IconComponent className="w-4 h-4" />
                            <span className="truncate flex-1 text-sm">{doc.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDocument(doc);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          </button>
                        </div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Personal Documents */}
          <div className="p-4">
            <button
              onClick={() => setExpandedFolders(prev => ({ ...prev, personal: !prev.personal }))}
              className="flex items-center gap-2 w-full text-left mb-3 text-gray-700 hover:text-gray-900"
            >
              {expandedFolders.personal ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <User className="w-5 h-5 text-green-600" />
              <span className="font-medium">Personal Documents</span>
            </button>

            <AnimatePresence>
              {expandedFolders.personal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="ml-6 space-y-3"
                >
                  {personalCategories.map(category => (
                    <div key={category.id}>
                      <div className="flex items-center justify-between group">
                        <span className="text-sm font-medium text-gray-600">{category.name}</span>
                        <button
                          onClick={() => createPersonalDocument(category.name)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-green-100 rounded"
                        >
                          <Plus className="w-3 h-3 text-green-600" />
                        </button>
                      </div>
                      
                      <div className="ml-2 space-y-1">
                        {filteredPersonalDocs
                          .filter(doc => doc.subcategory === category.name)
                          .map(doc => (
                            <div key={doc.id} className="group">
                              <button
                                onClick={() => setSelectedDoc(doc)}
                                className={`flex items-center gap-2 w-full p-1 rounded text-left hover:bg-gray-100 ${
                                  selectedDoc?.id === doc.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-500'
                                }`}
                              >
                                <FileText className="w-3 h-3" />
                                <span className="truncate flex-1 text-xs">{doc.name}</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteDocument(doc);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded"
                                >
                                  <Trash2 className="w-2 h-2 text-red-500" />
                                </button>
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}

                  {/* Add new category */}
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name"
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                      onKeyPress={(e) => e.key === 'Enter' && addPersonalCategory()}
                    />
                    <button
                      onClick={addPersonalCategory}
                      disabled={!newCategoryName.trim()}
                      className="w-full px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      Add Category
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Interface */}
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 bg-white border-b border-gray-200">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
              <div className="ml-auto flex items-center gap-4">
                {getAIStatusIndicator()}
                {aiStatus === 'no-key' && (
                  <a
                    href="/settings"
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Add API Key
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 space-y-4">
            {messages.map(message => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}>
                  <div className="flex items-start gap-2">
                    {message.sender === 'ai' && <Bot className="w-4 h-4 mt-1 text-emerald-600" />}
                    <div className="flex-1">
                      <p className="text-sm">{message.content}</p>
                      {message.document_updates && message.document_updates.length > 0 && (
                        <div className="mt-2 text-xs opacity-75">
                          Updated: {message.document_updates.join(', ')}
                        </div>
                      )}
                      {message.sender === 'ai' && message.context_confidence > 0 && (
                        <div className="mt-1 text-xs opacity-60">
                          Confidence: {Math.round(message.context_confidence * 100)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span className="text-sm text-gray-600">
                      {aiStatus === 'working' ? 'AI is analyzing...' : 'Processing...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-white border-t border-gray-200">
            <div className="flex gap-2">
              <input
                ref={chatInputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  aiStatus === 'working' 
                    ? "Tell me about your business or share information to save..." 
                    : "Share information to organize in your documents..."
                }
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || loading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Document Viewer */}
        {selectedDoc && (
          <div className="w-1/2 bg-white border-l border-gray-200 flex flex-col">
            {/* Document Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">{selectedDoc.name}</h3>
                  <button
                    onClick={() => setCollaborativeMode(!collaborativeMode)}
                    className={`px-2 py-1 text-xs rounded ${
                      collaborativeMode 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}
                    title="Toggle collaborative editing"
                  >
                    {collaborativeMode ? 'Collaborative' : 'Solo'}
                  </button>
                </div>
                <div className="flex items-center mt-1">
                  <p className="text-xs text-gray-500 mr-2">
                    Last updated: {new Date(selectedDoc.last_updated).toLocaleString()}
                  </p>
                  {selectedDoc.is_template_based && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Template
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full ml-2 capitalize">
                    {selectedDoc.category}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Presence Indicator */}
                {collaborativeMode && (
                  <PresenceIndicator 
                    presence={activeUsers} 
                    maxVisible={3}
                    className="mr-2"
                  />
                )}
                
                {isEditing ? (
                  <>
                    <button
                      onClick={saveDocumentEdit}
                      className="px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsEditing(true);
                      setEditContent(selectedDoc.content);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Document Content - Collaborative or Solo */}
            <div className="flex-1 overflow-auto p-4">
              {collaborativeMode ? (
                <CollaborativeEditor
                  document={selectedDoc}
                  onDocumentUpdate={(updated) => {
                    setDocuments(prev => prev.map(d => d.id === updated.id ? updated : d));
                    setSelectedDoc(updated);
                  }}
                  className="h-full"
                />
              ) : (
                <>
                  {isEditing ? (
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-full p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                        {selectedDoc.content}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}