"use client";

import { useState, useEffect } from "react";
import { useProtectedApi } from "@/lib/api";
import { Flag, Eye, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, User, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Report {
  _id: string;
  reporterId: string;
  reportedEntityType: 'Post' | 'User' | 'Comment';
  reportedEntityId: string;
  reason: 'spam' | 'harassment' | 'hate_speech' | 'violence' | 'inappropriate_content' | 'fake_news' | 'copyright' | 'other';
  description?: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  urgent: number;
}

export default function AdminReportsPage() {
  const { callProtectedApi } = useProtectedApi();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats>({ total: 0, pending: 0, underReview: 0, resolved: 0, dismissed: 0, urgent: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  useEffect(() => {
    fetchReports();
  }, [filterStatus, filterPriority, currentPage]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: currentPage.toString(), 
        limit: limit.toString() 
      });
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterPriority !== "all") params.append("priority", filterPriority);

      const data = await callProtectedApi(`/api/reports?${params}`);
      setReports(data.reports || []);
      setStats(data.stats || { total: 0, pending: 0, underReview: 0, resolved: 0, dismissed: 0, urgent: 0 });
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reports.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateReport = async (reportId: string, updates: any) => {
    try {
      const response = await callProtectedApi(`/api/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      toast({
        title: "Report Updated",
        description: response.message || "Report updated successfully.",
      });
      fetchReports();
      if (selectedReport?._id === reportId) {
        setSelectedReport(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error: any) {
      console.error("Failed to update report:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update report.",
        variant: "destructive",
      });
    }
  };

  const deleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;

    try {
      const response = await callProtectedApi(`/api/reports/${reportId}`, {
        method: "DELETE",
      });
      toast({
        title: "Report Deleted",
        description: response.message || "Report deleted successfully.",
      });
      fetchReports();
      if (selectedReport?._id === reportId) {
        setSelectedReport(null);
      }
    } catch (error: any) {
      console.error("Failed to delete report:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to delete report.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200",
      under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200",
      resolved: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200",
      dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: "bg-red-500 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-green-500 text-white",
    };
    return colors[priority as keyof typeof colors] || colors.medium;
  };

  const getEntityTypeIcon = (type: 'Post' | 'User' | 'Comment') => {
    switch (type) {
      case 'Post': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'User': return <User className="w-4 h-4 text-green-500" />;
      case 'Comment': return <MessageSquare className="w-4 h-4 text-purple-500" />;
      default: return <Flag className="w-4 h-4 text-gray-500" />;
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Content Reports</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage reported posts, users, and comments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.pending}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.underReview}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Under Review</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.resolved}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.dismissed}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Dismissed</div>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.urgent}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Urgent</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>

        <select
          value={filterPriority}
          onChange={(e) => {
            setFilterPriority(e.target.value);
            setCurrentPage(1);
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 text-blue-500 mx-auto"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400">No content reports found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Reporter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Entity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {report.reason}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                      {report.description || "No description provided."}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-2">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <span className="text-sm text-blue-600 dark:text-blue-400">
                        {report.reporterId}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getEntityTypeIcon(report.reportedEntityType)}
                      <span className="text-sm text-gray-900 dark:text-white">
                        {report.reportedEntityType}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      ID: {report.reportedEntityId}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(report.priority)}`}>
                      {report.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(report.status)}`}>
                      {report.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => deleteReport(report._id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex justify-between items-center p-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="outline"
            >
              Previous
            </Button>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Report Details - {selectedReport.reason}
                </h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Reporter Info */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reported By</label>
                  <div className="mt-1">
                    <span className="text-blue-600 dark:text-blue-400">
                      {selectedReport.reporterId}
                    </span>
                  </div>
                </div>

                {/* Reported Entity Info */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reported Entity</label>
                  <div className="mt-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      {getEntityTypeIcon(selectedReport.reportedEntityType)}
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {selectedReport.reportedEntityType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {selectedReport.reportedEntityId}
                    </p>
                  </div>
                </div>

                {/* Reporter's Description */}
                {selectedReport.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Reporter's Description</label>
                    <p className="mt-1 text-gray-900 dark:text-white whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>
                )}

                {/* Status and Priority */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                    <select
                      value={selectedReport.status}
                      onChange={(e) => updateReport(selectedReport._id, { status: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="pending">Pending</option>
                      <option value="under_review">Under Review</option>
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                    <select
                      value={selectedReport.priority}
                      onChange={(e) => updateReport(selectedReport._id, { priority: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Admin Notes */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Admin Notes</label>
                  <textarea
                    defaultValue={selectedReport.adminNotes || ""}
                    onBlur={(e) => updateReport(selectedReport._id, { adminNotes: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={4}
                    placeholder="Add internal notes about this report..."
                  />
                </div>

                {/* Resolution Info */}
                {(selectedReport.status === 'resolved' || selectedReport.status === 'dismissed') && (
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <p>Resolved By: {selectedReport.resolvedBy || 'N/A'}</p>
                    </div>
                    <div>
                      <p>Resolved At: {selectedReport.resolvedAt ? new Date(selectedReport.resolvedAt).toLocaleString() : 'N/A'}</p>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="flex justify-end gap-2 mt-4">
                  {selectedReport.status !== 'resolved' && (
                    <Button
                      variant="outline"
                      onClick={() => updateReport(selectedReport._id, { status: 'resolved' })}
                      className="flex items-center"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" /> Mark Resolved
                    </Button>
                  )}
                  {selectedReport.status !== 'dismissed' && (
                    <Button
                      variant="outline"
                      onClick={() => updateReport(selectedReport._id, { status: 'dismissed' })}
                      className="flex items-center"
                    >
                      <XCircle className="mr-2 h-4 w-4" /> Dismiss
                    </Button>
                  )}
                  {selectedReport.priority !== 'urgent' && (
                    <Button
                      variant="outline"
                      onClick={() => updateReport(selectedReport._id, { priority: 'urgent' })}
                      className="flex items-center text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <AlertTriangle className="mr-2 h-4 w-4" /> Mark Urgent
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}