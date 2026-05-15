import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { PayrollPreview, PayrollPreviewQuery } from '../types/payroll';

export const payrollService = {
  async getPreview(employeeId: string, query: PayrollPreviewQuery): Promise<PayrollPreview | null> {
    try {
      const response = await api.get(`/payroll/preview/${employeeId}`, {
        params: query,
      });
      return unwrapData<PayrollPreview>(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  async generatePreview(employeeId: string, query: PayrollPreviewQuery): Promise<void> {
    await api.post(`/payroll/preview/${employeeId}`, null, {
      params: query,
    });
  },
};
