import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { LineChart, Layers, Download, PlusCircle, Settings, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import ProformaAssumptions from '../components/proforma/ProformaAssumptions';
import ProformaScenarios from '../components/proforma/ProformaScenarios';
import ProformaFinancials from '../components/proforma/ProformaFinancials';
import ProformaMetrics from '../components/proforma/ProformaMetrics';

export default function ProformaPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('financials');
  const [loading, setLoading] = useState(true);
  const [activeScenario, setActiveScenario] = useState<any>(null);
  const [businessProfile, setBusinessProfile] = useState<any>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load business profile
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setBusinessProfile(profile);
      }

      // Load active scenario
      const { data: scenarios } = await supabase
        .from('proforma_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (scenarios && scenarios.length > 0) {
        setActiveScenario(scenarios[0]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    {
      id: 'financials',
      label: 'Financial Statements',
      icon: LineChart
    },
    {
      id: 'assumptions',
      label: 'Assumptions',
      icon: Settings
    },
    {
      id: 'scenarios',
      label: 'Scenarios',
      icon: Layers
    },
    {
      id: 'metrics',
      label: 'Business Metrics',
      icon: BarChart3
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">Financial Proforma Modeling</h1>
        <p className="text-gray-500 mt-1">Generate detailed financial projections and analyze business scenarios</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-1">
        <nav className="flex space-x-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'financials' && (
          <ProformaFinancials 
            scenario={activeScenario}
            businessProfile={businessProfile}
          />
        )}
        {activeTab === 'assumptions' && (
          <ProformaAssumptions
            scenario={activeScenario}
            businessProfile={businessProfile}
            onUpdate={loadInitialData}
          />
        )}
        {activeTab === 'scenarios' && (
          <ProformaScenarios
            activeScenario={activeScenario}
            onScenarioChange={(scenario) => {
              setActiveScenario(scenario);
              loadInitialData();
            }}
          />
        )}
        {activeTab === 'metrics' && (
          <ProformaMetrics
            scenario={activeScenario}
            businessProfile={businessProfile}
          />
        )}
      </div>
    </div>
  );
}