import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { ApprovalFeedback, ApprovalItem, ApprovalRequestDetail } from '../types/approval';

export const approvalService = {
  async getPending(params?: { page?: number; limit?: number }): Promise<ApprovalItem[]> {
    const response = await api.get('/approvals/pending', { params });
    const rawList = unwrapData<ApprovalItem[]>(response.data) || [];
    return rawList.map((item) => this.normalizeItem(item));
  },

  async getHistory(params?: { page?: number; limit?: number }): Promise<ApprovalItem[]> {
    const response = await api.get('/approvals/history', { params });
    const rawList = unwrapData<ApprovalItem[]>(response.data) || [];
    const normalized = rawList.map((item) => this.normalizeItem(item));
    return Promise.all(
      normalized.map(async (item) => {
        const requestId = item.approval_request_id || item.request_id || item.id;
        if (!requestId) return item;

        try {
          const detail = await this.getRequestDetail(requestId);
          return this.mergeApprovalRequestDetail(item, detail);
        } catch {
          return item;
        }
      })
    );
  },

  async processAction(requestId: string, action: 'APPROVE' | 'REJECT', comment?: string): Promise<void> {
    await api.post(`/approvals/${requestId}/action`, {
      action,
      comment,
    });
  },

  async getRequestDetail(requestId: string): Promise<ApprovalRequestDetail> {
    const response = await api.get(`/approvals/${requestId}`);
    return unwrapData<ApprovalRequestDetail>(response.data);
  },

  async getFeedback(referenceId: string): Promise<{ success?: boolean; data: ApprovalFeedback[] }> {
    const response = await api.get('/approvals/feedbacks', {
      params: { reference_id: referenceId },
    });
    const data = unwrapData<ApprovalFeedback[]>(response.data) || [];
    return {
      success: response.data?.success,
      data,
    };
  },

  normalizeItem(item: any): ApprovalItem {
    const actionRequestId = item.approval_request_id || item.id;
    const referenceId = item.reference_id || item.approval_request_id || item.id;
    const requestedAt = item.created_at || item.requested_at || item.approved_at || new Date().toISOString();
    const action = item.action || item.status || 'PENDING';
    const status = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action;
    const requesterName = item.requester?.full_name || item.requester_name || '';
    const approverName = item.approver?.full_name || item.approver_name || '';

    return {
      ...item,
      module: item.module_name,
      reference_id: referenceId,
      reference_type: item.reference_type || item.module_name || 'Approval',
      current_level: item.current_level ?? item.level_order ?? 0,
      max_level: item.max_level ?? item.level_order ?? item.current_level ?? 0,
      status,
      created_at: item.created_at ?? item.approved_at ?? null,
      requested_at: requestedAt,
      requester: item.requester ?? null,
      approver: item.approver ?? null,
      reference_detail: item.reference_detail ?? null,
      approval_request_id: item.approval_request_id ?? item.id,
      request_id: actionRequestId,
      employee_name: requesterName,
      requester_name: requesterName,
      approver_name: approverName,
      description: item.reference_type ? `${item.reference_type} request` : undefined,
      action,
      comment: item.comment ?? null,
      approved_at: item.approved_at ?? null,
      level_order: item.level_order ?? item.current_level ?? 0,
    };
  },

  mergeApprovalRequestDetail(item: ApprovalItem, detail: ApprovalRequestDetail): ApprovalItem {
    const requesterName = detail.requester?.full_name || item.requester_name || item.employee_name || '';

    return {
      ...item,
      requester: detail.requester ?? item.requester ?? null,
      requester_name: requesterName,
      employee_name: requesterName,
      reference_id: detail.reference_id || item.reference_id,
      reference_type: detail.reference_type || item.reference_type,
      current_level: detail.current_level ?? item.current_level,
      max_level: detail.max_level ?? item.max_level,
      reference_detail: detail.reference_detail ?? item.reference_detail ?? null,
    };
  },
};
