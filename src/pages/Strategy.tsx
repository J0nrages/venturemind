import { Card } from '@/components/ui/card';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Plus, 
  Star, 
  Calendar, 
  Check, 
  AlertTriangle, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Clock,
  Edit3,
  AlertCircle,
  Loader2,
  PlusCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import MetricCard from '../components/MetricCard';
import { useStrategicData } from '../hooks/useStrategicData';
import { SwotItem, StrategicInitiative } from '../services/StrategicService';
import toast from 'react-hot-toast';
import { useDialog } from '../contexts/DialogContext';

export default function Strategy() {
  const [activeTab, setActiveTab] = useState('initiatives');
  const [showNewItem, setShowNewItem] = useState(false);
  const [showItemDetails, setShowItemDetails] = useState<string | null>(null);
  const [newItemData, setNewItemData] = useState({
    title: '',
    description: '',
    category: activeTab === 'initiatives' ? 'general' : 'strengths',
    priority: 3,
    dueDate: ''
  });

  const {
    initiatives,
    swotItems,
    swotByCategory,
    initiativesByCategory,
    liveMetrics,
    loading,
    error,
    refreshData,
    createInitiative,
    updateInitiative,
    toggleInitiative,
    deleteInitiative,
    createSwotItem,
    updateSwotItem,
    deleteSwotItem
  } = useStrategicData();
  
  const dialog = useDialog();

  const handleCreateItem = async () => {
    try {
      if (activeTab === 'initiatives') {
        await createInitiative({
          title: newItemData.title,
          description: newItemData.description,
          category: newItemData.category as any,
          priority: Number(newItemData.priority),
          status: 'planned',
          due_date: newItemData.dueDate || undefined,
          created_by: 'user',
          metadata: {}
        });
      } else {
        await createSwotItem({
          category: newItemData.category as any,
          title: newItemData.title,
          description: newItemData.description,
          priority: Number(newItemData.priority),
          source: 'user',
          metadata: {},
          is_active: true
        });
      }

      setNewItemData({
        title: '',
        description: '',
        category: activeTab === 'initiatives' ? 'general' : 'strengths',
        priority: 3,
        dueDate: ''
      });
      setShowNewItem(false);
      
      toast.success(`${activeTab === 'initiatives' ? 'Initiative' : 'SWOT item'} created successfully`);
    } catch (error) {
      console.error(`Error creating ${activeTab === 'initiatives' ? 'initiative' : 'SWOT item'}:`, error);
      toast.error(`Failed to create ${activeTab === 'initiatives' ? 'initiative' : 'SWOT item'}`);
    }
  };

  const handleDeleteItem = (id: string, itemType: 'initiative' | 'swot') => {
    dialog.confirm(
      `Are you sure you want to delete this ${itemType}?`,
      async () => {
        try {
          if (itemType === 'initiative') {
            await deleteInitiative(id);
          } else {
            await deleteSwotItem(id);
          }
          toast.success(`${itemType === 'initiative' ? 'Initiative' : 'SWOT item'} deleted successfully`);
        } catch (error) {
          console.error(`Error deleting ${itemType}:`, error);
          toast.error(`Failed to delete ${itemType}`);
        }
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
          <span className="text-muted-foreground">Loading strategy data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Strategy</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          {error.includes('Authentication') ? (
            <a 
              href="/auth"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 inline-block"
            >
              Sign In
            </a>
          ) : (
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  const categoryColors = {
    product: 'bg-indigo-100 text-indigo-800',
    technical: 'bg-blue-100 text-blue-800',
    marketing: 'bg-emerald-100 text-emerald-800',
    business: 'bg-orange-100 text-orange-800',
    general: 'bg-muted text-foreground'
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Strategic Planning</h1>
          <p className="text-muted-foreground mt-1">Manage strategic initiatives and SWOT analysis</p>
        </div>
        <button
          onClick={refreshData}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
        >
          <TrendingUp className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Market Share"
          value={liveMetrics?.performance.hasData ? `${liveMetrics.performance.accuracyRate}%` : "No data"}
          change={liveMetrics?.performance.hasData ? 2.5 : 0}
          icon={Target}
          to="/metrics"
          description="Current market penetration"
        />
        <MetricCard
          title="Growth Rate"
          value={liveMetrics?.revenue.hasData ? `${Math.abs(liveMetrics.revenue.change)}%` : "No data"}
          change={liveMetrics?.revenue.hasData ? liveMetrics.revenue.change : 0}
          icon={TrendingUp}
          to="/metrics"
          description="Month over month growth"
        />
        <MetricCard
          title="Enterprise Clients"
          value={liveMetrics?.customers.hasData && liveMetrics.customers.segments['Enterprise'] 
            ? `${Math.round((liveMetrics.customers.segments['Enterprise'] / liveMetrics.customers.total) * 100)}%` 
            : "No data"}
          change={liveMetrics?.customers.hasData ? 5.7 : 0}
          icon={Users}
          to="/metrics"
          description="Enterprise segment share"
        />
      </div>

      {/* Tabs */}
      <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm overflow-hidden">
        <div className="flex border-b border-border/50">
          <button
            onClick={() => setActiveTab('initiatives')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'initiatives'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
            }`}
          >
            Strategic Initiatives
          </button>
          <button
            onClick={() => setActiveTab('swot')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'swot'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/30'
            }`}
          >
            SWOT Analysis
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'initiatives' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-foreground">Strategic Initiatives</h2>
                <button
                  onClick={() => {
                    setShowNewItem(true);
                    setNewItemData({
                      ...newItemData,
                      category: 'general'
                    });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  New Initiative
                </button>
              </div>

              {showNewItem && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-card/70 backdrop-blur-xl border border-border/50 p-4 rounded-lg space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newItemData.title}
                      onChange={(e) => setNewItemData({ ...newItemData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={newItemData.description}
                      onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Category
                      </label>
                      <select
                        value={newItemData.category}
                        onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="product">Product</option>
                        <option value="technical">Technical</option>
                        <option value="marketing">Marketing</option>
                        <option value="business">Business</option>
                        <option value="general">General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Priority
                      </label>
                      <select
                        value={newItemData.priority}
                        onChange={(e) => setNewItemData({ ...newItemData, priority: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="1">Highest</option>
                        <option value="2">High</option>
                        <option value="3">Medium</option>
                        <option value="4">Low</option>
                        <option value="5">Lowest</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Due Date (optional)
                      </label>
                      <input
                        type="date"
                        value={newItemData.dueDate}
                        onChange={(e) => setNewItemData({ ...newItemData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowNewItem(false)}
                      className="px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateItem}
                      disabled={!newItemData.title.trim()}
                      className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Create Initiative
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="space-y-6">
                {Object.entries(initiativesByCategory).map(([category, items]) => {
                  if (items.length === 0) return null;
                  
                  return (
                    <div key={category} className="space-y-2">
                       <h3 className="text-md font-medium text-foreground capitalize">
                        {category} Initiatives
                      </h3>
                      
                      <div className="space-y-2">
                        {items.map((initiative: StrategicInitiative) => (
                          <div 
                            key={initiative.id}
                            className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-lg hover:shadow-sm transition-shadow"
                          >
                            <div 
                              className={`p-4 flex items-start justify-between cursor-pointer ${
                                showItemDetails === initiative.id ? 'border-b border-border/50' : ''
                              }`}
                              onClick={() => setShowItemDetails(showItemDetails === initiative.id ? null : initiative.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleInitiative(initiative.id);
                                    }}
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                      initiative.status === 'completed'
                                        ? 'bg-emerald-600 border-emerald-600'
                                        : 'border-border/50'
                                    }`}
                                  >
                                    {initiative.status === 'completed' && (
                                      <Check className="w-3 h-3 text-white" />
                                    )}
                                  </button>
                                </div>
                                <div>
                                  <h4 className={`font-medium ${
                                      initiative.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
                                  }`}>
                                    {initiative.title}
                                  </h4>
                                  {initiative.description && (
                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                      {initiative.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[category as keyof typeof categoryColors]}`}>
                                      {category}
                                    </span>
                                    {initiative.priority <= 2 && (
                                      <span className="text-xs flex items-center text-amber-600">
                                        <Star className="w-3 h-3 mr-0.5" />
                                        Priority
                                      </span>
                                    )}
                                     {initiative.due_date && (
                                      <span className="text-xs flex items-center text-muted-foreground">
                                        <Calendar className="w-3 h-3 mr-0.5" />
                                        {new Date(initiative.due_date).toLocaleDateString()}
                                      </span>
                                    )}
                                    {initiative.created_by === 'ai' && (
                                      <span className="text-xs flex items-center text-purple-600">
                                        <Brain className="w-3 h-3 mr-0.5" />
                                        AI Suggested
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(initiative.id, 'initiative');
                                  }}
                                  className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                                {showItemDetails === initiative.id ? (
                                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                            
                            {showItemDetails === initiative.id && (
                              <div className="p-4 bg-card/70 backdrop-blur-xl border border-border/50">
                                <div className="space-y-4">
                                  {initiative.description && (
                                    <div>
                                      <h5 className="text-sm font-medium text-foreground">Description</h5>
                                      <p className="text-sm text-muted-foreground mt-1">{initiative.description}</p>
                                    </div>
                                  )}
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <h5 className="text-sm font-medium text-foreground">Status</h5>
                                      <p className="text-sm capitalize">{initiative.status}</p>
                                    </div>
                                    <div>
                                      <h5 className="text-sm font-medium text-foreground">Priority</h5>
                                      <p className="text-sm">{
                                        initiative.priority === 1 ? 'Highest' :
                                        initiative.priority === 2 ? 'High' :
                                        initiative.priority === 3 ? 'Medium' :
                                        initiative.priority === 4 ? 'Low' : 'Lowest'
                                      }</p>
                                    </div>
                                    {initiative.created_at && (
                                      <div>
                                      <h5 className="text-sm font-medium text-foreground">Created</h5>
                                        <p className="text-sm">
                                          {new Date(initiative.created_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                    {initiative.completed_at && (
                                      <div>
                                      <h5 className="text-sm font-medium text-foreground">Completed</h5>
                                        <p className="text-sm">
                                          {new Date(initiative.completed_at).toLocaleDateString()}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                
                {initiatives.length === 0 && (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                    <p className="text-muted-foreground">No strategic initiatives yet</p>
                    <p className="text-muted-foreground text-sm mt-1">Create your first initiative to get started</p>
                    <button
                      onClick={() => {
                        setShowNewItem(true);
                        setNewItemData({
                          ...newItemData,
                          category: 'general'
                        });
                      }}
                      className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                    >
                      <Plus className="w-4 h-4" />
                      New Initiative
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'swot' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-foreground">SWOT Analysis</h2>
                <button
                  onClick={() => {
                    setShowNewItem(true);
                    setNewItemData({
                      ...newItemData,
                      category: 'strengths'
                    });
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  <Plus className="w-4 h-4" />
                  Add SWOT Item
                </button>
              </div>

              {showNewItem && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-card/70 backdrop-blur-xl border border-border/50 p-4 rounded-lg space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={newItemData.title}
                      onChange={(e) => setNewItemData({ ...newItemData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Description
                    </label>
                    <textarea
                      value={newItemData.description}
                      onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Category
                      </label>
                      <select
                        value={newItemData.category}
                        onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="strengths">Strengths</option>
                        <option value="weaknesses">Weaknesses</option>
                        <option value="opportunities">Opportunities</option>
                        <option value="threats">Threats</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Priority
                      </label>
                      <select
                        value={newItemData.priority}
                        onChange={(e) => setNewItemData({ ...newItemData, priority: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-border/50 rounded-lg bg-card/50 backdrop-blur-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="1">Highest</option>
                        <option value="2">High</option>
                        <option value="3">Medium</option>
                        <option value="4">Low</option>
                        <option value="5">Lowest</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowNewItem(false)}
                      className="px-4 py-2 text-sm bg-muted text-foreground rounded-lg hover:bg-muted/80"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateItem}
                      disabled={!newItemData.title.trim()}
                      className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Add SWOT Item
                    </button>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-blue-50 p-5 rounded-xl">
                  <h3 className="text-blue-800 font-semibold mb-4 flex items-center justify-between">
                    <span>Strengths</span>
                    <button
                      onClick={() => {
                        setShowNewItem(true);
                        setNewItemData({
                          ...newItemData,
                          category: 'strengths'
                        });
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                      title="Add Strength"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </h3>
                  
                  <div className="space-y-3">
                    {swotByCategory.strengths.map((item: SwotItem) => (
                      <div 
                        key={item.id}
                        className="bg-card/80 backdrop-blur-xl p-3 rounded border border-blue-200"
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          <button
                            onClick={() => handleDeleteItem(item.id, 'swot')}
                            className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
                          {item.source === 'ai' && (
                            <span className="flex items-center">
                              <Brain className="w-3 h-3 mr-0.5" />
                              AI Suggested
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {swotByCategory.strengths.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm">No strengths added yet</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Weaknesses */}
                <div className="bg-orange-50 p-5 rounded-xl">
                  <h3 className="text-orange-800 font-semibold mb-4 flex items-center justify-between">
                    <span>Weaknesses</span>
                    <button
                      onClick={() => {
                        setShowNewItem(true);
                        setNewItemData({
                          ...newItemData,
                          category: 'weaknesses'
                        });
                      }}
                      className="p-1 text-orange-600 hover:bg-orange-100 rounded"
                      title="Add Weakness"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </h3>
                  
                  <div className="space-y-3">
                    {swotByCategory.weaknesses.map((item: SwotItem) => (
                      <div 
                        key={item.id}
                        className="bg-card/80 backdrop-blur-xl p-3 rounded border border-orange-200"
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          <button
                            onClick={() => handleDeleteItem(item.id, 'swot')}
                            className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-orange-600">
                          {item.source === 'ai' && (
                            <span className="flex items-center">
                              <Brain className="w-3 h-3 mr-0.5" />
                              AI Suggested
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {swotByCategory.weaknesses.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm">No weaknesses added yet</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Opportunities */}
                <div className="bg-green-50 p-5 rounded-xl">
                  <h3 className="text-green-800 font-semibold mb-4 flex items-center justify-between">
                    <span>Opportunities</span>
                    <button
                      onClick={() => {
                        setShowNewItem(true);
                        setNewItemData({
                          ...newItemData,
                          category: 'opportunities'
                        });
                      }}
                      className="p-1 text-green-600 hover:bg-green-100 rounded"
                      title="Add Opportunity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </h3>
                  
                  <div className="space-y-3">
                    {swotByCategory.opportunities.map((item: SwotItem) => (
                      <div 
                        key={item.id}
                        className="bg-card/80 backdrop-blur-xl p-3 rounded border border-green-200"
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          <button
                            onClick={() => handleDeleteItem(item.id, 'swot')}
                            className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-green-600">
                          {item.source === 'ai' && (
                            <span className="flex items-center">
                              <Brain className="w-3 h-3 mr-0.5" />
                              AI Suggested
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {swotByCategory.opportunities.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm">No opportunities added yet</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Threats */}
                <div className="bg-red-50 p-5 rounded-xl">
                  <h3 className="text-red-800 font-semibold mb-4 flex items-center justify-between">
                    <span>Threats</span>
                    <button
                      onClick={() => {
                        setShowNewItem(true);
                        setNewItemData({
                          ...newItemData,
                          category: 'threats'
                        });
                      }}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Add Threat"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </h3>
                  
                  <div className="space-y-3">
                    {swotByCategory.threats.map((item: SwotItem) => (
                      <div 
                        key={item.id}
                        className="bg-card/80 backdrop-blur-xl p-3 rounded border border-red-200"
                      >
                        <div className="flex justify-between">
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          <button
                            onClick={() => handleDeleteItem(item.id, 'swot')}
                            className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-red-600">
                          {item.source === 'ai' && (
                            <span className="flex items-center">
                              <Brain className="w-3 h-3 mr-0.5" />
                              AI Suggested
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {swotByCategory.threats.length === 0 && (
                      <div className="text-center py-4">
                        <p className="text-muted-foreground text-sm">No threats added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strategic Dashboard */}
      <div className="bg-card/80 backdrop-blur-xl rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Strategic Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-md font-medium text-foreground mb-4">Initiative Progress</h3>
            
            <div className="space-y-4">
              {/* Calculate stats from actual data */}
              {(() => {
                const total = initiatives.length;
                const completed = initiatives.filter(i => i.status === 'completed').length;
                const inProgress = initiatives.filter(i => i.status === 'in_progress').length;
                const planned = initiatives.filter(i => i.status === 'planned').length;
                
                const completedPercent = total > 0 ? (completed / total) * 100 : 0;
                const inProgressPercent = total > 0 ? (inProgress / total) * 100 : 0;
                const plannedPercent = total > 0 ? (planned / total) * 100 : 0;
                
                return (
                  <>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Completed</span>
                        <span className="text-sm font-medium">{completed} of {total} ({Math.round(completedPercent)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${completedPercent}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">In Progress</span>
                        <span className="text-sm font-medium">{inProgress} of {total} ({Math.round(inProgressPercent)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${inProgressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Planned</span>
                        <span className="text-sm font-medium">{planned} of {total} ({Math.round(plannedPercent)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-muted-foreground rounded-full"
                          style={{ width: `${plannedPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                );
              })()}
              
              {initiatives.length === 0 && (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                  <p className="text-muted-foreground">No initiatives yet</p>
                  <button
                    onClick={() => {
                      setActiveTab('initiatives');
                      setShowNewItem(true);
                    }}
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Create your first initiative
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-md font-medium text-foreground mb-4">SWOT Analysis Summary</h3>
            
            <div className="space-y-4">
              {/* Calculate stats from actual data */}
              {(() => {
                const strengths = swotByCategory.strengths.length;
                const weaknesses = swotByCategory.weaknesses.length;
                const opportunities = swotByCategory.opportunities.length;
                const threats = swotByCategory.threats.length;
                
                const totalItems = strengths + weaknesses + opportunities + threats;
                const aiGenerated = swotItems.filter(item => item.source === 'ai').length;
                const aiPercent = totalItems > 0 ? (aiGenerated / totalItems) * 100 : 0;
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <h4 className="text-blue-800 text-sm font-medium">Strengths</h4>
                        <p className="text-2xl font-semibold text-blue-600 mt-1">{strengths}</p>
                      </div>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <h4 className="text-orange-800 text-sm font-medium">Weaknesses</h4>
                        <p className="text-2xl font-semibold text-orange-600 mt-1">{weaknesses}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <h4 className="text-green-800 text-sm font-medium">Opportunities</h4>
                        <p className="text-2xl font-semibold text-green-600 mt-1">{opportunities}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <h4 className="text-red-800 text-sm font-medium">Threats</h4>
                        <p className="text-2xl font-semibold text-red-600 mt-1">{threats}</p>
                      </div>
                    </div>
                    
                    {aiGenerated > 0 && (
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-muted-foreground">AI-Generated Insights</span>
                          <span className="text-sm font-medium">{aiGenerated} of {totalItems} ({Math.round(aiPercent)}%)</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${aiPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              
              {swotItems.length === 0 && (
                <div className="text-center py-4">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 dark:text-gray-400">No SWOT items yet</p>
                  <button
                    onClick={() => {
                      setActiveTab('swot');
                      setShowNewItem(true);
                    }}
                    className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Create your first SWOT item
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}