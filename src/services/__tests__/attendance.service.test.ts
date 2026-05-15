import { api } from '../../core/api/client';
import { attendanceService } from '../attendance.service';

jest.mock('../../core/api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('attendanceService', () => {
  describe('getAttendanceHistory', () => {
    it('should fetch attendance history and unwrap data', async () => {
      const mockData = {
        data: [
          { id: '1', date: '2026-05-15', checkin_time: '08:00', checkout_time: '17:00' },
          { id: '2', date: '2026-05-14', checkin_time: '08:05', checkout_time: '17:05' },
        ],
      };
      (api.get as jest.Mock).mockResolvedValue({ data: mockData });

      const query = { 
        employee_id: 'EMP001', 
        date_from: '2026-05-15', 
        date_to: '2026-05-15', 
        limit: 10, 
        page: 1 
      };
      const result = await attendanceService.getAttendanceHistory(query);

      expect(api.get).toHaveBeenCalledWith('/attendance/', {
        params: query,
      });
      expect(result).toEqual(mockData.data);
    });

    it('should return empty array if data is missing', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: {} });

      const result = await attendanceService.getAttendanceHistory();

      expect(result).toEqual([]);
    });
  });
});
