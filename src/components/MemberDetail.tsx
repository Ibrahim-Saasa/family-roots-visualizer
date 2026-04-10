import { FamilyMember } from '@/types/family';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, X, User, Calendar, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MemberDetailProps {
  member: FamilyMember;
  getParent: (id?: string) => FamilyMember | undefined;
  getChildren: (id: string) => FamilyMember[];
  getSiblings: (m: FamilyMember) => FamilyMember[];
  getSpouse: (id?: string) => FamilyMember | undefined;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
}

export function MemberDetail({
  member, getParent, getChildren, getSiblings, getSpouse,
  onEdit, onDelete, onClose, onSelect
}: MemberDetailProps) {
  const father = getParent(member.fatherId);
  const mother = getParent(member.motherId);
  const children = getChildren(member.id);
  const siblings = getSiblings(member);
  const spouse = getSpouse(member.spouseId);

  const genderLabel = member.gender === 'male' ? 'Male' : member.gender === 'female' ? 'Female' : 'Other';

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full flex items-center justify-center',
              member.gender === 'male' ? 'bg-tree-male/20' :
              member.gender === 'female' ? 'bg-tree-female/20' : 'bg-tree-other/20'
            )}>
              <User className="h-6 w-6 text-foreground/70" />
            </div>
            <div>
              <CardTitle className="font-display text-lg">{member.name}</CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">{genderLabel}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {member.dateOfBirth && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Born:</span>
            <span>{member.dateOfBirth}</span>
          </div>
        )}

        {spouse && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Heart className="h-3 w-3" /> Spouse
            </p>
            <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => onSelect(spouse.id)}>
              {spouse.name}
            </Badge>
          </div>
        )}

        {(father || mother) && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Parents</p>
            <div className="flex flex-wrap gap-1">
              {father && (
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => onSelect(father.id)}>
                  {father.name} (Father)
                </Badge>
              )}
              {mother && (
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => onSelect(mother.id)}>
                  {mother.name} (Mother)
                </Badge>
              )}
            </div>
          </div>
        )}

        {children.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Children</p>
            <div className="flex flex-wrap gap-1">
              {children.map(c => (
                <Badge key={c.id} variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => onSelect(c.id)}>
                  {c.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {siblings.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Siblings</p>
            <div className="flex flex-wrap gap-1">
              {siblings.map(s => (
                <Badge key={s.id} variant="outline" className="cursor-pointer hover:bg-secondary" onClick={() => onSelect(s.id)}>
                  {s.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onEdit} className="flex-1">
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} className="flex-1">
            <Trash2 className="mr-1 h-3 w-3" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
