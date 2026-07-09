import { VisitItem } from '../../types/attendance';

export type HierarchyNode = {
  id: string;
  full_name?: string;
  nik?: string;
  position?: string | null;
  children?: HierarchyNode[];
};

export function findDescendantIds(nodes: HierarchyNode[], employeeId: string): string[] {
  const walk = (node: HierarchyNode): string[] | null => {
    if (node.id === employeeId) {
      return collectDescendantIds(node.children ?? []);
    }

    for (const child of node.children ?? []) {
      const match = walk(child);
      if (match) return match;
    }

    return null;
  };

  for (const node of nodes) {
    const match = walk(node);
    if (match) return match;
  }

  return [];
}

function collectDescendantIds(nodes: HierarchyNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectDescendantIds(node.children ?? [])]);
}

export function filterVisitsByDescendants(visits: VisitItem[], descendantIds: string[]): VisitItem[] {
  const allowedIds = new Set(descendantIds);
  return visits.filter((visit) => Boolean(visit.employee_id) && allowedIds.has(String(visit.employee_id)));
}
