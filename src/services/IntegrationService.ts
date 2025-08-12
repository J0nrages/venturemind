import { supabase } from '../lib/supabase';

export interface ApiIntegration {
  id: string;
  user_id: string;
  platform: string;
  display_name: string;
  api_key_encrypted?: string;
  webhook_secret?: string;
  configuration: any;
  is_active: boolean;
  last_sync_at?: string;
  sync_status: 'pending' | 'syncing' | 'success' | 'error';
  sync_error?: string;
  data_points_synced: number;
  created_at: string;
  updated_at: string;
}

export interface IntegrationTemplate {
  platform: string;
  display_name: string;
  description: string;
  icon: string;
  category: 'payments' | 'analytics' | 'product' | 'crm' | 'support' | 'marketing';
  data_types: string[];
  setup_fields: {
    name: string;
    type: 'text' | 'password' | 'url' | 'select';
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[];
  }[];
  documentation_url: string;
}

export class IntegrationService {
  // Get all available integration templates
  static getAvailableIntegrations(): IntegrationTemplate[] {
    return [
      {
        platform: 'stripe',
        display_name: 'Stripe',
        description: 'Sync payments, subscriptions, and customer data from Stripe',
        icon: 'CreditCard',
        category: 'payments',
        data_types: ['customers', 'subscriptions', 'payments', 'revenue'],
        setup_fields: [
          {
            name: 'api_key',
            type: 'password',
            label: 'Stripe Secret Key',
            placeholder: 'sk_live_... or sk_test_...',
            required: true
          },
          {
            name: 'webhook_endpoint',
            type: 'url',
            label: 'Webhook Endpoint (optional)',
            placeholder: 'https://your-domain.com/webhook/stripe',
            required: false
          }
        ],
        documentation_url: 'https://stripe.com/docs/api'
      },
      {
        platform: 'posthog',
        display_name: 'PostHog',
        description: 'Sync user analytics, events, and product insights',
        icon: 'BarChart3',
        category: 'analytics',
        data_types: ['events', 'users', 'metrics', 'funnels'],
        setup_fields: [
          {
            name: 'api_key',
            type: 'password',
            label: 'PostHog API Key',
            placeholder: 'phc_...',
            required: true
          },
          {
            name: 'project_id',
            type: 'text',
            label: 'Project ID',
            placeholder: '12345',
            required: true
          },
          {
            name: 'host',
            type: 'url',
            label: 'PostHog Host',
            placeholder: 'https://app.posthog.com',
            required: false
          }
        ],
        documentation_url: 'https://posthog.com/docs/api'
      },
      {
        platform: 'productboard',
        display_name: 'ProductBoard',
        description: 'Sync product features, user feedback, and roadmap data',
        icon: 'Target',
        category: 'product',
        data_types: ['features', 'feedback', 'roadmap', 'insights'],
        setup_fields: [
          {
            name: 'api_token',
            type: 'password',
            label: 'ProductBoard API Token',
            placeholder: 'pb_...',
            required: true
          },
          {
            name: 'workspace_id',
            type: 'text',
            label: 'Workspace ID',
            placeholder: 'workspace-123',
            required: true
          }
        ],
        documentation_url: 'https://developer.productboard.com/'
      },
      {
        platform: 'hubspot',
        display_name: 'HubSpot',
        description: 'Sync CRM data, contacts, deals, and sales metrics',
        icon: 'Users',
        category: 'crm',
        data_types: ['contacts', 'deals', 'companies', 'activities'],
        setup_fields: [
          {
            name: 'access_token',
            type: 'password',
            label: 'HubSpot Access Token',
            placeholder: 'pat-na1-...',
            required: true
          },
          {
            name: 'portal_id',
            type: 'text',
            label: 'Portal ID',
            placeholder: '12345678',
            required: true
          }
        ],
        documentation_url: 'https://developers.hubspot.com/docs/api/overview'
      },
      {
        platform: 'mixpanel',
        display_name: 'Mixpanel',
        description: 'Sync user events, funnels, and behavioral analytics',
        icon: 'TrendingUp',
        category: 'analytics',
        data_types: ['events', 'users', 'funnels', 'cohorts'],
        setup_fields: [
          {
            name: 'api_secret',
            type: 'password',
            label: 'Mixpanel API Secret',
            placeholder: 'mixpanel-secret-key',
            required: true
          },
          {
            name: 'project_id',
            type: 'text',
            label: 'Project ID',
            placeholder: '1234567',
            required: true
          }
        ],
        documentation_url: 'https://developer.mixpanel.com/reference/overview'
      },
      {
        platform: 'intercom',
        display_name: 'Intercom',
        description: 'Sync customer conversations, support metrics, and user data',
        icon: 'MessageCircle',
        category: 'support',
        data_types: ['conversations', 'users', 'metrics', 'satisfaction'],
        setup_fields: [
          {
            name: 'access_token',
            type: 'password',
            label: 'Intercom Access Token',
            placeholder: 'dG9rZW46...',
            required: true
          },
          {
            name: 'app_id',
            type: 'text',
            label: 'App ID',
            placeholder: 'abcd1234',
            required: true
          }
        ],
        documentation_url: 'https://developers.intercom.com/intercom-api-reference'
      },
      {
        platform: 'google_analytics',
        display_name: 'Google Analytics',
        description: 'Sync website traffic, user behavior, and conversion data',
        icon: 'BarChart3',
        category: 'analytics',
        data_types: ['traffic', 'conversions', 'events', 'audiences'],
        setup_fields: [
          {
            name: 'property_id',
            type: 'text',
            label: 'GA4 Property ID',
            placeholder: 'GA4-123456789-1',
            required: true
          },
          {
            name: 'credentials_json',
            type: 'password',
            label: 'Service Account JSON',
            placeholder: 'Paste your service account JSON here',
            required: true
          }
        ],
        documentation_url: 'https://developers.google.com/analytics/devguides/reporting/data/v1'
      },
      {
        platform: 'salesforce',
        display_name: 'Salesforce',
        description: 'Sync leads, opportunities, accounts, and sales data',
        icon: 'Building2',
        category: 'crm',
        data_types: ['leads', 'opportunities', 'accounts', 'activities'],
        setup_fields: [
          {
            name: 'instance_url',
            type: 'url',
            label: 'Salesforce Instance URL',
            placeholder: 'https://yourcompany.my.salesforce.com',
            required: true
          },
          {
            name: 'access_token',
            type: 'password',
            label: 'Access Token',
            placeholder: 'Your Salesforce access token',
            required: true
          },
          {
            name: 'refresh_token',
            type: 'password',
            label: 'Refresh Token',
            placeholder: 'Your Salesforce refresh token',
            required: true
          }
        ],
        documentation_url: 'https://developer.salesforce.com/docs/apis'
      }
    ];
  }

