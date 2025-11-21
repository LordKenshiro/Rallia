# Migration Visual Guide

## 📦 What Was Moved

```
BEFORE Migration:
================

src/
├── components/
│   ├── MatchCard.tsx  ❌ Had Match interface inline
│   └── overlays/
│       ├── AuthOverlay.tsx  ❌ Onboarding-specific
│       ├── PersonalInformationOverlay.tsx  ❌ Had inline validators
│       └── SportSelectionOverlay.tsx  ❌ Onboarding-specific
│
└── data/
    └── mockMatches.ts  ❌ Imported from MatchCard


AFTER Migration:
===============

src/
├── types/  ✨ NEW
│   ├── match.ts  ← Match interface extracted here
│   └── index.ts
│
├── utils/  ✨ NEW
│   └── validators/
│       ├── inputValidators.ts  ← Validators extracted here
│       └── index.ts
│
├── features/  ✨ NEW
│   ├── matches/
│   │   ├── components/
│   │   │   └── MatchCard.tsx  ← Moved from src/components/
│   │   └── data/
│   │       └── mockMatches.ts  ← Moved from src/data/
│   │
│   └── onboarding/
│       └── components/
│           └── overlays/
│               ├── AuthOverlay.tsx  ← Moved from src/components/overlays/
│               ├── PersonalInformationOverlay.tsx  ← Moved, now uses validators
│               └── SportSelectionOverlay.tsx  ← Moved from src/components/overlays/
│
└── components/
    └── overlays/
        ├── Overlay.tsx  ✅ KEPT - Base component (shared)
        ├── LocationPermissionOverlay.tsx  ✅ KEPT (shared)
        ├── CalendarAccessOverlay.tsx  ✅ KEPT (shared)
        └── PermissionOverlay.tsx  ✅ KEPT (shared)
```

---

## 🔄 Import Flow Changes

### Before: Everything from root src/
```
Home.tsx
   │
   ├──→ components/MatchCard.tsx (had Match interface)
   ├──→ data/mockMatches.ts (imported from MatchCard)
   └──→ components/overlays/ (all overlays together)
```

### After: Feature-based imports
```
Home.tsx
   │
   ├──→ types/match.ts (Match interface)
   ├──→ features/matches/components/MatchCard.tsx
   ├──→ features/matches/data/mockMatches.ts
   ├──→ features/onboarding/components/ (onboarding overlays)
   └──→ components/overlays/ (shared overlays only)
```

---

## 🎯 Why This Structure?

### ✅ Feature Modules (Self-Contained)
```
features/matches/
├── components/     ← UI for matches
├── data/          ← Mock/test data
├── hooks/         ← (future) Match-specific hooks
├── services/      ← (future) Match API calls
└── types/         ← (future) Match-specific types
```

**Benefit:** Everything match-related is in one place!

### ✅ Shared Resources (Reusable)
```
types/           ← Types used across features
utils/           ← Functions used across features
components/      ← UI components used across features
constants/       ← Config/colors used everywhere
```

**Benefit:** Easy to find and reuse common code!

---

## 📝 Decision Matrix: Where Does Code Go?

### Is it used by ONE feature only?
✅ **YES** → Put in `features/[feature-name]/`
- Example: MatchCard → `features/matches/components/`
- Example: AuthOverlay → `features/onboarding/components/`

### Is it used by MULTIPLE features?
✅ **YES** → Put in shared folders
- Example: Match type → `types/match.ts`
- Example: Input validators → `utils/validators/`
- Example: Overlay base → `components/overlays/Overlay.tsx`

---

## 🚀 Import Patterns

### ✅ Feature Component Importing Shared Resources
```typescript
// features/matches/components/MatchCard.tsx

import { COLORS } from '../../../constants';      // Up 3 levels to shared
import { Match } from '../../../types';           // Up 3 levels to shared
```

### ✅ Screen Importing from Features
```typescript
// screens/Home.tsx

import { MatchCard } from '../features/matches/components';        // Feature component
import { AuthOverlay } from '../features/onboarding/components';   // Feature component
import { Match } from '../types';                                  // Shared type
```

### ✅ Feature Component Using Utils
```typescript
// features/onboarding/components/overlays/PersonalInformationOverlay.tsx

import { validateFullName } from '../../../../utils/validators';
```

---

## 🎨 Visual File Tree

```
rallia-app/src/
│
├─ 📁 features/  ← Domain-specific code
│  ├─ 🎾 matches/
│  │  ├─ 📦 components/
│  │  │  └─ MatchCard.tsx
│  │  └─ 📊 data/
│  │     └─ mockMatches.ts
│  │
│  └─ 👤 onboarding/
│     └─ 📦 components/
│        └─ overlays/
│           ├─ AuthOverlay.tsx
│           ├─ PersonalInformationOverlay.tsx
│           └─ SportSelectionOverlay.tsx
│
├─ 📦 components/  ← Shared UI (used everywhere)
│  ├─ AppHeader.tsx
│  └─ overlays/
│     ├─ Overlay.tsx  (base)
│     ├─ LocationPermissionOverlay.tsx
│     └─ CalendarAccessOverlay.tsx
│
├─ 🎨 constants/  ← Shared config
│  ├─ colors.ts
│  └─ animations.ts
│
├─ 📘 types/  ← Shared types
│  └─ match.ts
│
├─ 🛠️ utils/  ← Shared utilities
│  └─ validators/
│     └─ inputValidators.ts
│
├─ 🪝 hooks/  ← Shared hooks
│  ├─ useAuth.ts
│  └─ useOnboardingFlow.ts
│
└─ 📱 screens/  ← Main views
   └─ Home.tsx
```

---

## ✨ Key Takeaways

1. **Feature modules** = Self-contained code for specific features
2. **Shared resources** = Code used by multiple features
3. **Barrel exports** = Clean imports with `index.ts` files
4. **Type safety** = Zero TypeScript errors after migration
5. **No breaking changes** = App works exactly the same

---

## 🔍 Quick Reference

### Adding a new feature component?
→ `src/features/[feature]/components/`

### Adding a shared component?
→ `src/components/`

### Adding a type?
→ `src/types/` (if used by multiple features)
→ `src/features/[feature]/types/` (if feature-specific)

### Adding a utility function?
→ `src/utils/`

### Adding mock data?
→ `src/features/[feature]/data/`

---

**Need more help?** Check `FOLDER_STRUCTURE.md` for detailed guidelines!
