import { useState, useCallback, useMemo } from 'react';
import { FamilyMember, Gender } from '@/types/family';

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
    persist([...members, newMember]);
    return newMember;
  }, [members, persist]);

  const updateMember = useCallback((id: string, updates: Partial<Omit<FamilyMember, 'id'>>) => {
    persist(members.map(m => m.id === id ? { ...m, ...updates } : m));
  }, [members, persist]);

  const deleteMember = useCallback((id: string) => {
    // Remove member and clear references to them as parent
    const updated = members
      .filter(m => m.id !== id)
      .map(m => ({
        ...m,
        fatherId: m.fatherId === id ? undefined : m.fatherId,
        motherId: m.motherId === id ? undefined : m.motherId,
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

  const importData = useCallback((json: string) => {
    try {
      const data = JSON.parse(json);
      if (Array.isArray(data)) {
        persist(data);
        return true;
      }
      return false;
    } catch {
      return false;
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
    exportData,
    importData,
  };
}
