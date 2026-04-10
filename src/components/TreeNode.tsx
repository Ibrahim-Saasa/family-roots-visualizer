import { FamilyMember } from '@/types/family';
import { cn } from '@/lib/utils';
import { User, Users } from 'lucide-react';

interface TreeNodeProps {
  member: FamilyMember;
  getChildren: (id: string) => FamilyMember[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}

export function TreeNode({ member, getChildren, selectedId, onSelect, depth = 0 }: TreeNodeProps) {
  const children = getChildren(member.id);
  const isSelected = selectedId === member.id;

  const genderColor = member.gender === 'male'
    ? 'border-tree-male'
    : member.gender === 'female'
    ? 'border-tree-female'
    : 'border-tree-other';

  const genderBg = member.gender === 'male'
    ? 'bg-tree-male/10'
    : member.gender === 'female'
    ? 'bg-tree-female/10'
    : 'bg-tree-other/10';

  return (
    <div className="flex flex-col">
      <button
        onClick={() => onSelect(member.id)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 text-left',
          'hover:shadow-md hover:scale-[1.02] cursor-pointer',
          genderColor,
          genderBg,
          isSelected && 'ring-2 ring-primary shadow-lg scale-[1.02]'
        )}
      >
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          member.gender === 'male' ? 'bg-tree-male/20' :
          member.gender === 'female' ? 'bg-tree-female/20' : 'bg-tree-other/20'
        )}>
          <User className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate text-foreground">{member.name}</p>
          {member.dateOfBirth && (
            <p className="text-xs text-muted-foreground">{member.dateOfBirth}</p>
          )}
        </div>
      </button>

      {children.length > 0 && (
        <div className="ml-6 mt-1 border-l-2 border-tree-line pl-4 space-y-1">
          {children.map(child => (
            <div key={child.id} className="relative">
              <div className="absolute -left-4 top-4 w-4 h-px bg-tree-line" />
              <TreeNode
                member={child}
                getChildren={getChildren}
                selectedId={selectedId}
                onSelect={onSelect}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
