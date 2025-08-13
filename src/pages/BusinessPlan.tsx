import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  Users,
  TrendingUp,
  Brain,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  Building2,
  Plus,
  CheckCircle,
  Clock,
  Target,
  Edit3,
  Trash2,
  Database,
  AlertTriangle
} from 'lucide-react';
import ConversationalSetup from '../components/ConversationalSetup';
import AgenticAIChatOrchestrator from '../components/AgenticAIChatOrchestrator';
import { useBusinessData } from '../hooks/useBusinessData';
import { useStrategicData } from '../hooks/useStrategicData';
import { useChatSidebar } from '../hooks/useChatSidebar';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDialog } from '../contexts/DialogContext';

export default function BusinessPlan() {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [newInitiativeTitle, setNewInitiativeTitle] = useState('');
  const [showNewInitiativeForm, setShowNewInitiativeForm] = useState(false);
  const dialog = useDialog();

  const { 
    profile, 
    dashboardData, 
    customerData, 
    loading: businessLoading, 
    error: businessError,
    needsSetup,
    refreshData 
  } = useBusinessData();

  const {
    initiatives,
    swotByCategory,
    liveMetrics,
    loading: strategicLoading,
    toggleInitiative,
    createInitiative,
    deleteInitiative,
    refreshData: refreshStrategicData
  } = useStrategicData();

  const {
    isOpen: isChatOpen,
    position: chatPosition,
    toggleSidebar: toggleChat,
    changePosition: changeChatPosition
  } = useChatSidebar();

  const loading = businessLoading || strategicLoading;

  const handleCardClick = (type: string) => {
    if (selectedCard === type) {
      navigate(`/swot/${type}`);
    } else {
      setSelectedCard(type);
    }
  };

  const handleAddInitiative = async () => {
    if (!newInitiativeTitle.trim()) return;

    try {
      await createInitiative({
        title: newInitiativeTitle,
        category: 'general',
        status: 'planned',
        priority: 2,
        created_by: 'user',
        metadata: {}
      });
      setNewInitiativeTitle('');
      setShowNewInitiativeForm(false);
    } catch (error) {
      console.error('Error adding initiative:', error);
    }
  };

  const handleDeleteInitiative = (id: string) => {
    dialog.confirm(
      'Are you sure you want to delete this initiative?',
      async () => {
        try {
          await deleteInitiative(id);
          toast.success('Initiative deleted successfully');
        } catch (error) {
          console.error('Error deleting initiative:', error);
          toast.error('Failed to delete initiative');
        }
      }
    );
  };

  // Remove the loading state entirely - render UI immediately
  if (businessError && !needsSetup) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Business Plan</h3>
          <p className="text-gray-600 mb-4">{businessError}</p>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (needsSetup) {
    return <ConversationalSetup onComplete={refreshData} />;
  }

  const companyName = profile?.company_name || 'DocuMind AI';
  const industry = profile?.industry || 'SaaS';
  
  // Use ONLY real data - no fallbacks
  const totalCustomers = liveMetrics?.customers.total || 0;
  const currentRevenue = liveMetrics?.revenue.current || 0;
  const hasRevenueData = liveMetrics?.revenue.hasData || false;
  const hasCustomerData = liveMetrics?.customers.hasData || false;
  const hasPerformanceData = liveMetrics?.performance.hasData || false;

  // Adjust main content based on chat sidebar position and state
  const mainContentClass = `w-full px-4 lg:px-6 space-y-6 lg:space-y-8 transition-all duration-300 ${
    isChatOpen ? 
      (chatPosition === 'left' ? 'lg:ml-80' : 'lg:mr-80') : 
      'max-w-7xl mx-auto'
  }`;

  const DataStatusIndicator = ({ hasData, label }: { hasData: boolean; label: string }) => (
    <div className={`flex items-center gap-1 text-xs ${hasData ? 'text-green-600' : 'text-gray-400'}`}>
      {hasData ? <Database className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      <span>{hasData ? 'Live Data' : 'No Data'}</span>
    </div>
  );

  return (
    <>
      <div className={mainContentClass}>
        <div className="text-center space-y-3 lg:space-y-4">
          <h1 className="text-2xl lg:text-4xl font-semibold text-gray-800 break-words">
            {companyName}
          </h1>
          <h2 className="text-lg lg:text-xl text-gray-600 break-words">
            {industry === 'SaaS' ? 'Series A Metrics Dashboard' : `${industry} Business Dashboard`}
          </h2>
          
          <div className="flex items-center justify-center gap-4 lg:gap-8 text-xs lg:text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="break-words">
                {hasCustomerData ? 
                  `${totalCustomers.toLocaleString()} customers` :
                  'No customer data'
                }
              </span>
            </div>
            <DataStatusIndicator hasData={hasCustomerData} label="customers" />
          </div>
        </div>

        <div className="mt-8 lg:mt-16">
          <div className={`grid gap-4 lg:gap-6 ${isChatOpen ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1 lg:grid-cols-12'}`}>
            {/* Revenue & Growth */}
            <div className={`${isChatOpen ? 'xl:col-span-4' : 'lg:col-span-4'} space-y-4 lg:space-y-6`}>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Revenue</h3>
                  <DataStatusIndicator hasData={hasRevenueData} label="revenue" />
                </div>
                
                {hasRevenueData ? (
                  <>
                    <div className="text-xl lg:text-2xl xl:text-3xl font-semibold text-emerald-600 break-words">
                      ${currentRevenue.toLocaleString()}
                    </div>
                    
                    {/* Revenue trending chart */}
                    {liveMetrics?.revenue.trending && liveMetrics.revenue.trending.length > 0 && (
                      <div className="h-24 lg:h-32 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={liveMetrics.revenue.trending} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <Area 
                              type="monotone" 
                              dataKey="value" 
                              stroke="#10B981" 
                              fill="#10B981" 
                              fillOpacity={0.2}
                            />
                            <XAxis dataKey="date" hide />
                            <YAxis hide />
                            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mt-3 text-sm text-emerald-600">
                      <TrendingUp className="w-4 h-4" />
                      <span className="break-words">{liveMetrics?.revenue.change > 0 ? '+' : ''}{liveMetrics?.revenue.change || 0}%</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 lg:py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No revenue data available</p>
                    <p className="text-gray-400 text-xs mt-1">Add subscriptions to see metrics</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm lg:text-base">AI Processing</h4>
                    {hasPerformanceData ? (
                      <p className="text-sm text-gray-500 break-words">
                        {liveMetrics?.performance.processingSpeed || 0}ms avg · {liveMetrics?.performance.accuracyRate || 0}% accuracy
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400">No performance data</p>
                    )}
                  </div>
                  <DataStatusIndicator hasData={hasPerformanceData} label="performance" />
                </div>
                
                <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800 text-sm lg:text-base">Documents</h4>
                    <p className="text-sm text-gray-500">Available in Document Memory</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Metrics */}
            <div className={`${isChatOpen ? 'xl:col-span-4' : 'lg:col-span-4'} space-y-4 lg:space-y-6`}>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-gray-800">Key Metrics</h3>
                  <DataStatusIndicator hasData={hasPerformanceData} label="metrics" />
                </div>
                
                {hasPerformanceData ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Processing Speed</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs lg:text-sm font-medium">{liveMetrics?.performance.processingSpeed || 0}ms</span>
                        <div className="w-16 lg:w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="w-[92%] h-full bg-emerald-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Accuracy Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs lg:text-sm font-medium">{liveMetrics?.performance.accuracyRate || 0}%</span>
                        <div className="w-16 lg:w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="w-[99%] h-full bg-blue-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">API Uptime</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs lg:text-sm font-medium">{liveMetrics?.performance.apiUptime || 0}%</span>
                        <div className="w-16 lg:w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="w-[99%] h-full bg-purple-500 rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 lg:py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No performance data available</p>
                    <p className="text-gray-400 text-xs mt-1">API usage will generate metrics</p>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Customer Success</h3>
                  <DataStatusIndicator hasData={hasCustomerData} label="customers" />
                </div>
                
                {hasCustomerData && liveMetrics?.customers.segments && Object.keys(liveMetrics.customers.segments).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(liveMetrics.customers.segments).map(([segment, count], index) => {
                      const percentage = Math.round((count / liveMetrics.customers.total) * 100);
                      const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-emerald-500'];
                      const width = Math.min(60, Math.max(20, percentage * 1.5)); // Scale for visual appeal, constrain max width
                      return (
                        <div key={segment} className="flex items-center gap-2">
                          <div className={`h-2 ${colors[index % colors.length]} rounded-full flex-shrink-0`} style={{ width: `${Math.max(width, 20)}px` }}></div>
                          <span className="text-sm text-gray-600 break-words">{segment} ({count}, {percentage}%)</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 lg:py-8">
                    <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No customer segment data</p>
                    <p className="text-gray-400 text-xs mt-1">Add subscriptions to see breakdown</p>
                  </div>
                )}
              </div>
            </div>

            {/* Strategy & Operations */}
            <div className={`${isChatOpen ? 'xl:col-span-4' : 'lg:col-span-4'} space-y-4 lg:space-y-6`}>
              <div className={`grid gap-2 lg:gap-3 ${isChatOpen ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-2'}`}>
                {['strengths', 'weaknesses', 'opportunities', 'threats'].map((type) => {
                  const items = swotByCategory[type as keyof typeof swotByCategory] || [];
                  const colors = {
                    strengths: 'blue',
                    weaknesses: 'orange', 
                    opportunities: 'green',
                    threats: 'red'
                  };
                  const color = colors[type as keyof typeof colors];
                  
                  return (
                    <motion.button
                      key={type}
                      onClick={() => handleCardClick(type)}
                      className={`bg-${color}-50 p-3 lg:p-4 rounded-xl text-left transition-all cursor-pointer min-h-[80px] flex flex-col justify-center
                        ${selectedCard === type ? `ring-2 ring-offset-2 ring-${color}-500` : 'hover:shadow-md'}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <h4 className={`text-${color}-600 font-medium mb-1 lg:mb-2 capitalize text-sm lg:text-base`}>{type}</h4>
                      <p className="text-xs lg:text-sm text-gray-600">
                        {items.length > 0 ? `${items.length} items` : 'No items yet'}
                      </p>
                      {selectedCard === type && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`mt-1 lg:mt-2 text-xs text-${color}-500 break-words`}
                        >
                          Click again to view details
                        </motion.p>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div className="bg-white p-4 lg:p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Strategic Initiatives</h3>
                  <button
                    onClick={() => setShowNewInitiativeForm(true)}
                    className="p-1.5 text-gray-400 hover:text-emerald-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {showNewInitiativeForm && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={newInitiativeTitle}
                      onChange={(e) => setNewInitiativeTitle(e.target.value)}
                      placeholder="New initiative..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddInitiative()}
                    />
                    <div className="flex gap-2 mt-2.5">
                      <button
                        onClick={handleAddInitiative}
                        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setShowNewInitiativeForm(false);
                          setNewInitiativeTitle('');
                        }}
                        className="px-3 py-1.5 text-xs bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2 max-h-40 lg:max-h-56 overflow-y-auto">
                  {initiatives.slice(0, 10).map((initiative) => (
                    <div key={initiative.id} className="flex items-start gap-2.5 group">
                      <button
                        onClick={() => toggleInitiative(initiative.id)}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5 ${
                          initiative.status === 'completed'
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 hover:border-emerald-500'
                        }`}
                      >
                        {initiative.status === 'completed' && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <span className={`text-xs lg:text-sm flex-1 break-words leading-relaxed ${
                        initiative.status === 'completed' 
                          ? 'text-gray-500 line-through' 
                          : 'text-gray-600'
                      }`}>
                        {initiative.title}
                      </span>
                      {initiative.created_by === 'ai' && (
                        <Brain className="w-3 h-3 text-purple-400" />
                      )}
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 flex-shrink-0">
                        {initiative.priority === 1 && (
                          <Star className="w-3 h-3 text-yellow-500" />
                        )}
                        {initiative.due_date && (
                          <Clock className="w-3 h-3 text-gray-400" />
                        )}
                        <button
                          onClick={() => handleDeleteInitiative(initiative.id)}
                          className="p-0.5 text-red-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {initiatives.length === 0 && (
                    <p className="text-xs lg:text-sm text-gray-500 text-center py-4">
                      No initiatives yet. Add one above!
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white p-5 lg:p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Growth Metrics</h3>
                  <div className="flex items-center gap-2">
                    <DataStatusIndicator hasData={liveMetrics?.financial.hasData || false} label="financials" />
                    <button
                      onClick={() => {
                        refreshData();
                        refreshStrategicData();
                      }}
                      className="p-1 text-gray-400 hover:text-emerald-600 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {liveMetrics?.financial.hasData ? (
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Customer LTV</span>
                      <span className="font-medium break-all">${(liveMetrics.financial.ltv || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">CAC</span>
                      <span className="font-medium break-all">
                        {liveMetrics.financial.cac > 0 ? `$${liveMetrics.financial.cac.toLocaleString()}` : 'No data'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Payback</span>
                      <span className="font-medium break-all">
                        {liveMetrics.financial.ltv > 0 && liveMetrics.financial.cac > 0 
                          ? `${(liveMetrics.financial.cac / (liveMetrics.financial.mrr / liveMetrics.customers.total)).toFixed(1)} months`
                          : 'No data'
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Churn Rate</span>
                      <span className="font-medium break-all">{liveMetrics.financial.churnRate || 0}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No financial data available</p>
                    <p className="text-gray-400 text-xs mt-1 break-words">Add subscriptions to calculate</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <AgenticAIChatOrchestrator
        isOpen={isChatOpen}
        onToggle={toggleChat}
        position={chatPosition}
        onPositionChange={changeChatPosition}
      />
    </>
  );
}