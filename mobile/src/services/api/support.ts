import { authClient } from '../../lib/auth-client';
import { resolveApiBaseUrl } from '../../config/env';

const API_BASE_URL = resolveApiBaseUrl();

export interface SupportTicket {
  _id: string;
  userId: string;
  subject: string;
  message: string;
  category: 'bug' | 'feature' | 'account' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  adminNotes?: string;
}

export interface CreateTicketData {
  subject: string;
  message: string;
  category?: 'bug' | 'feature' | 'account' | 'billing' | 'other';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface UpdateTicketData {
  message?: string;
  status?: 'closed';
}

class SupportAPI {
  private async callAPI(endpoint: string, token?: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const cookies = authClient.getCookie();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers ? (options.headers as Record<string, string>) : {}),
    };

    if (cookies) {
      headers['Cookie'] = cookies;
    } else if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status} error`);
    }

    return response.json();
  }

  // Create a new support ticket
  async createTicket(token: string | undefined, data: CreateTicketData): Promise<{ ticket: SupportTicket; message: string }> {
    console.log('📱 API: Creating support ticket:', { subject: data.subject, category: data.category });
    return this.callAPI('/support', token, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Get user's support tickets
  async getUserTickets(token: string | undefined, page: number = 1, limit: number = 20): Promise<{
    tickets: SupportTicket[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalTickets: number;
      limit: number;
    };
  }> {
    console.log('📱 API: Getting user support tickets, page:', page);
    return this.callAPI(`/support?page=${page}&limit=${limit}`, token);
  }

  // Get a specific support ticket
  async getTicket(token: string | undefined, ticketId: string): Promise<{ ticket: SupportTicket }> {
    console.log('📱 API: Getting support ticket:', ticketId);
    return this.callAPI(`/support/${ticketId}`, token);
  }

  // Update a support ticket (add message or close)
  async updateTicket(token: string | undefined, ticketId: string, data: UpdateTicketData): Promise<{ ticket: SupportTicket; message: string }> {
    console.log('📱 API: Updating support ticket:', ticketId, data);
    return this.callAPI(`/support/${ticketId}`, token, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

// Create and export singleton instance
export const supportAPI = new SupportAPI();

