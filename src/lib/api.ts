/**
 * API client for backend communication
 */

// Use VITE_API_URL if set, otherwise use relative paths (works with proxies)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken(): void {
    const stored = localStorage.getItem('auth_token');
    if (stored) {
      this.token = stored;
    }
  }

  setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      const data = response.ok ? await response.json().catch(() => null) : null;

      if (!response.ok) {
        const error = data?.detail || data?.error || `HTTP ${response.status}`;
        return { error, status: response.status };
      }

      return { data, status: response.status };
    } catch (error) {
      console.error('API request failed:', error);
      return { 
        error: error instanceof Error ? error.message : 'Network error',
        status: 0 
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();

// Auth endpoints
export const authApi = {
  async login(email: string, password: string) {
    const response = await apiClient.post<{ access_token: string }>('/api/v1/auth/login', {
      username: email,
      password,
    });
    
    if (response.data?.access_token) {
      apiClient.setToken(response.data.access_token);
    }
    
    return response;
  },

  async register(email: string, password: string, name?: string) {
    return apiClient.post('/api/v1/auth/register', { email, password, name });
  },

  async logout() {
    apiClient.setToken(null);
    return { status: 200 };
  },

  async getCurrentUser() {
    return apiClient.get('/api/v1/auth/me');
  },
};

// Conversations endpoints
export const conversationsApi = {
  async list() {
    return apiClient.get('/api/v1/conversations');
  },

  async get(id: string) {
    return apiClient.get(`/api/v1/conversations/${id}`);
  },

  async create(data: any) {
    return apiClient.post('/api/v1/conversations', data);
  },

  async update(id: string, data: any) {
    return apiClient.patch(`/api/v1/conversations/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/api/v1/conversations/${id}`);
  },

  async sendMessage(conversationId: string, message: string) {
    return apiClient.post(`/api/v1/conversations/${conversationId}/messages`, { message });
  },
};

// Agents endpoints
export const agentsApi = {
  async list() {
    return apiClient.get('/api/v1/agents');
  },

  async get(id: string) {
    return apiClient.get(`/api/v1/agents/${id}`);
  },

  async create(data: any) {
    return apiClient.post('/api/v1/agents', data);
  },

  async update(id: string, data: any) {
    return apiClient.patch(`/api/v1/agents/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/api/v1/agents/${id}`);
  },

  async execute(id: string, input: any) {
    return apiClient.post(`/api/v1/agents/${id}/execute`, input);
  },
};

// Tasks endpoints
export const tasksApi = {
  async list() {
    return apiClient.get('/api/v1/tasks');
  },

  async get(id: string) {
    return apiClient.get(`/api/v1/tasks/${id}`);
  },

  async create(data: any) {
    return apiClient.post('/api/v1/tasks', data);
  },

  async update(id: string, data: any) {
    return apiClient.patch(`/api/v1/tasks/${id}`, data);
  },

  async delete(id: string) {
    return apiClient.delete(`/api/v1/tasks/${id}`);
  },

  async approve(id: string) {
    return apiClient.post(`/api/v1/tasks/${id}/approve`);
  },

  async reject(id: string, reason?: string) {
    return apiClient.post(`/api/v1/tasks/${id}/reject`, { reason });
  },
};

// Marketplace endpoints
export const marketplaceApi = {
  async listAgents() {
    return apiClient.get('/api/v1/marketplace/agents');
  },

  async getAgent(id: string) {
    return apiClient.get(`/api/v1/marketplace/agents/${id}`);
  },

  async installAgent(id: string) {
    return apiClient.post(`/api/v1/marketplace/agents/${id}/install`);
  },

  async uninstallAgent(id: string) {
    return apiClient.delete(`/api/v1/marketplace/agents/${id}/install`);
  },
};

// WebSocket connection
export function createWebSocketConnection(endpoint: string = '/ws'): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // If API_BASE_URL is set, use it; otherwise use current host
  const wsUrl = API_BASE_URL 
    ? API_BASE_URL.replace(/^http/, 'ws') + endpoint
    : `${protocol}//${window.location.host}${endpoint}`;
  
  const token = localStorage.getItem('auth_token');
  const ws = new WebSocket(token ? `${wsUrl}?token=${token}` : wsUrl);
  
  ws.onopen = () => {
    console.log('WebSocket connected');
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  ws.onclose = () => {
    console.log('WebSocket disconnected');
  };
  
  return ws;
}

// SSE connection
export function createSSEConnection(endpoint: string): EventSource {
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  const token = localStorage.getItem('auth_token');
  
  const eventSource = new EventSource(
    token ? `${url}?token=${token}` : url
  );
  
  eventSource.onopen = () => {
    console.log('SSE connected');
  };
  
  eventSource.onerror = (error) => {
    console.error('SSE error:', error);
  };
  
  return eventSource;
}

// Threading endpoints
export const threadingApi = {
  // Archive/restore messages
  async archiveMessage(messageId: string) {
    return apiClient.post(`/api/v1/messages/${messageId}/archive`);
  },

  async restoreMessage(messageId: string) {
    return apiClient.post(`/api/v1/messages/${messageId}/restore`);
  },

  // Create replies and branches
  async createReply(data: {
    replyToMessageId: string;
    content: string;
    quotedText?: string;
  }) {
    return apiClient.post('/api/v1/messages/reply', data);
  },

  async createBranch(data: {
    parentMessageId: string;
    selectedText: string;
    initialMessage: string;
  }) {
    return apiClient.post('/api/v1/messages/branch', data);
  },

  // Thread management
  async getThreads(params?: {
    limit?: number;
    status?: 'active' | 'archived';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.status) searchParams.set('status', params.status);
    
    return apiClient.get(`/api/v1/threads?${searchParams}`);
  },

  async getThread(threadId: string) {
    return apiClient.get(`/api/v1/threads/${threadId}`);
  },

  async getThreadMessages(threadId: string, includeArchived = false) {
    return apiClient.get(`/api/v1/threads/${threadId}/messages?includeArchived=${includeArchived}`);
  },

  async updateThread(threadId: string, data: { title?: string; status?: string }) {
    return apiClient.patch(`/api/v1/threads/${threadId}`, data);
  },

  // Summarization queue
  async queueSummarization(data: {
    jobId: string;
    type: 'thread_summarization';
    context: {
      messageId: string;
      threadId: string;
      selectedText: string;
      initialMessage: string;
      parentMessageId: string;
      userId: string;
    };
  }) {
    return apiClient.post('/api/v1/queue/summarization', data);
  },

  // Get summarization job status
  async getSummarizationStatus(jobId: string) {
    return apiClient.get(`/api/v1/queue/summarization/${jobId}/status`);
  }
};

// Health check
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health');
    return response.status === 200;
  } catch {
    return false;
  }
}