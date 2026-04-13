import { useRef, useMemo } from 'react';
import { FamilyMember } from '@/types/family';
import { cn } from '@/lib/utils';
import { User, Heart } from 'lucide-react';

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
const SPOUSE_GAP = 8;
const COUPLE_WIDTH = NODE_WIDTH * 2 + SPOUSE_GAP;

function computeLayout(
  rootMembers: FamilyMember[],
  getChildren: (id: string) => FamilyMember[],
  allMembers: FamilyMember[]
): { nodes: NodeLayout[]; totalWidth: number; totalHeight: number } {
  const nodes: NodeLayout[] = [];
  const positions = new Map<string, { x: number; y: number }>();
  const processed = new Set<string>();

  function getSpouse(member: FamilyMember): FamilyMember | undefined {
    if (!member.spouseId) return undefined;
    return allMembers.find(m => m.id === member.spouseId);
  }

  interface SubtreeLayout {
    width: number;
    height: number;
    centerX: number;
  }

  // Layout subtree and return dimensions with center position
  function layoutSubtree(member: FamilyMember, depth: number, xOffset: number): SubtreeLayout {
    if (processed.has(member.id)) {
      return { width: NODE_WIDTH, height: NODE_HEIGHT, centerX: xOffset + NODE_WIDTH / 2 };
    }

    const spouse = getSpouse(member);
    const hasSpouse = !!spouse;
    const children = getChildren(member.id);
    const spouseChildren = hasSpouse 
      ? getChildren(spouse!.id).filter(c => !children.some(ch => ch.id === c.id)) 
      : [];
    const allChildren = [...children, ...spouseChildren];

    const y = depth * (NODE_HEIGHT + V_GAP);
    const nodeWidth = hasSpouse ? COUPLE_WIDTH : NODE_WIDTH;

    // Place this node
    positions.set(member.id, { x: xOffset, y });
    nodes.push({ member, x: xOffset, y, width: NODE_WIDTH, height: NODE_HEIGHT });
    
    if (hasSpouse) {
      positions.set(spouse!.id, { x: xOffset + NODE_WIDTH + SPOUSE_GAP, y });
      nodes.push({ member: spouse!, x: xOffset + NODE_WIDTH + SPOUSE_GAP, y, width: NODE_WIDTH, height: NODE_HEIGHT });
    }

    processed.add(member.id);
    if (hasSpouse) processed.add(spouse!.id);

    // If no children, return current node info
    if (allChildren.length === 0) {
      return {
        width: nodeWidth,
        height: NODE_HEIGHT,
        centerX: xOffset + nodeWidth / 2
      };
    }

    // Layout children
    let childXOffset = xOffset;
    let totalChildrenWidth = 0;
    const childLayouts: SubtreeLayout[] = [];

    for (const child of allChildren) {
      const childLayout = layoutSubtree(child, depth + 1, childXOffset);
      childLayouts.push(childLayout);
      totalChildrenWidth += childLayout.width;
      childXOffset += childLayout.width + H_GAP;
    }

    totalChildrenWidth += (allChildren.length - 1) * H_GAP;

    // If children take more space than parent, spread parent to match
    if (totalChildrenWidth > nodeWidth) {
      // Recalculate parent to be centered over children
      const firstChildCenter = childLayouts[0].centerX;
      const lastChildCenter = childLayouts[childLayouts.length - 1].centerX;
      const childrenSpanCenter = (firstChildCenter + lastChildCenter) / 2;
      const newXOffset = childrenSpanCenter - nodeWidth / 2;

      // Update parent position if needed
      if (newXOffset !== xOffset) {
        const idx = nodes.findIndex(n => n.member.id === member.id);
        if (idx !== -1) {
          nodes[idx].x = newXOffset;
          positions.set(member.id, { x: newXOffset, y });
        }
        if (hasSpouse) {
          const spouseIdx = nodes.findIndex(n => n.member.id === spouse!.id);
          if (spouseIdx !== -1) {
            nodes[spouseIdx].x = newXOffset + NODE_WIDTH + SPOUSE_GAP;
            positions.set(spouse!.id, { x: newXOffset + NODE_WIDTH + SPOUSE_GAP, y });
          }
        }
        return {
          width: Math.max(nodeWidth, totalChildrenWidth),
          height: NODE_HEIGHT + V_GAP + (childLayouts[0]?.height || 0),
          centerX: childrenSpanCenter
        };
      }
    }

    return {
      width: Math.max(nodeWidth, totalChildrenWidth),
      height: NODE_HEIGHT + V_GAP + (childLayouts[0]?.height || 0),
      centerX: xOffset + nodeWidth / 2
    };
  }

  // Filter roots to avoid duplicate spouses
  const rootSpouseIds = new Set(rootMembers.map(m => m.spouseId).filter(Boolean));
  const filteredRoots = rootMembers.filter(m => !rootSpouseIds.has(m.id));

  // Layout all family trees
  let xOffset = 0;
  for (const root of filteredRoots) {
    const layout = layoutSubtree(root, 0, xOffset);
    xOffset += layout.width + H_GAP;
  }

  // Handle remaining unplaced spouses
  for (const root of rootMembers) {
    if (!processed.has(root.id)) {
      layoutSubtree(root, 0, xOffset);
      xOffset += COUPLE_WIDTH + H_GAP;
    }
  }

  const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.x + n.width)) : 0;
  const maxY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + n.height)) : 0;

  return { nodes, totalWidth: Math.max(maxX + 40, 400), totalHeight: Math.max(maxY + 40, 300) };
}

