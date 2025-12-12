# TypeScript Type Issues Summary

> Last verified: December 12, 2025 (build confirmed ✓)  
> **Total: 17 errors in 9 files**

---

## Quick Reference

| File                                                     | Errors | Category          | Status |
| -------------------------------------------------------- | ------ | ----------------- | ------ |
| `apps/mobile/src/screens/SportProfile.tsx`               | 3      | Style Array Type  | ❌     |
| `apps/mobile/src/screens/UserProfile.tsx`                | 3      | Index Signature   | ❌     |
| `packages/shared-components/.../Badge.native.tsx`        | 1      | Spacing Key       | ❌     |
| `packages/shared-components/.../ErrorMessage.native.tsx` | 1      | ViewStyle Type    | ❌     |
| `packages/shared-components/.../Input.native.tsx`        | 1      | TextInput Style   | ❌     |
| `packages/shared-components/.../Select.native.tsx`       | 4      | Conditional Style | ❌     |
| `packages/shared-components/.../Container.native.tsx`    | 1      | DimensionValue    | ❌     |
| `packages/shared-components/.../Divider.native.tsx`      | 1      | DimensionValue    | ❌     |
| `packages/shared-components/.../Stack.native.tsx`        | 2      | FlexAlignType     | ❌     |

---

## 1. React Native Style Array Issues

### 1.1 `apps/mobile/src/screens/SportProfile.tsx` (Lines 727, 736, 745)

**Error:** Style array `[styles.requestButton, styles.coralButton]` not assignable to `ViewStyle`

```typescript
style={[styles.requestButton, styles.coralButton]}
~~~~~
```

**Root Cause:** The `Button` component's `style` prop expects `ViewStyle`, not `StyleProp<ViewStyle>` (which supports arrays).

**Fix Options:**

1. **Update Button component** (`Button.native.tsx:58`):

   ```typescript
   import { StyleProp, ViewStyle } from 'react-native';

   interface ButtonProps {
     style?: StyleProp<ViewStyle>; // Instead of ViewStyle
   }
   ```

2. **Or flatten styles at call site:**

   ```typescript
   import { StyleSheet } from 'react-native';

   style={StyleSheet.flatten([styles.requestButton, styles.coralButton])}
   ```

---

## 2. Index Signature / Implicit Any Errors

### 2.1 `apps/mobile/src/screens/UserProfile.tsx` (Lines 300, 716, 722)

**Error:** Element implicitly has 'any' type because expression can't index type

```typescript
// Line 300
availGrid[avail.day_of_week][avail.time_period] = true;

// Lines 716, 722
availabilities[day][period];
```

**Fix:** Add proper type definitions:

```typescript
type TimePeriod = 'morning' | 'afternoon' | 'evening';
type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type AvailabilityGrid = Record<DayOfWeek, Record<TimePeriod, boolean>>;

// Then cast or type the variables properly
const availGrid: AvailabilityGrid = { ... };
availGrid[avail.day_of_week as DayOfWeek][avail.time_period as TimePeriod] = true;
```

---

## 3. Spacing Key Issue

### 3.1 `packages/shared-components/src/feedback/Badge.native.tsx:164`

**Error:** `spacing[1.5]` doesn't exist in spacing object

```typescript
paddingVertical: spacing[1.5], // 6px
                 ~~~~~~~~~~~~
```

**Fix Options:**

1. **Add 1.5 to spacing constants:**

   ```typescript
   const spacing = {
     // ...existing keys
     1.5: 6, // Add this
   } as const;
   ```

2. **Or use direct value:**
   ```typescript
   paddingVertical: 6,
   ```

---

## 4. ViewStyle Type Mismatches

### 4.1 `packages/shared-components/src/feedback/ErrorMessage.native.tsx:125`

**Error:** Object literal not assignable to `ViewStyle` - `alignItems: string` incompatible

```typescript
const containerStyle: ViewStyle = {
      ~~~~~~~~~~~~~~
```

**Fix:** Use `as const` or explicit typing:

```typescript
const containerStyle: ViewStyle = {
  flex: 1,
  justifyContent: 'center' as const,
  alignItems: 'center' as const,
  padding: 24,
};
```

---

### 4.2 `packages/shared-components/src/layout/Stack.native.tsx` (Lines 112, 120)

**Error:** `string` not assignable to `FlexAlignType` or `justifyContent` type

```typescript
const alignItems: ViewStyle['alignItems'] = { ... }
const justifyContent: ViewStyle['justifyContent'] = { ... }
```

**Fix:** Use `as const` on object values or type assertion:

```typescript
const alignItemsMap = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
} as const;

const alignItems = alignItemsMap[align] as ViewStyle['alignItems'];
```

---

## 5. DimensionValue Issues

### 5.1 `packages/shared-components/src/layout/Container.native.tsx:105`

**Error:** `maxWidth: string | number` not assignable to `DimensionValue`

```typescript
const maxWidthStyle: ViewStyle = maxWidth
      ~~~~~~~~~~~~~
```

**Fix:**

```typescript
import { DimensionValue, ViewStyle } from 'react-native';

const maxWidthStyle: ViewStyle = maxWidth
  ? {
      alignSelf: 'center',
      maxWidth: maxWidth as DimensionValue,
      width: '100%',
    }
  : {};
```

---

### 5.2 `packages/shared-components/src/layout/Divider.native.tsx:95`

**Error:** `width: string | number` not assignable to `DimensionValue`

```typescript
const dividerStyle: ViewStyle = isHorizontal
      ~~~~~~~~~~~~
```

**Fix:** Cast dimension values:

```typescript
const dividerStyle: ViewStyle = isHorizontal
  ? {
      width: width as DimensionValue,
      height: thickness,
      // ...
    }
  : { ... };
```

---

## 6. TextInput / TextStyle Issues

### 6.1 `packages/shared-components/src/forms/Input.native.tsx:219`

**Error:** Style prop type mismatch with conditional styles

```typescript
<TextInput
 ~~~~~~~~~
```

**Fix:** Ensure conditional styles don't evaluate to falsy primitives like `0`:

```typescript
// Bad
style={[baseStyle, condition && additionalStyle]}

// Good
style={[baseStyle, condition ? additionalStyle : undefined]}
```

---

### 6.2 `packages/shared-components/src/forms/Select.native.tsx` (Lines 175, 176, 235, 236)

**Error:** `false | { ... }` not assignable to `TextStyle`

```typescript
!selectedOption && styles.placeholderText,
disabled && styles.disabledText,
item.value === value && styles.optionTextSelected,
item.disabled && styles.optionTextDisabled,
```

**Fix:** Use ternary instead of `&&`:

```typescript
!selectedOption ? styles.placeholderText : undefined,
disabled ? styles.disabledText : undefined,
item.value === value ? styles.optionTextSelected : undefined,
item.disabled ? styles.optionTextDisabled : undefined,
```

---

## Priority Order

### High Priority (Type Safety)

1. Style array issues in `Button` component
2. Index signature issues in `UserProfile`

### Low Priority (Cosmetic)

3. All other ViewStyle/TextStyle refinements
4. Spacing key addition

---

## Batch Fix Commands

```bash
# After fixing the issues, verify with:
cd apps/mobile && npm run build

# Or check types only:
cd apps/mobile && npx tsc --noEmit
```
