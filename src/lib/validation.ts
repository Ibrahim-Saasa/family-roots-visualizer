import { FamilyMember } from '@/types/family';

/**
 * Get all ancestor IDs of a member by walking up parent chains.
 */
export function getAncestorIds(memberId: string, members: FamilyMember[]): Set<string> {
  const ancestors = new Set<string>();
  const queue = [memberId];

  while (queue.length > 0) {
    const currentId = queue.pop()!;
    const member = members.find(m => m.id === currentId);
    if (!member) continue;

    for (const parentId of [member.fatherId, member.motherId]) {
      if (parentId && !ancestors.has(parentId)) {
        ancestors.add(parentId);
        queue.push(parentId);
      }
    }
  }

  return ancestors;
}

/**
 * Get all descendant IDs of a member.
 */
export function getDescendantIds(memberId: string, members: FamilyMember[]): Set<string> {
  const descendants = new Set<string>();
  const queue = [memberId];

  while (queue.length > 0) {
    const currentId = queue.pop()!;
    const children = members.filter(m => m.fatherId === currentId || m.motherId === currentId);
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }

  return descendants;
}

/**
 * Check if setting parentId as a parent of memberId would create a cycle.
 */
export function wouldCreateCycle(memberId: string, parentId: string, members: FamilyMember[]): boolean {
  if (memberId === parentId) return true;
  const descendants = getDescendantIds(memberId, members);
  return descendants.has(parentId);
}

/**
 * Parse a date string and return a Date, or null if invalid.
 */
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Validate a family member against all consistency rules.
 * Returns an array of error messages (empty = valid).
 */
export function validateMember(
  member: Omit<FamilyMember, 'id'> & { id?: string },
  allMembers: FamilyMember[],
  isEditing: boolean = false
): string[] {
  const errors: string[] = [];
  const memberId = member.id;

  // 1. Name required
  if (!member.name?.trim()) {
    errors.push('Name is required.');
  }

  // 2. No self-references
  if (memberId) {
    if (member.fatherId === memberId) errors.push('A person cannot be their own father.');
    if (member.motherId === memberId) errors.push('A person cannot be their own mother.');
    if (member.spouseId === memberId) errors.push('A person cannot be their own spouse.');
  }

  // 3. Referenced IDs must exist
  const memberIds = new Set(allMembers.map(m => m.id));
  if (member.fatherId && !memberIds.has(member.fatherId)) {
    errors.push('Selected father does not exist.');
  }
  if (member.motherId && !memberIds.has(member.motherId)) {
    errors.push('Selected mother does not exist.');
  }
  if (member.spouseId && !memberIds.has(member.spouseId)) {
    errors.push('Selected spouse does not exist.');
  }

  // 4. Gender consistency for parent roles
  if (member.fatherId) {
    const father = allMembers.find(m => m.id === member.fatherId);
    if (father && father.gender === 'female') {
      errors.push('The selected father is female. Please select a male or "other" parent as father.');
    }
  }
  if (member.motherId) {
    const mother = allMembers.find(m => m.id === member.motherId);
    if (mother && mother.gender === 'male') {
      errors.push('The selected mother is male. Please select a female or "other" parent as mother.');
    }
  }

  // 5. Circular ancestry detection (only for edits where we have an id)
  if (memberId && isEditing) {
    if (member.fatherId && wouldCreateCycle(memberId, member.fatherId, allMembers)) {
      errors.push('Selected father would create a circular relationship (they are a descendant).');
    }
    if (member.motherId && wouldCreateCycle(memberId, member.motherId, allMembers)) {
      errors.push('Selected mother would create a circular relationship (they are a descendant).');
    }
  }

  // 6. Date of birth checks
  const dob = parseDate(member.dateOfBirth);
  if (member.dateOfBirth && !dob) {
    errors.push('Invalid date of birth.');
  }
  if (dob) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dob > today) {
      errors.push('Date of birth cannot be in the future.');
    }

    // Parent must be at least 10 years older
    const MIN_PARENT_AGE_YEARS = 10;
    if (member.fatherId) {
      const father = allMembers.find(m => m.id === member.fatherId);
      const fatherDob = parseDate(father?.dateOfBirth);
      if (fatherDob) {
        const ageDiffYears = (dob.getTime() - fatherDob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageDiffYears < MIN_PARENT_AGE_YEARS) {
          errors.push(`Father must be at least ${MIN_PARENT_AGE_YEARS} years older than child.`);
        }
      }
    }
    if (member.motherId) {
      const mother = allMembers.find(m => m.id === member.motherId);
      const motherDob = parseDate(mother?.dateOfBirth);
      if (motherDob) {
        const ageDiffYears = (dob.getTime() - motherDob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (ageDiffYears < MIN_PARENT_AGE_YEARS) {
          errors.push(`Mother must be at least ${MIN_PARENT_AGE_YEARS} years older than child.`);
        }
      }
    }
  }

  // 7. Spouse cannot be a parent or child
  if (member.spouseId && memberId) {
    if (member.spouseId === member.fatherId || member.spouseId === member.motherId) {
      errors.push('Spouse cannot also be a parent.');
    }
    const children = allMembers.filter(m => m.fatherId === memberId || m.motherId === memberId);
    if (children.some(c => c.id === member.spouseId)) {
      errors.push('Spouse cannot also be a child.');
    }
  }

  // 8. Gender change check: if editing, check if gender change breaks parent assignments
  if (memberId && isEditing) {
    const childrenAsFather = allMembers.filter(m => m.fatherId === memberId);
    const childrenAsMother = allMembers.filter(m => m.motherId === memberId);

    if (member.gender === 'female' && childrenAsFather.length > 0) {
      errors.push('Cannot change gender to female: this person is assigned as father to other members.');
    }
    if (member.gender === 'male' && childrenAsMother.length > 0) {
      errors.push('Cannot change gender to male: this person is assigned as mother to other members.');
    }
  }

  return errors;
}

