import { api } from '../../core/api/client';
import { attendanceService, buildSelfieAttendancePayload, createSelfiePhotoCode } from '../attendance.service';

jest.mock('../../core/api/client', () => ({
  api: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

describe('attendanceService', () => {
  describe('getEmployeeAttendancePeriod', () => {
    it('should send year and month for the selected attendance period', async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: { data: [] } });

      await attendanceService.getEmployeeAttendancePeriod('EMP001', { year: 2026, month: 6 });

      expect(api.get).toHaveBeenCalledWith('/attendance/employee/EMP001/period', {
        params: { year: 2026, month: 6 },
      });
    });
  });

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

  describe('getTodayRecord', () => {
    it('should return the newest record for today', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: [
            { id: '1', checkin_at: '2026-07-02T02:00:00Z', checkout_at: null },
            { id: '2', checkin_at: '2026-07-02T05:00:00Z', checkout_at: null },
          ],
        },
      });

      const result = await attendanceService.getTodayRecord();

      expect(result?.id).toBe('2');
    });
  });

  describe('selfie timemark payload', () => {
    it('should generate an uppercase photoCode', () => {
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.123456789) as unknown as typeof Math.random;

      const photoCode = createSelfiePhotoCode();

      Math.random = originalRandom;

      expect(photoCode).toMatch(/^[A-Z0-9]+$/);
      expect(photoCode.length).toBeGreaterThan(0);
    });

    it('should build the selfie payload in timemark format', () => {
      const payload = buildSelfieAttendancePayload({
        photoCode: 'LTEXHMG939HA94',
        timestamp: 1782949965,
        timezoneID: 'Asia/Jakarta',
        lat: -6.150448,
        lng: 106.6548641,
        address: 'Jl. Darussalam Utara II No.36, RT.006/RW.006, Batusari, Kec. Batuceper, Kota Tangerang, Banten 15121',
        deviceID: 'e62d5f9e204bd939',
        deviceModel: 'realme C25',
      });

      expect(payload).toEqual({
        photoCode: 'LTEXHMG939HA94',
        timestamp: 1782949965,
        timezoneID: 'Asia/Jakarta',
        lat: -6.150448,
        lng: 106.6548641,
        address: 'Jl. Darussalam Utara II No.36, RT.006/RW.006, Batusari, Kec. Batuceper, Kota Tangerang, Banten 15121',
        deviceID: 'e62d5f9e204bd939',
        deviceModel: 'realme C25',
      });
    });

    it('should post selfie check-in as multipart form data', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: { data: { message: 'ok' } } });

      await attendanceService.checkinSelfie({
        photoCode: 'LTEXHMG939HA94',
        timestamp: 1782949965,
        timezoneID: 'Asia/Jakarta',
        lat: -6.150448,
        lng: 106.6548641,
        address: 'Jl. Darussalam Utara II No.36',
        deviceID: 'e62d5f9e204bd939',
        deviceModel: 'realme C25',
      }, {
        uri: 'file:///tmp/selfie-checkin.jpg',
        name: 'selfie-checkin.jpg',
        type: 'image/jpeg',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/attendance/selfie/checkin',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    });

    it('should post selfie checkout as multipart form data', async () => {
      (api.post as jest.Mock).mockResolvedValue({ data: { data: { message: 'ok' } } });

      await attendanceService.checkoutSelfie({
        photoCode: 'LTEXHMG939HA94',
        timestamp: 1782949965,
        timezoneID: 'Asia/Jakarta',
        lat: -6.150448,
        lng: 106.6548641,
        address: 'Jl. Darussalam Utara II No.36',
        deviceID: 'e62d5f9e204bd939',
        deviceModel: 'realme C25',
      }, {
        uri: 'file:///tmp/selfie-checkout.jpg',
        name: 'selfie-checkout.jpg',
        type: 'image/jpeg',
      });

      expect(api.post).toHaveBeenCalledWith(
        '/attendance/selfie/checkout',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      );
    });
  });
});
