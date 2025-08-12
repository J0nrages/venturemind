import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { ConversationService } from '../services/ConversationService';
import toast from 'react-hot-toast';
import { Key, FileText, Brain, TestTube, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function Settings() {
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
        <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your application settings and integrations</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div className="pb-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-800">Account Information</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your account details and preferences</p>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">Email: {user?.email}</p>
          </div>
          
          <button
            onClick={handleSignOut}
            className="mt-4 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4">AI Integrations</h2>
            
            <div className="space-y-6">
              {/* Gemini API Key Section */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center gap-3 mb-3">
                  <Brain className="w-5 h-5 text-purple-600" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Google Gemini API Key
                    </label>
                    <p className="text-xs text-gray-500">
                      Required for AI-powered document analysis and smart responses
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your Gemini API key (AIza...)"
                  />
                  
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestGemini}
                      disabled={testing || !geminiApiKey.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                      <span>{testing ? 'Testing...' : 'Test Integration'}</span>
                    </button>
                    
                    {testResult && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        testResult.success 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
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
                      className={`p-3 rounded-lg text-sm ${
                        testResult.success 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {testResult.message}
                    </motion.div>
                  )}
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">How to get your Gemini API key:</h4>
                    <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Visit <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                      <li>Sign in with your Google account</li>
                      <li>Click "Create API key"</li>
                      <li>Copy the generated key and paste it above</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Google Docs Token Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Google Docs Integration Token
                    </label>
                    <p className="text-xs text-gray-500">
                      Optional: For advanced Google Docs integration
                    </p>
                  </div>
                </div>
                
                <input
                  type="password"
                  value={googleDocsToken}
                  onChange={(e) => setGoogleDocsToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your Google Docs token (optional)"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* API Usage Guidelines */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h3 className="text-lg font-medium text-amber-900 mb-3">AI Integration Guidelines</h3>
        <div className="space-y-2 text-sm text-amber-800">
          <p>• <strong>Privacy:</strong> Your API key is stored securely and only used for your AI requests</p>
          <p>• <strong>Usage:</strong> API calls are made directly from your browser to Google's servers</p>
          <p>• <strong>Costs:</strong> You'll be charged according to Google's Gemini API pricing</p>
          <p>• <strong>Fallback:</strong> The system works without AI but with limited intelligence</p>
        </div>
      </div>
    </div>
  );
}