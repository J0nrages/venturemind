import { useState, useEffect } from 'react';
import { BusinessService, BusinessProfile, BusinessMetric, BusinessDimension } from '../services/BusinessService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useBusinessData() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [dimensions, setDimensions] = useState<BusinessDimension[]>([]);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadBusinessData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Load profile first
      const profileData = await BusinessService.getBusinessProfile(user.id);
      
      if (!profileData) {
        // Set flag that setup is needed instead of redirecting
        setNeedsSetup(true);
        setProfile(null);
        // Set default data for components that need it
        setDashboardData({
          mrr: 0,
          arr: 0,
          customers: 0,
          churnRate: 0,
          revenueChange: 0,
          customerChange: 0
        });
        setCustomerData({
          totalCustomers: 0,
          newCustomers: 0,
          churned: 0,
          activeUsers: 0,
          segmentBreakdown: {}
        });
        setMetrics([]);
        setDimensions([]);
        return;
      }

      setProfile(profileData);
      setNeedsSetup(false);

      // Load other data in parallel
      const [
        metricsData,
        dimensionsData,
        dashboardMetrics,
        customerMetrics
      ] = await Promise.all([
        BusinessService.getBusinessMetrics(user.id),
        BusinessService.getBusinessDimensions(user.id),
        BusinessService.getDashboardMetrics(user.id),
        BusinessService.getCustomerMetrics(user.id)
      ]);

      setMetrics(metricsData);
      setDimensions(dimensionsData);
      setDashboardData(dashboardMetrics);
      setCustomerData(customerMetrics);

      // Initialize default metrics if none exist (but don't reload in the same call)
      if (metricsData.length === 0) {
        BusinessService.initializeBusinessDefaults(user.id, profileData).then(() => {
          // Reload metrics after initialization in next tick
          setTimeout(() => {
            BusinessService.getBusinessMetrics(user.id).then(newMetrics => {
              setMetrics(newMetrics);
            });
          }, 100);
        });
      }

    } catch (err: any) {
      console.error('Error loading business data:', err);
      setError(err.message);
      // Don't show toast error immediately, let components handle it
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    loadBusinessData();
  };

  const updateProfile = async (updates: Partial<BusinessProfile>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const updated = await BusinessService.updateBusinessProfile(user.id, updates);
      setProfile(updated);
      setNeedsSetup(false);
      toast.success('Business profile updated');
      return updated;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast.error('Failed to update profile');
      throw err;
    }
  };

  const createProfile = async (profileData: Omit<BusinessProfile, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const created = await BusinessService.createBusinessProfile(profileData);
      setProfile(created);
      setNeedsSetup(false);
      
      // Initialize defaults after creating profile
      await BusinessService.initializeBusinessDefaults(profileData.user_id, created);
      
      // Reload all data
      setTimeout(() => {
        loadBusinessData();
      }, 100);
      
      toast.success('Business profile created');
      return created;
    } catch (err: any) {
      console.error('Error creating profile:', err);
      toast.error('Failed to create profile');
      throw err;
    }
  };

  const createMetric = async (metric: Omit<BusinessMetric, 'id' | 'created_at'>) => {
    try {
      const created = await BusinessService.createBusinessMetric(metric);
      setMetrics(prev => [...prev, created]);
      toast.success('Metric created successfully');
      return created;
    } catch (err: any) {
      console.error('Error creating metric:', err);
      toast.error('Failed to create metric');
      throw err;
    }
  };

  const createDimension = async (dimension: Omit<BusinessDimension, 'id' | 'created_at'>) => {
    try {
      const created = await BusinessService.createBusinessDimension(dimension);
      setDimensions(prev => [...prev, created]);
      toast.success('Dimension created successfully');
      return created;
    } catch (err: any) {
      console.error('Error creating dimension:', err);
      toast.error('Failed to create dimension');
      throw err;
    }
  };

  useEffect(() => {
    loadBusinessData();
  }, []);

  return {
    profile,
    metrics,
    dimensions,
    dashboardData,
    customerData,
    loading,
    error,
    needsSetup,
    refreshData,
    updateProfile,
    createProfile,
    createMetric,
    createDimension
  };
}