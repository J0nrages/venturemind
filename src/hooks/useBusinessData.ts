import { useState, useEffect } from 'react';
import { BusinessService, BusinessProfile, BusinessMetric, BusinessDimension } from '../services/BusinessService';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function useBusinessData() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [dimensions, setDimensions] = useState<BusinessDimension[]>([]);
  const [dashboardData, setDashboardData] = useState<any>({
    mrr: 0,
    arr: 0,
    customers: 0,
    churnRate: 0,
    revenueChange: 0,
    customerChange: 0
  });
  const [customerData, setCustomerData] = useState<any>({
    totalCustomers: 0,
    newCustomers: 0,
    churned: 0,
    activeUsers: 0,
    segmentBreakdown: {}
  });
  const [loading, setLoading] = useState(false); // Start with false for instant render
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

  const loadBusinessData = async () => {
    try {
      // Don't set loading to true - let UI render immediately
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Batch load all data in parallel for speed
      const [
        profileData,
        metricsData,
        dimensionsData,
        dashboardMetrics,
        customerMetrics
      ] = await Promise.allSettled([
        BusinessService.getBusinessProfile(user.id),
        BusinessService.getBusinessMetrics(user.id),
        BusinessService.getBusinessDimensions(user.id),
        BusinessService.getDashboardMetrics(user.id),
        BusinessService.getCustomerMetrics(user.id)
      ]);

      // Process profile first (most important)
      if (profileData.status === 'fulfilled' && profileData.value) {
        setProfile(profileData.value);
        setNeedsSetup(false);
      } else {
        setNeedsSetup(true);
        setProfile(null);
      }

      // Update other data as it arrives (progressive loading)
      if (metricsData.status === 'fulfilled') {
        setMetrics(metricsData.value || []);
      }

      if (dimensionsData.status === 'fulfilled') {
        setDimensions(dimensionsData.value || []);
      }

      if (dashboardMetrics.status === 'fulfilled' && dashboardMetrics.value) {
        setDashboardData(dashboardMetrics.value);
      }

      if (customerMetrics.status === 'fulfilled' && customerMetrics.value) {
        setCustomerData(customerMetrics.value);
      }

      // Initialize default metrics if none exist (but don't reload in the same call)
      if (metricsData.status === 'fulfilled' && (!metricsData.value || metricsData.value.length === 0)) {
        if (profileData.status === 'fulfilled' && profileData.value) {
          BusinessService.initializeBusinessDefaults(user.id, profileData.value).then(() => {
            // Reload metrics after initialization in next tick
            setTimeout(() => {
              BusinessService.getBusinessMetrics(user.id).then(newMetrics => {
                setMetrics(newMetrics);
              });
            }, 100);
          });
        }
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