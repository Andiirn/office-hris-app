import { api } from '../../core/api/client';
import { holidayService } from '../holiday.service';

jest.mock('../../core/api/client', () => ({
  api: {
    get: jest.fn(),
  },
}));

describe('holidayService', () => {
  describe('getHolidays', () => {
    it('should fetch holidays and unwrap data', async () => {
      const mockHolidays = [
        {
          id: '1',
          holiday_date: '2026-01-01',
          name: 'New Year',
          holiday_type: 'NATIONAL',
          is_optional_work: false,
        },
      ];
      const mockResponse = {
        data: {
          data: mockHolidays,
        },
      };
      (api.get as jest.Mock).mockResolvedValue(mockResponse);

      const query = { year: 2026 };
      const result = await holidayService.getHolidays(query);

      expect(api.get).toHaveBeenCalledWith('/holidays/', {
        params: query,
      });
      expect(result).toEqual(mockHolidays);
    });

    it('should handle different response shapes and return empty array if failed', async () => {
      (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await holidayService.getHolidays();

      expect(result).toEqual([]);
    });
  });
});
