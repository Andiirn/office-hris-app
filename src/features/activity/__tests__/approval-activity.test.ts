import { buildApprovalActivityItems } from '../approval-activity';

describe('buildApprovalActivityItems', () => {
  it('maps approval history into activity feed items', () => {
    const items = buildApprovalActivityItems(
      [
        {
          id: 'hist-1',
          approval_request_id: 'req-1',
          module_name: 'OVERTIME',
          action: 'APPROVE',
          approved_at: '2026-06-25T08:00:00Z',
          level_order: 2,
          requester_name: 'BUDI KURNIAWAN',
          approver_name: 'SITI FAIJAH',
          reference_type: 'overtime_record',
          reference_detail: {
            overtime_date: '2026-06-25',
            overtime_hours: 1.5,
          },
        },
      ] as any,
      {
        formatDateOnly: (value) => value?.slice(0, 10) || '-',
        toSortTime: (value) => (value ? Date.parse(value) : 0),
      }
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: 'approval-hist-1',
      type: 'approval.approved',
      origin: 'approval',
      title: 'Menyetujui pengajuan Lembur dari BUDI KURNIAWAN',
      summary: '2026-06-25 · Disetujui oleh SITI FAIJAH',
      timestamp: '2026-06-25T08:00:00Z',
      sortTime: Date.parse('2026-06-25T08:00:00Z'),
      icon: 'check-circle',
      color: '#1f6b42',
      bgColor: '#d9e6da',
      status: 'APPROVED',
      details: [
        'SITI FAIJAH telah menyetujui pengajuan Lembur dari BUDI KURNIAWAN',
        'Waktu: 2026-06-25',
      ],
    });
  });
});