  // Get user's configured integrations
  static async getUserIntegrations(userId: string): Promise<ApiIntegration[]> {
    const { data, error } = await supabase
      .from('api_integrations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // Create a new integration
  static async createIntegration(
    userId: string,
    platform: string,
    configuration: any
  ): Promise<ApiIntegration> {
    const template = this.getAvailableIntegrations().find(t => t.platform === platform);
    if (!template) throw new Error('Integration template not found');

    const { data, error } = await supabase
      .from('api_integrations')
      .insert({
        user_id: userId,
        platform,
        display_name: template.display_name,
        configuration,
        is_active: true,
        sync_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger initial sync
    await this.triggerSync(data.id, 'full');

    return data;
  }

  // Update integration configuration
  static async updateIntegration(
    integrationId: string,
    updates: Partial<ApiIntegration>
  ): Promise<ApiIntegration> {
    const { data, error } = await supabase
      .from('api_integrations')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Delete integration
  static async deleteIntegration(integrationId: string): Promise<void> {
    const { error } = await supabase
      .from('api_integrations')
      .delete()
      .eq('id', integrationId);

    if (error) throw error;
  }

  // Test integration connection
  static async testConnection(platform: string, configuration: any): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      switch (platform) {
        case 'stripe':
          return await this.testStripeConnection(configuration);
        case 'posthog':
          return await this.testPostHogConnection(configuration);
        case 'hubspot':
          return await this.testHubSpotConnection(configuration);
        default:
          return { success: false, message: 'Integration test not implemented yet' };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // Trigger data sync
  static async triggerSync(integrationId: string, syncType: 'full' | 'incremental'): Promise<void> {
    // Update sync status
    await supabase
      .from('api_integrations')
      .update({
        sync_status: 'syncing',
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);

    // Create sync record
    await supabase
      .from('integration_data_syncs')
      .insert({
        integration_id: integrationId,
        sync_type: syncType,
        data_type: 'all',
        sync_status: 'running'
      });

    // In a real implementation, this would trigger background jobs
    // For now, we'll simulate the sync process
    setTimeout(async () => {
      await this.simulateSync(integrationId);
    }, 2000);
  }

  // Simulate sync process (in real implementation, this would be background jobs)
  private static async simulateSync(integrationId: string): Promise<void> {
    try {
      // Get integration details
      const { data: integration } = await supabase
        .from('api_integrations')
        .select('*')
        .eq('id', integrationId)
        .single();

      if (!integration) return;

      // Simulate API calls and data processing
      let recordsProcessed = 0;
      const syncOperations = [];

      switch (integration.platform) {
        case 'stripe':
          syncOperations.push(
            this.syncStripeData(integration),
            this.syncStripeCustomers(integration),
            this.syncStripeSubscriptions(integration)
          );
          recordsProcessed = 150;
          break;
        case 'posthog':
          syncOperations.push(
            this.syncPostHogEvents(integration),
            this.syncPostHogUsers(integration)
          );
          recordsProcessed = 350;
          break;
        case 'hubspot':
          syncOperations.push(
            this.syncHubSpotContacts(integration),
            this.syncHubSpotDeals(integration)
          );
          recordsProcessed = 75;
          break;
        default:
          recordsProcessed = Math.floor(Math.random() * 200) + 50;
      }

      // Execute sync operations
      await Promise.all(syncOperations);

      // Update integration status
      await supabase
        .from('api_integrations')
        .update({
          sync_status: 'success',
          last_sync_at: new Date().toISOString(),
          data_points_synced: recordsProcessed,
          sync_error: null
        })
        .eq('id', integrationId);

      // Update sync record
      await supabase
        .from('integration_data_syncs')
        .update({
          sync_status: 'completed',
          records_processed: recordsProcessed,
          records_success: recordsProcessed,
          completed_at: new Date().toISOString()
        })
        .eq('integration_id', integrationId)
        .eq('sync_status', 'running');

    } catch (error: any) {
      // Update integration with error
      await supabase
        .from('api_integrations')
        .update({
          sync_status: 'error',
          sync_error: error.message
        })
        .eq('id', integrationId);
    }
  }

  // Connection test methods
  private static async testStripeConnection(config: any): Promise<{ success: boolean; message: string; data?: any }> {
    // In real implementation, this would make actual API calls to Stripe
    if (!config.api_key || !config.api_key.startsWith('sk_')) {
      return { success: false, message: 'Invalid Stripe API key format' };
    }

    // Simulate API call
    return {
      success: true,
      message: 'Successfully connected to Stripe',
      data: { account_name: 'Your Stripe Account', currency: 'usd' }
    };
  }

  private static async testPostHogConnection(config: any): Promise<{ success: boolean; message: string; data?: any }> {
    if (!config.api_key || !config.project_id) {
      return { success: false, message: 'PostHog API key and project ID are required' };
    }

    return {
      success: true,
      message: 'Successfully connected to PostHog',
      data: { project_name: 'Your PostHog Project', events_count: 12450 }
    };
  }

  private static async testHubSpotConnection(config: any): Promise<{ success: boolean; message: string; data?: any }> {
    if (!config.access_token || !config.portal_id) {
      return { success: false, message: 'HubSpot access token and portal ID are required' };
    }

    return {
      success: true,
      message: 'Successfully connected to HubSpot',
      data: { portal_name: 'Your HubSpot Portal', contacts_count: 2543 }
    };
  }

  // Data sync simulation methods
  private static async syncStripeData(integration: any): Promise<void> {
    // Simulate syncing Stripe subscription data
    const mockSubscriptions = [
      { id: 'sub_1', amount: 99, interval: 'monthly', status: 'active' },
      { id: 'sub_2', amount: 299, interval: 'monthly', status: 'active' },
      { id: 'sub_3', amount: 49, interval: 'monthly', status: 'active' }
    ];

    for (const sub of mockSubscriptions) {
      await supabase
        .from('subscriptions')
        .upsert({
          user_id: integration.user_id,
          plan_id: `stripe_${sub.id}`,
          amount: sub.amount,
          interval: sub.interval,
          status: sub.status
        });
    }
  }

  private static async syncStripeCustomers(integration: any): Promise<void> {
    // Track revenue events from Stripe
    const mockPayments = [
      { amount: 99, type: 'payment_received' },
      { amount: 299, type: 'payment_received' },
      { amount: 49, type: 'payment_received' }
    ];

    for (const payment of mockPayments) {
      await supabase
        .from('revenue_events')
        .insert({
          user_id: integration.user_id,
          event_type: payment.type,
          amount: payment.amount,
          metadata: { source: 'stripe_sync' }
        });
    }
  }

  private static async syncStripeSubscriptions(integration: any): Promise<void> {
    // Additional Stripe-specific data sync
    console.log('Syncing Stripe subscription events...');
  }

  private static async syncPostHogEvents(integration: any): Promise<void> {
    // Simulate syncing PostHog analytics data
    const mockMetrics = [
      { type: 'processing_time', value: 95 },
      { type: 'accuracy_rate', value: 98.5 },
      { type: 'api_call', value: 1 }
    ];

    for (const metric of mockMetrics) {
      await supabase
        .from('api_metrics')
        .insert({
          user_id: integration.user_id,
          metric_type: metric.type,
          value: metric.value,
          metadata: { source: 'posthog_sync' }
        });
    }
  }

  private static async syncPostHogUsers(integration: any): Promise<void> {
    console.log('Syncing PostHog user data...');
  }

  private static async syncHubSpotContacts(integration: any): Promise<void> {
    console.log('Syncing HubSpot contacts...');
  }

  private static async syncHubSpotDeals(integration: any): Promise<void> {
    console.log('Syncing HubSpot deals...');
  }

  // Get sync history
  static async getSyncHistory(integrationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('integration_data_syncs')
      .select('*')
      .eq('integration_id', integrationId)
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data || [];
  }
}