export function FamilyTreeGraph({ members, rootMembers, getChildren, selectedId, onSelect }: FamilyTreeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { nodes, totalWidth, totalHeight } = useMemo(
    () => computeLayout(rootMembers, getChildren, members),
    [rootMembers, getChildren, members]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodeLayout>();
    nodes.forEach(n => map.set(n.member.id, n));
    return map;
  }, [nodes]);

  // Parent-child edges
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

  // Spouse pairs (deduplicated)
  const spousePairs = useMemo(() => {
    const pairs: { a: NodeLayout; b: NodeLayout }[] = [];
    const seen = new Set<string>();
    for (const node of nodes) {
      const { member } = node;
      if (member.spouseId && !seen.has(member.id)) {
        const spouseNode = nodeMap.get(member.spouseId);
        if (spouseNode) {
          pairs.push({ a: node, b: spouseNode });
          seen.add(member.id);
          seen.add(member.spouseId);
        }
      }
    }
    return pairs;
  }, [nodes, nodeMap]);

  if (members.length === 0) return null;

  const padding = 20;

  return (
    <div ref={containerRef} className="overflow-auto rounded-xl border bg-card/50 p-4">
      <div style={{ minWidth: totalWidth + padding * 2, minHeight: totalHeight + padding * 2, position: 'relative' }}>
        <svg
          width={totalWidth + padding * 2}
          height={totalHeight + padding * 2}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          {/* Spouse connection lines */}
          {spousePairs.map((pair, i) => {
            const ax = padding + pair.a.x + NODE_WIDTH;
            const ay = padding + pair.a.y + NODE_HEIGHT / 2;
            const bx = padding + pair.b.x;
            const by = padding + pair.b.y + NODE_HEIGHT / 2;
            const midX = (ax + bx) / 2;

            return (
              <g key={`spouse-${i}`}>
                <line
                  x1={ax} y1={ay} x2={bx} y2={by}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                />
                {/* Heart icon position */}
                <circle cx={midX} cy={ay} r={8} fill="hsl(var(--background))" />
                <text x={midX} y={ay + 4} textAnchor="middle" fontSize="10" fill="hsl(var(--primary))">♥</text>
              </g>
            );
          })}

          {/* Parent-child edges */}
          {edges.map((edge, i) => {
            // For couples, draw from the midpoint between the couple
            const parentMember = edge.parentNode.member;
            const spouseNode = parentMember.spouseId ? nodeMap.get(parentMember.spouseId) : undefined;
            let px: number;
            if (spouseNode && spouseNode.y === edge.parentNode.y) {
              // Draw from couple midpoint
              const leftX = Math.min(edge.parentNode.x, spouseNode.x);
              px = padding + leftX + COUPLE_WIDTH / 2;
            } else {
              px = padding + edge.parentNode.x + NODE_WIDTH / 2;
            }
            const py = padding + edge.parentNode.y + NODE_HEIGHT;
            const cx = padding + edge.childNode.x + NODE_WIDTH / 2;
            const cy = padding + edge.childNode.y;
            const midY = (py + cy) / 2;

            return (
              <path
                key={`edge-${i}`}
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
