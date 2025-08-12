import { supabase } from './supabase';
import { FinancialMetrics, Scenario, ScenarioAssumptions } from './types';

export async function getScenarios(userId: string): Promise<Scenario[]> {
  const { data, error } = await supabase
    .from('proforma_scenarios')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getScenario(id: string): Promise<Scenario | null> {
  const { data, error } = await supabase
    .from('proforma_scenarios')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createScenario(userId: string, name: string, description: string, assumptions: ScenarioAssumptions): Promise<Scenario> {
  const { data, error } = await supabase
    .from('proforma_scenarios')
    .insert({
      user_id: userId,
      name,
      description,
      assumptions,
      is_active: false
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateScenario(id: string, updates: Partial<Scenario>): Promise<Scenario> {
  const { data, error } = await supabase
    .from('proforma_scenarios')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScenario(id: string): Promise<void> {
  const { error } = await supabase
    .from('proforma_scenarios')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getFinancialMetrics(scenarioId: string): Promise<FinancialMetrics | null> {
  const { data, error } = await supabase
    .from('proforma_financials')
    .select('*')
    .eq('scenario_id', scenarioId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateFinancialMetrics(scenarioId: string, metrics: FinancialMetrics): Promise<void> {
  const { error } = await supabase
    .from('proforma_financials')
    .upsert({
      scenario_id: scenarioId,
      ...metrics,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}