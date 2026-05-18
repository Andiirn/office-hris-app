import { api } from '../core/api/client';
import { unwrapData } from '../core/api/envelope';
import { Holiday, HolidayListQuery } from '../types/holiday';

export const holidayService = {
  async getHolidays(query?: HolidayListQuery): Promise<Holiday[]> {
    try {
      const response = await api.get('/holidays/', {
        params: query,
      });
      
      const data: any = unwrapData(response.data);

      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.items)) {
        return data.items;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      }

      return [];
    } catch (error) {
      console.error('[HolidayService] getHolidays error:', error);
      return [];
    }
  },
};
