import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { tokenStore } from '../core/auth/token-store';
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
    const token = await tokenStore.getAccessToken();
    const params = new URLSearchParams({
      month: String(query.month),
      year: String(query.year),
    });
    const url = `${api.defaults.baseURL}/payroll/preview/${employeeId}/pdf?${params.toString()}`;
    
    const formattedMonth = String(query.month).padStart(2, '0');
    const filename = `slip-${query.year}-${formattedMonth}-${employeeId}.pdf`;
    const localUri = `${FileSystem.cacheDirectory}${filename}`;
    
    console.log(`[PayrollService] Downloading PDF from ${url} to ${localUri}`);
    
    const result = await FileSystem.downloadAsync(url, localUri, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    
    return result.uri;
  },
};
