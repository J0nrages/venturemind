import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Settings,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  CreditCard,
  BarChart3,
  Target,
  Users,
  MessageCircle,
  Building2,
  TrendingUp,
  AlertCircle,
  Loader2,
  Zap
} from 'lucide-react';
import { IntegrationService, ApiIntegration, IntegrationTemplate } from '../services/IntegrationService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useDialog } from '../contexts/DialogContext';

const iconMap: { [key: string]: React.ComponentType<any> } = {
  CreditCard,
  BarChart3,
  Target,
  Users,
  MessageCircle,
  Building2,
  TrendingUp
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<IntegrationTemplate | null>(null);
  const [setupData, setSetupData] = useState<{ [key: string]: string }>({});
  const [testingConnection, setTestingConnection] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const dialog = useDialog();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const [userIntegrations, templates] = await Promise.all([
          IntegrationService.getUserIntegrations(user.id),
          Promise.resolve(IntegrationService.getAvailableIntegrations())
        ]);

        setIntegrations(userIntegrations);
        setAvailableIntegrations(templates);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupIntegration = (template: IntegrationTemplate) => {
    setSelectedTemplate(template);
    setSetupData({});
    setShowSetupModal(true);
  };

  const handleTestConnection = async () => {
    if (!selectedTemplate) return;

    setTestingConnection(true);
    try {
      const result = await IntegrationService.testConnection(selectedTemplate.platform, setupData);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Connection test failed: ' + error.message);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleCreateIntegration = async () => {
    if (!selectedTemplate || !user) return;

    try {
      const integration = await IntegrationService.createIntegration(
        user.id,
        selectedTemplate.platform,
        setupData
      );

      setIntegrations(prev => [integration, ...prev]);
      setShowSetupModal(false);
      toast.success(`${selectedTemplate.display_name} integration created successfully!`);
    } catch (error: any) {
      toast.error('Failed to create integration: ' + error.message);
    }
  };

  const handleDeleteIntegration = async (integration: ApiIntegration) => {
    dialog.confirm(
      `Are you sure you want to delete the ${integration.display_name} integration?`,
      async () => {
        try {
          await IntegrationService.deleteIntegration(integration.id);
          setIntegrations(prev => prev.filter(i => i.id !== integration.id));
          toast.success('Integration deleted successfully');
        } catch (error: any) {
          toast.error('Failed to delete integration: ' + error.message);
        }
      }
    );
  };

  const handleSyncNow = async (integration: ApiIntegration) => {
    try {
      await IntegrationService.triggerSync(integration.id, 'incremental');
      
      // Update local state
      setIntegrations(prev => prev.map(i => 
        i.id === integration.id 
          ? { ...i, sync_status: 'syncing' }
          : i
      ));
      
      toast.success('Sync started! This may take a few moments.');
      
      // Refresh data after a delay
      setTimeout(() => {
        loadData();
      }, 3000);
    } catch (error: any) {
      toast.error('Failed to start sync: ' + error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'syncing':
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const categories = ['all', 'payments', 'analytics', 'product', 'crm', 'support', 'marketing'];
  const filteredTemplates = selectedCategory === 'all' 
    ? availableIntegrations 
    : availableIntegrations.filter(t => t.category === selectedCategory);

  const connectedPlatforms = integrations.map(i => i.platform);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-gray-600">Loading integrations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">API Integrations</h1>
          <p className="text-gray-500 mt-1">Connect your business tools to sync real-time data</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
            integrations.length > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
          }`}>
            <Zap className="w-4 h-4" />
            <span>{integrations.length} Connected</span>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Connected Integrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const template = availableIntegrations.find(t => t.platform === integration.platform);
              const IconComponent = template ? iconMap[template.icon] || Target : Target;
              
              return (
                <motion.div
                  key={integration.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 rounded-lg">
                        <IconComponent className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800">{integration.display_name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatusIcon(integration.sync_status)}
                          <span className="text-sm text-gray-500 capitalize">{integration.sync_status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSyncNow(integration)}
                        disabled={integration.sync_status === 'syncing'}
                        className="p-1 text-gray-400 hover:text-emerald-600 disabled:opacity-50"
                        title="Sync now"
                      >
                        <RefreshCw className={`w-4 h-4 ${integration.sync_status === 'syncing' ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={() => handleDeleteIntegration(integration)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete integration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Data Points Synced:</span>
                      <span className="font-medium">{integration.data_points_synced.toLocaleString()}</span>
                    </div>
                    {integration.last_sync_at && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Sync:</span>
                        <span className="font-medium">
                          {new Date(integration.last_sync_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {integration.sync_error && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
                        {integration.sync_error}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">Available Integrations</h2>
          <div className="flex gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-sm rounded-lg capitalize ${
                  selectedCategory === category
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const IconComponent = iconMap[template.icon] || Target;
            const isConnected = connectedPlatforms.includes(template.platform);
            
            return (
              <motion.div
                key={template.platform}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <IconComponent className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{template.display_name}</h3>
                      <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                    </div>
                  </div>
                  <a
                    href={template.documentation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600"
                    title="Documentation"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-500 mb-2">Data Types:</div>
                  <div className="flex flex-wrap gap-1">
                    {template.data_types.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={() => handleSetupIntegration(template)}
                  disabled={isConnected}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    isConnected
                      ? 'bg-green-100 text-green-700 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isConnected ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Connected
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="w-4 h-4" />
                      Connect
                    </div>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const IconComponent = iconMap[selectedTemplate.icon] || Target;
                  return <IconComponent className="w-6 h-6 text-emerald-600" />;
                })()}
                <h2 className="text-xl font-semibold">Connect {selectedTemplate.display_name}</h2>
              </div>
              
              <p className="text-gray-600 mb-6">{selectedTemplate.description}</p>
              
              <div className="space-y-4">
                {selectedTemplate.setup_fields.map((field) => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    <input
                      type={field.type}
                      value={setupData[field.name] || ''}
                      onChange={(e) => setSetupData(prev => ({
                        ...prev,
                        [field.name]: e.target.value
                      }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setShowSetupModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testingConnection}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleCreateIntegration}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Getting Started Guide */}
      {integrations.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Get Started with Real Data</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>• <strong>Connect Stripe:</strong> Sync payments and subscription data for accurate MRR tracking</p>
            <p>• <strong>Add PostHog:</strong> Get real user analytics and product engagement metrics</p>
            <p>• <strong>Link HubSpot/Salesforce:</strong> Pull CRM data for complete customer insights</p>
            <p>• <strong>Integrate Analytics:</strong> Connect Google Analytics or Mixpanel for traffic data</p>
          </div>
          <div className="mt-4 p-3 bg-blue-100 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">Why integrate?</p>
                <p>Instead of seeing empty charts and zero metrics, connected integrations automatically populate your dashboard with real business data, giving you actionable insights.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}