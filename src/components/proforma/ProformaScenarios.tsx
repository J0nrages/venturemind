import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PlusCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface Props {
  activeScenario: any;
  onScenarioChange: (scenario: any) => void;
}

export default function ProformaScenarios({ activeScenario, onScenarioChange }: Props) {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewScenarioForm, setShowNewScenarioForm] = useState(false);
  const [newScenario, setNewScenario] = useState({ name: '', description: '' });

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('proforma_scenarios')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setScenarios(data || []);
    } catch (error) {
      console.error('Error loading scenarios:', error);
      toast.error('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  };

  const createScenario = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('proforma_scenarios')
        .insert({
          user_id: user.id,
          name: newScenario.name,
          description: newScenario.description,
          assumptions: {},
          is_active: false
        })
        .select()
        .single();

      if (error) throw error;

      setScenarios([data, ...scenarios]);
      setShowNewScenarioForm(false);
      setNewScenario({ name: '', description: '' });
      toast.success('Scenario created successfully');
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast.error('Failed to create scenario');
    }
  };

  const activateScenario = async (scenario: any) => {
    try {
      // Deactivate all user’s scenarios
      await supabase
        .from('proforma_scenarios')
        .update({ is_active: false })
        .eq('user_id', scenario.user_id);

      // Activate selected scenario
      const { error } = await supabase
        .from('proforma_scenarios')
        .update({ is_active: true })
        .eq('id', scenario.id);

      if (error) throw error;

      setScenarios(scenarios.map(s => ({
        ...s,
        is_active: s.id === scenario.id
      })));

      onScenarioChange(scenario);
      toast.success('Scenario activated');
    } catch (error) {
      console.error('Error activating scenario:', error);
      toast.error('Failed to activate scenario');
    }
  };

  const deleteScenario = async (scenario: any) => {
    try {
      const { error } = await supabase
        .from('proforma_scenarios')
        .delete()
        .eq('id', scenario.id);

      if (error) throw error;

      setScenarios(scenarios.filter(s => s.id !== scenario.id));
      toast.success('Scenario deleted');

      // If we deleted the active scenario, clear it
      if (scenario.id === activeScenario?.id) {
        onScenarioChange(null);
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Failed to delete scenario');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Financial Scenarios</h2>
        <button
          onClick={() => setShowNewScenarioForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Scenario</span>
        </button>
      </div>

      {showNewScenarioForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-4 rounded-xl shadow-sm space-y-4"
        >
          <input
            type="text"
            placeholder="Scenario Name"
            value={newScenario.name}
            onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <textarea
            rows={3}
            placeholder="Describe your scenario..."
            value={newScenario.description}
            onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNewScenarioForm(false)}
              className="px-4 py-2 text-gray-600 hover:underline"
            >
              Cancel
            </button>
            <button
              onClick={createScenario}
              disabled={!newScenario.name}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </motion.div>
      )}

      {scenarios.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Scenarios Yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first financial scenario to start modeling your business projections.
          </p>
          <button
            onClick={() => setShowNewScenarioForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create First Scenario</span>
          </button>
        </div>
      )}

      {scenarios.map((scenario) => (
        <motion.div
          key={scenario.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            scenario.is_active ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium text-gray-800">{scenario.name}</h3>
              <p className="text-gray-600 mt-1">{scenario.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {!scenario.is_active && (
                <button
                  onClick={() => activateScenario(scenario)}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg"
                >
                  Activate
                </button>
              )}
              <button
                onClick={() => deleteScenario(scenario)}
                className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
