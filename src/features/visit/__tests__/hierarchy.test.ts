import { filterVisitsByDescendants, findDescendantIds, type HierarchyNode } from '../hierarchy';

describe('visit hierarchy helpers', () => {
  it('returns all descendants for the matched node', () => {
    const nodes: HierarchyNode[] = [
      {
        id: 'leader-1',
        children: [
          { id: 'emp-1', children: [] },
          { id: 'lead-2', children: [{ id: 'emp-2', children: [] }] },
        ],
      },
    ];

    expect(findDescendantIds(nodes, 'leader-1')).toEqual(['emp-1', 'lead-2', 'emp-2']);
  });

  it('filters visits to descendants only', () => {
    expect(
      filterVisitsByDescendants(
        [
          { id: 'visit-1', employee_id: 'emp-1' } as any,
          { id: 'visit-2', employee_id: 'emp-2' } as any,
          { id: 'visit-3', employee_id: 'other-1' } as any,
        ],
        ['emp-1', 'emp-2']
      )
    ).toEqual([
      { id: 'visit-1', employee_id: 'emp-1' },
      { id: 'visit-2', employee_id: 'emp-2' },
    ]);
  });
});
