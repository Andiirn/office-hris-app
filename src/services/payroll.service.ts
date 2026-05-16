import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { PayrollPreview, PayrollPreviewQuery } from '../types/payroll';

export const payrollService = {
  async getPreview(employeeId: string, query: PayrollPreviewQuery): Promise<PayrollPreview | null> {
    try {
      console.log(`[PayrollService] Fetching preview for ${employeeId}`, query);
      const response = await api.get(`/payroll/preview/${employeeId}`, {
        params: query,
      });
      console.log('[PayrollService] Full Response Body:', JSON.stringify(response.data, null, 2));
      const raw: any = unwrapData(response.data);
      console.log('[PayrollService] Unwrapped Data:', JSON.stringify(raw, null, 2));
      
      // Handle nested payroll object if present
      const data = (raw && raw.payroll) ? raw.payroll : raw;
      
      return data as PayrollPreview;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      console.error('[PayrollService] Error fetching preview:', error.response?.status, error.message);
      throw error;
    }
  },

  async generatePreview(employeeId: string, query: PayrollPreviewQuery): Promise<void> {
    await api.post(`/payroll/preview/${employeeId}`, null, {
      params: query,
    });
  },

  async downloadPdf(employeeId: string, query: PayrollPreviewQuery): Promise<string> {
    await api.get(`/payroll/preview/${employeeId}/pdf`, {
      params: query,
      responseType: 'blob',
    });
    
    // In a real browser this would trigger download, 
    // in Expo we might need expo-file-system and expo-sharing
    // Returning the URL for now
    return `${api.defaults.baseURL}/payroll/preview/${employeeId}/pdf?month=${query.month}&year=${query.year}`;
  },
};
