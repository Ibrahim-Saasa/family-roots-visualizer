import { useState, useEffect } from 'react';
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
import { UserPlus, Save } from 'lucide-react';

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
  }, [editingMember, open]);

  const males = members.filter(m => m.gender === 'male' && m.id !== editingMember?.id);
  const females = members.filter(m => m.gender === 'female' && m.id !== editingMember?.id);

  // Available spouses: anyone not already married (except current spouse if editing)
  const availableSpouses = members.filter(m =>
    m.id !== editingMember?.id &&
    (!m.spouseId || m.spouseId === editingMember?.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editingMember ? 'Edit Family Member' : 'Add Family Member'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter name"
              required
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
                {males.map(m => (
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
                {females.map(m => (
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
