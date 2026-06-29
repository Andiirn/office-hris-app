import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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
      console.log('[PayrollService] Error fetching preview:', error.response?.status, error.message);
      throw error;
    }
  },

  async generatePreview(employeeId: string, query: PayrollPreviewQuery): Promise<void> {
    await api.post(`/payroll/preview/${employeeId}`, null, {
      params: query,
    });
  },

  async downloadPdf(employeeId: string, query: PayrollPreviewQuery): Promise<{ localUri: string; filename: string }> {
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
    
    const response = await api.get(url, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    const blob = response.data as Blob;
    const reader = new FileReader();
    const base64 = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          const commaIndex = result.indexOf(',');
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
          return;
        }
        reject(new Error('Gagal membaca file PDF'));
      };
      reader.onerror = () => reject(new Error('Gagal membaca file PDF'));
      reader.readAsDataURL(blob);
    });

    await FileSystem.writeAsStringAsync(localUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { localUri, filename };
  },

  async savePdfToDownloads(localUri: string, filename: string): Promise<string> {
    if (Platform.OS !== 'android') {
      throw new Error('Save to Downloads hanya didukung di Android');
    }

    const { StorageAccessFramework } = FileSystem;
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();

    if (!permission.granted) {
      throw new Error('Izin folder tidak diberikan');
    }

    const pdfBase64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const targetUri = await StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      filename,
      'application/pdf',
    );

    await FileSystem.writeAsStringAsync(targetUri, pdfBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return targetUri;
  },

  async sharePdf(localUri: string, filename: string): Promise<void> {
    if (!(await Sharing.isAvailableAsync())) {
      throw new Error('Sharing tidak tersedia di perangkat ini');
    }

    await Sharing.shareAsync(localUri, {
      mimeType: 'application/pdf',
      dialogTitle: filename,
      UTI: 'com.adobe.pdf',
    });
  },
};
