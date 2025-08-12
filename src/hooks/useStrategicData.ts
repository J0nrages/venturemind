import { useState, useEffect } from 'react';
import { StrategicService, StrategicInitiative, SwotItem, LiveMetrics } from '../services/StrategicService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useStrategicData() {
  const [initiatives, setInitiatives] = useState<StrategicInitiative[]>([]);
  const [swotItems, setSwotItems] = useState<SwotItem[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Authentication required. Please sign in to continue.');
        setLoading(false);
        return;
      }

      const [initiativesData, swotData, metricsData] = await Promise.all([
        StrategicService.getStrategicInitiatives(user.id),
        StrategicService.getSwotItems(user.id),
        StrategicService.getLiveMetrics(user.id)
      ]);

      setInitiatives(initiativesData);
      setSwotItems(swotData);
      setLiveMetrics(metricsData);
    } catch (err: any) {
      console.error('Error loading strategic data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  const createInitiative = async (initiative: Omit<StrategicInitiative, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const created = await StrategicService.createStrategicInitiative({
        ...initiative,
        user_id: user.id
      });

      setInitiatives(prev => [created, ...prev]);
      toast.success('Initiative created successfully');
      return created;
    } catch (err: any) {
      console.error('Error creating initiative:', err);
      toast.error('Failed to create initiative');
      throw err;
    }
  };

  const updateInitiative = async (id: string, updates: Partial<StrategicInitiative>) => {
    try {
      const updated = await StrategicService.updateStrategicInitiative(id, updates);
      setInitiatives(prev => prev.map(item => item.id === id ? updated : item));
      toast.success('Initiative updated successfully');
      return updated;
    } catch (err: any) {
      console.error('Error updating initiative:', err);
      toast.error('Failed to update initiative');
      throw err;
    }
  };

  const toggleInitiative = async (id: string) => {
    try {
      const updated = await StrategicService.toggleInitiativeStatus(id);
      setInitiatives(prev => prev.map(item => item.id === id ? updated : item));
      
      const message = updated.status === 'completed' ? 'Initiative completed!' : 'Initiative reopened';
      toast.success(message);
      return updated;
    } catch (err: any) {
      console.error('Error toggling initiative:', err);
      toast.error('Failed to update initiative');
      throw err;
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      await StrategicService.deleteStrategicInitiative(id);
      setInitiatives(prev => prev.filter(item => item.id !== id));
      toast.success('Initiative deleted successfully');
    } catch (err: any) {
      console.error('Error deleting initiative:', err);
      toast.error('Failed to delete initiative');
      throw err;
    }
  };

  const createSwotItem = async (item: Omit<SwotItem, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const created = await StrategicService.createSwotItem({
        ...item,
        user_id: user.id
      });

      setSwotItems(prev => [created, ...prev]);
      toast.success('SWOT item created successfully');
      return created;
    } catch (err: any) {
      console.error('Error creating SWOT item:', err);
      toast.error('Failed to create SWOT item');
      throw err;
    }
  };

  const updateSwotItem = async (id: string, updates: Partial<SwotItem>) => {
    try {
      const updated = await StrategicService.updateSwotItem(id, updates);
      setSwotItems(prev => prev.map(item => item.id === id ? updated : item));
      toast.success('SWOT item updated successfully');
      return updated;
    } catch (err: any) {
      console.error('Error updating SWOT item:', err);
      toast.error('Failed to update SWOT item');
      throw err;
    }
  };

  const deleteSwotItem = async (id: string) => {
    try {
      await StrategicService.deleteSwotItem(id);
      setSwotItems(prev => prev.filter(item => item.id !== id));
      toast.success('SWOT item deleted successfully');
    } catch (err: any) {
      console.error('Error deleting SWOT item:', err);
      toast.error('Failed to delete SWOT item');
      throw err;
    }
  };

  // Group SWOT items by category
  const swotByCategory = {
    strengths: swotItems.filter(item => item.category === 'strengths'),
    weaknesses: swotItems.filter(item => item.category === 'weaknesses'),
    opportunities: swotItems.filter(item => item.category === 'opportunities'),
    threats: swotItems.filter(item => item.category === 'threats')
  };

  // Group initiatives by category
  const initiativesByCategory = {
    product: initiatives.filter(item => item.category === 'product'),
    technical: initiatives.filter(item => item.category === 'technical'),
    marketing: initiatives.filter(item => item.category === 'marketing'),
    business: initiatives.filter(item => item.category === 'business'),
    general: initiatives.filter(item => item.category === 'general')
  };

  useEffect(() => {
    loadData();

    const setupRealtimeSubscriptions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Set up real-time subscriptions for live updates
      const initiativesSubscription = supabase
        .channel('strategic_initiatives_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'strategic_initiatives'
        }, (payload) => {
          loadData(); // Refresh data on any change
        })
        .subscribe();

      const swotSubscription = supabase
        .channel('swot_items_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'swot_items'
        }, (payload) => {
          loadData(); // Refresh data on any change
        })
        .subscribe();

      return () => {
        initiativesSubscription.unsubscribe();
        swotSubscription.unsubscribe();
      };
    };
    
    setupRealtimeSubscriptions();
  }, []);

  return {
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
  };
}