import { parseAttendanceQrPayload } from '../qr';

describe('parseAttendanceQrPayload', () => {
  it('parses the new URL qr format', () => {
    expect(parseAttendanceQrPayload('https://hris.javasuperfood.com/attendance/scan?qr_token=tokentoken')).toEqual({
      qrToken: 'tokentoken',
    });
  });

  it('parses the legacy JSON qr format', () => {
    expect(parseAttendanceQrPayload(JSON.stringify({
      qr_token: 'tokentoken',
      branch_id: '3886772b-4b25-4796-a998-066911c51fe6',
    }))).toEqual({
      qrToken: 'tokentoken',
    });
  });

  it('parses the legacy branchId:token qr format', () => {
    expect(parseAttendanceQrPayload('3886772b-4b25-4796-a998-066911c51fe6:tokentoken')).toEqual({
      qrToken: 'tokentoken',
    });
  });
});
