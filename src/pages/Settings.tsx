import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Key, FileText, Brain } from 'lucide-react';

export default function Settings() {
  const [googleDocsToken, setGoogleDocsToken] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
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
        });

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error: any) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
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
            <h2 className="text-lg font-medium text-gray-800 mb-4">Integrations</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Google Docs Integration Token
                  </div>
                </label>
                <input
                  type="password"
                  value={googleDocsToken}
                  onChange={(e) => setGoogleDocsToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter your Google Docs token"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Google Gemini API Key
                  </div>
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter your Gemini API key"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}