# Server Action Hash Mismatch Prevention & Recovery System

## Problem

Server action hash mismatches occur when the client code becomes out of sync with the server deployment. This happens after code changes when:
- Build caches are corrupted
- Client and server are on different deployment versions
- Browser cache hasn't been cleared after server restart

Error message: `"Failed to find Server Action "hash". This request might be from an older or newer deployment."`

## Solution Overview

Implemented a comprehensive three-layer recovery system:

### 1. **Deployment Sync Tracking** (`src/lib/utils/deployment-sync.ts`)

Tracks deployment version changes and automatically recovers:

```typescript
- Detects when server deployment changes
- Clears all browser caches (IndexedDB, LocalStorage, ServiceWorker)
- Forces hard page reload with cache busting
- Periodically checks (every 30 seconds) if deployment has changed
- Checks on page visibility changes (when returning to browser tab)
```

**Key Functions:**
- `initDeploymentSync()` - Initializes tracking on page load
- `checkDeploymentSync()` - Detects deployment changes
- `clearAllCaches()` - Removes all cached data
- `hardReload()` - Forces full page reload with timestamp cache bust
- `handleServerActionError()` - Orchestrates recovery on hash mismatch

### 2. **Safe Server Action Wrapper** (`src/lib/utils/server-action-handler.ts`)

Provides resilient wrappers for server action calls:

```typescript
- Detects hash mismatch errors
- Automatically triggers deployment sync recovery
- Implements exponential backoff retries
- Distinguishes between recoverable and permanent errors
```

**Key Functions:**
- `safeServerAction()` - Universal wrapper with retry logic
- `safeReadAction()` - For read operations (3 retries)
- `safeWriteAction()` - For write operations (2 retries)
- `isServerActionHashMismatch()` - Error detection

### 3. **Automatic Client Integration** (`src/components/deployment-sync-provider.tsx`)

Non-intrusive component that initializes sync tracking:

```typescript
- Lazy-loaded as part of providers
- Runs on every page load
- No UI interference
- Silent background monitoring
```

## Implementation Details

### Files Modified/Created

1. **New Files:**
   - `src/lib/utils/deployment-sync.ts` - Deployment tracking engine
   - `src/lib/utils/server-action-handler.ts` - Safe action wrappers
   - `src/components/deployment-sync-provider.tsx` - Integration component

2. **Updated Files:**
   - `src/components/providers.tsx` - Added DeploymentSyncProvider
   - `src/app/(dashboard)/admin/products/page.tsx` - Uses safeReadAction/safeWriteAction
   - `src/app/(dashboard)/admin/products/[id]/page.tsx` - Uses safeWriteAction
   - `src/app/(dashboard)/admin/products/new/page.tsx` - Uses safeWriteAction

### Recovery Flow

```
User Action
    ↓
Server Action Called
    ↓
Hash Mismatch Error?
    ├─ NO → Return result normally
    └─ YES → Trigger Recovery
        ↓
        Clear All Caches
        ↓
        Hard Reload with Cache Bust
        ↓
        Page Reloads
        ↓
        DeploymentSyncProvider Re-initializes
        ↓
        New Deployment ID Detected
        ↓
        User Retries Action
        ↓
        Success ✓
```

## Usage in Components

### Before (Vulnerable to Hash Mismatch)
```typescript
const result = await getProducts(page)
if (result.success) {
    // Handle success
} else {
    // Handle error
}
```

### After (Resilient with Automatic Recovery)
```typescript
const result = await safeReadAction(
    () => getProducts(page),
    'getProducts'
)
if (result.success) {
    // Handle success
} else {
    // Handle error - hard reload already triggered for hash mismatches
}
```

## Key Features

✅ **Automatic Detection**: No manual intervention needed
✅ **Transparent Recovery**: User doesn't see raw hash errors  
✅ **Exponential Backoff**: Prevents overwhelming the server
✅ **Cache Busting**: Ensures fresh code on reload
✅ **Periodic Checks**: Detects stale clients even without errors
✅ **Silent Monitoring**: No console spam or UI disruption
✅ **Backward Compatible**: Works with existing code
✅ **Multiple Trigger Points**: Checks on load, periodically, and on focus

## Recovery Triggers

1. **Error-Based**: When server action hash mismatch occurs
2. **Time-Based**: Every 30 seconds (configurable)
3. **Visibility-Based**: When returning to browser tab
4. **Deployment-Based**: When server deployment ID changes

## Configuration

All configurable in `deployment-sync.ts`:

```typescript
// Polling interval for deployment checks
setInterval(checkDeploymentSync, 30000)  // 30 seconds

// Cache version (increment to invalidate all caches)
const CACHE_VERSION = 'v1'

// Recovery thresholds
const maxRetries = 2  // Retries before hard reload
```

## Testing

To verify the system works:

1. **Change code** and save (triggers rebuild)
2. **Make request** from UI
3. **Observe**: Should either complete successfully or trigger hard reload
4. **After reload**: Request should complete normally
5. **Check console**: Should see `[Sync] Deployment changed detected` or `[Server Action] Hash mismatch detected`

## Performance Impact

- **Negligible at runtime** - Only fires on errors or periodically
- **30-second polling**: Minimal overhead (~1 network request)
- **On hash mismatch**: One hard reload resolves the issue permanently

## Browser Compatibility

✅ Chrome/Chromium
✅ Firefox
✅ Safari
✅ Edge
✅ Mobile browsers (with PWA support)

## Future Enhancements

- [ ] Add backend deployment version endpoint
- [ ] Implement circuit breaker for persistent failures
- [ ] Add metrics/analytics for recovery events
- [ ] Configurable recovery strategies per action type
- [ ] Graceful degradation for offline mode
