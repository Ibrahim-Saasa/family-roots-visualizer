import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FamilyMember } from '@/types/family';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface FamilyTreeGraphProps {
  members: FamilyMember[];
  rootMembers: FamilyMember[];
  getChildren: (id: string) => FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

interface NodeLayout {
  member: FamilyMember;
  x: number;
  y: number;
  width: number;
  height: number;
}

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;
const H_GAP = 24;
const V_GAP = 80;

function computeLayout(
  rootMembers: FamilyMember[],
  getChildren: (id: string) => FamilyMember[]
): { nodes: NodeLayout[]; totalWidth: number; totalHeight: number } {
  const nodes: NodeLayout[] = [];
  let xCursor = 0;

  function layoutNode(member: FamilyMember, depth: number): { x: number; width: number } {
    const children = getChildren(member.id);
    const y = depth * (NODE_HEIGHT + V_GAP);

    if (children.length === 0) {
      const x = xCursor;
      nodes.push({ member, x, y, width: NODE_WIDTH, height: NODE_HEIGHT });
      xCursor += NODE_WIDTH + H_GAP;
      return { x, width: NODE_WIDTH };
    }

    const childLayouts = children.map(c => layoutNode(c, depth + 1));
    const firstChildCenter = childLayouts[0].x + childLayouts[0].width / 2;
    const lastChildCenter = childLayouts[childLayouts.length - 1].x + childLayouts[childLayouts.length - 1].width / 2;
    const parentX = (firstChildCenter + lastChildCenter) / 2 - NODE_WIDTH / 2;

    nodes.push({ member, x: parentX, y, width: NODE_WIDTH, height: NODE_HEIGHT });
    return { x: parentX, width: NODE_WIDTH };
  }

  for (const root of rootMembers) {
    layoutNode(root, 0);
  }

  const maxX = Math.max(...nodes.map(n => n.x + n.width), 0);
  const maxY = Math.max(...nodes.map(n => n.y + n.height), 0);

  return { nodes, totalWidth: maxX + 40, totalHeight: maxY + 40 };
}

export function FamilyTreeGraph({ members, rootMembers, getChildren, selectedId, onSelect }: FamilyTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, totalWidth, totalHeight } = useMemo(
    () => computeLayout(rootMembers, getChildren),
    [rootMembers, getChildren]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeLayout>();
    nodes.forEach(n => map.set(n.member.id, n));
    return map;
  }, [nodes]);

  // Build edges: parent -> child
  const edges = useMemo(() => {
    const result: { parentNode: NodeLayout; childNode: NodeLayout }[] = [];
    for (const node of nodes) {
      const { member } = node;
      if (member.fatherId) {
        const parent = nodeMap.get(member.fatherId);
        if (parent) result.push({ parentNode: parent, childNode: node });
      }
      if (member.motherId) {
        const parent = nodeMap.get(member.motherId);
        if (parent) result.push({ parentNode: parent, childNode: node });
      }
    }
    return result;
  }, [nodes, nodeMap]);

  if (members.length === 0) return null;

  const padding = 20;

  return (
    <div ref={containerRef} className="overflow-auto rounded-xl border bg-card/50 p-4">
      <div style={{ minWidth: totalWidth + padding * 2, minHeight: totalHeight + padding * 2, position: 'relative' }}>
        {/* SVG for connecting lines */}
        <svg
          width={totalWidth + padding * 2}
          height={totalHeight + padding * 2}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          {edges.map((edge, i) => {
            const px = padding + edge.parentNode.x + NODE_WIDTH / 2;
            const py = padding + edge.parentNode.y + NODE_HEIGHT;
            const cx = padding + edge.childNode.x + NODE_WIDTH / 2;
            const cy = padding + edge.childNode.y;
            const midY = (py + cy) / 2;

            return (
              <path
                key={i}
                d={`M ${px} ${py} C ${px} ${midY}, ${cx} ${midY}, ${cx} ${cy}`}
                fill="none"
                stroke="hsl(var(--tree-line))"
                strokeWidth="2"
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {nodes.map(node => {
          const { member, x, y } = node;
          const isSelected = selectedId === member.id;

          const genderBorderClass = member.gender === 'male'
            ? 'border-tree-male'
            : member.gender === 'female'
            ? 'border-tree-female'
            : 'border-tree-other';

          const genderBgClass = member.gender === 'male'
            ? 'bg-tree-male/10'
            : member.gender === 'female'
            ? 'bg-tree-female/10'
            : 'bg-tree-other/10';

          const iconBgClass = member.gender === 'male'
            ? 'bg-tree-male/20'
            : member.gender === 'female'
            ? 'bg-tree-female/20'
            : 'bg-tree-other/20';

          return (
            <button
              key={member.id}
              onClick={() => onSelect(member.id)}
              className={cn(
                'absolute flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200',
                'hover:shadow-md hover:scale-[1.03] cursor-pointer',
                genderBorderClass,
                genderBgClass,
                isSelected && 'ring-2 ring-primary shadow-lg scale-[1.03]'
              )}
              style={{
                left: padding + x,
                top: padding + y,
                width: NODE_WIDTH,
                height: NODE_HEIGHT,
              }}
            >
              <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', iconBgClass)}>
                <User className="h-3.5 w-3.5 text-foreground/70" />
              </div>
              <div className="min-w-0 text-left">
                <p className="font-medium text-xs truncate text-foreground">{member.name}</p>
                {member.dateOfBirth && (
                  <p className="text-[10px] text-muted-foreground">{member.dateOfBirth}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
