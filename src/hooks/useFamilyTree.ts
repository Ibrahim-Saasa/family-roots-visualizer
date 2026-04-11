import { useState, useCallback, useMemo } from 'react';
import { FamilyMember, Gender } from '@/types/family';
import { validateImportData } from '@/lib/validation';

const STORAGE_KEY = 'family-tree-data';

function loadMembers(): FamilyMember[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveMembers(members: FamilyMember[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
}

export function useFamilyTree() {
  const [members, setMembers] = useState<FamilyMember[]>(loadMembers);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const persist = useCallback((updated: FamilyMember[]) => {
    setMembers(updated);
    saveMembers(updated);
  }, []);

  const addMember = useCallback((member: Omit<FamilyMember, 'id'>) => {
    const newMember: FamilyMember = { ...member, id: crypto.randomUUID() };
    let updated = [...members, newMember];
    // If spouse is set, update the spouse's spouseId to point back
    if (newMember.spouseId) {
      updated = updated.map(m =>
        m.id === newMember.spouseId ? { ...m, spouseId: newMember.id } : m
      );
    }
    persist(updated);
    return newMember;
  }, [members, persist]);

  const updateMember = useCallback((id: string, updates: Partial<Omit<FamilyMember, 'id'>>) => {
    const oldMember = members.find(m => m.id === id);
    let updated = members.map(m => m.id === id ? { ...m, ...updates } : m);

    // Handle spouse changes: clear old spouse's reference, set new spouse's reference
    const oldSpouseId = oldMember?.spouseId;
    const newSpouseId = updates.spouseId;

    if (oldSpouseId !== newSpouseId) {
      if (oldSpouseId) {
        updated = updated.map(m =>
          m.id === oldSpouseId ? { ...m, spouseId: undefined } : m
        );
      }
      if (newSpouseId) {
        updated = updated.map(m =>
          m.id === newSpouseId ? { ...m, spouseId: id } : m
        );
      }
    }

    persist(updated);
  }, [members, persist]);

  const deleteMember = useCallback((id: string) => {
    const updated = members
      .filter(m => m.id !== id)
      .map(m => ({
        ...m,
        fatherId: m.fatherId === id ? undefined : m.fatherId,
        motherId: m.motherId === id ? undefined : m.motherId,
        spouseId: m.spouseId === id ? undefined : m.spouseId,
      }));
    persist(updated);
    if (selectedId === id) setSelectedId(null);
  }, [members, persist, selectedId]);

  const getChildren = useCallback((id: string) => {
    return members.filter(m => m.fatherId === id || m.motherId === id);
  }, [members]);

  const getSiblings = useCallback((member: FamilyMember) => {
    return members.filter(m =>
      m.id !== member.id &&
      ((member.fatherId && m.fatherId === member.fatherId) ||
       (member.motherId && m.motherId === member.motherId))
    );
  }, [members]);

  const getParent = useCallback((id?: string) => {
    if (!id) return undefined;
    return members.find(m => m.id === id);
  }, [members]);

  const getSpouse = useCallback((id?: string) => {
    if (!id) return undefined;
    return members.find(m => m.id === id);
  }, [members]);

  const rootMembers = useMemo(() => {
    return members.filter(m => !m.fatherId && !m.motherId);
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(m => m.name.toLowerCase().includes(q));
  }, [members, searchQuery]);

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === selectedId) || null;
  }, [members, selectedId]);

  const exportData = useCallback(() => {
    return JSON.stringify(members, null, 2);
  }, [members]);

  const importData = useCallback((json: string): { success: boolean; errors: string[] } => {
    try {
      const data = JSON.parse(json);
      const result = validateImportData(data);
      if (result.valid) {
        persist(data);
        return { success: true, errors: [] };
      }
      return { success: false, errors: result.errors };
    } catch {
      return { success: false, errors: ['Invalid JSON format.'] };
    }
  }, [persist]);

  return {
    members,
    rootMembers,
    filteredMembers,
    selectedMember,
    selectedId,
    searchQuery,
    setSearchQuery,
    setSelectedId,
    addMember,
    updateMember,
    deleteMember,
    getChildren,
    getSiblings,
    getParent,
    getSpouse,
    exportData,
    importData,
  };
}
