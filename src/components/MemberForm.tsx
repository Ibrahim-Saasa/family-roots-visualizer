import { useState, useEffect, useMemo } from 'react';
import { FamilyMember, Gender } from '@/types/family';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Save, AlertTriangle } from 'lucide-react';
import { validateMember, getDescendantIds } from '@/lib/validation';

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: FamilyMember[];
  editingMember?: FamilyMember | null;
  onSubmit: (data: Omit<FamilyMember, 'id'>) => void;
}

export function MemberForm({ open, onOpenChange, members, editingMember, onSubmit }: MemberFormProps) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fatherId, setFatherId] = useState<string>('');
  const [motherId, setMotherId] = useState<string>('');
  const [spouseId, setSpouseId] = useState<string>('');
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (editingMember) {
      setName(editingMember.name);
      setGender(editingMember.gender);
      setDateOfBirth(editingMember.dateOfBirth || '');
      setFatherId(editingMember.fatherId || '');
      setMotherId(editingMember.motherId || '');
      setSpouseId(editingMember.spouseId || '');
    } else {
      setName('');
      setGender('male');
      setDateOfBirth('');
      setFatherId('');
      setMotherId('');
      setSpouseId('');
    }
    setErrors([]);
  }, [editingMember, open]);

  // Descendants of the editing member — these cannot be selected as parents
  const descendantIds = useMemo(() => {
    if (!editingMember) return new Set<string>();
    return getDescendantIds(editingMember.id, members);
  }, [editingMember, members]);

  // Filter males for father selection: exclude self, descendants, and current spouse selection
  const availableFathers = useMemo(() => {
    return members.filter(m => {
      if (m.gender === 'female') return false; // fathers must be male or other
      if (editingMember && m.id === editingMember.id) return false;
      if (descendantIds.has(m.id)) return false;
      return true;
    });
  }, [members, editingMember, descendantIds]);

  // Filter females for mother selection
  const availableMothers = useMemo(() => {
    return members.filter(m => {
      if (m.gender === 'male') return false; // mothers must be female or other
      if (editingMember && m.id === editingMember.id) return false;
      if (descendantIds.has(m.id)) return false;
      return true;
    });
  }, [members, editingMember, descendantIds]);

  // Available spouses: anyone not already married (except current spouse if editing), and not self
  const availableSpouses = useMemo(() => {
    return members.filter(m => {
      if (editingMember && m.id === editingMember.id) return false;
      if (m.spouseId && m.spouseId !== editingMember?.id) return false;
      // Cannot be a parent of this member
      if (m.id === fatherId || m.id === motherId) return false;
      return true;
    });
  }, [members, editingMember, fatherId, motherId]);

  // Today's date for max attribute on date input
  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const memberData: Omit<FamilyMember, 'id'> & { id?: string } = {
      id: editingMember?.id,
      name: name.trim(),
      gender,
      dateOfBirth: dateOfBirth || undefined,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      spouseId: spouseId || undefined,
    };

    const validationErrors = validateMember(memberData, members, !!editingMember);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    onSubmit({
      name: name.trim(),
      gender,
      dateOfBirth: dateOfBirth || undefined,
      fatherId: fatherId || undefined,
      motherId: motherId || undefined,
      spouseId: spouseId || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editingMember ? 'Edit Family Member' : 'Add Family Member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.length > 0 && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <AlertTriangle className="h-4 w-4" />
                Validation Errors
              </div>
              <ul className="list-disc list-inside text-sm text-destructive space-y-0.5">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={v => setGender(v as Gender)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              max={today}
            />
          </div>

          <div className="space-y-2">
            <Label>Father</Label>
            <Select value={fatherId || '_none'} onValueChange={v => setFatherId(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select father" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {availableFathers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Mother</Label>
            <Select value={motherId || '_none'} onValueChange={v => setMotherId(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select mother" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {availableMothers.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Spouse / Partner</Label>
            <Select value={spouseId || '_none'} onValueChange={v => setSpouseId(v === '_none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select spouse" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {availableSpouses.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full">
            {editingMember ? <Save className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {editingMember ? 'Save Changes' : 'Add Member'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
