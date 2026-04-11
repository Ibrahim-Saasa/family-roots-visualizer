

## Plan: Add Relationship Validation and Data Consistency

### What we'll fix

**1. Self-reference prevention**
- Prevent selecting yourself as your own father, mother, or spouse in the form (already partially done by filtering `editingMember?.id`, but not done for new members post-creation)

**2. Circular ancestry detection**
- Add a `getAncestors(id)` utility that walks up the parent chain
- Before saving, verify the selected parent is not a descendant of the current member (would create a cycle)

**3. Date of birth validation**
- Parent must be born before child (with a reasonable minimum age gap, e.g., 10 years)
- No future dates allowed
- Show inline error messages when violations are detected

**4. Role conflict checks**
- A person cannot be both spouse and parent/child of the same person
- A person's parent cannot also be their sibling

**5. Stronger import validation**
- Validate imported JSON against the `FamilyMember` schema (required fields, correct types)
- Check all referenced IDs (fatherId, motherId, spouseId) point to members that exist in the imported data
- Check for circular references in imported data
- Show specific error messages on import failure

**6. Gender consistency**
- When changing gender, warn if the person is already assigned as a father (male) or mother (female) to someone
- Or: prevent gender change that would break existing parent assignments

### Files to modify

- **`src/hooks/useFamilyTree.ts`** -- Add `getAncestors()`, `validateMember()` helper, strengthen `importData`
- **`src/components/MemberForm.tsx`** -- Add validation errors display, filter parent dropdowns to exclude descendants, add DOB checks, prevent future dates
- **`src/types/family.ts`** -- Add a `ValidationError` type

### Technical approach

```text
validateMember(member, allMembers) → string[]  (list of error messages)

Checks:
├── No self-references
├── No circular ancestry (walk ancestors of proposed parent)
├── DOB: not in future
├── DOB: parent born ≥10 years before child
├── Spouse ≠ parent or child
├── Gender matches parent role (father=male, mother=female)
└── All referenced IDs exist
```

Validation runs on form submit. Errors displayed as a list above the submit button. Import runs the same validation per-member plus cross-reference checks.

