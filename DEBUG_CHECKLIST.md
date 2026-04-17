ok# Critical Issue: Local Hash Not Updating After Changes

## The Problem

You showed this log sequence on app load:
```
[App] State changed - appStateRef updated, needsSaveRef=true
[App] Current settlements: 4
[App] Settlement change detected
[App] Current hash: 3fd0f49d
[App] Last synced hash: null
```

The `lastSyncedHash` being `null` means:
- The app has never synced to cloud, OR
- The hash was never stored, OR  
- The hash was cleared but shouldn't have been

**Key question:** After you edit a survivor, does the hash CHANGE?

## Immediate Testing - Step by Step

Follow these exact steps and share the console output:

### Step 1: Start Fresh
1. Open browser DevTools (F12)
2. Click "Console" tab
3. Open localStorage inspector (DevTools → Application/Storage tab)
4. Note the initial state:
   - `lastSyncedSettlementsHash` value (if it exists)
   - `appStateDirty` value

### Step 2: Edit a Survivor
1. Click into a survivor
2. Change ONE field (like name or XP) 
3. Click save/blur
4. **Immediately take a screenshot of console** - you should see:
   ```
   [UpdateSurvivor] ===== SURVIVOR UPDATE STARTED =====
   [UpdateSurvivor] Updating survivor in quadrant X
   [UpdateSurvivor] Survivor name: XXXX
   [UpdateSurvivor] ✓ Detected N change(s): field_name
   [UpdateSurvivor] Setting new appState with updated settlements
   [UpdateSurvivor] Calling setAppState with new settlements
   [UpdateSurvivor] New state created with 4 settlements
   [UpdateSurvivor] ===== SURVIVOR UPDATE WILL TRIGGER appState EFFECT =====
   ```

### Step 3: Check for Settlement Change Detection
After the UpdateSurvivor logs, you should see:
```
[App] ===== Settlement change detected =====
[App] Settlements array reference changed
[App] Number of settlements: 4
[App] Current hash: 3fd0f49d  (THIS SHOULD BE DIFFERENT FROM BEFORE!)
[App] Last synced hash: null
[App] No previous sync hash - this is first change or fresh state
[App] ===== End settlement change handling =====
```

**CRITICAL:** Does the hash change when you edit a survivor?
- If YES → hash system might be working, but sync might be broken
- If NO → hash generation is broken OR survivor edit isn't triggering state update

### Step 4: Check localStorage After 2 Seconds
Wait 2 seconds, then open localStorage inspector and check:
```javascript
// In browser console:
console.log('appStateDirty:', localStorage.getItem('appStateDirty'))
console.log('kdm-app-state size:', localStorage.getItem('kdm-app-state').length)
console.log('lastSyncedHash:', localStorage.getItem('lastSyncedSettlementsHash'))
```

You should see:
- `appStateDirty: 'true'` ← survivor edit marked it dirty
- `kdm-app-state` size should be larger (if survivor was saved)
- `lastSyncedSettlementsHash: null` ← because not synced to cloud yet

### Step 5: Verify Periodic Save
You should see logs like:
```
[App] PERIODIC SAVE: Saving app state to localStorage (needsSaveRef=true)
[App] Save complete, needsSaveRef=false
```

If you DON'T see these logs → survivor edit is not triggering the state useEffect

### Step 6: Wait for Auto-Sync (if logged in)
If you're logged into cloud, after 30 seconds you should see:
```
[AutoSync] Sync check - isDirty: true lastSyncHash: null
[AutoSync] State is dirty, performing auto-sync with 4 settlements
[AutoSync] Storing hash after successful sync
[HashUtils] STORED settlements hash in localStorage: XXXXX
[AutoSync] Complete! Synced 4 settlement(s)
```

If auto-sync completes, then `lastSyncedSettlementsHash` should have a value.

### Step 7: Refresh and Check for Conflict
1. Refresh the page (Ctrl+R or Cmd+R)
2. You should NOT see a conflict dialog (because survivor changes were synced)
3. You SHOULD see logs like:
```
[Conflict] Last synced hash: XXXXX
[Conflict] Cloud hash: YYYYY
[Conflict] Local hash: ZZZZZ
[Conflict] NO CONFLICT DETECTED: Loading cloud data silently
```

If hashes DON'T match → conflict detection is broken

## What to Share

Please run through these steps and share:

1. **Hash before editing**: `localStorage.getItem('lastSyncedSettlementsHash')`
2. **Did UpdateSurvivor logs appear?** (Y/N)
3. **Did hash CHANGE after editing?** (Show both hashes)
4. **Did settlement change detection logs appear?** (Y/N)
5. **Did periodic save logs appear after 2 seconds?** (Y/N)
6. **Full console output** from when you edit survivor through refresh

## What Each Failure Means

**If UpdateSurvivor logs DON'T appear:**
- Survivor edit event handlers aren't calling updateSurvivor()
- Need to check SurvivorSheet.tsx and how onUpdate is wired

**If settlement change logs DON'T appear:**
- React isn't detecting the settlements array reference changed
- This would be a React rendering issue

**If hash DOESN'T change:**
- Hash function is broken OR
- Settlements array isn't actually being modified OR
- JSON.stringify of same data produces same hash (expected if data identical)

**If periodic save logs DON'T appear:**
- needsSaveRef is not being set to true
- setInterval isn't running
- logs are being filtered somehow

**If auto-sync doesn't store hash:**
- Sync is failing
- Hash storage is failing
- Both

## Simplified Debug Command

Paste this in browser console and run it:

```javascript
// Store initial state
const before = {
  hash: localStorage.getItem('lastSyncedSettlementsHash'),
  dirty: localStorage.getItem('appStateDirty'),
  time: Date.now()
}
console.log('=== BEFORE EDIT ===', before)

// Then edit a survivor and wait 3 seconds, then paste:
const after = {
  hash: localStorage.getItem('lastSyncedSettlementsHash'),
  dirty: localStorage.getItem('appStateDirty'),
  time: Date.now(),
  elapsed: Date.now() - before.time
}
console.log('=== AFTER EDIT ===', after)
console.log('Hash changed?', before.hash !== after.hash)
console.log('Dirty flag set?', after.dirty === 'true')
```

This will quickly show you if the system is working at all.

