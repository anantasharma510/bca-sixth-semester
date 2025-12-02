import { authClient } from '../../lib/auth-client';
import { resolveApiBaseUrl } from '../../config/env';

const API_BASE_URL = resolveApiBaseUrl();

export interface CreateReportRequest {
  reportedEntityType: 'Post' | 'User' | 'Comment';
  reportedEntityId: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'inappropriate_content' | 'fake_news' | 'copyright' | 'other';
  description?: string;
}

export interface Report {
  _id: string;
  reporter: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  reportedUser?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  };
  reportedPost?: {
    _id: string;
    content: string;
    author: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
    createdAt: string;
  };
  reportedComment?: {
    _id: string;
    content: string;
    author: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
    };
    createdAt: string;
  };
  reason: string;
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  adminNotes?: string;
  resolvedBy?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportsResponse {
  reports: Report[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalReports: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

class ReportsAPI {
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
      throw new Error(errorData.error || `HTTP ${response.status} error`);
    }

    return response.json();
  }

  // Create a new report
  async createReport(reportData: CreateReportRequest, token?: string): Promise<{ report: Report; message: string }> {
    return this.callAPI('/reports', token, {
      method: 'POST',
      body: JSON.stringify(reportData),
    });
  }

  // Get user's own reports
  async getMyReports(token: string | undefined, page: number = 1, limit: number = 10): Promise<ReportsResponse> {
    return this.callAPI(`/reports/my-reports?page=${page}&limit=${limit}`, token);
  }

  // Get all reports (admin only)
  async getAllReports(
    token: string | undefined,
    page: number = 1,
    limit: number = 20,
    filters?: {
      status?: string;
      priority?: string;
      reason?: string;
    }
  ): Promise<ReportsResponse & { stats: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      params.append('priority', filters.priority);
    }
    if (filters?.reason && filters.reason !== 'all') {
      params.append('reason', filters.reason);
    }

    return this.callAPI(`/reports?${params}`, token);
  }

  // Get a specific report (admin only)
  async getReport(token: string | undefined, reportId: string): Promise<{ report: Report }> {
    return this.callAPI(`/reports/${reportId}`, token);
  }

  // Update report status (admin only)
  async updateReport(
    token: string | undefined,
    reportId: string,
    updates: {
      status?: string;
      priority?: string;
      adminNotes?: string;
    }
  ): Promise<{ report: Report; message: string }> {
    return this.callAPI(`/reports/${reportId}`, token, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Delete report (admin only)
  async deleteReport(token: string | undefined, reportId: string): Promise<{ message: string }> {
    return this.callAPI(`/reports/${reportId}`, token, {
      method: 'DELETE',
    });
  }
}

export const reportsAPI = new ReportsAPI();
