import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { PageLayout } from '../components/PageLayout';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ConversationService } from '../services/ConversationService';
import { useContexts } from '../contexts/ContextProvider';
import { UserSettingsService } from '../services/UserSettingsService';
import toast from 'react-hot-toast';
import { 
  Key, 
  FileText, 
  Brain, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Settings as SettingsIcon,
  Users,
  MessageSquare,
  Sliders,
  Archive,
  Eye,
  EyeOff
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Settings() {
  usePageTitle('Settings - Updated'); // Cache bust
  const [googleDocsToken, setGoogleDocsToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // Context and agent preferences
  const { userSettings, saveUserSettings } = useContexts();
  const [contextPrefs, setContextPrefs] = useState({
    auto_create_contexts: true,
    max_contexts: 10,
    context_switching_hotkeys: true,
    show_context_suggestions: true,
  });
  const [agentPrefs, setAgentPrefs] = useState({
    auto_activate_agents: true,
    confidence_threshold: 30,
    max_active_agents: 5,
    agent_suggestions: true,
    agent_notifications: true,
  });
  const [uiPrefs, setUIPrefs] = useState({
    sidebar_position: 'right' as 'left' | 'right',
    show_agent_badges: true,
    show_confidence_scores: true,
  });

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Load existing settings
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data) {
          setGoogleDocsToken(data.google_docs_token || '');
          setGeminiApiKey(data.gemini_api_key || '');
        }
      }
    };
    getUser();
  }, []);

  // Load user preferences when userSettings is available
  useEffect(() => {
    if (userSettings) {
      setContextPrefs(userSettings.context_preferences);
      setAgentPrefs(userSettings.agent_preferences);
      setUIPrefs({
        sidebar_position: userSettings.ui_preferences.sidebar_position,
        show_agent_badges: userSettings.ui_preferences.show_agent_badges,
        show_confidence_scores: userSettings.ui_preferences.show_confidence_scores,
      });
    }
  }, [userSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save API keys directly to database
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          google_docs_token: googleDocsToken,
          gemini_api_key: geminiApiKey,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Save preferences through context provider
      await saveUserSettings({
        google_docs_token: googleDocsToken,
        gemini_api_key: geminiApiKey,
        context_preferences: contextPrefs,
        agent_preferences: agentPrefs,
        ui_preferences: {
          ...userSettings?.ui_preferences!,
          ...uiPrefs,
        },
      });
      
      toast.success('Settings saved successfully');
      setTestResult(null);
    } catch (error: any) {
      console.error('Settings save error:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestGemini = async () => {
    if (!geminiApiKey.trim()) {
      toast.error('Please enter a Gemini API key first');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Save the key first
      await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          google_docs_token: googleDocsToken,
          gemini_api_key: geminiApiKey,
          updated_at: new Date().toISOString()
        });

      // Test the integration
      const result = await ConversationService.testGeminiIntegration(user?.id);
      setTestResult(result);
      
      if (result.success) {
        toast.success('Gemini API integration is working!');
      } else {
        toast.error('Gemini API test failed');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: `Test failed: ${error.message}`
      });
      toast.error('Failed to test Gemini integration');
    } finally {
      setTesting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      toast.error('Failed to sign out');
    }
  };

  return (
    <PageLayout 
      title="Settings" 
      subtitle="Manage your application settings and integrations"
    >
      <div className="max-w-4xl mx-auto">
        <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-6 space-y-6">
        <div className="pb-6 border-b border-border/50">
          <h2 className="text-lg font-medium text-foreground">Account Information</h2>
          <p className="mt-1 text-sm text-muted-foreground">Manage your account details and preferences</p>
          
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
          </div>
          
          <Button
            type="button"
            onClick={handleSignOut}
            variant="destructive"
            className="mt-4"
          >
            Sign Out
          </Button>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div>
          <h2 className="text-lg font-medium text-foreground mb-4">AI Integrations</h2>
            
            <div className="space-y-6">
              {/* Gemini API Key Section */}
              <div className="border border-border/50 rounded-lg p-4 bg-card/70 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Google Gemini API Key
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Required for AI-powered document analysis and smart responses
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                   className="w-full px-4 py-2 border border-border/50 rounded-lg bg-card/60 backdrop-blur-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your Gemini API key (AIza...)"
                  />
                  
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testing || !geminiApiKey.trim()}
                      variant="glass"
                      className="gap-2"
                    >
                      {testing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      <span>{testing ? 'Testing...' : 'Test Integration'}</span>
                    </Button>
                    
                    {testResult && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        testResult.success 
                          ? 'bg-green-500/15 text-green-700 dark:text-green-300' 
                          : 'bg-red-500/15 text-red-700 dark:text-red-300'
                      }`}>
                        {testResult.success ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        <span>{testResult.success ? 'Working' : 'Failed'}</span>
                      </div>
                    )}
                  </div>
                  
                  {testResult && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className={`p-3 rounded-lg text-sm border ${
                        testResult.success 
                          ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/20'
                          : 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20'
                      }`}
                    >
                      {testResult.message}
                    </motion.div>
                  )}
                  
                  <div className="bg-card/60 border border-blue-500/20 rounded-lg p-3 backdrop-blur-xl">
                    <h4 className="text-sm font-medium text-foreground mb-2">How to get your Gemini API key:</h4>
                    <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                      <li>Sign in with your Google account</li>
                      <li>Click "Create API key"</li>
                      <li>Copy the generated key and paste it above</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Google Docs Token Section */}
              <div className="border border-border/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <label className="block text-sm font-medium text-foreground">
                      Google Docs Integration Token
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Optional: For advanced Google Docs integration
                    </p>
                  </div>
                </div>
                
                <input
                  type="password"
                  value={googleDocsToken}
                  onChange={(e) => setGoogleDocsToken(e.target.value)}
                  className="w-full px-4 py-2 border border-border/50 rounded-lg bg-card/60 backdrop-blur-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your Google Docs token (optional)"
                />
              </div>
            </div>
          </div>

          {/* Context Management Preferences */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Context Management
            </h2>
            
            <div className="space-y-4 border border-border/50 rounded-lg p-4 bg-card/70 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Auto-create contexts</label>
                  <p className="text-xs text-muted-foreground">Automatically create new contexts when needed</p>
                </div>
                <input
                  type="checkbox"
                  checked={contextPrefs.auto_create_contexts}
                  onChange={(e) => setContextPrefs(prev => ({ ...prev, auto_create_contexts: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Context switching hotkeys</label>
                  <p className="text-xs text-muted-foreground">Enable keyboard shortcuts for switching contexts</p>
                </div>
                <input
                  type="checkbox"
                  checked={contextPrefs.context_switching_hotkeys}
                  onChange={(e) => setContextPrefs(prev => ({ ...prev, context_switching_hotkeys: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show context suggestions</label>
                  <p className="text-xs text-muted-foreground">Suggest new contexts based on conversation topics</p>
                </div>
                <input
                  type="checkbox"
                  checked={contextPrefs.show_context_suggestions}
                  onChange={(e) => setContextPrefs(prev => ({ ...prev, show_context_suggestions: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Maximum contexts</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={contextPrefs.max_contexts}
                  onChange={(e) => setContextPrefs(prev => ({ ...prev, max_contexts: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/60 backdrop-blur-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum number of active contexts to keep</p>
              </div>
            </div>
          </div>

          {/* Agent Behavior Settings */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Agent Behavior
            </h2>
            
            <div className="space-y-4 border border-border/50 rounded-lg p-4 bg-card/70 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Auto-activate agents</label>
                  <p className="text-xs text-muted-foreground">Automatically add relevant agents to conversations</p>
                </div>
                <input
                  type="checkbox"
                  checked={agentPrefs.auto_activate_agents}
                  onChange={(e) => setAgentPrefs(prev => ({ ...prev, auto_activate_agents: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show agent suggestions</label>
                  <p className="text-xs text-muted-foreground">Display suggested agents based on conversation topic</p>
                </div>
                <input
                  type="checkbox"
                  checked={agentPrefs.agent_suggestions}
                  onChange={(e) => setAgentPrefs(prev => ({ ...prev, agent_suggestions: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Agent notifications</label>
                  <p className="text-xs text-muted-foreground">Show notifications when agents join or leave</p>
                </div>
                <input
                  type="checkbox"
                  checked={agentPrefs.agent_notifications}
                  onChange={(e) => setAgentPrefs(prev => ({ ...prev, agent_notifications: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Auto-activation confidence threshold: {agentPrefs.confidence_threshold}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="90"
                  value={agentPrefs.confidence_threshold}
                  onChange={(e) => setAgentPrefs(prev => ({ ...prev, confidence_threshold: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">Higher values require more confidence before auto-adding agents</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Maximum active agents per context</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={agentPrefs.max_active_agents}
                  onChange={(e) => setAgentPrefs(prev => ({ ...prev, max_active_agents: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/60 backdrop-blur-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
          </div>

          {/* UI Preferences */}
          <div>
            <h2 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-orange-600" />
              Interface Preferences
            </h2>
            
            <div className="space-y-4 border border-border/50 rounded-lg p-4 bg-card/70 backdrop-blur-xl">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Chat sidebar position</label>
                <select
                  value={uiPrefs.sidebar_position}
                  onChange={(e) => setUIPrefs(prev => ({ ...prev, sidebar_position: e.target.value as 'left' | 'right' }))}
                  className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/60 backdrop-blur-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show agent badges</label>
                  <p className="text-xs text-muted-foreground">Display active agent badges in context headers</p>
                </div>
                <input
                  type="checkbox"
                  checked={uiPrefs.show_agent_badges}
                  onChange={(e) => setUIPrefs(prev => ({ ...prev, show_agent_badges: e.target.checked }))}
                  className="rounded"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-foreground">Show confidence scores</label>
                  <p className="text-xs text-muted-foreground">Display confidence percentages in agent suggestions</p>
                </div>
                <input
                  type="checkbox"
                  checked={uiPrefs.show_confidence_scores}
                  onChange={(e) => setUIPrefs(prev => ({ ...prev, show_confidence_scores: e.target.checked }))}
                  className="rounded"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="px-6"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </div>

      {/* API Usage Guidelines */}
      <div className="bg-card/80 border border-border/50 rounded-xl p-6 backdrop-blur-xl">
        <h3 className="text-lg font-medium text-foreground mb-3">AI Integration Guidelines</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Privacy:</strong> Your API key is stored securely and only used for your AI requests</p>
          <p>• <strong>Usage:</strong> API calls are made directly from your browser to Google's servers</p>
          <p>• <strong>Costs:</strong> You'll be charged according to Google's Gemini API pricing</p>
          <p>• <strong>Fallback:</strong> The system works without AI but with limited intelligence</p>
        </div>
      </div>
      </div>
    </PageLayout>
  );
}