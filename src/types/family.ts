export type Gender = 'male' | 'female' | 'other';

export interface FamilyMember {
  id: string;
  name: string;
  gender: Gender;
  dateOfBirth?: string;
  fatherId?: string;
  motherId?: string;
}

export interface FamilyTree {
  members: FamilyMember[];
}
