# TypeScript Type Error Audit

**Date:** 2025-01-08  
**Total Errors Found:** 30+ errors across 5 packages

## Summary

Type checking failed in the following packages:

- ❌ `@rallia/shared-utils` - 2 errors (blocking)
- ❌ `@rallia/mobile` - 12 errors
- ❌ `@rallia/web` - 5 errors
- ❌ `@rallia/shared-components` - 15 errors
- ❌ `@rallia/shared-services` - 4 errors
- ❌ `@rallia/shared-hooks` - 4 errors (inherited from shared-services)
- ✅ `@rallia/shared-types` - No errors
- ✅ `@rallia/shared-constants` - No errors

---

## 1. @rallia/shared-utils (2 errors - BLOCKING)

### Error: Missing module './errorHandler'

**File:** `packages/shared-utils/src/errors/index.ts:13`

```typescript
export { ... } from './errorHandler';
```

**Issue:** The index file tries to import from `./errorHandler`, but only `errorHandler.native.ts` and `errorHandler.web.ts` exist. No base file or platform resolution configured.

**Fix:** Either:

- Create a base `errorHandler.ts` file that re-exports platform-specific implementations
- Configure TypeScript module resolution for platform-specific files
- Use conditional exports in package.json

### Error: Missing module './haptics'

**File:** `packages/shared-utils/src/haptics/index.ts:17`

```typescript
export { ... } from './haptics';
```

**Issue:** Same as above - only `haptics.native.ts` and `haptics.web.ts` exist.

**Fix:** Same approach as errorHandler above.

---

## 2. @rallia/mobile (12 errors)

### Error: Missing export 'initializeResend'

**File:** `apps/mobile/src/config/resend.ts:6`

```typescript
import { initializeResend, Logger } from '@rallia/shared-services';
```

**Issue:** `initializeResend` is not exported from `@rallia/shared-services`. The function doesn't exist in the codebase.

**Fix:** Either:

- Remove the import if not needed
- Implement and export `initializeResend` from shared-services
- Use a different function name if it was renamed

### Error: Property 'icon_url' does not exist

**File:** `apps/mobile/src/features/onboarding/components/overlays/SportSelectionOverlay.tsx:79,89`

```typescript
icon_url: ... // Property doesn't exist on Sport type
```

**Issue:** The Sport type from database doesn't include `icon_url` property.

**Fix:** Either:

- Add `icon_url` to the Sport type definition
- Remove the property assignment if not needed
- Use a different property name if it was renamed

### Error: ViewStyle type incompatibility (3 errors)

**File:** `apps/mobile/src/screens/SportProfile.tsx:727,736,745`

```typescript
style={[...]} // Array type incompatible with ViewStyle
```

**Issue:** Arrays of style objects are being passed where a single ViewStyle is expected. The array type conflicts with ViewStyle's `filter` property.

**Fix:** Use `StyleSheet.flatten()` or spread the array: `style={[...styles]}`

### Error: Index signature missing (3 errors)

**File:** `apps/mobile/src/screens/UserProfile.tsx:300,716,722`

```typescript
availGrid[avail.day_of_week][avail.time_period] = true;
// Element implicitly has 'any' type
```

**Issue:** The availability grid object doesn't have an index signature, so TypeScript can't guarantee type safety when accessing with string keys.

**Fix:** Add index signature to the type:

```typescript
type AvailabilityGrid = {
  [key: string]: {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
};
```

### Errors from shared-components (inherited)

See section 4 below for details on:

- Badge.native.tsx spacing[1.5] error
- ErrorMessage.native.tsx ViewStyle error
- Input.native.tsx TextInput style error
- Select.native.tsx TextStyle errors

---

## 3. @rallia/web (5 errors)

### Error: NextRequest type incompatibility

**File:** `apps/web/proxy.ts:11`

```typescript
// NextRequest from different node_modules versions incompatible
```

**Issue:** There are two versions of Next.js types in node_modules (one in root, one in apps/web), causing type incompatibility.

**Fix:**

- Ensure consistent Next.js version across workspace
- Use `npm dedupe` to resolve duplicate dependencies
- Check package.json resolutions/overrides

### Error: '**DEV**' is not defined (4 errors)

**Files:**

- `packages/shared-services/src/logger/index.ts:19` (2 occurrences)
- `packages/shared-services/src/logger/Logger.ts:68` (2 occurrences)

```typescript
if (__DEV__) { ... }
```

**Issue:** `__DEV__` is a React Native global that doesn't exist in web/Node.js environments.

**Fix:** Define `__DEV__` in TypeScript config or use environment check:

```typescript
const __DEV__ = process.env.NODE_ENV !== 'production';
```

Or add to tsconfig.json:

```json
{
  "compilerOptions": {
    "types": ["node"],
    "define": {
      "__DEV__": "process.env.NODE_ENV !== 'production'"
    }
  }
}
```

---

## 4. @rallia/shared-components (15 errors)

### Error: spacing[1.5] index error

