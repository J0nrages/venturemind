import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ConversationService } from '../services/ConversationService';
import toast from 'react-hot-toast';
import { Key, FileText, Brain, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Settings() {
  usePageTitle('Settings');
  const [googleDocsToken, setGoogleDocsToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [user, setUser] = useState<any>(null);

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          google_docs_token: googleDocsToken,
          gemini_api_key: geminiApiKey,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success('Settings saved successfully');
      setTestResult(null); // Clear previous test results
    } catch (error: any) {
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
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application settings and integrations</p>
      </div>

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
  );
}