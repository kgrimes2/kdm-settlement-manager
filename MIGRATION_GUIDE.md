# Data Migration Guide

This document explains how the KDM Settlement Manager handles data versioning and migrations to ensure backwards compatibility with user backups.

## Overview

The application uses a versioned data schema with automatic migration support. This ensures that:
- Old backups can always be loaded, even after schema changes
- Users never lose their data due to version incompatibility
- New features can be added safely with proper defaults

## Current Architecture

### Version Tracking

Each saved state includes a `version` field:

```typescript
interface AppState {
  version: number          // Current: 2
  settlements: SettlementData[]
  currentSettlementId: string
}
```

### Migration System

The migration system (`src/migrations.ts`) provides:

1. **`migrateData(data: unknown): AppState`**
   - Detects the data format (legacy, v1, v2, etc.)
   - Applies all necessary migrations sequentially
   - Returns data in the current version format

2. **`validateAppState(state: AppState): boolean`**
   - Validates that migrated data is complete and usable
   - Checks for required fields and data consistency

3. **`ensureSurvivorFields(survivor: Partial<SurvivorData>): SurvivorData`**
   - Ensures all survivor fields exist with proper defaults
   - Merges old data with new default fields

## Adding New Features

### When Adding New Fields

When you add a new field to the schema, follow these steps:

#### 1. Update the TypeScript Interface

```typescript
export interface SurvivorData {
  // ... existing fields ...
  newField: string  // Add your new field
}
```

#### 2. Update `initialSurvivorData` with a Default Value

```typescript
export const initialSurvivorData: SurvivorData = {
  // ... existing defaults ...
  newField: ''  // Provide a sensible default
}
```

#### 3. The Migration System Handles the Rest!

The `ensureSurvivorFields()` function automatically:
- Adds missing fields with defaults from `initialSurvivorData`
- Preserves all existing user data
- Works for all versions (legacy, v1, v2, etc.)

**That's it!** Old backups will automatically get the new field with its default value.

### When Making Breaking Changes

If you need to make a breaking change (removing fields, changing types, restructuring data), you need to create a new migration:

#### 1. Increment the Version Number

```typescript
// In migrations.ts
export const CURRENT_DATA_VERSION = 3  // Was 2
```

#### 2. Create a Migration Function

```typescript
function migrateV2ToV3(data: AppState): AppState {
  return {
    ...data,
    version: 3,
    settlements: data.settlements.map(settlement => ({
      ...settlement,
      // Apply your transformations here
      survivors: {
        1: transformSurvivor(settlement.survivors[1]),
        2: transformSurvivor(settlement.survivors[2]),
        3: transformSurvivor(settlement.survivors[3]),
        4: transformSurvivor(settlement.survivors[4])
      }
    }))
  }
}

function transformSurvivor(survivor: SurvivorData | null): SurvivorData | null {
  if (!survivor) return null

  return {
    ...survivor,
    // Example: Rename a field
    newFieldName: survivor.oldFieldName,
    // Example: Transform data
    someArray: survivor.someArray?.slice(0, 10) || []
  }
}
```

#### 3. Add the Migration to the Chain

```typescript
export function migrateData(data: unknown): AppState {
  // ... existing migration logic ...

  if (version < 3) {
    console.log('Migrating from v2 to v3')
    currentState = migrateV2ToV3(currentState)
    version = 3
  }

  // Add future migrations here

  return currentState
}
```

#### 4. Write Tests

```typescript
describe('V2 to V3 Migration', () => {
  it('should migrate old field to new field', () => {
    const v2Data = {
      version: 2,
      settlements: [{
        // ... v2 structure
      }]
    }

    const migrated = migrateData(v2Data)

    expect(migrated.version).toBe(3)
    expect(migrated.settlements[0].newFieldName).toBeDefined()
  })
})
```

## Migration History

### Version 1 (Implicit)
- Initial multi-settlement format
- Migrated from legacy single-settlement format
- Added `settlements` array and `currentSettlementId`

### Version 2 (Current)
- Explicitly versioned data
- Centralized migration system
- Automatic field defaults via `ensureSurvivorFields()`
- Comprehensive backwards compatibility

### Legacy (Pre-v1)
- Single settlement only
- Direct `survivors` object
- Field name: `archivedSurvivors` (now `removedSurvivors`)
- Variable huntXP length (now fixed at 15)

## Best Practices

### ✅ DO:
- Always provide sensible defaults for new fields in `initialSurvivorData`
- Test migrations with real old data if possible
- Use `ensureSurvivorFields()` when working with survivor data
- Increment version number for breaking changes
- Write migration tests for each version upgrade

### ❌ DON'T:
- Remove old migration code (users may have very old backups)
- Change the structure of `initialSurvivorData` without a migration
- Assume all fields exist in old data
- Skip validation after migration
- Make breaking changes without incrementing version

## Testing Migrations

The test file `src/migrations.test.ts` covers:
- Legacy format migration
- Version upgrades
- Field additions and defaults
- Data validation
- Error handling

Run tests with:
```bash
npm test -- migrations.test.ts
```

## Troubleshooting

### "Failed to migrate data"
- Check console for specific error
- Verify data format in browser DevTools localStorage
- Check if `version` field exists and is valid

### Missing Fields After Migration
- Ensure field has a default in `initialSurvivorData`
- Check that `ensureSurvivorFields()` is called in migration
- Verify nested objects are properly merged

### Old Backups Not Loading
- Check migration chain includes all versions
- Verify legacy format detection logic
- Test with actual old backup file

## Example: Adding a New Feature

Let's say you want to add a "nickname" field to survivors:

```typescript
// 1. Update SurvivorData interface
export interface SurvivorData {
  name: string
  nickname: string  // NEW
  // ... other fields
}

// 2. Add default in initialSurvivorData
export const initialSurvivorData: SurvivorData = {
  name: '',
  nickname: '',  // NEW - empty string default
  // ... other defaults
}
```

Done! The migration system will automatically:
- Add `nickname: ''` to all survivors in old backups
- Preserve all existing data
- Work for any version (legacy, v1, v2)

No migration function needed for simple field additions! 🎉

## Questions?

If you're unsure whether your change needs a migration:
- **Simple field addition with default?** No migration needed, just update the interface and defaults.
- **Removing/renaming fields?** Create a new version migration.
- **Changing data types?** Create a new version migration.
- **Restructuring data?** Create a new version migration.

When in doubt, create a migration. It's safer than breaking user backups!
