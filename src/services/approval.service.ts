import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { ApprovalItem } from '../types/approval';

export const approvalService = {
  async getPending(params?: { page?: number; limit?: number }): Promise<ApprovalItem[]> {
    const response = await api.get('/approvals/pending', { params });
    const rawList = unwrapData<ApprovalItem[]>(response.data) || [];
    return rawList.map((item) => this.normalizeItem(item));
  },

  async getHistory(params?: { page?: number; limit?: number }): Promise<ApprovalItem[]> {
    const response = await api.get('/approvals/history', { params });
    const rawList = unwrapData<ApprovalItem[]>(response.data) || [];
    return rawList.map((item) => this.normalizeItem(item));
  },

  async processAction(requestId: string, action: 'APPROVE' | 'REJECT', comment?: string): Promise<void> {
    await api.post(`/approvals/${requestId}/action`, {
      action,
      comment,
    });
  },

  normalizeItem(item: any): ApprovalItem {
    return {
      ...item,
      module: item.module_name,
      request_id: item.reference_id,
      employee_name: item.requester?.full_name || 'Karyawan',
      requested_at: item.created_at || item.requested_at || new Date().toISOString(),
      description: item.reference_type ? `${item.reference_type} request` : undefined,
    };
  },
};
