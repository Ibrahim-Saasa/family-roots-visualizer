import { useState } from 'react';
import { useFamilyTree } from '@/hooks/useFamilyTree';
import { MemberForm } from '@/components/MemberForm';
import { TreeNode } from '@/components/TreeNode';
import { FamilyTreeGraph } from '@/components/FamilyTreeGraph';
import { MemberDetail } from '@/components/MemberDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { UserPlus, Search, Download, Upload, TreePine } from 'lucide-react';

const Index = () => {
  const {
    members, rootMembers, filteredMembers, selectedMember,
    selectedId, searchQuery, setSearchQuery, setSelectedId,
    addMember, updateMember, deleteMember,
    getChildren, getSiblings, getParent,
    exportData, importData,
  } = useFamilyTree();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<typeof selectedMember>(null);

  const handleAdd = () => {
    setEditingMember(null);
    setFormOpen(true);
  };

  const handleEdit = () => {
    if (selectedMember) {
      setEditingMember(selectedMember);
      setFormOpen(true);
    }
  };

  const handleDelete = () => {
    if (selectedMember) {
      const name = selectedMember.name;
      deleteMember(selectedMember.id);
      toast.success(`${name} removed from the family tree`);
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'family-tree.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Family tree exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const success = importData(ev.target?.result as string);
        if (success) {
          toast.success('Family tree imported');
          setSelectedId(null);
        } else {
          toast.error('Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // For search results, show matching members as a flat list
  const showSearchResults = searchQuery.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <TreePine className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-display font-bold text-foreground">Family Tree</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            <Button onClick={handleAdd} size="sm">
              <UserPlus className="mr-1 h-4 w-4" /> Add Member
            </Button>
            <Button onClick={handleExport} variant="outline" size="sm" disabled={members.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Export
            </Button>
            <Button onClick={handleImport} variant="outline" size="sm">
              <Upload className="mr-1 h-4 w-4" /> Import
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-6">
        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <TreePine className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-display font-semibold text-foreground mb-2">Start Your Family Tree</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Add your first family member to begin building your tree.
            </p>
            <Button onClick={handleAdd}>
              <UserPlus className="mr-2 h-4 w-4" /> Add First Member
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tree View */}
            <div className="lg:col-span-2">
              {showSearchResults ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground mb-3">
                    {filteredMembers.length} result{filteredMembers.length !== 1 ? 's' : ''} for "{searchQuery}"
                  </p>
                  {filteredMembers.map(m => (
                    <TreeNode
                      key={m.id}
                      member={m}
                      getChildren={() => []}
                      selectedId={selectedId}
                      onSelect={id => { setSelectedId(id); setSearchQuery(''); }}
                    />
                  ))}
                  {filteredMembers.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">No members found</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {rootMembers.map(m => (
                    <TreeNode
                      key={m.id}
                      member={m}
                      getChildren={getChildren}
                      selectedId={selectedId}
                      onSelect={setSelectedId}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Detail Panel */}
            <div className="lg:col-span-1">
              {selectedMember ? (
                <div className="sticky top-24">
                  <MemberDetail
                    member={selectedMember}
                    getParent={getParent}
                    getChildren={getChildren}
                    getSiblings={getSiblings}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClose={() => setSelectedId(null)}
                    onSelect={setSelectedId}
                  />
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Select a member to view details</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <MemberForm
        open={formOpen}
        onOpenChange={setFormOpen}
        members={members}
        editingMember={editingMember}
        onSubmit={(data) => {
          if (editingMember) {
            updateMember(editingMember.id, data);
            toast.success(`${data.name} updated`);
          } else {
            addMember(data);
            toast.success(`${data.name} added to the family tree`);
          }
        }}
      />
    </div>
  );
};

export default Index;

function User(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