/**
 * Validate an entire imported dataset.
 */
export function validateImportData(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Data must be an array of family members.'] };
  }

  // Schema validation
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${i + 1}: Not a valid object.`);
      continue;
    }
    if (!item.id || typeof item.id !== 'string') {
      errors.push(`Item ${i + 1}: Missing or invalid "id".`);
    }
    if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
      errors.push(`Item ${i + 1}: Missing or invalid "name".`);
    }
    if (!['male', 'female', 'other'].includes(item.gender)) {
      errors.push(`Item ${i + 1}: Invalid "gender" (must be male, female, or other).`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const members = data as FamilyMember[];
  const idSet = new Set(members.map(m => m.id));

  // Check for duplicate IDs
  if (idSet.size !== members.length) {
    errors.push('Duplicate member IDs found.');
  }

  // Check referenced IDs exist
  for (const m of members) {
    if (m.fatherId && !idSet.has(m.fatherId)) {
      errors.push(`${m.name}: Father ID references non-existent member.`);
    }
    if (m.motherId && !idSet.has(m.motherId)) {
      errors.push(`${m.name}: Mother ID references non-existent member.`);
    }
    if (m.spouseId && !idSet.has(m.spouseId)) {
      errors.push(`${m.name}: Spouse ID references non-existent member.`);
    }

    // Self-reference
    if (m.fatherId === m.id || m.motherId === m.id || m.spouseId === m.id) {
      errors.push(`${m.name}: Self-referencing relationship detected.`);
    }

    // Gender consistency
    if (m.fatherId) {
      const father = members.find(f => f.id === m.fatherId);
      if (father?.gender === 'female') {
        errors.push(`${m.name}: Father "${father.name}" has gender set to female.`);
      }
    }
    if (m.motherId) {
      const mother = members.find(f => f.id === m.motherId);
      if (mother?.gender === 'male') {
        errors.push(`${m.name}: Mother "${mother.name}" has gender set to male.`);
      }
    }
  }

  // Check for circular ancestry
  for (const m of members) {
    const ancestors = getAncestorIds(m.id, members);
    if (ancestors.has(m.id)) {
      errors.push(`${m.name}: Circular ancestry detected.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