**File:** `packages/shared-components/src/feedback/Badge.native.tsx:164`

```typescript
paddingVertical: spacing[1.5]; // Property '1.5' does not exist
```

**Issue:** The spacing object only has integer keys (0, 1, 2, 3, etc.), but code tries to access `1.5`.

**Fix:** Either:

- Add `1.5` key to spacing object
- Use `spacing[1]` or calculate: `spacing[1] + spacing[0] / 2`
- Use a different spacing value

### Error: ViewStyle type incompatibility

**File:** `packages/shared-components/src/feedback/ErrorMessage.native.tsx:125`

```typescript
// Type 'string' is not assignable to FlexAlignType
alignItems: string;
```

**Issue:** String literal types are being used where specific union types are required.

**Fix:** Use proper type assertions or const assertions:

```typescript
alignItems: 'center' as const;
```

### Error: TextInput style type error

**File:** `packages/shared-components/src/forms/Input.native.tsx:219`

```typescript
// Type '0' is not assignable to TextStyle
style={condition && { marginLeft: 8 }}
```

**Issue:** Conditional style expressions can evaluate to `false`, `0`, or `""` which aren't valid style types.

**Fix:** Use proper conditional rendering:

```typescript
style={condition ? { marginLeft: 8 } : undefined}
```

### Error: TextStyle type errors (4 errors)

**File:** `packages/shared-components/src/forms/Select.native.tsx:175,176,235,236`

```typescript
// Type 'false' is not assignable to TextStyle
style={condition && { color: "#999" }}
```

**Issue:** Same as above - conditional expressions can be falsy.

**Fix:** Use ternary operator or StyleSheet.create with conditional logic.

### Error: ViewStyle dimension errors (3 errors)

**Files:**

- `packages/shared-components/src/layout/Container.native.tsx:105`
- `packages/shared-components/src/layout/Divider.native.tsx:95`

```typescript
// Type 'string | number' is not assignable to DimensionValue
maxWidth: string | number;
width: string | number;
```

**Issue:** React Native ViewStyle expects `DimensionValue` which is more restrictive than `string | number`.

**Fix:** Ensure values are valid React Native dimensions (numbers or percentage strings like "100%").

### Error: FlexAlignType errors (2 errors)

**File:** `packages/shared-components/src/layout/Stack.native.tsx:112,120`

```typescript
// Type 'string' is not assignable to FlexAlignType
alignItems: string;
justifyContent: string;
```

**Issue:** String variables need to be typed as specific union types.

**Fix:** Use type assertions or const string literals.

### Error: Missing exports from shared-constants

**File:** `packages/shared-components/src/forms/FormExamples.tsx:18`

```typescript
import { colors, spacing } from '@rallia/shared-constants';
// 'colors' should be 'COLORS', 'spacing' doesn't exist
```

**Issue:**

- `colors` should be `COLORS` (uppercase)
- `spacing` is not exported from shared-constants

**Fix:**

- Change `colors` to `COLORS`
- Export `spacing` from shared-constants or import from correct package

### Error: Input component style prop

**File:** `packages/shared-components/src/forms/FormExamples.tsx:66`

```typescript
<Input style={{ marginTop: ... }} />
// Property 'style' does not exist on InputProps
```

**Issue:** The Input component doesn't accept a `style` prop.

**Fix:** Either:

- Add `style` prop to InputProps interface
- Use a wrapper View with style instead
- Remove the style prop if not needed

---

## 5. @rallia/shared-services (4 errors)

### Error: '**DEV**' is not defined (4 errors)

**Files:**

- `packages/shared-services/src/logger/index.ts:19` (2 occurrences)
- `packages/shared-services/src/logger/Logger.ts:68` (2 occurrences)

Same issue as described in section 3 above.

---

## 6. @rallia/shared-hooks (4 errors - inherited)

All errors are inherited from `@rallia/shared-services` logger module (**DEV** issues).

---

## Recommended Fix Priority

### High Priority (Blocking builds)

1. ✅ Fix `@rallia/shared-utils` module resolution issues (2 errors)
2. ✅ Fix `@rallia/shared-services` **DEV** issues (4 errors)

### Medium Priority (Functionality issues)

3. ✅ Fix missing `initializeResend` export (1 error)
4. ✅ Fix Sport type `icon_url` property (2 errors)
5. ✅ Fix UserProfile availability grid indexing (3 errors)

### Low Priority (Type safety improvements)

6. ✅ Fix ViewStyle/TextStyle type incompatibilities (10+ errors)
7. ✅ Fix spacing[1.5] access (1 error)
8. ✅ Fix Next.js type version conflict (1 error)
9. ✅ Fix shared-constants export issues (2 errors)

---

## Next Steps

1. Create base files for errorHandler and haptics in shared-utils
2. Define **DEV** global or use environment checks
3. Add missing exports or fix imports
4. Fix type definitions for Sport, AvailabilityGrid, etc.
5. Resolve React Native style type issues
6. Ensure consistent dependency versions across workspace

