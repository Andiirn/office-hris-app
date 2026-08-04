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

  describe('listCorrections', () => {
    it('sends the selected month as a date range', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: [
            { id: 'corr-1', attendance_date: '2026-06-10' },
            { id: 'corr-2', attendance_date: '2026-05-10' },
          ],
        },
      });

      const result = await attendanceService.listCorrections({
        employee_id: 'EMP001',
        year: 2026,
        month: 6,
        limit: 20,
      } as any);

      expect(api.get).toHaveBeenCalledWith('/attendance/corrections', {
        params: {
          employee_id: 'EMP001',
          date_from: '2026-06-01',
          date_to: '2026-06-30',
          limit: 20,
        },
      });
      expect(result).toEqual([
        { id: 'corr-1', attendance_date: '2026-06-10' },
        { id: 'corr-2', attendance_date: '2026-05-10' },
      ]);
    });

    it('unwraps correction detail responses', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: {
            id: 'corr-1',
            status: 'APPROVED',
            corrected_checkin: '2026-06-10T08:00:00',
          },
        },
      });

      const result = await attendanceService.getCorrectionDetail('corr-1');

      expect(api.get).toHaveBeenCalledWith('/attendance/corrections/corr-1');
      expect(result).toEqual({
        id: 'corr-1',
        status: 'APPROVED',
        corrected_checkin: '2026-06-10T08:00:00',
      });
    });
  });

  describe('listVisits', () => {
    it('sends the selected month as a date range', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: [
            { id: 'visit-1', visit_date: '2026-06-10', visit_time: '09:00:00' },
            { id: 'visit-2', visit_date: '2026-05-10', visit_time: '09:00:00' },
          ],
        },
      });

      const result = await attendanceService.listVisits({
        employee_id: 'EMP001',
        year: 2026,
        month: 6,
        limit: 20,
      } as any);

      expect(api.get).toHaveBeenCalledWith('/attendance/visit', {
        params: {
          employee_id: 'EMP001',
          date_from: '2026-06-01',
          date_to: '2026-06-30',
          limit: 20,
        },
      });
      expect(result).toEqual([
        { id: 'visit-1', visit_date: '2026-06-10', visit_time: '09:00:00', visit_photo_url: null },
        { id: 'visit-2', visit_date: '2026-05-10', visit_time: '09:00:00', visit_photo_url: null },
      ]);
    });
  });

  describe('visit actions', () => {
    it('approves visit without request body', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          data: { id: 'visit-1', status: 'APPROVED' },
        },
      });

      const result = await attendanceService.approveVisit('visit-1');

      expect(api.post).toHaveBeenCalledWith('/attendance/visit/visit-1/approve');
      expect(result).toEqual({ id: 'visit-1', status: 'APPROVED' });
    });

    it('rejects visit with reason body', async () => {
      (api.post as jest.Mock).mockResolvedValue({
        data: {
          data: { id: 'visit-1', status: 'REJECTED' },
        },
      });

      const result = await attendanceService.rejectVisit('visit-1', 'Lokasi tidak valid');

      expect(api.post).toHaveBeenCalledWith('/attendance/visit/visit-1/reject', {
        reason: 'Lokasi tidak valid',
      });
      expect(result).toEqual({ id: 'visit-1', status: 'REJECTED' });
    });
  });

  describe('getTodayRecord', () => {
    it('should fetch the open check-in record', async () => {
      (api.get as jest.Mock).mockReset();
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: { id: '2', checkin_at: '2026-07-02T05:00:00Z', checkout_at: null },
        },
      });

      const result = await attendanceService.getTodayRecord();

      expect(result?.id).toBe('2');
      expect((api.get as jest.Mock).mock.calls.at(-1)).toEqual([
        '/attendance/open-checkin',
        undefined,
      ]);
    });

    it('should return undefined when there is no open record', async () => {
      (api.get as jest.Mock).mockReset();
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: null,
        },
      });

      const result = await attendanceService.getTodayRecord();

      expect(result).toBeUndefined();
    });
  });

  describe('getTodayRecords', () => {
    it('should return the open record as a single-item array', async () => {
      (api.get as jest.Mock).mockResolvedValue({
        data: {
          data: { id: '1', checkin_at: '2026-07-02T02:00:00Z', checkout_at: null },
        },
      });

      const result = await attendanceService.getTodayRecords();

      expect(result.map((item) => item.id)).toEqual(['1']);
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
